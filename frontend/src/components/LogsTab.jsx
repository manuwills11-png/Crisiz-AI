export default function LogsTab({ logs }) {
  return (
    <div style={{
      background:'rgba(0,180,255,0.03)', border:'1px solid rgba(0,180,255,0.1)',
      borderRadius:'12px', padding:'16px'
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
        <div style={{ width:'3px', height:'14px', background:'#00d4ff', borderRadius:'2px' }} />
        <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'8px', color:'#2a4a6a', letterSpacing:'0.18em' }}>
          AUTONOMOUS DECISION LOG — {logs?.length || 0} ENTRIES
        </span>
      </div>
      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'7.5px', color:'#1a3a54', marginBottom:'12px' }}>
        Every allocation decision: timestamp · zone · priority · confidence · dispatched
      </div>
      <div style={{ overflowY:'auto', maxHeight:'calc(100vh - 320px)' }}>
        {(logs || []).map((line, i) => (
          <div key={i} style={{
            fontFamily:'IBM Plex Mono,monospace', fontSize:'8.5px',
            color: i === 0 ? '#00d4ff' : '#1e3a58',
            borderBottom:'1px solid rgba(0,180,255,0.06)',
            padding:'5px 0',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
          }}>{line}</div>
        ))}
        {!logs?.length && (
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'9px',
            color:'#1a3a54', textAlign:'center', padding:'40px' }}>
            Awaiting first agent cycle...
          </div>
        )}
      </div>
    </div>
  );
}