import React, { useState } from 'react';
import { Reader } from '../types';
import { db } from '../lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { toast } from 'sonner';
import { Modal, Field, Select, Textarea, Button } from './ui';

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

  const handleSubmit = async () => {
    if (!readerId || !message.trim()) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }

    const excuseData = {
      parishId,
      readerId,
      message: message.trim(),
      date,
      createdAt: new Date().toISOString(),
    };

    setLoading(true);
    try {
      await addDoc(collection(db, 'excuses'), excuseData);
      toast.success("Votre excuse a bien été transmise à l'administration.");
      setReaderId('');
      setMessage('');
      onClose();
    } catch (e: any) {
      console.error("Erreur lors de l'envoi de l'excuse :", e);
      toast.error(`Erreur lors de l'envoi : ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Présenter mes excuses">
      <div className="space-y-4">
        <Field label="Lecteur concerné">
          <Select value={readerId} onChange={(e) => setReaderId(e.target.value)}>
            <option value="">Sélectionner un lecteur</option>
            {[...readers]
              .sort((a, b) =>
                `${a.prenom || ''} ${a.name || ''} ${a.postnom || ''}`.localeCompare(
                  `${b.prenom || ''} ${b.name || ''} ${b.postnom || ''}`,
                ),
              )
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {`${r.prenom || ''} ${r.name || ''} ${r.postnom || ''}`.trim()}
                </option>
              ))}
          </Select>
        </Field>

        <Field label="Motif" hint="Votre message sera visible par l'administration de la paroisse.">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Expliquez brièvement la raison de votre absence..."
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="accent" onClick={handleSubmit} loading={loading} disabled={!readerId || !message.trim()}>
            Envoyer
          </Button>
        </div>
      </div>
    </Modal>
  );
};