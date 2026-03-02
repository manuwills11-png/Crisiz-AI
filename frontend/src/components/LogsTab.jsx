export default function LogsTab({ logs }) {
  return (
    <div style={{
      background: 'rgba(12, 24, 40, 0.7)',
      border: '1px solid rgba(56, 120, 200, 0.12)',
      borderRadius: '8px',
      padding: '14px',
    }}>
      <div style={{ fontSize: '8px', color: '#2a4060', letterSpacing: '0.14em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span style={{ color: '#38bdf8' }}>▣</span>
        AUTONOMOUS DECISION LOG — {logs?.length || 0} ENTRIES
      </div>
      <div style={{ fontSize: '8px', color: '#1e3550', marginBottom: '10px' }}>
        Every allocation decision logged: timestamp · zone · priority · confidence · threat · dispatched resources
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        {(logs || []).map((line, i) => (
          <div key={i} style={{
            fontSize: '8.5px',
            color: i === 0 ? '#3d7a60' : '#1e3550',
            borderBottom: '1px solid rgba(56, 120, 200, 0.05)',
            padding: '4px 0',
            fontFamily: 'IBM Plex Mono, monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{line}</div>
        ))}
        {(!logs || logs.length === 0) && (
          <div style={{ fontSize: '9px', color: '#1e3550', textAlign: 'center', padding: '30px' }}>
            Awaiting first agent cycle...
          </div>
        )}
      </div>
    </div>
  );
}
