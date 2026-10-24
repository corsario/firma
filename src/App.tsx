import React, { useState, useEffect } from 'react';
import { db, DEFAULT_SETTINGS } from './db';
import { Member, CellEvent, AppSettings } from './types';
import { getWednesdaysOfMonth, MONTH_NAMES } from './services/dateUtils';

export default function App() {
  const [tab, setTab] = useState<'inicio' | 'miembros' | 'calendario' | 'ajustes'>('inicio');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CellEvent[]>([]);

  // Estados de formularios
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
    setTimeout(() => setNotice(null), 3000);
  };

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
    loadAll();
    showMsg('Miembro agregado correctamente.');
  };

  const handleGenerateMonth = async () => {
    const now = new Date();
    const weds = getWednesdaysOfMonth(now.getFullYear(), now.getMonth());
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
    loadAll();
    showMsg(`Se generaron ${count} servicios de los miércoles.`);
  };

  const handleShareWhatsApp = (ev: CellEvent) => {
    const text = `*${settings.cellName.toUpperCase()}*\n${settings.territory}\n\n*${ev.title}*\n📅 Fecha: ${ev.date}\n🕕 Hora: ${ev.startTime}\n📍 Lugar: ${ev.location || 'Casa habitual'}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc', paddingBottom: '70px', display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado */}
      <header style={{ background: '#0f172a', color: '#ffffff', padding: '14px 16px', borderBottom: '2px solid #b45309' }}>
        <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{settings.cellName}</h1>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>{settings.territory}</p>
      </header>

      {notice && (
        <div style={{ background: '#1e3a8a', color: '#fff', padding: '8px 12px', fontSize: '0.8rem', textAlign: 'center' }}>
          {notice}
        </div>
      )}

      {/* Contenido según pestaña */}
      <main style={{ padding: '16px', flex: 1 }}>
        {tab === 'inicio' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #172554)', color: '#fff', padding: '18px', borderRadius: '16px', marginBottom: '16px', border: '1px solid #b45309' }}>
              <span style={{ fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700 }}>Próxima Reunión</span>
              <h2 style={{ margin: '6px 0', fontSize: '1.2rem' }}>Servicio de célula</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>Miércoles a las {settings.defaultTime} • {settings.defaultLocation}</p>
              <button onClick={handleGenerateMonth} style={{ marginTop: '14px', background: '#b45309', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                ⚡ Generar servicios de este mes
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Miembros activos</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{members.filter(m => m.isActive).length}</p>
              </div>
              <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Servicios programados</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{events.length}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'miembros' && (
          <div>
            <form onSubmit={handleAddMember} style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>+ Agregar Miembro</h3>
              <input type="text" placeholder="Nombre completo" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="text" placeholder="Teléfono" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', marginBottom: '10px' }}>
                <label><input type="checkbox" checked={canLead} onChange={e => setCanLead(e.target.checked)} /> Puede dirigir</label>
                <label><input type="checkbox" checked={canPreach} onChange={e => setCanPreach(e.target.checked)} /> Puede predicar</label>
              </div>
              <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Guardar Miembro</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map(m => (
                <div key={m.id} style={{ background: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.fullName}</div>
                  {m.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {m.phone}</div>}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    {m.canLead && <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Dirige</span>}
                    {m.canPreach && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Predica</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'calendario' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Servicios Programados</h3>
              <button onClick={handleGenerateMonth} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>+ Miércoles</button>
            </div>
            {events.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No hay servicios generados. Pulsa "+ Miércoles" para crearlos.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {events.map(ev => (
                  <div key={ev.id} style={{ background: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{ev.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📅 {ev.date} • 🕕 {ev.startTime}</div>
                    </div>
                    <button onClick={() => handleShareWhatsApp(ev)} style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>WhatsApp</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'ajustes' && (
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>Ajustes de la Célula</h3>
            <p style={{ fontSize: '0.8rem', margin: '4px 0' }}><strong>Célula:</strong> {settings.cellName}</p>
            <p style={{ fontSize: '0.8rem', margin: '4px 0' }}><strong>Territorio:</strong> {settings.territory}</p>
            <p style={{ fontSize: '0.8rem', margin: '4px 0' }}><strong>Lugar habitual:</strong> {settings.defaultLocation}</p>
            <p style={{ fontSize: '0.8rem', margin: '4px 0' }}><strong>Hora habitual:</strong> {settings.defaultTime}</p>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
              Los datos se almacenan de forma 100% local en tu dispositivo mediante IndexedDB sin conexión a servidores.
            </div>
          </div>
        )}
      </main>

      {/* Navegación inferior */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '8px 0', maxWidth: '480px', margin: '0 auto' }}>
        {[
          { id: 'inicio', label: 'Inicio', icon: '🏠' },
          { id: 'miembros', label: 'Miembros', icon: '👥' },
          { id: 'calendario', label: 'Calendario', icon: '📅' },
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
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
