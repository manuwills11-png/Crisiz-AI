import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { bearingDeg, VEHICLE_TYPES } from './DispatchEngine';

/* ---------------- STYLES ---------------- */
const STYLES = `
@keyframes pulse-ring {
  0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.6; }
  70%  { transform: translate(-50%,-50%) scale(1.3);  opacity: 0; }
  100% { transform: translate(-50%,-50%) scale(0.85); opacity: 0; }
}
@keyframes vehicle-glow {
  0%,100% { box-shadow: 0 0 8px var(--vc, #00d4ff); }
  50%      { box-shadow: 0 0 18px var(--vc, #00d4ff); }
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

const HQ = { lat: 40.73, lng: -73.99 };
const THREAT_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MODERATE: '#eab308', LOW: '#22c55e' };
const HAZARD_ICONS = { Hurricane:'⛈', Earthquake:'🌋', Flood:'🌊', Wildfire:'🔥', 'Disease Outbreak':'☣', Landslide:'⛰', Conflict:'⚡' };

function getThreat(sev) {
  return sev > 8 ? 'CRITICAL' : sev > 6 ? 'HIGH' : sev > 3 ? 'MODERATE' : 'LOW';
}

async function fetchRoute(start, end) {
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok') return null;
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch { return null; }
}

function makeZoneIcon(zone) {
  const threat = getThreat(zone.severity_level || 0);
  const color = THREAT_COLORS[threat];
  const simDelta = zone._simDelta || 0;
  const ringColor = simDelta !== 0 ? (simDelta > 0 ? '#ff8c00' : '#00ff9d') : color;
  return L.divIcon({
    className: '', iconSize: [70, 70], iconAnchor: [35, 35],
    html: `<div style="position:relative;width:70px;height:70px;">
      <div style="position:absolute;top:50%;left:50%;width:50px;height:50px;border-radius:50%;border:2px solid ${ringColor};transform:translate(-50%,-50%);animation:pulse-ring 1.5s infinite;"></div>
      <div style="position:absolute;top:50%;left:50%;width:40px;height:40px;border-radius:50%;background:${color}22;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px ${color}88;font-size:18px;transform:translate(-50%,-50%);">${HAZARD_ICONS[zone.hazard_type]||'◉'}</div>
      ${simDelta!==0?`<div style="position:absolute;top:0;right:0;width:16px;height:16px;border-radius:50%;background:${simDelta>0?'#ff8c00':'#00ff9d'};border:2px solid #0a1020;display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;">${simDelta>0?'↑':'↓'}</div>`:''}
    </div>`
  });
}

function makeVehicleIcon(d) {
  const v = VEHICLE_TYPES[d.vehicleKey] || {};
  const color = v.color || '#00d4ff';
  const isOnScene = d.status === 'on_scene';
  const isReturning = d.status === 'returning';

  let rotation = 0;
  if (d.status === 'en_route') rotation = bearingDeg(HQ, { lat: d.zoneLat, lng: d.zoneLng });
  else if (isReturning) rotation = bearingDeg({ lat: d.zoneLat, lng: d.zoneLng }, HQ);

  const bg = isOnScene ? `${color}33` : isReturning ? `${color}22` : `${color}18`;
  const borderColor = isOnScene ? color : `${color}88`;
  const pulse = isOnScene ? `animation:pulse-ring 1s infinite;` : '';

  return L.divIcon({
    className: '', iconSize: [52, 60], iconAnchor: [26, 26],
    html: `<div style="position:relative;width:52px;height:60px;">
      ${isOnScene ? `<div style="position:absolute;top:22px;left:50%;width:44px;height:44px;border-radius:50%;border:2px solid ${color};transform:translate(-50%,-50%);${pulse}"></div>` : ''}
      <div style="position:absolute;top:22px;left:50%;width:34px;height:34px;border-radius:50%;background:${bg};border:2px solid ${borderColor};display:flex;align-items:center;justify-content:center;font-size:17px;transform:translate(-50%,-50%) rotate(${rotation}deg);box-shadow:0 0 12px ${color}55;transition:transform 0.8s ease;">${v.icon||'🚗'}</div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);background:rgba(2,5,14,0.92);border:1px solid ${color}55;border-radius:3px;padding:1px 5px;font-family:IBM Plex Mono,monospace;font-size:7px;color:${color};white-space:nowrap;">${d.id}</div>
    </div>`
  });
}

/* Sim Panel */
function SimPanel({ zone, delta, onEscalate, onDeescalate, onReset, onClose }) {
  const threat = getThreat(zone.severity_level || 0);
  const tc = THREAT_COLORS[threat];
  return (
    <div style={{ position:'absolute', bottom:'24px', left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'rgba(6,11,22,0.97)', border:`1px solid ${tc}55`, borderRadius:'14px', padding:'14px 18px', minWidth:'300px', maxWidth:'360px', boxShadow:`0 0 40px rgba(0,0,0,0.8),0 0 20px ${tc}22`, animation:'sim-panel-in 0.2s ease', fontFamily:'IBM Plex Mono,monospace' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <div>
          <div style={{ fontSize:'8px', color:'#ff8c00', letterSpacing:'0.16em', marginBottom:'3px' }}>⚡ RISK SIMULATOR</div>
          <div style={{ fontSize:'13px', fontWeight:700, color:tc }}>{zone.name}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#2a4a6a', fontSize:'16px', cursor:'pointer' }}>✕</button>
      </div>
      <div style={{ background:'rgba(0,180,255,0.05)', border:'1px solid rgba(0,180,255,0.1)', borderRadius:'8px', padding:'10px 14px', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
          <span style={{ fontSize:'7.5px', color:'#1a3a54', letterSpacing:'0.12em' }}>SEVERITY LEVEL</span>
          <span style={{ fontSize:'8px', color:tc, background:`${tc}18`, padding:'1px 8px', borderRadius:'4px', border:`1px solid ${tc}35` }}>{threat}</span>
        </div>
        <div style={{ height:'6px', background:'rgba(0,180,255,0.08)', borderRadius:'3px', overflow:'hidden', marginBottom:'4px' }}>
          <div style={{ height:'100%', width:`${Math.min(100,(zone.severity_level||0)*10)}%`, background:tc, borderRadius:'3px', transition:'width 0.4s ease' }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'8px' }}>
          <span style={{ color:'#1a3a54' }}>0</span>
          <span style={{ color:tc, fontWeight:700, fontSize:'14px' }}>{(zone.severity_level||0).toFixed(1)}</span>
          <span style={{ color:'#1a3a54' }}>10</span>
        </div>
        {delta !== 0 && <div style={{ marginTop:'6px', fontSize:'8px', color:delta>0?'#ff8c00':'#00ff9d', textAlign:'center' }}>{delta>0?'▲ ESCALATED':'▼ DE-ESCALATED'} by {Math.abs(delta).toFixed(1)}</div>}
      </div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
        <button onClick={onEscalate} style={{ flex:1, background:'rgba(255,58,92,0.1)', border:'1px solid rgba(255,58,92,0.3)', borderRadius:'8px', padding:'8px', color:'#ff3a5c', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
          <span style={{ fontSize:'15px' }}>▲</span>
          <div><div style={{ fontSize:'9px', letterSpacing:'0.1em' }}>ESCALATE</div><div style={{ fontSize:'7px', color:'rgba(255,58,92,0.6)' }}>+0.5 severity</div></div>
        </button>
        <button onClick={onDeescalate} style={{ flex:1, background:'rgba(0,255,157,0.06)', border:'1px solid rgba(0,255,157,0.2)', borderRadius:'8px', padding:'8px', color:'#00ff9d', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
          <span style={{ fontSize:'15px' }}>▼</span>
          <div><div style={{ fontSize:'9px', letterSpacing:'0.1em' }}>DE-ESCALATE</div><div style={{ fontSize:'7px', color:'rgba(0,255,157,0.5)' }}>−0.5 severity</div></div>
        </button>
      </div>
      <div style={{ display:'flex', gap:'10px', fontSize:'8px', color:'#2a4a6a', marginBottom:'10px', flexWrap:'wrap' }}>
        <span>HAZARD: {zone.hazard_type}</span><span>CONF: {zone.confidence}%</span><span>POP: {((zone.population_at_risk||0)/1000).toFixed(1)}K</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        {delta !== 0
          ? <button onClick={onReset} style={{ background:'rgba(0,180,255,0.06)', border:'1px solid rgba(0,180,255,0.2)', borderRadius:'6px', padding:'4px 12px', color:'#00d4ff', fontSize:'8px', fontFamily:'IBM Plex Mono,monospace', cursor:'pointer' }}>↺ RESET ZONE</button>
          : <div/>}
        <div style={{ fontSize:'7px', color:'#1a3a54', textAlign:'right' }}>Changes reflect in<br/>all tabs in real-time</div>
      </div>
    </div>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function CrisisMap({ zones=[], selectedZone, zoneOverrides={}, onZoneOverride, onZoneOverrideReset, onZoneClick, dispatches=[] }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const zoneLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const trappedLayerRef = useRef(null);
  const vehicleLayerRef = useRef(null);
  const vehicleMarkersRef = useRef({});
  const [firebaseReports, setFirebaseReports] = useState([]);
  const [simPanelZone, setSimPanelZone] = useState(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { center: [HQ.lat, HQ.lng], zoom: 12 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    const hqIcon = L.divIcon({ className:'', iconSize:[80,80], iconAnchor:[40,40], html:`<div style="position:relative;width:80px;height:80px;"><div style="position:absolute;top:50%;left:50%;width:60px;height:60px;border-radius:50%;border:3px solid #2563eb;transform:translate(-50%,-50%);animation:pulse-ring 2s infinite;"></div><div style="position:absolute;top:50%;left:50%;width:46px;height:46px;border-radius:50%;background:#2563eb22;border:2px solid #2563eb;display:flex;align-items:center;justify-content:center;box-shadow:0 0 25px #2563ebaa;font-size:22px;transform:translate(-50%,-50%);">🏢</div></div>` });
    L.marker([HQ.lat, HQ.lng], { icon: hqIcon, zIndexOffset: 2000 }).addTo(map);
    vehicleLayerRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    const reportsRef = ref(db, 'alerts');
    const unsub = onValue(reportsRef, snap => {
      const data = snap.val();
      setFirebaseReports(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (trappedLayerRef.current) map.removeLayer(trappedLayerRef.current);
    const group = L.layerGroup();
    firebaseReports.forEach(r => {
      if (!r.lat || !r.lng) return;
      L.marker([Number(r.lat), Number(r.lng)], { icon: L.divIcon({ className:'', iconSize:[60,60], iconAnchor:[30,30], html:`<div style="position:relative;width:60px;height:60px;"><div style="position:absolute;top:50%;left:50%;width:40px;height:40px;border-radius:50%;background:rgba(239,68,68,0.4);transform:translate(-50%,-50%);animation:pulse-ring 1.2s infinite;"></div><div style="position:absolute;top:50%;left:50%;width:14px;height:14px;background:#ff0000;border-radius:50%;box-shadow:0 0 14px #ff0000;transform:translate(-50%,-50%);"></div></div>` }) }).addTo(group);
    });
    group.addTo(map);
    trappedLayerRef.current = group;
  }, [firebaseReports]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (zoneLayerRef.current) map.removeLayer(zoneLayerRef.current);
    const group = L.layerGroup();
    zones.forEach(zone => {
      if (!zone.lat || !zone.lng) return;
      const m = L.marker([zone.lat, zone.lng], { icon: makeZoneIcon(zone), zIndexOffset: zone._simDelta ? 500 : 0 });
      m.on('click', () => { setSimPanelZone(zone); onZoneClick?.(zone); });
      m.addTo(group);
    });
    group.addTo(map);
    zoneLayerRef.current = group;
  }, [zones]);

  useEffect(() => {
    if (!simPanelZone) return;
    const updated = zones.find(z => z.zone_id === simPanelZone.zone_id);
    if (updated) setSimPanelZone(updated);
  }, [zones]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    const group = L.layerGroup();
    (async () => {
      for (const zone of zones) {
        if (!zone.lat || !zone.lng) continue;
        const coords = await fetchRoute(HQ, zone);
        if (coords) L.polyline(coords, { color:'#00d4ff', weight:2, dashArray:'6,4', opacity:0.35 }).addTo(group);
      }
      group.addTo(map);
      routeLayerRef.current = group;
    })();
  }, [zones]);

  /* Animate vehicles — runs every render since dispatches update every rAF tick */
  useEffect(() => {
    const layer = vehicleLayerRef.current;
    if (!layer) return;

    const activeIds = new Set(dispatches.filter(d => d.status !== 'returned').map(d => d.id));

    // Remove stale
    Object.keys(vehicleMarkersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        layer.removeLayer(vehicleMarkersRef.current[id]);
        delete vehicleMarkersRef.current[id];
      }
    });

    // Update / create
    dispatches.forEach(d => {
      if (d.status === 'returned') return;
      const pos = d.currentPos || HQ;
      if (vehicleMarkersRef.current[d.id]) {
        vehicleMarkersRef.current[d.id].setLatLng([pos.lat, pos.lng]);
        vehicleMarkersRef.current[d.id].setIcon(makeVehicleIcon(d));
      } else {
        const m = L.marker([pos.lat, pos.lng], { icon: makeVehicleIcon(d), zIndexOffset: 1000 }).addTo(layer);
        vehicleMarkersRef.current[d.id] = m;
      }
    });
  }, [dispatches]);

  const activeUnits = dispatches.filter(d => d.status !== 'returned');

  return (
    <div style={{ height:'100%', width:'100%', position:'relative' }}>
      <div ref={mapRef} style={{ height:'100%', width:'100%', borderRadius:'10px', overflow:'hidden', boxShadow:'0 0 30px rgba(0,0,0,.6)' }} />

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

      {/* Legend + active units */}
      <div style={{ position:'absolute', top:'12px', right:'12px', zIndex:900, background:'rgba(6,11,22,0.93)', border:'1px solid rgba(0,180,255,0.15)', borderRadius:'10px', padding:'10px 14px', fontFamily:'IBM Plex Mono,monospace', fontSize:'8px', maxWidth:'160px' }}>
        <div style={{ color:'#1a3a54', letterSpacing:'0.14em', marginBottom:'8px' }}>THREAT LEVELS</div>
        {Object.entries(THREAT_COLORS).map(([k,c]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'4px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c, boxShadow:`0 0 5px ${c}`, flexShrink:0 }}/>
            <span style={{ color:c }}>{k}</span>
          </div>
        ))}
        {activeUnits.length > 0 && <>
          <div style={{ borderTop:'1px solid rgba(0,180,255,0.1)', marginTop:'8px', paddingTop:'8px', color:'#1a3a54', letterSpacing:'0.14em', marginBottom:'6px' }}>DEPLOYED UNITS</div>
          {activeUnits.map(d => {
            const v = VEHICLE_TYPES[d.vehicleKey] || {};
            const statusColor = d.status==='en_route'?'#f97316': d.status==='on_scene'?'#00ff9d':'#2a4a6a';
            return (
              <div key={d.id} style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px' }}>
                <span style={{ fontSize:'11px' }}>{v.icon}</span>
                <div>
                  <div style={{ color:statusColor, fontSize:'7px' }}>{d.id}</div>
                  <div style={{ color:'#1a3a54', fontSize:'6.5px' }}>{d.status.replace('_',' ').toUpperCase()}</div>
                </div>
              </div>
            );
          })}
        </>}
        <div style={{ borderTop:'1px solid rgba(0,180,255,0.1)', marginTop:'8px', paddingTop:'8px', color:'#1a3a54', fontSize:'7px' }}>
          CLICK ZONE TO<br/>SIMULATE / DISPATCH
        </div>
      </div>
    </div>
  );
}
