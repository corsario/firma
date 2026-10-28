import Dexie, { Table } from 'dexie';
import { Member, CellEvent, FinancialRecord, AppSettings } from '../types';

export class CellDatabase extends Dexie {
  members!: Table<Member, string>;
  events!: Table<CellEvent, string>;
  finances!: Table<FinancialRecord, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('LaVerdadDeCristoDB');

    this.version(3).stores({
      members: 'id, fullName, canLead, canPreach, isActive, createdAt',
      events: 'id, date, type, status, leaderId, preacherId, generationKey',
      finances: 'id, date, scope, type, category, memberId',
      settings: 'id'
    });
  }
}

export const db = new CellDatabase();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'cell_settings',
  entityType: 'iglesia',
  churchName: 'LEHV-La catedral del Avivamiento',
  churchLocation: 'Templo Central, Calle Principal',
  cellName: 'La verdad de Cristo',
  territory: 'Territorio #9',
  cellLocation: 'Casa habitual',
  cellDay: 3,
  cellTime: '18:00',
  updatedAt: new Date().toISOString()
};