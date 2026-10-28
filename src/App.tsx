import React, { useState, useEffect } from 'react';
import { db, DEFAULT_SETTINGS } from './db';
import { Member, CellEvent, FinancialRecord, AppSettings, TransactionType } from './types';
import { MONTH_NAMES } from './services/dateUtils';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

  // Formulario en Ajustes
  const [formEntityType, setFormEntityType] = useState<'iglesia' | 'celula'>('iglesia');
  const [formChurchName, setFormChurchName] = useState('LEHV-La catedral del Avivamiento');
  const [formChurchLocation, setFormChurchLocation] = useState('');
  const [formCellName, setFormCellName] = useState('');
  const [formTerritory, setFormTerritory] = useState('');
  const [formCellLocation, setFormCellLocation] = useState('');
  const [formCellDay, setFormCellDay] = useState(3);
  const [formCellTime, setFormCellTime] = useState('18:00');

  // Sistema de respaldo directo en pantalla
  const [generatedBackupText, setGeneratedBackupText] = useState('');
  const [pastedRestoreText, setPastedRestoreText] = useState('');

  // Modal de Finanzas
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [finType, setFinType] = useState<TransactionType>('ingreso');
  const [finAmount, setFinAmount] = useState('');
  const [finDate, setFinDate] = useState(new Date().toISOString().substring(0, 10));
  const [finCategory, setFinCategory] = useState('');
  const [finMemberId, setFinMemberId] = useState('');
  const [finNotes, setFinNotes] = useState('');
  const [finFilter, setFinFilter] = useState<'todos' | 'ingreso' | 'egreso'>('todos');

  // Modal de edición de miembro
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editLeadRole, setEditLeadRole] = useState(false);
  const [editPreachRole, setEditPreachRole] = useState(false);

  // Edición de culto
  const [selectedEvent, setSelectedEvent] = useState<CellEvent | null>(null);
  const [modalLeaderId, setModalLeaderId] = useState<string>('');
  const [modalPreacherId, setModalPreacherId] = useState<string>('');
  const [modalBreadId, setModalBreadId] = useState<string>('');
  const [modalWineId, setModalWineId] = useState<string>('');
  const [modalHelper1Id, setModalHelper1Id] = useState<string>('');
  const [modalHelper2Id, setModalHelper2Id] = useState<string>('');
  const [modalHelper3Id, setModalHelper3Id] = useState<string>('');
  const [modalLocation, setModalLocation] = useState<string>('');
  const [modalTime, setModalTime] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<'Programado' | 'Realizado' | 'Cancelado'>('Programado');

  // Formulario nuevo miembro
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

  const churchIncomeCategories = [
    'Diezmo',
    'Ofrenda de culto general',
    'Ofrenda de ayuno',
    'Pro-Templo / Construcción',
    'Ofrenda recibida de células',
    'Donación especial',
    'Otro ingreso'
  ];

  const churchExpenseCategories = [
    'Servicios públicos (Luz/Agua)',
    'Mantenimiento del Templo',
    'Santa Cena (Pan/Vino/Copitas)',
    'Sonido e Instrumentos',
    'Ayuda social / Benévola',
    'Viáticos / Honorarios',
    'Limpieza y aseo',
    'Otro egreso'
  ];

  const cellIncomeCategories = [
    'Ofrenda de reunión de célula',
    'Aporte para refrigerio',
    'Donación especial',
    'Otro ingreso'
  ];

  const cellExpenseCategories = [
    'Compra de refrigerios',
    'Ayuda a hermano de célula',
    'Entrega de sobre a la Iglesia',
    'Material bíblico / Copias',
    'Otro egreso'
  ];

  const currentCategories = isChurch
    ? (finType === 'ingreso' ? churchIncomeCategories : churchExpenseCategories)
    : (finType === 'ingreso' ? cellIncomeCategories : cellExpenseCategories);

  // Orden alfabético A - Z
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  };

  const memberCanLead = (m: Member) => {
    return isChurch ? (m.canLeadChurch ?? m.canLead ?? false) : (m.canLeadCell ?? m.canLead ?? false);
  };

  const memberCanPreach = (m: Member) => {
    return isChurch ? (m.canPreachChurch ?? m.canPreach ?? false) : (m.canPreachCell ?? m.canPreach ?? false);
  };

  const formatFriendlyTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'p. m.' : 'a. m.';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  const formatFriendlyDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return `${DAY_NAMES[dt.getDay()]} ${d} de ${MONTH_NAMES[m - 1]}`;
  };

  const formatCurrency = (val: number) => {
    return '$' + val.toLocaleString('es-CO');
  };

  // Guardar Ajustes
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

  // 1. GENERAR Y COPIAR RESPALDO VISIBLE (100% FUNCIONAL EN ANDROID)
  const handleGenerateBackupDirect = async () => {
    try {
      const data = {
        schemaVersion: 4,
        exportedAt: new Date().toISOString(),
        settings,
        members,
        events,
        finances
      };
      const jsonStr = JSON.stringify(data, null, 2);
      setGeneratedBackupText(jsonStr);

      // Copiar automáticamente al portapapeles
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(jsonStr);
          copied = true;
        }
      } catch {}

      if (!copied) {
        try {
          const ta = document.getElementById('directBackupArea') as HTMLTextAreaElement;
          if (ta) {
            ta.value = jsonStr;
            ta.focus();
            ta.select();
            document.execCommand('copy');
            copied = true;
          }
        } catch {}
      }

      showMsg(copied ? '✅ ¡Copia generada y copiada al portapapeles!' : '✅ ¡Copia generada en el cuadro inferior!');
    } catch {
      showMsg('Error al generar la copia de seguridad.');
    }
  };

  const handleCopyGeneratedBackup = () => {
    if (!generatedBackupText) return;
    const ta = document.getElementById('directBackupArea') as HTMLTextAreaElement;
    if (ta) {
      ta.focus();
      ta.select();
      document.execCommand('copy');
      showMsg('¡Texto de respaldo copiado!');
    }
  };

  const handleShareBackupWhatsApp = () => {
    if (!generatedBackupText) {
      showMsg('Primero pulsa "Generar Copia de Respaldo".');
      return;
    }
    const header = `*COPIA DE SEGURIDAD ${settings.entityType === 'iglesia' ? settings.churchName.toUpperCase() : settings.cellName.toUpperCase()}*\n`;
    const fullText = header + generatedBackupText;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank');
  };

  const handleDownloadBackupFile = () => {
    if (!generatedBackupText) {
      showMsg('Primero pulsa "Generar Copia de Respaldo".');
      return;
    }
    try {
      const blob = new Blob([generatedBackupText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Copia_${settings.entityType === 'iglesia' ? 'Iglesia' : 'Celula'}_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMsg('Archivo descargado.');
    } catch {
      showMsg('Descarga bloqueada en este móvil. Usa "Copiar" o "WhatsApp".');
    }
  };

  // 2. RESTAURAR RESPALDO DESDE TEXTO DIRECTO (INFALIBLE)
  const handleRestoreFromTextDirect = async () => {
    if (!pastedRestoreText.trim()) {
      showMsg('Pega el código de respaldo en el cuadro primero.');
      return;
    }

    try {
      const parsed = JSON.parse(pastedRestoreText.trim());
      if (!parsed || typeof parsed !== 'object') {
        showMsg('El texto ingresado no es un JSON válido.');
        return;
      }

      if (window.confirm('¿Deseas restaurar esta copia? Reemplazará todos los datos actuales de la aplicación.')) {
        await db.transaction('rw', [db.settings, db.members, db.events, db.finances], async () => {
          if (parsed.settings) {
            await db.settings.clear();
            await db.settings.put(parsed.settings);
          }
          if (Array.isArray(parsed.members)) {
            await db.members.clear();
            if (parsed.members.length > 0) await db.members.bulkAdd(parsed.members);
          }
          if (Array.isArray(parsed.events)) {
            await db.events.clear();
            if (parsed.events.length > 0) await db.events.bulkAdd(parsed.events);
          }
          if (Array.isArray(parsed.finances)) {
            await db.finances.clear();
            if (parsed.finances.length > 0) await db.finances.bulkAdd(parsed.finances);
          }
        });

        await loadAll();
        setPastedRestoreText('');
        showMsg('✅ ¡Todos los datos se restauraron con éxito!');
      }
    } catch {
      showMsg('Error al leer el código. Asegúrate de pegarlo completo.');
    }
  };

  const handleRestoreFileDirect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        setPastedRestoreText(text);
        showMsg('Archivo cargado en el cuadro. Pulsa "Restaurar".');
      } catch {
        showMsg('Error al leer el archivo.');
      }
    };
    reader.readAsText(file);
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
    if (isNaN(amountNum) || amountNum <= 0) {
      showMsg('Ingresa un monto válido mayor a cero.');
      return;
    }

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

    if (monthFinances.length === 0) {
      showMsg('No hay movimientos en este mes.');
      return;
    }

    const totalIngresos = monthFinances.filter(f => f.type === 'ingreso').reduce((acc, curr) => acc + curr.amount, 0);
    const totalEgresos = monthFinances.filter(f => f.type === 'egreso').reduce((acc, curr) => acc + curr.amount, 0);
    const balanceNeto = totalIngresos - totalEgresos;

    let text = `*${isChurch ? settings.churchName.toUpperCase() : settings.cellName.toUpperCase()}*\n`;
    text += isChurch ? `📍 ${settings.churchLocation}\n` : `${settings.territory} • ${settings.cellLocation}\n`;
    text += `*INFORME FINANCIERO — ${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}*\n\n`;

    text += `📈 *TOTAL INGRESOS:* ${formatCurrency(totalIngresos)}\n`;
    monthFinances.filter(f => f.type === 'ingreso').forEach(f => {
      text += `  • ${f.category}: ${formatCurrency(f.amount)}\n`;
    });

    text += `\n📉 *TOTAL EGRESOS:* ${formatCurrency(totalEgresos)}\n`;
    monthFinances.filter(f => f.type === 'egreso').forEach(f => {
      text += `  • ${f.category}: ${formatCurrency(f.amount)}\n`;
    });

    text += `\n────────────────\n`;
    text += `💰 *SALDO DISPONIBLE EN CAJA:* ${formatCurrency(balanceNeto)}\n`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // UN SOLO BOTÓN: Generar y Asignar Cultos
  const handleGenerateAndAssign = async () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const nowIso = new Date().toISOString();

    const oldBautismos = await db.events.where('type').equals('Curso de bautismo').toArray();
    for (const b of oldBautismos) await db.events.delete(b.id);

    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(currentYear, currentMonth, day, 12, 0, 0);
      const dayOfWeek = dt.getDay();
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const date = `${currentYear}-${monthStr}-${dayStr}`;

      if (isChurch) {
        if (dayOfWeek === 2 || dayOfWeek === 5) {
          const key = `ayuno_${date}`;
          const exists = await db.events.where('generationKey').equals(key).first();
          if (!exists) {
            await db.events.add({
              id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              title: 'Culto de Ayuno y Oración',
              type: 'Ayuno',
              date,
              startTime: '10:00',
              location: settings.churchLocation || 'Templo Central',
              leaderId: null,
              preacherId: null,
              status: 'Programado',
              generationKey: key,
              createdAt: nowIso,
              updatedAt: nowIso
            });
          }
        }

        if (dayOfWeek === 0) {
          const isLastSunday = (day + 7) > daysInMonth;
          const keyDominical = isLastSunday ? `cena_senor_${date}` : `escuela_dominical_${date}`;
          const exists = await db.events.where('generationKey').equals(keyDominical).first();
          if (!exists) {
            await db.events.add({
              id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              title: isLastSunday ? 'Cena del Señor' : 'Escuela Dominical',
              type: isLastSunday ? 'Cena del Señor' : 'Escuela Dominical',
              date,
              startTime: '10:00',
              location: settings.churchLocation || 'Templo Central',
              leaderId: null,
              preacherId: null,
              breadPrayerMemberId: null,
              winePrayerMemberId: null,
              helper1Id: null,
              helper2Id: null,
              helper3Id: null,
              status: 'Programado',
              generationKey: keyDominical,
              createdAt: nowIso,
              updatedAt: nowIso
            });
          }
        }
      } else {
        if (dayOfWeek === settings.cellDay) {
          const key = `celula_${date}`;
          const exists = await db.events.where('generationKey').equals(key).first();
          if (!exists) {
            await db.events.add({
              id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              title: `Servicio de célula (${settings.cellName})`,
              type: 'Servicio de célula',
              date,
              startTime: settings.cellTime || '18:00',
              location: settings.cellLocation || 'Casa habitual',
              leaderId: null,
              preacherId: null,
              status: 'Programado',
              generationKey: key,
              createdAt: nowIso,
              updatedAt: nowIso
            });
          }
        }
      }
    }

    const allCurrentEvents = await db.events.orderBy('date').toArray();
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const targetEvents = allCurrentEvents.filter(e =>
      e.date.startsWith(ym) &&
      e.status === 'Programado' &&
      (isChurch ? e.type !== 'Servicio de célula' : e.type === 'Servicio de célula')
    );

    const activeMembers = members.filter(m => m.isActive);

    if (activeMembers.length > 0) {
      const leadCount: Record<string, number> = {};
      const preachCount: Record<string, number> = {};
      const generalCount: Record<string, number> = {};
      activeMembers.forEach(m => {
        leadCount[m.id] = 0;
        preachCount[m.id] = 0;
        generalCount[m.id] = 0;
      });

      let lastLeaderId: string | null = null;
      let lastPreacherId: string | null = null;

      const pickRandomMin = (
        candidates: Member[],
        counts: Record<string, number>,
        excludeIds: (string | null | undefined)[] = [],
        avoidConsecutiveId?: string | null
      ) => {
        const validExcludes = new Set(excludeIds.filter(Boolean));
        let pool = candidates.filter(c => !validExcludes.has(c.id));
        if (pool.length === 0) pool = candidates;

        if (pool.length > 1 && avoidConsecutiveId) {
          const withoutConsecutive = pool.filter(c => c.id !== avoidConsecutiveId);
          if (withoutConsecutive.length > 0) pool = withoutConsecutive;
        }

        if (pool.length === 0) return null;

        const minCount = Math.min(...pool.map(c => counts[c.id] || 0));
        const minCandidates = pool.filter(c => (counts[c.id] || 0) === minCount);
        const randomIndex = Math.floor(Math.random() * minCandidates.length);
        return minCandidates[randomIndex];
      };

      for (const ev of targetEvents) {
        const eligibleLeaders = activeMembers.filter(m => memberCanLead(m));
        const eligiblePreachers = activeMembers.filter(m => memberCanPreach(m));

        const chosenLeader = pickRandomMin(
          eligibleLeaders.length > 0 ? eligibleLeaders : activeMembers,
          leadCount,
          [],
          lastLeaderId
        );
        const lId = chosenLeader ? chosenLeader.id : null;
        if (lId) {
          leadCount[lId] = (leadCount[lId] || 0) + 1;
          generalCount[lId] = (generalCount[lId] || 0) + 1;
          lastLeaderId = lId;
        }

        const chosenPreacher = pickRandomMin(
          eligiblePreachers.length > 0 ? eligiblePreachers : activeMembers,
          preachCount,
          [lId],
          lastPreacherId
        );
        const pId = chosenPreacher ? chosenPreacher.id : null;
        if (pId) {
          preachCount[pId] = (preachCount[pId] || 0) + 1;
          generalCount[pId] = (generalCount[pId] || 0) + 1;
          lastPreacherId = pId;
        }

        const updates: Partial<CellEvent> = {
          leaderId: lId,
          preacherId: pId
        };

        if (ev.type === 'Cena del Señor') {
          const usedIds: (string | null)[] = [lId, pId];

          const bMem = pickRandomMin(activeMembers, generalCount, usedIds);
          if (bMem) { generalCount[bMem.id] = (generalCount[bMem.id] || 0) + 1; usedIds.push(bMem.id); }

          const wMem = pickRandomMin(activeMembers, generalCount, usedIds);
          if (wMem) { generalCount[wMem.id] = (generalCount[wMem.id] || 0) + 1; usedIds.push(wMem.id); }

          const h1 = pickRandomMin(activeMembers, generalCount, usedIds);
          if (h1) { generalCount[h1.id] = (generalCount[h1.id] || 0) + 1; usedIds.push(h1.id); }

          const h2 = pickRandomMin(activeMembers, generalCount, usedIds);
          if (h2) { generalCount[h2.id] = (generalCount[h2.id] || 0) + 1; usedIds.push(h2.id); }

          const h3 = pickRandomMin(activeMembers, generalCount, usedIds);
          if (h3) { generalCount[h3.id] = (generalCount[h3.id] || 0) + 1; usedIds.push(h3.id); }

          updates.breadPrayerMemberId = bMem ? bMem.id : null;
          updates.winePrayerMemberId = wMem ? wMem.id : null;
          updates.helper1Id = h1 ? h1.id : null;
          updates.helper2Id = h2 ? h2.id : null;
          updates.helper3Id = h3 ? h3.id : null;
        }

        await db.events.update(ev.id, updates);
      }
    }

    await loadAll();
    showMsg(`⚡ ¡Mes generado y hermanos asignados para ${isChurch ? 'la Iglesia' : 'la Célula'}!`);
  };

  const openEditEvent = (ev: CellEvent) => {
    setSelectedEvent(ev);
    setModalLeaderId(ev.leaderId || '');
    setModalPreacherId(ev.preacherId || '');
    setModalBreadId(ev.breadPrayerMemberId || '');
    setModalWineId(ev.winePrayerMemberId || '');
    setModalHelper1Id(ev.helper1Id || '');
    setModalHelper2Id(ev.helper2Id || '');
    setModalHelper3Id(ev.helper3Id || '');
    setModalLocation(ev.location || (isChurch ? settings.churchLocation : settings.cellLocation));
    setModalTime(ev.startTime || (isChurch ? '10:00' : settings.cellTime));
    setModalStatus(ev.status || 'Programado');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    await db.events.update(selectedEvent.id, {
      leaderId: modalLeaderId || null,
      preacherId: modalPreacherId || null,
      breadPrayerMemberId: modalBreadId || null,
      winePrayerMemberId: modalWineId || null,
      helper1Id: modalHelper1Id || null,
      helper2Id: modalHelper2Id || null,
      helper3Id: modalHelper3Id || null,
      location: modalLocation,
      startTime: modalTime,
      status: modalStatus
    });

    setSelectedEvent(null);
    await loadAll();
    showMsg('Culto actualizado con éxito.');
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('¿Deseas eliminar este culto?')) {
      await db.events.delete(id);
      setSelectedEvent(null);
      await loadAll();
      showMsg('Culto eliminado.');
    }
  };

  const handleShareWhatsApp = () => {
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const targetEvents = events
      .filter(e => e.date.startsWith(ym) && e.status !== 'Cancelado' && (isChurch ? e.type !== 'Servicio de célula' : e.type === 'Servicio de célula'))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

    if (targetEvents.length === 0) {
      showMsg('No hay cultos programados en este mes para compartir.');
      return;
    }

    let text = `*${isChurch ? settings.churchName.toUpperCase() : settings.cellName.toUpperCase()}*\n`;
    text += isChurch ? `📍 Dirección: ${settings.churchLocation}\n` : `${settings.territory} • ${settings.cellLocation}\n`;
    text += `*PROGRAMACIÓN MENSUAL — ${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}*\n\n`;

    const blocks = targetEvents.map(ev => {
      const lName = getMemberName(ev.leaderId) || 'Pendiente';
      const pName = getMemberName(ev.preacherId) || 'Pendiente';
      const isSunday = ev.type === 'Escuela Dominical' || ev.type === 'Cena del Señor';

      let b = `📅 *${formatFriendlyDate(ev.date)}*\n`;
      b += `*${ev.title.toUpperCase()}*\n`;

      if (isChurch && isSunday) {
        b += `📖 9:00 a. m. Curso de Bautismo\n`;
        b += `🕕 10:00 a. m. Culto General\n`;
      } else {
        b += `🕕 Hora: ${formatFriendlyTime(ev.startTime)}\n`;
      }

      b += `📍 Lugar: ${ev.location || (isChurch ? settings.churchLocation : settings.cellLocation)}\n`;
      b += `👤 Dirige: ${lName}\n`;
      b += `📖 Predica: ${pName}`;

      if (ev.type === 'Cena del Señor') {
        const breadName = getMemberName(ev.breadPrayerMemberId) || 'Pendiente';
        const wineName = getMemberName(ev.winePrayerMemberId) || 'Pendiente';
        const h1 = getMemberName(ev.helper1Id);
        const h2 = getMemberName(ev.helper2Id);
        const h3 = getMemberName(ev.helper3Id);
        const helpers = [h1, h2, h3].filter(Boolean).join(', ') || 'Pendientes';

        b += `\n🍞 *Ora por el Pan:* ${breadName}\n`;
        b += `🍷 *Ora por el Vino:* ${wineName}\n`;
        b += `🤝 *Colaboradores:* ${helpers}`;
      }

      return b;
    });

    text += blocks.join('\n\n────────────────\n\n');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const now = new Date().toISOString();

    await db.members.add({
      id: 'm_' + Date.now(),
      fullName: newMemberName.trim(),
      phone: newMemberPhone.trim() || undefined,
      canLeadCell: !isChurch ? canLeadRole : false,
      canPreachCell: !isChurch ? canPreachRole : false,
      canLeadChurch: isChurch ? canLeadRole : false,
      canPreachChurch: isChurch ? canPreachRole : false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });

    setNewMemberName('');
    setNewMemberPhone('');
    setCanLeadRole(false);
    setCanPreachRole(false);
    await loadAll();
    showMsg(`Hermano agregado para ${isChurch ? 'la Iglesia' : 'la Célula'}.`);
  };

  const openEditMember = (m: Member) => {
    setEditingMember(m);
    setEditMemberName(m.fullName);
    setEditMemberPhone(m.phone || '');
    setEditLeadRole(memberCanLead(m));
    setEditPreachRole(memberCanPreach(m));
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editMemberName.trim()) return;

    const updates: Partial<Member> = {
      fullName: editMemberName.trim(),
      phone: editMemberPhone.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    if (isChurch) {
      updates.canLeadChurch = editLeadRole;
      updates.canPreachChurch = editPreachRole;
    } else {
      updates.canLeadCell = editLeadRole;
      updates.canPreachCell = editPreachRole;
    }

    await db.members.update(editingMember.id, updates);
    setEditingMember(null);
    await loadAll();
    showMsg('¡Hermano actualizado con éxito!');
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar a ${name}?`)) {
      await db.members.delete(id);
      await loadAll();
      showMsg('Miembro eliminado.');
    }
  };

  const ymCurrent = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const visibleEvents = events.filter(e => {
    if (!e.date.startsWith(ymCurrent)) return false;
    return isChurch ? e.type !== 'Servicio de célula' : e.type === 'Servicio de célula';
  });

  // Balance Financiero
  const currentMonthFinances = finances.filter(f =>
    f.date.startsWith(ymCurrent) && f.scope === settings.entityType
  );

  const totalIngresosMes = currentMonthFinances
    .filter(f => f.type === 'ingreso')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalEgresosMes = currentMonthFinances
    .filter(f => f.type === 'egreso')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balanceNetoMes = totalIngresosMes - totalEgresosMes;

  const filteredFinancesList = currentMonthFinances
    .filter(f => finFilter === 'todos' ? true : f.type === finFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. ENCABEZADO */}
      <header style={{ background: 'linear-gradient(135deg, #0f172a, #172554)', color: '#ffffff', padding: '16px 18px', borderBottom: '3px solid #b45309', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>{isChurch ? '🏛️' : '🏠'}</span>
              <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
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

      {/* 2. CONTENIDO PRINCIPAL */}
      <main style={{ padding: '16px', flex: 1 }}>

        {/* 1. CALENDARIO */}
        {tab === 'calendario' && (
          <div>
            <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else { setCurrentMonth(m => m - 1); } }} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>◀</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  {visibleEvents.length} culto(s) en {isChurch ? 'la Iglesia' : 'la Célula'}
                </span>
              </div>
              <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else { setCurrentMonth(m => m + 1); } }} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>▶</button>
            </div>

            <button
              onClick={handleGenerateAndAssign}
              style={{
                width: '100%',
                background: isChurch ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' : 'linear-gradient(135deg, #065f46, #022c22)',
                color: '#fff',
                border: 'none',
                padding: '14px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>⚡</span>
              <span>{isChurch ? 'Generar y Asignar Mes (Iglesia)' : 'Generar y Asignar Mes (Célula)'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#fff',
                border: 'none',
                padding: '13px',
                borderRadius: '14px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>📲</span>
              <span>Compartir Programación por WhatsApp</span>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {visibleEvents.length === 0 ? (
                <div style={{ background: '#fff', padding: '32px 20px', borderRadius: '18px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', border: '1px dashed #cbd5e1' }}>
                  No hay cultos programados para este mes.<br/>
                  Pulsa arriba <strong>"⚡ Generar y Asignar Mes"</strong> para crearlos y sortearlos en 1 segundo.
                </div>
              ) : (
                visibleEvents.map(ev => {
                  const leaderName = getMemberName(ev.leaderId);
                  const preacherName = getMemberName(ev.preacherId);
                  const isCena = ev.type === 'Cena del Señor';
                  const isSunday = ev.type === 'Escuela Dominical' || isCena;

                  return (
                    <div
                      key={ev.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '18px',
                        border: isCena ? '2px solid #b45309' : isChurch ? '1px solid #e2e8f0' : '1px solid #bbf7d0',
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>📅 {formatFriendlyDate(ev.date)}</span>
                        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700, background: '#f1f5f9', padding: '3px 8px', borderRadius: '8px' }}>🕕 {formatFriendlyTime(ev.startTime)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: isCena ? '#b45309' : isChurch ? '#1e3a8a' : '#065f46' }}>
                          {isCena ? '🍷 ' + ev.title : isChurch ? '⛪ ' + ev.title : '🏠 ' + ev.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          📍 {ev.location || (isChurch ? settings.churchLocation : settings.cellLocation)}
                        </span>
                      </div>

                      {isChurch && isSunday && (
                        <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#334155', marginBottom: '10px', fontWeight: 600 }}>
                          📖 9:00 a. m. Curso de Bautismo (previo a la Escuela)
                        </div>
                      )}

                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: isCena ? '8px' : '12px' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Dirige:</span>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: leaderName ? '#0f172a' : '#d97706' }}>
                            {leaderName || '⚠️ Pendiente'}
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Predica:</span>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: preacherName ? '#0f172a' : '#d97706' }}>
                            {preacherName || '⚠️ Pendiente'}
                          </span>
                        </div>
                      </div>

                      {isCena && (
                        <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '12px', fontSize: '0.75rem' }}>
                          <div style={{ fontWeight: 800, color: '#92400e', marginBottom: '6px' }}>🍞🍷 Encargados de la Cena del Señor:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                            <div><strong>Ora por el Pan:</strong> {getMemberName(ev.breadPrayerMemberId) || '⚠️ Pendiente'}</div>
                            <div><strong>Ora por el Vino:</strong> {getMemberName(ev.winePrayerMemberId) || '⚠️ Pendiente'}</div>
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
            <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else { setCurrentMonth(m => m - 1); } }} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>◀</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Finanzas: {MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: isChurch ? '#1e40af' : '#166534', fontWeight: 700 }}>
                  {isChurch ? '🏛️ Tesorería de la Iglesia' : '🏠 Caja de Célula'}
                </span>
              </div>
              <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else { setCurrentMonth(m => m + 1); } }} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>▶</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📈</span> Entradas (Mes)
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                  {formatCurrency(totalIngresosMes)}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📉</span> Salidas (Mes)
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                  {formatCurrency(totalEgresosMes)}
                </div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', color: '#fff', padding: '16px', borderRadius: '16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 800 }}>Saldo Disponible en Caja</span>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px' }}>
                  {formatCurrency(balanceNetoMes)}
                </div>
              </div>
              <div style={{ fontSize: '2rem' }}>💰</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <button
                onClick={openNewFinanceModal}
                style={{ background: isChurch ? '#1e3a8a' : '#047857', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                + Registrar Movimiento
              </button>

              <button
                onClick={handleShareFinanceWhatsApp}
                style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                📲 Enviar WhatsApp
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'ingreso', label: 'Solo Entradas' },
                { id: 'egreso', label: 'Solo Salidas' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFinFilter(f.id as any)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: finFilter === f.id ? '#0f172a' : '#ffffff',
                    color: finFilter === f.id ? '#ffffff' : '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredFinancesList.length === 0 ? (
                <div style={{ background: '#fff', padding: '30px 20px', borderRadius: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem', border: '1px dashed #cbd5e1' }}>
                  No hay movimientos registrados en este mes.<br/>
                  Pulsa <strong>"+ Registrar Movimiento"</strong>.
                </div>
              ) : (
                filteredFinancesList.map(rec => {
                  const isIngreso = rec.type === 'ingreso';
                  const memberName = getMemberName(rec.memberId);

                  return (
                    <div
                      key={rec.id}
                      style={{
                        background: '#ffffff',
                        padding: '14px',
                        borderRadius: '14px',
                        border: isIngreso ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: isIngreso ? '#dcfce7' : '#fee2e2',
                            color: isIngreso ? '#15803d' : '#b91c1c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            fontWeight: 800
                          }}
                        >
                          {isIngreso ? '↗' : '↘'}
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                            {rec.category}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            📅 {rec.date} {memberName ? `• 👤 ${memberName}` : ''}
                          </div>
                          {rec.notes && (
                            <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '2px', fontStyle: 'italic' }}>
                              "{rec.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.96rem', color: isIngreso ? '#15803d' : '#dc2626' }}>
                          {isIngreso ? '+' : '-'} {formatCurrency(rec.amount)}
                        </div>
                        <button
                          onClick={() => handleDeleteFinanceRecord(rec.id)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', marginTop: '4px', textDecoration: 'underline' }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })
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
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar hermano por nombre o teléfono..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>

            <form onSubmit={handleAddMember} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                + Registrar Hermano ({isChurch ? 'Iglesia' : 'Célula'})
              </h3>
              <input type="text" placeholder="Nombre completo *" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required style={{ width: '100%', padding: '10px', marginBottom: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem' }} />
              <input type="text" placeholder="Teléfono (opcional)" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem' }} />

              {isChurch ? (
                <div style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '10px', marginBottom: '12px', border: '1px solid #bfdbfe' }}>
                  <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#1e40af', marginBottom: '6px' }}>
                    🏛️ Capacidades en la IGLESIA:
                  </span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={canLeadRole} onChange={e => setCanLeadRole(e.target.checked)} /> Puede dirigir</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={canPreachRole} onChange={e => setCanPreachRole(e.target.checked)} /> Puede predicar</label>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '10px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                  <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#166534', marginBottom: '6px' }}>
                    🏠 Capacidades en la CÉLULA:
                  </span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={canLeadRole} onChange={e => setCanLeadRole(e.target.checked)} /> Puede dirigir</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={canPreachRole} onChange={e => setCanPreachRole(e.target.checked)} /> Puede predicar</label>
                  </div>
                </div>
              )}

              <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '11px', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>Guardar Hermano</button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>Directorio Alfabético (A - Z):</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{filteredMembers.length} de {members.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMembers.map(m => {
                const canL = memberCanLead(m);
                const canP = memberCanPreach(m);
                const initials = getInitials(m.fullName);

                return (
                  <div key={m.id} style={{ background: '#fff', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginRight: '8px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: isChurch ? '#dbeafe' : '#dcfce7', color: isChurch ? '#1e40af' : '#166534', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {initials}
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{m.fullName}</div>
                        {m.phone && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>📞 {m.phone}</div>}

                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          {canL && (
                            <span style={{ background: isChurch ? '#eff6ff' : '#f0fdf4', color: isChurch ? '#1d4ed8' : '#15803d', border: isChurch ? '1px solid #bfdbfe' : '1px solid #bbf7d0', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              ✓ Dirige
                            </span>
                          )}
                          {canP && (
                            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              ✓ Predica
                            </span>
                          )}
                          {!canL && !canP && (
                            <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
                              Miembro
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => openEditMember(m)}
                        style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✏️ Editar
                      </button>

                      <button
                        onClick={() => handleDeleteMember(m.id, m.fullName)}
                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. AJUSTES (RESPALDO Y RESTAURACIÓN 100% VISIBLES EN PANTALLA) */}
        {tab === 'ajustes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={handleSaveSettings} style={{ background: '#fff', padding: '18px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>⚙️ Configuración del Sistema</h3>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
                  ¿Qué deseas administrar en esta aplicación?
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => setFormEntityType('iglesia')}
                    style={{
                      border: formEntityType === 'iglesia' ? '2px solid #1e40af' : '1px solid #cbd5e1',
                      background: formEntityType === 'iglesia' ? '#eff6ff' : '#ffffff',
                      padding: '12px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🏛️</div>
                    <strong style={{ display: 'block', fontSize: '0.84rem', color: formEntityType === 'iglesia' ? '#1e40af' : '#334155' }}>
                      Modo Iglesia
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Templo Central</span>
                  </div>

                  <div
                    onClick={() => setFormEntityType('celula')}
                    style={{
                      border: formEntityType === 'celula' ? '2px solid #166534' : '1px solid #cbd5e1',
                      background: formEntityType === 'celula' ? '#f0fdf4' : '#ffffff',
                      padding: '12px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🏠</div>
                    <strong style={{ display: 'block', fontSize: '0.84rem', color: formEntityType === 'celula' ? '#166534' : '#334155' }}>
                      Modo Célula
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Hogar / Territorio</span>
                  </div>
                </div>
              </div>

              {formEntityType === 'iglesia' ? (
                <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '14px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e40af', marginBottom: '10px' }}>
                    🏛️ Datos de la IGLESIA:
                  </span>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Nombre oficial de la Iglesia:</label>
                    <input type="text" value={formChurchName} onChange={e => setFormChurchName(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Dirección física del Templo Central:</label>
                    <input type="text" value={formChurchLocation} onChange={e => setFormChurchLocation(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '14px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#166534', marginBottom: '10px' }}>
                    🏠 Datos de la CÉLULA:
                  </span>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Nombre de la Célula:</label>
                    <input type="text" value={formCellName} onChange={e => setFormCellName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Territorio o Identificación:</label>
                    <input type="text" value={formTerritory} onChange={e => setFormTerritory(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Casa / Lugar de reunión:</label>
                    <input type="text" value={formCellLocation} onChange={e => setFormCellLocation(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Día de reunión:</label>
                      <select value={formCellDay} onChange={e => setFormCellDay(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        {DAY_NAMES.map((name, idx) => (
                          <option key={idx} value={idx}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Hora de reunión:</label>
                      <input type="time" value={formCellTime} onChange={e => setFormCellTime(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer' }}>
                💾 Guardar Configuración
              </button>
            </form>

            {/* SECCIÓN RESPALDOS DIRECTOS Y VISIBLES (SOLUCIÓN BLINDADA) */}
            <div style={{ background: '#fff', padding: '18px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>📦 Copias de Seguridad (Exportar y Restaurar)</h3>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '0 0 14px', lineHeight: 1.4 }}>
                Guarda una copia de tus hermanos, cultos y finanzas para no perder nada si cambias de teléfono.
              </p>

              {/* 1. EXPORTAR */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  1. EXPORTAR (Generar y Copiar)
                </span>

                <button
                  type="button"
                  onClick={handleGenerateBackupDirect}
                  style={{ width: '100%', background: '#047857', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', marginBottom: '8px' }}
                >
                  📋 GENERAR Y COPIAR RESPALDO
                </button>

                <textarea
                  id="directBackupArea"
                  readOnly
                  rows={4}
                  value={generatedBackupText}
                  placeholder="Aquí aparecerá el código de tu respaldo..."
                  style={{ width: '100%', padding: '8px', fontSize: '0.66rem', fontFamily: 'monospace', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', marginBottom: '8px', background: '#ffffff' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyGeneratedBackup}
                    disabled={!generatedBackupText}
                    style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', opacity: generatedBackupText ? 1 : 0.5 }}
                  >
                    Copiar Código
                  </button>

                  <button
                    type="button"
                    onClick={handleShareBackupWhatsApp}
                    disabled={!generatedBackupText}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', opacity: generatedBackupText ? 1 : 0.5 }}
                  >
                    📲 Enviar a WhatsApp
                  </button>
                </div>
              </div>

              {/* 2. RESTAURAR */}
              <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                  2. RESTAURAR (Recuperar tus Datos)
                </span>
                <p style={{ fontSize: '0.72rem', color: '#475569', margin: '0 0 8px' }}>
                  Pega aquí el código que copiaste anteriormente para recuperar todo:
                </p>

                <textarea
                  rows={4}
                  value={pastedRestoreText}
                  onChange={e => setPastedRestoreText(e.target.value)}
                  placeholder="Pega aquí el código de respaldo..."
                  style={{ width: '100%', padding: '8px', fontSize: '0.66rem', fontFamily: 'monospace', borderRadius: '8px', border: '1px solid #86efac', boxSizing: 'border-box', marginBottom: '8px', background: '#ffffff' }}
                />

                <button
                  type="button"
                  onClick={handleRestoreFromTextDirect}
                  disabled={!pastedRestoreText.trim()}
                  style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', opacity: pastedRestoreText.trim() ? 1 : 0.5, marginBottom: '10px' }}
                >
                  🔄 RESTAURAR TODOS LOS DATOS
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                  O si tienes el archivo en tu teléfono:
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

      {/* MODAL REGISTRAR MOVIMIENTO FINANCIERO */}
      {showFinanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 160 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              💰 Registrar Movimiento ({isChurch ? 'Iglesia' : 'Célula'})
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.74rem', color: '#64748b' }}>
              Ingresa los datos del ingreso o egreso:
            </p>

            <form onSubmit={handleSaveFinanceRecord} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setFinType('ingreso');
                    setFinCategory(isChurch ? churchIncomeCategories[0] : cellIncomeCategories[0]);
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: finType === 'ingreso' ? '2px solid #15803d' : '1px solid #cbd5e1',
                    background: finType === 'ingreso' ? '#dcfce7' : '#ffffff',
                    color: finType === 'ingreso' ? '#15803d' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  📈 Entrada (Ingreso)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFinType('egreso');
                    setFinCategory(isChurch ? churchExpenseCategories[0] : cellExpenseCategories[0]);
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: finType === 'egreso' ? '2px solid #b91c1c' : '1px solid #cbd5e1',
                    background: finType === 'egreso' ? '#fee2e2' : '#ffffff',
                    color: finType === 'egreso' ? '#b91c1c' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  📉 Salida (Gasto)
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>Monto en dinero ($) *:</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ej. 50000"
                  value={finAmount}
                  onChange={e => setFinAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>Fecha *:</label>
                <input
                  type="date"
                  required
                  value={finDate}
                  onChange={e => setFinDate(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>Concepto / Categoría *:</label>
                <select
                  value={finCategory}
                  onChange={e => setFinCategory(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  {currentCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>Hermano (Opcional / Anónimo):</label>
                <select
                  value={finMemberId}
                  onChange={e => setFinMemberId(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">(Anónimo / No especificado)</option>
                  {sortedMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>Detalle o Nota adicional:</label>
                <input
                  type="text"
                  placeholder="Ej. Recibo de energía, ofrenda especial..."
                  value={finNotes}
                  onChange={e => setFinNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowFinanceModal(false)}
                  style={{ flex: 1, padding: '11px', background: '#e2e8f0', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '11px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR HERMANO */}
      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 150 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '390px', borderRadius: '20px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>✏️ Editar Hermano</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.74rem', color: '#64748b' }}>Actualiza los datos o roles de este miembro:</p>

            <form onSubmit={handleSaveEditMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>Nombre completo *:</label>
                <input
                  type="text"
                  required
                  value={editMemberName}
                  onChange={e => setEditMemberName(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>Teléfono (opcional):</label>
                <input
                  type="text"
                  value={editMemberPhone}
                  onChange={e => setEditMemberPhone(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              {isChurch ? (
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#1e40af', marginBottom: '6px' }}>
                    🏛️ Capacidades en la IGLESIA:
                  </span>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={editLeadRole} onChange={e => setEditLeadRole(e.target.checked)} /> Puede dirigir</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={editPreachRole} onChange={e => setEditPreachRole(e.target.checked)} /> Puede predicar</label>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#166534', marginBottom: '6px' }}>
                    🏠 Capacidades en la CÉLULA:
                  </span>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={editLeadRole} onChange={e => setEditLeadRole(e.target.checked)} /> Puede dirigir</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={editPreachRole} onChange={e => setEditPreachRole(e.target.checked)} /> Puede predicar</label>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  style={{ flex: 1, padding: '11px', background: '#e2e8f0', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '11px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE CULTO */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800 }}>Asignar Responsables</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.74rem', color: '#64748b' }}>📅 {formatFriendlyDate(selectedEvent.date)} — <strong>{selectedEvent.title}</strong></p>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>👤 Quién Dirige:</label>
                <select value={modalLeaderId} onChange={e => setModalLeaderId(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="">(Pendiente)</option>
                  {sortedMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} {memberCanLead(m) ? '✓' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>📖 Quién Predica:</label>
                <select value={modalPreacherId} onChange={e => setModalPreacherId(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="">(Pendiente)</option>
                  {sortedMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} {memberCanPreach(m) ? '✓' : ''}</option>
                  ))}
                </select>
              </div>

              {selectedEvent.type === 'Cena del Señor' && (
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e' }}>🍞🍷 Asignaciones de la Cena del Señor:</span>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🍞 Ora por el Pan:</label>
                    <select value={modalBreadId} onChange={e => setModalBreadId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🍷 Ora por el Vino:</label>
                    <select value={modalWineId} onChange={e => setModalWineId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🤝 Colaborador 1:</label>
                    <select value={modalHelper1Id} onChange={e => setModalHelper1Id(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🤝 Colaborador 2:</label>
                    <select value={modalHelper2Id} onChange={e => setModalHelper2Id(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🤝 Colaborador 3:</label>
                    <select value={modalHelper3Id} onChange={e => setModalHelper3Id(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {sortedMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>📍 Lugar:</label>
                <input type="text" value={modalLocation} onChange={e => setModalLocation(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>🕕 Hora:</label>
                <input type="time" value={modalTime} onChange={e => setModalTime(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>Estado:</label>
                <select value={modalStatus} onChange={e => setModalStatus(e.target.value as any)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="Programado">Programado</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setSelectedEvent(null)} style={{ flex: 1, background: '#e2e8f0', color: '#1e293b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
                  Cerrar
                </button>
                <button type="submit" style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
                  Guardar
                </button>
              </div>

              <button type="button" onClick={() => handleDeleteEvent(selectedEvent.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.74rem', marginTop: '6px', cursor: 'pointer', textAlign: 'center' }}>
                Eliminar este culto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. BARRA DE NAVEGACIÓN INFERIOR (5 PESTAÑAS) */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '8px 0', maxWidth: '480px', margin: '0 auto', zIndex: 50, boxShadow: '0 -2px 10px rgba(0,0,0,0.03)' }}>
        {[
          { id: 'calendario', label: 'Calendario', icon: '📅' },
          { id: 'finanzas', label: 'Finanzas', icon: '💰' },
          { id: 'inicio', label: 'Inicio', icon: '🏠' },
          { id: 'miembros', label: 'Miembros', icon: '👥' },
          { id: 'ajustes', label: 'Ajustes', icon: '⚙️' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as any)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: tab === item.id ? (isChurch ? '#1e40af' : '#166534') : '#94a3b8',
              fontWeight: tab === item.id ? 800 : 600,
              fontSize: '0.7rem',
              cursor: 'pointer',
              padding: '4px 6px'
            }}
          >
            <span style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}