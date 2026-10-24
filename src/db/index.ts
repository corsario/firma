import Dexie, { Table } from 'dexie';
import { Member, CellEvent, AppSettings } from '../types';

export class CellDatabase extends Dexie {
  members!: Table<Member, string>;
  events!: Table<CellEvent, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('LaVerdadDeCristoDB');
    this.version(1).stores({
      members: 'id, fullName, canLeadCell, canPreachCell, canLeadChurch, canPreachChurch, isActive, createdAt',
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
  cellLocation: 'Casa de paz habitual',
  cellTime: '18:00',
  churchName: 'Iglesia La verdad de Cristo',
  churchLocation: 'Templo Central, Calle Principal',
  updatedAt: new Date().toISOString()
};