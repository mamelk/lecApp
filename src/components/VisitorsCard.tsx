import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp, Users } from 'lucide-react';
import { Card, SectionTitle } from './ui';
import { dayKey, fetchRecentVisits, subscribeDayVisits, type DayVisits } from '../lib/visits';

/**
 * Visiteurs du site : total du jour en direct (abonnement Firestore) et
 * historique des 7 derniers jours.
 */
export const VisitorsCard: React.FC = () => {
  const today = dayKey();
  const [todayCount, setTodayCount] = useState(0);
  const [history, setHistory] = useState<DayVisits[]>([]);

  useEffect(() => subscribeDayVisits(today, setTodayCount), [today]);

  useEffect(() => {
    let alive = true;
    void fetchRecentVisits(7).then((rows) => {
      if (alive) setHistory(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (history.length === 0) return [];
    return history.map((row) => (row.day === today ? { ...row, count: todayCount } : row));
  }, [history, today, todayCount]);

  const max = Math.max(1, ...rows.map((r) => r.count));
  const weekTotal = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card className="bg-slate-900/50">
      <SectionTitle
        icon={TrendingUp}
        action={
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            En direct
          </span>
        }
      >
        Visiteurs du site
      </SectionTitle>

      <div className="mt-3 flex items-end gap-3">
        <p className="text-4xl font-black leading-none text-white">{todayCount}</p>
        <div className="pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            aujourd'hui
          </p>
          <p className="text-[10px] text-slate-600">
            {weekTotal} cette semaine · {format(new Date(), 'EEEE d MMMM', { locale: fr })}
          </p>
        </div>
      </div>

      <div className="mt-5 flex h-24 items-end gap-1.5">
        {rows.map((row) => {
          const isToday = row.day === today;
          const height = Math.max(6, Math.round((row.count / max) * 100));
          return (
            <div key={row.day} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className={`text-[9px] font-bold ${isToday ? 'text-accent' : 'text-slate-500'}`}
                title={`${row.count} visiteur(s)`}
              >
                {row.count}
              </span>
              <div className="flex h-14 w-full items-end">
                <div
                  className={`w-full rounded-md transition-all ${
                    isToday ? 'bg-accent' : 'bg-slate-700/70'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span
                className={`text-[9px] font-bold uppercase ${
                  isToday ? 'text-accent' : 'text-slate-600'
                }`}
              >
                {format(new Date(`${row.day}T12:00:00`), 'EEEEE', { locale: fr })}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="flex w-full items-center justify-center gap-2 text-[11px] italic text-slate-600">
            <Users size={14} /> Aucune donnée pour le moment
          </div>
        )}
      </div>
    </Card>
  );
};
