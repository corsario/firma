export type EventType =
  | 'Servicio de célula'
  | 'Ayuno'
  | 'Curso de bautismo'
  | 'Escuela Dominical'
  | 'Cena del Señor'
  | 'Otro';

export type EventStatus = 'Programado' | 'Realizado' | 'Cancelado';
export type TransactionType = 'ingreso' | 'egreso';

export interface Member {
  id: string;
  fullName: string;
  phone?: string;
  canLeadCell?: boolean;
  canPreachCell?: boolean;
  canLeadChurch?: boolean;
  canPreachChurch?: boolean;
  canLead?: boolean;
  canPreach?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CellEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  startTime: string;
  location?: string;
  leaderId: string | null;
  preacherId: string | null;
  breadPrayerMemberId?: string | null;
  winePrayerMemberId?: string | null;
  helper1Id?: string | null;
  helper2Id?: string | null;
  helper3Id?: string | null;
  status: EventStatus;
  generationKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialRecord {
  id: string;
  scope: 'celula' | 'iglesia';
  type: TransactionType;
  date: string;
  amount: number;
  category: string;
  memberId?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  entityType: 'iglesia' | 'celula';
  churchName: string;
  churchLocation: string;
  cellName: string;
  territory: string;
  cellLocation: string;
  cellDay: number;
  cellTime: string;
  updatedAt: string;
}