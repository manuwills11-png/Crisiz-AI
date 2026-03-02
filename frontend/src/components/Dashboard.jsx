const THREAT_COLORS = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MODERATE: '#eab308', LOW: '#22c55e',
};

function GlassCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(12, 24, 40, 0.7)',
      border: '1px solid rgba(56, 120, 200, 0.12)',
      borderRadius: '8px',
      padding: '14px',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '12px',
      fontSize: '8px', color: color || '#2a4060', letterSpacing: '0.14em',
    }}>
      <span style={{ color: color || '#38bdf8' }}>{icon}</span>
      {title}
    </div>
  );
}

function ProgressBar({ value, max = 1, color, height = 4 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ height, background: 'rgba(56, 120, 200, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: '2px', background: color || '#38bdf8',
        width: `${pct}%`, transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

export default function Dashboard({ zones, shelters, resources, alerts }) {
  const verifiedCount = (zones || []).filter(z => z.verified).length;
  const avgConf = zones?.length
    ? Math.round((zones || []).reduce((s, z) => s + (z.confidence || 0), 0) / zones.length)
    : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      {/* Hazard Summary */}
      <GlassCard>
        <CardHeader icon="◈" title="ACTIVE HAZARD SUMMARY" />
        {(zones || []).map(z => {
          const tc = THREAT_COLORS[z.threat_label] || '#22c55e';
          const icon = { Hurricane:'⛈', Earthquake:'🌋', Flood:'🌊', Wildfire:'🔥', 'Disease Outbreak':'☣', Landslide:'⛰' }[z.hazard_type] || '◉';
          return (
            <div key={z.zone_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', width: '18px' }}>{icon}</span>
              <span style={{ fontSize: '9px', color: '#6a8aaa', width: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.name}</span>
              <ProgressBar value={z.priority || 0} max={1} color={tc} />
              <span style={{ fontSize: '8px', color: tc, width: '56px', textAlign: 'right' }}>{z.threat_label}</span>
            </div>
          );
        })}
      </GlassCard>

      {/* Shelter Capacity */}
      <GlassCard>
        <CardHeader icon="🏠" title="SHELTER CAPACITY" color="#0ea5e9" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {(shelters || []).map(s => {
            const pct = s.current_occupancy / s.capacity;
            const col = pct > 0.92 ? '#ef4444' : pct > 0.75 ? '#f97316' : '#22c55e';
            return (
              <div key={s.shelter_id} style={{
                background: 'rgba(6, 11, 20, 0.5)',
                border: '1px solid rgba(56, 120, 200, 0.1)',
                borderRadius: '6px', padding: '9px',
              }}>
                <div style={{ fontSize: '9px', color: '#6a8aaa', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: col }}>
                  {Math.round(pct * 100)}%
                </div>
                <ProgressBar value={pct} max={1} color={col} height={3} />
                <div style={{ fontSize: '7.5px', color: '#2a4060', marginTop: '4px' }}>
                  {s.current_occupancy?.toLocaleString()} / {s.capacity?.toLocaleString()}
                </div>
                <div style={{ fontSize: '7px', color: s.medical_support ? '#22c55e' : '#ef4444', marginTop: '3px' }}>
                  {s.medical_support ? '+ MEDICAL' : '– NO MEDICAL'}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Signal Verification */}
      <GlassCard>
        <CardHeader icon="◉" title="SIGNAL VERIFICATION STATUS" color="#38bdf8" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            ['VERIFIED', verifiedCount, '#22c55e'],
            ['UNVERIFIED', (zones?.length || 0) - verifiedCount, '#ef4444'],
            ['AVG CONF', `${avgConf}%`, '#38bdf8'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: 'rgba(6,11,20,0.5)', border: '1px solid rgba(56,120,200,0.1)', borderRadius: '6px', padding: '9px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: c }}>{v}</div>
              <div style={{ fontSize: '7px', color: '#2a4060', letterSpacing: '0.1em', marginTop: '3px' }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '8px', color: '#2a4060', marginBottom: '6px', letterSpacing: '0.1em' }}>CONFIDENCE DISTRIBUTION</div>
        {(zones || []).map(z => (
          <div key={z.zone_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '8px', color: '#3d5a78', width: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.zone_id}</span>
            <ProgressBar value={z.confidence || 0} max={100} color={z.verified ? '#38bdf8' : '#3d5a78'} />
            <span style={{ fontSize: '7.5px', color: z.verified ? '#38bdf8' : '#3d5a78', width: '34px', textAlign: 'right' }}>{z.confidence}%</span>
          </div>
        ))}
      </GlassCard>

      {/* Resource Utilization */}
      <GlassCard>
        <CardHeader icon="◉" title="RESOURCE UTILIZATION" color="#0ea5e9" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.entries(resources || {}).map(([key, r]) => {
            const pct = (r.available || 0) / (r.total || 1);
            const col = pct < 0.25 ? '#ef4444' : pct < 0.5 ? '#f97316' : '#22c55e';
            return (
              <div key={key} style={{
                background: 'rgba(6,11,20,0.5)',
                border: '1px solid rgba(56,120,200,0.1)',
                borderRadius: '6px', padding: '9px',
              }}>
                <div style={{ fontSize: '7px', color: '#2a4060', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  {key.replace(/_/g, ' ')}
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: col, margin: '4px 0' }}>
                  {r.available}<span style={{ fontSize: '9px', color: '#2a4060' }}>/{r.total}</span>
                </div>
                <ProgressBar value={pct} max={1} color={col} height={3} />
                <div style={{ fontSize: '7px', color: '#2a4060', marginTop: '3px' }}>
                  {(r.total || 0) - (r.available || 0)} deployed
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
