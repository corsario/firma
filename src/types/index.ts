export type EventType = 'Servicio de célula' | 'Reunión de oración' | 'Visita' | 'Actividad especial' | 'Otro';
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
