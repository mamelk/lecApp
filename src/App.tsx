import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { 
  LayoutDashboard, 
  Church, 
  Users, 
  CheckSquare, 
  CalendarDays,
  Menu,
  Bell,
  UserCircle,
  Plus,
  ChevronRight,
  X,
  UserPlus,
  ArrowLeft,
  Search,
  CheckCircle,
  Trash2,
  Settings,
  Lock,
  LogIn,
  BarChart3,
  TrendingUp,
  PieChart,
  CalendarRange,
  MessageSquare,
  Star,
  Quote,
  Phone,
  MapPin,
  FileDown,
  Loader2,
  RefreshCw,
  Paperclip,
  FileText,
  Eye,
  EyeOff,
  Edit2,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { 
  auth,
  db
} from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { format, isSameDay, parseISO, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Parish, 
  Reader, 
  Mass, 
  Attendance, 
  AttendanceType,
  AttendanceStatus,
  Planning, 
  TrainingStatus,
  Meeting,
  Feedback
} from './types';
import { handleFirestoreError } from './lib/utils';
import { OperationType } from './types';
import { generateReaderStatsPDF, generateGlobalStatsPDF, generatePlanningPDF, generateReaderListPDF } from './lib/reports';

// --- Contexts ---
const ParishContext = createContext<{
  currentParish: Parish | null;
  setCurrentParish: (p: Parish | null) => void;
  parishes: Parish[];
}>({ currentParish: null, setCurrentParish: () => {}, parishes: [] });

// --- Components ---

const Logo = ({ className = "w-8 h-8", showText = true }: { className?: string, showText?: boolean }) => {
  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${className}`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
          {/* Shield Base */}
          <path d="M50 5C50 5 15 15 15 45C15 75 50 95 50 95C50 95 85 75 85 45C85 15 50 5 50 5Z" fill="#0B1120" stroke="#f59e0b" strokeWidth="2"/>
          
          {/* Internal Shield detail */}
          <path d="M50 12C50 12 22 20 22 45C22 70 50 88 50 88C50 88 78 70 78 45C78 20 50 12 50 12Z" fill="url(#logo-grad)" fillOpacity="0.2"/>
          
          {/* Cross */}
          <path d="M50 25V75M35 45H65" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round"/>
          
          {/* Flame effects / Curves */}
          <path d="M50 15C40 30 35 50 50 85" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          <path d="M50 15C60 30 65 50 50 85" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          
          {/* Glow */}
          <circle cx="50" cy="45" r="15" fill="#f59e0b" fillOpacity="0.1" />

          <defs>
            <linearGradient id="logo-grad" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f59e0b" />
              <stop offset="1" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1 className="text-white font-black text-xl italic tracking-tighter uppercase leading-none">lecApp</h1>
          <p className="text-[10px] text-accent font-bold uppercase tracking-widest mt-1">Service Paroissial</p>
        </div>
      )}
    </div>
  );
};

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, ...props }: any) => {
  const variants: any = {
    primary: 'bg-primary text-white hover:bg-slate-800 border border-slate-700 shadow-lg',
    secondary: 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700',
    accent: 'bg-accent text-midnight font-bold hover:bg-amber-400 shadow-lg shadow-amber-500/20',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-800/50'
  };
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', ...props }: any) => (
  <div 
    className={`bg-card rounded-3xl p-6 border border-slate-800/50 shadow-xl transition-all ${className}`}
    {...props}
  >
    {children}
  </div>
);

const Badge = ({ status }: { status: TrainingStatus | string }) => {
  const colors: any = {
    completed: 'bg-green-500/10 text-green-400 border border-green-500/20',
    in_progress: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    none: 'bg-slate-800 text-slate-500 border border-slate-700',
    present: 'bg-green-500/10 text-green-400 border border-green-500/20',
    late: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    absent: 'bg-red-500/10 text-red-400 border border-red-500/20',
    'confirmé': 'bg-green-500/10 text-green-400 border border-green-500/20',
    'à compléter': 'bg-red-500/10 text-red-400 border border-red-500/20',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

// --- Views ---

const DashboardView = ({ readers, upcomingMasses, upcomingMeetings, attendanceRecords, onNavigate }: { readers: Reader[], upcomingMasses: Mass[], upcomingMeetings: Meeting[], attendanceRecords: Attendance[], onNavigate: (tab: string) => void }) => {
  const trainedReaders = readers.filter(r => r.trainingStatus === 'completed').length;
  
  // Calculate global attendance rate
  const massAttendance = attendanceRecords.filter(a => a.type === 'mass');
  const presentRecords = massAttendance.filter(a => a.status === 'present' || a.status === 'late');
  const globalAttendanceRate = massAttendance.length > 0 
    ? Math.round((presentRecords.length / massAttendance.length) * 100) 
    : 0;
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight italic uppercase">Tableau de Bord</h1>
          <p className="text-slate-500 font-medium text-xs md:text-sm">{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 border-slate-800">
          <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Lecteurs Formés</p>
          <div className="mt-4 flex items-baseline gap-2">
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-none">{trainedReaders}</h2>
            <span className="text-green-400 text-xs font-bold font-mono">/{readers.length}</span>
          </div>
        </Card>
        
        <Card className="md:col-span-1 border-slate-800 cursor-pointer hover:border-accent/40" onClick={() => onNavigate('masses')}>
          <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Messes prévues</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4">{upcomingMasses.length}</h2>
        </Card>

        <Card className="md:col-span-1 border-accent/20 bg-accent/5 cursor-pointer hover:border-accent" onClick={() => onNavigate('meetings')}>
          <p className="text-accent text-[10px] md:text-xs font-bold uppercase tracking-widest">Réunions</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4">{upcomingMeetings.length}</h2>
        </Card>

        <Card className="md:col-span-1 bg-[#0B1120] relative overflow-hidden group border-slate-800 cursor-pointer hover:border-accent" onClick={() => onNavigate('planning')}>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Prochain Service</p>
            {upcomingMasses[0] ? (
              <>
                <h2 className="text-xl md:text-2xl font-bold text-white mt-4">{upcomingMasses[0].title}</h2>
                <p className="text-accent font-mono text-[11px] md:text-sm mt-1">{format(parseISO(upcomingMasses[0].date), 'EEEE HH:mm', { locale: fr })}</p>
              </>
            ) : (
              <p className="text-slate-600 mt-4 italic text-[11px] md:text-sm">Aucune messe programmée</p>
            )}
          </div>
          <Church className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-500" />
        </Card>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarDays className="text-slate-500" size={20} />
              Agenda Récent
            </h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('masses');
              }} 
              className="text-accent text-xs font-bold hover:underline cursor-pointer relative z-10"
            >
              Calendrier Complet
            </button>
          </div>
          <div className="space-y-4">
            {upcomingMasses.length > 0 ? upcomingMasses.map((mass, idx) => (
              <Card 
                key={mass.id} 
                onClick={() => onNavigate('planning')} 
                className={`flex items-center gap-6 py-4 cursor-pointer hover:border-accent/40 group transition-colors ${idx === 0 ? 'ring-1 ring-accent/20' : ''}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex flex-col items-center justify-center border border-slate-800">
                  <span className="text-[10px] font-extrabold text-accent uppercase">{format(parseISO(mass.date), 'MMM', { locale: fr })}</span>
                  <span className="text-xl font-black text-white leading-tight">{format(parseISO(mass.date), 'dd')}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-200 uppercase italic tracking-tight">{mass.title || 'Messe Dominicale'}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-slate-500 text-xs font-mono">{format(parseISO(mass.date), 'HH:mm')}</span>
                    <span className="w-1 h-1 bg-slate-800 rounded-full" />
                    <span className="text-slate-500 text-xs uppercase font-bold tracking-widest" style={{fontSize: '8px'}}>PAROISSE ACTIVE</span>
                  </div>
                </div>
                <Button variant="ghost" className="p-2 h-auto rounded-xl" onClick={() => onNavigate('planning')}>
                  <ChevronRight size={20} />
                </Button>
              </Card>
            )) : (
              <div className="py-20 text-center bg-slate-900/10 rounded-[32px] border border-dashed border-slate-800">
                <p className="text-slate-500 text-sm">Le calendrier est vide pour le moment</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20 cursor-pointer hover:border-accent group" onClick={() => onNavigate('stats')}>
            <h4 className="text-sm font-bold text-accent mb-2 uppercase tracking-wide">Rappel Système</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vérifiez les présences 15 minutes avant le début de chaque service pour garantir l'éligibilité.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-slate-500 uppercase">Taux de présence global</span>
                <span className="text-white group-hover:text-accent transition-colors">{globalAttendanceRate}%</span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-slate-900/50">
            <h4 className="text-sm font-bold text-white mb-4 italic tracking-widest uppercase">Statistiques</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-background/50 p-3 rounded-xl">
                 <span className="text-xs text-slate-500">Lecteurs enregistrés</span>
                 <span className="text-xs font-mono text-white tracking-widest">{readers.length}</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 p-3 rounded-xl">
                 <span className="text-xs text-slate-500">Missions terminées</span>
                 <span className="text-xs font-mono text-white tracking-widest">{trainedReaders}</span>
              </div>
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
};

  const ReadersView = ({ readers, parishId, onRefresh, attendance, plannings, masses, feedbacks }: { 
    readers: Reader[], 
    parishId: string, 
    onRefresh: () => void,
    attendance: Attendance[],
    plannings: Record<string, Planning>,
    masses: Mass[],
    feedbacks: Feedback[]
  }) => {
  const { currentParish } = useContext(ParishContext);
  const [showAdd, setShowAdd] = useState(false);
  const [editingReader, setEditingReader] = useState<Reader | null>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newPostnom, setNewPostnom] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newBirthDay, setNewBirthDay] = useState<string>('');
  const [newBirthMonth, setNewBirthMonth] = useState<string>('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [newRoles, setNewRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setNewPhoto(compressedBase64);
            toast.success("Photo optimisée pour le profil");
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const editReader = (reader: Reader) => {
    setEditingReader(reader);
    setNewName(reader.name);
    setNewPostnom(reader.postnom);
    setNewPrenom(reader.prenom);
    setNewBirthDay(reader.birthDay ? reader.birthDay.toString() : '');
    setNewBirthMonth(reader.birthMonth ? reader.birthMonth.toString() : '');
    setNewAddress(reader.address || '');
    setNewPhone(reader.phone || '');
    setNewEmail(reader.email || '');
    setNewPhoto(reader.photoURL || '');
    setNewRoles(reader.roles || []);
    setShowAdd(true);
  };

  const updateReader = async () => {
    if (!editingReader || !newName || !newPostnom || !newPrenom) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'readers', editingReader.id), {
        name: newName,
        postnom: newPostnom,
        prenom: newPrenom,
        birthDay: newBirthDay ? parseInt(newBirthDay) : null,
        birthMonth: newBirthMonth ? parseInt(newBirthMonth) : null,
        address: newAddress,
        phone: newPhone,
        email: newEmail,
        photoURL: newPhoto || null,
        roles: newRoles,
      });
      toast.success("Lecteur mis à jour !");
      setShowAdd(false);
      setEditingReader(null);
      setNewName('');
      setNewPostnom('');
      setNewPrenom('');
      setNewBirthDay('');
      setNewBirthMonth('');
      setNewAddress('');
      setNewPhone('');
      setNewEmail('');
      setNewPhoto('');
      setNewRoles([]);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur de mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const addReader = async () => {
    if (!newName || !newPostnom || !newPrenom) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'readers'), {
        name: newName,
        postnom: newPostnom,
        prenom: newPrenom,
        birthDay: newBirthDay ? parseInt(newBirthDay) : null,
        birthMonth: newBirthMonth ? parseInt(newBirthMonth) : null,
        address: newAddress,
        phone: newPhone,
        email: newEmail,
        photoURL: newPhoto || null,
        parishId,
        trainingStatus: 'none',
        isActive: true,
        roles: newRoles,
        createdAt: serverTimestamp()
      });
      setNewName('');
      setNewPostnom('');
      setNewPrenom('');
      setNewBirthDay('');
      setNewBirthMonth('');
      setNewAddress('');
      setNewPhone('');
      setNewEmail('');
      setNewPhoto('');
      setNewRoles([]);
      setShowAdd(false);
      toast.success("Lecteur ajouté !");
      onRefresh();
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur d'ajout");
      handleFirestoreError(e, OperationType.CREATE, 'readers');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: TrainingStatus) => {
    try {
      await updateDoc(doc(db, 'readers', id), { trainingStatus: status });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `readers/${id}`);
    }
  };

  const deleteReader = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce lecteur ? Cette action est irréversible.")) return;
    try {
      await deleteDoc(doc(db, 'readers', id));
      toast.success("Lecteur supprimé");
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la suppression.");
      handleFirestoreError(e, OperationType.DELETE, `readers/${id}`);
    }
  };

  const filteredReaders = readers.filter(r => {
    const searchTerms = search.toLowerCase().split(' ').filter(t => t.length > 0);
    if (searchTerms.length === 0) return true;
    const fullName = `${r.prenom} ${r.name} ${r.postnom}`.toLowerCase();
    return searchTerms.every(term => fullName.includes(term));
  });

  return (
    <div className="space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Répertoire</h2>
          <p className="text-slate-500 font-medium text-xs md:text-sm">{readers.length} lecteurs enregistrés</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => generateGlobalStatsPDF(readers, attendance, Object.values(plannings), masses, feedbacks, currentParish?.name || "lecApp")}
            variant="secondary"
            className="p-3 md:px-4 rounded-xl text-xs gap-2"
          >
            <FileDown size={18} /> <span className="hidden md:inline">Stats Globales</span>
          </Button>
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-accent"
            />
          </div>
          <Button onClick={() => setShowAdd(true)} variant="accent" className="p-3 md:p-4 rounded-2xl">
            <UserPlus size={20} />
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="space-y-6 border-slate-700 bg-slate-900">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-lg italic tracking-tight">Inscription Lecteur</h3>
                <button onClick={() => { setShowAdd(false); setEditingReader(null); }} className="text-slate-500 hover:text-white">Fermer</button>
              </div>

              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative w-24 h-24 rounded-[32px] bg-slate-800 border-2 border-dashed border-slate-700 overflow-hidden group">
                  {newPhoto ? (
                    <img src={newPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                      <Plus size={24} />
                      <span className="text-[8px] font-bold uppercase mt-1">Photo</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {newPhoto && (
                    <button 
                      onClick={() => setNewPhoto('')}
                      className="absolute top-1 right-1 p-1 bg-slate-900/80 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Photo de profil (cliquez pour choisir)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">PRÉNOM</label>
                  <input value={newPrenom} onChange={e => setNewPrenom(e.target.value.replace(/[0-9]/g, ''))} placeholder="Prénom" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">NOM</label>
                  <input value={newName} onChange={e => setNewName(e.target.value.replace(/[0-9]/g, ''))} placeholder="Nom" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">POSTNOM</label>
                  <input value={newPostnom} onChange={e => setNewPostnom(e.target.value.replace(/[0-9]/g, ''))} placeholder="Postnom" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">JOUR/MOIS DE NAISSANCE</label>
                  <div className="flex gap-2">
                    <input type="number" inputMode="numeric" min="1" max="31" value={newBirthDay} onChange={e => setNewBirthDay(e.target.value)} placeholder="JJ" className="flex-1 p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                    <select value={newBirthMonth} onChange={e => setNewBirthMonth(e.target.value)} className="flex-1 p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white appearance-none">
                      <option value="">Mois</option>
                      {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map((m, i) => (
                        <option key={m} value={i+1}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">TÉLÉPHONE</label>
                  <input type="tel" inputMode="tel" value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="+243..." className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ADRESSE</label>
                <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Adresse physique" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">EMAIL (OPTIONNEL)</label>
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemple.com" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Rôles Capables</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(role => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        if (newRoles.includes(role.id)) {
                          setNewRoles(newRoles.filter(r => r !== role.id));
                        } else {
                          setNewRoles([...newRoles, role.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-[10px] font-bold transition-all ${
                        newRoles.includes(role.id) 
                          ? 'bg-accent/20 border-accent text-accent' 
                          : 'bg-slate-800/50 border-slate-700 text-slate-500'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={editingReader ? updateReader : addReader} disabled={loading} className="w-full py-4 rounded-2xl" variant="accent">
                {loading ? (editingReader ? 'Mise à jour...' : 'Enregistrement...') : (editingReader ? 'Mettre à jour' : 'Confirmer l\'ajout')}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReaders.map(reader => (
          <Card key={reader.id} className="group hover:border-slate-700 transition-all flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center text-accent text-sm font-black italic">
                {reader.photoURL ? (
                  <img src={reader.photoURL} alt={reader.name} className="w-full h-full object-cover" />
                ) : (
                  (reader.prenom?.[0] || '') + (reader.name?.[0] || '')
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge status={reader.trainingStatus} />
                  <div className="flex gap-1">
                    <button 
                      onClick={() => editReader(reader)}
                      className="p-3 text-slate-600 hover:text-accent transition-colors"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => deleteReader(reader.id)}
                      className="p-3 text-slate-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
              </div>
            </div>
            
            <h4 className="font-bold text-white text-sm md:text-base mb-0.5 leading-tight">
              {reader.prenom} {reader.name.toUpperCase()} {reader.postnom}
            </h4>
            
            <div className="space-y-1.5 mb-4">
              {reader.phone && (
                <a 
                  href={`tel:${reader.phone}`}
                  className="flex items-center gap-2 text-slate-500 hover:text-accent transition-colors text-[10px] w-fit"
                >
                  <Phone size={10} className="text-accent/60" /> {reader.phone}
                </a>
              )}
              {(reader.birthDay && reader.birthMonth) && (
                <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                  <CalendarRange size={10} className="text-accent/60" /> Né(e) le {reader.birthDay}/{reader.birthMonth}
                </div>
              )}
              {reader.address && (
                <div className="flex items-center gap-2 text-slate-300 text-[10px] leading-tight line-clamp-1">
                  <MapPin size={10} className="text-accent/60 flex-shrink-0" /> {reader.address}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1.5 mb-6">
              {reader.roles?.map(roleId => (
                <span key={roleId} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[9px] font-bold text-slate-400">
                  {ROLES.find(r => r.id === roleId)?.label || roleId}
                </span>
              ))}
              {(!reader.roles || reader.roles.length === 0) && (
                <span className="text-[9px] text-slate-600 italic">Tous les rôles</span>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-800/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statut Formation</p>
                <select 
                  value={reader.trainingStatus}
                  onChange={(e) => updateStatus(reader.id, e.target.value as TrainingStatus)}
                  className="text-[11px] bg-background px-3 py-1.5 rounded-xl border border-slate-800 text-slate-200 font-bold focus:border-accent outline-none appearance-none cursor-pointer"
                >
                  <option value="none">À FORMER</option>
                  <option value="in_progress">EN COURS</option>
                  <option value="completed">VALIDÉ</option>
                </select>
              </div>
              <Button 
                onClick={() => {
                  const readerAttendance = attendance.filter(a => a.readerId === reader.id);
                  const readerAssignments = Object.values(plannings).flatMap((p: Planning) => 
                    (p.assignments || []).filter(a => a.readerId === reader.id).map(a => ({ ...a, massId: p.massId }))
                  );
                  const readerFeedbacks = feedbacks.filter(f => f.readerId === reader.id);
                  generateReaderStatsPDF(reader, readerAttendance, readerAssignments, masses, readerFeedbacks, currentParish?.name || "lecApp");
                }}
                variant="secondary" 
                className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <FileDown size={14} /> Rapport Individuel
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ROLES = [
  { id: 'commentator', label: 'Le Commentateur', short: 'Com.' },
  { id: 'reading1', label: 'Première Lecture', short: '1è Lect.' },
  { id: 'reading2', label: 'Deuxième Lecture', short: '2è Lect.' },
  { id: 'universal_prayer', label: 'Prière Universelle', short: 'Int.' }
];

const PlanningView = ({ masses, readers, meetings, parishId }: { masses: Mass[], readers: Reader[], meetings: Meeting[], parishId: string }) => {
  const { currentParish } = useContext(ParishContext);
  const [selectedMass, setSelectedMass] = useState<Mass | null>(null);
  const [plannings, setPlannings] = useState<Record<string, Planning>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (!parishId) return;
    const q = query(collection(db, 'plannings'), where('parishId', '==', parishId));
    return onSnapshot(q, (snapshot) => {
      const p: Record<string, Planning> = {};
      snapshot.forEach(d => {
        const data = d.data() as Planning;
        p[data.massId] = { ...data, id: d.id };
      });
      setPlannings(p);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'plannings');
    });
  }, [parishId]);

  useEffect(() => {
    if (!parishId) return;
    const q = query(collection(db, 'attendance'), where('parishId', '==', parishId));
    return onSnapshot(q, (snapshot) => {
      const a: Attendance[] = [];
      snapshot.forEach(d => a.push({ ...d.data() as Attendance, id: d.id }));
      setAttendanceRecords(a);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    });
  }, [parishId]);

  const toggleReader = async (massId: string, readerId: string, role: string) => {
    const p = plannings[massId];
    if (p?.isFinalized) {
      toast.error("Ce planning est finalisé.");
      return;
    }
    if (p) {
      const existingAssignment = (p.assignments || []).find(a => a.role === role);
      let newAssignments;

      if (existingAssignment?.readerId === readerId) {
        // Unselect if same reader on same role
        newAssignments = (p.assignments || []).filter(a => a.role !== role);
      } else {
        // Replace or add role assignment (ensures only one reader per role)
        newAssignments = [
          ...(p.assignments || []).filter(a => a.role !== role),
          { readerId, role }
        ];
      }
      
      try {
        await updateDoc(doc(db, 'plannings', p.id), { assignments: newAssignments });
        toast.success("Mise à jour réussie");
      } catch (e: any) {
        toast.error("Erreur de mise à jour");
        handleFirestoreError(e, OperationType.UPDATE, `plannings/${p.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'plannings'), {
          parishId,
          massId,
          assignments: [{ readerId, role }],
          isFinalized: false
        });
        toast.success("Planning initialisé");
      } catch (e: any) {
        toast.error("Erreur de création");
        handleFirestoreError(e, OperationType.CREATE, 'plannings');
      }
    }
  };

  const finalizePlanning = async (massId: string) => {
    const p = plannings[massId];
    if (!p) return;
    
    // Check required roles (reading2 is now optional)
    const assignedRoles = (p.assignments || []).map(a => a.role);
    const requiredRoles = ROLES.filter(r => r.id !== 'reading2').map(r => r.id);
    const missingRequired = requiredRoles.filter(r => !assignedRoles.includes(r));

    if (missingRequired.length > 0) {
      if (!confirm(`Le planning est incomplet (rôles obligatoires manquants). Voulez-vous quand même le finaliser ?`)) return;
    }
    
    try {
      await updateDoc(doc(db, 'plannings', p.id), { isFinalized: !p.isFinalized });
      toast.success(!p.isFinalized ? "Planning finalisé !" : "Planning débloqué");
    } catch (e: any) {
      toast.error("Erreur de finalisation");
      handleFirestoreError(e, OperationType.UPDATE, `plannings/${p.id}`);
    }
  };

  const checkEligibility = (reader: Reader, massId: string) => {
    const training = reader.trainingStatus === 'completed';
    
    // Rule: Must have been present at the last general meeting
    const pastMeetings = meetings.filter(m => m.date < new Date().toISOString()).sort((a, b) => b.date.localeCompare(a.date));
    const lastMeeting = pastMeetings[0];
    
    const attendedLastMeeting = lastMeeting ? (attendanceRecords || []).some(a => 
      a.massId === lastMeeting.id && 
      a.readerId === reader.id && 
      (a.status === 'present' || a.status === 'late')
    ) : true; // If no past meetings, we consider this condition met

    const reasons = [];
    if (!training) reasons.push("Formation non validée");
    if (!attendedLastMeeting) reasons.push("Absence à la dernière réunion générale");

    const isAvailable = training && attendedLastMeeting;

    return {
      eligible: isAvailable,
      reasons,
      training,
      meeting: attendedLastMeeting
    };
  };

  if (selectedMass) {
    const currentPlanning = plannings[selectedMass.id];
    const currentAssignments = currentPlanning?.assignments || [];
    const isFinalized = currentPlanning?.isFinalized || false;

    return (
      <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex justify-between items-center">
          <button onClick={() => { setSelectedMass(null); setSelectedRoleId(null); }} className="flex items-center gap-2 text-accent font-bold group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            Retour aux messes
          </button>
          <div className="flex gap-2">
            {currentPlanning && (
              <Button 
                onClick={() => {
                  const assignmentsWithReaders = ROLES.map(role => {
                    const assign = currentAssignments.find(a => a.role === role.id);
                    return {
                      role: role.label,
                      reader: assign ? readers.find(r => r.id === assign.readerId) || null : null
                    };
                  });
                  generatePlanningPDF(selectedMass, assignmentsWithReaders, currentParish?.name || "lecApp");
                }} 
                variant="secondary"
                className="text-xs"
              >
                <FileDown size={16} /> PDF
              </Button>
            )}
            {currentPlanning && (
              <Button 
                onClick={() => finalizePlanning(selectedMass.id)} 
                variant={isFinalized ? 'secondary' : 'accent'}
                className="text-xs"
              >
                {isFinalized ? 'Déverrouiller Planning' : 'Finaliser Planning'}
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">{selectedMass.title}</h2>
            <p className="text-slate-500 font-mono text-sm uppercase tracking-widest mt-1">
              {format(parseISO(selectedMass.date), 'EEEE d MMMM HH:mm', { locale: fr })}
            </p>
          </div>
          {isFinalized && (
            <div className="bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-2xl flex items-center gap-2">
              <CheckSquare size={16} className="text-green-400" />
              <span className="text-xs font-bold text-green-400 uppercase">Finalisé</span>
            </div>
          )}
        </div>

        {/* Roles Selection Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map(role => {
            const assignment = currentAssignments.find(a => a.role === role.id);
            const assignedReader = assignment ? readers.find(r => r.id === assignment.readerId) : null;
            const isActive = selectedRoleId === role.id;

            return (
              <button
                key={role.id}
                disabled={isFinalized}
                onClick={() => setSelectedRoleId(isActive ? null : role.id)}
                className={`flex flex-col gap-2 p-5 rounded-[28px] border-2 transition-all text-left group ${
                  isActive 
                    ? 'border-accent bg-accent/10 shadow-lg shadow-accent/5' 
                    : isFinalized
                      ? 'border-slate-800 bg-slate-900/20 cursor-default'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-accent' : 'text-slate-500'}`}>
                    <span className="hidden md:inline">{role.label}</span>
                    <span className="md:hidden">{role.short}</span>
                  </span>
                  {assignedReader && !isActive && (
                    <CheckSquare size={14} className="text-green-500" />
                  )}
                </div>
                {assignedReader ? (
                  <div className="space-y-1">
                    <p className="font-bold text-white leading-tight uppercase italic">{assignedReader.prenom} {assignedReader.name.toUpperCase()} {assignedReader.postnom}</p>
                    {assignedReader.phone ? (
                      <a 
                        href={`tel:${assignedReader.phone}`}
                        className="text-[10px] text-slate-500 font-mono truncate hover:text-accent transition-colors block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {assignedReader.phone}
                      </a>
                    ) : (
                      <p className="text-[10px] text-slate-500 font-mono truncate">{assignedReader.email || 'Pas de contact'}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-700 italic">Non assigné</p>
                )}
                {isActive && (
                  <div className="mt-2 w-full h-1 bg-accent rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Reader Selection for active role */}
        {selectedRoleId && !isFinalized && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-6 border-t border-slate-800"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-lg">Assigner : <span className="hidden md:inline">{ROLES.find(r => r.id === selectedRoleId)?.label}</span><span className="md:hidden">{ROLES.find(r => r.id === selectedRoleId)?.short}</span></h3>
                <p className="text-slate-500 text-xs">Sélectionnez un lecteur (les éligibles apparaissent en premier).</p>
              </div>
              <button 
                onClick={() => setSelectedRoleId(null)}
                className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest"
              >
                Masquer
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom..." 
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 rounded-2xl border border-slate-800 outline-none focus:border-accent text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {readers
                .filter(reader => {
                  const fullMatch = `${reader.prenom} ${reader.name} ${reader.postnom}`.toLowerCase();
                  return fullMatch.includes(searchQuery.toLowerCase());
                })
                .sort((a, b) => {
                  const aE = checkEligibility(a, selectedMass.id).eligible ? 1 : 0;
                  const bE = checkEligibility(b, selectedMass.id).eligible ? 1 : 0;
                  
                  if (aE !== bE) return bE - aE;

                  // Tie-breaker: Have they played this role before?
                  const hasA = (Object.values(plannings) as Planning[]).some(p => 
                    (p.assignments || []).some(assign => assign.readerId === a.id && assign.role === selectedRoleId)
                  ) ? 1 : 0;
                  const hasB = (Object.values(plannings) as Planning[]).some(p => 
                    (p.assignments || []).some(assign => assign.readerId === b.id && assign.role === selectedRoleId)
                  ) ? 1 : 0;
                  
                  return hasB - hasA;
                })
                .filter(reader => {
                  return !reader.roles || reader.roles.length === 0 || reader.roles.includes(selectedRoleId);
                })
                .map(reader => {
                  const isSelected = currentAssignments.some(a => a.role === selectedRoleId && a.readerId === reader.id);
                  const assignedElsewhere = currentAssignments.some(a => a.role !== selectedRoleId && a.readerId === reader.id);
                  const eligibility = checkEligibility(reader, selectedMass.id);
                  const playedBefore = (Object.values(plannings) as Planning[]).some(p => 
                    (p.assignments || []).some(assign => assign.readerId === reader.id && assign.role === selectedRoleId)
                  );

                  return (
                    <Card 
                      key={reader.id} 
                      onClick={() => toggleReader(selectedMass.id, reader.id, selectedRoleId)}
                      className={`cursor-pointer transition-all border-2 relative overflow-hidden ${
                        isSelected 
                          ? 'border-accent bg-accent/5' 
                          : eligibility.eligible 
                            ? 'border-slate-800 hover:border-slate-700'
                            : 'border-slate-800/50 bg-slate-900/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-accent text-midnight' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {(reader.prenom?.[0] || '') + (reader.name?.[0] || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white truncate text-xs uppercase italic">{reader.prenom} {reader.name.toUpperCase()} {reader.postnom}</h4>
                          <div className="flex flex-col gap-0.5">
                            {!eligibility.eligible && (
                              <div className="flex flex-col gap-1 mt-1 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter">Non-éligible</span>
                                <div className="flex flex-wrap gap-1">
                                  {eligibility.reasons.map((r, i) => (
                                    <span key={i} className="text-[8px] text-slate-400 font-bold uppercase">· {r}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {assignedElsewhere && (
                              <span className="text-[8px] text-amber-500 font-bold uppercase">Déjà assigné ailleurs</span>
                            )}
                            {playedBefore && (
                              <span className="text-[8px] text-accent font-bold uppercase flex items-center gap-1">
                                <Star size={8} fill="currentColor" /> Expérience rôle
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && <CheckCircle size={20} className="text-accent" />}
                      </div>
                    </Card>
                  );
                })}
              
              {readers
                .filter(reader => !reader.roles || reader.roles.length === 0 || reader.roles.includes(selectedRoleId))
                .filter(reader => reader.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-900/10 rounded-[28px] border border-dashed border-slate-800">
                   <p className="text-slate-600 font-medium italic">Aucun lecteur ne correspond.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Planification</h2>
        <p className="text-slate-500 font-medium">Attribuez les rôles : Commentateur, Lectures, Prières.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masses.map(mass => {
          const planning = plannings[mass.id];
          const count = planning?.assignments?.length || 0;
          return (
            <Card 
              key={mass.id} 
              className="flex items-center justify-between cursor-pointer hover:border-accent/40 group" 
              onClick={() => setSelectedMass(mass)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-accent group-hover:border-accent/20 transition-all">
                  <CalendarDays size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors">{mass.title}</h4>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                    {format(parseISO(mass.date), 'd MMM · HH:mm', { locale: fr })}
                  </p>
                  <div className="mt-3 flex -space-x-2">
                    {planning?.assignments?.map(assignment => {
                      const r = (readers || []).find(reader => reader.id === assignment.readerId);
                      return (
                        <div 
                          key={`${assignment.readerId}-${assignment.role}`} 
                          className="w-7 h-7 rounded-full bg-slate-800 border-2 border-background flex items-center justify-center text-accent text-[10px] font-bold shadow-sm"
                          title={`${r?.prenom} ${r?.name?.toUpperCase()} ${r?.postnom} - ${ROLES.find(ro => ro.id === assignment.role)?.label || 'Rôle'}`}
                        >
                          {(r?.prenom?.[0] || '') + (r?.name?.[0] || '')}
                        </div>
                      );
                    })}
                    {count === 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-red-400 font-black uppercase tracking-tighter italic">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        À planifier
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`px-2 py-1 rounded-lg text-[10px] font-black font-mono transition-colors ${
                  count >= 3 ? 'bg-green-500/10 text-green-400' : 'bg-slate-900 text-slate-500'
                }`}>
                  {count}/4
                </div>
                <ChevronRight className="text-slate-700 group-hover:text-accent group-hover:translate-x-1 transition-all" size={20} />
              </div>
            </Card>
          );
        })}
      </div>
      
      {masses.length === 0 && (
        <div className="py-20 text-center bg-slate-900/20 rounded-[48px] border border-dashed border-slate-800">
          <Church size={48} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aucune messe disponible</p>
        </div>
      )}
    </div>
  );
};
const MeetingView = ({ parishId }: { parishId: string }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLoc, setNewLoc] = useState('');

  useEffect(() => {
    if (!parishId) return;
    const q = query(collection(db, 'meetings'), where('parishId', '==', parishId), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
    });
  }, [parishId]);

  const addMeeting = async () => {
    if (!newTitle || !newDate) return;
    try {
      await addDoc(collection(db, 'meetings'), {
        parishId,
        title: newTitle,
        date: new Date(newDate).toISOString(),
        location: newLoc,
        createdAt: serverTimestamp()
      });
      setShowAdd(false);
      setNewTitle('');
      setNewDate('');
      setNewLoc('');
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'meetings'); }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm("Supprimer cette réunion ?")) return;
    try { await deleteDoc(doc(db, 'meetings', id)); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `meetings/${id}`); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Réunions</h2>
          <p className="text-slate-500 font-medium">Organisez vos rencontres et répétitions.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="accent" className="rounded-2xl">
          <CalendarRange size={18} /> Organiser
        </Button>
      </header>

      {showAdd && (
        <Card className="p-8 border-accent/20 bg-accent/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">TITRE DE LA RÉUNION</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="ex: Répétition Générale" className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">DATE ET HEURE</label>
              <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">LIEU</label>
              <input value={newLoc} onChange={e => setNewLoc(e.target.value)} placeholder="ex: Salle Paroissiale" className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button variant="accent" onClick={addMeeting}>Enregistrer</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {meetings.map((m) => (
          <Card key={m.id} className="group hover:border-slate-600 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-accent">
                <CalendarRange size={24} />
              </div>
              <button 
                onClick={() => deleteMeeting(m.id)}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{m.title}</h3>
            <p className="text-accent text-[10px] font-black uppercase tracking-widest mb-4">
              {format(parseISO(m.date), 'EEEE d MMMM HH:mm', { locale: fr })}
            </p>
            {m.location && (
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <Search size={14} className="opacity-40" /> {m.location}
              </p>
            )}
          </Card>
        ))}
        {meetings.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 py-20 text-center bg-slate-900/20 rounded-[48px] border border-dashed border-slate-800">
             <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Aucune réunion prévue</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FeedbackView = ({ readers, masses, parishId }: { readers: Reader[], masses: Mass[], parishId: string }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedReader, setSelectedReader] = useState('');
  const [selectedMass, setSelectedMass] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (!parishId) return;
    const q = query(collection(db, 'feedbacks'), where('parishId', '==', parishId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback)));
    });
  }, [parishId]);

  const addFeedback = async () => {
    if (!selectedReader || !selectedMass || !comment) return;
    try {
      await addDoc(collection(db, 'feedbacks'), {
        parishId,
        readerId: selectedReader,
        massId: selectedMass,
        comment,
        rating,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setComment('');
      setSelectedReader('');
      setSelectedMass('');
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'feedbacks'); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Critiques & Retours</h2>
          <p className="text-slate-500 font-medium">Améliorez la qualité des prestations.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="accent" className="rounded-2xl">
          <MessageSquare size={18} /> Nouveau retour
        </Button>
      </header>

      {showAdd && (
        <Card className="p-8 border-accent/20 bg-accent/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">LECTEUR CONCERNÉ</label>
              <select value={selectedReader} onChange={e => setSelectedReader(e.target.value)} className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent">
                <option value="">-- Choisir --</option>
                {readers.map(r => <option key={r.id} value={r.id}>{r.prenom} {r.name.toUpperCase()} {r.postnom}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">PRESTATION (MESSE)</label>
              <select value={selectedMass} onChange={e => setSelectedMass(e.target.value)} className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent">
                <option value="">-- Choisir --</option>
                {masses.slice(0, 10).map(m => <option key={m.id} value={m.id}>{m.title} ({format(parseISO(m.date), 'dd/MM')})</option>)}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">COMMENTAIRE / CRITIQUE</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent resize-none" placeholder="Partagez vos impressions..." />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">NOTE (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setRating(v)} className={`w-12 h-12 rounded-xl border transition-all ${rating >= v ? 'bg-accent border-accent text-midnight' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button variant="accent" onClick={addFeedback}>Publier</Button>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {feedbacks.map((f) => {
          const reader = readers.find(r => r.id === f.readerId);
          const mass = masses.find(m => m.id === f.massId);
          return (
            <Card key={f.id} className="relative overflow-hidden border-slate-800/40">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                 <Quote size={80} />
              </div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400">
                    <UserCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-tighter italic leading-none mb-1">
                      {reader ? (
                        <>
                          {reader.prenom} {reader.name.toUpperCase()} {reader.postnom}
                        </>
                      ) : 'Lecteur Supprimé'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                      {mass?.title} · {f.createdAt ? format(parseISO(f.createdAt), 'dd MMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className={i < f.rating ? 'text-accent fill-accent' : 'text-slate-800'} />
                  ))}
                </div>
              </div>
              <p className="text-slate-300 italic leading-relaxed pl-4 border-l-2 border-accent/30">{f.comment}</p>
            </Card>
          );
        })}
        {feedbacks.length === 0 && (
          <div className="py-20 text-center bg-slate-900/20 rounded-[48px] border border-dashed border-slate-800">
             <MessageSquare size={48} className="mx-auto text-slate-800 mb-4 opacity-20" />
             <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Aucun retour pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TrainingView = ({ readers }: { readers: Reader[] }) => {
  const MODULES = [
    { id: 'liturgy', name: 'Liturgie', description: 'Compréhension de la messe' },
    { id: 'reading', name: 'Technique de lecture', description: 'Art de la lecture' },
    { id: 'vocal', name: 'Placement vocal', description: 'Technique vocale' },
  ];

  const toggleModule = async (reader: Reader, moduleId: string) => {
    try {
      const completedModules = reader.completedModules || [];
      const newModules = completedModules.includes(moduleId)
        ? completedModules.filter(id => id !== moduleId)
        : [...completedModules, moduleId];
      
      const newStatus: TrainingStatus = newModules.length === MODULES.length 
        ? 'completed' 
        : newModules.length > 0 ? 'in_progress' : 'none';

      await updateDoc(doc(db, 'readers', reader.id), { 
        completedModules: newModules,
        trainingStatus: newStatus
      });
      toast.success("Statut mis à jour");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `readers/${reader.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Gestion de la formation</h2>
        <p className="text-slate-500">Suivi en temps réel de la formation des lecteurs</p>
      </header>

      <div className="space-y-4">
        {readers.map(reader => (
          <div key={reader.id} className="bg-card p-4 rounded-3xl border border-slate-800">
            <p className="text-white font-bold mb-2">{reader.prenom} {reader.name}</p>
            <div className="flex gap-2 flex-wrap">
              {MODULES.map(module => (
                <button 
                  key={module.id}
                  onClick={() => toggleModule(reader, module.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (reader.completedModules || []).includes(module.id) 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {module.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                REPORTS VIEW                                 */
/* -------------------------------------------------------------------------- */

const ReportsView = ({ 
  readers, 
  masses, 
  attendance, 
  plannings, 
  feedbacks,
  parishName 
}: { 
  readers: Reader[], 
  masses: Mass[], 
  attendance: Attendance[], 
  plannings: Planning[], 
  feedbacks: Feedback[],
  parishName: string 
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">Centre de Rapports</h2>
        <p className="text-slate-500 font-medium tracking-tight">Générez et téléchargez les documents d'activité de votre paroisse.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between p-8 space-y-6 bg-slate-900/30 border-slate-800/40 hover:border-accent/40 transition-all border-2">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white italic">Rapport Global d'Activité</h3>
              <p className="text-[10px] text-accent uppercase font-black tracking-widest mt-1">PDF Multipage</p>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">Synthèse complète : taux de présence global, activité mensuelle détaillée, et retours des fidèles.</p>
            </div>
          </div>
          <Button 
            onClick={() => generateGlobalStatsPDF(readers, attendance, plannings, masses, feedbacks, parishName)}
            variant="accent" 
            className="w-full py-4 rounded-xl font-black italic uppercase text-[10px] tracking-widest shadow-lg shadow-accent/10"
          >
            <FileDown size={16} className="mr-2" /> Générer Rapport Complet
          </Button>
        </Card>

        <Card className="flex flex-col justify-between p-8 space-y-6 bg-slate-900/30 border-slate-800/40 hover:border-blue-500/40 transition-all border-2">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white italic">Annuaire des Lecteurs</h3>
              <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mt-1">Liste de Contact</p>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">Exportez la liste de tous les lecteurs avec leurs numéros de téléphone et emails pour un usage hors-ligne.</p>
            </div>
          </div>
          <Button 
            onClick={() => generateReaderListPDF(readers, parishName)}
            variant="secondary" 
            className="w-full py-4 rounded-xl font-black italic uppercase text-[10px] tracking-widest"
          >
            <FileDown size={16} className="mr-2" /> Télécharger Annuaire
          </Button>
        </Card>

        <Card className="flex flex-col justify-between p-8 space-y-6 bg-blue-500/5 border-blue-500/20 border-2">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
              <CalendarDays size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white italic opacity-50">Planning de Masse</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed italic">Pour imprimer un planning spécifique, rendez-vous dans l'onglet <strong>Plannings</strong> et cliquez sur l'icône de téléchargement de l'évènement souhaité.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ReaderStatsView = ({ readers, masses, parishId }: { readers: Reader[], masses: Mass[], parishId: string }) => {
  const { currentParish } = useContext(ParishContext);
  const [selectedReaderId, setSelectedReaderId] = useState<string>('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  useEffect(() => {
    if (!parishId) return;
    const qA = query(collection(db, 'attendance'), where('parishId', '==', parishId));
    const unsubA = onSnapshot(qA, (snap) => {
      const docs: Attendance[] = [];
      snap.forEach(d => docs.push({ ...d.data() as Attendance, id: d.id }));
      setAttendance(docs);
    });

    const qP = query(collection(db, 'plannings'), where('parishId', '==', parishId));
    const unsubP = onSnapshot(qP, (snap) => {
      const docs: Planning[] = [];
      snap.forEach(d => docs.push({ ...d.data() as Planning, id: d.id }));
      setPlannings(docs);
    });

    const qF = query(collection(db, 'feedbacks'), where('parishId', '==', parishId));
    const unsubF = onSnapshot(qF, (snap) => {
      const docs: Feedback[] = [];
      snap.forEach(d => docs.push({ ...d.data() as Feedback, id: d.id }));
      setFeedbacks(docs);
    });

    return () => { unsubA(); unsubP(); unsubF(); };
  }, [parishId]);

  // Global Calculations
  const massAttendance = attendance.filter(a => a.type === 'mass');
  const presentRecords = massAttendance.filter(a => a.status === 'present' || a.status === 'late');
  const globalAttendanceRate = massAttendance.length > 0 
    ? Math.round((presentRecords.length / massAttendance.length) * 100) 
    : 0;

  // Monthly Data for Chart
  const monthlyData = Object.values(
    massAttendance.reduce((acc, curr) => {
      const mass = masses.find(m => m.id === curr.massId);
      if (!mass) return acc;
      const date = parseISO(mass.date);
      const monthKey = format(date, 'MMM yyyy', { locale: fr });
      if (!acc[monthKey]) acc[monthKey] = { name: monthKey, present: 0, total: 0 };
      acc[monthKey].total += 1;
      if (curr.status === 'present' || curr.status === 'late') acc[monthKey].present += 1;
      return acc;
    }, {} as Record<string, { name: string, present: number, total: number }>)
  ).map((val: any) => ({
    ...val,
    rate: Math.round((val.present / val.total) * 100)
  })).sort((a: any, b: any) => {
    const dateA = parse(a.name, 'MMM yyyy', new Date(), { locale: fr });
    const dateB = parse(b.name, 'MMM yyyy', new Date(), { locale: fr });
    return dateA.getTime() - dateB.getTime();
  });

  // Role Distribution
  const roleDistribution = ROLES.map(role => {
    const count = plannings.flatMap(p => p.assignments || []).filter(a => a.role === role.id).length;
    return { name: role.label, value: count };
  }).filter(r => r.value > 0);

  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#64748B'];

  // Individual Selection Logic
  const selectedReader = useMemo(() => readers.find(r => r.id === selectedReaderId), [readers, selectedReaderId]);
  
  const readerAttendance = useMemo(() => 
    massAttendance.sort((a,b) => {
      const massA = masses.find(m => m.id === a.massId);
      const massB = masses.find(m => m.id === b.massId);
      return (massB?.date || '').localeCompare(massA?.date || '');
    }).filter(a => a.readerId === selectedReaderId),
    [massAttendance, selectedReaderId, masses]
  );

  const readerAssignments = useMemo(() => {
    return plannings
      .flatMap(p => (p.assignments || []).map(a => ({ ...a, massId: p.massId })))
      .filter(a => a.readerId === selectedReaderId)
      .map(a => {
        const mass = masses.find(m => m.id === a.massId);
        return { ...a, date: mass?.date || '' };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [plannings, selectedReaderId, masses]);

  const readerPresenceCount = readerAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const readerParticipationRate = readerAttendance.length > 0 
    ? Math.round((readerPresenceCount / readerAttendance.length) * 100) 
    : 0;
  
  const readerPunctualityRate = readerPresenceCount > 0
    ? Math.round((readerAttendance.filter(a => a.status === 'present').length / readerPresenceCount) * 100)
    : 0;

  const favoriteRole = useMemo(() => {
    if (readerAssignments.length === 0) return null;
    const counts = readerAssignments.reduce((acc, curr) => {
      acc[curr.role] = (acc[curr.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const sortedRoles = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
    const goldRole = sortedRoles[0];
    return ROLES.find(r => r.id === goldRole[0])?.label || 'N/A';
  }, [readerAssignments]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase leading-none">Tableau Analytique</h2>
          <p className="text-slate-500 font-medium text-sm mt-2">Visibilité sur la performance et l'engagement de la communauté.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            className="text-xs h-10"
            onClick={() => {
              if (selectedReaderId && selectedReader) {
                generateReaderStatsPDF(selectedReader, readerAttendance, readerAssignments, masses, feedbacks.filter(f => f.readerId === selectedReaderId), currentParish?.name || "lecApp");
              } else {
                generateGlobalStatsPDF(readers, attendance, plannings, masses, feedbacks, currentParish?.name || "lecApp");
              }
            }}
          >
            <FileDown size={14} /> Télécharger Rapport
          </Button>
          <div className="bg-slate-900/50 border border-slate-800 p-1 rounded-2xl flex gap-1">
            <button 
              onClick={() => setSelectedReaderId('')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!selectedReaderId ? 'bg-accent text-midnight' : 'text-slate-500'}`}
            >
              GLOBAL
            </button>
            <div className="relative">
              <select 
                value={selectedReaderId}
                onChange={(e) => setSelectedReaderId(e.target.value)}
                className={`px-4 py-2 pr-8 rounded-xl text-xs font-bold appearance-none bg-transparent outline-none transition-all cursor-pointer ${selectedReaderId ? 'bg-accent text-midnight' : 'text-slate-500'}`}
              >
                <option value="" disabled className="text-slate-900 bg-white">LECTEUR...</option>
                {readers.sort((a,b) => a.prenom.localeCompare(b.prenom)).map(r => (
                  <option key={r.id} value={r.id} className="text-slate-900 bg-white">
                    {r.prenom} {r.name[0]}.
                  </option>
                ))}
              </select>
              <ChevronRight size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
            </div>
          </div>
        </div>
      </header>

      {!selectedReaderId ? (
        // GLOBAL DASHBOARD
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-[#0B1120] border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taux de présence Global</p>
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-4xl font-black text-white">{globalAttendanceRate}%</h3>
                <div className={`p-2 rounded-lg ${globalAttendanceRate > 75 ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  <TrendingUp size={20} />
                </div>
              </div>
            </Card>

            <Card className="bg-[#0B1120] border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Lecteurs Actifs</p>
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-4xl font-black text-white">{readers.filter(r => r.isActive).length}</h3>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Users size={20} />
                </div>
              </div>
            </Card>

            <Card className="bg-[#0B1120] border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Missions Finalisées</p>
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-4xl font-black text-white">{plannings.length}</h3>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <CheckCircle size={20} />
                </div>
              </div>
            </Card>

            <Card className="bg-[#0B1120] border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enregistrements Présence</p>
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-4xl font-black text-white">{massAttendance.length}</h3>
                <div className="p-2 rounded-lg bg-slate-500/10 text-slate-400">
                  <CheckSquare size={20} />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="pt-8 bg-[#0B1120] border-slate-800">
              <div className="px-4 mb-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Évolution du Taux de Présence (%)</h4>
              </div>
              <div className="h-[250px] w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B1120', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                      itemStyle={{ color: '#F59E0B' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#F59E0B" 
                      fillOpacity={1} 
                      fill="url(#colorRate)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="bg-[#0B1120] border-slate-800">
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Répartition des Services</h4>
              </div>
              <div className="h-[250px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#0B1120', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="bg-[#0B1120] border-slate-800 p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Classement d'Assiduité (Top 10)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lecteur</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Présences</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taux Participation</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {readers
                    .map(r => {
                      const atts = massAttendance.filter(a => a.readerId === r.id);
                      const presences = atts.filter(a => a.status === 'present' || a.status === 'late').length;
                      const rate = atts.length > 0 ? Math.round((presences / atts.length) * 100) : 0;
                      return { ...r, rate, presences };
                    })
                    .sort((a,b) => b.rate - a.rate || b.presences - a.presences)
                    .slice(0, 10)
                    .map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-600 font-mono text-xs">{idx + 1}.</span>
                            <p className="font-bold text-white text-sm">{r.prenom} {r.name.toUpperCase()}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-400">{r.presences} services</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${r.rate > 80 ? 'bg-green-500' : r.rate > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${r.rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-white">{r.rate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedReaderId(r.id)}
                            className="text-xs font-bold text-accent hover:underline"
                          >
                            Détails
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        // INDIVIDUAL READER VIEW
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-accent/5 border-accent/20 flex flex-col justify-center items-center text-center p-6">
              <TrendingUp className="text-accent mb-3" size={24} />
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Participation</p>
              <h3 className="text-3xl font-black text-white mt-1">{readerParticipationRate}%</h3>
              <p className="text-[10px] text-slate-600 mt-1">{readerAttendance.length} convocations</p>
            </Card>
            
            <Card className="bg-[#0B1120] border-slate-800 flex flex-col justify-center items-center text-center p-6">
              <Bell className="text-amber-500 mb-3" size={24} />
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Ponctualité</p>
              <h3 className="text-3xl font-black text-white mt-1">{readerPunctualityRate}%</h3>
              <p className="text-[10px] text-slate-600 mt-1">À l'heure</p>
            </Card>

            <Card className="bg-[#0B1120] border-slate-800 flex flex-col justify-center items-center text-center p-6">
              <CheckCircle className="text-green-500 mb-3" size={24} />
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Missions Honorées</p>
              <h3 className="text-3xl font-black text-white mt-1">{readerAssignments.length}</h3>
              <p className="text-[10px] text-slate-600 mt-1">Depuis l'inscription</p>
            </Card>

            <Card className="bg-[#0B1120] border-slate-800 flex flex-col justify-center items-center text-center p-6">
              <Star className="text-purple-500 mb-3" size={24} />
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Rôle Préféré</p>
              <h3 className="text-xl font-black text-white mt-1 uppercase italic leading-tight">
                {favoriteRole || 'N/A'}
              </h3>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-[#0B1120] border-slate-800">
              <h4 className="text-xs font-bold text-white mb-6 uppercase tracking-widest">Historique de présence</h4>
              <div className="space-y-3">
                {readerAttendance.length > 0 ? readerAttendance.slice(0, 8).map(a => {
                  const mass = masses.find(m => m.id === a.massId);
                  return (
                    <div key={`${a.id}-${selectedReaderId}`} className="flex justify-between items-center p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div>
                        <p className="text-white font-bold text-sm tracking-tight">{mass?.title || 'Événement'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {mass ? format(parseISO(mass.date), 'EEEE dd MMMM', { locale: fr }) : '-'}
                        </p>
                      </div>
                      <Badge status={a.status} />
                    </div>
                  );
                }) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-600">
                    <CheckSquare size={32} className="mb-2 opacity-20" />
                    <p className="italic text-xs">Aucune donnée de présence disponible</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-[#0B1120] border-slate-800">
              <h4 className="text-xs font-bold text-white mb-6 uppercase tracking-widest">Dernières Assignations</h4>
              <div className="space-y-3">
                {readerAssignments.length > 0 ? readerAssignments.slice(0, 8).map((a, idx) => {
                  const mass = masses.find(m => m.id === a.massId);
                  const role = ROLES.find(r => r.id === a.role);
                  return (
                    <div key={`${idx}-${selectedReaderId}`} className="flex justify-between items-center p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                          <CheckCircle size={16} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm tracking-tight">{role?.label || 'Mission'}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {mass?.title} · {mass ? format(parseISO(mass.date), 'dd MMM', { locale: fr }) : '-'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-700" />
                    </div>
                  );
                }) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-600">
                    <CalendarRange size={32} className="mb-2 opacity-20" />
                    <p className="italic text-xs">Aucune mission enregistrée</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
const PresenceView = ({ masses, readers, parishId }: { masses: Mass[], readers: Reader[], parishId: string }) => {
  const [selectedEvent, setSelectedEvent] = useState<{ type: 'mass' | 'meeting', id: string } | null>(null);
  const [selectedReader, setSelectedReader] = useState<Reader | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeMode, setActiveMode] = useState<'mass' | 'meeting'>('mass');
  const [readerSearch, setReaderSearch] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);

  useEffect(() => {
    if (!parishId) return;
    const qA = query(collection(db, 'attendance'), where('parishId', '==', parishId));
    const unsubA = onSnapshot(qA, (snap) => {
      setAttendance(snap.docs.map(d => ({ ...d.data() as Attendance, id: d.id })));
    });

    const qM = query(collection(db, 'meetings'), where('parishId', '==', parishId), orderBy('date', 'desc'));
    const unsubM = onSnapshot(qM, (snap) => {
      setMeetings(snap.docs.map(d => ({ ...d.data() as Meeting, id: d.id })));
    });

    return () => { unsubA(); unsubM(); };
  }, [parishId]);

  const eventData = selectedEvent ? (selectedEvent.type === 'mass' ? masses.find(m => m.id === selectedEvent.id) : meetings.find(m => m.id === selectedEvent.id)) : null;

  const markPresence = async (readerId: string, type: AttendanceType, status: AttendanceStatus) => {
    if (!selectedEvent) return;
    const existing = attendance.find(a => a.massId === selectedEvent.id && a.readerId === readerId && a.type === type);
    
    try {
      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id), { status, arrivalTime: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'attendance'), {
          parishId,
          massId: selectedEvent.id,
          readerId,
          type,
          status,
          arrivalTime: new Date().toISOString()
        });
      }
    } catch (e: any) { handleFirestoreError(e, OperationType.WRITE, 'attendance'); }
  };

  const submitFeedback = async (readerId: string) => {
    if (!feedbackComment || !selectedEvent) return;
    try {
      await addDoc(collection(db, 'feedbacks'), {
        parishId,
        readerId,
        massId: selectedEvent.id,
        comment: feedbackComment,
        rating: feedbackRating,
        createdAt: new Date().toISOString()
      });
      setShowFeedbackModal(null);
      setFeedbackComment('');
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'feedbacks'); }
  };

  if (selectedEvent && eventData) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <button onClick={() => setSelectedEvent(null)} className="flex items-center gap-2 text-accent font-bold group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Retour
        </button>

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight uppercase italic">{selectedEvent.type === 'mass' ? 'Office' : 'Réunion'}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest mt-1">{(eventData as any).title}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</p>
             <p className="text-white font-bold">{format(parseISO((eventData as any).date), 'dd/MM HH:mm')}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            value={readerSearch}
            onChange={e => setReaderSearch(e.target.value)}
            placeholder="Rechercher un lecteur..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-900/50 rounded-2xl border border-slate-800 outline-none focus:border-accent text-white"
          />
        </div>

        <div className="space-y-4">
          {readers.filter(r => {
            const fullName = `${r.prenom} ${r.name} ${r.postnom}`.toLowerCase();
            return fullName.includes(readerSearch.toLowerCase());
          }).map(reader => {
             const att = attendance.find(a => a.massId === selectedEvent.id && a.readerId === reader.id && (a.type === 'mass' || a.type === 'meeting'));

             return (
               <Card key={reader.id} className="border-slate-800">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400">
                        <UserCircle size={24} />
                      </div>
                      <div>
                    <h4 className="font-bold text-white uppercase italic leading-none mb-1">
                      {reader.prenom} {reader.name.toUpperCase()} {reader.postnom}
                    </h4>
                        <div className="flex gap-2">
                           <Badge status={reader.trainingStatus} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setShowFeedbackModal(reader.id)}
                         className="p-2 text-slate-600 hover:text-accent transition-colors bg-slate-900 rounded-xl"
                         title="Donner un avis"
                       >
                         <Star size={16} />
                       </button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Participation</p>
                    <div className="flex gap-2">
                      <button onClick={() => markPresence(reader.id, selectedEvent.type as AttendanceType, 'present')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${att?.status === 'present' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-background text-slate-500 border-slate-800 hover:border-slate-600'}`}>Présent</button>
                      <button onClick={() => markPresence(reader.id, selectedEvent.type as AttendanceType, 'late')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${att?.status === 'late' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-background text-slate-500 border-slate-800 hover:border-slate-600'}`}>Retard</button>
                      <button onClick={() => markPresence(reader.id, selectedEvent.type as AttendanceType, 'absent')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${att?.status === 'absent' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-background text-slate-500 border-slate-800 hover:border-slate-600'}`}>Absent</button>
                    </div>
                  </div>

                  {showFeedbackModal === reader.id && (
                    <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                       <h5 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-4">CRITIQUER LA PRESTATION DE {reader.prenom} {reader.name.toUpperCase()} {reader.postnom}</h5>
                       <textarea 
                        value={feedbackComment} 
                        onChange={e => setFeedbackComment(e.target.value)}
                        placeholder="Qu'avez-vous pensé de sa lecture ? (intonation, rythme, etc.)"
                        className="w-full bg-background border border-slate-800 rounded-xl p-4 text-white text-sm outline-none focus:border-accent mb-4 resize-none"
                        rows={3}
                       />
                       <div className="flex justify-between items-center">
                          <div className="flex gap-1">
                             {[1,2,3,4,5].map(v => (
                               <button key={v} onClick={() => setFeedbackRating(v)} className={`p-1 ${feedbackRating >= v ? 'text-accent' : 'text-slate-800 hover:text-slate-600'}`}><Star size={20} fill={feedbackRating >= v ? 'currentColor' : 'none'} /></button>
                             ))}
                          </div>
                          <div className="flex gap-2">
                             <Button variant="secondary" className="py-2 px-4 text-xs" onClick={() => setShowFeedbackModal(null)}>Annuler</Button>
                             <Button variant="accent" className="py-2 px-4 text-xs" onClick={() => submitFeedback(reader.id)}>Publier</Button>
                          </div>
                       </div>
                    </div>
                  )}
               </Card>
             );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Présences</h2>
          <p className="text-slate-500 font-medium">Sélectionnez l'évènement à valider.</p>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-inner">
           <button onClick={() => setActiveMode('mass')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${activeMode === 'mass' ? 'bg-accent text-midnight shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Messes</button>
           <button onClick={() => setActiveMode('meeting')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${activeMode === 'meeting' ? 'bg-accent text-midnight shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Réunions</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeMode === 'mass' ? masses.map(mass => (
          <Card key={mass.id} onClick={() => setSelectedEvent({ type: 'mass', id: mass.id })} className="cursor-pointer hover:border-accent group hover:scale-[1.02] transition-all">
             <h4 className="text-xl font-bold text-white mb-2">{mass.title}</h4>
             <p className="text-accent text-[10px] font-black uppercase mb-4 tracking-widest">{format(parseISO(mass.date), 'EEEE d MMMM HH:mm', { locale: fr })}</p>
             <div className="text-slate-500 text-xs flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
               <span>Cliquer pour valider</span>
               <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
             </div>
          </Card>
        )) : meetings.map(meeting => (
          <Card key={meeting.id} onClick={() => setSelectedEvent({ type: 'meeting', id: meeting.id })} className="cursor-pointer hover:border-accent group hover:scale-[1.02] transition-all">
             <h4 className="text-xl font-bold text-white mb-2">{meeting.title}</h4>
             <p className="text-accent text-[10px] font-black uppercase mb-4 tracking-widest">{format(parseISO(meeting.date), 'EEEE d MMMM HH:mm', { locale: fr })}</p>
             <div className="text-slate-500 text-xs flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
               <span>{meeting.location || 'Pas de lieu spécifié'}</span>
               <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
             </div>
          </Card>
        ))}

        {((activeMode === 'mass' && masses.length === 0) || (activeMode === 'meeting' && meetings.length === 0)) && (
          <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-[48px] border border-dashed border-slate-800">
             <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Aucun évènement à afficher</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MassesView = ({ masses, parishId, onRefresh, user }: { masses: Mass[], parishId: string, onRefresh: () => void, user: User | null }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingMass, setEditingMass] = useState<Mass | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [, forceUpdate] = useState({});

  const [commentatorFile, setCommentatorFile] = useState<{ data: string; name: string; type: string } | null>(null);
  const [intentionsFile, setIntentionsFile] = useState<{ data: string; name: string; type: string } | null>(null);
  const [reading1Passage, setReading1Passage] = useState('');
  const [psalmPassage, setPsalmPassage] = useState('');
  const [reading2Passage, setReading2Passage] = useState('');
  const [gospelPassage, setGospelPassage] = useState('');

  const handleCommentatorFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error("Le fichier est trop volumineux. La taille maximale autorisée est de 500 Ko.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCommentatorFile({
          data: reader.result as string,
          name: file.name,
          type: file.type
        });
        toast.success(`Fichier "${file.name}" prêt pour l'envoi`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIntentionsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error("Le fichier est trop volumineux. La taille maximale autorisée est de 500 Ko.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setIntentionsFile({
          data: reader.result as string,
          name: file.name,
          type: file.type
        });
        toast.success(`Fichier "${file.name}" prêt pour l'envoi`);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadFile = (fileData: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Téléchargement lancé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur de téléchargement");
    }
  };

  const editMass = (mass: Mass) => {
    setEditingMass(mass);
    setTitle(mass.title);
    setDate(format(parseISO(mass.date), 'yyyy-MM-dd'));
    setTime(format(parseISO(mass.date), 'HH:mm'));
    setShowAdd(true);
  };

  const updateMass = async () => {
    if (!editingMass || !title || !date || !time) return;
    setLoading(true);
    try {
      const massDate = new Date(`${date}T${time}`);
      await updateDoc(doc(db, 'masses', editingMass.id), {
        title,
        date: massDate.toISOString(),
      });
      toast.success("Messe mise à jour");
      setShowAdd(false);
      setEditingMass(null);
      setTitle('');
      setDate('');
      setTime('');
      onRefresh();
    } catch (e) {
      toast.error("Erreur de mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const addMass = async () => {
    console.log("addMass called, parishId:", parishId, "title:", title, "date:", date, "time:", time, "auth.currentUser:", auth.currentUser);
    if (!title || !date || !time) return;
    
    // Attempting to proceed regardless of auth check, as requested by user
    setLoading(true);
    try {
      const massDate = new Date(`${date}T${time}`);
      if (isNaN(massDate.getTime())) {
        console.error("Invalid date created:", `${date}T${time}`);
        toast.error("La date ou l'heure fournie est invalide.");
        return;
      }
      const massData = {
        parishId,
        date: massDate.toISOString(),
        title,
        maxReaders: 4,
        createdAt: serverTimestamp(),
        commentatorFileData: commentatorFile?.data || null,
        commentatorFileName: commentatorFile?.name || null,
        commentatorFileType: commentatorFile?.type || null,
        reading1Passage,
        psalmPassage,
        reading2Passage,
        gospelPassage,
        intentionsFileData: intentionsFile?.data || null,
        intentionsFileName: intentionsFile?.name || null,
        intentionsFileType: intentionsFile?.type || null
      };
      console.log("Attempting to add mass with data:", massData);
      await addDoc(collection(db, 'masses'), massData);
      toast.success("Évènement créé");
      setShowAdd(false);
      setTitle('');
      setDate('');
      setTime('');
      setCommentatorFile(null);
      setIntentionsFile(null);
      setReading1Passage('');
      setPsalmPassage('');
      setReading2Passage('');
      setGospelPassage('');
      onRefresh();
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur de création");
      handleFirestoreError(e, OperationType.CREATE, 'masses');
    } finally {
      setLoading(false);
    }
  };

  const deleteMass = async (massId: string) => {
    console.log("deleteMass called for mass:", massId);
    try {
      await deleteDoc(doc(db, 'masses', massId));
      console.log("Mass document deleted");
      
      // Cleanup planning
      const planningQ = query(collection(db, 'plannings'), where('massId', '==', massId));
      const pSnap = await getDocs(planningQ);
      console.log("Found planning docs to delete:", pSnap.size);
      await Promise.all(pSnap.docs.map(d => deleteDoc(doc(db, 'plannings', d.id))));

      // Cleanup attendance
      const attQ = query(collection(db, 'attendance'), where('massId', '==', massId));
      const aSnap = await getDocs(attQ);
      console.log("Found attendance docs to delete:", aSnap.size);
      await Promise.all(aSnap.docs.map(d => deleteDoc(doc(db, 'attendance', d.id))));

      toast.success("Messe supprimée");
      onRefresh();
      forceUpdate({});
    } catch (e: any) {
      console.error("Error deleting mass:", e);
      handleFirestoreError(e, OperationType.DELETE, `masses/${massId}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Calendrier Liturgique</h2>
          <p className="text-slate-500 font-medium">Programmation des célébrations et offices.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="accent" className="p-4 rounded-2xl">
          <CalendarDays size={24} />
        </Button>
      </header>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="space-y-6 border-slate-700 bg-slate-900 border-2">
              <h3 className="font-bold text-white text-lg italic tracking-tight uppercase">Programmer une célébration</h3>
              <div className="space-y-4">
                <input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Titre de la messe (ex: Messe du Dimanche)" 
                  className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none text-white appearance-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Heure</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none text-white appearance-none" />
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-4">
                    <input value={reading1Passage} onChange={e => setReading1Passage(e.target.value)} placeholder="1ère Lecture" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                    <input value={psalmPassage} onChange={e => setPsalmPassage(e.target.value)} placeholder="Psaume" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                    <input value={reading2Passage} onChange={e => setReading2Passage(e.target.value)} placeholder="2ème Lecture" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                    <input value={gospelPassage} onChange={e => setGospelPassage(e.target.value)} placeholder="Évangile" className="w-full p-4 bg-background rounded-2xl border border-slate-800 outline-none focus:border-accent text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Commentaires du Commentateur (Optionnel - max 500 Ko)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-background border border-slate-800 rounded-2xl hover:border-accent cursor-pointer transition-all text-slate-400 hover:text-white">
                        <Paperclip size={20} className="text-accent" />
                        <span className="text-sm font-bold truncate">
                          {commentatorFile ? commentatorFile.name : "Choisir un fichier"}
                        </span>
                        <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" onChange={handleCommentatorFileUpload} className="hidden" />
                      </label>
                      {commentatorFile && (
                        <button type="button" onClick={() => setCommentatorFile(null)} className="p-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all"><X size={20} /></button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Intentions (Optionnel - max 500 Ko)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-background border border-slate-800 rounded-2xl hover:border-accent cursor-pointer transition-all text-slate-400 hover:text-white">
                        <Paperclip size={20} className="text-accent" />
                        <span className="text-sm font-bold truncate">
                          {intentionsFile ? intentionsFile.name : "Choisir un fichier"}
                        </span>
                        <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" onChange={handleIntentionsFileUpload} className="hidden" />
                      </label>
                      {intentionsFile && (
                        <button type="button" onClick={() => setIntentionsFile(null)} className="p-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all"><X size={20} /></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => { setShowAdd(false); setEditingMass(null); }} variant="secondary" className="flex-1 rounded-2xl py-4">Annuler</Button>
                <Button onClick={editingMass ? updateMass : addMass} disabled={loading} variant="accent" className="flex-1 rounded-2xl py-4">{loading ? (editingMass ? 'Mise à jour...' : 'Création...') : (editingMass ? 'Mettre à jour' : 'Confirmer')}</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masses.map(mass => (
          <Card key={mass.id} className="group hover:border-slate-700 transition-all overflow-hidden relative">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center group-hover:border-accent/40 transition-colors">
                <span className="text-[10px] font-extrabold text-accent uppercase tracking-tighter">{format(parseISO(mass.date), 'MMM', { locale: fr })}</span>
                <span className="text-2xl font-black text-white leading-none">{format(parseISO(mass.date), 'dd')}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                   <h4 className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors">{mass.title}</h4>
                   <div className="flex gap-2">
                     <button 
                      onClick={() => editMass(mass)}
                      className="p-3 text-slate-600 hover:text-accent transition-colors"
                     >
                       <Edit2 size={20} />
                     </button>
                     <button 
                      onClick={() => deleteMass(mass.id)}
                      className="p-3 text-slate-600 hover:text-red-500 transition-colors"
                     >
                       <Trash2 size={20} />
                     </button>
                   </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                   <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 uppercase tracking-widest">
                      <CalendarDays size={12} className="text-slate-600" />
                      {format(parseISO(mass.date), 'EEEE', { locale: fr })}
                   </div>
                   <span className="w-1 h-1 bg-slate-800 rounded-full" />
                   <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 uppercase tracking-widest">
                      <span className="text-accent ring-1 ring-accent/20 px-1 rounded">{format(parseISO(mass.date), 'HH:mm')}</span>
                   </div>
                </div>

                {mass.fileData && (
                  <div className="mt-4 flex items-center">
                    <button 
                      onClick={() => downloadFile(mass.fileData!, mass.fileName || 'liturgie.pdf')}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 hover:bg-accent text-accent hover:text-midnight text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                      <Paperclip size={12} />
                      <span className="max-w-[150px] truncate">{mass.fileName || 'Fichier Liturgique'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Church className="absolute -right-4 -bottom-4 w-16 h-16 text-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Card>
        ))}
        {masses.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-[48px] border border-dashed border-slate-800">
            <CalendarDays size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aucune messe programmée</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

const EstechView = () => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center space-y-4">
        <div className="w-24 h-24 bg-accent rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20 mb-6">
           <Settings size={48} className="text-midnight" />
        </div>
        <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">ESTECH</h1>
        <p className="text-accent font-bold uppercase tracking-[0.3em] text-sm">Innovation & Excellence Technologique</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <Card className="bg-slate-900/50 border-slate-800 p-8 space-y-6">
          <h2 className="text-2xl font-bold text-white italic uppercase tracking-tight">Le Profil du Fondateur</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
               <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
                  <UserCircle size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-white text-lg italic">Étienne MANAMA</h3>
                  <p className="text-slate-500 text-sm">Ingénieur en Informatique & Visionnaire</p>
               </div>
            </div>
            
            <p className="text-slate-400 leading-relaxed text-sm md:text-base">
              Ingénieur passionné par le développement de solutions numériques innovantes, Étienne Manama allie expertise technique et engagement communautaire pour transformer la gestion des activités paroissiales.
            </p>

            <div className="grid grid-cols-1 gap-3 pt-4">
               <div className="flex items-center gap-3 bg-background/50 p-4 rounded-2xl border border-slate-800">
                  <CheckCircle className="text-green-500" size={18} />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Formateur des Lecteurs</span>
               </div>
               <div className="flex items-center gap-3 bg-background/50 p-4 rounded-2xl border border-slate-800">
                  <CheckCircle className="text-green-500" size={18} />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Vice-Président du Lectorat Saint Gabriel</span>
               </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
           <Card className="bg-[#0B1120] border-slate-800 group hover:border-accent/40 transition-all p-8">
              <h3 className="text-accent font-black uppercase tracking-widest text-xs mb-4">Notre Vision</h3>
              <p className="text-slate-300 italic text-lg md:text-xl leading-relaxed">
                "Mettre la technologie au service de la foi pour une organisation ecclésiale moderne, transparente et efficace."
              </p>
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-800 p-6 flex flex-col items-center text-center space-y-2">
                 <LayoutDashboard className="text-slate-500" size={24} />
                 <h4 className="text-white font-bold text-xs uppercase tracking-widest">Expertise IT</h4>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800 p-6 flex flex-col items-center text-center space-y-2">
                 <CheckSquare className="text-slate-500" size={24} />
                 <h4 className="text-white font-bold text-xs uppercase tracking-widest">Formation</h4>
              </Card>
           </div>
        </div>
      </div>

      <section className="pt-12 border-t border-slate-900">
         <div className="text-center space-y-4 mb-12">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Nos Valeurs Fondamentales</h3>
            <div className="w-12 h-1 bg-accent mx-auto rounded-full" />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Innovation', desc: 'Repousser les limites technologiques pour créer des outils sur mesure adaptés aux réalités locales.' },
              { title: 'Service', desc: 'Accompagner les communautés chrétiennes dans leur transition vers une gestion numérique.' },
              { title: 'Excellence', desc: 'Garantir la fiabilité, la sécurité et la simplicité de chaque solution développée.' }
            ].map((v, i) => (
              <Card key={i} className="text-center p-8 space-y-3 group hover:bg-accent/5 transition-all border-slate-800/40">
                <h4 className="text-accent font-black uppercase italic tracking-widest">{v.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
              </Card>
            ))}
         </div>
      </section>

      <footer className="text-center py-12">
         <p className="text-slate-600 text-xs font-medium italic">lecApp est une solution propulsée par ESTECH · Étienne Manama</p>
      </footer>
    </div>
  );
};

const LandingView = ({ 
  parishes, 
  onAdminClick, 
  onSelectParish,
  onEstechClick
}: { 
  parishes: Parish[], 
  onAdminClick: () => void, 
  onSelectParish: (p: Parish) => void,
  onEstechClick: () => void
}) => {
  const [search, setSearch] = useState('');
  const [upcomingMasses, setUpcomingMasses] = useState<Mass[]>([]);
  const [parishInfo, setParishInfo] = useState<Record<string, Parish>>({});

  useEffect(() => {
    // Fetch some upcoming masses across all parishes
    const q = query(
      collection(db, 'masses'), 
      where('date', '>=', new Date().toISOString()),
      orderBy('date', 'asc'),
      limit(10)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const m: Mass[] = [];
      snapshot.forEach(d => m.push({ ...d.data() as Mass, id: d.id }));
      setUpcomingMasses(m);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const info: Record<string, Parish> = {};
    parishes.forEach(p => info[p.id] = p);
    setParishInfo(info);
  }, [parishes]);

  const filteredParishes = parishes.filter(p => {
    const searchTerms = search.toLowerCase().split(' ').filter(t => t.length > 0);
    if (searchTerms.length === 0) return true;
    const searchable = `${p.name} ${p.city || ''} ${p.diocese || ''}`.toLowerCase();
    return searchTerms.every(term => searchable.includes(term));
  });

  return (
    <div className="min-h-screen bg-background text-slate-200">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6 overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-accent/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <nav className="flex justify-between items-center mb-24">
            <div className="flex items-center gap-3">
              <Logo className="w-12 h-12" />
            </div>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h2 className="text-6xl md:text-7xl font-black text-white leading-none tracking-tighter italic uppercase">
                  La Liturgie <br />
                  <span className="text-accent underline decoration-4 underline-offset-8">Connectée</span>
                </h2>
                <p className="text-xl text-slate-400 font-medium max-w-lg leading-relaxed">
                  Consultez les plannings des lecteurs et les horaires des messes de votre paroisse en temps réel.
                </p>
                <div className="flex gap-4 pt-4">
                  <Button 
                    onClick={onAdminClick}
                    variant="secondary"
                    className="rounded-2xl px-8 py-6 text-sm font-bold uppercase tracking-widest"
                  >
                    Créer ma paroisse
                  </Button>
                </div>
              </motion.div>

              <div className="relative group max-w-md">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent transition-colors" size={20} />
                <input 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher une paroisse (ex: Notre-Dame...)"
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-[32px] py-5 pl-14 pr-6 outline-none focus:ring-2 ring-accent/20 transition-all text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/30 border border-slate-800 p-8 rounded-[48px] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <CalendarDays className="text-accent" size={18} />
                  Prochaines Messes
                </h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full">Global</span>
              </div>

              <div className="space-y-4">
                {upcomingMasses.length > 0 ? upcomingMasses.map(mass => (
                  <div 
                    key={mass.id} 
                    onClick={() => onSelectParish(parishInfo[mass.parishId])}
                    className="flex items-center gap-4 p-4 bg-background/50 rounded-3xl border border-slate-800/50 hover:border-slate-700 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-slate-800 group-hover:bg-slate-800 transition-colors">
                      <span className="text-[10px] font-black text-accent uppercase leading-none">{format(parseISO(mass.date), 'MMM', { locale: fr })}</span>
                      <span className="text-xl font-black text-white leading-none mt-0.5">{format(parseISO(mass.date), 'dd')}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-200 text-sm">{mass.title}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        {parishInfo[mass.parishId]?.name || '...'} · {format(parseISO(mass.date), 'HH:mm')}
                      </p>
                    </div>
                    <Button variant="ghost" className="p-2">
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                )) : (
                  <p className="text-slate-600 text-center py-8 italic text-sm">Chargement des horaires...</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Parishes Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-32">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Annuaire des Paroisses</h3>
            <p className="text-slate-500 font-medium">Découvrez les communautés utilisant lecApp.</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-accent italic">{filteredParishes.length}</span>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Résultats</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParishes.map(p => (
            <Card 
              key={p.id} 
              onClick={() => onSelectParish(p)}
              className="p-8 group cursor-pointer hover:scale-[1.02] active:scale-95 bg-slate-900/10 border-slate-800/40"
            >
              <div className="w-14 h-14 bg-slate-900 rounded-[24px] border border-slate-800 flex items-center justify-center text-accent mb-6 group-hover:bg-accent group-hover:text-midnight transition-all duration-300">
                <Church size={28} />
              </div>
              <h4 className="text-xl font-bold text-white group-hover:text-accent transition-colors">{p.name}</h4>
              <p className="text-slate-500 text-xs font-semibold mt-2 line-clamp-1">{p.diocese || 'Secteur Local'}</p>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex -space-x-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-background" />)}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-white transition-colors">
                  Voir planning
                  <ChevronRight size={14} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-900 py-12 px-6 flex flex-col items-center gap-4">
        <button onClick={onEstechClick} className="text-slate-800 font-black tracking-[0.2em] uppercase hover:text-accent transition-colors">Estech</button>
        <p className="text-slate-700 text-[10px] font-mono tracking-[0.4em] uppercase">Developed by Estech · © 2026</p>
      </footer>
    </div>
  );
};

const PublicReaderAssignment = ({ role, reader, mass, parish, feedbacks = [] }: { role: any; reader?: Reader | null; mass: Mass; parish: Parish; feedbacks?: Feedback[]; key?: any }) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);

  const handleFeedback = async () => {
    if (!comment || !reader) return;
    try {
      await addDoc(collection(db, 'feedbacks'), {
        parishId: parish.id,
        massId: mass.id,
        readerId: reader.id,
        comment,
        rating,
        createdAt: new Date().toISOString()
      });
      setComment('');
      setShowFeedbackModal(false);
      toast.success("Votre retour a été publié. Merci !");
    } catch (e: any) {
      console.error(e);
      handleFirestoreError(e, OperationType.WRITE, 'feedbacks');
    }
  };

  const isPastMass = new Date(mass.date) < new Date();
  const readerFeedbacks = feedbacks.filter(f => f.massId === mass.id && f.readerId === reader?.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span className="hidden md:inline">{role.label}</span>
          <span className="md:hidden">{role.short}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className={`font-bold text-sm ${reader ? 'text-white' : 'text-slate-800 italic'}`}>
            {reader ? `${reader.prenom} ${reader.name.toUpperCase()} ${reader.postnom}` : 'Non assigné'}
          </span>
          <div className="flex items-center gap-1">
            {reader && readerFeedbacks.length > 0 && (
              <button 
                onClick={() => setShowFeedbacks(!showFeedbacks)}
                className={`p-1.5 rounded-lg transition-all ${showFeedbacks ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400 hover:text-blue-400'}`}
                title="Voir les commentaires"
              >
                <div className="relative">
                  <MessageSquare size={14} />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                </div>
              </button>
            )}
            {reader && isPastMass && (
              <button 
                onClick={() => setShowFeedbackModal(!showFeedbackModal)}
                className={`p-1.5 rounded-lg transition-all ${showFeedbackModal ? 'bg-accent text-midnight' : 'bg-slate-800 text-slate-400 hover:text-accent'}`}
                title="Critiquer la prestation"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFeedbacks && reader && readerFeedbacks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mb-2">
              {readerFeedbacks.map((f) => (
                <div key={f.id} className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(v => (
                        <Star key={v} size={10} fill={f.rating >= v ? 'currentColor' : 'none'} className={f.rating >= v ? 'text-accent' : 'text-slate-800'} />
                      ))}
                    </div>
                    <span className="text-[8px] text-slate-600 font-bold uppercase">{format(parseISO(f.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">"{f.comment}"</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showFeedbackModal && reader && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-accent uppercase tracking-[0.2em]">Donner un avis public</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(v => (
                    <button key={v} onClick={() => setRating(v)} className={`p-0.5 ${rating >= v ? 'text-accent' : 'text-slate-800'}`}>
                      <Star size={16} fill={rating >= v ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea 
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Partagez votre avis sur la prestation..."
                className="w-full bg-background border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-accent resize-none h-20"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="text-[10px] py-1 h-auto" onClick={() => setShowFeedbackModal(false)}>Fermer</Button>
                <Button variant="accent" className="text-[10px] py-1 h-auto px-4" onClick={handleFeedback}>Publier</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PublicParishConsultation = ({ parish, onBack, onAdminRequest, onEstechClick }: { parish: Parish, onBack: () => void, onAdminRequest: (p: Parish) => void, onEstechClick: () => void }) => {
  const [masses, setMasses] = useState<Mass[]>([]);
  const [plannings, setPlannings] = useState<Record<string, Planning>>({});
  const [readers, setReaders] = useState<Reader[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMassReaders, setExpandedMassReaders] = useState<Record<string, boolean>>({});

  const toggleExpanded = (massId: string) => {
    setExpandedMassReaders(prev => ({
      ...prev,
      [massId]: !prev[massId]
    }));
  };

  useEffect(() => {
    if (!parish) return;
    
    const mQ = query(collection(db, 'masses'), where('parishId', '==', parish.id), orderBy('date', 'desc'));
    const unsubMasses = onSnapshot(mQ, (snapshot) => {
      const m: Mass[] = [];
      snapshot.forEach(d => m.push({ ...d.data() as Mass, id: d.id }));
      setMasses(m);
      setLoading(false);
    }, (error) => {
      console.error("Error loading masses:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'masses');
    });

    const pQ = query(collection(db, 'plannings'), where('parishId', '==', parish.id));
    const unsubPlannings = onSnapshot(pQ, (snapshot) => {
      const p: Record<string, Planning> = {};
      snapshot.forEach(d => {
        const data = d.data() as Planning;
        p[data.massId] = data;
      });
      setPlannings(p);
    });

    const rQ = query(collection(db, 'readers'), where('parishId', '==', parish.id));
    const unsubReaders = onSnapshot(rQ, (snapshot) => {
      const r: Reader[] = [];
      snapshot.forEach(d => r.push({ ...d.data() as Reader, id: d.id }));
      setReaders(r);
    });

    const fQ = query(collection(db, 'feedbacks'), where('parishId', '==', parish.id));
    const unsubFeedbacks = onSnapshot(fQ, (snapshot) => {
      const f: Feedback[] = [];
      snapshot.forEach(d => f.push({ ...d.data() as Feedback, id: d.id }));
      setFeedbacks(f);
    });

    return () => { unsubMasses(); unsubPlannings(); unsubReaders(); unsubFeedbacks(); };
  }, [parish]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="flex justify-between items-center">
          <button onClick={onBack} className="flex items-center gap-3 text-white group">
            <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center group-hover:border-accent group-hover:text-accent transition-all">
              <ArrowLeft size={20} />
            </div>
            <span className="font-bold uppercase tracking-widest text-xs">Retour</span>
          </button>
          <div className="text-right flex items-center gap-6">
            <Button 
              onClick={() => onAdminRequest(parish)} 
              variant="outline" 
              className="flex text-[10px] uppercase font-bold tracking-widest border-slate-800 hover:border-accent hover:text-accent"
            >
              Gérer la Paroisse
            </Button>
            <div>
               <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">{parish.name}</h1>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{parish.diocese || 'Consultation Publique'}</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Logo className="w-16 h-16" showText={false} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Chargement du planning...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
            {masses.map(mass => {
              const planning = plannings[mass.id];
              const isExpanded = expandedMassReaders[mass.id];
              return (
                <Card key={mass.id} className="p-8 space-y-6 bg-slate-900/30 border-slate-800/50 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-black text-white text-xl uppercase italic tracking-tighter">{mass.title}</h3>
                      <p className="text-accent font-bold text-[10px] uppercase tracking-widest">
                        {format(parseISO(mass.date), 'EEEE d MMMM · HH:mm', { locale: fr })}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-2">
                      {mass.fileData && (
                        <button 
                          onClick={() => {
                            try {
                              const link = document.createElement('a');
                              link.href = mass.fileData!;
                              link.download = mass.fileName || 'liturgie.pdf';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success("Téléchargement lancé");
                            } catch (e) {
                              toast.error("Erreur de téléchargement");
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 hover:bg-accent text-accent hover:text-midnight text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <FileDown size={14} />
                          <span className="max-w-[120px] truncate">{mass.fileName || 'Feuille Liturgique'}</span>
                        </button>
                      )}
                      {mass.commentatorFileData && (
                        <button 
                          onClick={() => {
                            try {
                              const link = document.createElement('a');
                              link.href = mass.commentatorFileData!;
                              link.download = mass.commentatorFileName || 'commentaires.pdf';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success("Téléchargement lancé");
                            } catch (e) {
                              toast.error("Erreur de téléchargement");
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 hover:bg-accent text-accent hover:text-midnight text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <FileDown size={14} />
                          <span className="max-w-[120px] truncate">{mass.commentatorFileName || 'Commentaires'}</span>
                        </button>
                      )}
                      {mass.intentionsFileData && (
                        <button 
                          onClick={() => {
                            try {
                              const link = document.createElement('a');
                              link.href = mass.intentionsFileData!;
                              link.download = mass.intentionsFileName || 'intentions.pdf';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success("Téléchargement lancé");
                            } catch (e) {
                              toast.error("Erreur de téléchargement");
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 hover:bg-accent text-accent hover:text-midnight text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <FileDown size={14} />
                          <span className="max-w-[120px] truncate">{mass.intentionsFileName || 'Intentions'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(mass.id)}
                        className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all relative z-10 ${isExpanded ? 'bg-accent text-midnight' : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                        {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                        {isExpanded ? "Masquer les lecteurs" : "Voir les lecteurs"}
                      </button>
                    </div>

                    <div className="space-y-3 py-4 border-y border-slate-800/80">
                      {mass.reading1Passage && <p className="text-xs text-slate-300"><b>1ère Lecture:</b> {mass.reading1Passage}</p>}
                      {mass.psalmPassage && <p className="text-xs text-slate-300"><b>Psaume:</b> {mass.psalmPassage}</p>}
                      {mass.reading2Passage && <p className="text-xs text-slate-300"><b>2ème Lecture:</b> {mass.reading2Passage}</p>}
                      {mass.gospelPassage && <p className="text-xs text-slate-300"><b>Évangile:</b> {mass.gospelPassage}</p>}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-5 pt-6 border-t border-slate-800/80 mt-4"
                      >
                        {ROLES.map(role => {
                          const assignment = planning?.assignments?.find(a => a.role === role.id);
                          const reader = readers.find(r => r.id === assignment?.readerId);
                          return (
                            <PublicReaderAssignment 
                              key={role.id} 
                              role={role} 
                              reader={reader} 
                              mass={mass} 
                              parish={parish} 
                              feedbacks={feedbacks}
                            />
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
            {masses.length === 0 && (
              <div className="col-span-full py-24 text-center bg-slate-900/10 rounded-[64px] border border-dashed border-slate-800">
                 <CalendarDays size={48} className="mx-auto text-slate-800 mb-6" />
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aucune célébration prévue pour le moment</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <footer className="border-t border-slate-900 py-12 flex flex-col items-center gap-4">
          <button onClick={onEstechClick} className="text-slate-800 font-black tracking-[0.2em] uppercase hover:text-accent transition-colors">Estech</button>
          <p className="text-slate-700 text-[10px] font-mono tracking-[0.4em] uppercase">Developed by Estech · © 2026</p>
        </footer>
      </div>
    </div>
  );
};

const AuthView = ({ onLogin, onRegisterParish, onBack, onResetPassword }: { onLogin: () => void, onRegisterParish: () => void, onBack: () => void, onResetPassword: () => void }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative overflow-hidden">
       <button onClick={onBack} className="absolute top-8 left-8 text-slate-500 hover:text-white flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] transition-colors z-20">
         <ArrowLeft size={16} />
         Retour à l'accueil
       </button>
       <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-accent/5 blur-[150px] rounded-full pointer-events-none" />
       <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />

       <div className="max-w-md w-full space-y-12 relative z-10 text-center">
            <div className="space-y-6">
              <div className="w-24 h-24 bg-accent rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20">
                <Logo className="w-16 h-16" showText={false} />
              </div>
              <div>
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Espace Admin</h2>
                <p className="text-slate-500 font-medium mt-2">Pour gérer votre paroisse, veuillez la sélectionner dans l'annuaire et utiliser son code d'accès.</p>
              </div>
            </div>

          <div className="space-y-6">
            <div className="p-8 border border-slate-800 rounded-[32px] bg-slate-900/40 space-y-4">
              <h3 className="text-accent font-black uppercase tracking-[0.2em] text-[10px]">Administrateur Général</h3>
              <p className="text-slate-500 text-xs px-2">Espace réservé à l'administration centrale via l'adresse mail autorisée.</p>
              <Button onClick={onLogin} variant="accent" className="w-full py-5 text-sm rounded-2xl font-bold">
                 Accès Admin Google
              </Button>
              <button 
                onClick={onResetPassword}
                className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:text-accent transition-colors pt-2 block mx-auto"
              >
                Mot de passe compte oublié ?
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/50"></div></div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-black"><span className="bg-background px-4 text-slate-700">Actions Secondaires</span></div>
            </div>

            <Button onClick={onRegisterParish} variant="secondary" className="w-full py-4 rounded-2xl text-xs uppercase tracking-widest font-bold">
               Enregistrer une nouvelle paroisse
            </Button>
          </div>

          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">Propulsé par Estech · © 2026</p>
       </div>
    </div>
  );
};

const SUPER_ADMIN_EMAIL = 'mamelkmanama@gmail.com';

const SuperAdminView = ({ parishes, onDeleteParish, onEnterParish }: { parishes: Parish[], onDeleteParish: (id: string) => void, onEnterParish: (p: Parish) => void }) => {
  const [search, setSearch] = useState('');

  const filtered = parishes.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.diocese && p.diocese.toLowerCase().includes(search.toLowerCase())) ||
    (p.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">Administration Générale</h2>
          <p className="text-slate-500 font-medium">Gestion globale des paroisses enregistrées.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une paroisse..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-accent/5 border-accent/20">
          <p className="text-accent text-xs font-bold uppercase tracking-widest">Total Paroisses</p>
          <h2 className="text-4xl font-bold text-white mt-4">{parishes.length}</h2>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Résultats</p>
          <h2 className="text-4xl font-bold text-white mt-4">{filtered.length}</h2>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold">Répertoire des Paroisses</h3>
          <div className="flex gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase py-1 px-3 bg-slate-900 rounded-full border border-slate-800">Serveur Actif</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4">Paroisse</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4">Localisation</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map(p => (
                <tr key={p.id} className="group hover:bg-slate-900/30 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-white font-bold">{p.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.id}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-slate-300 text-sm">{p.diocese || 'N/A'}</p>
                    <p className="text-slate-500 text-[11px]">{p.deanery || 'N/A'}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button 
                        onClick={() => onEnterParish(p)}
                        className="p-2 text-accent hover:text-white transition-colors bg-accent/10 rounded-xl border border-accent/20"
                        title="Entrer dans la paroisse"
                      >
                        <LogIn size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteParish(p.id)}
                        className="p-2 text-slate-600 hover:text-red-500 transition-colors bg-slate-900 rounded-xl"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-500 italic text-sm">
                    Aucune paroisse trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'admin' | 'estech'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [currentParishId, setCurrentParishId] = useState<string | null>(null);
  const currentParish = useMemo(() => {
    if (!currentParishId) return null;
    return parishes.find(p => p.id === currentParishId) || null;
  }, [parishes, currentParishId]);
  
  const setCurrentParish = (p: Parish | null) => {
    setCurrentParishId(p ? p.id : null);
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCreatingParish, setIsCreatingParish] = useState(false);
  const [activeReaders, setActiveReaders] = useState<Reader[]>([]);
  const [activeMasses, setActiveMasses] = useState<Mass[]>([]);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  const [activeAttendance, setActiveAttendance] = useState<Attendance[]>([]);
  const [activePlannings, setActivePlannings] = useState<Record<string, Planning>>({});
  const [activeFeedbacks, setActiveFeedbacks] = useState<Feedback[]>([]);
  const [isDeletingParish, setIsDeletingParish] = useState<string | null>(null);
  const [isWipingAll, setIsWipingAll] = useState(false);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const pendingRequestsCount = passwordRequests.length;
  const [passwordUpdateValue, setPasswordUpdateValue] = useState('');
  const [parishNameUpdate, setParishNameUpdate] = useState('');
  const [parishCityUpdate, setParishCityUpdate] = useState('');
  const [parishDioceseUpdate, setParishDioceseUpdate] = useState('');
  const [parishDeaneryUpdate, setParishDeaneryUpdate] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [hasNotifiedRequests, setHasNotifiedRequests] = useState(false);
  const isGoogleUserAccount = useMemo(() => {
    if (!user) return false;
    return user.providerId === 'google.com' || user.providerData.some(p => p.providerId === 'google.com');
  }, [user]);

  const updateParishPassword = async () => {
    if (!currentParish || !passwordUpdateValue) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'parishes', currentParish.id), {
        password: passwordUpdateValue
      });
      toast.success("Mot de passe paroissial mis à jour !");
      setPasswordUpdateValue('');
    } catch (e: any) {
      console.error("Update error:", e);
      toast.error(e.message || "Erreur lors de la mise à jour");
    } finally {
      setActionLoading(false);
    }
  };

  const updateParishInfo = async () => {
    if (!currentParish || (!parishNameUpdate && !parishCityUpdate && !parishDioceseUpdate && !parishDeaneryUpdate)) return;
    setActionLoading(true);
    try {
      const updates: any = {};
      if (parishNameUpdate) updates.name = parishNameUpdate;
      if (parishCityUpdate) updates.city = parishCityUpdate;
      if (parishDioceseUpdate) updates.diocese = parishDioceseUpdate;
      if (parishDeaneryUpdate) updates.deanery = parishDeaneryUpdate;
      
      await updateDoc(doc(db, 'parishes', currentParish.id), updates);
      toast.success("Profil de la paroisse mis à jour !");
      setParishNameUpdate('');
      setParishCityUpdate('');
      setParishDioceseUpdate('');
      setParishDeaneryUpdate('');
    } catch (e: any) {
      console.error("Update error:", e);
      toast.error(e.message || "Erreur lors de la mise à jour");
    } finally {
      setActionLoading(false);
    }
  };

  const deletePasswordRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'password_requests', id));
      toast.success("Demande supprimée");
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const updateAccountPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!user || !newAccountPassword) return;
    
    // Check if user is using Google/Social login
    if (isGoogleUserAccount) {
      toast.error("Votre compte est lié à Google. Vous devez changer votre mot de passe depuis les paramètres de votre compte Google.");
      return;
    }

    if (newAccountPassword.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    setActionLoading(true);
    try {
      await updatePassword(user, newAccountPassword);
      toast.success("Mot de passe de votre compte mis à jour avec succès !");
      setNewAccountPassword('');
    } catch (e: any) {
      console.error("Auth update error:", e);
      if (e.code === 'auth/requires-recent-login') {
        toast.error("Sécurité : Cette action nécessite une connexion toute récente. Déconnectez-vous puis reconnectez-vous pour continuer.");
      } else if (e.code === 'auth/user-mismatch') {
        toast.error("Erreur de session. Veuillez vous reconnecter.");
      } else {
        toast.error(e.message || "Erreur lors de la mise à jour");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setParishLoggedIn(false);
      setCurrentParish(null);
      setView('landing');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleResetPassword = async () => {
    const email = window.prompt("Veuillez entrer votre adresse e-mail pour réinitialiser votre mot de passe :");
    if (!email) return;

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("E-mail de réinitialisation envoyé !");
    } catch (e: any) {
      console.error("Reset error:", e);
      toast.error(e.message || "Erreur lors de l'envoi");
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [superAdminParishView, setSuperAdminParishView] = useState(false);
  const [isParishPasswordLock, setIsParishPasswordLock] = useState<Parish | null>(null);
  const [typedPassword, setTypedPassword] = useState('');

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    if (isSuperAdmin && currentParish) {
      // Super Admin can now enter parish but Firestore blocks writes
    }
  }, [isSuperAdmin, currentParish]);

  useEffect(() => {
    if (isSuperAdmin && activeTab !== 'superadmin' && !currentParish) {
      setActiveTab('superadmin');
    }
  }, [isSuperAdmin, activeTab, currentParish]);

  const [newParishName, setNewParishName] = useState('');
  const [newParishPassword, setNewParishPassword] = useState('');
  const [newParishAddress, setNewParishAddress] = useState('');
  const [newParishDeanery, setNewParishDeanery] = useState('');
  const [newParishDiocese, setNewParishDiocese] = useState('');

  const [parishLoggedIn, setParishLoggedIn] = useState(false);
  const [isForgotParishPassword, setIsForgotParishPassword] = useState(false);
  const [requestContact, setRequestContact] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (pendingRequestsCount > 0 && currentParish && parishLoggedIn && !hasNotifiedRequests) {
      toast.info(`Vous avez ${pendingRequestsCount} demande(s) de mot de passe en attente dans "Paramètres"`, {
        duration: 10000,
        action: {
          label: 'Voir',
          onClick: () => setActiveTab('settings')
        }
      });
      setHasNotifiedRequests(true);
    }
    if (pendingRequestsCount === 0) setHasNotifiedRequests(false);
  }, [pendingRequestsCount, parishLoggedIn, currentParish?.id]);

  useEffect(() => {
    let q;
    if (isSuperAdmin && !currentParish) {
      q = query(collection(db, 'password_requests'));
    } else if (currentParish && user) {
      // Query by parishId - security rules handle restricting to admins of that parish
      q = query(collection(db, 'password_requests'), where('parishId', '==', currentParish.id));
    } else {
      return;
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const reqs: any[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        reqs.push({ ...data, id: d.id });
      });
      // Sort in memory instead
      reqs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPasswordRequests(reqs);
    }, (error) => {
      console.error("Password requests fetching error:", error);
    });
    return unsub;
  }, [currentParish?.id, isSuperAdmin]);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
      if (u) {
        // If logged in and no parish selected, maybe go to admin selection
        if (view === 'auth') {
          setView('admin');
        }
      } else {
        if (view === 'admin' && !parishLoggedIn) setView('landing');
      }
    });
  }, [view, parishLoggedIn]);

  useEffect(() => {
    // Public fetch of all parishes for landing search
    const q = query(collection(db, 'parishes'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const p: Parish[] = [];
      snapshot.forEach(d => p.push({ ...d.data() as Parish, id: d.id }));
      setParishes(p);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // For admin view, filter parishes owned or unlocked
    const unlockedJson = localStorage.getItem(`unlocked_parishes_${user.uid}`);
    const unlockedIds = unlockedJson ? JSON.parse(unlockedJson) : [];
  }, [user]);

  const canManage = (p: Parish) => {
    if (isSuperAdmin) return true;
    if (currentParish?.id === p.id && parishLoggedIn) return true;
    if (!user) return false;
    if (p.adminId === user.uid) return true;
    const unlockedJson = localStorage.getItem(`unlocked_parishes_${user.uid}`);
    const unlockedIds = unlockedJson ? JSON.parse(unlockedJson) : [];
    return unlockedIds.includes(p.id);
  };

  const unlockParish = (parishId: string) => {
    setParishLoggedIn(true);
    if (!user) return;
    const unlockedJson = localStorage.getItem(`unlocked_parishes_${user.uid}`);
    const unlockedIds = unlockedJson ? JSON.parse(unlockedJson) : [];
    if (!unlockedIds.includes(parishId)) {
      const newUnlocked = [...unlockedIds, parishId];
      localStorage.setItem(`unlocked_parishes_${user.uid}`, JSON.stringify(newUnlocked));
    }
  };

  useEffect(() => {
    if (!currentParish) return;
    
    // Listen to readers
    const readersQ = query(collection(db, 'readers'), where('parishId', '==', currentParish.id));
    const unsubReaders = onSnapshot(readersQ, (snapshot) => {
      const r: Reader[] = [];
      snapshot.forEach(d => r.push({ ...d.data() as Reader, id: d.id }));
      setActiveReaders(r);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'readers');
    });

    // Listen to masses
    const massesQ = query(collection(db, 'masses'), where('parishId', '==', currentParish.id), orderBy('date', 'desc'));
    const unsubMasses = onSnapshot(massesQ, (snapshot) => {
      console.log("Masses updated in onSnapshot:", snapshot.size);
      const m: Mass[] = [];
      snapshot.forEach(d => m.push({ ...d.data() as Mass, id: d.id }));
      setActiveMasses(m);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'masses');
    });

    // Listen to meetings
    const meetingsQ = query(collection(db, 'meetings'), where('parishId', '==', currentParish.id), orderBy('date', 'asc'));
    const unsubMeetings = onSnapshot(meetingsQ, (snapshot) => {
      setActiveMeetings(snapshot.docs.map(d => ({ ...d.data() as Meeting, id: d.id })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'meetings');
    });

    // Listen to attendance
    const attQ = query(collection(db, 'attendance'), where('parishId', '==', currentParish.id));
    const unsubAttendance = onSnapshot(attQ, (snapshot) => {
      setActiveAttendance(snapshot.docs.map(d => ({ ...d.data() as Attendance, id: d.id })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    });
    
    // Listen to plannings
    const planningsQ = query(collection(db, 'plannings'), where('parishId', '==', currentParish.id));
    const unsubPlannings = onSnapshot(planningsQ, (snapshot) => {
      const p: Record<string, Planning> = {};
      snapshot.forEach(d => {
        const data = d.data() as Planning;
        p[data.massId] = { ...data, id: d.id };
      });
      setActivePlannings(p);
    });

    // Listen to feedbacks
    const feedbacksQ = query(collection(db, 'feedbacks'), where('parishId', '==', currentParish.id));
    const unsubFeedbacks = onSnapshot(feedbacksQ, (snapshot) => {
      setActiveFeedbacks(snapshot.docs.map(d => ({ ...d.data() as Feedback, id: d.id })));
    });
    
    return () => {
      unsubReaders();
      unsubMasses();
      unsubMeetings();
      unsubAttendance();
      unsubPlannings();
      unsubFeedbacks();
    };
  }, [currentParish?.id]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== SUPER_ADMIN_EMAIL) {
        toast.info("Connexion réussie mais vous n'avez pas de droits d'administrateur général.");
      }
    } catch (error: any) {
      console.error("Erreur détaillée lors de la connexion:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("La fenêtre de connexion a été bloquée. Veuillez autoriser les popups.");
      } else {
        alert("Impossible de se connecter : " + (error.message || "Erreur inconnue"));
      }
    }
  };

  useEffect(() => {
    if (!currentParish) return;
    
    // Check if current user is the creator or has already unlocked this parish in this session
    if (user && (currentParish.adminId === user.uid || canManage(currentParish))) {
      setParishLoggedIn(true);
    }
    setLoginPassword('');
  }, [currentParish?.id, user?.uid]);

  const handleLogin = () => {
    if (currentParish) {
      if (!currentParish.password || currentParish.password === loginPassword) {
        unlockParish(currentParish.id);
        setActiveTab('dashboard');
      } else {
        alert("Mot de passe incorrect.");
      }
    }
  };

  const createParish = async () => {
    if (!user || !newParishName || !newParishPassword) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'parishes'), {
        name: newParishName,
        password: newParishPassword,
        address: newParishAddress,
        deanery: newParishDeanery,
        diocese: newParishDiocese,
        adminId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewParishName('');
      setNewParishPassword('');
      setNewParishAddress('');
      setNewParishDeanery('');
      setNewParishDiocese('');
      setIsCreatingParish(false);
      setParishLoggedIn(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'parishes');
    } finally {
      setLoading(false);
    }
  };

  const deleteParish = async (parishId: string) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Clean up all collections for this parish
      const collectionsToClean = ['readers', 'masses', 'plannings', 'attendance', 'meetings', 'feedbacks'];
      
      for (const collName of collectionsToClean) {
        const snap = await getDocs(query(collection(db, collName), where('parishId', '==', parishId)));
        snap.forEach(d => batch.delete(d.ref));
      }

      // Special case for subcollections if any, but parishes/admins is one
      const saSnap = await getDocs(collection(db, 'parishes', parishId, 'admins'));
      saSnap.forEach(d => batch.delete(d.ref));
      
      batch.delete(doc(db, 'parishes', parishId));
      await batch.commit();
      setCurrentParish(null);
      setParishLoggedIn(false);
      setIsDeletingParish(null);
      alert("Paroisse supprimée avec succès.");
    } catch (e) {
      console.error("Deletion error:", e);
      handleFirestoreError(e, OperationType.DELETE, `parishes/${parishId}`);
    } finally {
      setLoading(false);
    }
  };

  const wipeAllData = async () => {
    console.log("Wiping all data...");
    setLoading(true);
    try {
      const colls = ['attendance', 'plannings', 'masses', 'readers', 'parishes', 'global_admins'];
      for (const coll of colls) {
        const snap = await getDocs(collection(db, coll));
        if (snap.empty) continue;
        const chunks = [];
        for (let i = 0; i < snap.docs.length; i += 450) {
          chunks.push(snap.docs.slice(i, i + 450));
        }
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
      setCurrentParish(null);
      setParishLoggedIn(false);
      setIsWipingAll(false);
      toast.success("Application réinitialisée avec succès.");
    } catch (e) {
      console.error("Wipe error:", e);
    } finally {
      setLoading(false);
    }
  };

  const [selectedPublicParishId, setSelectedPublicParishId] = useState<string | null>(null);
  const selectedPublicParish = useMemo(() => {
    if (!selectedPublicParishId) return null;
    return parishes.find(p => p.id === selectedPublicParishId) || null;
  }, [parishes, selectedPublicParishId]);

  const setSelectedPublicParish = (p: Parish | null) => {
    setSelectedPublicParishId(p ? p.id : null);
  };

  const ParishPasswordModal = ({ parish }: { parish: Parish }) => {
    const handleRequestReset = async () => {
      if (!requestContact) {
        toast.error("Veuillez saisir un moyen de contact (Email ou Téléphone)");
        return;
      }
      setLoading(true);
      try {
        await addDoc(collection(db, 'password_requests'), {
          parishId: parish.id,
          parishName: parish.name,
          adminId: parish.adminId, // Add adminId to simplify security rules
          contact: requestContact,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        toast.success("Demande enregistrée ! L'administrateur de la paroisse vous contactera.");
        setIsForgotParishPassword(false);
        setRequestContact('');
      } catch (e) {
        console.error("Request error:", e);
        toast.error("Erreur réseau. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-6">
        <Card className="max-w-md w-full space-y-8 p-10 text-center border-2 border-slate-800 shadow-2xl relative animate-in fade-in zoom-in duration-300">
          <button 
            onClick={() => {
              setIsParishPasswordLock(null);
              setIsForgotParishPassword(false);
            }} 
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          {!isForgotParishPassword ? (
            <>
              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto text-accent shadow-xl shadow-accent/20">
                <Lock size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">{parish.name}</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Accès Administrateur Paroissial</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] ml-1">Mot de passe Paroisse</label>
                  <input 
                    type="password" 
                    autoFocus
                    value={typedPassword} 
                    onChange={(e) => setTypedPassword(e.target.value)} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (parish.password === typedPassword) {
                          setCurrentParish(parish);
                          setParishLoggedIn(true);
                          setView('admin');
                          setIsParishPasswordLock(null);
                          setSelectedPublicParish(null);
                          setTypedPassword('');
                          toast.success(`Bienvenue dans l'espace admin de ${parish.name}`);
                        } else {
                          toast.error("Mot de passe incorrect");
                        }
                      }
                    }}
                    placeholder="Saisissez le mot de passe..." 
                    className="w-full p-5 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent transition-all text-center font-bold" 
                  />
                </div>
                <Button 
                   className="w-full py-5 rounded-2xl font-black uppercase tracking-widest" 
                   variant="accent" 
                   onClick={() => {
                      if (parish.password === typedPassword) {
                        setCurrentParish(parish);
                        setParishLoggedIn(true);
                        setView('admin');
                        setIsParishPasswordLock(null);
                        setSelectedPublicParish(null);
                        setTypedPassword('');
                        toast.success(`Bienvenue dans l'espace admin de ${parish.name}`);
                      } else {
                        toast.error("Mot de passe incorrect");
                      }
                   }}
                >
                  Gérer la Paroisse
                </Button>

                {user && user.uid === parish.adminId && (
                  <Button 
                    variant="secondary" 
                    className="w-full py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest border border-slate-800"
                    onClick={() => {
                      setCurrentParish(parish);
                      setParishLoggedIn(true);
                      setView('admin');
                      setIsParishPasswordLock(null);
                      setSelectedPublicParish(null);
                      toast.success("Accès autorisé via votre compte administrateur.");
                    }}
                  >
                    Déverrouiller avec mon compte
                  </Button>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-[10px] text-slate-600 font-medium italic leading-relaxed">
                    Besoin du code ? Demandez-le à votre bureau paroissial.
                  </p>
                  <button 
                    onClick={() => setIsForgotParishPassword(true)}
                    className="text-accent text-[11px] font-bold uppercase tracking-widest hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto text-accent shadow-xl shadow-accent/10">
                <Bell size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Récupération</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Signaler à l'administrateur</p>
              </div>
              <div className="space-y-6 text-left">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-[10px] leading-relaxed text-center font-medium italic">
                    Note: L'envoi automatique de mail n'est pas activé. Votre demande sera affichée sur le tableau de bord de l'administrateur système.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] ml-1">Votre Contact (Email ou Tél)</label>
                  <input 
                    type="text" 
                    autoFocus
                    value={requestContact}
                    onChange={(e) => setRequestContact(e.target.value)} 
                    placeholder="ex: +243 81... ou email@mail.com" 
                    className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent transition-all text-sm font-medium" 
                  />
                </div>
                <Button 
                   className="w-full py-4 rounded-2xl font-black uppercase tracking-widest" 
                   variant="accent" 
                   disabled={loading}
                   onClick={handleRequestReset}
                >
                  {loading ? 'Envoi...' : 'Envoyer la demande'}
                </Button>
                <button 
                  onClick={() => setIsForgotParishPassword(false)}
                  className="w-full text-slate-400 hover:text-white text-xs transition-colors"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  };

  // --- RENDER ---
  const renderContent = () => {
    if (loading) {
      return (
        <div className="h-screen flex items-center justify-center bg-background">
          <Logo className="w-16 h-16 animate-pulse" showText={false} />
        </div>
      );
    }

    if (selectedPublicParish) {
      return (
        <>
          {isParishPasswordLock && <ParishPasswordModal parish={isParishPasswordLock} />}
          <PublicParishConsultation 
            parish={selectedPublicParish} 
            onBack={() => setSelectedPublicParish(null)} 
            onAdminRequest={(p) => {
              if (isSuperAdmin) {
                setCurrentParish(p);
                setParishLoggedIn(true);
                setView('admin');
                setSelectedPublicParish(null);
              } else {
                setIsParishPasswordLock(p);
              }
            }}
            onEstechClick={() => setView('estech')}
          />
        </>
      );
    }

    if (view === 'estech') {
      return (
        <div className="bg-background min-h-screen relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <nav className="max-w-6xl mx-auto p-8 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
              <Logo className="w-10 h-10" />
            </div>
            <button onClick={() => setView('landing')} className="text-slate-500 hover:text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors">
              <ArrowLeft size={16} />
              Quitter
            </button>
          </nav>
          <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
            <EstechView />
          </div>
        </div>
      );
    }

    if (view === 'landing') {
      return (
        <LandingView 
          parishes={parishes} 
          onAdminClick={() => setView('auth')} 
          onSelectParish={(p) => setSelectedPublicParish(p)} 
          onEstechClick={() => setView('estech')}
        />
      );
    }

    if (view === 'auth' && !user) {
      return (
        <AuthView 
          onLogin={login} 
          onRegisterParish={() => {
            login();
            setIsCreatingParish(true);
          }} 
          onBack={() => setView('landing')}
          onResetPassword={handleResetPassword}
        />
      );
    }

    if (isCreatingParish && user) {
      return (
        <div className="h-screen flex flex-col items-center justify-center p-8 bg-background text-center relative overflow-hidden">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[100px] rounded-full" />
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-card p-10 rounded-[48px] shadow-2xl border border-slate-800 space-y-8 max-w-md w-full relative z-10 overflow-y-auto max-h-[90vh]"
           >
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-accent shrink-0">
              <Logo className="w-12 h-12" showText={false} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white leading-tight italic uppercase tracking-tighter">Configuration</h2>
              <p className="text-slate-500 text-sm leading-relaxed px-4">Remplissez les informations de votre paroisse pour commencer.</p>
            </div>
            <div className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nom de la Paroisse *</label>
                <input type="text" value={newParishName} onChange={(e) => setNewParishName(e.target.value.replace(/[0-9]/g, ''))} placeholder="ex: Notre-Dame" className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mot de passe d'administration *</label>
                <input type="password" value={newParishPassword} onChange={(e) => setNewParishPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Adresse</label>
                <input type="text" value={newParishAddress} onChange={(e) => setNewParishAddress(e.target.value)} placeholder="12 rue de l'Eglise..." className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Doyenné</label>
                  <input type="text" value={newParishDeanery} onChange={(e) => setNewParishDeanery(e.target.value.replace(/[0-9]/g, ''))} className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent transition-colors text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Diocèse</label>
                  <input type="text" value={newParishDiocese} onChange={(e) => setNewParishDiocese(e.target.value.replace(/[0-9]/g, ''))} className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white outline-none focus:border-accent transition-colors text-sm" />
                </div>
              </div>
              <Button onClick={async () => { await createParish(); setView('admin'); }} variant="accent" className="w-full py-4 rounded-2xl" disabled={!newParishName || !newParishPassword}>
                Créer la paroisse
              </Button>
              <Button variant="secondary" onClick={() => setIsCreatingParish(false)} className="w-full py-4 rounded-2xl">Annuler</Button>
            </div>
          </motion.div>
        </div>
      );
    }

    if (user && !currentParish && (!isSuperAdmin || superAdminParishView)) {
      const myParishes = parishes.filter(p => canManage(p) && (
        !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.diocese && p.diocese.toLowerCase().includes(searchQuery.toLowerCase()))
      ));
      const otherParishes = parishes.filter(p => !canManage(p) && searchQuery && (
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.diocese && p.diocese.toLowerCase().includes(searchQuery.toLowerCase()))
      ));

      return (
        <div className="min-h-screen bg-background p-8 md:p-12 animate-in fade-in duration-700">
          <div className="max-w-5xl mx-auto space-y-12">
            <header className="flex justify-between items-center">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('landing')}>
                <Logo className="w-12 h-12" />
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-1 space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl font-black text-white tracking-tight leading-none italic uppercase">Bienvenue</h2>
                  <p className="text-slate-500 text-sm">Gérez vos paroisses ou rejoignez-en une via son mot de passe administrateur.</p>
                </div>

                <Card className="p-8 space-y-6 bg-accent/5 border-accent/20">
                  <div className="w-14 h-14 bg-accent/10 rounded-[20px] flex items-center justify-center text-accent">
                    <Plus size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase italic">Nouvelle Paroisse</h3>
                    <p className="text-slate-500 text-xs mt-1">Créez un nouvel espace pour votre communauté.</p>
                  </div>
                  <Button variant="accent" onClick={() => setIsCreatingParish(true)} className="w-full py-4 rounded-xl font-bold">
                    ENREGISTRER
                  </Button>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em]">Mes Paroisses Accréditées</h3>
                  </div>
                  {myParishes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myParishes.map(p => (
                        <Card 
                          key={p.id} 
                          onClick={() => { setCurrentParish(p); setActiveTab('dashboard'); setView('admin'); }}
                          className="p-6 cursor-pointer border-slate-800 hover:border-accent/40 group transition-all"
                        >
                          <div className="flex justify-between items-center">
                             <div className="space-y-1">
                               <h4 className="font-bold text-white group-hover:text-accent transition-colors">{p.name}</h4>
                               <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{p.diocese || 'Local'}</p>
                             </div>
                             <div className="flex items-center gap-2">
                               <button 
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   setCurrentParish(p); 
                                   setActiveTab('settings'); 
                                   setView('admin'); 
                                 }}
                                 className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-accent transition-colors"
                               >
                                 <Settings size={16} />
                               </button>
                               <ChevronRight size={18} className="text-slate-700 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                             </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-12 border-dashed border-slate-800 bg-transparent flex flex-col items-center justify-center text-center space-y-4">
                      <Church size={48} className="text-slate-800" />
                      <div className="space-y-1">
                        <p className="text-slate-500 font-medium">Vous ne gérez aucune paroisse pour le moment.</p>
                        <p className="text-slate-700 text-xs italic">Créez votre première paroisse pour commencer.</p>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="space-y-6 border-t border-slate-900 pt-12">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em]">Rechercher une paroisse globale</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Chercher par nom..."
                        className="bg-slate-900 border border-slate-800 rounded-full py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-accent w-48"
                      />
                    </div>
                  </div>

                  {searchQuery && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                      {otherParishes.map(p => (
                        <Card 
                          key={p.id} 
                          onClick={() => { setCurrentParish(p); setActiveTab('dashboard'); setView('admin'); }}
                          className="p-6 cursor-pointer border-slate-800/40 hover:border-slate-600 group transition-all"
                        >
                          <div className="flex justify-between items-center">
                             <div className="space-y-1">
                               <h4 className="font-bold text-slate-300 group-hover:text-white transition-colors">{p.name}</h4>
                               <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">{p.diocese || 'Secteur'}</p>
                             </div>
                             <div className="flex items-center gap-2 text-[8px] font-black text-slate-700 uppercase tracking-widest group-hover:text-accent transition-colors">
                               S'authentifier
                               <Lock size={10} />
                             </div>
                          </div>
                        </Card>
                      ))}
                      {otherParishes.length === 0 && (
                        <p className="text-slate-700 italic text-sm py-4 col-span-full text-center">Aucun résultat trouvé dans l'annuaire global.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentParish && !parishLoggedIn && !isSuperAdmin) {
       return (
         <div className="h-screen flex items-center justify-center bg-background p-8">
            <Card className="max-w-sm w-full space-y-8 p-10 text-center border-2 border-slate-800 shadow-2xl">
              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto text-accent"><Church size={40} /></div>
              <div>
                 <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{currentParish.name}</h2>
                 <p className="text-slate-500 text-sm mt-2 font-medium">Mot de passe de la paroisse requis.</p>
              </div>
              <div className="space-y-4">
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="Mot de passe" className="w-full p-4 bg-background border border-slate-800 rounded-2xl text-white text-center outline-none focus:border-accent transition-colors" />
                <Button className="w-full py-4 rounded-2xl" variant="accent" onClick={handleLogin}>Confirmer</Button>
                <button onClick={() => setCurrentParish(null)} className="text-slate-500 text-xs font-bold uppercase">Retour</button>
              </div>
            </Card>
         </div>
       );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-primary border-r border-slate-800 flex flex-col transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-8 flex items-center justify-between">
            <Logo className="w-12 h-12" />
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-white">
               <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => {
                    setCurrentParish(null);
                    setSuperAdminParishView(false);
                    setView('landing');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${!currentParish && !superAdminParishView ? 'bg-accent/10 text-accent font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <BarChart3 size={20} />
                  Dashboard Global
                </button>
              </>
            )}

            <div className="py-4">
              <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Gestion</p>
              <nav className="space-y-1">
                {[
                  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
                  { id: 'readers', label: 'Lecteurs', icon: Users },
                  { id: 'masses', label: 'Messes', icon: Church },
                  { id: 'planning', label: 'Plannings', icon: CalendarDays },
                  { id: 'attendance', label: 'Présences', icon: CheckSquare },
                  { id: 'training', label: 'Formation', icon: BookOpen },
                  { id: 'meetings', label: 'Réunions', icon: CalendarRange },
                  { id: 'feedback', label: 'Retours', icon: MessageSquare },
                  { id: 'reports', label: 'Rapports', icon: FileDown },
                  { id: 'settings', label: 'Paramètres', icon: Settings }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (currentParish && (isSuperAdmin || canManage(currentParish))) {
                        setParishLoggedIn(true);
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-accent text-midnight font-bold shadow-lg shadow-accent/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2">
             <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-bold"
             >
               <LogIn size={20} className="rotate-180" />
               Déconnexion
             </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-72 min-h-screen relative">
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden text-slate-400 hover:text-white"
                >
                  <Menu size={24} />
                </button>
                <div>
                   <h2 className="text-white font-bold text-lg tracking-tight italic uppercase">
                     {activeTab === 'dashboard' ? 'Tableau de bord' : 
                      activeTab === 'readers' ? 'Lecteurs' : 
                      activeTab === 'masses' ? 'Messes' : 
                      activeTab === 'planning' ? 'Plannings' : 
                      activeTab === 'attendance' ? 'Présences' : 
                      activeTab === 'meetings' ? 'Réunions' :
                      activeTab === 'feedback' ? 'Retours' :
                      activeTab === 'reports' ? 'Rapports' :
                      'Paramètres'}
                   </h2>
                   <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                     {currentParish?.name || 'Vue Globale'}
                   </p>
                </div>
             </div>

             <div className="flex items-center gap-3">
                {isSuperAdmin && pendingRequestsCount > 0 && (
                   <button 
                    onClick={() => { setActiveTab('settings'); setSuperAdminParishView(false); }}
                    className="relative p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                   >
                     <Bell size={20} fill="currentColor" />
                     <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                       {pendingRequestsCount}
                     </span>
                   </button>
                )}
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl py-1.5 pl-1.5 pr-3">
                   <div className="w-8 h-8 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                      <UserCircle size={20} />
                   </div>
                   <div className="text-left hidden sm:block">
                      <p className="text-[10px] text-white font-bold leading-none">
                        {user?.displayName || (user?.email ? user.email.split('@')[0] : 'Admin')}
                      </p>
                      <p className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter mt-0.5">{isSuperAdmin ? 'Super Admin' : 'Paroisse'}</p>
                   </div>
                </div>
             </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (currentParish?.id || 'global')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 md:p-10"
            >
              {!currentParish && isSuperAdmin && !superAdminParishView ? <SuperAdminView parishes={parishes} onDeleteParish={deleteParish} onEnterParish={(p) => { setCurrentParish(p); setParishLoggedIn(true); setSuperAdminParishView(true); setActiveTab('dashboard'); }} /> : (
                <div className="space-y-8">
                  {activeTab === 'dashboard' && currentParish && (
                    <DashboardView readers={activeReaders} upcomingMasses={activeMasses.slice(0, 5)} upcomingMeetings={activeMeetings.slice(0, 5)} attendanceRecords={activeAttendance} onNavigate={setActiveTab} />
                  )}
                  {activeTab === 'masses' && currentParish && (
                    <MassesView masses={activeMasses} parishId={currentParish.id} onRefresh={() => {}} user={user} />
                  )}
                  {activeTab === 'readers' && currentParish && (
                    <ReadersView 
                      readers={activeReaders} 
                      parishId={currentParish.id} 
                      onRefresh={() => {}} 
                      attendance={activeAttendance}
                      plannings={activePlannings}
                      masses={activeMasses}
                      feedbacks={activeFeedbacks}
                    />
                  )}
                  {activeTab === 'attendance' && currentParish && (
                    <PresenceView masses={activeMasses} readers={activeReaders} parishId={currentParish.id} />
                  )}
                  {activeTab === 'planning' && currentParish && (
                    <PlanningView masses={activeMasses} readers={activeReaders} meetings={activeMeetings} parishId={currentParish.id} />
                  )}
                  {activeTab === 'meetings' && currentParish && (
                    <MeetingView parishId={currentParish.id} />
                  )}
                  {activeTab === 'feedback' && currentParish && (
                    <FeedbackView readers={activeReaders} masses={activeMasses} parishId={currentParish.id} />
                  )}
                  {activeTab === 'training' && currentParish && (
                    <TrainingView readers={activeReaders} />
                  )}
                  {activeTab === 'stats' && currentParish && (
                    <ReaderStatsView readers={activeReaders} masses={activeMasses} parishId={currentParish.id} />
                  )}
                  {activeTab === 'reports' && currentParish && (
                    <ReportsView 
                      readers={activeReaders} 
                      masses={activeMasses} 
                      attendance={activeAttendance} 
                      plannings={activePlannings} 
                      feedbacks={activeFeedbacks} 
                      parishName={currentParish.name} 
                    />
                  )}
                  {activeTab === 'settings' && currentParish && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">Paramètres</h2>
                        <p className="text-slate-500 font-medium tracking-tight">Gérez la sécurité et les informations de votre paroisse.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-8">
                          {/* Parish Information Management */}
                          <Card className="flex flex-col gap-6 p-8 border-slate-800/40 bg-slate-900/30">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                                <Church size={24} />
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-lg italic">Profil Paroisse</h3>
                                <p className="text-slate-500 text-xs">Identité de votre communauté.</p>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Nom de la Paroisse</label>
                                  <input 
                                    type="text"
                                    value={parishNameUpdate || (currentParish?.name || '')}
                                    onChange={(e) => setParishNameUpdate(e.target.value)}
                                    placeholder="Nom..."
                                    className="w-full bg-background border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-all text-sm"
                                  />
                               </div>

                               <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Ville / Localité</label>
                                  <input 
                                    type="text"
                                    value={parishCityUpdate || (currentParish?.city || '')}
                                    onChange={(e) => setParishCityUpdate(e.target.value)}
                                    placeholder="Ville..."
                                    className="w-full bg-background border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-all text-sm"
                                  />
                               </div>

                               <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Diocèse</label>
                                    <input 
                                      type="text"
                                      value={parishDioceseUpdate || (currentParish?.diocese || '')}
                                      onChange={(e) => setParishDioceseUpdate(e.target.value)}
                                      placeholder="Ex: Paris..."
                                      className="w-full bg-background border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-all text-sm"
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Doyenné</label>
                                    <input 
                                      type="text"
                                      value={parishDeaneryUpdate || (currentParish?.deanery || '')}
                                      onChange={(e) => setParishDeaneryUpdate(e.target.value)}
                                      placeholder="Ex: Centre..."
                                      className="w-full bg-background border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-all text-sm"
                                    />
                                 </div>
                               </div>

                               <Button 
                                 onClick={updateParishInfo}
                                 variant="accent" 
                                 disabled={(!parishNameUpdate && !parishCityUpdate && !parishDioceseUpdate && !parishDeaneryUpdate) || actionLoading}
                                 className="w-full py-4 rounded-xl font-black italic uppercase text-[10px] tracking-widest"
                               >
                                 {actionLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : "Mettre à jour le profil"}
                               </Button>
                            </div>
                          </Card>

                          {/* Password Management */}
                          <Card className="flex flex-col gap-6 p-8 border-slate-800/40 bg-slate-900/30">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                                <Lock size={24} />
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-lg italic">Code d'Accès Paroisse</h3>
                                <p className="text-slate-500 text-xs">Le code requis pour gérer cette paroisse.</p>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                               <div className="p-4 bg-background/50 rounded-2xl border border-slate-800 space-y-1 relative group">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Code Actuel</p>
                                  <p className="text-white font-mono text-xl tracking-[0.2em] font-black">{currentParish.password}</p>
                                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Lock size={14} className="text-slate-700" />
                                  </div>
                               </div>

                               <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Nouveau code paroisse</label>
                                  <form 
                                    onSubmit={(e) => { e.preventDefault(); updateParishPassword(); }}
                                    className="flex gap-2"
                                  >
                                    <input 
                                      type="text"
                                      value={passwordUpdateValue}
                                      onChange={(e) => setPasswordUpdateValue(e.target.value)}
                                      placeholder="Nouveau code d'accès..."
                                      className="flex-1 bg-background border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-all text-sm"
                                    />
                                    <Button 
                                      type="submit"
                                      variant="accent" 
                                      disabled={!passwordUpdateValue || actionLoading}
                                      className="aspect-square p-0 w-12 flex justify-center items-center rounded-xl disabled:opacity-50"
                                    >
                                      {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                    </Button>
                                  </form>
                                  <p className="text-[9px] text-slate-600 italic px-1 leading-relaxed">
                                    Ce code est partagé avec toute personne devant administrer cette paroisse.
                                  </p>
                               </div>
                            </div>
                          </Card>

                          {/* Password Requests */}
                          <Card className="flex flex-col gap-4 p-8 border-slate-800/40 bg-slate-900/30">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                                <Bell size={24} />
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-lg italic">Demandes de code</h3>
                                <p className="text-slate-500 text-xs text-wrap">Personnes ayant oublié le mot de passe.</p>
                              </div>
                            </div>

                            <div className="space-y-3 mt-2">
                              {passwordRequests.length === 0 ? (
                                <div className="bg-slate-900/50 p-6 rounded-2xl text-center border-dashed border border-slate-800">
                                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest leading-loose">Aucune demande en attente</p>
                                </div>
                              ) : (
                                passwordRequests.map(req => (
                                  <div key={req.id} className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-right-4">
                                    <div className="space-y-1">
                                      <p className="text-white font-bold text-sm tracking-tight">{req.contact}</p>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                                        {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'À l\'instant'}
                                      </p>
                                    </div>
                                    <button onClick={() => deletePasswordRequest(req.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </Card>
                        </div>

                        <div className="space-y-8">
                          {/* Account Management */}
                          <Card className="flex flex-col gap-6 p-8 border-slate-800/40 bg-slate-900/30">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                                <UserCircle size={24} />
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-lg italic">
                                  {user ? 'Sécurité du Compte Personnel' : 'Identification Session'}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">
                                    {user ? user.email : currentParish?.name}
                                  </p>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${user?.email === SUPER_ADMIN_EMAIL ? 'bg-accent/20 text-accent' : (parishLoggedIn ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500')}`}>
                                    {user?.email === SUPER_ADMIN_EMAIL ? 'Super-Admin' : (parishLoggedIn ? 'Espace Paroisse' : 'Utilisateur')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {user ? (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Nouveau mot de passe personnel</label>
                                   <form onSubmit={(e) => { e.preventDefault(); updateAccountPassword(); }} className="flex gap-2">
                                     <input 
                                       type="password"
                                       value={newAccountPassword}
                                       onChange={(e) => setNewAccountPassword(e.target.value)}
                                       placeholder={isGoogleUserAccount ? "Indisponible via Google" : "6 caractères min..."}
                                       disabled={actionLoading}
                                       className="flex-1 bg-background border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                     />
                                     <Button 
                                       type="submit"
                                       variant="accent"
                                       disabled={!newAccountPassword || actionLoading}
                                       className="aspect-square p-0 w-12 flex justify-center items-center rounded-xl disabled:opacity-30"
                                     >
                                       {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                     </Button>
                                   </form>
                                   {isGoogleUserAccount ? (
                                     <div className="mt-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-2">
                                       <p className="text-[10px] text-amber-500/80 font-medium italic leading-relaxed">
                                         Votre compte est authentifié via <span className="font-bold">Google</span>.
                                       </p>
                                     </div>
                                   ) : (
                                     <p className="text-[9px] text-slate-600 italic px-1">
                                       Ceci modifie votre accès personnel lié à l'e-mail.
                                     </p>
                                   )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-3">
                                <p className="text-xs text-blue-400 font-medium italic text-center">
                                  Identifié via le code d'accès de la paroisse <span className="font-bold underline">{currentParish?.name}</span>.
                                </p>
                                <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold">
                                  Aucun compte e-mail personnel lié
                                </p>
                              </div>
                            )}
                          </Card>

                          <Card className="flex flex-col gap-4 p-8 border-slate-800/40 bg-slate-900/30">
                            <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-400">
                              <Plus size={24} />
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-lg italic">Multi-Paroisses</h3>
                              <p className="text-slate-500 text-sm mt-1">Gérez une autre communauté avec le même compte.</p>
                            </div>
                            <Button variant="secondary" onClick={() => setIsCreatingParish(true)} className="mt-2 py-4 rounded-xl">
                              <Plus size={18} />
                              Ajouter une paroisse
                            </Button>
                          </Card>

                          <Card className="flex flex-col gap-4 p-8 border-red-500/20 bg-red-500/5">
                            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                              <Trash2 size={24} />
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-lg text-red-400">Zone de Danger</h3>
                              <p className="text-slate-500 text-sm mt-1">Actions irréversibles sur votre paroisse.</p>
                            </div>
                            <div className="flex flex-col gap-3 mt-2">
                               {currentParish && (currentParish.adminId === user?.uid || user?.email === 'mamelkmanama@gmail.com') ? (
                                <div>
                                  {isDeletingParish === currentParish.id ? (
                                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl space-y-3">
                                      <p className="text-xs text-red-400 font-bold leading-tight">Voulez-vous vraiment supprimer "{currentParish.name}" ?</p>
                                      <div className="flex gap-2">
                                        <Button variant="accent" className="flex-1 py-2 text-xs bg-red-500 hover:bg-red-600 border-none" onClick={() => deleteParish(currentParish.id)}>Confirmer</Button>
                                        <Button variant="secondary" className="flex-1 py-2 text-xs" onClick={() => setIsDeletingParish(null)}>Annuler</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button variant="ghost" onClick={() => setIsDeletingParish(currentParish.id)} className="text-red-400 border border-red-500/20 hover:bg-red-500/10 w-full justify-start py-4 rounded-xl">
                                      Supprimer la paroisse
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-600 bg-slate-900/50 p-4 rounded-xl italic leading-relaxed">
                                  Seul le créateur de cette paroisse peut la supprimer définitivement.
                                </p>
                              )}
                            </div>
                          </Card>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  };

  // Security guard for admin view
  if (view === 'admin' && !user && !parishLoggedIn) {
     setView('landing');
     return null;
  }

  return (
    <>
      <Toaster position="top-center" richColors expand={true} />
      <ParishContext.Provider value={{ currentParish, setCurrentParish, parishes }}>
        {renderContent()}
      </ParishContext.Provider>
    </>
  );
}
