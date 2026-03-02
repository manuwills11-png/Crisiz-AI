import { useState, useEffect } from 'react';
import { VEHICLE_TYPES, HAZARD_VEHICLE_MAP } from './DispatchEngine';

const TC = { CRITICAL: '#ff3a5c', HIGH: '#ff8c00', MODERATE: '#f0c040', LOW: '#00ff9d' };

/* Live countdown/progress for a single dispatch unit */
function DispatchProgress({ dispatch: d }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const v = VEHICLE_TYPES[d.vehicleKey] || {};
  const color = v.color || '#00d4ff';

  let label = '';
  let progress = 0;
  let timeLeft = '';
  let statusColor = color;

  if (d.status === 'en_route') {
    const elapsed = now - d.departedAt;
    progress = Math.min(1, elapsed / d.travelMs);
    const remaining = Math.max(0, Math.ceil((d.travelMs - elapsed) / 1000));
    label = 'EN ROUTE';
    timeLeft = remaining > 0 ? `${remaining}s to arrival` : 'arriving...';
    statusColor = '#f97316';
  } else if (d.status === 'on_scene') {
    const elapsed = now - d.arrivedAt;
    const sceneMs = 10000 + (d.severity || 5) * 2500;
    progress = Math.min(1, elapsed / sceneMs);
    const remaining = Math.max(0, Math.ceil((sceneMs - elapsed) / 1000));
    label = 'ON SCENE';
    timeLeft = remaining > 0 ? `${remaining}s on-scene` : 'wrapping up...';
    statusColor = '#00ff9d';
  } else if (d.status === 'returning') {
    const elapsed = now - (d.returnDepartedAt || now);
    progress = Math.min(1, elapsed / (d.returnMs || d.travelMs));
    const remaining = Math.max(0, Math.ceil(((d.returnMs || d.travelMs) - elapsed) / 1000));
    label = 'RETURNING';
    timeLeft = remaining > 0 ? `${remaining}s to base` : 'almost home...';
    statusColor = '#2a4a6a';
  }

  return (
    <div style={{
      background: `${color}0a`, border: `1px solid ${color}25`,
      borderRadius: '8px', padding: '8px 12px', marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '14px' }}>{v.icon}</span>
          <div>
            <div style={{ fontSize: '9px', color: color, fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600 }}>{d.id} · {d.vehicleLabel}</div>
            <div style={{ fontSize: '7.5px', color: '#1a3a54', fontFamily: 'IBM Plex Mono,monospace' }}>{d.zoneName}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '7.5px', color: statusColor, fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, letterSpacing: '0.1em' }}>{label}</div>
          <div style={{ fontSize: '7px', color: '#2a4060', fontFamily: 'IBM Plex Mono,monospace' }}>{timeLeft}</div>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(0,180,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '2px', background: statusColor,
          width: `${progress * 100}%`,
          transition: 'width 0.25s linear',
          boxShadow: `0 0 6px ${statusColor}`,
        }} />
      </div>
    </div>
  );
}

function DispatchModal({ alert, zone, dispatches, onDispatch, onClose }) {
  const [selected, setSelected] = useState(null);
  const suggested = HAZARD_VEHICLE_MAP[alert.hazard] || Object.keys(VEHICLE_TYPES).slice(0, 3);
  const activeToZone = dispatches.filter(
    d => d.zoneId === zone?.zone_id && d.status !== 'returned'
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(2,5,14,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(6,11,22,0.98)', border: '1px solid rgba(0,180,255,0.25)',
        borderRadius: '16px', padding: '24px', width: '460px', maxWidth: '95vw',
        boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 30px rgba(0,180,255,0.1)',
        fontFamily: 'IBM Plex Mono,monospace', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '8px', color: '#00d4ff', letterSpacing: '0.16em', marginBottom: '3px' }}>⬡ DISPATCH COORDINATOR</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: TC[alert.urgency_level] || '#ff8c00' }}>{alert.zone}</div>
            <div style={{ fontSize: '8px', color: '#2a4a6a', marginTop: '2px' }}>{alert.hazard} · {alert.urgency_level}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#2a4a6a', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Live dispatch progress */}
        {activeToZone.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '7.5px', color: '#00d4ff', letterSpacing: '0.12em', marginBottom: '7px' }}>UNITS IN THE FIELD</div>
            {activeToZone.map(d => <DispatchProgress key={d.id} dispatch={d} />)}
          </div>
        )}

        {/* Recommended vehicles */}
        <div style={{ fontSize: '7.5px', color: '#1a3a54', letterSpacing: '0.12em', marginBottom: '8px' }}>RECOMMENDED FOR {alert.hazard?.toUpperCase()}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {suggested.map(vk => {
            const v = VEHICLE_TYPES[vk];
            if (!v) return null;
            const isSel = selected === vk;
            return (
              <button key={vk} onClick={() => setSelected(vk)} style={{
                background: isSel ? `${v.color}18` : 'rgba(0,180,255,0.04)',
                border: isSel ? `1.5px solid ${v.color}` : '1px solid rgba(0,180,255,0.12)',
                borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{v.icon}</div>
                <div style={{ fontSize: '9px', fontFamily: 'IBM Plex Mono,monospace', color: isSel ? v.color : '#6a8aaa', fontWeight: 600 }}>{v.label}</div>
                <div style={{ fontSize: '7.5px', fontFamily: 'IBM Plex Mono,monospace', color: '#2a4a6a', marginTop: '3px' }}>
                  {v.speedKmh} km/h · −{v.severityReduction} SEV
                </div>
                {/* Estimated travel time */}
                <div style={{ fontSize: '7px', fontFamily: 'IBM Plex Mono,monospace', color: isSel ? v.color : '#1a3a54', marginTop: '3px' }}>
                  ETA ~{Math.round(8000 * (240 / v.speedKmh) * 1.2 / 1000)}s travel
                </div>
              </button>
            );
          })}
        </div>

        {/* All other vehicles */}
        <div style={{ fontSize: '7.5px', color: '#1a3a54', letterSpacing: '0.12em', marginBottom: '8px' }}>ALL UNITS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
          {Object.entries(VEHICLE_TYPES).map(([vk, v]) => {
            if (suggested.includes(vk)) return null;
            const isSel = selected === vk;
            return (
              <button key={vk} onClick={() => setSelected(vk)} style={{
                background: isSel ? `${v.color}18` : 'rgba(0,180,255,0.04)',
                border: isSel ? `1px solid ${v.color}` : '1px solid rgba(0,180,255,0.1)',
                borderRadius: '7px', padding: '5px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '14px' }}>{v.icon}</span>
                <span style={{ fontSize: '8px', fontFamily: 'IBM Plex Mono,monospace', color: isSel ? v.color : '#3a6080' }}>{v.label}</span>
              </button>
            );
          })}
        </div>

        <button
          disabled={!selected}
          onClick={() => { onDispatch(selected); onClose(); }}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            background: selected ? 'rgba(0,180,255,0.12)' : 'rgba(0,180,255,0.04)',
            border: selected ? '1px solid rgba(0,180,255,0.35)' : '1px solid rgba(0,180,255,0.1)',
            color: selected ? '#00d4ff' : '#2a4a6a',
            fontFamily: 'IBM Plex Mono,monospace', fontSize: '10px', letterSpacing: '0.12em',
            cursor: selected ? 'pointer' : 'not-allowed', transition: 'all 0.15s', fontWeight: 600,
          }}
        >
          {selected
            ? `▶ DISPATCH ${VEHICLE_TYPES[selected]?.icon} ${VEHICLE_TYPES[selected]?.label.toUpperCase()} → ${alert.zone.toUpperCase()}`
            : 'SELECT A UNIT FIRST'}
        </button>
      </div>
    </div>
  );
}

export default function AlertsTab({ alerts, zones, dispatches = [], onDispatch }) {
  const [modalAlert, setModalAlert] = useState(null);

  const getZone = name => zones?.find(z => z.name === name || z.zone_id === name);

  const getActiveDispatches = name => {
    const zone = getZone(name);
    if (!zone) return [];
    return dispatches.filter(d => d.zoneId === zone.zone_id && d.status !== 'returned');
  };

  return (
    <div>
      {modalAlert && (
        <DispatchModal
          alert={modalAlert}
          zone={getZone(modalAlert.zone)}
          dispatches={dispatches}
          onDispatch={vk => { const z = getZone(modalAlert.zone); if (z) onDispatch(z, vk); }}
          onClose={() => setModalAlert(null)}
        />
      )}

      {/* Header */}
      <div style={{
        background: 'rgba(0,180,255,0.05)', border: '1px solid rgba(0,180,255,0.15)',
        borderRadius: '12px', padding: '14px 18px', marginBottom: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '8px', color: '#ff3a5c', letterSpacing: '0.16em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span>◉</span> AUTOMATED ALERT SYSTEM
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '7.5px', color: '#2a4a6a' }}>
            Priority ≥ 45% · Confidence ≥ 55% · Click alert to dispatch units
          </div>
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, fontSize: '32px', color: alerts?.length > 0 ? '#ff3a5c' : '#00ff9d' }}>
          {alerts?.length || 0}
        </div>
      </div>

      {!alerts?.length && (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed rgba(0,180,255,0.15)', borderRadius: '12px', fontFamily: 'IBM Plex Mono,monospace', fontSize: '9px', color: '#1a3a54' }}>
          ◉ NO ALERTS ACTIVE
        </div>
      )}

      {(alerts || []).map(a => {
        const tc = a.threat_color || TC[a.urgency_level] || '#ff8c00';
        const activeDispatches = getActiveDispatches(a.zone);
        const hasActive = activeDispatches.length > 0;

        return (
          <div key={a.alert_id} style={{
            background: tc + '0d', border: '1px solid ' + tc + '35',
            borderRadius: '12px', padding: '16px 18px', marginBottom: '10px',
            position: 'relative', overflow: 'hidden',
          }}>
            {hasActive && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${tc}, transparent)`, animation: 'scan-line 2s linear infinite' }} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, fontSize: '15px', color: tc }}>{a.zone}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '8px', color: '#1a3a54' }}>
                  {new Date(a.timestamp).toLocaleTimeString()}
                </div>
                <button
                  onClick={() => setModalAlert(a)}
                  style={{
                    background: hasActive ? 'rgba(0,255,157,0.1)' : `${tc}18`,
                    border: hasActive ? '1px solid rgba(0,255,157,0.35)' : `1px solid ${tc}50`,
                    borderRadius: '6px', padding: '4px 12px',
                    color: hasActive ? '#00ff9d' : tc,
                    fontFamily: 'IBM Plex Mono,monospace', fontSize: '8px', letterSpacing: '0.1em',
                    cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                  }}
                >
                  {hasActive ? `⬡ ${activeDispatches.length} UNIT${activeDispatches.length > 1 ? 'S' : ''} ACTIVE` : '▶ DISPATCH'}
                </button>
              </div>
            </div>

            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '10px', color: tc, margin: '6px 0 10px' }}>⚠ {a.recommended_action}</div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontFamily: 'IBM Plex Mono,monospace', fontSize: '8px', color: '#2a4a6a', marginBottom: activeDispatches.length ? '10px' : 0 }}>
              <span>HAZARD: {a.hazard}</span>
              <span>THREAT: {a.urgency_level}</span>
              <span>CONF: {a.confidence_level}%</span>
              <span>POP: {(a.population || 0).toLocaleString()}</span>
            </div>

            {/* Live progress bars for active dispatches */}
            {activeDispatches.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                {activeDispatches.map(d => <DispatchProgress key={d.id} dispatch={d} />)}
              </div>
            )}

            {a.resources_dispatched?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {a.resources_dispatched.map(r => (
                  <span key={r} style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '8px', padding: '3px 10px', background: 'rgba(0,180,255,0.07)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: '5px', color: '#00d4ff' }}>{r}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes scan-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
