export type TrainingStatus = 'none' | 'in_progress' | 'completed';
export type AttendanceStatus = 'present' | 'late' | 'absent';
export type AttendanceType = 'mass' | 'meeting';

export interface Parish {
  id: string;
  name: string;
  city?: string;
  adminId: string;
  password?: string;
  address?: string;
  deanery?: string;
  diocese?: string;
}

export interface TrainingModule {
  id: string;
  parishId: string;
  name: string;
  description: string;
}

export interface Reader {
  id: string;
  parishId: string;
  name: string; // Used as display name (often Nom + Postnom + Prenom)
  postnom: string;
  prenom: string;
  birthDay?: number;
  birthMonth?: number;
  address?: string;
  phone?: string;
  email?: string;
  photoURL?: string;
  trainingStatus: TrainingStatus;
  completedModules: string[];
  isActive: boolean;
  roles?: string[]; // Allowed roles for this reader
}

export interface Mass {
  id: string;
  parishId: string;
  date: string; // ISO String
  title: string;
  maxReaders: number;
  fileData?: string;
  fileName?: string;
  fileType?: string;
  commentatorFileData?: string;
  commentatorFileName?: string;
  commentatorFileType?: string;
  reading1Passage?: string;
  psalmPassage?: string;
  reading2Passage?: string;
  gospelPassage?: string;
  intentionsFileData?: string;
  intentionsFileName?: string;
  intentionsFileType?: string;
}

export interface Attendance {
  id: string;
  parishId: string;
  massId: string;
  readerId: string;
  type: AttendanceType;
  status: AttendanceStatus;
  arrivalTime?: string; // ISO String
}

export interface ReaderAssignment {
  readerId: string;
  role: 'commentator' | 'reading1' | 'reading2' | 'universal_prayer';
}

export interface Planning {
  id: string;
  parishId: string;
  massId: string;
  assignments: ReaderAssignment[];
  isFinalized: boolean;
}

export interface Meeting {
  id: string;
  parishId: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
}

export interface Feedback {
  id: string;
  parishId: string;
  massId: string;
  readerId: string;
  comment: string;
  rating: number;
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
