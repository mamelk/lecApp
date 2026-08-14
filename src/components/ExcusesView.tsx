import React from 'react';
import { Excuse, Reader } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Check, Trash2 } from 'lucide-react';

interface Props {
  excuses: Excuse[];
  readers: Reader[];
}

export const ExcusesView: React.FC<Props> = ({ excuses, readers }) => {

  const handleApprove = async (id: string) => {
    try {
      console.log("Tentative d'approbation de l'excuse avec ID :", id);
      const excuseDocRef = doc(db, 'excuses', id);
      await updateDoc(excuseDocRef, { approved: true });
      console.log("Excuse approuvée avec succès");
    } catch (e: any) {
      console.error("Erreur détaillée lors de l'approbation de l'excuse :", e);
      console.error("Code erreur :", e.code);
      console.error("Message erreur :", e.message);
      alert(`Erreur lors de l'approbation : ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log("Tentative de suppression de l'excuse avec ID :", id);
      const excuseDocRef = doc(db, 'excuses', id);
      await deleteDoc(excuseDocRef);
      console.log("Excuse supprimée avec succès");
    } catch (e: any) {
      console.error("Erreur détaillée lors de la suppression de l'excuse :", e);
      console.error("Code erreur :", e.code);
      console.error("Message erreur :", e.message);
      alert(`Erreur lors de la suppression : ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Absences et Excuses</h2>
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950 border-b border-slate-800">
            <tr>
              <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500">Lecteur</th>
              <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500">Date</th>
              <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500">Message</th>
              <th className="p-4 text-[10px] uppercase tracking-widest text-slate-500 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {excuses.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(excuse => {
              console.log("Excuse:", excuse);
              const reader = readers.find(r => r.id === excuse.readerId);
              return (
                <tr key={excuse.id} className={excuse.approved ? 'bg-emerald-900/20' : ''}>
                  <td className="p-4 text-white text-sm font-bold">{reader ? `${reader.prenom || ''} ${reader.name || ''} ${reader.postnom || ''}`.trim() : 'Inconnu'}</td>
                  <td className="p-4 text-slate-400 text-sm">{format(parseISO(excuse.date), 'd MMMM yyyy', { locale: fr })}</td>
                  <td className="p-4 text-slate-300 text-sm">{excuse.message}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                        {!excuse.approved && (
                            <button onClick={() => handleApprove(excuse.id)} className="p-1 text-emerald-500 hover:text-emerald-400">
                                <Check size={16} />
                            </button>
                        )}
                        <button onClick={() => handleDelete(excuse.id)} className="p-1 text-red-500 hover:text-red-400">
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
