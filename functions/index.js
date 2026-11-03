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

  // Une messe déjà passée ne déclenche pas d'alerte « nouvelle messe ».
  const massTime = mass.date ? new Date(mass.date).getTime() : Number.NaN;
  if (!Number.isNaN(massTime) && massTime < Date.now()) {
    console.log('Messe déjà passée, aucun push envoyé :', event.params.massId);
    return;
  }

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

  // Message « data-only » : c'est le service worker de l'app (public/sw.js)
  // qui affiche la notification. Un bloc `notification` serait affiché
  // automatiquement par le navigateur, même quand l'app est ouverte au
  // premier plan — d'où une double alerte impossible à filtrer.
  const data = {
    title: 'Nouvelle messe programmée',
    body,
    massId: event.params.massId,
    url: '/',
  };

  const tokens = tokensSnap.docs
    .map((d) => ({ id: d.id, token: d.data().token, uid: d.data().uid || null }))
    .filter((t) => Boolean(t.token))
    // L'auteur de la messe a déjà l'app ouverte : pas de push pour lui.
    .filter((t) => !mass.createdBy || t.uid !== mass.createdBy);

  if (!tokens.length) {
    console.log('Aucun appareil à notifier (auteur exclu) pour', mass.parishId);
    return;
  }

  // Envoyer par lots de 500 (limite FCM).
  const results = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: batch.map((t) => t.token),
      data,
      webpush: {
        // Livraison immédiate : une messe programmée est un événement daté.
        headers: { urgency: 'high' },
      },
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
