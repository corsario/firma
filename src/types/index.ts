export type EventType =
  | 'Servicio de célula'
  | 'Ayuno'
  | 'Curso de bautismo'
  | 'Escuela Dominical'
  | 'Cena del Señor'
  | 'Reunión de oración'
  | 'Otro';

export type EventStatus = 'Programado' | 'Realizado' | 'Cancelado';
export type EventOrigin = 'Manual' | 'Generado';

export interface Member {
  id: string;
  fullName: string;
  phone?: string;
  address?: string;
  canLead: boolean;
  canPreach: boolean;
  isActive: boolean;
  notes?: string;
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
  topic?: string;
  notes?: string;
  status: EventStatus;
  origin: EventOrigin;
  generationKey?: string;
  originalGeneratedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  cellName: string;
  territory: string;
  defaultLocation: string;
  defaultTime: string;
  updatedAt: string;
}