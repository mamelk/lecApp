import React from 'react';
import { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Button                                                            */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700',
  secondary: 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white',
  accent: 'bg-accent text-midnight font-bold hover:bg-amber-400 shadow-lg shadow-amber-500/20 border border-transparent',
  ghost: 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/*  Card                                                              */
/* ------------------------------------------------------------------ */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`bg-card rounded-2xl p-5 md:p-6 border border-slate-800/60 shadow-xl transition-colors ${className}`} {...props}>
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Badge                                                             */
/* ------------------------------------------------------------------ */

const BADGE_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  present: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  confirmé: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  late: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  none: 'bg-slate-800 text-slate-500 border-slate-700',
  absent: 'bg-red-500/10 text-red-400 border-red-500/20',
  'à compléter': 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const Badge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${BADGE_COLORS[status] || 'bg-slate-800 text-slate-400 border-slate-700'} ${className}`}
  >
    {String(status).replace(/_/g, ' ')}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Page header — the single way every view starts                     */
/* ------------------------------------------------------------------ */

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, description, actions, children }) => (
  <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white leading-none">
        {title}
      </h1>
      {description && <p className="mt-2 text-sm text-slate-500 font-medium">{description}</p>}
      {children}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 md:gap-3">{actions}</div>}
  </header>
);

/* ------------------------------------------------------------------ */
/*  Section title                                                     */
/* ------------------------------------------------------------------ */

export const SectionTitle: React.FC<{ icon?: LucideIcon; children: React.ReactNode; action?: React.ReactNode }> = ({
  icon: Icon,
  children,
  action,
}) => (
  <div className="flex items-center justify-between gap-3">
    <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
      {Icon && <Icon size={16} className="text-accent" />}
      {children}
    </h2>
    {action}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Form primitives — one field look everywhere                        */
/* ------------------------------------------------------------------ */

export const inputClass =
  'w-full bg-background border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em] pl-0.5">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-slate-600 italic leading-relaxed pl-0.5">{hint}</p>}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`${inputClass} ${className}`} {...props} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => (
  <select className={`${inputClass} appearance-none ${className}`} {...props}>
    {children}
  </select>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea className={`${inputClass} min-h-24 ${className}`} {...props} />
);

/* ------------------------------------------------------------------ */
/*  Stat card                                                         */
/* ------------------------------------------------------------------ */

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  tone?: 'default' | 'accent';
  onClick?: () => void;
}> = ({ label, value, icon: Icon, hint, tone = 'default', onClick }) => {
  const Wrapper: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-5 transition-all ${
        tone === 'accent'
          ? 'bg-accent/5 border-accent/20 hover:border-accent'
          : 'bg-card border-slate-800/60 hover:border-slate-700'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${tone === 'accent' ? 'text-accent' : 'text-slate-500'}`}>
          {label}
        </p>
        {Icon && <Icon size={16} className={tone === 'accent' ? 'text-accent' : 'text-slate-600'} />}
      </div>
      <div className="mt-3 text-3xl font-black text-white leading-none">{value}</div>
      {hint && <div className="mt-2 text-[11px] text-slate-500">{hint}</div>}
    </Wrapper>
  );
};

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

export const EmptyState: React.FC<{
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-6 py-12 text-center">
    {Icon && <Icon size={40} className="text-slate-800" />}
    <div className="space-y-1">
      <p className="text-sm font-bold text-slate-400">{title}</p>
      {description && <p className="text-xs text-slate-600 italic max-w-sm">{description}</p>}
    </div>
    {action}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Modal                                                             */
/* ------------------------------------------------------------------ */

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ isOpen, onClose, title, children, wide = false }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto custom-scrollbar rounded-2xl border border-slate-800 bg-card p-6 shadow-2xl md:p-8 ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h3 className="text-lg font-black uppercase italic tracking-tight text-white">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white aria-hidden"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};