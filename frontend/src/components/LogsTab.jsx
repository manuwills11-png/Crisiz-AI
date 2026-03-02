import { useState, useRef, useEffect } from 'react';
import { LOG_TYPES } from './DispatchEngine';

const TYPE_CONFIG = {
  [LOG_TYPES.DISPATCH_SENT]:      { color: '#00d4ff',  icon: '▶',  label: 'DISPATCH' },
  [LOG_TYPES.DISPATCH_ARRIVED]:   { color: '#00ff9d',  icon: '◉',  label: 'ARRIVED' },
  [LOG_TYPES.DISPATCH_ON_SCENE]:  { color: '#00ff9d',  icon: '⬡',  label: 'ON-SCENE' },
  [LOG_TYPES.DISPATCH_RETURNING]: { color: '#f97316',  icon: '←',  label: 'RETURNING' },
  [LOG_TYPES.DISPATCH_RETURNED]:  { color: '#22c55e',  icon: '✓',  label: 'RETURNED' },
  [LOG_TYPES.SEVERITY_REDUCED]:   { color: '#00ff9d',  icon: '▼',  label: 'SEV DROP' },
  [LOG_TYPES.ZONE_ESCALATED]:     { color: '#ff3a5c',  icon: '⚠',  label: 'ESCALATED' },
  [LOG_TYPES.ZONE_DEESCALATED]:   { color: '#22c55e',  icon: '↓',  label: 'STABLE' },
  [LOG_TYPES.ALERT_TRIGGERED]:    { color: '#ff3a5c',  icon: '🔴', label: 'ALERT' },
  [LOG_TYPES.RESOURCE_LOW]:       { color: '#ff8c00',  icon: '⚡',  label: 'RESOURCE' },
  [LOG_TYPES.COMMS_INTERCEPT]:    { color: '#a78bfa',  icon: '📡', label: 'COMMS' },
  [LOG_TYPES.SYSTEM]:             { color: '#2a4a6a',  icon: '◈',  label: 'SYSTEM' },
};

const ALL_FILTERS = ['ALL', 'DISPATCH', 'COMMS', 'ALERTS', 'SEVERITY', 'SYSTEM'];

const FILTER_TYPES = {
  ALL: null,
  DISPATCH: [LOG_TYPES.DISPATCH_SENT, LOG_TYPES.DISPATCH_ARRIVED, LOG_TYPES.DISPATCH_ON_SCENE, LOG_TYPES.DISPATCH_RETURNING, LOG_TYPES.DISPATCH_RETURNED],
  COMMS: [LOG_TYPES.COMMS_INTERCEPT],
  ALERTS: [LOG_TYPES.ALERT_TRIGGERED, LOG_TYPES.ZONE_ESCALATED, LOG_TYPES.ZONE_DEESCALATED],
  SEVERITY: [LOG_TYPES.SEVERITY_REDUCED, LOG_TYPES.ZONE_ESCALATED, LOG_TYPES.ZONE_DEESCALATED],
  SYSTEM: [LOG_TYPES.SYSTEM, LOG_TYPES.RESOURCE_LOW],
};

export default function LogsTab({ logEntries = [] }) {
  const [filter, setFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const scrollRef = useRef(null);
  const prevLenRef = useRef(0);

  // Auto-scroll to top on new entries
  useEffect(() => {
    if (autoScroll && logEntries.length !== prevLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevLenRef.current = logEntries.length;
  }, [logEntries, autoScroll]);

  const filterTypes = FILTER_TYPES[filter];
  const filtered = logEntries.filter(e => {
    if (filterTypes && !filterTypes.includes(e.type)) return false;
    if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Count by type for badges
  const counts = {};
  logEntries.forEach(e => {
    const cfg = TYPE_CONFIG[e.type];
    if (cfg) counts[cfg.label] = (counts[cfg.label] || 0) + 1;
  });

  const dispatchCount = [LOG_TYPES.DISPATCH_SENT, LOG_TYPES.DISPATCH_ARRIVED, LOG_TYPES.DISPATCH_ON_SCENE, LOG_TYPES.DISPATCH_RETURNING, LOG_TYPES.DISPATCH_RETURNED]
    .reduce((s, t) => s + logEntries.filter(e => e.type === t).length, 0);
  const commsCount = logEntries.filter(e => e.type === LOG_TYPES.COMMS_INTERCEPT).length;
  const alertCount = logEntries.filter(e => e.type === LOG_TYPES.ALERT_TRIGGERED || e.type === LOG_TYPES.ZONE_ESCALATED).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>

      {/* Header stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
      }}>
        {[
          { label: 'TOTAL EVENTS', value: logEntries.length, color: '#00d4ff' },
          { label: 'DISPATCHES', value: dispatchCount, color: '#f97316' },
          { label: 'COMMS', value: commsCount, color: '#a78bfa' },
          { label: 'ALERTS/ESC', value: alertCount, color: '#ff3a5c' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'rgba(0,180,255,0.04)', border: '1px solid rgba(0,180,255,0.1)',
            borderRadius: '8px', padding: '8px 12px',
          }}>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: '7px', color: '#1e3a58', letterSpacing: '0.14em', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, fontSize: '20px', color, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {ALL_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: 'IBM Plex Mono,monospace', fontSize: '8px', letterSpacing: '0.1em',
                padding: '4px 10px', borderRadius: '5px', cursor: 'pointer',
                background: filter === f ? 'rgba(0,180,255,0.15)' : 'transparent',
                border: filter === f ? '1px solid rgba(0,180,255,0.35)' : '1px solid rgba(0,180,255,0.1)',
                color: filter === f ? '#00d4ff' : '#2a4a6a',
                transition: 'all 0.15s',
              }}
            >{f}</button>
          ))}
        </div>

        <input
          placeholder="SEARCH LOGS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '120px', background: 'rgba(0,180,255,0.04)',
            border: '1px solid rgba(0,180,255,0.15)', borderRadius: '5px',
            padding: '4px 10px', fontFamily: 'IBM Plex Mono,monospace', fontSize: '8px',
            color: '#4a7a9a', outline: 'none', letterSpacing: '0.08em',
          }}
        />

        <button
          onClick={() => setAutoScroll(a => !a)}
          style={{
            fontFamily: 'IBM Plex Mono,monospace', fontSize: '8px', letterSpacing: '0.1em',
            padding: '4px 10px', borderRadius: '5px', cursor: 'pointer',
            background: autoScroll ? 'rgba(0,255,157,0.08)' : 'transparent',
            border: autoScroll ? '1px solid rgba(0,255,157,0.3)' : '1px solid rgba(0,180,255,0.1)',
            color: autoScroll ? '#00ff9d' : '#2a4a6a',
          }}
        >
          {autoScroll ? '⬇ AUTO' : '⏸ PAUSED'}
        </button>
      </div>

      {/* Log feed */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          // If user scrolls down, pause auto-scroll
          if (e.currentTarget.scrollTop > 60) setAutoScroll(false);
          if (e.currentTarget.scrollTop === 0) setAutoScroll(true);
        }}
        style={{
          flex: 1, overflowY: 'auto',
          background: 'rgba(0,180,255,0.02)', border: '1px solid rgba(0,180,255,0.08)',
          borderRadius: '10px',
          maxHeight: 'calc(100vh - 380px)',
          minHeight: '300px',
        }}
      >
        {filtered.length === 0 && (
          <div style={{
            padding: '60px', textAlign: 'center',
            fontFamily: 'IBM Plex Mono,monospace', fontSize: '9px', color: '#1a3a54',
          }}>
            {logEntries.length === 0 ? 'AWAITING FIRST EVENT...' : 'NO MATCHING LOG ENTRIES'}
          </div>
        )}

        {filtered.map((entry, i) => {
          const cfg = TYPE_CONFIG[entry.type] || { color: '#2a4a6a', icon: '·', label: '?' };
          const isNew = i === 0;

          return (
            <div
              key={entry.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '6px 12px',
                borderBottom: '1px solid rgba(0,180,255,0.05)',
                background: isNew ? `${cfg.color}08` : 'transparent',
                transition: 'background 0.5s',
                animation: isNew ? 'log-entry-in 0.3s ease' : 'none',
              }}
            >
              {/* Type badge */}
              <div style={{
                flexShrink: 0, width: '62px', paddingTop: '1px',
              }}>
                <div style={{
                  fontFamily: 'IBM Plex Mono,monospace', fontSize: '7px', fontWeight: 700,
                  color: cfg.color, background: `${cfg.color}15`,
                  border: `1px solid ${cfg.color}30`,
                  borderRadius: '4px', padding: '1px 5px',
                  letterSpacing: '0.06em', textAlign: 'center',
                }}>
                  {cfg.label}
                </div>
              </div>

              {/* Icon */}
              <div style={{ fontSize: '12px', flexShrink: 0, paddingTop: '1px', width: '16px', textAlign: 'center' }}>
                {cfg.icon}
              </div>

              {/* Text */}
              <div style={{
                fontFamily: 'IBM Plex Mono,monospace', fontSize: '9px',
                color: isNew ? cfg.color : i < 5 ? '#3a6080' : '#1e3a58',
                flex: 1, lineHeight: '1.5', wordBreak: 'break-word',
                transition: 'color 1s',
              }}>
                {entry.text}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes log-entry-in {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
