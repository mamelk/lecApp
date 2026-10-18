import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui';
import {
  notificationsSupported,
  permissionState,
  pushConfigured,
  requestNotificationPermission,
  subscribeToMassNotifications,
  unsubscribeFromMassNotifications,
} from '../lib/notifications';

/**
 * Bouton « Notifications » :
 * - demande la permission système puis abonne l'appareil aux alertes de
 *   nouvelle messe (push FCM si configuré, sinon notification locale) ;
 * - propose le retrait d'abonnement tant que la permission est accordée ;
 * - masqué si le navigateur ne supporte pas les notifications.
 */
export const NotificationsBell: React.FC<{ parishId: string | null }> = ({ parishId }) => {
  const [permission, setPermission] = useState(permissionState());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPermission(permissionState());
  }, []);

  if (permission === 'unsupported') return null;

  const enable = async () => {
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted !== 'granted') {
        setPermission('denied');
        toast.error(
          'Notifications refusées. Autorisez-les dans les paramètres du navigateur pour être alerté des nouvelles messes.',
        );
        return;
      }
      setPermission('granted');
      const mode = parishId
        ? await subscribeToMassNotifications(parishId)
        : 'local';
      toast.success(
        mode === 'push'
          ? 'Notifications activées : vous serez averti même avec l’app fermée.'
          : 'Notifications activées pour cet appareil.',
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromMassNotifications();
      toast.info('Notifications désactivées sur cet appareil.');
    } finally {
      setBusy(false);
    }
  };

  if (permission === 'granted') {
    return (
      <span
        className="hidden items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-accent md:flex"
        title={
          pushConfigured()
            ? 'Alertes de nouvelle messe activées (push)'
            : 'Alertes de nouvelle messe activées (app ouverte)'
        }
      >
        <BellRing size={14} />
        <button
          onClick={disable}
          disabled={busy}
          className="underline decoration-dotted underline-offset-2 hover:text-white"
          title="Désactiver les notifications"
        >
          Alertes messe
        </button>
      </span>
    );
  }

  return (
    <Button
      variant={permission === 'denied' ? 'secondary' : 'accent'}
      className="text-xs"
      onClick={enable}
      disabled={busy}
      title="Recevoir une notification à chaque nouvelle messe"
    >
      {permission === 'denied' ? <BellOff size={15} /> : <Bell size={15} />}
      <span className="hidden lg:inline">
        {permission === 'denied' ? 'Notifications bloquées' : 'Activer les alertes'}
      </span>
    </Button>
  );
};
