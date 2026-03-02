export default function AlertsTab({ alerts }) {
  return (
    <div>
      <div style={{
        background: 'rgba(12, 24, 40, 0.7)',
        border: '1px solid rgba(56, 120, 200, 0.12)',
        borderRadius: '8px',
        padding: '12px 14px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '8px', color: '#ef4444', letterSpacing: '0.14em', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ animation: 'blink 1.2s infinite', display: 'inline-block' }}>◉</span>
            AUTOMATED ALERT SYSTEM
          </div>
          <div style={{ fontSize: '8px', color: '#2a4060' }}>
            Fires when: Priority ≥ 45% AND Confidence ≥ 55% AND zone verified
          </div>
        </div>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px',
          color: alerts?.length > 0 ? '#ef4444' : '#22c55e',
          animation: alerts?.length > 0 ? 'blink 2s infinite' : 'none',
        }}>
          {alerts?.length || 0}
        </div>
      </div>

      {(!alerts || alerts.length === 0) && (
        <div style={{
          padding: '40px', textAlign: 'center',
          border: '1px dashed rgba(56,120,200,0.15)',
          borderRadius: '8px',
          fontSize: '10px', color: '#2a4060',
        }}>
          ◉ NO ALERTS ACTIVE — ALL ZONES BELOW THRESHOLD
        </div>
      )}

      {(alerts || []).map(a => (
        <div key={a.alert_id} style={{
          background: `${a.threat_color}0d`,
          border: `1px solid ${a.threat_color}35`,
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '10px',
          animation: 'fadeSlideUp 0.35s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: a.threat_color }}>
              {a.zone}
            </div>
            <div style={{ fontSize: '8px', color: '#2a4060' }}>{new Date(a.timestamp).toLocaleTimeString()}</div>
          </div>
          <div style={{ fontSize: '10px', color: a.threat_color, letterSpacing: '0.06em', margin: '5px 0' }}>
            ⚠ {a.recommended_action}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '8px', color: '#3d5a78', marginBottom: '6px' }}>
            <span>HAZARD: {a.hazard}</span>
            <span>THREAT: {a.urgency_level}</span>
            <span>CONF: {a.confidence_level}%</span>
            <span>POP: {(a.population || 0).toLocaleString()}</span>
          </div>
          {a.resources_dispatched?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {a.resources_dispatched.map(r => (
                <span key={r} style={{
                  fontSize: '8px', padding: '2px 7px',
                  background: 'rgba(56,189,248,0.08)',
                  border: '1px solid rgba(56,189,248,0.2)',
                  borderRadius: '3px', color: '#38bdf8',
                }}>{r}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
