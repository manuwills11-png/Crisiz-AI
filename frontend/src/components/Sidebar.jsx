const HAZARD_ICONS = {
  Hurricane: '⛈', Earthquake: '🌋', Flood: '🌊', Wildfire: '🔥',
  'Disease Outbreak': '☣', Landslide: '⛰', Conflict: '⚡',
};

const THREAT_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
};

function KPI({ value, label, warn, crit }) {
  const color = crit ? '#ef4444' : warn ? '#f97316' : '#38bdf8';
  return (
    <div style={{ background: 'rgba(12, 24, 40, 0.6)', padding: '10px 12px' }}>
      <div style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px',
        color, lineHeight: 1,
        animation: crit ? 'blink 1.5s infinite' : 'none',
      }}>{value}</div>
      <div style={{ fontSize: '7px', color: '#2a4060', letterSpacing: '0.14em', marginTop: '4px', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

const SOURCE_ICONS = { satellite: '🛰', agency: '📡', sensor: '⚡', citizen: '👥', medical: '🏥', ground_sensor: '📍' };

function ZoneRow({ zone, selected, onClick }) {
  const tc = THREAT_COLORS[zone.threat_label] || '#22c55e';
  const isCrit = zone.threat_label === 'CRITICAL';
  const hasLiveData = zone._liveData;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '9px 14px',
        borderBottom: '1px solid rgba(56, 120, 200, 0.07)',
        cursor: 'pointer',
        background: selected ? 'rgba(56, 189, 248, 0.06)' : 'transparent',
        borderLeft: selected ? `2px solid ${tc}` : `2px solid ${hasLiveData ? 'rgba(0,255,157,0.4)' : 'transparent'}`,
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(56, 120, 200, 0.04)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = selected ? 'rgba(56, 189, 248, 0.06)' : 'transparent'; }}
    >
      {isCrit && (
        <div style={{
          position: 'absolute', right: '12px', top: '50%',
          transform: 'translateY(-50%)',
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#ef4444',
          animation: 'glow-pulse 2s infinite',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '10px', color: '#8eacc8' }}>
        <span>{HAZARD_ICONS[zone.hazard_type] || '◉'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{zone.name}</span>
        {hasLiveData && (
          <span style={{ fontSize: '7px', color: '#00ff9d', background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)', borderRadius: '3px', padding: '1px 4px', flexShrink: 0, letterSpacing: '0.08em' }}>
            {SOURCE_ICONS[zone.source_type] || '◉'} LIVE
          </span>
        )}
        <span style={{
          fontSize: '7px', fontWeight: 600, letterSpacing: '0.09em',
          padding: '1px 5px', borderRadius: '3px',
          color: tc, background: `${tc}18`, border: `1px solid ${tc}35`,
          flexShrink: 0,
        }}>{zone.threat_label}</span>
      </div>
      <div style={{ display: 'flex', gap: '10px', fontSize: '8px', color: '#2a4060', marginTop: '4px' }}>
        <span>SEV {zone.severity_level?.toFixed(1)}</span>
        <span>CONF {zone.confidence}%</span>
        <span>{((zone.population_at_risk || 0) / 1000).toFixed(1)}K pop</span>
      </div>
      <div style={{ height: '2px', background: 'rgba(56, 120, 200, 0.1)', borderRadius: '1px', marginTop: '6px' }}>
        <div style={{
          height: '2px', borderRadius: '1px', background: tc,
          width: `${Math.min(100, (zone.priority || 0) * 100)}%`,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

export default function Sidebar({ zones, resources, selectedZone, onZoneSelect }) {
  const totalPop = (zones || []).reduce((s, z) => s + (z.population_at_risk || 0), 0);
  const critCount = (zones || []).filter(z => z.threat_label === 'CRITICAL').length;
  const totalResLeft = Object.values(resources || {}).reduce((s, r) => s + (r.available || 0), 0);

  return (
    <div style={{
      width: '272px',
      background: 'rgba(6, 11, 20, 0.9)',
      borderRight: '1px solid rgba(56, 120, 200, 0.12)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div>
        <div style={{
          fontSize: '7.5px', color: '#1e3550', letterSpacing: '0.16em',
          padding: '8px 14px 6px',
          borderBottom: '1px solid rgba(56, 120, 200, 0.08)',
          display: 'flex', alignItems: 'center', gap: '7px',
        }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8' }} />
          SITUATION REPORT
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(56, 120, 200, 0.06)' }}>
          <KPI value={critCount} label="Critical Zones" crit={critCount > 0} />
          <KPI value={`${((totalPop || 0) / 1000).toFixed(0)}K`} label="Pop at Risk" />
          <KPI value={totalResLeft} label="Resources Left" warn={totalResLeft < 20} />
          <KPI value={`${zones?.length || 0}`} label="Active Zones" />
        </div>
      </div>

      <div style={{ fontSize: '7.5px', color: '#1e3550', letterSpacing: '0.16em', padding: '8px 14px 6px', borderBottom: '1px solid rgba(56, 120, 200, 0.08)', display: 'flex', alignItems: 'center', gap: '7px' }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f97316' }} />
        PRIORITY ZONES
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {(zones || []).map(z => (
          <ZoneRow
            key={z.zone_id}
            zone={z}
            selected={selectedZone?.zone_id === z.zone_id}
            onClick={() => onZoneSelect(z)}
          />
        ))}
      </div>

      <div style={{
        borderTop: '1px solid rgba(56, 120, 200, 0.08)',
        padding: '10px 14px',
        flexShrink: 0,
        background: 'rgba(6, 11, 20, 0.6)',
      }}>
        <div style={{ fontSize: '7.5px', color: '#1e3550', letterSpacing: '0.16em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#0ea5e9' }} />
          RESOURCE POOL
        </div>
        {Object.entries(resources || {}).map(([key, r]) => {
          const pct = (r.available || 0) / (r.total || 1);
          const col = pct < 0.25 ? '#ef4444' : pct < 0.5 ? '#f97316' : '#22c55e';
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '7px', color: '#2a4060', width: '86px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {key.replace(/_/g, ' ')}
              </span>
              <div style={{ flex: 1, height: '3px', background: 'rgba(56, 120, 200, 0.1)', borderRadius: '2px' }}>
                <div style={{ height: '3px', borderRadius: '2px', background: col, width: `${pct * 100}%`, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: '8px', color: col, width: '20px', textAlign: 'right', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
                {r.available}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
