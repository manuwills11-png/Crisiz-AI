import { useState } from 'react';
import { regenerateStrategy } from '../api';

const CARD = {
  background:'rgba(8,16,40,0.55)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
  border:'1px solid rgba(0,180,255,0.12)', borderRadius:'14px',
  boxShadow:'0 4px 40px rgba(0,0,0,0.4)', padding:'16px', marginBottom:'12px',
};

const SECTIONS = {
  'PRIORITY COMMANDS':        { color:'#ff3a5c', icon:'⚡' },
  'RESOURCE DIRECTIVES':      { color:'#00ff9d', icon:'◈' },
  'EVACUATION & CIVIL CONTROL': { color:'#ff8c00', icon:'→' },
  'RISK MONITORING':          { color:'#00d4ff', icon:'◉' },
};

const THREAT_COLORS = {
  CRITICAL:'#ff3a5c', HIGH:'#ff8c00', MODERATE:'#f0c040', LOW:'#00ff9d',
};

function parseStrategy(text) {
  if (!text) return null;
  const parts = text.split(/\[(.*?)\]/g).filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i + 1]) out.push({ title: parts[i], content: parts[i + 1] });
  }
  return out.length > 0 ? out : null;
}

export default function StrategyTab({ strategy, cycle, zones = [], zoneOverrides = {} }) {
  const [loading, setLoading] = useState(false);

  const simZones = zones.filter(z => zoneOverrides[z.zone_id] !== undefined && zoneOverrides[z.zone_id] !== 0);
  const simActive = simZones.length > 0;

  const regen = async () => {
    setLoading(true);
    try {
      // Pass simulation context to regenerateStrategy if zones are overridden
      await regenerateStrategy(simActive ? { simZones, zoneOverrides } : undefined);
      setTimeout(() => setLoading(false), 3500);
    } catch {
      setLoading(false);
    }
  };

  const sections = parseStrategy(strategy);

  return (
    <div>
      <div style={CARD}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'8px', color:'#00d4ff',
              letterSpacing:'0.14em', marginBottom:'4px' }}>◉ AUTONOMOUS AI STRATEGIC ENGINE</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'7.5px', color:'#2a4a6a' }}>
              Cycle {cycle} · Deterministic scoring + AI operational directives
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            {simActive && (
              <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'8px',color:'#ff8c00',background:'rgba(255,140,0,0.1)',border:'1px solid rgba(255,140,0,0.25)',borderRadius:'6px',padding:'4px 10px'}}>
                ⚡ {simZones.length} ZONE{simZones.length>1?'S':''} SIMULATED
              </div>
            )}
            <button onClick={regen} disabled={loading} style={{
              background:'rgba(0,180,255,0.07)', border:'1px solid rgba(0,180,255,0.25)',
              borderRadius:'8px', padding:'7px 16px', color:'#00d4ff', fontSize:'9px',
              fontFamily:'IBM Plex Mono,monospace', letterSpacing:'0.1em',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? '⟳ GENERATING...' : '⬡ REGENERATE PLAN'}
            </button>
          </div>
        </div>
      </div>

      {/* Simulated zones summary */}
      {simActive && !loading && (
        <div style={{...CARD, borderLeft:'3px solid #ff8c00', marginBottom:'12px'}}>
          <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'8px',color:'#ff8c00',letterSpacing:'0.14em',marginBottom:'8px'}}>
            ⚡ SIMULATION CONTEXT — PRESS REGENERATE TO UPDATE AI STRATEGY
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
            {simZones.map(z => {
              const delta = zoneOverrides[z.zone_id];
              const tc = THREAT_COLORS[z.threat_label] || '#ff8c00';
              return (
                <div key={z.zone_id} style={{
                  background:`${tc}0d`,border:`1px solid ${tc}30`,borderRadius:'8px',
                  padding:'8px 12px',minWidth:'160px',
                }}>
                  <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'9px',fontWeight:700,color:tc,marginBottom:'3px'}}>{z.name}</div>
                  <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'8px',color:'#2a4a6a',display:'flex',gap:'10px'}}>
                    <span>SEV {(z.severity_level||0).toFixed(1)}</span>
                    <span style={{color:delta>0?'#ff8c00':'#00ff9d'}}>{delta>0?'+':''}{delta.toFixed(1)}</span>
                    <span style={{color:tc}}>{z.threat_label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ ...CARD, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', padding:'60px', gap:'16px' }}>
          <div style={{ width:'32px', height:'32px',
            border:'2px solid rgba(0,180,255,0.1)', borderTopColor:'#00d4ff',
            borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'9px',
            color:'#2a4a6a', letterSpacing:'0.14em' }}>GENERATING OPERATIONAL DIRECTIVES{simActive?' WITH SIMULATION DATA':''}</div>
        </div>
      )}

      {!loading && !strategy && (
        <div style={{ ...CARD, padding:'60px', textAlign:'center',
          border:'1px dashed rgba(0,180,255,0.15)' }}>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'9px', color:'#1a3a54' }}>
            Press <span style={{ color:'#00d4ff' }}>⬡ REGENERATE PLAN</span> to generate structured emergency commands.
          </div>
        </div>
      )}

      {!loading && strategy && (
        <div>
          {sections ? sections.map(({ title, content }, i) => {
            const s = SECTIONS[title] || { color:'#00d4ff', icon:'◉' };
            return (
              <div key={i} style={{ ...CARD, borderLeft:'3px solid ' + s.color }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'9px', color:s.color,
                  letterSpacing:'0.14em', marginBottom:'10px', paddingBottom:'8px',
                  borderBottom:'1px solid ' + s.color + '22' }}>
                  {s.icon} {title}
                </div>
                <pre style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'10.5px',
                  lineHeight:'1.8', color:'#4a7a9a', whiteSpace:'pre-wrap', margin:0 }}>
                  {content.trim()}
                </pre>
              </div>
            );
          }) : (
            <div style={CARD}>
              <pre style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'10.5px',
                lineHeight:'1.8', color:'#4a7a9a', whiteSpace:'pre-wrap', margin:0 }}>
                {strategy}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
