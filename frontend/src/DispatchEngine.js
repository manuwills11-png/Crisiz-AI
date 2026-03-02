// DispatchEngine.js
// Central dispatch system — manages vehicles, routing, severity effects, and event log

export const VEHICLE_TYPES = {
  helicopter: {
    icon: '🚁',
    label: 'Helicopter',
    speedKmh: 240,
    severityReduction: 1.8,
    returnSpeedKmh: 260,
    specialties: ['medical', 'search_rescue', 'rapid_response'],
    color: '#ff8c00',
    capacity: 8,
  },
  ambulance: {
    icon: '🚑',
    label: 'Ambulance',
    speedKmh: 80,
    severityReduction: 0.8,
    returnSpeedKmh: 70,
    specialties: ['medical', 'evacuation'],
    color: '#ff3a5c',
    capacity: 4,
  },
  fire_truck: {
    icon: '🚒',
    label: 'Fire Truck',
    speedKmh: 70,
    severityReduction: 1.4,
    returnSpeedKmh: 65,
    specialties: ['wildfire', 'structural', 'hazmat'],
    color: '#ef4444',
    capacity: 6,
  },
  rescue_team: {
    icon: '🚐',
    label: 'Rescue Team',
    speedKmh: 75,
    severityReduction: 1.2,
    returnSpeedKmh: 60,
    specialties: ['search_rescue', 'evacuation', 'structural'],
    color: '#f97316',
    capacity: 10,
  },
  coast_guard: {
    icon: '🚢',
    label: 'Coast Guard',
    speedKmh: 55,
    severityReduction: 1.0,
    returnSpeedKmh: 50,
    specialties: ['flood', 'maritime'],
    color: '#00d4ff',
    capacity: 12,
  },
  military: {
    icon: '🪖',
    label: 'Military Unit',
    speedKmh: 100,
    severityReduction: 2.0,
    returnSpeedKmh: 90,
    specialties: ['conflict', 'mass_evacuation', 'security'],
    color: '#a78bfa',
    capacity: 20,
  },
  drone: {
    icon: '🛸',
    label: 'Recon Drone',
    speedKmh: 120,
    severityReduction: 0.3,
    returnSpeedKmh: 140,
    specialties: ['recon', 'surveillance'],
    color: '#22c55e',
    capacity: 0,
  },
};

// Map hazard type to best vehicles
export const HAZARD_VEHICLE_MAP = {
  Hurricane:         ['helicopter', 'rescue_team', 'military'],
  Earthquake:        ['rescue_team', 'ambulance', 'military'],
  Flood:             ['helicopter', 'coast_guard', 'rescue_team'],
  Wildfire:          ['fire_truck', 'helicopter', 'rescue_team'],
  'Disease Outbreak': ['ambulance', 'rescue_team', 'drone'],
  Landslide:         ['rescue_team', 'helicopter', 'ambulance'],
  Conflict:          ['military', 'helicopter', 'ambulance'],
};

// Lat/lng distance in km (haversine approximation)
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Interpolate position along straight line (0–1)
export function interpolatePos(from, to, t) {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

// Calculate bearing angle for icon rotation
export function bearingDeg(from, to) {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ETA in ms — fixed visible durations per vehicle type so animation is watchable
// Helicopter: ~15s, Drone: ~18s, Military: ~22s, Ambulance/Rescue: ~30s, Fire: ~35s, Coast Guard: ~40s
export function etaMs(distKm, speedKmh) {
  // Base travel time: 8000ms (8s) minimum, scaled by inverse speed
  // Fastest vehicle (helicopter 240kmh) → ~15s
  // Slowest vehicle (coast guard 55kmh) → ~40s
  const speedFactor = 240 / speedKmh; // 1.0 for helicopter, ~4.4 for coast guard
  const base = 8000;
  return Math.round(base * speedFactor * 1.2);
}

// On-scene time depends on severity (longer = more severe)
// SEV 1 → ~12s, SEV 5 → ~22s, SEV 10 → ~35s
export function onSceneMs(severity) {
  const base = 10000;
  return base + Math.round(severity * 2500);
}

// Generate a dispatch ID
let _dId = 1;
export function newDispatchId() { return `D${String(_dId++).padStart(4, '0')}`; }

// Log messages generator
export const LOG_TYPES = {
  DISPATCH_SENT: 'DISPATCH_SENT',
  DISPATCH_ARRIVED: 'DISPATCH_ARRIVED',
  DISPATCH_ON_SCENE: 'DISPATCH_ON_SCENE',
  DISPATCH_RETURNING: 'DISPATCH_RETURNING',
  DISPATCH_RETURNED: 'DISPATCH_RETURNED',
  SEVERITY_REDUCED: 'SEVERITY_REDUCED',
  ZONE_ESCALATED: 'ZONE_ESCALATED',
  ZONE_DEESCALATED: 'ZONE_DEESCALATED',
  ALERT_TRIGGERED: 'ALERT_TRIGGERED',
  RESOURCE_LOW: 'RESOURCE_LOW',
  COMMS_INTERCEPT: 'COMMS_INTERCEPT',
  SYSTEM: 'SYSTEM',
};

export function makeLogEntry(type, data) {
  const ts = new Date().toISOString();
  const t = new Date().toLocaleTimeString('en-US', { hour12: false });
  const templates = {
    DISPATCH_SENT: () =>
      `[${t}] ◉ DISPATCH ${data.id} · ${data.vehicleIcon} ${data.vehicleLabel} → ${data.zoneName} · ETA ${data.etaSec}s · crew ${data.capacity}`,
    DISPATCH_ARRIVED: () =>
      `[${t}] ▶ ${data.id} ARRIVED ON-SCENE · ${data.zoneName} · initiating ${data.action}`,
    DISPATCH_ON_SCENE: () =>
      `[${t}] ⬡ ${data.id} OPERATING · SEV ${data.oldSev.toFixed(1)} → ${data.newSev.toFixed(1)} · ${data.zoneName}`,
    DISPATCH_RETURNING: () =>
      `[${t}] ← ${data.id} RETURNING TO BASE · mission complete · ${data.zoneName}`,
    DISPATCH_RETURNED: () =>
      `[${t}] ✓ ${data.id} RETURNED · ${data.vehicleLabel} AVAILABLE · total op ${data.totalTimeSec}s`,
    SEVERITY_REDUCED: () =>
      `[${t}] ▼ SEVERITY REDUCED · ${data.zoneName} · ${data.oldSev.toFixed(1)} → ${data.newSev.toFixed(1)} · Δ−${data.delta.toFixed(1)}`,
    ZONE_ESCALATED: () =>
      `[${t}] ⚠ ZONE ESCALATED · ${data.zoneName} · SEV ${data.oldSev.toFixed(1)} → ${data.newSev.toFixed(1)} · ${data.newThreat}`,
    ZONE_DEESCALATED: () =>
      `[${t}] ↓ ZONE STABILIZING · ${data.zoneName} · SEV ${data.oldSev.toFixed(1)} → ${data.newSev.toFixed(1)} · ${data.newThreat}`,
    ALERT_TRIGGERED: () =>
      `[${t}] 🔴 NEW ALERT · ${data.zoneName} · ${data.hazard} · THREAT ${data.threat} · CONF ${data.conf}%`,
    RESOURCE_LOW: () =>
      `[${t}] ⚡ RESOURCE WARNING · ${data.resource} · only ${data.count} units remaining`,
    COMMS_INTERCEPT: () =>
      `[${t}] 📡 COMMS · ${data.id} → BASE: "${data.message}"`,
    SYSTEM: () =>
      `[${t}] ◈ SYSTEM · ${data.message}`,
  };
  return {
    id: `log-${Date.now()}-${Math.random()}`,
    type,
    ts,
    text: (templates[type] || (() => `[${t}] ${JSON.stringify(data)}`))(),
    data,
  };
}

const COMMS_MESSAGES = {
  helicopter: [
    'Visual on target. Beginning descent.',
    'LZ is hot. Proceeding with caution.',
    'Survivors located. Initiating extraction.',
    'Weather degrading. Adjusting approach.',
    'Fuel at 40%. ETA to base 8 min.',
    'All personnel secured. RTB.',
  ],
  ambulance: [
    'Multiple casualties. Requesting backup.',
    'Triaging on scene. 3 critical, 7 stable.',
    'Establishing field hospital.',
    'Route blocked. Taking alternate.',
    'Patient stabilized. En route to hospital.',
  ],
  fire_truck: [
    'Fire line advancing. Wind at 25kph.',
    'Structure unstable. Maintaining perimeter.',
    'Water supply depleting. Request tanker.',
    'Hotspot contained. Monitoring for flare-up.',
    'All clear. Overhauling zone.',
  ],
  rescue_team: [
    'Structural damage severe. Search grid active.',
    'Survivor located in sector 4.',
    'Heavy equipment needed. Requesting crane.',
    'Body of water blocking access. Pivoting north.',
    'All survivors accounted for. Stand down.',
  ],
  military: [
    'Perimeter secured. Population control active.',
    'Hostile elements neutralized.',
    'Logistics convoy en route.',
    'Civil unrest contained. Maintaining presence.',
    'Rules of engagement in effect.',
  ],
  coast_guard: [
    'Vessel in distress. Deploying rescue swimmer.',
    'Water current at 8 knots. Adjusting course.',
    'Flood waters receding in sector 2.',
    'Debris field — reducing speed.',
    'All survivors aboard. Heading to shore.',
  ],
  drone: [
    'Thermal imaging active. Scanning.',
    'Target zone mapped. Uploading to HQ.',
    'Anomaly detected at grid 4-7.',
    'Battery at 30%. Returning to base.',
    'Live feed stable. All systems nominal.',
  ],
};

export function randomCommsMessage(vehicleType) {
  const msgs = COMMS_MESSAGES[vehicleType] || ['Status nominal.'];
  return msgs[Math.floor(Math.random() * msgs.length)];
}
