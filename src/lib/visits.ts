import { doc, getDoc, increment, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Compteur de visiteurs du site.
 *
 * Un document par jour (`visits_daily/AAAA-MM-JJ`) porte le total du jour :
 * l'écran d'administration s'abonne à ce seul document, ce qui donne un
 * compteur *temps réel* sans relire toute une collection à chaque visite.
 * Chaque appareil n'incrémente qu'une fois par jour (drapeau localStorage),
 * pour ne pas gonfler le total à chaque rechargement de page.
 */
export interface DayVisits {
  day: string;
  count: number;
}

/** Clé locale du jour : `2026-11-04` (fuseau de l'appareil). */
export const dayKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const LAST_VISIT_KEY = 'lecapp_last_visit_day';

/** Enregistre la visite du jour (une seule fois par appareil et par jour). */
export const trackVisit = async (): Promise<void> => {
  const today = dayKey();
  try {
    if (localStorage.getItem(LAST_VISIT_KEY) === today) return;
    // Posé avant l'écriture : un double montage (StrictMode) ne compte pas deux fois.
    localStorage.setItem(LAST_VISIT_KEY, today);
  } catch {
    // Stockage indisponible (navigation privée) : on compte quand même.
  }

  try {
    await setDoc(
      doc(db, 'visits_daily', today),
      { day: today, count: increment(1), updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (e) {
    console.warn('Compteur de visites indisponible :', e);
  }
};

/** Abonnement temps réel au compteur d'un jour. */
export const subscribeDayVisits = (
  day: string,
  onChange: (count: number) => void,
): (() => void) =>
  onSnapshot(
    doc(db, 'visits_daily', day),
    (snapshot) => onChange(snapshot.exists() ? Number(snapshot.data().count) || 0 : 0),
    (error) => {
      console.warn('Visites indisponibles :', error);
      onChange(0);
    },
  );

const readDay = async (day: string): Promise<DayVisits> => {
  try {
    const snap = await getDoc(doc(db, 'visits_daily', day));
    return { day, count: snap.exists() ? Number(snap.data().count) || 0 : 0 };
  } catch {
    return { day, count: 0 };
  }
};

/** Totaux des `days` derniers jours (aujourd'hui inclus), du plus ancien au plus récent. */
export const fetchRecentVisits = async (days = 7): Promise<DayVisits[]> => {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
  }
  return Promise.all(keys.map(readDay));
};
