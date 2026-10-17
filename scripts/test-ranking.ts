/**
 * Tests du moteur de classement — exécutés avec `npx tsx scripts/test-ranking.ts`.
 * Cas représentatifs : messe du 18/10 (classement le 11/10), réunions du 3/10
 * et 10/10 (exigées) et du 17/10 (hors classement, non exigée).
 */
import {
  evaluateEligibility,
  proposeRanking,
  requiredMeetingsFor,
  carryOverPreparation,
  ROLES,
} from '../src/lib/ranking';
import { Attendance, Mass, Meeting, Planning, Reader } from '../src/types';

let failures = 0;
const check = (label: string, condition: boolean, detail?: unknown) => {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`, detail ?? '');
  }
};

const parishId = 'par_test';
const iso = (d: string) => new Date(d).toISOString();

const meetings: Meeting[] = [
  { id: 'm1', parishId, title: 'Réunion 3 octobre', date: iso('2026-10-03T18:00:00') },
  { id: 'm2', parishId, title: 'Réunion 10 octobre', date: iso('2026-10-10T18:00:00') },
  { id: 'm3', parishId, title: 'Réunion 17 octobre', date: iso('2026-10-17T18:00:00') },
];

const mass: Mass = {
  id: 'mass18',
  parishId,
  title: 'Messe du 18 octobre',
  date: iso('2026-10-18T08:00:00'),
  maxReaders: 4,
};

const reader = (
  id: string,
  overrides: Partial<Reader> = {},
): Reader => ({
  id,
  parishId,
  name: `Nom${id}`,
  postnom: 'Postnom',
  prenom: `Prenom${id}`,
  completedModules: [],
  isActive: true,
  trainingStatus: 'completed',
  disciplineValidated: true,
  roles: [],
  ...overrides,
});

const present = (readerId: string, meetingId: string): Attendance => ({
  id: `${readerId}-${meetingId}`,
  parishId,
  massId: meetingId,
  readerId,
  type: 'meeting',
  status: 'present',
});

console.log('\n1. Fenêtre de réunions (classement une semaine avant)');
{
  const required = requiredMeetingsFor(mass, meetings);
  check(
    'les 2 dernières réunions avant le classement sont exigées',
    required.map((m) => m.id).join(',') === 'm1,m2',
    required.map((m) => m.id),
  );
  check('la réunion du 17/10 (après le classement) n’est pas exigée', !required.some((m) => m.id === 'm3'));
  check('la date de classement est 7 jours avant la masse', new Date(mass.date).getDate() - 7 === 11);
  check(
    'aucune réunion ⇒ critère non opposable',
    requiredMeetingsFor(mass, []).length === 0,
  );
}

console.log('\n2. Éligibilité (formation + 2 réunions + discipline + actif)');
{
  const readers: Reader[] = [
    reader('A'), // conforme
    reader('B'), // absent à la réunion du 10
    reader('C', { trainingStatus: 'in_progress' }), // formation non finie
    reader('D', { disciplineValidated: false }), // discipline non validée
    reader('E', { isActive: false }), // inactif
    reader('F'), // conforme, mais absent de la réunion du 17 (hors classement)
    reader('G'), // conforme
    reader('H'), // conforme
    reader('I'), // conforme
    reader('J'), // conforme
  ];
  const attendance: Attendance[] = [
    present('A', 'm1'),
    present('A', 'm2'),
    present('B', 'm1'), // B rate m2
    present('C', 'm1'),
    present('C', 'm2'),
    present('D', 'm1'),
    present('D', 'm2'),
    present('E', 'm1'),
    present('E', 'm2'),
    present('F', 'm1'),
    present('F', 'm2'),
    present('G', 'm1'),
    present('G', 'm2'),
    present('H', 'm1'),
    present('H', 'm2'),
    present('I', 'm1'),
    present('I', 'm2'),
    present('J', 'm1'),
    present('J', 'm2'),
  ];

  const result = evaluateEligibility(mass, readers, attendance, meetings);
  const eligibleIds = result.filter((e) => e.eligible).map((e) => e.reader.id);
  const byId = (id: string) => result.find((e) => e.reader.id === id)!;

  check(
    'seuls A, F, G, H, I, J sont valides',
    eligibleIds.join(',') === 'A,F,G,H,I,J',
    eligibleIds,
  );
  check('B : réunion manquante signalée', byId('B').reasons.some((r) => r.includes('Réunion')));
  check('C : formation non validée', byId('C').reasons.includes('Formation non validée'));
  check('D : discipline non validée', byId('D').reasons.includes('Discipline non validée'));
  check('E : inactif', byId('E').reasons.includes('Inactif'));
  check('F validé même sans la réunion du 17/10', byId('F').eligible);
  check(
    'présent(e) aux 2 réunions exigées : 2/2 pour A',
    byId('A').meetingsAttended === 2 && byId('A').meetingsRequired === 2,
  );

  // Sans aucune réunion enregistrée : le critère de présence n'exclut pas.
  const noMeetings = evaluateEligibility(mass, [reader('A')], [], []);
  check('aucune réunion enregistrée ⇒ non exclu sur ce critère', noMeetings[0].eligible);

  console.log('\n3. Proposition automatique : postes, rotation, personne oublié');
  const pastMasses: Mass[] = [
    { id: 'p1', parishId, title: '20 sept', date: iso('2026-09-20T08:00:00'), maxReaders: 4 },
    { id: 'p2', parishId, title: '27 sept', date: iso('2026-09-27T08:00:00'), maxReaders: 4 },
  ];
  const pastPlannings: Planning[] = [
    {
      id: 'pl1',
      parishId,
      massId: 'p1',
      isFinalized: true,
      assignments: [
        { readerId: 'A', role: 'commentator' },
        { readerId: 'F', role: 'reading1' },
        { readerId: 'G', role: 'reading2' },
        { readerId: 'H', role: 'universal_prayer' },
      ],
    },
    {
      id: 'pl2',
      parishId,
      massId: 'p2',
      isFinalized: true,
      assignments: [
        { readerId: 'A', role: 'commentator' },
        { readerId: 'F', role: 'reading1' },
        { readerId: 'G', role: 'reading2' },
        { readerId: 'H', role: 'universal_prayer' },
      ],
    },
  ];

  const proposal = proposeRanking(mass, result, [...pastPlannings], [...pastMasses, mass]);
  const assignedIds = proposal.assignments.map((a) => a.readerId);
  const queuedIds = proposal.queued.map((q) => q.reader.id);

  check('les 4 postes sont remplis', proposal.assignments.length === 4, proposal.assignments);
  check(
    'seuls des lecteurs valides sont classés',
    assignedIds.every((id) => eligibleIds.includes(id)),
    assignedIds,
  );
  check(
    'A ne reprend pas le commentaire (2 fois de suite)',
    !proposal.assignments.some((a) => a.readerId === 'A' && a.role === 'commentator'),
  );
  check(
    'chaque lecteur n’a qu’un seul poste',
    new Set(assignedIds).size === assignedIds.length,
    assignedIds,
  );
  check(
    'tous les valides sont classés ou en file : aucun oublié',
    [...assignedIds, ...queuedIds].sort().join(',') === [...eligibleIds].sort().join(','),
    { assignedIds, queuedIds, eligibleIds },
  );
  check(
    'les valides sans place sont en file pour les prochaines messes',
    proposal.queued.length === eligibleIds.length - 4,
    queuedIds,
  );
  check('postes avec préparation initialisée', proposal.assignments.every((a) => a.preparation && a.preparation.confirmed === false));

  console.log('\n4. Re-proposition : la préparation déjà saisie est conservée');
  const withPrep = proposal.assignments.map((a, i) =>
    i === 0 ? { ...a, preparation: { rehearsal: true, confession: true, spiritual: true, confirmed: true } } : a,
  );
  const carried = carryOverPreparation(proposal.assignments, withPrep);
  check(
    'le lecteur conservé garde sa préparation',
    carried[0].preparation?.confirmed === true && carried[0].preparation?.rehearsal === true,
    carried[0].preparation,
  );
}

console.log(`\n${failures === 0 ? 'TOUS LES TESTS PASSENT' : `${failures} ÉCHEC(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);