import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Modal } from './ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const android = window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari : navigator.standalone passe à true une fois sur l'écran d'accueil
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return android || ios;
};

/**
 * Bouton « Installer l'app » :
 * - Android / Chrome / Edge : utilise le prompt natif du navigateur (beforeinstallprompt) ;
 * - iOS, Firefox, ou prompt indisponible : affiche les instructions adaptées ;
 * - masqué une fois l'app installée.
 */
export const InstallPWA: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success('Application installée sur votre appareil.');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <span className="hidden items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-400 md:flex">
        <CheckCircle size={14} /> Installée
      </span>
    );
  }

  const install = async () => {
    if (!deferred) {
      setHelpOpen(true);
      return;
    }
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'dismissed') {
        toast.info("Installation reportée — vous pourrez réessayer à tout moment.");
      }
    } finally {
      setDeferred(null);
    }
  };

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isFirefox = /Firefox\//.test(ua);
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua) && !/Edg\//.test(ua);

  const steps: { icon: React.ReactNode; title: string; detail: string }[] = isIOS
    ? [
        {
          icon: <Smartphone size={16} />,
          title: 'Sur iPhone / iPad (Safari)',
          detail: "Bouton Partager (carré + flèche) → « Sur l'écran d'accueil » → « Ajouter ».",
        },
      ]
    : isAndroid
      ? [
          {
            icon: <Smartphone size={16} />,
            title: 'Sur Android',
            detail: 'Menu ⋮ en haut → « Installer lecApp » ou « Ajouter à l’écran d’accueil ».',
          },
        ]
      : [
          {
            icon: <Monitor size={16} />,
            title: 'Chrome / Edge (ordinateur)',
            detail:
              "Icône d'installation à droite de la barre d'adresse, ou menu ⋮ → « Installer lecApp… ».",
          },
          {
            icon: <Smartphone size={16} />,
            title: isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Autres navigateurs',
            detail: isFirefox
              ? "Menu ⋮ → « Installer le site… » (Android) — sur ordinateur, Firefox n'expose pas l'installation : utilisez Chrome ou Safari (iOS)."
              : isSafari
                ? "Safari (macOS) n'expose pas l'installation web : ouvrez la page sur iPhone (Partager → Sur l'écran d'accueil) ou dans Chrome."
                : 'Ce navigateur ne propose pas l’installation : ouvrez le site dans Chrome ou Edge.',
          },
        ];

  return (
    <>
      <Button
        variant={deferred ? 'accent' : 'secondary'}
        className="text-xs"
        onClick={install}
        title="Installer lecApp sur cet appareil"
      >
        <Download size={15} />
        <span className="hidden lg:inline">Installer l'app</span>
      </Button>

      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Installer lecApp">
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-400">
            lecApp s'installe comme une application native : elle ouvre en plein écran, sans barre
            d'adresse, avec son propre raccourci.
          </p>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-2xl border border-slate-800 bg-background/60 p-4"
              >
                <span className="mt-0.5 text-accent">{step.icon}</span>
                <div>
                  <p className="text-xs font-bold text-white">{step.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] italic text-slate-600">
            Astuce : après installation, l'application garde votre session et s'ouvre même hors-ligne
            (les données Firestore nécessitent le réseau).
          </p>
        </div>
      </Modal>
    </>
  );
};