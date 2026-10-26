import React, { useState, useEffect } from 'react';
import { db, DEFAULT_SETTINGS } from './db';
import { Member, CellEvent, AppSettings } from './types';
import { MONTH_NAMES } from './services/dateUtils';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function App() {
  const [tab, setTab] = useState<'calendario' | 'inicio' | 'miembros' | 'ajustes'>('calendario');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CellEvent[]>([]);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Formulario en Ajustes
  const [formEntityType, setFormEntityType] = useState<'iglesia' | 'celula'>('iglesia');
  const [formChurchName, setFormChurchName] = useState('LEHV-La catedral del Avivamiento');
  const [formChurchLocation, setFormChurchLocation] = useState('');
  const [formCellName, setFormCellName] = useState('');
  const [formTerritory, setFormTerritory] = useState('');
  const [formCellLocation, setFormCellLocation] = useState('');
  const [formCellDay, setFormCellDay] = useState(3);
  const [formCellTime, setFormCellTime] = useState('18:00');

  // Respaldos
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');

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

  // Formulario de Miembro (contextual al modo activo)
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [canLeadRole, setCanLeadRole] = useState(false);
  const [canPreachRole, setCanPreachRole] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = async () => {
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
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showMsg = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const getMemberName = (id: string | null | undefined) => {
    if (!id) return null;
    const m = members.find(x => x.id === id);
    return m ? m.fullName : null;
  };

  const isChurch = settings.entityType === 'iglesia';

  // Evaluar capacidades según el modo configurado
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

  // Respaldos
  const handleExportBackup = async () => {
    try {
      const data = {
        schemaVersion: 3,
        exportedAt: new Date().toISOString(),
        settings,
        members,
        events
      };
      const jsonStr = JSON.stringify(data, null, 2);

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Copia_${isChurch ? 'Iglesia' : 'Celula'}.json`,
            text: jsonStr
          });
          showMsg('Copia exportada con éxito.');
          return;
        } catch (e: any) {
          if (e.name === 'AbortError') return;
        }
      }

      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Copia_${new Date().toISOString().substring(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMsg('Archivo descargado.');
      } catch {
        await navigator.clipboard.writeText(jsonStr);
        showMsg('Copia JSON copiada al portapapeles.');
      }
    } catch {
      showMsg('Error al exportar.');
    }
  };

  const processRestoreObject = async (parsed: any) => {
    if (!parsed.settings || !Array.isArray(parsed.members) || !Array.isArray(parsed.events)) {
      showMsg('El archivo no contiene un formato válido.');
      return;
    }
    if (window.confirm('¿Deseas restaurar esta copia? Reemplazará los datos actuales.')) {
      await db.transaction('rw', [db.settings, db.members, db.events], async () => {
        await db.settings.clear();
        await db.members.clear();
        await db.events.clear();
        await db.settings.put(parsed.settings);
        if (parsed.members.length > 0) await db.members.bulkAdd(parsed.members);
        if (parsed.events.length > 0) await db.events.bulkAdd(parsed.events);
      });
      await loadAll();
      showMsg('¡Copia restaurada con éxito!');
      setShowPasteModal(false);
      setPastedJsonText('');
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        await processRestoreObject(parsed);
      } catch {
        showMsg('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleRestorePastedText = async () => {
    try {
      const parsed = JSON.parse(pastedJsonText);
      await processRestoreObject(parsed);
    } catch {
      showMsg('El texto ingresado no es un JSON válido.');
    }
  };

  // UN SOLO BOTÓN: Generar cultos y sortear
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

  // 6. REGISTRO DE MIEMBRO ESTRICTAMENTE CONTEXTUAL
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const now = new Date().toISOString();

    await db.members.add({
      id: 'm_' + Date.now(),
      fullName: newMemberName.trim(),
      phone: newMemberPhone.trim() || undefined,
      // Si estamos en Célula: solo guardamos capacidades de Célula
      canLeadCell: !isChurch ? canLeadRole : false,
      canPreachCell: !isChurch ? canPreachRole : false,
      // Si estamos en Iglesia: solo guardamos capacidades de Iglesia
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

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', paddingBottom: '75px', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. ENCABEZADO */}
      <header style={{ background: '#0f172a', color: '#ffffff', padding: '14px 16px', borderBottom: '3px solid #b45309' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
              {isChurch ? settings.churchName : settings.cellName}
            </h1>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#f59e0b', fontWeight: 600 }}>
              {isChurch ? settings.churchLocation : `${settings.territory} • ${settings.cellLocation}`}
            </p>
          </div>
          <span style={{ fontSize: '0.68rem', background: isChurch ? '#1e40af' : '#166534', padding: '4px 8px', borderRadius: '6px', color: '#fff', fontWeight: 700 }}>
            {isChurch ? 'IGLESIA' : 'CÉLULA'}
          </span>
        </div>
      </header>

      {notice && (
        <div style={{ background: '#172554', color: '#fff', padding: '9px 12px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
          {notice}
        </div>
      )}

      {/* 2. CONTENIDO PRINCIPAL */}
      <main style={{ padding: '14px', flex: 1 }}>

        {/* 1. CALENDARIO */}
        {tab === 'calendario' && (
          <div>
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else { setCurrentMonth(m => m - 1); } }} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>◀</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>
                  {visibleEvents.length} actividad(es) de {isChurch ? 'la Iglesia' : 'la Célula'}
                </span>
              </div>
              <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else { setCurrentMonth(m => m + 1); } }} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>▶</button>
            </div>

            <button
              onClick={handleGenerateAndAssign}
              style={{
                width: '100%',
                background: isChurch ? '#1e3a8a' : '#065f46',
                color: '#fff',
                border: 'none',
                padding: '13px',
                borderRadius: '11px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
              }}
            >
              <span>⚡</span>
              <span>{isChurch ? 'Generar y Asignar Mes (Iglesia)' : 'Generar y Asignar Mes (Célula)'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              style={{
                width: '100%',
                background: '#059669',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '11px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 6px rgba(0,0,0,0.1)'
              }}
            >
              <span>📲</span>
              <span>Compartir Programación por WhatsApp</span>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {visibleEvents.length === 0 ? (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No hay cultos programados en este mes.<br/>
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
                        borderRadius: '12px',
                        border: isCena ? '2px solid #b45309' : '1px solid #cbd5e1',
                        padding: '14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>📅 {formatFriendlyDate(ev.date)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>🕕 {formatFriendlyTime(ev.startTime)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isCena ? '#b45309' : '#1e3a8a' }}>
                          {isCena ? '🍷 ' + ev.title : ev.title}
                        </span>
                        <span style={{ fontSize: '0.68rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>
                          {ev.location || (isChurch ? settings.churchLocation : settings.cellLocation)}
                        </span>
                      </div>

                      {isChurch && isSunday && (
                        <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem', color: '#475569', marginBottom: '8px', fontWeight: 600 }}>
                          📖 9:00 a. m. Curso de Bautismo (previo a la Escuela)
                        </div>
                      )}

                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: isCena ? '8px' : '10px' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Dirige:</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: leaderName ? '#1e3a8a' : '#d97706' }}>
                            {leaderName || '⚠️ Pendiente'}
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Predica:</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: preacherName ? '#1e3a8a' : '#d97706' }}>
                            {preacherName || '⚠️ Pendiente'}
                          </span>
                        </div>
                      </div>

                      {isCena && (
                        <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '10px', fontSize: '0.75rem' }}>
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

                      <button onClick={() => openEditEvent(ev)} style={{ width: '100%', background: '#1e293b', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                        ✏️ Asignar Hermanos / Editar
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 2. INICIO */}
        {tab === 'inicio' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #172554)', color: '#fff', padding: '18px', borderRadius: '16px', marginBottom: '16px', border: '1px solid #b45309' }}>
              <span style={{ fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700 }}>
                {isChurch ? 'Iglesia Activa' : 'Célula Activa'}
              </span>
              <h2 style={{ margin: '6px 0', fontSize: '1.2rem' }}>
                {isChurch ? settings.churchName : settings.cellName}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                {isChurch ? settings.churchLocation : `${settings.territory} • ${settings.cellLocation}`}
              </p>
              <button onClick={() => setTab('calendario')} style={{ marginTop: '14px', background: '#b45309', border: 'none', color: '#fff', padding: '9px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                📅 Ver Calendario
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hermanos en lista</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{members.length}</p>
              </div>
              <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cultos este mes</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{visibleEvents.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. MIEMBROS (ESTRICTAMENTE CONTEXTUAL) */}
        {tab === 'miembros' && (
          <div>
            <form onSubmit={handleAddMember} style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 800 }}>
                + Registrar Hermano ({isChurch ? 'Iglesia' : 'Célula'})
              </h3>
              <input type="text" placeholder="Nombre completo *" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required style={{ width: '100%', padding: '9px', marginBottom: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="text" placeholder="Teléfono (opcional)" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} style={{ width: '100%', padding: '9px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />

              {/* SI ES IGLESIA: SOLO CAPACIDADES DE IGLESIA */}
              {isChurch ? (
                <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #bfdbfe' }}>
                  <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#1e40af', marginBottom: '6px' }}>
                    🏛️ Capacidades en la IGLESIA:
                  </span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                    <label><input type="checkbox" checked={canLeadRole} onChange={e => setCanLeadRole(e.target.checked)} /> Puede dirigir en la iglesia</label>
                    <label><input type="checkbox" checked={canPreachRole} onChange={e => setCanPreachRole(e.target.checked)} /> Puede predicar en la iglesia</label>
                  </div>
                </div>
              ) : (
                /* SI ES CÉLULA: SOLO CAPACIDADES DE CÉLULA */
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                  <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#166534', marginBottom: '6px' }}>
                    🏠 Capacidades en la CÉLULA:
                  </span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                    <label><input type="checkbox" checked={canLeadRole} onChange={e => setCanLeadRole(e.target.checked)} /> Puede dirigir en la célula</label>
                    <label><input type="checkbox" checked={canPreachRole} onChange={e => setCanPreachRole(e.target.checked)} /> Puede predicar en la célula</label>
                  </div>
                </div>
              )}

              <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Guardar Hermano</button>
            </form>

            {/* Listado de Miembros contextual */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map(m => {
                const canL = memberCanLead(m);
                const canP = memberCanPreach(m);

                return (
                  <div key={m.id} style={{ background: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{m.fullName}</div>
                      {m.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {m.phone}</div>}

                      {/* Solo etiquetas pertinentes */}
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {canL && (
                          <span style={{ background: isChurch ? '#dbeafe' : '#dcfce7', color: isChurch ? '#1e40af' : '#166534', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            ✓ Dirige
                          </span>
                        )}
                        {canP && (
                          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
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
                    <button onClick={() => handleDeleteMember(m.id, m.fullName)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                      Eliminar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. AJUSTES CONFIGURABLES */}
        {tab === 'ajustes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <form onSubmit={handleSaveSettings} style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>⚙️ Configuración del Sistema</h3>

              {/* Selector de Entidad */}
              <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  ¿Qué deseas administrar en esta app?
                </span>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="entityType"
                      value="iglesia"
                      checked={formEntityType === 'iglesia'}
                      onChange={() => setFormEntityType('iglesia')}
                    />
                    🏛️ Iglesia
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="entityType"
                      value="celula"
                      checked={formEntityType === 'celula'}
                      onChange={() => setFormEntityType('celula')}
                    />
                    🏠 Célula
                  </label>
                </div>
              </div>

              {formEntityType === 'iglesia' ? (
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '14px' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e40af', marginBottom: '8px' }}>
                    🏛️ Datos de la IGLESIA:
                  </span>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Nombre oficial de la Iglesia:</label>
                    <input type="text" value={formChurchName} onChange={e => setFormChurchName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Dirección física del Templo Central:</label>
                    <input type="text" value={formChurchLocation} onChange={e => setFormChurchLocation(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '14px' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                    🏠 Datos de la CÉLULA:
                  </span>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Nombre de la Célula:</label>
                    <input type="text" value={formCellName} onChange={e => setFormCellName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Territorio o Identificación:</label>
                    <input type="text" value={formTerritory} onChange={e => setFormTerritory(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Casa / Lugar de reunión:</label>
                    <input type="text" value={formCellLocation} onChange={e => setFormCellLocation(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Día de reunión:</label>
                      <select value={formCellDay} onChange={e => setFormCellDay(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        {DAY_NAMES.map((name, idx) => (
                          <option key={idx} value={idx}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Hora de reunión:</label>
                      <input type="time" value={formCellTime} onChange={e => setFormCellTime(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer' }}>
                💾 Guardar Configuración
              </button>
            </form>

            <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: 800 }}>📦 Copias de Seguridad (JSON)</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>Guarda tu respaldo en Google Drive, WhatsApp o en tu teléfono.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  style={{ width: '100%', background: '#047857', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  📥 Guardar / Compartir Copia JSON
                </button>

                <label style={{ width: '100%', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box', display: 'block' }}>
                  📤 Restaurar desde Archivo .json
                  <input type="file" accept=".json" onChange={handleRestoreFile} style={{ display: 'none' }} />
                </label>

                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  style={{ width: '100%', background: '#f8fafc', color: '#475569', border: '1px dashed #cbd5e1', padding: '9px', borderRadius: '8px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  📋 O Restaurar pegando texto JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal para pegar texto JSON */}
      {showPasteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 120 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '380px', borderRadius: '16px', padding: '18px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 800 }}>Pegar Respaldo JSON</h3>
            <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: '#64748b' }}>Pega el texto de tu respaldo JSON:</p>
            <textarea
              rows={8}
              value={pastedJsonText}
              onChange={e => setPastedJsonText(e.target.value)}
              placeholder='{"schemaVersion": 3, ...}'
              style={{ width: '100%', padding: '8px', fontSize: '0.7rem', fontFamily: 'monospace', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowPasteModal(false)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleRestorePastedText} style={{ flex: 1, padding: '10px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Asignación / Edición */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '18px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>Asignar Responsables</h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: '#64748b' }}>📅 {formatFriendlyDate(selectedEvent.date)} — <strong>{selectedEvent.title}</strong></p>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>👤 Quién Dirige:</label>
                <select value={modalLeaderId} onChange={e => setModalLeaderId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">(Pendiente)</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} {memberCanLead(m) ? '✓' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>📖 Quién Predica:</label>
                <select value={modalPreacherId} onChange={e => setModalPreacherId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">(Pendiente)</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} {memberCanPreach(m) ? '✓' : ''}</option>
                  ))}
                </select>
              </div>

              {selectedEvent.type === 'Cena del Señor' && (
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e' }}>🍞🍷 Asignaciones de la Cena del Señor:</span>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🍞 Ora por el Pan:</label>
                    <select value={modalBreadId} onChange={e => setModalBreadId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🍷 Ora por el Vino:</label>
                    <select value={modalWineId} onChange={e => setModalWineId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🤝 Colaborador 1:</label>
                    <select value={modalHelper1Id} onChange={e => setModalHelper1Id(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🤝 Colaborador 2:</label>
                    <select value={modalHelper2Id} onChange={e => setModalHelper2Id(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>🤝 Colaborador 3:</label>
                    <select value={modalHelper3Id} onChange={e => setModalHelper3Id(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">(Pendiente)</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>📍 Lugar:</label>
                <input type="text" value={modalLocation} onChange={e => setModalLocation(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>🕕 Hora:</label>
                <input type="time" value={modalTime} onChange={e => setModalTime(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>Estado:</label>
                <select value={modalStatus} onChange={e => setModalStatus(e.target.value as any)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="Programado">Programado</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setSelectedEvent(null)} style={{ flex: 1, background: '#e2e8f0', color: '#1e293b', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  Cerrar
                </button>
                <button type="submit" style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  Guardar
                </button>
              </div>

              <button type="button" onClick={() => handleDeleteEvent(selectedEvent.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', marginTop: '6px', cursor: 'pointer', textAlign: 'center' }}>
                Eliminar este culto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barra de Navegación Inferior */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-around', padding: '8px 0', maxWidth: '480px', margin: '0 auto', zIndex: 50 }}>
        {[
          { id: 'calendario', label: 'Calendario', icon: '📅' },
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
              color: tab === item.id ? '#0f172a' : '#94a3b8',
              fontWeight: tab === item.id ? 800 : 500,
              fontSize: '0.72rem',
              cursor: 'pointer'
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