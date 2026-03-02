export default function Ticker({ zones }) {
  const text = zones?.length
    ? zones.map(z =>
        `${z.zone_id} ${z.name?.toUpperCase()} [${z.hazard_type}] SEV:${z.severity_level?.toFixed(1)} PRI:${Math.round((z.priority || 0) * 100)}% CONF:${z.confidence}%`
      ).join('   ···   ')
    : 'AWAITING SENSOR DATA — AI AGENT INITIALIZING';

  return (
    <div style={{
      height: '24px',
      background: '#02060f',
      borderBottom: '1px solid rgba(56, 120, 200, 0.12)',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '0 12px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(239, 68, 68, 0.08)',
        borderRight: '1px solid rgba(239, 68, 68, 0.15)',
        flexShrink: 0,
        fontSize: '8px',
        color: '#ef4444',
        letterSpacing: '0.14em',
        fontFamily: 'IBM Plex Mono, monospace',
      }}>
        ◉ LIVE INTEL
      </div>
      <div style={{ flex: 1, overflow: 'hidden', height: '100%', display: 'flex', alignItems: 'center' }}>
        <span style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          fontSize: '8px',
          color: '#2a4a6a',
          letterSpacing: '0.06em',
          animation: 'ticker-scroll 40s linear infinite',
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          {text}
        </span>
      </div>
    </div>
  );
}
