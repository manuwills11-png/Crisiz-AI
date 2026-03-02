// useDispatch.js
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  VEHICLE_TYPES, distanceKm, etaMs, onSceneMs, newDispatchId,
  makeLogEntry, LOG_TYPES, randomCommsMessage, interpolatePos, bearingDeg
} from './DispatchEngine';

const HQ = { lat: 40.73, lng: -73.99 };

export function useDispatch({ zones, zoneOverrides, setZoneOverrides, onZoneOverride }) {
  const [dispatches, setDispatches] = useState([]);   // active + historical
  const [logEntries, setLogEntries] = useState([
    makeLogEntry(LOG_TYPES.SYSTEM, { message: 'Crisis Operations Center ONLINE. All systems nominal.' }),
    makeLogEntry(LOG_TYPES.SYSTEM, { message: 'Dispatch coordinator ready. Awaiting first deployment order.' }),
  ]);
  const timersRef = useRef({});  // zoneId → timer handles

  const addLog = useCallback((type, data) => {
    setLogEntries(prev => [makeLogEntry(type, data), ...prev].slice(0, 300));
  }, []);

  // Send a dispatch
  const sendDispatch = useCallback((zone, vehicleKey) => {
    const vehicle = VEHICLE_TYPES[vehicleKey];
    if (!zone?.lat || !zone?.lng) return;

    const id = newDispatchId();
    const dist = distanceKm(HQ, zone);
    const travelMs = etaMs(dist, vehicle.speedKmh);
    const etaSec = Math.round(travelMs / 1000);
    const departedAt = Date.now();

    const dispatch = {
      id,
      vehicleKey,
      vehicleIcon: vehicle.icon,
      vehicleLabel: vehicle.label,
      vehicleColor: vehicle.color,
      zoneId: zone.zone_id,
      zoneName: zone.name,
      zoneLat: zone.lat,
      zoneLng: zone.lng,
      severity: zone.severity_level,
      dist,
      departedAt,
      arrivedAt: null,
      returnedAt: null,
      travelMs,
      status: 'en_route',   // en_route | on_scene | returning | returned
      bearing: bearingDeg(HQ, zone),
      currentPos: { ...HQ },
    };

    setDispatches(prev => [dispatch, ...prev]);
    addLog(LOG_TYPES.DISPATCH_SENT, {
      id, vehicleIcon: vehicle.icon, vehicleLabel: vehicle.label,
      zoneName: zone.name, etaSec, capacity: vehicle.capacity,
    });

    // Schedule random comms messages during travel
    const commsDelays = [0.3, 0.6, 0.85].map(f => travelMs * f);
    commsDelays.forEach((delay, i) => {
      const h = setTimeout(() => {
        addLog(LOG_TYPES.COMMS_INTERCEPT, {
          id, message: randomCommsMessage(vehicleKey),
        });
      }, delay);
      timersRef.current[`${id}-comms-${i}`] = h;
    });

    // Arrival
    const arrivalH = setTimeout(() => {
      const arrivedAt = Date.now();
      setDispatches(prev => prev.map(d =>
        d.id === id ? { ...d, status: 'on_scene', arrivedAt, currentPos: { lat: zone.lat, lng: zone.lng } } : d
      ));
      addLog(LOG_TYPES.DISPATCH_ARRIVED, {
        id, zoneName: zone.name,
        action: vehicleKey === 'drone' ? 'aerial surveillance' : vehicleKey === 'ambulance' ? 'medical triage' : 'search & rescue',
      });

      // Severity reduction on arrival
      const reduction = vehicle.severityReduction;
      const currentSev = (zoneOverrides[zone.zone_id] || 0) + (zone.severity_level || 0);
      const newSev = Math.max(0, currentSev - reduction * 0.5); // partial on arrival
      const deltaSevArrival = currentSev - newSev;

      addLog(LOG_TYPES.DISPATCH_ON_SCENE, {
        id, zoneName: zone.name,
        oldSev: currentSev, newSev,
      });

      // Apply severity reduction (as override delta)
      const currentDelta = zoneOverrides[zone.zone_id] || 0;
      const baseSev = zone.severity_level || 0;
      const newDelta = Math.max(-baseSev, currentDelta - deltaSevArrival);
      if (onZoneOverride) {
        // Set exact delta rather than incrementing
        setZoneOverrides(prev => ({
          ...prev,
          [zone.zone_id]: newDelta,
        }));
      }

      addLog(LOG_TYPES.SEVERITY_REDUCED, {
        zoneName: zone.name,
        oldSev: currentSev, newSev, delta: deltaSevArrival,
      });

      // On-scene duration: depends on severity
      const sceneMs = onSceneMs(zone.severity_level || 5);

      const commsOnScene = setTimeout(() => {
        addLog(LOG_TYPES.COMMS_INTERCEPT, { id, message: randomCommsMessage(vehicleKey) });
      }, sceneMs * 0.5);
      timersRef.current[`${id}-scene-comms`] = commsOnScene;

      // Return trip
      const returnH = setTimeout(() => {
        const returnDist = distanceKm(zone, HQ);
        const returnMs = etaMs(returnDist, vehicle.returnSpeedKmh);

        setDispatches(prev => prev.map(d =>
          d.id === id ? { ...d, status: 'returning', returnDepartedAt: Date.now(), returnMs, bearing: bearingDeg(zone, HQ) } : d
        ));
        addLog(LOG_TYPES.DISPATCH_RETURNING, { id, zoneName: zone.name });

        // Apply remaining severity reduction while on scene
        const sevAfterScene = Math.max(0, newSev - reduction * 0.5);
        const deltaScene = newSev - sevAfterScene;
        if (deltaScene > 0) {
          setZoneOverrides(prev => ({
            ...prev,
            [zone.zone_id]: Math.max(-(zone.severity_level || 0), (prev[zone.zone_id] || 0) - deltaScene),
          }));
          addLog(LOG_TYPES.SEVERITY_REDUCED, {
            zoneName: zone.name,
            oldSev: newSev, newSev: sevAfterScene, delta: deltaScene,
          });
        }

        // Final return
        const finalH = setTimeout(() => {
          const totalTimeSec = Math.round((Date.now() - departedAt) / 1000);
          setDispatches(prev => prev.map(d =>
            d.id === id ? { ...d, status: 'returned', returnedAt: Date.now(), currentPos: { ...HQ } } : d
          ));
          addLog(LOG_TYPES.DISPATCH_RETURNED, {
            id, vehicleLabel: vehicle.label, totalTimeSec,
          });
          // Remove from map after a few seconds
          setTimeout(() => {
            setDispatches(prev => prev.filter(d => d.id !== id || d.status !== 'returned'));
          }, 5000);
        }, returnMs);
        timersRef.current[`${id}-return`] = finalH;
      }, sceneMs);
      timersRef.current[`${id}-scene`] = returnH;
    }, travelMs);
    timersRef.current[`${id}-arrival`] = arrivalH;

    return id;
  }, [zoneOverrides, onZoneOverride, addLog]);

  // Animate dispatch positions on a rAF loop
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf;
    const animate = () => {
      setTick(t => t + 1);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Compute current interpolated positions for all active dispatches
  const liveDispatches = dispatches.map(d => {
    if (d.status === 'en_route') {
      const elapsed = Date.now() - d.departedAt;
      const t = Math.min(1, elapsed / d.travelMs);
      const origin = HQ;
      const dest = { lat: d.zoneLat, lng: d.zoneLng };
      return { ...d, currentPos: interpolatePos(origin, dest, t), progress: t };
    }
    if (d.status === 'returning') {
      const elapsed = Date.now() - d.returnDepartedAt;
      const t = Math.min(1, elapsed / d.returnMs);
      const origin = { lat: d.zoneLat, lng: d.zoneLng };
      const dest = HQ;
      return { ...d, currentPos: interpolatePos(origin, dest, t), progress: t };
    }
    return d;
  });

  // Log when zone severity changes significantly (escalation detection)
  const prevSeveritiesRef = useRef({});
  useEffect(() => {
    zones.forEach(z => {
      const prev = prevSeveritiesRef.current[z.zone_id];
      const curr = z.severity_level;
      if (prev !== undefined && Math.abs(curr - prev) >= 0.5) {
        const oldThreat = prev > 8 ? 'CRITICAL' : prev > 6 ? 'HIGH' : prev > 3 ? 'MODERATE' : 'LOW';
        const newThreat = curr > 8 ? 'CRITICAL' : curr > 6 ? 'HIGH' : curr > 3 ? 'MODERATE' : 'LOW';
        if (oldThreat !== newThreat) {
          if (curr > prev) {
            addLog(LOG_TYPES.ZONE_ESCALATED, { zoneName: z.name, oldSev: prev, newSev: curr, newThreat });
          } else {
            addLog(LOG_TYPES.ZONE_DEESCALATED, { zoneName: z.name, oldSev: prev, newSev: curr, newThreat });
          }
        }
      }
      prevSeveritiesRef.current[z.zone_id] = curr;
    });
  }, [zones]);

  // Cleanup timers
  useEffect(() => {
    return () => Object.values(timersRef.current).forEach(clearTimeout);
  }, []);

  return { dispatches: liveDispatches, logEntries, sendDispatch, addLog };
}
