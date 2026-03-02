import { useState, useCallback } from 'react';
import './index.css';
import { useAgentState } from './hooks/useAgentState';
import Header from './components/Header';
import Ticker from './components/Ticker';
import Sidebar from './components/Sidebar';
import CrisisMap from './components/CrisisMap';
import Dashboard from './components/Dashboard';
import AlertsTab from './components/AlertsTab';
import TrendsTab from './components/TrendsTab';
import StrategyTab from './components/StrategyTab';
import LogsTab from './components/LogsTab';

const TABS = [
  { id: 'map', label: '⬡ MAP' },
  { id: 'alerts', label: '⚠ ALERTS' },
  { id: 'dashboard', label: '◈ DASHBOARD' },
  { id: 'trends', label: '◉ TRENDS' },
  { id: 'strategy', label: '⬡ STRATEGY' },
  { id: 'logs', label: '▣ LOGS' },
];

export default function App() {
  const { state, loading, error, lastUpdated, refresh } = useAgentState();
  const [selectedZone, setSelectedZone] = useState(null);
  const [activeTab, setActiveTab] = useState('map');

  const handleZoneSelect = useCallback((zone) => {
    setSelectedZone(zone);
    if (activeTab !== 'map') setActiveTab('map');
  }, [activeTab]);

  const handleStratRegen = useCallback(() => {
    setActiveTab('strategy');
    setTimeout(refresh, 4000);
  }, [refresh]);

  /* ---------------- SAFE STATE EXTRACTION ---------------- */

  const zones = state?.zones ?? [];
  const alerts = state?.alerts ?? [];
  const resources = state?.resources ?? {};
  const shelters = state?.shelters ?? [];
  const forecast = Array.isArray(state?.forecast) ? state.forecast : [];
  const strategy = state?.strategy ?? '';
  const logs = state?.decision_log ?? [];
  const citizenPings = state?.citizen_pings ?? [];
  const cycle = state?.cycle ?? 0;
  const simParams = state?.simulation_params ?? {};

  const globalRisk =
    zones.length > 0
      ? zones.reduce((a, z) => a + (z.priority || 0), 0) / zones.length
      : 0;

  /* ---------------- LOADING SCREEN ---------------- */

  if (loading && !state) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060b14',
        color: '#2a4060',
        fontFamily: 'IBM Plex Mono, monospace',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '2px solid rgba(56,189,248,0.15)',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ fontSize: '10px', letterSpacing: '0.16em' }}>
          AGENT INITIALIZING...
        </div>
      </div>
    );
  }

  /* ---------------- ERROR SCREEN ---------------- */

  if (error && !state) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060b14',
        color: '#ef4444',
        fontFamily: 'IBM Plex Mono, monospace',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ fontSize: '20px' }}>⚠</div>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em' }}>
          BACKEND CONNECTION FAILED
        </div>
        <button
          onClick={refresh}
          style={{
            marginTop: '8px',
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: '6px',
            padding: '7px 16px',
            color: '#38bdf8',
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            letterSpacing: '0.08em',
          }}
        >
          ↺ RETRY
        </button>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */

  return (
    <div style={{
      height: '100vh',
      width: '100vw',          // 🔥 FIXES RIGHT-SIDE GRAY STRIP
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#060b14'
    }}>

      <Header cycle={cycle} onStrategyRegen={handleStratRegen} />

      {/* GLOBAL RISK BAR */}
      <div style={{
        height: '6px',
        background: 'rgba(56,120,200,0.1)'
      }}>
        <div style={{
          height: '100%',
          width: `${globalRisk * 100}%`,
          background:
            globalRisk > 0.75
              ? '#ef4444'
              : globalRisk > 0.5
              ? '#f97316'
              : '#22c55e',
          transition: 'width 0.6s ease'
        }} />
      </div>

      <Ticker zones={zones} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <Sidebar
          zones={zones}
          resources={resources}
          selectedZone={selectedZone}
          onZoneSelect={handleZoneSelect}
        />

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0
        }}>

          {/* TAB BAR */}
          <div style={{
            display: 'flex',
            background: 'rgba(6, 11, 20, 0.95)',
            borderBottom: '1px solid rgba(56, 120, 200, 0.12)'
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '9px 16px',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTab === tab.id
                      ? '2px solid #38bdf8'
                      : '2px solid transparent',
                  color:
                    activeTab === tab.id
                      ? '#38bdf8'
                      : '#2a4060',
                  fontFamily: 'IBM Plex Mono, monospace',
                  textTransform: 'uppercase',
                }}
              >
                {tab.label}
              </button>
            ))}

            <div style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              paddingRight: '16px',
              fontSize: '8px',
              color: '#1e3550'
            }}>
              {lastUpdated
                ? `UPDATED ${lastUpdated.toLocaleTimeString()}`
                : 'SYNCING...'}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '14px',
            background: 'rgba(6, 11, 20, 0.6)'
          }}>

            {activeTab === 'map' && (
              <div style={{
                display: 'flex',
                gap: '14px',
                height: 'calc(100vh - 205px)'
              }}>
                <div style={{ flex: 1 }}>
                  <CrisisMap
                    zones={zones}
                    shelters={shelters}
                    citizenPings={citizenPings}
                    selectedZone={selectedZone}
                    onZoneClick={setSelectedZone}
                  />
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <AlertsTab alerts={alerts} />
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                zones={zones}
                shelters={shelters}
                resources={resources}
                alerts={alerts}
              />
            )}

            {activeTab === 'trends' && (
              <TrendsTab
                forecast={forecast}
                simParams={simParams}
                onSimUpdate={() => setTimeout(refresh, 2000)}
              />
            )}

            {activeTab === 'strategy' && (
              <StrategyTab strategy={strategy} cycle={cycle} />
            )}

            {activeTab === 'logs' && (
              <LogsTab logs={logs} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}