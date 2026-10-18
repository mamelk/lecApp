/**
 * Cloud Function : envoie une notification push à chaque appareil abonné
 * dès qu'une messe est créée dans Firestore (collection `masses`).
 *
 * Déploiement : firebase deploy --only functions (plan Blaze requis).
 * Les appareils s'abonnent via l'app (collection `push_tokens`).
 */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const TOKENS_COLLECTION = 'push_tokens';

exports.notifyMassCreated = onDocumentCreated('masses/{massId}', async (event) => {
  const mass = event.data.data();
  if (!mass || !mass.parishId) return;

  const tokensSnap = await admin
    .firestore()
    .collection(TOKENS_COLLECTION)
    .where('parishId', '==', mass.parishId)
    .get();

  if (tokensSnap.empty) {
    console.log('Aucun appareil abonné pour la paroisse', mass.parishId);
    return;
  }

  const when = mass.date ? new Date(mass.date) : null;
  const dateLabel = when
    ? when.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const body = dateLabel ? `${mass.title} — ${dateLabel}` : mass.title;

  const message = {
    notification: {
      title: 'Nouvelle messe programmée',
      body,
    },
    webpush: {
      notification: {
        title: 'Nouvelle messe programmée',
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `mass-${event.params.massId}`,
        renotify: true,
      },
      fcmOptions: { link: '/' },
    },
    // Les tokens FCM web ; les tokens invalides sont nettoyés plus bas.
  };

  const tokens = tokensSnap.docs.map((d) => ({ id: d.id, token: d.data().token }));

  // Envoyer par lots de 500 (limite FCM).
  const results = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: batch.map((t) => t.token),
      notification: message.notification,
      webpush: message.webpush,
    });
    results.push({ batch, res });
  }

  // Supprimer les jetons expirés / non enregistrés.
  const cleanup = [];
  for (const { batch, res } of results) {
    res.responses.forEach((r, idx) => {
      const code = r.error && r.error.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        cleanup.push(
          admin.firestore().collection(TOKENS_COLLECTION).doc(batch[idx].id).delete(),
        );
      }
    });
  }
  if (cleanup.length) await Promise.all(cleanup);

  console.log(
    `Push envoyé : ${results.reduce((n, r) => n + r.res.successCount, 0)} ok, ` +
      `${results.reduce((n, r) => n + r.res.failureCount, 0)} échec, ` +
      `${cleanup.length} jetons nettoyés.`,
  );
  return null;
});
