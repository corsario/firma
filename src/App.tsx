import React, { useState, useEffect } from 'react';
import { db, DEFAULT_SETTINGS } from './db';
import { Member, CellEvent, AppSettings } from './types';
import { getWednesdaysOfMonth, MONTH_NAMES } from './services/dateUtils';

export default function App() {
  const [tab, setTab] = useState<'inicio' | 'miembros' | 'calendario' | 'ajustes'>('calendario');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CellEvent[]>([]);

  // Mes seleccionado para el calendario
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Modal de edición / asignación de culto
  const [selectedEvent, setSelectedEvent] = useState<CellEvent | null>(null);
  const [modalLeaderId, setModalLeaderId] = useState<string>('');
  const [modalPreacherId, setModalPreacherId] = useState<string>('');
  const [modalLocation, setModalLocation] = useState<string>('');
  const [modalTime, setModalTime] = useState<string>('');

  // Formulario de nuevo miembro
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [canLead, setCanLead] = useState(false);
  const [canPreach, setCanPreach] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = async () => {
    const s = await db.settings.get('cell_settings');
    if (s) setSettings(s);
    else await db.settings.put(DEFAULT_SETTINGS);

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

  // 1. Generar los miércoles del mes visible
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
          location: settings.defaultLocation,
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
    showMsg(`Se generaron ${count} servicios para ${MONTH_NAMES[currentMonth]} ${currentYear}.`);
  };

  // 2. Asignación automática equitativa (quién menos ha hecho, sin repetir el mismo día)
  const handleAutoAssign = async () => {
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthEvents = events.filter(e => e.date.startsWith(ym) && e.status === 'Programado');
    const activeLeaders = members.filter(m => m.isActive && m.canLead);
    const activePreachers = members.filter(m => m.isActive && m.canPreach);

    if (activeLeaders.length === 0 && activePreachers.length === 0) {
      showMsg('Agrega miembros con capacidades de dirigir o predicar primero.');
      return;
    }

    // Contadores del mes para repartir parejo
    const leadCount: Record<string, number> = {};
    const preachCount: Record<string, number> = {};
    activeLeaders.forEach(m => { leadCount[m.id] = 0; });
    activePreachers.forEach(m => { preachCount[m.id] = 0; });

    let assignedCount = 0;

    for (const ev of monthEvents) {
      let lId = ev.leaderId;
      let pId = ev.preacherId;

      // Asignar dirigente si está pendiente
      if (!lId && activeLeaders.length > 0) {
        const sortedLeaders = [...activeLeaders].sort((a, b) => (leadCount[a.id] || 0) - (leadCount[b.id] || 0));
        lId = sortedLeaders[0].id;
        leadCount[lId] = (leadCount[lId] || 0) + 1;
      }

      // Asignar predicador si está pendiente (evitando que sea la misma persona que dirige)
      if (!pId && activePreachers.length > 0) {
        const eligiblePreachers = activePreachers.filter(m => m.id !== lId);
        const candidates = eligiblePreachers.length > 0 ? eligiblePreachers : activePreachers;
        const sortedPreachers = [...candidates].sort((a, b) => (preachCount[a.id] || 0) - (preachCount[b.id] || 0));
        pId = sortedPreachers[0].id;
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

  // 3. Abrir modal para editar manualmente un culto
  const openEditEvent = (ev: CellEvent) => {
    setSelectedEvent(ev);
    setModalLeaderId(ev.leaderId || '');
    setModalPreacherId(ev.preacherId || '');
    setModalLocation(ev.location || settings.defaultLocation);
    setModalTime(ev.startTime || settings.defaultTime);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (modalLeaderId && modalPreacherId && modalLeaderId === modalPreacherId) {
      if (!window.confirm('Has seleccionado a la misma persona para dirigir y predicar. ¿Deseas mantenerlo así?')) {
        return;
      }
    }

    await db.events.update(selectedEvent.id, {
      leaderId: modalLeaderId || null,
      preacherId: modalPreacherId || null,
      location: modalLocation,
      startTime: modalTime,
      updatedAt: new Date().toISOString()
    });

    setSelectedEvent(null);
    await loadAll();
    showMsg('Culto actualizado con éxito.');
  };

  // 4. Compartir un evento individual por WhatsApp
  const handleShareSingle = (ev: CellEvent) => {
    const lName = getMemberName(ev.leaderId) || 'Pendiente';
    const pName = getMemberName(ev.preacherId) || 'Pendiente';

    let text = `*${settings.cellName.toUpperCase()}*\n`;
    text += `${settings.territory}\n\n`;
    text += `*${ev.title.toUpperCase()}*\n`;
    text += `📅 Fecha: ${ev.date}\n`;
    text += `🕕 Hora: ${ev.startTime}\n`;
    text += `📍 Lugar: ${ev.location || settings.defaultLocation}\n`;
    text += `👤 Dirige: ${lName}\n`;
    text += `📖 Predica: ${pName}\n`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // 5. Compartir la programación completa del mes por WhatsApp
  const handleShareMonth = () => {
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthEvents = events
      .filter(e => e.date.startsWith(ym) && e.status !== 'Cancelado')
      .sort((a, b) => a.date.localeCompare(b.date));

    if (monthEvents.length === 0) {
      showMsg('No hay cultos programados en este mes para compartir.');
      return;
    }

    let text = `*${settings.cellName.toUpperCase()}*\n`;
    text += `${settings.territory}\n`;
    text += `*PROGRAMACIÓN — ${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}*\n\n`;

    const blocks = monthEvents.map(ev => {
      const lName = getMemberName(ev.leaderId) || 'Pendiente';
      const pName = getMemberName(ev.preacherId) || 'Pendiente';
      let b = `📅 *${ev.date}* — ${ev.title}\n`;
      b += `🕕 Hora: ${ev.startTime}\n`;
      b += `📍 Lugar: ${ev.location || settings.defaultLocation}\n`;
      b += `👤 Dirige: ${lName}\n`;
      b += `📖 Predica: ${pName}`;
      return b;
    });

    text += blocks.join('\n\n────────────────\n\n');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Alta de miembros
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
    showMsg('Miembro agregado correctamente.');
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

      {/* Contenido Principal */}
      <main style={{ padding: '14px', flex: 1 }}>

        {/* 1. CALENDARIO CON RESPONSABLES VISIBLES */}
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

            {/* Botones de acción del mes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <button onClick={handleGenerateMonth} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                ⚡ Generar Miércoles
              </button>
              <button onClick={handleAutoAssign} style={{ background: '#b45309', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                🎯 Asignar Hermanos
              </button>
            </div>

            {/* Botón destacado para compartir el mes completo */}
            <button onClick={handleShareMonth} style={{ width: '100%', background: '#059669', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', marginBottom: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <span>💬 Compartir Todo el Mes por WhatsApp</span>
            </button>

            {/* Lista de cultos con quién dirige y quién predica explícito */}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>📅 {ev.date}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>🕕 {ev.startTime}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '10px' }}>
                        📍 {ev.location || settings.defaultLocation}
                      </div>

                      {/* Tarjetas de Responsables */}
                      <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Dirige:</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: leaderName ? '#1e3a8a' : '#d97706' }}>
                            {leaderName || '⚠️ Pendiente'}
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Predica:</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: preacherName ? '#1e3a8a' : '#d97706' }}>
                            {preacherName || '⚠️ Pendiente'}
                          </span>
                        </div>
                      </div>

                      {/* Acciones por culto */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEditEvent(ev)} style={{ flex: 1, background: '#1e293b', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          ✏️ Asignar / Editar
                        </button>
                        <button onClick={() => handleShareSingle(ev)} style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          💬 Enviar
                        </button>
                      </div>
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
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Miembros registrados</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{members.length}</p>
              </div>
              <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cultos este mes</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{currentMonthEvents.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. DIRECTORIO DE MIEMBROS */}
        {tab === 'miembros' && (
          <div>
            <form onSubmit={handleAddMember} style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 800 }}>+ Registrar Nuevo Miembro</h3>
              <input type="text" placeholder="Nombre y Apellido *" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required style={{ width: '100%', padding: '9px', marginBottom: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="text" placeholder="Teléfono (opcional)" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} style={{ width: '100%', padding: '9px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Capacidades asignables:</span>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
                  <label><input type="checkbox" checked={canLead} onChange={e => setCanLead(e.target.checked)} /> Puede dirigir</label>
                  <label><input type="checkbox" checked={canPreach} onChange={e => setCanPreach(e.target.checked)} /> Puede predicar</label>
                </div>
              </div>

              <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Guardar Hermano</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map(m => (
                <div key={m.id} style={{ background: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{m.fullName}</div>
                  {m.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {m.phone}</div>}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    {m.canLead && <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>✓ Dirige</span>}
                    {m.canPreach && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>✓ Predica</span>}
                    {!m.canLead && !m.canPreach && <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>Sin rol</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. AJUSTES */}
        {tab === 'ajustes' && (
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800 }}>Ajustes de la Célula</h3>
            <p style={{ fontSize: '0.8rem', margin: '6px 0' }}><strong>Nombre:</strong> {settings.cellName}</p>
            <p style={{ fontSize: '0.8rem', margin: '6px 0' }}><strong>Territorio:</strong> {settings.territory}</p>
            <p style={{ fontSize: '0.8rem', margin: '6px 0' }}><strong>Lugar habitual:</strong> {settings.defaultLocation}</p>
            <p style={{ fontSize: '0.8rem', margin: '6px 0' }}><strong>Hora habitual:</strong> {settings.defaultTime}</p>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
              🔒 Todos los datos se guardan en la memoria local de tu teléfono mediante IndexedDB. No requiere Internet tras la instalación.
            </div>
          </div>
        )}
      </main>

      {/* Modal de Asignación / Edición */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '380px', borderRadius: '16px', padding: '18px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>Asignar Responsables</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.75rem', color: '#64748b' }}>📅 {selectedEvent.date}</p>

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

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setSelectedEvent(null)} style={{ flex: 1, background: '#e2e8f0', color: '#1e293b', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  Guardar
                </button>
              </div>
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