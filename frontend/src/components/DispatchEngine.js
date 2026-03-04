// DispatchEngine.js — VIT Chennai Crisis Command

export const HQ = { lat: 12.8406, lng: 80.1534 };

export const DEMO_ZONES = [
  { zone_id:'Z001', name:'Marina Beach District',   hazard_type:'Flood',            lat:13.0500, lng:80.2824, severity_level:7.2, confidence:82, threat_label:'HIGH',     priority:0.72, population_at_risk:45000, verified:true,  source_type:'satellite' },
  { zone_id:'Z002', name:'Tambaram Industrial Zone', hazard_type:'Wildfire',         lat:12.9249, lng:80.1000, severity_level:8.5, confidence:91, threat_label:'CRITICAL', priority:0.85, population_at_risk:28000, verified:true,  source_type:'sensor' },
  { zone_id:'Z003', name:'Chromepet Residential',    hazard_type:'Earthquake',       lat:12.9516, lng:80.1462, severity_level:5.8, confidence:68, threat_label:'MODERATE', priority:0.58, population_at_risk:62000, verified:true,  source_type:'sensor' },
  { zone_id:'Z004', name:'Kancheepuram Zone',        hazard_type:'Disease Outbreak', lat:12.8342, lng:79.7036, severity_level:9.1, confidence:88, threat_label:'CRITICAL', priority:0.91, population_at_risk:35000, verified:true,  source_type:'agency' },
  { zone_id:'Z005', name:'Mahabalipuram Coast',      hazard_type:'Flood',            lat:12.6269, lng:80.1927, severity_level:6.4, confidence:74, threat_label:'HIGH',     priority:0.64, population_at_risk:18000, verified:true,  source_type:'satellite' },
  { zone_id:'Z006', name:'Chengalpattu Hills',       hazard_type:'Landslide',        lat:12.6921, lng:79.9760, severity_level:4.2, confidence:60, threat_label:'MODERATE', priority:0.42, population_at_risk:12000, verified:false, source_type:'citizen' },
  { zone_id:'Z007', name:'Pallavaram Sector',        hazard_type:'Hurricane',        lat:12.9675, lng:80.1491, severity_level:7.8, confidence:85, threat_label:'HIGH',     priority:0.78, population_at_risk:41000, verified:true,  source_type:'agency' },
];

// Fleet: total = how many units HQ has; tracks in/out
export const FLEET = {
  helicopter:  { total: 3 },
  ambulance:   { total: 6 },
  fire_truck:  { total: 4 },
  rescue_team: { total: 5 },
  coast_guard: { total: 2 },
  military:    { total: 3 },
  drone:       { total: 4 },
};

export const VEHICLE_TYPES = {
  helicopter: {
    icon:'🚁', label:'Helicopter',
    speedKmh:240, returnSpeedKmh:260,
    severityReduction:1.8, capacity:8, color:'#ff8c00',
    specialties:['medical','search_rescue','rapid_response'],
  },
  ambulance: {
    icon:'🚑', label:'Ambulance',
    speedKmh:80, returnSpeedKmh:70,
    severityReduction:0.8, capacity:4, color:'#ff3a5c',
    specialties:['medical','evacuation'],
  },
  fire_truck: {
    icon:'🚒', label:'Fire Truck',
    speedKmh:70, returnSpeedKmh:65,
    severityReduction:1.4, capacity:6, color:'#ef4444',
    specialties:['wildfire','structural','hazmat'],
  },
  rescue_team: {
    icon:'🚐', label:'Rescue Team',
    speedKmh:75, returnSpeedKmh:60,
    severityReduction:1.2, capacity:10, color:'#f97316',
    specialties:['search_rescue','evacuation','structural'],
  },
  coast_guard: {
    icon:'🚢', label:'Coast Guard',
    speedKmh:55, returnSpeedKmh:50,
    severityReduction:1.0, capacity:12, color:'#00d4ff',
    specialties:['flood','maritime'],
  },
  military: {
    icon:'🪖', label:'Military Unit',
    speedKmh:100, returnSpeedKmh:90,
    severityReduction:2.0, capacity:20, color:'#a78bfa',
    specialties:['conflict','mass_evacuation','security'],
  },
  drone: {
    icon:'🛸', label:'Recon Drone',
    speedKmh:120, returnSpeedKmh:140,
    severityReduction:0.3, capacity:0, color:'#22c55e',
    specialties:['recon','surveillance'],
  },
};

export const HAZARD_VEHICLE_MAP = {
  Hurricane:          ['helicopter','rescue_team','military'],
  Earthquake:         ['rescue_team','ambulance','military'],
  Flood:              ['helicopter','coast_guard','rescue_team'],
  Wildfire:           ['fire_truck','helicopter','rescue_team'],
  'Disease Outbreak': ['ambulance','rescue_team','drone'],
  Landslide:          ['rescue_team','helicopter','ambulance'],
  Conflict:           ['military','helicopter','ambulance'],
  'Trapped Person':   ['helicopter','rescue_team','ambulance'],
};

export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

export function interpolatePos(from, to, t) {
  return { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
}

export function bearingDeg(from, to) {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat  * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

export function etaMs(distKm, speedKmh) {
  // Real travel time, minimum 8s, maximum 90s for demo pacing
  const realMs = (distKm / speedKmh) * 3600 * 1000;
  return Math.min(90000, Math.max(8000, Math.round(realMs * 0.04))); // 40ms per real second = ~25x speedup
}

export function onSceneMs(severity) {
  return 8000 + Math.round(severity * 2000);
}

let _dId = 1;
export function newDispatchId() { return `D${String(_dId++).padStart(4,'0')}`; }

export const LOG_TYPES = {
  DISPATCH_SENT:      'DISPATCH_SENT',
  DISPATCH_ARRIVED:   'DISPATCH_ARRIVED',
  DISPATCH_ON_SCENE:  'DISPATCH_ON_SCENE',
  DISPATCH_RETURNING: 'DISPATCH_RETURNING',
  DISPATCH_RETURNED:  'DISPATCH_RETURNED',
  DISPATCH_CANCELLED: 'DISPATCH_CANCELLED',
  SEVERITY_REDUCED:   'SEVERITY_REDUCED',
  ZONE_ESCALATED:     'ZONE_ESCALATED',
  ZONE_DEESCALATED:   'ZONE_DEESCALATED',
  ALERT_TRIGGERED:    'ALERT_TRIGGERED',
  RESOURCE_LOW:       'RESOURCE_LOW',
  COMMS_INTERCEPT:    'COMMS_INTERCEPT',
  SYSTEM:             'SYSTEM',
};

export function makeLogEntry(type, data) {
  const ts = new Date().toISOString();
  const t  = new Date().toLocaleTimeString('en-US', { hour12:false });
  const templates = {
    DISPATCH_SENT:      () => `[${t}] ◉ DISPATCH ${data.id} · ${data.vehicleIcon} ${data.vehicleLabel} → ${data.zoneName} · ETA ${data.etaSec}s · crew ${data.capacity}`,
    DISPATCH_ARRIVED:   () => `[${t}] ▶ ${data.id} ON-SCENE · ${data.zoneName} · ${data.action}`,
    DISPATCH_ON_SCENE:  () => `[${t}] ⬡ ${data.id} OPERATING · SEV ${data.oldSev.toFixed(1)} → ${data.newSev.toFixed(1)} · ${data.zoneName}`,
    DISPATCH_RETURNING: () => `[${t}] ← ${data.id} RETURNING · mission complete · ${data.zoneName}`,
    DISPATCH_RETURNED:  () => `[${t}] ✓ ${data.id} RETURNED · ${data.vehicleLabel} AVAILABLE · op ${data.totalTimeSec}s`,
    DISPATCH_CANCELLED: () => `[${t}] ✕ ${data.id} CANCELLED · ${data.vehicleLabel} returned to pool`,
    SEVERITY_REDUCED:   () => `[${t}] ▼ SEV REDUCED · ${data.zoneName} · ${data.oldSev.toFixed(1)} → ${data.newSev.toFixed(1)} · Δ−${data.delta.toFixed(1)}`,
    ZONE_ESCALATED:     () => `[${t}] ⚠ ESCALATED · ${data.zoneName} · ${data.oldSev.toFixed(1)} → ${data.newSev.toFixed(1)} · ${data.newThreat}`,
    ZONE_DEESCALATED:   () => `[${t}] ↓ STABILIZING · ${data.zoneName} · ${data.oldSev.toFixed(1)} → ${data.newSev.toFixed(1)} · ${data.newThreat}`,
    RESOURCE_LOW:       () => `[${t}] ⚡ RESOURCE LOW · ${data.resource} · ${data.count} remaining`,
    COMMS_INTERCEPT:    () => `[${t}] 📡 COMMS · ${data.id} → BASE: "${data.message}"`,
    SYSTEM:             () => `[${t}] ◈ ${data.message}`,
  };
  return { id:`log-${Date.now()}-${Math.random()}`, type, ts, text:(templates[type]||(()=>JSON.stringify(data)))(), data };
}

const COMMS = {
  helicopter: ['Visual on target. Beginning descent.','LZ is hot. Proceeding with caution.','Survivors located. Initiating extraction.','Fuel at 40%. ETA to base 8 min.','All personnel secured. RTB.'],
  ambulance:  ['Multiple casualties. Requesting backup.','Triaging on scene. 3 critical, 7 stable.','Establishing field hospital.','Patient stabilized. En route to hospital.'],
  fire_truck: ['Fire line advancing. Wind at 25kph.','Structure unstable. Maintaining perimeter.','Water supply depleting. Request tanker.','All clear. Overhauling zone.'],
  rescue_team:['Structural damage severe. Search grid active.','Survivor located in sector 4.','Heavy equipment needed.','All survivors accounted for. Stand down.'],
  military:   ['Perimeter secured.','Logistics convoy en route.','Civil unrest contained.','Rules of engagement in effect.'],
  coast_guard:['Vessel in distress. Deploying rescue swimmer.','Flood waters receding in sector 2.','All survivors aboard.'],
  drone:      ['Thermal imaging active. Scanning.','Target zone mapped. Uploading to HQ.','Anomaly detected at grid 4-7.','Battery at 30%. Returning to base.'],
};
export function randomCommsMessage(v) {
  const msgs = COMMS[v] || ['Status nominal.'];
  return msgs[Math.floor(Math.random() * msgs.length)];
}
