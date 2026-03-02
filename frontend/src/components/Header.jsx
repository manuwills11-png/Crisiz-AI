import { useState, useEffect } from 'react';
import { fetchHealth, regenerateStrategy } from '../api';

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 28px',
  height: '60px',
  background: 'linear-gradient(90deg, rgba(6,11,20,0.98), rgba(10,20,35,0.98))',
  borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
  backdropFilter: 'blur(14px)',
  flexShrink: 0,
  zIndex: 100,
  position: 'relative',
  boxShadow: '0 4px 25px rgba(0,0,0,0.6)',
};

export default function Header({ cycle, onStrategyRegen }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await fetchHealth();
        setHealth(h);
      } catch {}
    };
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, []);

  const handleRegen = async () => {
    try {
      await regenerateStrategy();
      onStrategyRegen?.();
    } catch {}
  };

  return (
    <header style={headerStyle}>

      {/* LEFT SIDE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
          boxShadow: '0 0 25px rgba(239, 68, 68, 0.45)',
        }}>
          ☢
        </div>

        <div>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '15px',
            color: '#e2eaf4',
            letterSpacing: '0.1em',
          }}>
            SENTINEL <span style={{ color: '#38bdf8' }}>·</span> CRISIS OPS AGENT
          </div>

          <div style={{
            fontSize: '9px',
            color: '#3d5a78',
            letterSpacing: '0.18em',
            marginTop: '3px'
          }}>
            AUTONOMOUS HUMANITARIAN RESPONSE SYSTEM
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>

        {/* Cycle Counter */}
        <div style={{
          background: 'rgba(10, 20, 35, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '6px',
          padding: '6px 14px',
          fontSize: '11px',
          color: '#3d5a78',
          letterSpacing: '0.08em',
        }}>
          CYCLE&nbsp;&nbsp;
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            color: '#38bdf8',
          }}>
            {String(cycle || 0).padStart(3, '0')}
          </span>
        </div>

        {/* Agent Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: health?.agent_running ? '#22c55e' : '#ef4444',
            animation: health?.agent_running ? 'pulse 1.5s infinite' : 'none',
            boxShadow: health?.agent_running ? '0 0 8px #22c55e' : 'none',
          }} />
          <span style={{
            fontSize: '9px',
            color: health?.agent_running ? '#22c55e' : '#ef4444',
            letterSpacing: '0.14em'
          }}>
            {health?.agent_running ? 'AGENT ACTIVE' : 'AGENT OFFLINE'}
          </span>
        </div>

        {/* AI Strategy Button */}
        <button
          onClick={handleRegen}
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '6px',
            padding: '7px 16px',
            color: '#38bdf8',
            fontSize: '10px',
            cursor: 'pointer',
            letterSpacing: '0.1em',
            fontFamily: 'IBM Plex Mono, monospace',
            transition: 'all 0.2s',
            boxShadow: '0 0 10px rgba(56,189,248,0.15)',
          }}
          onMouseEnter={e => {
            e.target.style.background = 'rgba(56, 189, 248, 0.15)';
            e.target.style.boxShadow = '0 0 18px rgba(56, 189, 248, 0.35)';
          }}
          onMouseLeave={e => {
            e.target.style.background = 'rgba(56, 189, 248, 0.08)';
            e.target.style.boxShadow = '0 0 10px rgba(56,189,248,0.15)';
          }}
        >
          ⬡ AI STRATEGY
        </button>
      </div>

      {/* Bottom Glow Line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
        opacity: 0.6
      }} />
    </header>
  );
}