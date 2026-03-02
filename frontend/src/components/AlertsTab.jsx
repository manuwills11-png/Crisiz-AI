const TC = { CRITICAL:'#ff3a5c', HIGH:'#ff8c00', MODERATE:'#f0c040', LOW:'#00ff9d' };

export default function AlertsTab({ alerts }) {
  return (
    <div>
      <div style={{
        background:'rgba(0,180,255,0.05)', border:'1px solid rgba(0,180,255,0.15)',
        borderRadius:'12px', padding:'14px 18px', marginBottom:'14px',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'8px', color:'#ff3a5c',
            letterSpacing:'0.16em', marginBottom:'4px', display:'flex', alignItems:'center', gap:'7px' }}>
            <span style={{ animation:'glow-line 1.5s infinite', display:'inline-block' }}>◉</span>
            AUTOMATED ALERT SYSTEM
          </div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'7.5px', color:'#2a4a6a' }}>
            Fires when: Priority ≥ 45% and Confidence ≥ 55% and zone verified
          </div>
        </div>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:700, fontSize:'32px',
          color: alerts?.length > 0 ? '#ff3a5c' : '#00ff9d' }}>
          {alerts?.length || 0}
        </div>
      </div>

      {!alerts?.length && (
        <div style={{ padding:'48px', textAlign:'center',
          border:'1px dashed rgba(0,180,255,0.15)', borderRadius:'12px',
          fontFamily:'IBM Plex Mono,monospace', fontSize:'9px', color:'#1a3a54' }}>
          ◉ NO ALERTS ACTIVE
        </div>
      )}

      {(alerts || []).map(a => {
        const tc = a.threat_color || TC[a.urgency_level] || '#ff8c00';
        return (
          <div key={a.alert_id} style={{
            background: tc + '0d', border: '1px solid ' + tc + '35',
            borderRadius:'12px', padding:'16px 18px', marginBottom:'10px'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:700, fontSize:'15px', color:tc }}>
                {a.zone}
              </div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'8px', color:'#1a3a54' }}>
                {new Date(a.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'10px', color:tc, margin:'6px 0 10px' }}>
              ⚠ {a.recommended_action}
            </div>
            <div style={{ display:'flex', gap:'14px', flexWrap:'wrap',
              fontFamily:'IBM Plex Mono,monospace', fontSize:'8px', color:'#2a4a6a', marginBottom:'10px' }}>
              <span>HAZARD: {a.hazard}</span>
              <span>THREAT: {a.urgency_level}</span>
              <span>CONF: {a.confidence_level}%</span>
              <span>POP: {(a.population || 0).toLocaleString()}</span>
            </div>
            {a.resources_dispatched?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {a.resources_dispatched.map(r => (
                  <span key={r} style={{
                    fontFamily:'IBM Plex Mono,monospace', fontSize:'8px',
                    padding:'3px 10px',
                    background:'rgba(0,180,255,0.07)', border:'1px solid rgba(0,180,255,0.2)',
                    borderRadius:'5px', color:'#00d4ff'
                  }}>{r}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}