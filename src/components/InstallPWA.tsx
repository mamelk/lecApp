import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, Monitor, Share, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Modal } from './ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    /** Capturé tôt dans index.html : l'événement peut arriver avant React. */
    __lecappInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const DISMISS_KEY = 'lecapp_install_dismissed_at';
const DISMISS_DAYS = 7;

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const android = window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari : navigator.standalone passe à true une fois sur l'écran d'accueil
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return android || ios;
};

const readDismissed = (): boolean => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
};

/**
 * Installation de l'app sur tous les appareils :
 * - bannière discrète proposée sur mobile (Chrome, Safari, Firefox, Samsung…),
 *   pas seulement quand le navigateur émet `beforeinstallprompt` ;
 * - prompt natif utilisé quand il est disponible ;
 * - instructions détaillées (iOS, Android, ordinateur) sinon ;
 * - masqué une fois l'app installée, ou après refus explicite (7 jours).
 */
export const InstallPWA: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [helpOpen, setHelpOpen] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setShowBanner(false);
      if (typeof window !== 'undefined') window.__lecappInstallPrompt = null;
      toast.success('Application installée sur votre appareil.');
    };

    // Événement capturé par le script inline d'index.html avant le montage.
    if (window.__lecappInstallPrompt) setDeferred(window.__lecappInstallPrompt);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('lecapp:installprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('lecapp:installprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // La bannière apparaît sur mobile (tous navigateurs) ou dès qu'un prompt
  // natif est disponible ; jamais dans l'app déjà installée.
  useEffect(() => {
    if (installed || dismissed) {
      setShowBanner(false);
      return;
    }
    if (!deferred && !isTouchDevice()) return;
    const timer = window.setTimeout(() => setShowBanner(true), 1800);
    return () => window.clearTimeout(timer);
  }, [installed, dismissed, deferred]);

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
    } catch (e) {
      console.warn('Prompt d’installation indisponible', e);
      setHelpOpen(true);
    } finally {
      setDeferred(null);
      window.__lecappInstallPrompt = null;
      setShowBanner(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage indisponible : la bannière reviendra au prochain chargement.
    }
  };

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isFirefox = /Firefox\//.test(ua);
  const isSafari =
    /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua) && !/Edg\//.test(ua);
  // Navigateur intégré (WhatsApp, Facebook, Instagram…) : l'installation y est impossible.
  const isInAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter/i.test(ua);

  const steps: { icon: React.ReactNode; title: string; detail: string }[] = [];

  if (isIOS) {
    steps.push({
      icon: <Share size={16} />,
      title: 'Sur iPhone / iPad',
      detail: isSafari
        ? "Bouton Partager (carré + flèche, en bas de l'écran) → « Sur l'écran d'accueil » → « Ajouter »."
        : "L'installation iOS passe par Safari : ouvrez lecApp dans Safari, puis Partager → « Sur l'écran d'accueil » → « Ajouter ».",
    });
  } else if (isAndroid) {
    steps.push({
      icon: <Smartphone size={16} />,
      title: 'Sur Android (Chrome, Edge, Samsung Internet)',
      detail:
        'Bouton « Installer » ci-dessus, sinon menu ⋮ → « Installer lecApp » ou « Ajouter à l’écran d’accueil ».',
    });
    if (isFirefox) {
      steps.push({
        icon: <Smartphone size={16} />,
        title: 'Sur Firefox Android',
        detail: "Menu ⋮ → « Installer le site… » ; si l'option manque, ouvrez lecApp dans Chrome.",
      });
    }
  } else {
    steps.push({
      icon: <Monitor size={16} />,
      title: 'Chrome / Edge (ordinateur)',
      detail: "Icône d'installation à droite de la barre d'adresse, ou menu ⋮ → « Installer lecApp… ».",
    });
    steps.push({
      icon: <Monitor size={16} />,
      title: isFirefox ? 'Firefox' : isSafari ? 'Safari (macOS)' : 'Autres navigateurs',
      detail: isFirefox
        ? "Firefox n'expose pas l'installation web : utilisez Chrome ou Edge."
        : isSafari
          ? "Safari (macOS) n'expose pas l'installation web : installez depuis iPhone (Partager → Sur l'écran d'accueil) ou Chrome."
          : 'Ce navigateur ne propose pas l’installation : ouvrez le site dans Chrome ou Edge.',
    });
  }

  if (isInAppBrowser) {
    steps.unshift({
      icon: <Smartphone size={16} />,
      title: 'Depuis une application (WhatsApp, Facebook…)',
      detail:
        "Ces navigateurs intégrés ne peuvent pas installer d'app : ouvrez lecApp dans Chrome ou Safari.",
    });
  }

  const bannerText = deferred
    ? 'Accès direct depuis votre écran d’accueil, en plein écran.'
    : isIOS && !isSafari
      ? 'Ouvrez lecApp dans Safari pour l’ajouter à votre écran d’accueil.'
      : isIOS
        ? 'Partagez → « Sur l’écran d’accueil » pour installer lecApp.'
        : isAndroid
          ? 'Menu ⋮ → « Installer lecApp » pour l’ajouter à votre écran d’accueil.'
          : 'Ajoutez lecApp pour un accès direct, en plein écran.';

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

      {showBanner && (
        <div className="fixed inset-x-3 bottom-24 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 md:inset-x-auto md:bottom-6 md:right-6 md:w-96">
          <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-primary/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Download size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-white">
                Installer lecApp
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{bannerText}</p>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="accent" className="px-3 py-1.5 text-[11px]" onClick={install}>
                  {deferred ? 'Installer' : 'Voir les étapes'}
                </Button>
                <button
                  onClick={dismissBanner}
                  className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300"
                >
                  Plus tard
                </button>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              aria-label="Fermer"
              className="-mr-1 -mt-1 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

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
