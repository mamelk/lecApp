import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export { app };

// Cache local persistant (IndexedDB) partagé entre les onglets : les
// réouvertures de l'app (notamment l'application installée sur téléphone)
// sont servies par le cache local et se synchronisent en arrière-plan au
// lieu de relire toutes les collections à chaque démarrage. Firestore
// ne recharge que les documents réellement modifiés, ce qui divise
// fortement les lectures quotidiennes (quota gratuit : 50 000/jour).
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
