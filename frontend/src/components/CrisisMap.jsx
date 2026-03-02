import { useEffect, useRef } from 'react';
import L from 'leaflet';

const HAZARD_ICONS = {
  Hurricane: '⛈',
  Earthquake: '🌋',
  Flood: '🌊',
  Wildfire: '🔥',
  'Disease Outbreak': '☣',
  Landslide: '⛰',
  Conflict: '⚡',
};

const THREAT_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
};

function makeZoneIcon(zone) {
  const color = THREAT_COLORS[zone.threat_label] || '#22c55e';
  const isCritical = zone.threat_label === 'CRITICAL';
  const isHigh = zone.threat_label === 'HIGH';

  const size = Math.max(34, Math.min(56, (zone.population_at_risk || 5000) / 450));

  const pulseRing = (isCritical || isHigh)
    ? `
      <div style="
        position:absolute;
        top:50%;
        left:50%;
        width:${size + 22}px;
        height:${size + 22}px;
        transform:translate(-50%,-50%);
        border-radius:50%;
        border:2px solid ${color};
        opacity:0.4;
        animation:pulse-ring 2s infinite;
      "></div>
    `
    : '';

  const outerGlow = isCritical
    ? `box-shadow:0 0 30px ${color}88;`
    : `box-shadow:0 0 18px ${color}55;`;

  return L.divIcon({
    className: '',
    iconSize: [size + 30, size + 30],
    iconAnchor: [(size + 30) / 2, (size + 30) / 2],
    html: `
      <div style="position:relative;width:${size + 30}px;height:${size + 30}px;display:flex;align-items:center;justify-content:center;">
        ${pulseRing}
        <div style="
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          background:${color}22;
          border:2px solid ${color};
          display:flex;
          align-items:center;
          justify-content:center;
          flex-direction:column;
          backdrop-filter:blur(6px);
          ${outerGlow}
          cursor:pointer;
          transition:all 0.2s ease;
        ">
          <span style="font-size:${size * 0.38}px;line-height:1;">
            ${HAZARD_ICONS[zone.hazard_type] || '◉'}
          </span>
          <span style="
            font-size:8px;
            color:${color};
            font-family:IBM Plex Mono,monospace;
            margin-top:2px;
            letter-spacing:0.1em;
          ">
            ${zone.zone_id}
          </span>
        </div>
      </div>
    `,
  });
}

function makeShelterIcon(shelter) {
  const pct = shelter.current_occupancy / shelter.capacity;
  const color = pct > 0.92 ? '#f97316' : '#38bdf8';

  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div style="
        width:28px;
        height:28px;
        background:${color}22;
        border:1.5px solid ${color};
        border-radius:6px;
        display:flex;
        align-items:center;
        justify-content:center;
        backdrop-filter:blur(6px);
        box-shadow:0 0 10px ${color}44;
      ">
        <span style="font-size:13px;">🏠</span>
      </div>
    `,
  });
}

function makePingIcon() {
  return L.divIcon({
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `
      <div style="position:relative;width:16px;height:16px;">
        <div style="
          position:absolute;
          top:50%;
          left:50%;
          width:24px;
          height:24px;
          transform:translate(-50%,-50%);
          border-radius:50%;
          background:rgba(239,68,68,0.35);
          animation:pulse-ring 1.5s infinite;
        "></div>
        <div style="
          width:12px;
          height:12px;
          background:#ef4444;
          border-radius:50%;
          border:1.5px solid #fca5a5;
          position:absolute;
          top:2px;
          left:2px;
          animation:blink 1s infinite;
        "></div>
      </div>
    `,
  });
}

function makePopupContent(zone) {
  const tc = THREAT_COLORS[zone.threat_label] || '#22c55e';

  return `
    <div style="
      font-family:IBM Plex Mono,monospace;
      min-width:240px;
      padding:6px;
      color:#e2eaf4;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:20px;">${HAZARD_ICONS[zone.hazard_type] || '◉'}</span>
        <div>
          <div style="font-family:Syne,sans-serif;font-weight:700;font-size:13px;">
            ${zone.name}
          </div>
          <div style="
            font-size:8px;
            padding:2px 6px;
            background:${tc}22;
            border:1px solid ${tc}44;
            border-radius:4px;
            color:${tc};
            display:inline-block;
            letter-spacing:0.12em;
            margin-top:4px;
          ">
            ${zone.threat_label}
          </div>
        </div>
      </div>

      <div style="
        font-size:9px;
        color:#8eacc8;
        margin-bottom:6px;
      ">
        Severity: ${zone.severity_level?.toFixed(1)}/10<br/>
        Priority: ${Math.round((zone.priority || 0) * 100)}%<br/>
        Confidence: ${zone.confidence}%<br/>
        Population: ${(zone.population_at_risk || 0).toLocaleString()}
      </div>

      <div style="
        font-size:8px;
        color:#2a4060;
        border-top:1px solid rgba(56,120,200,0.15);
        padding-top:6px;
      ">
        SOURCE: ${zone.source_type?.toUpperCase()} |
        VERIFIED: ${zone.verified ? '✓' : '✗'}
      </div>
    </div>
  `;
}

export default function CrisisMap({ zones, shelters, citizenPings, selectedZone, onZoneClick }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const zoneMarkersRef = useRef({});

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [40.73, -73.99],
      zoom: 12,
      zoomControl: true,
    });

    // Dark Tactical Tile Layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }
    ).addTo(map);

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !zones) return;

    Object.values(zoneMarkersRef.current).forEach(m => map.removeLayer(m));
    zoneMarkersRef.current = {};

    zones.forEach(zone => {
      if (!zone.lat || !zone.lng) return;

      const marker = L.marker(
        [zone.lat, zone.lng],
        { icon: makeZoneIcon(zone) }
      );

      marker.addTo(map);
      marker.bindPopup(makePopupContent(zone), {
        maxWidth: 300,
        className: 'crisis-popup',
      });

      marker.on('click', () => onZoneClick?.(zone));

      zoneMarkersRef.current[zone.zone_id] = marker;
    });
  }, [zones]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !selectedZone) return;

    map.setView(
      [selectedZone.lat, selectedZone.lng],
      13,
      { animate: true, duration: 0.8 }
    );

    const marker = zoneMarkersRef.current[selectedZone.zone_id];
    if (marker) marker.openPopup();
  }, [selectedZone]);

  return (
    <div
      ref={mapRef}
      style={{
        height: '100%',
        width: '100%',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 0 30px rgba(0,0,0,0.6)',
        animation: 'fadeSlideUp 0.4s ease'
      }}
    />
  );
}