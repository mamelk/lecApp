import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db, auth } from './firebase';
import type { Mass } from '../types';

/**
 * Deux couches de notifications pour la création d'une messe :
 *  1. Locale  — l'app ouverte (ou en arrière-plan) reçoit le snapshot Firestore
 *     et affiche une notification système via le service worker. Aucune
 *     configuration requise.
 *  2. Push FCM — abonnement enregistré dans `push_tokens` ; la Cloud Function
 *     functions/index.js envoie le push même quand l'app est fermée. Nécessite
 *     une clé VAPID (Firebase Console → Cloud Messaging → Certificats push web)
 *     dans VITE_FIREBASE_MESSAGING_VAPID_KEY et le déploiement des fonctions.
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_MESSAGING_VAPID_KEY as string | undefined;
const TOKEN_STORAGE_KEY = 'lecapp_push_token';
const TOKEN_COLLECTION = 'push_tokens';

/** Ids déjà notifiés cette session (évite les doublons entre listeners). */
const notifiedIds = new Set<string>();
/** Messe que cet appareil vient de créer : pas de notification pour soi. */
const locallyCreatedIds = new Set<string>();

export const notificationsSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export const permissionState = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported';

export const pushConfigured = (): boolean => Boolean(VAPID_KEY);

/** À appeler juste après addDoc(masses) sur l'appareil créateur. */
export const markMassCreatedLocally = (massId: string): void => {
  locallyCreatedIds.add(massId);
  notifiedIds.add(massId);
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
};

/** Affiche une notification via le SW (requis sur Android), sinon via l'API page. */
const showNotification = async (
  title: string,
  options: NotificationOptions & { data?: unknown },
): Promise<void> => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
  } catch (e) {
    console.warn('showNotification via SW indisponible, tentative directe', e);
  }
  try {
    new Notification(title, options);
  } catch (e) {
    // Android Chrome n'autorise pas Notification() depuis la page : silencieux.
    console.warn('Notification directe impossible', e);
  }
};

/** Affiche les nouvelles messes d'un snapshot Firestore (docChanges 'added'). */
export const notifyNewMassesFromSnapshot = (snapshot: QuerySnapshot<DocumentData>): void => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  snapshot.docChanges().forEach((change) => {
    if (change.type !== 'added') return;
    const id = change.doc.id;
    if (notifiedIds.has(id) || locallyCreatedIds.has(id)) return;
    notifiedIds.add(id);
    const mass = { ...(change.doc.data() as Mass), id };
    const when = (() => {
      try {
        return format(parseISO(mass.date), "d MMMM yyyy 'à' HH:mm", { locale: fr });
      } catch {
        return mass.date;
      }
    })();
    void showNotification('Nouvelle messe programmée', {
      body: `${mass.title} — ${when}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `mass-${id}`,
      data: { url: '/' },
    });
  });
};

/** Abonne cet appareil aux pushes de la paroisse (si configuré). Retourne le mode actif. */
export const subscribeToMassNotifications = async (
  parishId: string,
): Promise<'push' | 'local'> => {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return 'local';
  if (!VAPID_KEY || !('PushManager' in window)) return 'local';

  try {
    const { getMessaging, getToken } = await import('firebase/messaging');
    const { app } = await import('./firebase');
    const messaging = getMessaging(app);
    // En prod le SW est déjà enregistré au chargement ; en dev on attend ready.
    const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return 'local';

    await setDoc(doc(db, TOKEN_COLLECTION, token), {
      token,
      parishId,
      uid: auth.currentUser?.uid ?? null,
      platform: /android/i.test(navigator.userAgent) ? 'android' : /iphone|ipad/i.test(navigator.userAgent) ? 'ios' : 'web',
      createdAt: serverTimestamp(),
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return 'push';
  } catch (e) {
    console.error('Abonnement FCM impossible', e);
    return 'local';
  }
};

/** Retire l'abonnement de cet appareil (push) et mémorise le retrait. */
export const unsubscribeFromMassNotifications = async (): Promise<void> => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return;
  try {
    await deleteDoc(doc(db, TOKEN_COLLECTION, token));
  } catch (e) {
    console.warn('Suppression du jeton push impossible', e);
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch (e) {
    console.warn('Désabonnement push impossible', e);
  }
};
