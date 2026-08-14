import React, { useState, useMemo } from 'react';
import { Contribution, Reader } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

interface TreasuryViewProps {
  readers: Reader[];
  parishId: string;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({ readers, parishId }) => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // In a real app, you would fetch contributions for the selected month/year here
  
  const readerContributions = useMemo(() => {
    return readers.map(reader => {
      const readerContribs = contributions.filter(c => c.readerId === reader.id);
      const totalPaid = readerContribs.reduce((sum, c) => sum + c.amount, 0);
      return {
        ...reader,
        totalPaid
      };
    });
  }, [readers, contributions]);

  const grandTotal = useMemo(() => {
    return contributions.reduce((sum, c) => sum + c.amount, 0);
  }, [contributions]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Trésorerie</h2>
      <div className="bg-slate-900 p-4 rounded-xl mb-6">
        <p className="text-slate-400">Solde total de tous les lecteurs: {grandTotal} €</p>
      </div>
      {/* Add logic to record contribution and display table here */}
    </div>
  );
};
