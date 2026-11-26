import React, { useState, useEffect } from 'react';
import { db, DEFAULT_SETTINGS } from './db';
import { Member, CellEvent, FinancialRecord, AppSettings, TransactionType, EventType } from './types';
import { MONTH_NAMES } from './services/dateUtils';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const S = {
  input: { width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' as const, fontSize: '0.8rem' },
  btnPrimary: { width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '11px', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' },
  modalBg: { position: 'fixed' as const, inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 160 },
  modalCard: { background: '#fff', width: '100%', maxWidth: '410px', maxHeight: '90vh', overflowY: 'auto' as const, borderRadius: '18px', padding: '18px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }
};

export default function App() {
  const [tab, setTab] = useState<'calendario' | 'finanzas' | 'inicio' | 'miembros' | 'ajustes'>('calendario');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CellEvent[]>([]);
  const [finances, setFinances] = useState<FinancialRecord[]>([]);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Buscador de miembros
  const [memberSearch, setMemberSearch] = useState('');

  // Formulario Ajustes
  const [formEntityType, setFormEntityType] = useState<'iglesia' | 'celula'>('iglesia');
  const [formChurchName, setFormChurchName] = useState('LEHV-La catedral del Avivamiento');
  const [formChurchLocation, setFormChurchLocation] = useState('');
  const [formCellName, setFormCellName] = useState('');
  const [formTerritory, setFormTerritory] = useState('');
  const [formCellLocation, setFormCellLocation] = useState('');
  const [formCellDay, setFormCellDay] = useState(3);
  const [formCellTime, setFormCellTime] = useState('18:00');

  // Respaldos
  const [generatedBackupText, setGeneratedBackupText] = useState('');
  const [pastedRestoreText, setPastedRestoreText] = useState('');

  // Modales
  const [showImportMembersModal, setShowImportMembersModal] = useState(false);
  const [importMembersText, setImportMembersText] = useState('');
  const [showClearEventsModal, setShowClearEventsModal] = useState(false);

  // Nueva Actividad
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newActTitle, setNewActTitle] = useState('');
  const [newActType, setNewActType] = useState<EventType>('Actividad especial');
  const [newActDate, setNewActDate] = useState('');
  const [newActTime, setNewActTime] = useState('19:00');
  const [newActLocation, setNewActLocation] = useState('');
  const [newActLeaderId, setNewActLeaderId] = useState('');
  const [newActPreacherId, setNewActPreacherId] = useState('');
  const [newActNotes, setNewActNotes] = useState('');

  // Finanzas
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [finType, setFinType] = useState<TransactionType>('ingreso');
  const [finAmount, setFinAmount] = useState('');
  const [finDate, setFinDate] = useState(new Date().toISOString().substring(0, 10));
  const [finCategory, setFinCategory] = useState('');
  const [finMemberId, setFinMemberId] = useState('');
  const [finNotes, setFinNotes] = useState('');
  const [finFilter, setFinFilter] = useState<'todos' | 'ingreso' | 'egreso'>('todos');

  // Edición miembro
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editLeadRole, setEditLeadRole] = useState(false);
  const [editPreachRole, setEditPreachRole] = useState(false);

  // Edición evento
  const [selectedEvent, setSelectedEvent] = useState<CellEvent | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalLeaderId, setModalLeaderId] = useState<string>('');
  const [modalPreacherId, setModalPreacherId] = useState<string>('');
  const [modalBreadId, setModalBreadId] = useState<string>('');
  const [modalWineId, setModalWineId] = useState<string>('');
  const [modalHelper1Id, setModalHelper1Id] = useState<string>('');
  const [modalHelper2Id, setModalHelper2Id] = useState<string>('');
  const [modalHelper3Id, setModalHelper3Id] = useState<string>('');
  const [modalLocation, setModalLocation] = useState<string>('');
  const [modalTime, setModalTime] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<'Programado' | 'Realizado' | 'Cancelado'>('Programado');

  // Nuevo miembro
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [canLeadRole, setCanLeadRole] = useState(false);
  const [canPreachRole, setCanPreachRole] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      let s = await db.settings.get('cell_settings');
      if (!s) {
        s = DEFAULT_SETTINGS;
        await db.settings.put(DEFAULT_SETTINGS);
      }
      setSettings(s);
      setFormEntityType(s.entityType || 'iglesia');
      setFormChurchName(s.churchName || 'LEHV-La catedral del Avivamiento');
      setFormChurchLocation(s.churchLocation || DEFAULT_SETTINGS.churchLocation);
      setFormCellName(s.cellName || DEFAULT_SETTINGS.cellName);
      setFormTerritory(s.territory || DEFAULT_SETTINGS.territory);
      setFormCellLocation(s.cellLocation || DEFAULT_SETTINGS.cellLocation);
      setFormCellDay(s.cellDay !== undefined ? s.cellDay : 3);
      setFormCellTime(s.cellTime || DEFAULT_SETTINGS.cellTime);

      const m = await db.members.toArray();
      setMembers(m);

      const e = await db.events.orderBy('date').toArray();
      setEvents(e);

      let f: FinancialRecord[] = [];
      try {
        if (db.finances) {
          f = await db.finances.orderBy('date').toArray();
        }
      } catch {}
      setFinances(f);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showMsg = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const isChurch = settings.entityType === 'iglesia';

  const churchIncomeCategories = ['Diezmo', 'Ofrenda de culto general', 'Ofrenda de ayuno', 'Pro-Templo / Construcción', 'Ofrenda recibida de células', 'Donación especial', 'Otro ingreso'];
  const churchExpenseCategories = ['Servicios públicos (Luz/Agua)', 'Mantenimiento del Templo', 'Santa Cena (Pan/Vino/Copitas)', 'Sonido e Instrumentos', 'Ayuda social / Benévola', 'Viáticos / Honorarios', 'Limpieza y aseo', 'Otro egreso'];
  const cellIncomeCategories = ['Ofrenda de reunión de célula', 'Aporte para refrigerio', 'Donación especial', 'Otro ingreso'];
  const cellExpenseCategories = ['Compra de refrigerios', 'Ayuda a hermano de célula', 'Entrega de sobre a la Iglesia', 'Material bíblico / Copias', 'Otro egreso'];

  const currentCategories = isChurch
    ? (finType === 'ingreso' ? churchIncomeCategories : churchExpenseCategories)
    : (finType === 'ingreso' ? cellIncomeCategories : cellExpenseCategories);

  const sortedMembers = [...members].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' })
  );

  const filteredMembers = sortedMembers.filter(m =>
    m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.phone && m.phone.includes(memberSearch))
  );

  const getMemberName = (id: string | null | undefined) => {
    if (!id) return null;
    const m = members.find(x => x.id === id);
    return m ? m.fullName : null;
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const memberCanLead = (m: Member) => isChurch ? (m.canLeadChurch ?? m.canLead ?? false) : (m.canLeadCell ?? m.canLead ?? false);
  const memberCanPreach = (m: Member) => isChurch ? (m.canPreachChurch ?? m.canPreach ?? false) : (m.canPreachCell ?? m.canPreach ?? false);

  const formatFriendlyTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'p. m.' : 'a. m.';
    h = h % 12 || 12;
    return `${h}:${mStr || '00'} ${ampm}`;
  };

  const formatFriendlyDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return `${DAY_NAMES[dt.getDay()]} ${d} de ${MONTH_NAMES[m - 1]}`;
  };

  const formatCurrency = (val: number) => '$' + val.toLocaleString('es-CO');

  const isEventForCurrentScope = (e: CellEvent) => e.scope ? e.scope === settings.entityType : (isChurch ? e.type !== 'Servicio de célula' : e.type === 'Servicio de célula');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      id: 'cell_settings',
      entityType: formEntityType,
      churchName: formChurchName.trim() || 'LEHV-La catedral del Avivamiento',
      churchLocation: formChurchLocation.trim() || 'Templo Central',
      cellName: formCellName.trim() || 'La verdad de Cristo',
      territory: formTerritory.trim() || 'Territorio #9',
      cellLocation: formCellLocation.trim() || 'Casa habitual',
      cellDay: Number(formCellDay),
      cellTime: formCellTime || '18:00',
      updatedAt: new Date().toISOString()
    };
    await db.settings.put(updated);
    setSettings(updated);
    showMsg(`¡Configuración de ${formEntityType === 'iglesia' ? 'la Iglesia' : 'la Célula'} guardada!`);
  };

  // LIMPIEZA DE EVENTOS: MES ESPECÍFICO
  const handleClearMonthEvents = async () => {
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const toDelete = events.filter(e => e.date.startsWith(ym) && isEventForCurrentScope(e));

    if (toDelete.length === 0) {
      showMsg('No hay eventos programados en este mes para borrar.');
      setShowClearEventsModal(false);
      return;
    }

    if (window.confirm(`¿Seguro que deseas eliminar los ${toDelete.length} evento(s) de ${MONTH_NAMES[currentMonth]} ${currentYear} en ${isChurch ? 'la Iglesia' : 'la Célula'}?`)) {
      for (const ev of toDelete) await db.events.delete(ev.id);
      await loadAll();
      setShowClearEventsModal(false);
      showMsg(`✅ Se limpiaron los eventos de ${MONTH_NAMES[currentMonth]} ${currentYear}.`);
    }
  };

  // LIMPIEZA DE EVENTOS: TODOS
  const handleClearAllEvents = async () => {
    const toDelete = events.filter(e => isEventForCurrentScope(e));

    if (toDelete.length === 0) {
      showMsg('No hay eventos registrados para borrar.');
      setShowClearEventsModal(false);
      return;
    }

    if (window.confirm(`⚠️ ATENCIÓN: ¿Seguro que deseas eliminar TODOS los ${toDelete.length} eventos de ${isChurch ? 'la Iglesia' : 'la Célula'}?\n\n(Tus miembros, finanzas y configuración NO se borrarán).`)) {
      for (const ev of toDelete) await db.events.delete(ev.id);
      await loadAll();
      setShowClearEventsModal(false);
      showMsg(`✅ Se eliminaron todos los eventos de ${isChurch ? 'la Iglesia' : 'la Célula'}.`);
    }
  };

  // Importar desde MySQL
  const processImportMembersList = async (items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) {
      showMsg('No se encontraron registros válidos.');
      return;
    }
    const nowIso = new Date().toISOString();
    const existingNames = new Set(members.map(m => m.fullName.trim().toLowerCase()));
    const toInsert: Member[] = [];
    let skipped = 0;

    for (const raw of items) {
      const name = (raw.fullName || raw.nombre || raw.nombres || raw.name || raw.nombre_completo || '').toString().trim();
      if (!name) continue;
      if (existingNames.has(name.toLowerCase())) { skipped++; continue; }

      const phone = (raw.phone || raw.telefono || raw.celular || raw.tel || '').toString().trim() || undefined;
      const isTruthy = (v: any) => v === true || v === 1 || v === '1' || v === 'true' || v === 'si';

      toInsert.push({
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        fullName: name,
        phone,
        canLeadCell: isTruthy(raw.canLeadCell || raw.dirige_celula || raw.dirige),
        canPreachCell: isTruthy(raw.canPreachCell || raw.predica_celula || raw.predica),
        canLeadChurch: isTruthy(raw.canLeadChurch || raw.dirige_iglesia || raw.dirige),
        canPreachChurch: isTruthy(raw.canPreachChurch || raw.predica_iglesia || raw.predica),
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      });
      existingNames.add(name.toLowerCase());
    }

    if (toInsert.length > 0) {
      await db.members.bulkAdd(toInsert);
      await loadAll();
      showMsg(`✅ ¡${toInsert.length} hermanos importados! ${skipped > 0 ? `(${skipped} ya existían)` : ''}`);
      setShowImportMembersModal(false);
      setImportMembersText('');
    } else {
      showMsg('Todos los hermanos ya estaban registrados.');
    }
  };

  const handleImportMembersSubmit = () => {
    try {
      const parsed = JSON.parse(importMembersText.trim());
      processImportMembersList(Array.isArray(parsed) ? parsed : (parsed.members || parsed.data || []));
    } catch {
      showMsg('El texto ingresado no es un JSON válido.');
    }
  };

  const handleImportMembersFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        await processImportMembersList(Array.isArray(parsed) ? parsed : (parsed.members || parsed.data || []));
      } catch {
        showMsg('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Respaldos directos
  const handleGenerateBackupDirect = async () => {
    try {
      const jsonStr = JSON.stringify({ schemaVersion: 4, exportedAt: new Date().toISOString(), settings, members, events, finances }, null, 2);
      setGeneratedBackupText(jsonStr);

      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(jsonStr);
          copied = true;
        }
      } catch {}

      if (!copied) {
        const ta = document.getElementById('directBackupArea') as HTMLTextAreaElement;
        if (ta) { ta.value = jsonStr; ta.focus(); ta.select(); document.execCommand('copy'); copied = true; }
      }
      showMsg(copied ? '✅ ¡Copia generada y copiada al portapapeles!' : '✅ ¡Copia generada en el cuadro inferior!');
    } catch {
      showMsg('Error al generar el respaldo.');
    }
  };

  const handleCopyGeneratedBackup = () => {
    const ta = document.getElementById('directBackupArea') as HTMLTextAreaElement;
    if (ta) { ta.focus(); ta.select(); document.execCommand('copy'); showMsg('¡Texto de respaldo copiado!'); }
  };

  const handleShareBackupWhatsApp = () => {
    if (!generatedBackupText) { showMsg('Primero pulsa "Generar Copia de Respaldo".'); return; }
    const header = `*COPIA DE SEGURIDAD ${isChurch ? settings.churchName.toUpperCase() : settings.cellName.toUpperCase()}*\n`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(header + generatedBackupText)}`, '_blank');
  };

  const handleRestoreFromTextDirect = async () => {
    if (!pastedRestoreText.trim()) { showMsg('Pega el código de respaldo en el cuadro.'); return; }
    try {
      const parsed = JSON.parse(pastedRestoreText.trim());
      if (window.confirm('¿Deseas restaurar esta copia? Reemplazará todos los datos actuales.')) {
        await db.transaction('rw', [db.settings, db.members, db.events, db.finances], async () => {
          if (parsed.settings) { await db.settings.clear(); await db.settings.put(parsed.settings); }
          if (Array.isArray(parsed.members)) { await db.members.clear(); if (parsed.members.length > 0) await db.members.bulkAdd(parsed.members); }
          if (Array.isArray(parsed.events)) { await db.events.clear(); if (parsed.events.length > 0) await db.events.bulkAdd(parsed.events); }
          if (Array.isArray(parsed.finances)) { await db.finances.clear(); if (parsed.finances.length > 0) await db.finances.bulkAdd(parsed.finances); }
        });
        await loadAll();
        setPastedRestoreText('');
        showMsg('✅ ¡Todos los datos se restauraron con éxito!');
      }
    } catch {
      showMsg('Error al leer el código. Asegúrate de pegarlo completo.');
    }
  };

  // Finanzas
  const openNewFinanceModal = () => {
    setFinAmount('');
    setFinDate(new Date().toISOString().substring(0, 10));
    setFinType('ingreso');
    setFinCategory(isChurch ? churchIncomeCategories[0] : cellIncomeCategories[0]);
    setFinMemberId('');
    setFinNotes('');
    setShowFinanceModal(true);
  };

  const handleSaveFinanceRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(finAmount);
    if (isNaN(amountNum) || amountNum <= 0) { showMsg('Ingresa un monto válido.'); return; }
    const nowIso = new Date().toISOString();

    await db.finances.add({
      id: 'fin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      scope: settings.entityType,
      type: finType,
      date: finDate,
      amount: amountNum,
      category: finCategory || (currentCategories[0] || 'Varios'),
      memberId: finMemberId || null,
      notes: finNotes.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    setShowFinanceModal(false);
    await loadAll();
    showMsg(`¡${finType === 'ingreso' ? 'Entrada' : 'Salida'} de ${formatCurrency(amountNum)} guardada!`);
  };

  const handleDeleteFinanceRecord = async (id: string) => {
    if (window.confirm('¿Deseas eliminar este movimiento?')) {
      await db.finances.delete(id);
      await loadAll();
      showMsg('Movimiento eliminado.');
    }
  };

  const handleShareFinanceWhatsApp = () => {
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthFinances = finances.filter(f => f.date.startsWith(ym) && f.scope === settings.entityType);
    if (monthFinances.length === 0) { showMsg('No hay movimientos en este mes.'); return; }

    const totalIngresos = monthFinances.filter(f => f.type === 'ingreso').reduce((a, b) => a + b.amount, 0);
    const totalEgresos = monthFinances.filter(f => f.type === 'egreso').reduce((a, b) => a + b.amount, 0);

    let text = `*${isChurch ? settings.churchName.toUpperCase() : settings.cellName.toUpperCase()}*\n`;
    text += isChurch ? `📍 ${settings.churchLocation}\n` : `${settings.territory} • ${settings.cellLocation}\n`;
    text += `*INFORME FINANCIERO — ${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}*\n\n`;
    text += `📈 *TOTAL INGRESOS:* ${formatCurrency(totalIngresos)}\n`;
    monthFinances.filter(f => f.type === 'ingreso').forEach(f => { text += `  • ${f.category}: ${formatCurrency(f.amount)}\n`; });
    text += `\n📉 *TOTAL EGRESOS:* ${formatCurrency(totalEgresos)}\n`;
    monthFinances.filter(f => f.type === 'egreso').forEach(f => { text += `  • ${f.category}: ${formatCurrency(f.amount)}\n`; });
    text += `\n────────────────\n💰 *SALDO DISPONIBLE:* ${formatCurrency(totalIngresos - totalEgresos)}\n`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // UN SOLO BOTÓN: Generar y Asignar
  const handleGenerateAndAssign = async () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const nowIso = new Date().toISOString();

    const oldB = await db.events.where('type').equals('Curso de bautismo').toArray();
    for (const b of oldB) await db.events.delete(b.id);

    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(currentYear, currentMonth, day, 12, 0, 0);
      const dow = dt.getDay();
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (isChurch) {
        if (dow === 2 || dow === 5) {
          const key = `ayuno_${date}`;
          if (!(await db.events.where('generationKey').equals(key).first())) {
            await db.events.add({
              id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              scope: 'iglesia', title: 'Culto de Ayuno y Oración', type: 'Ayuno', date, startTime: '10:00',
              location: settings.churchLocation || 'Templo Central', leaderId: null, preacherId: null,
              status: 'Programado', generationKey: key, createdAt: nowIso, updatedAt: nowIso
            });
          }
        }
        if (dow === 0) {
          const isLastSun = (day + 7) > daysInMonth;
          const keyDom = isLastSun ? `cena_senor_${date}` : `escuela_dominical_${date}`;
          if (!(await db.events.where('generationKey').equals(keyDom).first())) {
            await db.events.add({
              id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              scope: 'iglesia', title: isLastSun ? 'Cena del Señor' : 'Escuela Dominical',
              type: isLastSun ? 'Cena del Señor' : 'Escuela Dominical', date, startTime: '10:00',
              location: settings.churchLocation || 'Templo Central', leaderId: null, preacherId: null,
              breadPrayerMemberId: null, winePrayerMemberId: null, helper1Id: null, helper2Id: null, helper3Id: null,
              status: 'Programado', generationKey: keyDom, createdAt: nowIso, updatedAt: nowIso
            });
          }
        }
      } else {
        if (dow === settings.cellDay) {
          const key = `celula_${date}`;
          if (!(await db.events.where('generationKey').equals(key).first())) {
            await db.events.add({
              id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              scope: 'celula', title: `Servicio de célula (${settings.cellName})`, type: 'Servicio de célula',
              date, startTime: settings.cellTime || '18:00', location: settings.cellLocation || 'Casa habitual',
              leaderId: null, preacherId: null, status: 'Programado', generationKey: key, createdAt: nowIso, updatedAt: nowIso
            });
          }
        }
      }
    }

    const allEvents = await db.events.orderBy('date').toArray();
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const targetEvents = allEvents.filter(e => e.date.startsWith(ym) && e.status === 'Programado' && isEventForCurrentScope(e));
    const activeMembers = members.filter(m => m.isActive);

    if (activeMembers.length > 0) {
      const lCount: Record<string, number> = {};
      const pCount: Record<string, number> = {};
      const gCount: Record<string, number> = {};
      activeMembers.forEach(m => { lCount[m.id] = 0; pCount[m.id] = 0; gCount[m.id] = 0; });
      let lastL: string | null = null;
      let lastP: string | null = null;

      const pickMin = (cands: Member[], counts: Record<string, number>, exIds: (string | null | undefined)[] = [], avoidId?: string | null) => {
        const exSet = new Set(exIds.filter(Boolean));
        let pool = cands.filter(c => !exSet.has(c.id));
        if (pool.length === 0) pool = cands;
        if (pool.length > 1 && avoidId) {
          const noC = pool.filter(c => c.id !== avoidId);
          if (noC.length > 0) pool = noC;
        }
        if (pool.length === 0) return null;
        const minVal = Math.min(...pool.map(c => counts[c.id] || 0));
        const minCands = pool.filter(c => (counts[c.id] || 0) === minVal);
        return minCands[Math.floor(Math.random() * minCands.length)];
      };

      for (const ev of targetEvents) {
        const eligL = activeMembers.filter(m => memberCanLead(m));
        const eligP = activeMembers.filter(m => memberCanPreach(m));

        const cL = pickMin(eligL.length > 0 ? eligL : activeMembers, lCount, [], lastL);
        const lId = cL ? cL.id : null;
        if (lId) { lCount[lId] = (lCount[lId] || 0) + 1; gCount[lId] = (gCount[lId] || 0) + 1; lastL = lId; }

        const cP = pickMin(eligP.length > 0 ? eligP : activeMembers, pCount, [lId], lastP);
        const pId = cP ? cP.id : null;
        if (pId) { pCount[pId] = (pCount[pId] || 0) + 1; gCount[pId] = (gCount[pId] || 0) + 1; lastP = pId; }

        const up: Partial<CellEvent> = { leaderId: lId, preacherId: pId };

        if (ev.type === 'Cena del Señor') {
          const used: (string | null)[] = [lId, pId];
          const bM = pickMin(activeMembers, gCount, used);
          if (bM) { gCount[bM.id] = (gCount[bM.id] || 0) + 1; used.push(bM.id); up.breadPrayerMemberId = bM.id; }

          const wM = pickMin(activeMembers, gCount, used);
          if (wM) { gCount[wM.id] = (gCount[wM.id] || 0) + 1; used.push(wM.id); up.winePrayerMemberId = wM.id; }

          const h1 = pickMin(activeMembers, gCount, used);
          if (h1) { gCount[h1.id] = (gCount[h1.id] || 0) + 1; used.push(h1.id); up.helper1Id = h1.id; }

          const h2 = pickMin(activeMembers, gCount, used);
          if (h2) { gCount[h2.id] = (gCount[h2.id] || 0) + 1; used.push(h2.id); up.helper2Id = h2.id; }

          const h3 = pickMin(activeMembers, gCount, used);
          if (h3) { gCount[h3.id] = (gCount[h3.id] || 0) + 1; used.push(h3.id); up.helper3Id = h3.id; }
        }

        await db.events.update(ev.id, up);
      }
    }

    await loadAll();
    showMsg(`⚡ ¡Mes generado y hermanos asignados para ${isChurch ? 'la Iglesia' : 'la Célula'}!`);
  };

  // Guardar nueva actividad
  const handleSaveCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim() || !newActDate) { showMsg('El título y la fecha son obligatorios.'); return; }
    const nowIso = new Date().toISOString();

    await db.events.add({
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      scope: settings.entityType, title: newActTitle.trim(), type: newActType, date: newActDate,
      startTime: newActTime || '18:00', location: newActLocation.trim() || (isChurch ? settings.churchLocation : settings.cellLocation),
      leaderId: newActLeaderId || null, preacherId: newActPreacherId || null, notes: newActNotes.trim() || undefined,
      status: 'Programado', createdAt: nowIso, updatedAt: nowIso
    });

    setShowNewEventModal(false);
    await loadAll();
    showMsg(`¡Actividad "${newActTitle}" agregada al calendario!`);
  };

  const openEditEvent = (ev: CellEvent) => {
    setSelectedEvent(ev);
    setModalTitle(ev.title || '');
    setModalLeaderId(ev.leaderId || '');
    setModalPreacherId(ev.preacherId || '');
    setModalBreadId(ev.breadPrayerMemberId || '');
    setModalWineId(ev.winePrayerMemberId || '');
    setModalHelper1Id(ev.helper1Id || '');
    setModalHelper2Id(ev.helper2Id || '');
    setModalHelper3Id(ev.helper3Id || '');
    setModalLocation(ev.location || (isChurch ? settings.churchLocation : settings.cellLocation));
    setModalTime(ev.startTime || (isChurch ? '10:00' : settings.cellTime));
    setModalNotes(ev.notes || '');
    setModalStatus(ev.status || 'Programado');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    await db.events.update(selectedEvent.id, {
      title: modalTitle.trim() || selectedEvent.title,
      leaderId: modalLeaderId || null, preacherId: modalPreacherId || null,
      breadPrayerMemberId: modalBreadId || null, winePrayerMemberId: modalWineId || null,
      helper1Id: modalHelper1Id || null, helper2Id: modalHelper2Id || null, helper3Id: modalHelper3Id || null,
      location: modalLocation, startTime: modalTime, notes: modalNotes.trim() || undefined, status: modalStatus
    });
    setSelectedEvent(null);
    await loadAll();
    showMsg('Evento actualizado.');
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('¿Deseas eliminar este evento del calendario?')) {
      await db.events.delete(id);
      setSelectedEvent(null);
      await loadAll();
      showMsg('Evento eliminado.');
    }
  };

  // WhatsApp
  const handleShareWhatsApp = () => {
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const targetEvents = events.filter(e => e.date.startsWith(ym) && e.status !== 'Cancelado' && isEventForCurrentScope(e)).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    if (targetEvents.length === 0) { showMsg('No hay actividades en este mes.'); return; }

    let text = `*${isChurch ? settings.churchName.toUpperCase() : settings.cellName.toUpperCase()}*\n`;
    text += isChurch ? `📍 ${settings.churchLocation}\n` : `${settings.territory} • ${settings.cellLocation}\n`;
    text += `*PROGRAMACIÓN — ${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}*\n\n`;

    const blocks = targetEvents.map(ev => {
      const isSun = ev.type === 'Escuela Dominical' || ev.type === 'Cena del Señor';
      let b = `📅 *${formatFriendlyDate(ev.date)}*\n*${ev.title.toUpperCase()}*\n`;
      b += isChurch && isSun ? `📖 9:00 a. m. Curso de Bautismo\n🕕 10:00 a. m. Culto General\n` : `🕕 Hora: ${formatFriendlyTime(ev.startTime)}\n`;
      b += `📍 Lugar: ${ev.location || (isChurch ? settings.churchLocation : settings.cellLocation)}\n`;

      if (ev.leaderId || ev.preacherId || ev.type === 'Servicio de célula' || isSun || ev.type === 'Ayuno') {
        b += `👤 Dirige: ${getMemberName(ev.leaderId) || 'Pendiente'}\n📖 Predica: ${getMemberName(ev.preacherId) || 'Pendiente'}`;
      }
      if (ev.notes) b += `\n📝 Detalle: ${ev.notes}`;

      if (ev.type === 'Cena del Señor') {
        const helpers = [getMemberName(ev.helper1Id), getMemberName(ev.helper2Id), getMemberName(ev.helper3Id)].filter(Boolean).join(', ') || 'Pendientes';
        b += `\n🍞 *Ora por el Pan:* ${getMemberName(ev.breadPrayerMemberId) || 'Pendiente'}\n🍷 *Ora por el Vino:* ${getMemberName(ev.winePrayerMemberId) || 'Pendiente'}\n🤝 *Colaboradores:* ${helpers}`;
      }
      return b;
    });

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + blocks.join('\n\n────────────────\n\n'))}`, '_blank');
  };

  // Registrar miembro
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const nowIso = new Date().toISOString();
    await db.members.add({
      id: 'm_' + Date.now(), fullName: newMemberName.trim(), phone: newMemberPhone.trim() || undefined,
      canLeadCell: !isChurch ? canLeadRole : false, canPreachCell: !isChurch ? canPreachRole : false,
      canLeadChurch: isChurch ? canLeadRole : false, canPreachChurch: isChurch ? canPreachRole : false,
      isActive: true, createdAt: nowIso, updatedAt: nowIso
    });
    setNewMemberName(''); setNewMemberPhone(''); setCanLeadRole(false); setCanPreachRole(false);
    await loadAll();
    showMsg(`Hermano agregado para ${isChurch ? 'la Iglesia' : 'la Célula'}.`);
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editMemberName.trim()) return;
    const up: Partial<Member> = { fullName: editMemberName.trim(), phone: editMemberPhone.trim() || undefined, updatedAt: new Date().toISOString() };
    if (isChurch) { up.canLeadChurch = editLeadRole; up.canPreachChurch = editPreachRole; }
    else { up.canLeadCell = editLeadRole; up.canPreachCell = editPreachRole; }

    await db.members.update(editingMember.id, up);
    setEditingMember(null);
    await loadAll();
    showMsg('¡Hermano actualizado!');
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (window.confirm(`¿Eliminar a ${name}?`)) {
      await db.members.delete(id);
      await loadAll();
      showMsg('Miembro eliminado.');
    }
  };

  const ymCurrent = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const visibleEvents = events.filter(e => e.date.startsWith(ymCurrent) && isEventForCurrentScope(e));

  const currentMonthFinances = finances.filter(f => f.date.startsWith(ymCurrent) && f.scope === settings.entityType);
  const totalIng = currentMonthFinances.filter(f => f.type === 'ingreso').reduce((a, b) => a + b.amount, 0);
  const totalEgr = currentMonthFinances.filter(f => f.type === 'egreso').reduce((a, b) => a + b.amount, 0);

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ENCABEZADO */}
      <header style={{ background: 'linear-gradient(135deg, #0f172a, #172554)', color: '#ffffff', padding: '16px 18px', borderBottom: '3px solid #b45309', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>{isChurch ? '🏛️' : '🏠'}</span>
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {isChurch ? settings.churchName : settings.cellName}
              </h1>
            </div>
            <p style={{ margin: '4px 0 0 28px', fontSize: '0.74rem', color: '#f59e0b', fontWeight: 600 }}>
              {isChurch ? settings.churchLocation : `${settings.territory} • ${settings.cellLocation}`}
            </p>
          </div>
          <span style={{ fontSize: '0.68rem', background: isChurch ? 'rgba(30, 64, 175, 0.8)' : 'rgba(22, 101, 52, 0.8)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '20px', color: '#fff', fontWeight: 800 }}>
            {isChurch ? 'IGLESIA' : 'CÉLULA'}
          </span>
        </div>
      </header>

      {notice && (
        <div style={{ background: '#0f172a', color: '#f8fafc', padding: '10px 16px', fontSize: '0.82rem', textAlign: 'center', fontWeight: 700, borderBottom: '2px solid #f59e0b' }}>
          {notice}
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ padding: '16px', flex: 1 }}>

        {/* 1. CALENDARIO */}
        {tab === 'calendario' && (
          <div>
            <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>◀</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  {visibleEvents.length} actividad(es) de {isChurch ? 'la Iglesia' : 'la Célula'}
                </span>
              </div>
              <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>▶</button>
            </div>

            {/* BOTONES: GENERAR Y NUEVA ACTIVIDAD */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
              <button onClick={handleGenerateAndAssign} style={{ background: isChurch ? '#1e3a8a' : '#065f46', color: '#fff', border: 'none', padding: '13px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                ⚡ Generar Mes
              </button>
              <button onClick={() => {
                const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                setNewActTitle(''); setNewActType('Actividad especial'); setNewActDate(`${ym}-15`);
                setNewActTime(isChurch ? '19:00' : (settings.cellTime || '18:00'));
                setNewActLocation(isChurch ? settings.churchLocation : settings.cellLocation);
                setNewActLeaderId(''); setNewActPreacherId(''); setNewActNotes('');
                setShowNewEventModal(true);
              }} style={{ background: '#b45309', color: '#fff', border: 'none', padding: '13px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                ➕ Nueva Actividad
              </button>
            </div>

            {/* BOTÓN PARA LIMPIAR EVENTOS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button onClick={() => setShowClearEventsModal(true)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer', padding: '4px 6px' }}>
                🗑️ Limpiar eventos del calendario...
              </button>
            </div>

            {/* BOTÓN WHATSAPP */}
            <button onClick={handleShareWhatsApp} style={{ width: '100%', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', padding: '13px', borderRadius: '14px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', marginBottom: '16px' }}>
              📲 Compartir Programación por WhatsApp
            </button>

            {/* LISTADO DE EVENTOS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {visibleEvents.length === 0 ? (
                <div style={{ background: '#fff', padding: '32px 20px', borderRadius: '18px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                  No hay actividades programadas en este mes.<br/>
                  Pulsa <strong>"⚡ Generar Mes"</strong> o <strong>"➕ Nueva Actividad"</strong>.
                </div>
              ) : (
                visibleEvents.map(ev => {
                  const isCena = ev.type === 'Cena del Señor';
                  const isSun = ev.type === 'Escuela Dominical' || isCena;
                  const isSpec = ev.type === 'Vigilia' || ev.type === 'Evangelización' || ev.type === 'Actividad especial';

                  return (
                    <div key={ev.id} style={{ background: '#ffffff', borderRadius: '18px', border: isCena ? '2px solid #b45309' : isSpec ? '2px solid #f59e0b' : isChurch ? '1px solid #e2e8f0' : '1px solid #bbf7d0', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>📅 {formatFriendlyDate(ev.date)}</span>
                        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700, background: '#f1f5f9', padding: '3px 8px', borderRadius: '8px' }}>🕕 {formatFriendlyTime(ev.startTime)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: isCena ? '#b45309' : isSpec ? '#b45309' : isChurch ? '#1e3a8a' : '#065f46' }}>
                          {isSpec ? '⭐ ' + ev.title : isCena ? '🍷 ' + ev.title : isChurch ? '⛪ ' + ev.title : '🏠 ' + ev.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          📍 {ev.location || (isChurch ? settings.churchLocation : settings.cellLocation)}
                        </span>
                      </div>

                      {ev.notes && (
                        <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#475569', marginBottom: '10px', fontStyle: 'italic' }}>
                          📝 {ev.notes}
                        </div>
                      )}

                      {isChurch && isSun && (
                        <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#334155', marginBottom: '10px', fontWeight: 600 }}>
                          📖 9:00 a. m. Curso de Bautismo (previo a la Escuela)
                        </div>
                      )}

                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: isCena ? '8px' : '12px' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Dirige:</span>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: ev.leaderId ? '#0f172a' : '#d97706' }}>
                            {getMemberName(ev.leaderId) || '⚠️ Pendiente'}
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Predica:</span>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: ev.preacherId ? '#0f172a' : '#d97706' }}>
                            {getMemberName(ev.preacherId) || '⚠️ Pendiente'}
                          </span>
                        </div>
                      </div>

                      {isCena && (
                        <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '12px', fontSize: '0.75rem' }}>
                          <div style={{ fontWeight: 800, color: '#92400e', marginBottom: '6px' }}>🍞🍷 Encargados de la Cena del Señor:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                            <div><strong>Ora Pan:</strong> {getMemberName(ev.breadPrayerMemberId) || '⚠️ Pendiente'}</div>
                            <div><strong>Ora Vino:</strong> {getMemberName(ev.winePrayerMemberId) || '⚠️ Pendiente'}</div>
                          </div>
                          <div>
                            <strong>Colaboradores:</strong> {[getMemberName(ev.helper1Id), getMemberName(ev.helper2Id), getMemberName(ev.helper3Id)].filter(Boolean).join(', ') || '⚠️ Pendientes'}
                          </div>
                        </div>
                      )}

                      <button onClick={() => openEditEvent(ev)} style={{ width: '100%', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '9px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                        ✏️ Asignar Hermanos / Editar
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 2. FINANZAS */}
        {tab === 'finanzas' && (
          <div>
            <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>◀</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Finanzas: {MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: isChurch ? '#1e40af' : '#166534', fontWeight: 700 }}>
                  {isChurch ? '🏛️ Tesorería de la Iglesia' : '🏠 Caja de Célula'}
                </span>
              </div>
              <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>▶</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>📈 Entradas (Mes)</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{formatCurrency(totalIng)}</div>
              </div>

              <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #fecaca' }}>
                <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700 }}>📉 Salidas (Mes)</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{formatCurrency(totalEgr)}</div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', color: '#fff', padding: '16px', borderRadius: '16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 800 }}>Saldo Disponible en Caja</span>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px' }}>{formatCurrency(totalIng - totalEgr)}</div>
              </div>
              <div style={{ fontSize: '2rem' }}>💰</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <button onClick={openNewFinanceModal} style={{ background: isChurch ? '#1e3a8a' : '#047857', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                + Registrar Movimiento
              </button>
              <button onClick={handleShareFinanceWhatsApp} style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                📲 Enviar WhatsApp
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {[{ id: 'todos', label: 'Todos' }, { id: 'ingreso', label: 'Solo Entradas' }, { id: 'egreso', label: 'Solo Salidas' }].map(f => (
                <button key={f.id} onClick={() => setFinFilter(f.id as any)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: finFilter === f.id ? '#0f172a' : '#ffffff', color: finFilter === f.id ? '#ffffff' : '#475569', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentMonthFinances.length === 0 ? (
                <div style={{ background: '#fff', padding: '30px 20px', borderRadius: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem', border: '1px dashed #cbd5e1' }}>
                  No hay movimientos registrados en este mes.
                </div>
              ) : (
                currentMonthFinances.filter(f => finFilter === 'todos' ? true : f.type === finFilter).map(rec => (
                  <div key={rec.id} style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: rec.type === 'ingreso' ? '1px solid #bbf7d0' : '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{rec.category}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>📅 {rec.date} {rec.memberId ? `• 👤 ${getMemberName(rec.memberId)}` : ''}</div>
                      {rec.notes && <div style={{ fontSize: '0.68rem', color: '#475569', fontStyle: 'italic' }}>"{rec.notes}"</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: rec.type === 'ingreso' ? '#15803d' : '#dc2626' }}>
                        {rec.type === 'ingreso' ? '+' : '-'} {formatCurrency(rec.amount)}
                      </div>
                      <button onClick={() => handleDeleteFinanceRecord(rec.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>Eliminar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. INICIO */}
        {tab === 'inicio' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', color: '#fff', padding: '22px 18px', borderRadius: '20px', marginBottom: '16px', border: '1px solid #b45309' }}>
              <span style={{ fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 800 }}>
                {isChurch ? '🏛️ Iglesia Activa' : '🏠 Célula Activa'}
              </span>
              <h2 style={{ margin: '8px 0 4px', fontSize: '1.3rem', fontWeight: 800 }}>
                {isChurch ? settings.churchName : settings.cellName}
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1' }}>
                {isChurch ? settings.churchLocation : `${settings.territory} • ${settings.cellLocation}`}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button onClick={() => setTab('calendario')} style={{ flex: 1, background: '#f59e0b', border: 'none', color: '#0f172a', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  📅 Calendario
                </button>
                <button onClick={() => setTab('finanzas')} style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  💰 Finanzas
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Hermanos en lista</span>
                <p style={{ margin: '6px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{members.length}</p>
              </div>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Cultos este mes</span>
                <p style={{ margin: '6px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{visibleEvents.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. MIEMBROS */}
        {tab === 'miembros' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar hermano por nombre o teléfono..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={S.input}
              />
            </div>

            <button onClick={() => setShowImportMembersModal(true)} style={{ ...S.btnPrimary, background: 'linear-gradient(135deg, #1e3a8a, #0f172a)', marginBottom: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <span>👥</span>
              <span>Importar Hermanos desde MySQL / JSON</span>
            </button>

            <form onSubmit={handleAddMember} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                + Registrar Hermano ({isChurch ? 'Iglesia' : 'Célula'})
              </h3>
              <input type="text" placeholder="Nombre completo *" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required style={{ ...S.input, marginBottom: '8px' }} />
              <input type="text" placeholder="Teléfono (opcional)" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} style={{ ...S.input, marginBottom: '12px' }} />

              <div style={{ background: isChurch ? '#eff6ff' : '#f0fdf4', padding: '10px 12px', borderRadius: '10px', marginBottom: '12px', border: isChurch ? '1px solid #bfdbfe' : '1px solid #bbf7d0' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: isChurch ? '#1e40af' : '#166534', marginBottom: '6px' }}>
                  Capacidades en {isChurch ? 'la IGLESIA' : 'la CÉLULA'}:
                </span>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={canLeadRole} onChange={e => setCanLeadRole(e.target.checked)} /> Puede dirigir</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={canPreachRole} onChange={e => setCanPreachRole(e.target.checked)} /> Puede predicar</label>
                </div>
              </div>

              <button type="submit" style={S.btnPrimary}>Guardar Hermano</button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>Directorio Alfabético (A - Z):</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{filteredMembers.length} de {members.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMembers.map(m => (
                <div key={m.id} style={{ background: '#fff', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginRight: '8px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: isChurch ? '#dbeafe' : '#dcfce7', color: isChurch ? '#1e40af' : '#166534', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getInitials(m.fullName)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{m.fullName}</div>
                      {m.phone && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>📞 {m.phone}</div>}
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {memberCanLead(m) && <span style={{ background: isChurch ? '#eff6ff' : '#f0fdf4', color: isChurch ? '#1d4ed8' : '#15803d', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>✓ Dirige</span>}
                        {memberCanPreach(m) && <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>✓ Predica</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditingMember(m); setEditMemberName(m.fullName); setEditMemberPhone(m.phone || ''); setEditLeadRole(memberCanLead(m)); setEditPreachRole(memberCanPreach(m)); }} style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>✏️ Editar</button>
                    <button onClick={() => handleDeleteMember(m.id, m.fullName)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. AJUSTES */}
        {tab === 'ajustes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={handleSaveSettings} style={{ background: '#fff', padding: '18px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>⚙️ Configuración del Sistema</h3>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>¿Qué deseas administrar en esta aplicación?</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div onClick={() => setFormEntityType('iglesia')} style={{ border: formEntityType === 'iglesia' ? '2px solid #1e40af' : '1px solid #cbd5e1', background: formEntityType === 'iglesia' ? '#eff6ff' : '#ffffff', padding: '12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🏛️</div>
                    <strong style={{ display: 'block', fontSize: '0.84rem', color: formEntityType === 'iglesia' ? '#1e40af' : '#334155' }}>Modo Iglesia</strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Templo Central</span>
                  </div>
                  <div onClick={() => setFormEntityType('celula')} style={{ border: formEntityType === 'celula' ? '2px solid #166534' : '1px solid #cbd5e1', background: formEntityType === 'celula' ? '#f0fdf4' : '#ffffff', padding: '12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🏠</div>
                    <strong style={{ display: 'block', fontSize: '0.84rem', color: formEntityType === 'celula' ? '#166534' : '#334155' }}>Modo Célula</strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Hogar / Territorio</span>
                  </div>
                </div>
              </div>

              {formEntityType === 'iglesia' ? (
                <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '14px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e40af', marginBottom: '10px' }}>🏛️ Datos de la IGLESIA:</span>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Nombre de la Iglesia:</label>
                    <input type="text" value={formChurchName} onChange={e => setFormChurchName(e.target.value)} required style={S.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Dirección física del Templo:</label>
                    <input type="text" value={formChurchLocation} onChange={e => setFormChurchLocation(e.target.value)} style={S.input} />
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '14px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#166534', marginBottom: '10px' }}>🏠 Datos de la CÉLULA:</span>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Nombre de la Célula:</label>
                    <input type="text" value={formCellName} onChange={e => setFormCellName(e.target.value)} required style={S.input} />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Territorio o Identificación:</label>
                    <input type="text" value={formTerritory} onChange={e => setFormTerritory(e.target.value)} style={S.input} />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Casa / Lugar de reunión:</label>
                    <input type="text" value={formCellLocation} onChange={e => setFormCellLocation(e.target.value)} style={S.input} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Día de reunión:</label>
                      <select value={formCellDay} onChange={e => setFormCellDay(Number(e.target.value))} style={S.input}>
                        {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Hora de reunión:</label>
                      <input type="time" value={formCellTime} onChange={e => setFormCellTime(e.target.value)} style={S.input} />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" style={S.btnPrimary}>💾 Guardar Configuración</button>
            </form>

            {/* SECCIÓN RESPALDOS */}
            <div style={{ background: '#fff', padding: '18px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>📦 Copias de Seguridad y Migración</h3>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '0 0 14px' }}>Guarda tus datos o importa miembros desde MySQL.</p>

              <button type="button" onClick={() => setShowImportMembersModal(true)} style={{ ...S.btnPrimary, background: '#1e3a8a', marginBottom: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <span>👥</span>
                <span>Importar Miembros desde MySQL (JSON)</span>
              </button>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>1. EXPORTAR (Generar y Copiar)</span>
                <button type="button" onClick={handleGenerateBackupDirect} style={{ ...S.btnPrimary, background: '#047857', marginBottom: '8px' }}>
                  📋 GENERAR Y COPIAR RESPALDO
                </button>
                <textarea id="directBackupArea" readOnly rows={4} value={generatedBackupText} placeholder="Aquí aparecerá el código de tu respaldo..." style={{ ...S.input, marginBottom: '8px', background: '#fff', fontFamily: 'monospace', fontSize: '0.66rem' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button type="button" onClick={handleCopyGeneratedBackup} disabled={!generatedBackupText} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', opacity: generatedBackupText ? 1 : 0.5 }}>Copiar Código</button>
                  <button type="button" onClick={handleShareBackupWhatsApp} disabled={!generatedBackupText} style={{ background: '#059669', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', opacity: generatedBackupText ? 1 : 0.5 }}>📲 Enviar a WhatsApp</button>
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>2. RESTAURAR (Recuperar tus Datos)</span>
                <p style={{ fontSize: '0.72rem', color: '#475569', margin: '0 0 8px' }}>Pega aquí el código que copiaste anteriormente:</p>
                <textarea rows={4} value={pastedRestoreText} onChange={e => setPastedRestoreText(e.target.value)} placeholder="Pega aquí el código de respaldo..." style={{ ...S.input, marginBottom: '8px', background: '#fff', fontFamily: 'monospace', fontSize: '0.66rem', border: '1px solid #86efac' }} />
                <button type="button" onClick={handleRestoreFromTextDirect} disabled={!pastedRestoreText.trim()} style={{ ...S.btnPrimary, opacity: pastedRestoreText.trim() ? 1 : 0.5, marginBottom: '10px' }}>
                  🔄 RESTAURAR TODOS LOS DATOS
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                  O si tienes el archivo .json:
                  <label style={{ display: 'block', marginTop: '4px', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    📁 Cargar archivo .json
                    <input type="file" accept=".json" onChange={handleRestoreFileDirect} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL LIMPIAR EVENTOS */}
      {showClearEventsModal && (
        <div style={S.modalBg}>
          <div style={S.modalCard}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>🗑️ Limpiar Calendario</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.74rem', color: '#475569', lineHeight: 1.4 }}>
              Elige qué eventos deseas eliminar de <strong>{isChurch ? 'la Iglesia' : 'la Célula'}</strong>. Tus miembros, finanzas y configuración <strong>no se borrarán</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              <button onClick={handleClearMonthEvents} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                📅 Borrar solo cultos de {MONTH_NAMES[currentMonth]} {currentYear}
              </button>
              <button onClick={handleClearAllEvents} style={{ background: '#450a0a', border: 'none', color: '#fff', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' }}>
                ⚠️ Borrar TODOS los cultos del calendario
              </button>
            </div>
            <button onClick={() => setShowClearEventsModal(false)} style={{ ...S.btnPrimary, background: '#e2e8f0', color: '#1e293b' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR DESDE MYSQL */}
      {showImportMembersModal && (
        <div style={S.modalBg}>
          <div style={S.modalCard}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>👥 Importar Miembros desde MySQL</h3>
            <p style={{ margin: '0 0 10px', fontSize: '0.74rem', color: '#64748b' }}>Pega el JSON exportado de MySQL o sube el archivo:</p>
            <textarea rows={7} value={importMembersText} onChange={e => setImportMembersText(e.target.value)} placeholder='[{"fullName": "Juan Pérez", "phone": "3001234567"}, ...]' style={{ ...S.input, marginBottom: '10px', fontFamily: 'monospace', fontSize: '0.68rem' }} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <label style={{ flex: 1, background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', textAlign: 'center' }}>
                📁 Archivo .json
                <input type="file" accept=".json" onChange={handleImportMembersFile} style={{ display: 'none' }} />
              </label>
              <button onClick={handleImportMembersSubmit} disabled={!importMembersText.trim()} style={{ flex: 1, background: '#047857', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer', opacity: importMembersText.trim() ? 1 : 0.6 }}>Cargar Texto</button>
            </div>
            <button onClick={() => setShowImportMembersModal(false)} style={{ ...S.btnPrimary, background: '#e2e8f0', color: '#1e293b' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL NUEVA ACTIVIDAD */}
      {showNewEventModal && (
        <div style={S.modalBg}>
          <div style={S.modalCard}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>➕ Programar Nueva Actividad</h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.74rem', color: '#64748b' }}>Agrega una vigilia o actividad especial para {isChurch ? 'la Iglesia' : 'la Célula'}:</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {['Vigilia', 'Evangelización', 'Reunión de Jóvenes', 'Ayuno Especial', 'Tarde de Alabanza'].map(s => (
                <button type="button" key={s} onClick={() => { setNewActTitle(s); setNewActType(s === 'Vigilia' ? 'Vigilia' : s === 'Evangelización' ? 'Evangelización' : 'Actividad especial'); }} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
            <form onSubmit={handleSaveCustomEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Título *:</label>
                <input type="text" required placeholder="Ej. Gran Vigilia..." value={newActTitle} onChange={e => setNewActTitle(e.target.value)} style={S.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Fecha *:</label>
                  <input type="date" required value={newActDate} onChange={e => setNewActDate(e.target.value)} style={S.input} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Hora *:</label>
                  <input type="time" required value={newActTime} onChange={e => setNewActTime(e.target.value)} style={S.input} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Lugar:</label>
                <input type="text" value={newActLocation} onChange={e => setNewActLocation(e.target.value)} style={S.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Dirige:</label>
                  <select value={newActLeaderId} onChange={e => setNewActLeaderId(e.target.value)} style={S.input}>
                    <option value="">(Sin asignar)</option>
                    {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Predica:</label>
                  <select value={newActPreacherId} onChange={e => setNewActPreacherId(e.target.value)} style={S.input}>
                    <option value="">(Sin asignar)</option>
                    {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Detalle / Nota:</label>
                <input type="text" placeholder="Ej. Llevar Biblia..." value={newActNotes} onChange={e => setNewActNotes(e.target.value)} style={S.input} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowNewEventModal(false)} style={{ flex: 1, padding: '11px', background: '#e2e8f0', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '11px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR FINANZAS */}
      {showFinanceModal && (
        <div style={S.modalBg}>
          <div style={S.modalCard}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>💰 Registrar Movimiento ({isChurch ? 'Iglesia' : 'Célula'})</h3>
            <form onSubmit={handleSaveFinanceRecord} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button type="button" onClick={() => { setFinType('ingreso'); setFinCategory(isChurch ? churchIncomeCategories[0] : cellIncomeCategories[0]); }} style={{ padding: '10px', borderRadius: '10px', border: finType === 'ingreso' ? '2px solid #15803d' : '1px solid #cbd5e1', background: finType === 'ingreso' ? '#dcfce7' : '#fff', color: finType === 'ingreso' ? '#15803d' : '#64748b', fontWeight: 800 }}>📈 Entrada</button>
                <button type="button" onClick={() => { setFinType('egreso'); setFinCategory(isChurch ? churchExpenseCategories[0] : cellExpenseCategories[0]); }} style={{ padding: '10px', borderRadius: '10px', border: finType === 'egreso' ? '2px solid #b91c1c' : '1px solid #cbd5e1', background: finType === 'egreso' ? '#fee2e2' : '#fff', color: finType === 'egreso' ? '#b91c1c' : '#64748b', fontWeight: 800 }}>📉 Salida</button>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Monto ($) *:</label>
                <input type="number" step="any" required placeholder="50000" value={finAmount} onChange={e => setFinAmount(e.target.value)} style={S.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Fecha *:</label>
                <input type="date" required value={finDate} onChange={e => setFinDate(e.target.value)} style={S.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Categoría *:</label>
                <select value={finCategory} onChange={e => setFinCategory(e.target.value)} style={S.input}>
                  {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Hermano (Opcional):</label>
                <select value={finMemberId} onChange={e => setFinMemberId(e.target.value)} style={S.input}>
                  <option value="">(Anónimo)</option>
                  {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Detalle:</label>
                <input type="text" placeholder="Nota..." value={finNotes} onChange={e => setFinNotes(e.target.value)} style={S.input} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowFinanceModal(false)} style={{ flex: 1, padding: '11px', background: '#e2e8f0', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '11px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR HERMANO */}
      {editingMember && (
        <div style={S.modalBg}>
          <div style={S.modalCard}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>✏️ Editar Hermano</h3>
            <form onSubmit={handleSaveEditMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Nombre *:</label>
                <input type="text" required value={editMemberName} onChange={e => setEditMemberName(e.target.value)} style={S.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Teléfono:</label>
                <input type="text" value={editMemberPhone} onChange={e => setEditMemberPhone(e.target.value)} style={S.input} />
              </div>
              <div style={{ background: isChurch ? '#eff6ff' : '#f0fdf4', padding: '12px', borderRadius: '10px', border: isChurch ? '1px solid #bfdbfe' : '1px solid #bbf7d0' }}>
                <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: isChurch ? '#1e40af' : '#166534', marginBottom: '6px' }}>Capacidades en {isChurch ? 'la IGLESIA' : 'la CÉLULA'}:</span>
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.76rem' }}>
                  <label><input type="checkbox" checked={editLeadRole} onChange={e => setEditLeadRole(e.target.checked)} /> Puede dirigir</label>
                  <label><input type="checkbox" checked={editPreachRole} onChange={e => setEditPreachRole(e.target.checked)} /> Puede predicar</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setEditingMember(null)} style={{ flex: 1, padding: '11px', background: '#e2e8f0', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '11px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR EVENTO */}
      {selectedEvent && (
        <div style={S.modalBg}>
          <div style={S.modalCard}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800 }}>Asignar / Editar Evento</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.74rem', color: '#64748b' }}>📅 {formatFriendlyDate(selectedEvent.date)}</p>
            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Título:</label>
                <input type="text" required value={modalTitle} onChange={e => setModalTitle(e.target.value)} style={S.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>👤 Dirige:</label>
                <select value={modalLeaderId} onChange={e => setModalLeaderId(e.target.value)} style={S.input}>
                  <option value="">(Sin asignar)</option>
                  {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} {memberCanLead(m) ? '✓' : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>📖 Predica:</label>
                <select value={modalPreacherId} onChange={e => setModalPreacherId(e.target.value)} style={S.input}>
                  <option value="">(Sin asignar)</option>
                  {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} {memberCanPreach(m) ? '✓' : ''}</option>)}
                </select>
              </div>

              {selectedEvent.type === 'Cena del Señor' && (
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e' }}>🍞🍷 Asignaciones Cena del Señor:</span>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🍞 Ora por el Pan:</label>
                    <select value={modalBreadId} onChange={e => setModalBreadId(e.target.value)} style={S.input}>
                      <option value="">(Pendiente)</option>
                      {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🍷 Ora por el Vino:</label>
                    <select value={modalWineId} onChange={e => setModalWineId(e.target.value)} style={S.input}>
                      <option value="">(Pendiente)</option>
                      {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🤝 Colaboradores (3):</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <select value={modalHelper1Id} onChange={e => setModalHelper1Id(e.target.value)} style={S.input}>
                        <option value="">(Colaborador 1)</option>
                        {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                      </select>
                      <select value={modalHelper2Id} onChange={e => setModalHelper2Id(e.target.value)} style={S.input}>
                        <option value="">(Colaborador 2)</option>
                        {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                      </select>
                      <select value={modalHelper3Id} onChange={e => setModalHelper3Id(e.target.value)} style={S.input}>
                        <option value="">(Colaborador 3)</option>
                        {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>📍 Lugar:</label>
                <input type="text" value={modalLocation} onChange={e => setModalLocation(e.target.value)} style={S.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>🕕 Hora:</label>
                <input type="time" value={modalTime} onChange={e => setModalTime(e.target.value)} style={S.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>📝 Notas:</label>
                <input type="text" value={modalNotes} onChange={e => setModalNotes(e.target.value)} style={S.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Estado:</label>
                <select value={modalStatus} onChange={e => setModalStatus(e.target.value as any)} style={S.input}>
                  <option value="Programado">Programado</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setSelectedEvent(null)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Guardar</button>
              </div>
              <button type="button" onClick={() => handleDeleteEvent(selectedEvent.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.74rem', marginTop: '6px', cursor: 'pointer' }}>Eliminar este culto/actividad</button>
            </form>
          </div>
        </div>
      )}

      {/* BARRA INFERIOR */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '8px 0', maxWidth: '480px', margin: '0 auto', zIndex: 50, boxShadow: '0 -2px 10px rgba(0,0,0,0.03)' }}>
        {[
          { id: 'calendario', label: 'Calendario', icon: '📅' },
          { id: 'finanzas', label: 'Finanzas', icon: '💰' },
          { id: 'inicio', label: 'Inicio', icon: '🏠' },
          { id: 'miembros', label: 'Miembros', icon: '👥' },
          { id: 'ajustes', label: 'Ajustes', icon: '⚙️' }
        ].map(it => (
          <button key={it.id} onClick={() => setTab(it.id as any)} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: tab === it.id ? (isChurch ? '#1e40af' : '#166534') : '#94a3b8', fontWeight: tab === it.id ? 800 : 600, fontSize: '0.7rem', cursor: 'pointer', padding: '4px 6px' }}>
            <span style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{it.icon}</span>
            {it.label}
          </button>
        ))}
      </nav>
    </div>
  );
}