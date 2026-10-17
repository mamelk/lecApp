/**
 * Classement des lecteurs pour une messe.
 *
 * Règles :
 *  - le classement se fait une semaine avant la messe ;
 *  - pour être classé, le lecteur doit avoir : la formation terminée et validée,
 *    été présent(e) aux 2 dernières réunions tenues au plus tard le jour du
 *    classement, la validation du responsable discipline, et être actif(ve) ;
 *  - seuls les lecteurs valides sont proposés ; les autres postes sont laissés
 *    au responsable (modification libre après proposition) ;
 *  - les lecteurs valides non classés (sans place) sont conservés, classés, pour
 *    les messes à venir : personne n'est oublié ;
 *  - la rotation évite de remettre le même lecteur au même poste : on prend
 *    d'abord qui a le moins souvent fait ce poste, et le plus longtemps.
 */
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Attendance, Mass, Meeting, Planning, Reader, ReaderAssignment } from '../types';

export const RANKING_LEAD_DAYS = 7; // classement une semaine avant la messe
export const RANKING_MEETINGS_REQUIRED = 2; // dernières réunions exigées

export interface RankingRole {
  id: ReaderAssignment['role'];
  label: string;
  short: string;
  optional?: boolean;
}

/** Postes de la célébration (source unique, utilisée par l'interface). */
export const ROLES: RankingRole[] = [
  { id: 'commentator', label: 'Le Commentateur', short: 'Com.' },
  { id: 'reading1', label: 'Première Lecture', short: '1è Lect.' },
  { id: 'reading2', label: 'Deuxième Lecture', short: '2è Lect.', optional: true },
  { id: 'universal_prayer', label: 'Prière Universelle', short: 'Int.' },
];

export interface ReaderEligibility {
  reader: Reader;
  eligible: boolean;
  trainingOk: boolean;
  activeOk: boolean;
  disciplineOk: boolean;
  meetingsRequired: number;
  meetingsAttended: number;
  meetingsOk: boolean;
  reasons: string[];
}

/** Jour du classement : 7 jours avant la messe. */
export const rankingDateOf = (mass: Mass): Date =>
  new Date(new Date(mass.date).getTime() - RANKING_LEAD_DAYS * 86400000);

/**
 * Les réunions tenues au plus tard le jour du classement, triées
 * chronologiquement, dont les `RANKING_MEETINGS_REQUIRED` dernières.
 * Exemple : messe du 18/10 → classement le 11/10 → réunions du 3/10 et 10/10.
 */
export const requiredMeetingsFor = (mass: Mass, meetings: Meeting[]): Meeting[] => {
  const rankingDate = rankingDateOf(mass);
  return meetings
    .filter((m) => new Date(m.date).getTime() <= rankingDate.getTime())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RANKING_MEETINGS_REQUIRED)
    .reverse();
};

const wasPresent = (attendance: Attendance[], meetingId: string, readerId: string): boolean =>
  attendance.some(
    (a) =>
      a.massId === meetingId &&
      a.readerId === readerId &&
      (a.status === 'present' || a.status === 'late'),
  );

/** Évalue chaque lecteur sur les 3 conditions de classement. */
export const evaluateEligibility = (
  mass: Mass,
  readers: Reader[],
  attendance: Attendance[],
  meetings: Meeting[],
): ReaderEligibility[] => {
  const required = requiredMeetingsFor(mass, meetings);

  return readers.map((reader) => {
    const activeOk = reader.isActive !== false;
    const trainingOk = reader.trainingStatus === 'completed';
    const disciplineOk = reader.disciplineValidated === true;
    const meetingsAttended = required.filter((m) => wasPresent(attendance, m.id, reader.id)).length;
    // Sans réunion enregistrée, le critère ne peut pas être tranché : on
    // n'exclut pas, mais l'interface l'indique clairement.
    const meetingsOk = required.length === 0 || meetingsAttended === required.length;

    const reasons: string[] = [];
    if (!activeOk) reasons.push('Inactif');
    if (!trainingOk) reasons.push('Formation non validée');
    if (!meetingsOk) {
      reasons.push(`Réunion(s) manquante(s) : ${meetingsAttended}/${required.length}`);
    }
    if (!disciplineOk) reasons.push('Discipline non validée');

    return {
      reader,
      activeOk,
      trainingOk,
      disciplineOk,
      meetingsRequired: required.length,
      meetingsAttended,
      meetingsOk,
      eligible: activeOk && trainingOk && disciplineOk && meetingsOk,
      reasons,
    };
  });
};

export const emptyPreparation = (): NonNullable<ReaderAssignment['preparation']> => ({
  rehearsal: false,
  confession: false,
  spiritual: false,
  confirmed: false,
});

interface HistoryEntry {
  role: string;
  dateMs: number;
}

/**
 * Historique des postes, en ne comptant que les messes strictement antérieures
 * à `beforeMs` (les messes à venir ne pénalisent pas encore).
 */
const historyOf = (
  plannings: Planning[],
  masses: Mass[],
  beforeMs: number,
): Record<string, HistoryEntry[]> => {
  const dateByMass: Record<string, number> = {};
  masses.forEach((m) => (dateByMass[m.id] = new Date(m.date).getTime()));

  const history: Record<string, HistoryEntry[]> = {};
  Object.values(plannings).forEach((planning) => {
    const massDate = dateByMass[planning.massId];
    if (massDate === undefined || massDate >= beforeMs) return;
    (planning.assignments || []).forEach((assignment) => {
      if (!history[assignment.readerId]) history[assignment.readerId] = [];
      history[assignment.readerId].push({ role: assignment.role, dateMs: massDate });
    });
  });
  return history;
};

const sortCandidates =
  (history: Record<string, HistoryEntry[]>) =>
  (a: Reader, b: Reader, roleId: string): number => {
    const hA = history[a.id] || [];
    const hB = history[b.id] || [];

    // 1. Qui a le moins souvent fait CE poste ?
    const countA = hA.filter((h) => h.role === roleId).length;
    const countB = hB.filter((h) => h.role === roleId).length;
    if (countA !== countB) return countA - countB;

    // 2. Qui n'a pas fait ce poste depuis le plus longtemps (jamais = mieux) ?
    const lastA = Math.max(0, ...hA.filter((h) => h.role === roleId).map((h) => h.dateMs));
    const lastB = Math.max(0, ...hB.filter((h) => h.role === roleId).map((h) => h.dateMs));
    if (lastA !== lastB) return lastA - lastB;

    // 3. Rééquilibrage global : qui a le moins servi au total ?
    if (hA.length !== hB.length) return hA.length - hB.length;

    // 4. Ordre alphabétique pour un résultat déterministe.
    return `${a.name}${a.prenom}`.localeCompare(`${b.name}${b.prenom}`, 'fr');
  };

export interface RankingProposal {
  assignments: ReaderAssignment[];
  /** Lecteurs valides sans place : proposés aux prochaines messes. */
  queued: ReaderEligibility[];
  eligibleCount: number;
}

/**
 * Construit le classement automatique d'une messe :
 * tous les postes remplis depuis les lecteurs valides, rotation appliquée,
 * le reste des valides classé pour les prochaines messes.
 */
export const proposeRanking = (
  mass: Mass,
  eligibility: ReaderEligibility[],
  plannings: Planning[],
  masses: Mass[],
  roles: RankingRole[] = ROLES,
): RankingProposal => {
  const eligible = eligibility.filter((e) => e.eligible);
  const massDate = new Date(mass.date).getTime();
  // L'historique ne retient que les messes strictement AVANT celle-ci.
  const pastOnly = historyOf(plannings, masses, massDate);

  const assignments: ReaderAssignment[] = [];
  const used = new Set<string>();

  roles.forEach((role) => {
    const candidates = eligible
      .map((e) => e.reader)
      .filter(
        (reader) =>
          !used.has(reader.id) &&
          (!reader.roles || reader.roles.length === 0 || reader.roles.includes(role.id)),
      )
      .sort((a, b) => sortCandidates(pastOnly)(a, b, role.id));

    const picked = candidates[0];
    if (picked) {
      used.add(picked.id);
      assignments.push({ readerId: picked.id, role: role.id, preparation: emptyPreparation() });
    }
  });

  // Tous les valides restants sont conservés, ordonnés, pour les prochaines messes.
  const queued = eligibility
    .filter((e) => e.eligible && !used.has(e.reader.id))
    .sort((a, b) => sortCandidates(pastOnly)(a.reader, b.reader, '__queue__'));

  return { assignments, queued, eligibleCount: eligible.length };
};

/** Conserve les préparations déjà saisies quand le classement est relancé. */
export const carryOverPreparation = (
  next: ReaderAssignment[],
  previous: ReaderAssignment[],
): ReaderAssignment[] =>
  next.map((assignment) => {
    const same = previous.find(
      (p) => p.readerId === assignment.readerId && p.role === assignment.role,
    );
    return same && same.preparation ? { ...assignment, preparation: same.preparation } : assignment;
  });

export interface AutoProposalSummary {
  eligibleCount: number;
  assigned: number;
  queued: number;
  requiredMeetings: Meeting[];
  created: boolean;
}

/**
 * Propose puis enregistre le classement automatique d'une messe.
 * Appelé automatiquement à la création de chaque messe, et depuis l'écran du
 * planning pour re-proposer. Les champs `proposedAt/proposedBy` ne sont posés
 * qu'à la création : les règles Firestore n'autorisent la mise à jour que de
 * `assignments` et `isFinalized`.
 */
export const autoProposePlanning = async (
  parishId: string,
  mass: Mass,
): Promise<AutoProposalSummary> => {
  const [readersSnap, attendanceSnap, planningsSnap, meetingsSnap, massesSnap] =
    await Promise.all([
      getDocs(query(collection(db, 'readers'), where('parishId', '==', parishId))),
      getDocs(query(collection(db, 'attendance'), where('parishId', '==', parishId))),
      getDocs(query(collection(db, 'plannings'), where('parishId', '==', parishId))),
      getDocs(query(collection(db, 'meetings'), where('parishId', '==', parishId))),
      getDocs(query(collection(db, 'masses'), where('parishId', '==', parishId))),
    ]);

  const readers = readersSnap.docs.map((d) => ({ ...(d.data() as Reader), id: d.id }));
  const attendance = attendanceSnap.docs.map((d) => ({ ...(d.data() as Attendance), id: d.id }));
  const plannings = planningsSnap.docs.map((d) => ({ ...(d.data() as Planning), id: d.id }));
  const meetings = meetingsSnap.docs.map((d) => ({ ...(d.data() as Meeting), id: d.id }));
  const masses = massesSnap.docs.map((d) => ({ ...(d.data() as Mass), id: d.id }));

  const eligibility = evaluateEligibility(mass, readers, attendance, meetings);
  const proposal = proposeRanking(mass, eligibility, plannings, masses);

  const existing = plannings.find((p) => p.massId === mass.id);
  if (existing) {
    await updateDoc(doc(db, 'plannings', existing.id), {
      assignments: carryOverPreparation(proposal.assignments, existing.assignments || []),
    });
  } else if (proposal.assignments.length > 0) {
    await addDoc(collection(db, 'plannings'), {
      parishId,
      massId: mass.id,
      assignments: proposal.assignments,
      isFinalized: false,
      proposedAt: new Date().toISOString(),
      proposedBy: 'auto',
    });
  }

  return {
    eligibleCount: proposal.eligibleCount,
    assigned: proposal.assignments.length,
    queued: proposal.queued.length,
    requiredMeetings: requiredMeetingsFor(mass, meetings),
    created: !existing,
  };
};
