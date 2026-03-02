import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

/* ---------------- STYLES ---------------- */

const STYLES = `
@keyframes pulse-ring {
  0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.6; }
  70%  { transform: translate(-50%,-50%) scale(1.3);  opacity: 0; }
  100% { transform: translate(-50%,-50%) scale(0.85); opacity: 0; }
}
@keyframes sim-panel-in {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}
.crisis-popup .leaflet-popup-content-wrapper {
  background: #0d1b2e;
  border: 1px solid rgba(56,120,200,0.3);
  border-radius: 10px;
  box-shadow: 0 0 24px rgba(0,0,0,0.7);
}
.leaflet-container { background: #060b14 !important; }
`;

if (!document.getElementById('crisis-map-style')) {
  const tag = document.createElement('style');
  tag.id = 'crisis-map-style';
  tag.innerHTML = STYLES;
  document.head.appendChild(tag);
}

/* ---------------- CONFIG ---------------- */

const HQ = { lat: 40.73, lng: -73.99 };

const THREAT_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
};

const HAZARD_ICONS = {
  Hurricane: '⛈',
  Earthquake: '🌋',
  Flood: '🌊',
  Wildfire: '🔥',
  'Disease Outbreak': '☣',
  Landslide: '⛰',
  Conflict: '⚡',
};

function getThreat(severity) {
  if (severity > 8) return 'CRITICAL';
  if (severity > 6) return 'HIGH';
  if (severity > 3) return 'MODERATE';
  return 'LOW';
}

/* ---------------- ROUTE ---------------- */

async function fetchRoute(start, end) {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok") return null;
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}

/* ---------------- ZONE ICON ---------------- */

function makeZoneIcon(zone) {
  const threat = getThreat(zone.severity_level || 0);
  const color = THREAT_COLORS[threat];
  const isSimulated = !!zone._simDelta;
  const ringColor = isSimulated ? (zone._simDelta > 0 ? '#ff8c00' : '#00ff9d') : color;

  return L.divIcon({
    className: '',
    iconSize: [70, 70],
    iconAnchor: [35, 35],
    html: `
      <div style="position:relative;width:70px;height:70px;">
        <div style="
          position:absolute;
          top:50%;
          left:50%;
          width:50px;
          height:50px;
          border-radius:50%;
          border:2px solid ${ringColor};
          transform:translate(-50%, -50%);
          animation:pulse-ring 1.5s infinite;
        "></div>
        <div style="
          position:absolute;
          top:50%;
          left:50%;
          width:40px;
          height:40px;
          border-radius:50%;
          background:${color}22;
          border:2.5px solid ${color};
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:0 0 20px ${color}88;
          font-size:18px;
          transform:translate(-50%, -50%);
        ">
          ${HAZARD_ICONS[zone.hazard_type] || '◉'}
        </div>
        ${isSimulated ? `
        <div style="
          position:absolute;
          top:0; right:0;
          width:16px; height:16px;
          border-radius:50%;
          background:${zone._simDelta > 0 ? '#ff8c00' : '#00ff9d'};
          border:2px solid #0a1020;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; line-height:1;
          box-shadow:0 0 8px ${zone._simDelta > 0 ? '#ff8c00' : '#00ff9d'};
        ">${zone._simDelta > 0 ? '↑' : '↓'}</div>
        ` : ''}
      </div>
    `
  });
}

/* ---------------- SIM PANEL (overlay) ---------------- */

function SimPanel({ zone, delta, onEscalate, onDeescalate, onReset, onClose }) {
  const threat = getThreat((zone.severity_level || 0));
  const tc = THREAT_COLORS[threat];

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(6,11,22,0.97)',
      border: `1px solid ${tc}55`,
      borderRadius: '14px',
      padding: '14px 18px',
      minWidth: '300px',
      maxWidth: '360px',
      boxShadow: `0 0 40px rgba(0,0,0,0.8), 0 0 20px ${tc}22`,
      animation: 'sim-panel-in 0.2s ease',
      fontFamily: 'IBM Plex Mono, monospace',
    }}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
        <div>
          <div style={{fontSize:'8px',color:'#ff8c00',letterSpacing:'0.16em',marginBottom:'3px'}}>⚡ RISK SIMULATOR</div>
          <div style={{fontSize:'13px',fontWeight:700,color:tc}}>{zone.name}</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#2a4a6a',fontSize:'16px',cursor:'pointer',padding:'0 4px',lineHeight:1}}>✕</button>
      </div>

      {/* Current severity display */}
      <div style={{background:'rgba(0,180,255,0.05)',border:'1px solid rgba(0,180,255,0.1)',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px'}}>
          <span style={{fontSize:'7.5px',color:'#1a3a54',letterSpacing:'0.12em'}}>SEVERITY LEVEL</span>
          <span style={{fontSize:'8px',color:tc,background:`${tc}18`,padding:'1px 8px',borderRadius:'4px',border:`1px solid ${tc}35`}}>{threat}</span>
        </div>
        {/* Severity bar */}
        <div style={{height:'6px',background:'rgba(0,180,255,0.08)',borderRadius:'3px',overflow:'hidden',marginBottom:'4px'}}>
          <div style={{height:'100%',width:`${Math.min(100,(zone.severity_level||0)*10)}%`,background:tc,borderRadius:'3px',transition:'width 0.4s ease'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:'8px'}}>
          <span style={{color:'#1a3a54'}}>0</span>
          <span style={{color:tc,fontWeight:700,fontSize:'14px'}}>{(zone.severity_level||0).toFixed(1)}</span>
          <span style={{color:'#1a3a54'}}>10</span>
        </div>

        {delta !== 0 && (
          <div style={{marginTop:'6px',fontSize:'8px',color:delta>0?'#ff8c00':'#00ff9d',textAlign:'center'}}>
            {delta>0?'▲ ESCALATED':'▼ DE-ESCALATED'} by {Math.abs(delta).toFixed(1)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
        <button
          onClick={onEscalate}
          style={{
            flex:1, background:'rgba(255,58,92,0.1)', border:'1px solid rgba(255,58,92,0.3)',
            borderRadius:'8px', padding:'8px', color:'#ff3a5c',
            fontSize:'11px', cursor:'pointer', fontFamily:'IBM Plex Mono, monospace',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,58,92,0.2)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(255,58,92,0.1)'}
        >
          <span style={{fontSize:'16px'}}>▲</span>
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em'}}>ESCALATE</div>
            <div style={{fontSize:'7px',color:'rgba(255,58,92,0.6)'}}>+0.5 severity</div>
          </div>
        </button>

        <button
          onClick={onDeescalate}
          style={{
            flex:1, background:'rgba(0,255,157,0.06)', border:'1px solid rgba(0,255,157,0.2)',
            borderRadius:'8px', padding:'8px', color:'#00ff9d',
            fontSize:'11px', cursor:'pointer', fontFamily:'IBM Plex Mono, monospace',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,157,0.12)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(0,255,157,0.06)'}
        >
          <span style={{fontSize:'16px'}}>▼</span>
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em'}}>DE-ESCALATE</div>
            <div style={{fontSize:'7px',color:'rgba(0,255,157,0.5)'}}>−0.5 severity</div>
          </div>
        </button>
      </div>

      {/* Info row */}
      <div style={{display:'flex',gap:'10px',fontSize:'8px',color:'#2a4a6a',marginBottom:'10px',flexWrap:'wrap'}}>
        <span>HAZARD: {zone.hazard_type}</span>
        <span>CONF: {zone.confidence}%</span>
        <span>POP: {((zone.population_at_risk||0)/1000).toFixed(1)}K</span>
      </div>

      {/* Reset & hint */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        {delta !== 0 ? (
          <button
            onClick={onReset}
            style={{background:'rgba(0,180,255,0.06)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:'6px',padding:'4px 12px',color:'#00d4ff',fontSize:'8px',fontFamily:'IBM Plex Mono,monospace',cursor:'pointer',letterSpacing:'0.1em'}}
          >
            ↺ RESET ZONE
          </button>
        ) : <div/>}
        <div style={{fontSize:'7px',color:'#1a3a54',textAlign:'right'}}>Changes reflect in<br/>all tabs in real-time</div>
      </div>
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

export default function CrisisMap({ zones = [], selectedZone, zoneOverrides = {}, onZoneOverride, onZoneOverrideReset, onZoneClick }) {

  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const zoneLayer = useRef(null);
  const routeLayer = useRef(null);
  const trappedLayer = useRef(null);

  const [firebaseReports, setFirebaseReports] = useState([]);
  const [simPanelZone, setSimPanelZone] = useState(null);

  /* ---------------- INIT MAP ---------------- */

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [HQ.lat, HQ.lng],
      zoom: 12,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    ).addTo(map);

    // HQ Marker
    const hqIcon = L.divIcon({
      className: '',
      iconSize: [80, 80],
      iconAnchor: [40, 40],
      html: `
        <div style="position:relative;width:80px;height:80px;">
          <div style="position:absolute;top:50%;left:50%;width:60px;height:60px;border-radius:50%;border:3px solid #2563eb;transform:translate(-50%, -50%);animation:pulse-ring 2s infinite;"></div>
          <div style="position:absolute;top:50%;left:50%;width:46px;height:46px;border-radius:50%;background:#2563eb22;border:2px solid #2563eb;display:flex;align-items:center;justify-content:center;box-shadow:0 0 25px #2563ebaa;font-size:22px;transform:translate(-50%, -50%);">🏢</div>
        </div>
      `
    });

    L.marker([HQ.lat, HQ.lng], { icon: hqIcon, zIndexOffset: 2000 }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  /* ---------------- FIREBASE SURVIVORS ---------------- */

  useEffect(() => {
    const reportsRef = ref(db, "alerts");
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setFirebaseReports([]); return; }
      setFirebaseReports(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });
    return () => unsubscribe();
  }, []);

  /* ---------------- DRAW SURVIVORS ---------------- */

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (trappedLayer.current) map.removeLayer(trappedLayer.current);

    const group = L.layerGroup();
    firebaseReports.forEach(report => {
      if (!report.lat || !report.lng) return;
      L.marker([Number(report.lat), Number(report.lng)], {
        icon: L.divIcon({
          className: '',
          iconSize: [60, 60],
          iconAnchor: [30, 30],
          html: `
            <div style="position:relative;width:60px;height:60px;">
              <div style="position:absolute;top:50%;left:50%;width:40px;height:40px;border-radius:50%;background:rgba(239,68,68,0.4);transform:translate(-50%, -50%);animation:pulse-ring 1.2s infinite;"></div>
              <div style="position:absolute;top:50%;left:50%;width:14px;height:14px;background:#ff0000;border-radius:50%;box-shadow:0 0 14px #ff0000;transform:translate(-50%, -50%);"></div>
            </div>
          `
        })
      }).addTo(group);
    });

    group.addTo(map);
    trappedLayer.current = group;
  }, [firebaseReports]);

  /* ---------------- DRAW ZONES ---------------- */

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (zoneLayer.current) map.removeLayer(zoneLayer.current);

    const group = L.layerGroup();

    zones.forEach(zone => {
      if (!zone.lat || !zone.lng) return;

      const marker = L.marker([zone.lat, zone.lng], {
        icon: makeZoneIcon(zone),
        zIndexOffset: zone._simDelta ? 500 : 0,
      });

      marker.on('click', () => {
        setSimPanelZone(zone);
        onZoneClick?.(zone);
      });

      marker.addTo(group);
    });

    group.addTo(map);
    zoneLayer.current = group;
  }, [zones]);

  /* update simPanelZone when zones change (so severity display is live) */
  useEffect(() => {
    if (!simPanelZone) return;
    const updated = zones.find(z => z.zone_id === simPanelZone.zone_id);
    if (updated) setSimPanelZone(updated);
  }, [zones]);

  /* ---------------- HQ → ZONE ROUTES ---------------- */

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (routeLayer.current) map.removeLayer(routeLayer.current);

    const group = L.layerGroup();

    async function drawRoutes() {
      for (const zone of zones) {
        if (!zone.lat || !zone.lng) continue;
        const coords = await fetchRoute(HQ, zone);
        if (!coords) continue;
        L.polyline(coords, { color: '#00d4ff', weight: 2, dashArray: '6,4', opacity: 0.6 }).addTo(group);
      }
      group.addTo(map);
      routeLayer.current = group;
    }

    drawRoutes();
  }, [zones]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 0 30px rgba(0,0,0,.6)' }}
      />

      {/* Sim Panel */}
      {simPanelZone && (
        <SimPanel
          zone={simPanelZone}
          delta={zoneOverrides[simPanelZone.zone_id] || 0}
          onEscalate={() => onZoneOverride?.(simPanelZone.zone_id, 0.5)}
          onDeescalate={() => onZoneOverride?.(simPanelZone.zone_id, -0.5)}
          onReset={() => onZoneOverrideReset?.(simPanelZone.zone_id)}
          onClose={() => setSimPanelZone(null)}
        />
      )}

      {/* Legend */}
      <div style={{
        position:'absolute', top:'12px', right:'12px', zIndex:900,
        background:'rgba(6,11,22,0.92)', border:'1px solid rgba(0,180,255,0.15)',
        borderRadius:'10px', padding:'10px 14px',
        fontFamily:'IBM Plex Mono, monospace', fontSize:'8px',
      }}>
        <div style={{color:'#1a3a54',letterSpacing:'0.14em',marginBottom:'8px'}}>CLICK ZONE TO SIMULATE</div>
        {Object.entries(THREAT_COLORS).map(([k,c]) => (
          <div key={k} style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'4px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:c,boxShadow:`0 0 5px ${c}`}}/>
            <span style={{color:c}}>{k}</span>
          </div>
        ))}
        <div style={{borderTop:'1px solid rgba(0,180,255,0.1)',marginTop:'8px',paddingTop:'8px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'3px'}}>
            <span style={{color:'#ff8c00'}}>↑</span><span style={{color:'#2a4a6a'}}>Escalated</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
            <span style={{color:'#00ff9d'}}>↓</span><span style={{color:'#2a4a6a'}}>De-escalated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
