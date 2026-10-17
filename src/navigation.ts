import {
  LayoutDashboard,
  Users,
  Church,
  CalendarDays,
  CheckSquare,
  CalendarRange,
  MessageSquare,
  AlertCircle,
  BookOpen,
  Wallet,
  FileDown,
  Settings,
  BarChart3,
  LucideIcon,
} from 'lucide-react';

export type NavId =
  | 'dashboard'
  | 'stats'
  | 'masses'
  | 'planning'
  | 'attendance'
  | 'meetings'
  | 'readers'
  | 'training'
  | 'excuses'
  | 'feedback'
  | 'treasury'
  | 'reports'
  | 'settings'
  | 'superadmin';

export interface NavItem {
  id: NavId;
  /** Label shown in menus / mobile bar */
  label: string;
  /** Page title displayed by PageHeader */
  title: string;
  /** Page subtitle */
  description: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Pilotage',
    items: [
      {
        id: 'dashboard',
        label: 'Tableau de bord',
        title: 'Tableau de bord',
        description: "Vue d'ensemble de l'activité paroissiale.",
        icon: LayoutDashboard,
      },
      {
        id: 'stats',
        label: 'Statistiques',
        title: 'Statistiques',
        description: 'Présences, participation et engagement des lecteurs.',
        icon: BarChart3,
      },
    ],
  },
  {
    label: 'Organisation',
    items: [
      {
        id: 'masses',
        label: 'Messes & Offices',
        title: 'Messes & Offices',
        description: 'Programmez les célébrations et leurs textes.',
        icon: Church,
      },
      {
        id: 'planning',
        label: 'Planning',
        title: 'Planning des lectures',
        description: 'Attribuez les rôles : commentateur, lectures, prière universelle.',
        icon: CalendarDays,
      },
      {
        id: 'attendance',
        label: 'Présences',
        title: 'Présences',
        description: "Validez la présence des lecteurs à chaque célébration.",
        icon: CheckSquare,
      },
      {
        id: 'meetings',
        label: 'Réunions',
        title: 'Réunions',
        description: 'Organisez vos rencontres et répétitions.',
        icon: CalendarRange,
      },
    ],
  },
  {
    label: 'Communauté',
    items: [
      {
        id: 'readers',
        label: 'Lecteurs',
        title: 'Lecteurs',
        description: 'Le répertoire des lecteurs et lectrices de la paroisse.',
        icon: Users,
      },
      {
        id: 'training',
        label: 'Formation',
        title: 'Formation',
        description: 'Suivez la progression de chaque lecteur module par module.',
        icon: BookOpen,
      },
      {
        id: 'excuses',
        label: 'Excuses',
        title: 'Absences & excuses',
        description: 'Validez les absences signalées par les lecteurs.',
        icon: AlertCircle,
      },
      {
        id: 'feedback',
        label: 'Retours',
        title: 'Retours',
        description: 'Recueillez les impressions sur les prestations.',
        icon: MessageSquare,
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        id: 'treasury',
        label: 'Trésorerie',
        title: 'Trésorerie',
        description: 'Suivez les contributions mensuelles des lecteurs.',
        icon: Wallet,
      },
      {
        id: 'reports',
        label: 'Rapports',
        title: 'Rapports',
        description: 'Générez et archivez les rapports PDF de la paroisse.',
        icon: FileDown,
      },
      {
        id: 'settings',
        label: 'Paramètres',
        title: 'Paramètres',
        description: 'Profil de la paroisse, accès et compte administrateur.',
        icon: Settings,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const NAV_INDEX: Record<string, NavItem> = Object.fromEntries(NAV_ITEMS.map((i) => [i.id, i]));

export const getNavItem = (id: string): NavItem =>
  NAV_INDEX[id] || {
    id: 'dashboard',
    label: 'Tableau de bord',
    title: 'Tableau de bord',
    description: '',
    icon: LayoutDashboard,
  };

/** Tabs reachable from the mobile bottom bar (the rest lives in the drawer). */
export const MOBILE_PRIMARY: NavItem[] = ['dashboard', 'masses', 'planning', 'readers'].map((id) => getNavItem(id));