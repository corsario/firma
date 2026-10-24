import Dexie, { Table } from 'dexie';
import { Member, CellEvent, AppSettings } from '../types';

export class CellDatabase extends Dexie {
  members!: Table<Member, string>;
  events!: Table<CellEvent, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('LaVerdadDeCristoDB');
    this.version(1).stores({
      members: 'id, fullName, canLead, canPreach, isActive, createdAt',
      events: 'id, date, type, status, origin, leaderId, preacherId, generationKey',
      settings: 'id'
    });
  }
}

export const db = new CellDatabase();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'cell_settings',
  cellName: 'La verdad de Cristo',
  territory: 'Territorio #9',
  defaultLocation: 'Casa de paz habitual',
  defaultTime: '18:00',
  updatedAt: new Date().toISOString()
};
