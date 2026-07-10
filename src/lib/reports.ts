import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Reader, Mass, Attendance, Planning, Feedback } from '../types';

export const generateReaderStatsPDF = (
  reader: Reader,
  attendance: Attendance[],
  assignments: any[],
  masses: Mass[],
  feedbacks: Feedback[],
  parishName: string
) => {
  const doc = new jsPDF();
  const now = new Date();
  const nowStr = format(now, 'dd/MM/yyyy HH:mm', { locale: fr });
  const currentMonthStart = startOfMonth(now);

  // Header
  doc.setFontSize(22);
  doc.setTextColor(245, 158, 11); // Accent color
  doc.text('Leitourghia - Rapport Individuel', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Paroisse: ${parishName}`, 20, 30);
  doc.text(`Généré le: ${nowStr}`, 20, 37);

  // Reader Info
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(`${reader.prenom} ${reader.name.toUpperCase()} ${reader.postnom}`, 20, 55);
  
  doc.setFontSize(10);
  doc.text(`Contact: ${reader.phone || 'N/A'}`, 20, 62);
  doc.text(`Email: ${reader.email || 'N/A'}`, 20, 67);
  doc.text(`Statut Formation: ${reader.trainingStatus.toUpperCase()}`, 20, 72);

  // Summary Table
  const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const totalConvocations = attendance.length;
  const participationRate = totalConvocations > 0 ? Math.round((presentCount / totalConvocations) * 100) : 0;

  autoTable(doc, {
    startY: 85,
    head: [['Métrique', 'Valeur']],
    body: [
      ['Total Convocations (Messes)', totalConvocations],
      ['Présences effectives', presentCount],
      ['Taux de participation', `${participationRate}%`],
      ['Missions honorées (Rôles)', assignments.length],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] as any },
  });

  // Monthly Feedback Section
  const monthlyFeedbacks = feedbacks.filter(f => {
    const feedbackDate = parseISO(f.createdAt);
    return isSameMonth(feedbackDate, now);
  });

  if (monthlyFeedbacks.length > 0) {
    doc.setFontSize(14);
    doc.text(`Remarques du mois (${format(now, 'MMMM yyyy', { locale: fr })})`, 20, (doc as any).lastAutoTable.finalY + 15);
    
    const feedbackData = monthlyFeedbacks.map(f => {
      const mass = masses.find(m => m.id === f.massId);
      return [
        mass ? format(parseISO(mass.date), 'dd/MM') : '-',
        mass?.title || 'Événement',
        f.comment,
        `${f.rating}/5`
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Messe', 'Commentaire', 'Note']],
      body: feedbackData,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] as any },
    });
  }

  // History Table
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Historique Complet des Présences', 20, 20);

  const historyData = attendance.slice(0, 30).map(a => {
    const mass = masses.find(m => m.id === a.massId);
    return [
      mass ? format(parseISO(mass.date), 'dd/MM/yyyy') : '-',
      mass?.title || 'Événement',
      a.type === 'mass' ? 'Messe' : 'Réunion',
      a.status.toUpperCase()
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Événement', 'Type', 'Statut']],
    body: historyData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] as any },
  });

  doc.save(`Rapport_${reader.name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateGlobalStatsPDF = (
  readers: Reader[],
  attendance: Attendance[],
  plannings: Planning[],
  masses: Mass[],
  feedbacks: Feedback[],
  parishName: string
) => {
  const doc = new jsPDF();
  const now = new Date();
  const nowStr = format(now, 'dd/MM/yyyy HH:mm', { locale: fr });

  doc.setFontSize(22);
  doc.setTextColor(245, 158, 11);
  doc.text('Leitourghia - Statistiques Globales', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Paroisse: ${parishName}`, 20, 30);
  doc.text(`Généré le: ${nowStr}`, 20, 37);

  const massAtt = attendance.filter(a => a.type === 'mass');
  const presences = massAtt.filter(a => a.status === 'present' || a.status === 'late').length;
  const globalRate = massAtt.length > 0 ? Math.round((presences / massAtt.length) * 100) : 0;

  autoTable(doc, {
    startY: 50,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Nombre total de lecteurs', readers.length],
      ['Lecteurs actifs', readers.filter(r => r.isActive).length],
      ['Lecteurs formés', readers.filter(r => r.trainingStatus === 'completed').length],
      ['Taux de présence global (Messes)', `${globalRate}%`],
      ['Plannings finalisés', plannings.filter(p => p.isFinalized).length],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] as any },
  });

  // Current Month Masses & Assignments
  doc.addPage();
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(`Messes du mois (${format(now, 'MMMM yyyy', { locale: fr })})`, 20, 20);

  const currentMonthMasses = masses.filter(m => isSameMonth(parseISO(m.date), now))
    .sort((a,b) => a.date.localeCompare(b.date));

  const massesData = currentMonthMasses.map(m => {
    const planning = plannings.find(p => p.massId === m.id);
    const assignmentList = planning?.assignments?.map(a => {
      const reader = readers.find(r => r.id === a.readerId);
      return reader ? `${reader.prenom} (${a.role.substring(0,4)})` : 'N/A';
    }).join(', ') || 'Aucune assignation';

    return [
      format(parseISO(m.date), 'dd/MM/yyyy HH:mm'),
      m.title,
      assignmentList
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Titre de la Messe', 'Lecteurs Assignés']],
    body: massesData,
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] as any },
    styles: { fontSize: 9 },
  });

  // Monthly Feedbacks
  doc.addPage();
  doc.setFontSize(16);
  doc.text(`Remarques par lecteur (${format(now, 'MMMM yyyy', { locale: fr })})`, 20, 20);

  const monthlyFeedbacks = feedbacks.filter(f => isSameMonth(parseISO(f.createdAt), now));
  const feedbackRows = monthlyFeedbacks.map(f => {
    const reader = readers.find(r => r.id === f.readerId);
    const mass = masses.find(m => m.id === f.massId);
    return [
      reader ? `${reader.prenom} ${reader.name.toUpperCase()}` : 'Inconnu',
      mass?.title || '-',
      f.comment,
      `${f.rating}/5`
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Lecteur', 'Messe', 'Remarque', 'Note']],
    body: feedbackRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] as any },
    styles: { fontSize: 9 },
  });

  doc.save(`Statistiques_Globales_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateReaderListPDF = (readers: Reader[], parishName: string) => {
  const doc = new jsPDF();
  const now = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr });

  doc.setFontSize(22);
  doc.setTextColor(245, 158, 11);
  doc.text('Annuaire des Lecteurs', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Paroisse: ${parishName}`, 20, 30);
  doc.text(`Généré le: ${now}`, 20, 37);

  const readersData = readers.map(r => [
    `${r.prenom} ${r.name.toUpperCase()} ${r.postnom}`,
    r.phone || '-',
    r.email || '-',
    r.trainingStatus === 'completed' ? 'Formé' : (r.trainingStatus === 'in_progress' ? 'En formation' : 'À former'),
    r.isActive ? 'Actif' : 'Inactif'
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['Nom Complet', 'Téléphone', 'Email', 'Formation', 'Statut']],
    body: readersData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] as any },
    styles: { fontSize: 9 },
  });

  doc.save(`Annuaire_Lecteurs_${parishName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generatePlanningPDF = (
  mass: Mass,
  assignments: { role: string; reader: Reader | null }[],
  parishName: string
) => {
  const doc = new jsPDF();
  const now = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr });
  const massDate = format(parseISO(mass.date), 'EEEE d MMMM yyyy HH:mm', { locale: fr });

  doc.setFontSize(22);
  doc.setTextColor(245, 158, 11);
  doc.text('Leitourghia - Planning Liturgique', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Paroisse: ${parishName}`, 20, 30);
  doc.text(`Événement: ${mass.title}`, 20, 37);
  doc.text(`Date: ${massDate}`, 20, 44);

  const planningData = assignments.map(a => [
    a.role,
    a.reader ? `${a.reader.prenom} ${a.reader.name.toUpperCase()} ${a.reader.postnom}` : 'NON ASSIGNÉ',
    a.reader?.phone || 'N/A'
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['Rôle', 'Lecteur Assigné', 'Contact']],
    body: planningData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] as any },
    styles: { fontSize: 11, cellPadding: 6 },
  });

  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('Merci de confirmer votre présence 15 minutes avant le début de l\'office.', 20, (doc as any).lastAutoTable.finalY + 20);

  doc.save(`Planning_${mass.title.replace(/\s+/g, '_')}_${format(parseISO(mass.date), 'yyyyMMdd')}.pdf`);
};

