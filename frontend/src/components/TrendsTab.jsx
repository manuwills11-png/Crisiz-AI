import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { postSimulate } from '../api';

const CARD = {
  background:'rgba(8,16,40,0.55)',
  backdropFilter:'blur(20px)',
  WebkitBackdropFilter:'blur(20px)',
  border:'1px solid rgba(0,180,255,0.12)',
  borderRadius:'14px',
  padding:'16px',
};

const tt = {
  contentStyle:{
    background:'rgba(4,8,20,0.96)',
    border:'1px solid rgba(0,180,255,0.2)',
    borderRadius:'8px',
    fontSize:'9px',
    fontFamily:'IBM Plex Mono,monospace',
    color:'#4a7a9a'
  },
  labelStyle:{ color:'#2a4a6a' },
};

const ax = {
  tick:{ fontSize:8, fill:'#1a3a54', fontFamily:'IBM Plex Mono,monospace' },
  axisLine:{ stroke:'#0a1a2e' },
  tickLine:false,
};

export default function TrendsTab({ forecast = [], simParams = {}, zones = [], zoneOverrides = {}, onSimUpdate }) {

  const defaults = {
    severity_boost:0,
    rainfall_increase:0,
    conflict_escalation:0
  };

  const [local, setLocal] = useState({ ...defaults, ...simParams });
  const [busy, setBusy] = useState(false);

  // Compute additional boost from zone overrides on the map
  const zoneSimBoost = useMemo(() => {
    const overriddenZones = zones.filter(z => zoneOverrides[z.zone_id]);
    if (!overriddenZones.length) return 0;
    const avgDelta = overriddenZones.reduce((s, z) => s + (zoneOverrides[z.zone_id] || 0), 0) / overriddenZones.length;
    return avgDelta;
  }, [zones, zoneOverrides]);

  const zoneSimActive = zoneSimBoost !== 0;

  const sliderSimActive =
    local.severity_boost > 0 ||
    local.rainfall_increase > 0 ||
    local.conflict_escalation > 0;

  const simActive = sliderSimActive || zoneSimActive;

  /* ---------------- SIMULATION ENGINE ---------------- */

  const simulatedData = useMemo(() => {
    return (Array.isArray(forecast) ? forecast : []).map(f => {

      const baseSeverity = Number(f?.severity ?? 0);

      const projectedSeverity =
        baseSeverity +
        local.severity_boost +
        (local.rainfall_increase * 1.2) +
        (local.conflict_escalation * 1.5) +
        zoneSimBoost;                        // ← zone override contribution

      const cappedSeverity = Math.min(10, Math.max(0, projectedSeverity));

      const infraImpact =
        Number(f?.infrastructure_damage ?? 0) +
        cappedSeverity * 0.04;

      const resourcesLeft =
        Math.max(0,
          Number(f?.resources_available ?? 0) -
          cappedSeverity * 2
        );

      const shelterLoad =
        Number(f?.shelter_occupancy_pct ?? 0) +
        cappedSeverity * 0.03;

      return {
        name: 'H+' + Number(f?.hour ?? 0),

        // base
        severity: baseSeverity,
        infra: Math.round(Number(f?.infrastructure_damage ?? 0) * 100),
        res: Number(f?.resources_available ?? 0),
        shelter: Math.round(Number(f?.shelter_occupancy_pct ?? 0) * 100),

        // projected
        severityProjected: cappedSeverity,
        infraProjected: Math.round(infraImpact * 100),
        resProjected: resourcesLeft,
        shelterProjected: Math.round(shelterLoad * 100),
      };
    });
  }, [forecast, local, zoneSimBoost]);

  /* ---------------- GLOBAL PROJECTED RISK ---------------- */

  const globalRisk = useMemo(() => {
    if (!simulatedData.length) return 0;
    return (
      simulatedData.reduce((sum, d) => sum + d.severityProjected, 0) /
      simulatedData.length
    );
  }, [simulatedData]);

  /* ---------------- APPLY TO BACKEND ---------------- */

  const apply = async () => {
    setBusy(true);
    try {
      await postSimulate(local);
      onSimUpdate?.();
    } catch(e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const charts = [
    { title:'SEVERITY (0–10)', key:'severity', projected:'severityProjected', color:'#ff3a5c', fill:'rgba(255,58,92,0.08)' },
    { title:'INFRA DAMAGE %', key:'infra', projected:'infraProjected', color:'#ff8c00', fill:'rgba(255,140,0,0.08)' },
    { title:'RESOURCES LEFT', key:'res', projected:'resProjected', color:'#00ff9d', fill:'rgba(0,255,157,0.07)' },
    { title:'SHELTER OCCUPANCY %', key:'shelter', projected:'shelterProjected', color:'#00d4ff', fill:'rgba(0,212,255,0.07)' },
  ];

  const simZones = zones.filter(z => zoneOverrides[z.zone_id]);

  return (
    <div>

      {/* Zone override impact banner */}
      {zoneSimActive && (
        <div style={{ ...CARD, marginBottom:'14px', borderLeft:'3px solid #ff8c00', padding:'12px 16px' }}>
          <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'8px',color:'#ff8c00',letterSpacing:'0.14em',marginBottom:'6px'}}>
            ⚡ MAP SIMULATION IMPACT ON TRENDS
          </div>
          <div style={{display:'flex',gap:'16px',flexWrap:'wrap',alignItems:'center'}}>
            {simZones.map(z => {
              const d = zoneOverrides[z.zone_id];
              return (
                <div key={z.zone_id} style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'8px',color:'#2a4a6a'}}>
                  <span style={{color:'#8eacc8'}}>{z.name}</span>
                  {' '}
                  <span style={{color:d>0?'#ff8c00':'#00ff9d'}}>{d>0?'+':''}{d.toFixed(1)} SEV</span>
                </div>
              );
            })}
            <span style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'7.5px',color:'#1a3a54',marginLeft:'auto'}}>
              avg zone delta: <span style={{color:zoneSimBoost>0?'#ff8c00':'#00ff9d'}}>{zoneSimBoost>0?'+':''}{zoneSimBoost.toFixed(2)}</span> → projected charts updated
            </span>
          </div>
        </div>
      )}

      {/* SIM CONTROL PANEL */}
      <div style={{ ...CARD, marginBottom:'14px' }}>
        <div style={{
          fontFamily:'IBM Plex Mono,monospace',
          fontSize:'8px',
          color:'#00d4ff',
          letterSpacing:'0.16em',
          marginBottom:'14px',
          display:'flex',
          alignItems:'center',
          gap:'10px'
        }}>
          ◉ ADVANCED WHAT-IF SIMULATION
          {simActive && (
            <span style={{
              color: globalRisk > 7 ? '#ff3a5c' :
                     globalRisk > 4 ? '#ff8c00' :
                     '#00ff9d',
              fontSize:'8px'
            }}>
              PROJECTED GLOBAL RISK: {globalRisk.toFixed(2)}
            </span>
          )}
        </div>

        <div style={{ display:'flex', gap:'24px', flexWrap:'wrap' }}>
          {[
            { k:'severity_boost', l:'SEVERITY BOOST', min:0, max:5, step:0.5 },
            { k:'rainfall_increase', l:'RAINFALL', min:0, max:1, step:0.1 },
            { k:'conflict_escalation', l:'CONFLICT', min:0, max:1, step:0.1 },
          ].map(({ k, l, min, max, step }) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{
                fontFamily:'IBM Plex Mono,monospace',
                fontSize:'8px',
                color:'#2a4a6a',
                width:'110px'
              }}>{l}</span>

              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={Number(local[k] ?? 0)}
                onChange={e => setLocal(p => ({
                  ...p,
                  [k]: Number(e.target.value)
                }))}
                style={{ width:'90px', accentColor:'#00d4ff' }}
              />

              <span style={{
                fontFamily:'IBM Plex Mono,monospace',
                fontWeight:700,
                fontSize:'14px',
                color:'#00d4ff',
                width:'30px'
              }}>
                {Number(local[k] ?? 0).toFixed(1)}
              </span>
            </div>
          ))}

          <button
            onClick={apply}
            disabled={busy}
            style={{
              background:'rgba(0,180,255,0.07)',
              border:'1px solid rgba(0,180,255,0.25)',
              borderRadius:'8px',
              padding:'6px 16px',
              color:'#00d4ff',
              fontSize:'9px',
              fontFamily:'IBM Plex Mono,monospace',
              letterSpacing:'0.1em',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? '⟳ APPLYING...' : '▶ APPLY TO SYSTEM'}
          </button>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
        {charts.map(({ title, key, projected, color, fill }) => (
          <div key={key} style={CARD}>
            <div style={{
              fontFamily:'IBM Plex Mono,monospace',
              fontSize:'8px',
              color,
              letterSpacing:'0.12em',
              marginBottom:'12px'
            }}>
              {title}
            </div>

            {simulatedData.length < 2 ? (
              <div style={{
                height:'120px',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                fontFamily:'IBM Plex Mono,monospace',
                fontSize:'9px',
                color:'#1a3a54'
              }}>
                COLLECTING DATA...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={simulatedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,255,0.06)" />
                  <XAxis dataKey="name" {...ax} />
                  <YAxis {...ax} />
                  <Tooltip {...tt} />

                  {/* Base */}
                  <Area
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    fill={fill}
                    strokeWidth={1.5}
                    dot={false}
                  />

                  {/* Projected */}
                  {simActive && (
                    <Area
                      type="monotone"
                      dataKey={projected}
                      stroke="#ffffff"
                      fill="none"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
