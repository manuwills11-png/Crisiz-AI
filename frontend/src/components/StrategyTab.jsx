import { useState } from 'react';
import { regenerateStrategy } from '../api';

function GlassCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(12, 24, 40, 0.7)',
      border: '1px solid rgba(56, 120, 200, 0.15)',
      borderRadius: '8px',
      padding: '14px',
      backdropFilter: 'blur(8px)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function StrategyTab({ strategy, cycle }) {
  const [loading, setLoading] = useState(false);

  const handleRegen = async () => {
    setLoading(true);
    try {
      await regenerateStrategy();
      setTimeout(() => setLoading(false), 3500);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div>

      {/* HEADER */}
      <GlassCard style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{
              fontSize: '9px',
              color: '#38bdf8',
              letterSpacing: '0.14em',
              marginBottom: '4px'
            }}>
              ◉ AUTONOMOUS AI STRATEGIC ENGINE
            </div>

            <div style={{
              fontSize: '8px',
              color: '#2a4060'
            }}>
              Cycle {cycle} · Deterministic scoring + AI operational directives
            </div>
          </div>

          <button
            onClick={handleRegen}
            disabled={loading}
            style={{
              background: loading ? 'rgba(56,189,248,0.04)' : 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.3)',
              borderRadius: '6px',
              padding: '6px 14px',
              color: '#38bdf8',
              fontSize: '9px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.08em',
            }}
          >
            {loading ? '⟳ GENERATING...' : '⬡ REGENERATE PLAN'}
          </button>
        </div>
      </GlassCard>

      {/* LOADING */}
      {loading && (
        <GlassCard style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          gap: '14px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid rgba(56,189,248,0.15)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            fontSize: '9px',
            color: '#2a4060',
            letterSpacing: '0.14em'
          }}>
            GENERATING OPERATIONAL DIRECTIVES
          </div>
        </GlassCard>
      )}

      {/* EMPTY STATE */}
      {!loading && !strategy && (
        <GlassCard style={{
          padding: '60px',
          textAlign: 'center',
          border: '1px dashed rgba(56,120,200,0.15)'
        }}>
          <div style={{
            fontSize: '10px',
            color: '#2a4060'
          }}>
            Press <span style={{ color: '#38bdf8' }}>⬡ REGENERATE PLAN</span> to generate structured emergency commands.
          </div>
        </GlassCard>
      )}

      {/* STRATEGY OUTPUT */}
      {!loading && strategy && (
        <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
          {renderStructuredStrategy(strategy)}
        </div>
      )}
    </div>
  );
}

/* -------------------------
   Structured Renderer
--------------------------*/

function renderStructuredStrategy(text) {
  if (!text) return null;

  const sections = text.split(/\[(.*?)\]/g).filter(Boolean);

  const formatted = [];

  for (let i = 0; i < sections.length; i += 2) {
    const title = sections[i];
    const content = sections[i + 1];

    if (!content) continue;

    formatted.push(
      <GlassCard
        key={i}
        style={{
          marginBottom: '14px',
          borderLeft: `3px solid ${getSectionColor(title)}`
        }}
      >
        <div style={{
          fontSize: '9px',
          letterSpacing: '0.14em',
          color: getSectionColor(title),
          marginBottom: '10px',
          fontWeight: 700
        }}>
          {getSectionIcon(title)} {title}
        </div>

        <div style={{
          fontSize: '11px',
          lineHeight: '1.9',
          color: '#8eacc8',
          fontFamily: 'IBM Plex Mono, monospace',
          whiteSpace: 'pre-wrap'
        }}>
          {content.trim()}
        </div>
      </GlassCard>
    );
  }

  return formatted;
}

function getSectionColor(title) {
  const map = {
    'PRIORITY COMMANDS': '#ef4444',
    'RESOURCE DIRECTIVES': '#22c55e',
    'EVACUATION & CIVIL CONTROL': '#f97316',
    'RISK MONITORING': '#38bdf8'
  };

  return map[title] || '#38bdf8';
}

function getSectionIcon(title) {
  const map = {
    'PRIORITY COMMANDS': '⚡',
    'RESOURCE DIRECTIVES': '🛠',
    'EVACUATION & CIVIL CONTROL': '🚨',
    'RISK MONITORING': '◉'
  };

  return map[title] || '◉';
}