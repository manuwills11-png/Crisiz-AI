import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { postSimulate } from '../api';

function GlassCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(12, 24, 40, 0.7)',
      border: '1px solid rgba(56, 120, 200, 0.12)',
      borderRadius: '8px',
      padding: '14px',
      backdropFilter: 'blur(8px)',
      ...style,
    }}>{children}</div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(6, 11, 20, 0.95)',
    border: '1px solid rgba(56,120,200,0.25)',
    borderRadius: '6px',
    fontSize: '10px',
    fontFamily: 'IBM Plex Mono, monospace',
    color: '#8eacc8',
  },
  labelStyle: { color: '#3d5a78' },
};

const axisProps = {
  tick: { fontSize: 8, fill: '#2a4060', fontFamily: 'IBM Plex Mono, monospace' },
  axisLine: { stroke: '#1e3550' },
  tickLine: false,
};

export default function TrendsTab({ forecast = [], simParams = {}, onSimUpdate }) {

  const safeDefaults = {
    severity_boost: 0,
    rainfall_increase: 0,
    conflict_escalation: 0,
  };

  const [local, setLocal] = useState({ ...safeDefaults, ...simParams });
  const [updating, setUpdating] = useState(false);

  const applySimulation = async () => {
    setUpdating(true);
    try {
      await postSimulate(local);
      onSimUpdate?.(local);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  /* ---------- SAFE FORECAST MAPPING ---------- */

  const forecastForChart = (Array.isArray(forecast) ? forecast : []).map(f => ({
    name: `H+${Number(f?.hour ?? 0)}`,
    severity: Number(f?.severity ?? 0),
    infra: Math.round(Number(f?.infrastructure_damage ?? 0) * 100),
    resources: Number(f?.resources_available ?? 0),
    shelter: Math.round(Number(f?.shelter_occupancy_pct ?? 0) * 100),
  }));

  const chartConfigs = [
    { title: 'SEVERITY FORECAST (0–10)', key: 'severity', color: '#ef4444', fill: 'rgba(239,68,68,0.12)' },
    { title: 'INFRA DAMAGE (% projected)', key: 'infra', color: '#f97316', fill: 'rgba(249,115,22,0.12)' },
    { title: 'RESOURCES REMAINING', key: 'resources', color: '#22c55e', fill: 'rgba(34,197,94,0.10)' },
    { title: 'SHELTER OCCUPANCY (%)', key: 'shelter', color: '#38bdf8', fill: 'rgba(56,189,248,0.10)' },
  ];

  return (
    <div>
      <GlassCard style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '8px',
          color: '#eab308',
          letterSpacing: '0.14em',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '7px'
        }}>
          ◉ WHAT-IF SIMULATION CONTROLS
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { key: 'severity_boost', label: 'SEVERITY BOOST', min: 0, max: 5, step: 0.5, unit: '+' },
            { key: 'rainfall_increase', label: 'RAINFALL INCREASE', min: 0, max: 1, step: 0.1, unit: '' },
            { key: 'conflict_escalation', label: 'CONFLICT ESCALATION', min: 0, max: 1, step: 0.1, unit: '' },
          ].map(({ key, label, min, max, step, unit }) => {

            const safeValue = Number(local[key] ?? 0);

            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '8px',
                  color: '#2a4060',
                  letterSpacing: '0.08em',
                  width: '120px'
                }}>
                  {label}
                </span>

                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={safeValue}
                  onChange={e =>
                    setLocal(p => ({
                      ...p,
                      [key]: Number(e.target.value)
                    }))
                  }
                  style={{
                    width: '100px',
                    accentColor: '#38bdf8',
                    cursor: 'pointer'
                  }}
                />

                <span style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: '#38bdf8',
                  width: '28px'
                }}>
                  {unit}{safeValue.toFixed(1)}
                </span>
              </div>
            );
          })}

          <button
            onClick={applySimulation}
            disabled={updating}
            style={{
              background: updating ? 'rgba(56,189,248,0.04)' : 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.3)',
              borderRadius: '6px',
              padding: '6px 14px',
              color: '#38bdf8',
              fontSize: '9px',
              cursor: updating ? 'not-allowed' : 'pointer',
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.08em',
            }}
          >
            {updating ? '⟳ APPLYING...' : '▶ APPLY SIMULATION'}
          </button>
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {chartConfigs.map(({ title, key, color, fill }) => (
          <GlassCard key={key}>
            <div style={{
              fontSize: '8px',
              color,
              letterSpacing: '0.12em',
              marginBottom: '10px'
            }}>
              {title}
            </div>

            {forecastForChart.length < 2 ? (
              <div style={{
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                color: '#2a4060'
              }}>
                COLLECTING DATA...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={forecastForChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip {...tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    fill={fill}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}