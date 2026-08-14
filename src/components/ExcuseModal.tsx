import React, { useState } from 'react';
import { Reader } from '../types';
import { db } from '../lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  readers: Reader[];
  parishId: string;
}

export const ExcuseModal: React.FC<Props> = ({ isOpen, onClose, date, readers, parishId }) => {
  const [readerId, setReaderId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!readerId || !message) return;
    setLoading(true);
    try {
        await addDoc(collection(db, 'excuses'), {
            parishId,
            readerId,
            message,
            date,
            createdAt: new Date().toISOString()
        });
        onClose();
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 p-6 sm:p-8 rounded-xl border border-slate-800 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Présenter mes excuses</h2>
            <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white mb-4" value={readerId} onChange={e => setReaderId(e.target.value)}>
                <option value="">Sélectionner un lecteur</option>
                {[...readers].sort((a, b) => 
                  `${a.prenom || ''} ${a.name || ''} ${a.postnom || ''}`.localeCompare(`${b.prenom || ''} ${b.name || ''} ${b.postnom || ''}`)
                ).map(r => <option key={r.id} value={r.id}>{`${r.prenom || ''} ${r.name || ''} ${r.postnom || ''}`.trim()}</option>)}
            </select>
            <textarea className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white mb-4" placeholder="Vos excuses..." value={message} onChange={e => setMessage(e.target.value)} />
            <div className="flex justify-end gap-2">
                <button onClick={onClose} className="text-slate-500 font-bold uppercase text-xs">Annuler</button>
                <button onClick={handleSubmit} disabled={loading} className="bg-accent text-slate-950 font-bold uppercase text-xs px-4 py-2 rounded-lg">Envoyer</button>
            </div>
        </div>
    </div>
  );
};
