import React, { useState, useEffect } from 'react';
import { db, DEFAULT_SETTINGS } from './db';
import { Member, CellEvent, AppSettings } from './types';
import { getWednesdaysOfMonth, MONTH_NAMES } from './services/dateUtils';

export default function App() {
  const [tab, setTab] = useState<'calendario' | 'inicio' | 'miembros' | 'ajustes'>('calendario');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CellEvent[]>([]);

  // Mes visible en calendario
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Formulario de Ajustes
  const [formCellName, setFormCellName] = useState('');
  const [formTerritory, setFormTerritory] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formTime, setFormTime] = useState('18:00');

  // Modal de asignación / edición de culto
  const [selectedEvent, setSelectedEvent] = useState<CellEvent | null>(null);
  const [modalLeaderId, setModalLeaderId] = useState<string>('');
  const [modalPreacherId, setModalPreacherId] = useState<string>('');
  const [modalLocation, setModalLocation] = useState<string>('');
  const [modalTime, setModalTime] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<'Programado' | 'Realizado' | 'Cancelado'>('Programado');

  // Formulario de nuevo miembro
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [canLead, setCanLead] = useState(false);
  const [canPreach, setCanPreach] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = async () => {
    let s = await db.settings.get('cell_settings');
    if (!s) {
      s = DEFAULT_SETTINGS;
      await db.settings.put(DEFAULT_SETTINGS);
    }
    setSettings(s);
    setFormCellName(s.cellName);
    setFormTerritory(s.territory);
    setFormLocation(s.defaultLocation);
    setFormTime(s.defaultTime);

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

  const getMemberName = (id: string | null) => {
    if (!id) return null;
    const m = members.find(x => x.id === id);
    return m ? m.fullName : null;
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
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `${dayNames[dt.getDay()]} ${d} de ${MONTH_NAMES[m - 1]}`;
  };

  // 1. Guardar Ajustes
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCellName.trim()) {
      showMsg('El nombre de la célula es obligatorio.');
      return;
    }
    const updated: AppSettings = {
      id: 'cell_settings',
      cellName: formCellName.trim(),
      territory: formTerritory.trim(),
      defaultLocation: formLocation.trim(),
      defaultTime: formTime,
      updatedAt: new Date().toISOString()
    };
    await db.settings.put(updated);
    setSettings(updated);
    showMsg('¡Ajustes guardados correctamente!');
  };

  // Exportar Copia de Seguridad JSON
  const handleExportBackup = async () => {
    const data = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings,
      members,
      events
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Copia_LaVerdadDeCristo_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMsg('Copia de seguridad descargada.');
  };

  // Restaurar Copia de Seguridad JSON
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed.settings || !Array.isArray(parsed.members) || !Array.isArray(parsed.events)) {
          showMsg('El archivo no contiene un formato de respaldo válido.');
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
          showMsg('¡Copia de seguridad restaurada con éxito!');
        }
      } catch {
        showMsg('Error al procesar el archivo.');
      }
    };
    reader.readAsText(file);
  };

  // 2. Generar Miércoles del mes
  const handleGenerateMonth = async () => {
    const weds = getWednesdaysOfMonth(currentYear, currentMonth);
    let count = 0;
    for (const date of weds) {
      const key = `servicio_miercoles_${date}`;
      const exists = await db.events.where('generationKey').equals(key).first();
      if (!exists) {
        await db.events.add({
          id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          title: 'Servicio de célula',
          type: 'Servicio de célula',
          date,
          startTime: settings.defaultTime || '18:00',
          location: settings.defaultLocation || 'Casa habitual',
          leaderId: null,
          preacherId: null,
          status: 'Programado',
          origin: 'Generado',
          generationKey: key,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        count++;
      }
    }
    await loadAll();
    showMsg(`Se generaron ${count} cultos para ${MONTH_NAMES[currentMonth]} ${currentYear}.`);
  };

  // 3. Asignación automática equitativa
  const handleAutoAssign = async () => {
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthEvents = events.filter(e => e.date.startsWith(ym) && e.status === 'Programado');
    const activeLeaders = members.filter(m => m.isActive && m.canLead);
    const activePreachers = members.filter(m => m.isActive && m.canPreach);

    if (activeLeaders.length === 0 && activePreachers.length === 0) {
      showMsg('Agrega miembros con capacidades de dirigir o predicar primero.');
      return;
    }

    const leadCount: Record<string, number> = {};
    const preachCount: Record<string, number> = {};
    activeLeaders.forEach(m => { leadCount[m.id] = 0; });
    activePreachers.forEach(m => { preachCount[m.id] = 0; });

    let assignedCount = 0;

    for (const ev of monthEvents) {
      let lId = ev.leaderId;
      let pId = ev.preacherId;

      if (!lId && activeLeaders.length > 0) {
        const sorted = [...activeLeaders].sort((a, b) => (leadCount[a.id] || 0) - (leadCount[b.id] || 0));
        lId = sorted[0].id;
        leadCount[lId] = (leadCount[lId] || 0) + 1;
      }

      if (!pId && activePreachers.length > 0) {
        const eligible = activePreachers.filter(m => m.id !== lId);
        const candidates = eligible.length > 0 ? eligible : activePreachers;
        const sorted = [...candidates].sort((a, b) => (preachCount[a.id] || 0) - (preachCount[b.id] || 0));
        pId = sorted[0].id;
        preachCount[pId] = (preachCount[pId] || 0) + 1;
      }

      if (lId !== ev.leaderId || pId !== ev.preacherId) {
        await db.events.update(ev.id, {
          leaderId: lId,
          preacherId: pId,
          updatedAt: new Date().toISOString()
        });
        assignedCount++;
      }
    }

    await loadAll();
    showMsg(`Se asignaron responsables en ${assignedCount} cultos.`);
  };

  // 4. Modal de edición manual de culto
  const openEditEvent = (ev: CellEvent) => {
    setSelectedEvent(ev);
    setModalLeaderId(ev.leaderId || '');
    setModalPreacherId(ev.preacherId || '');
    setModalLocation(ev.location || settings.defaultLocation);
    setModalTime(ev.startTime || settings.defaultTime);
    setModalStatus(ev.status || 'Programado');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (modalLeaderId && modalPreacherId && modalLeaderId === modalPreacherId) {
      if (!window.confirm('Has elegido al mismo hermano para dirigir y predicar. ¿Deseas mantenerlo?')) {
        return;
      }
    }

    await db.events.update(selectedEvent.id, {
      leaderId: modalLeaderId || null,
      preacherId: modalPreacherId || null,
      location: modalLocation,
      startTime: modalTime,
      status: modalStatus,
      updatedAt: new Date().toISOString()
    });

    setSelectedEvent(null);
    await loadAll();
    showMsg('Culto actualizado con éxito.');
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('¿Deseas eliminar este culto de la lista?')) {
      await db.events.delete(id);
      setSelectedEvent(null);
      await loadAll();
      showMsg('Culto eliminado.');
    }
  };

  // 5. EXCLUSIVO: Compartir la programación completa del mes por WhatsApp
  const handleShareMonth = () => {
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthEvents = events
      .filter(e => e.date.startsWith(ym) && e.status !== 'Cancelado')
      .sort((a, b) => a.date.localeCompare(b.date));

    if (monthEvents.length === 0) {
      showMsg('No hay cultos programados en este mes. Pulsa "Generar Miércoles".');
      return;
    }

    let text = `*${settings.cellName.toUpperCase()}*\n`;
    text += `${settings.territory}\n`;
    text += `*CALENDARIO — ${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}*\n\n`;

    const blocks = monthEvents.map(ev => {
      const lName = getMemberName(ev.leaderId) || 'Pendiente';
      const pName = getMemberName(ev.preacherId) || 'Pendiente';

      let b = `📅 *${formatFriendlyDate(ev.date)}*\n`;
      b += `*${ev.title}*\n`;
      b += `🕕 Hora: ${formatFriendlyTime(ev.startTime)}\n`;
      b += `📍 Lugar: ${ev.location || settings.defaultLocation || 'Casa habitual'}\n`;
      b += `👤 Dirige: ${lName}\n`;
      b += `📖 Predica: ${pName}`;
      return b;
    });

    text += blocks.join('\n\n────────────────\n\n');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // 6. Miembros
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const now = new Date().toISOString();
    await db.members.add({
      id: 'm_' + Date.now(),
      fullName: newMemberName.trim(),
      phone: newMemberPhone.trim() || undefined,
      canLead,
      canPreach,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });
    setNewMemberName('');
    setNewMemberPhone('');
    setCanLead(false);
    setCanPreach(false);
    await loadAll();
    showMsg('Hermano agregado al directorio.');
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar a ${name}?`)) {
      await db.members.delete(id);
      await loadAll();
      showMsg('Miembro eliminado.');
    }
  };

  const ymCurrent = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const currentMonthEvents = events.filter(e => e.date.startsWith(ymCurrent));

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f1f5f9', paddingBottom: '75px', display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado */}
      <header style={{ background: '#0f172a', color: '#ffffff', padding: '12px 16px', borderBottom: '3px solid #b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{settings.cellName}</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>{settings.territory}</p>
        </div>
        <span style={{ fontSize: '0.7rem', background: '#1e293b', padding: '4px 8px', borderRadius: '6px', color: '#cbd5e1' }}>Territorio local</span>
      </header>

      {notice && (
        <div style={{ background: '#172554', color: '#fff', padding: '9px 12px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
          {notice}
        </div>
      )}

      {/* Contenido según pestaña */}
      <main style={{ padding: '14px', flex: 1 }}>

        {/* 1. CALENDARIO */}
        {tab === 'calendario' && (
          <div>
            {/* Navegación del mes */}
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else { setCurrentMonth(m => m - 1); } }} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>◀</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{currentMonthEvents.length} culto(s) programados</span>
              </div>
              <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else { setCurrentMonth(m => m + 1); } }} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>▶</button>
            </div>

            {/* Acciones principales del mes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <button onClick={handleGenerateMonth} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                ⚡ Generar Miércoles
              </button>
              <button onClick={handleAutoAssign} style={{ background: '#b45309', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                🎯 Asignar Hermanos
              </button>
            </div>

            {/* Botón Principal para Compartir Todo el Mes */}
            <button
              onClick={handleShareMonth}
              style={{
                width: '100%',
                background: '#059669',
                color: '#fff',
                border: 'none',
                padding: '13px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 6px rgba(5, 150, 105, 0.25)'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>📲</span>
              <span>Compartir Programación del Mes por WhatsApp</span>
            </button>

            {/* Lista de cultos con Dirige y Predica explícitos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentMonthEvents.length === 0 ? (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No hay cultos programados para este mes.<br/>Pulsa <strong>"⚡ Generar Miércoles"</strong> arriba para crearlos.
                </div>
              ) : (
                currentMonthEvents.map(ev => {
                  const leaderName = getMemberName(ev.leaderId);
                  const preacherName = getMemberName(ev.preacherId);

                  return (
                    <div key={ev.id} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>📅 {formatFriendlyDate(ev.date)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>🕕 {formatFriendlyTime(ev.startTime)}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '10px' }}>
                        📍 {ev.location || settings.defaultLocation}
                      </div>

                      {/* Tarjeta de Responsables explícitos */}
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
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

                      {/* Botón único para asignar o editar culto */}
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
              <span style={{ fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700 }}>Resumen de Célula</span>
              <h2 style={{ margin: '6px 0', fontSize: '1.2rem' }}>{settings.cellName}</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>{settings.territory} • {settings.defaultLocation}</p>
              <button onClick={() => setTab('calendario')} style={{ marginTop: '14px', background: '#b45309', border: 'none', color: '#fff', padding: '9px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                📅 Abrir Calendario y Asignaciones
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hermanos registrados</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{members.length}</p>
              </div>
              <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cultos este mes</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{currentMonthEvents.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. MIEMBROS */}
        {tab === 'miembros' && (
          <div>
            <form onSubmit={handleAddMember} style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 800 }}>+ Registrar Hermano</h3>
              <input type="text" placeholder="Nombre completo *" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required style={{ width: '100%', padding: '9px', marginBottom: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="text" placeholder="Teléfono (opcional)" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} style={{ width: '100%', padding: '9px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Capacidades asignables:</span>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                  <label><input type="checkbox" checked={canLead} onChange={e => setCanLead(e.target.checked)} /> Puede dirigir</label>
                  <label><input type="checkbox" checked={canPreach} onChange={e => setCanPreach(e.target.checked)} /> Puede predicar</label>
                </div>
              </div>

              <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Guardar en Directorio</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map(m => (
                <div key={m.id} style={{ background: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{m.fullName}</div>
                    {m.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {m.phone}</div>}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      {m.canLead && <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>✓ Dirige</span>}
                      {m.canPreach && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>✓ Predica</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMember(m.id, m.fullName)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. AJUSTES EDITABLES */}
        {tab === 'ajustes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <form onSubmit={handleSaveSettings} style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>⚙️ Configurar Célula</h3>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Nombre de la Célula:</label>
                <input type="text" value={formCellName} onChange={e => setFormCellName(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Identificación / Territorio:</label>
                <input type="text" value={formTerritory} onChange={e => setFormTerritory(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Lugar habitual de reunión:</label>
                <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Hora habitual de los Miércoles:</label>
                <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                💾 Guardar Cambios
              </button>
            </form>

            <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: 800 }}>📦 Copias de Seguridad</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>Exporta tus datos periódicamente para no perderlos si cambias de teléfono.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button type="button" onClick={handleExportBackup} style={{ width: '100%', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  📥 Descargar Copia de Seguridad (JSON)
                </button>

                <label style={{ width: '100%', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box', display: 'block' }}>
                  📤 Restaurar desde Archivo JSON
                  <input type="file" accept=".json" onChange={handleRestoreBackup} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5 }}>
              🔒 <strong>Privacidad local:</strong> Todos los datos se almacenan exclusivamente en la memoria de este teléfono mediante IndexedDB. La app no envía datos a ningún servidor externo.
            </div>
          </div>
        )}
      </main>

      {/* Modal de Asignación / Edición */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '380px', borderRadius: '16px', padding: '18px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>Asignar Responsables</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.75rem', color: '#64748b' }}>📅 {formatFriendlyDate(selectedEvent.date)}</p>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>👤 Quién Dirige:</label>
                <select value={modalLeaderId} onChange={e => setModalLeaderId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">(Pendiente)</option>
                  {members.filter(m => m.canLead).map(m => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>📖 Quién Predica:</label>
                <select value={modalPreacherId} onChange={e => setModalPreacherId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">(Pendiente)</option>
                  {members.filter(m => m.canPreach).map(m => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>

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