import React, { useState } from 'react';
import { Excuse, Reader } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Check, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Badge, Button, EmptyState } from './ui';
import { confirmAsync } from '../lib/utils';

interface Props {
  excuses: Excuse[];
  readers: Reader[];
}

export const ExcusesView: React.FC<Props> = ({ excuses, readers }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'excuses', id), { approved: true });
      toast.success('Excuse approuvée');
    } catch (e: any) {
      console.error("Erreur lors de l'approbation :", e);
      toast.error(`Impossible d'approuver : ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAsync('Supprimer cette excuse ?', 'Supprimer'))) return;
    try {
      await deleteDoc(doc(db, 'excuses', id));
      toast.success('Excuse supprimée');
    } catch (e: any) {
      console.error('Erreur lors de la suppression :', e);
      toast.error(`Impossible de supprimer : ${e.message}`);
    }
  };

  const pendingCount = excuses.filter((e) => !e.approved).length;
  const visible = [...excuses]
    .filter((e) => (filter === 'all' ? true : filter === 'approved' ? !!e.approved : !e.approved))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filters: { id: 'all' | 'pending' | 'approved'; label: string }[] = [
    { id: 'all', label: 'Toutes' },
    { id: 'pending', label: `En attente (${pendingCount})` },
    { id: 'approved', label: 'Approuvées' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absences & excuses"
        description={`${excuses.length} demande(s) — ${pendingCount} en attente de validation`}
        actions={
          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f.id ? 'bg-accent text-midnight shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="Aucune excuse à afficher"
          description={
            filter === 'pending'
              ? 'Aucune demande en attente : tout est traité.'
              : "Les absences signalées par les lecteurs apparaîtront ici."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800/60 bg-card">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-950/60">
              <tr className="border-b border-slate-800">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Lecteur</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date concernée</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Message</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Statut</th>
                <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {visible.map((excuse) => {
                const reader = readers.find((r) => r.id === excuse.readerId);
                const name = reader
                  ? `${reader.prenom || ''} ${reader.name || ''} ${reader.postnom || ''}`.trim()
                  : 'Lecteur inconnu';
                return (
                  <tr key={excuse.id} className="transition-colors hover:bg-slate-900/40">
                    <td className="p-4 text-sm font-semibold text-white">{name}</td>
                    <td className="p-4 text-sm text-slate-400">
                      {format(parseISO(excuse.date), 'd MMMM yyyy', { locale: fr })}
                    </td>
                    <td className="p-4 text-sm text-slate-300">{excuse.message}</td>
                    <td className="p-4">
                      <Badge status={excuse.approved ? 'approved' : 'pending'} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {!excuse.approved && (
                          <Button
                            variant="ghost"
                            className="px-2 py-1.5 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => handleApprove(excuse.id)}
                            title="Approuver"
                          >
                            <Check size={16} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="px-2 py-1.5 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(excuse.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};