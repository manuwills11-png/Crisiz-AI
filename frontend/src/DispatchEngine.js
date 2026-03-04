import { useState, useCallback, useRef, useEffect } from 'react';
import {
  HQ, FLEET, VEHICLE_TYPES, HAZARD_VEHICLE_MAP, onSceneMs, newDispatchId,
  makeLogEntry, LOG_TYPES, randomCommsMessage, interpolatePos, bearingDeg,
  distanceKm, etaMs,
} from './DispatchEngine';

let _toastId = 0;

export function useDispatch({ zones, zoneOverrides, setZoneOverrides }) {
  const dispatchesRef = useRef([]);
  const [dispatches,  setDispatches]  = useState([]);
  const [logEntries,  setLogEntries]  = useState([
    makeLogEntry(LOG_TYPES.SYSTEM, { message: 'Crisis Operations Center ONLINE — VIT Chennai HQ active.' }),
    makeLogEntry(LOG_TYPES.SYSTEM, { message: 'AI Dispatch Coordinator ready. Monitoring Tamil Nadu region.' }),
  ]);
  const [aiMode,  setAiMode]  = useState(true);   // AI auto-dispatch on by default
  const [toasts,  setToasts]  = useState([]);
  const [aiThoughts, setAiThoughts] = useState([]);

  // Fleet availability: { vehicleKey: available count }
  // Initialised from FLEET.total, decremented on dispatch, incremented on return
  const fleetRef = useRef(
    Object.fromEntries(Object.entries(FLEET).map(([k, v]) => [k, v.total]))
  );
  const [fleet, setFleet] = useState({ ...fleetRef.current });

  const timersRef   = useRef({});
  const syncRef     = useRef(null);
  const aiModeRef   = useRef(aiMode);
  useEffect(() => { aiModeRef.current = aiMode; }, [aiMode]);

  /* ── helpers ── */
  const addLog = useCallback((type, data) => {
    setLogEntries(prev => [makeLogEntry(type, data), ...prev].slice(0, 300));
  }, []);

  const pushToast = useCallback((message, type = 'info') => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const scheduleSync = useCallback(() => {
    if (syncRef.current) return;
    syncRef.current = setTimeout(() => {
      setDispatches([...dispatchesRef.current]);
      syncRef.current = null;
    }, 100);
  }, []);

  const updateDispatch = useCallback((id, patch) => {
    dispatchesRef.current = dispatchesRef.current.map(d => d.id === id ? { ...d, ...patch } : d);
    scheduleSync();
  }, [scheduleSync]);

  const updateFleet = useCallback((vehicleKey, delta) => {
    fleetRef.current[vehicleKey] = Math.max(0, (fleetRef.current[vehicleKey] ?? 0) + delta);
    setFleet({ ...fleetRef.current });
  }, []);

  /* ── sendDispatch ── */
  const sendDispatch = useCallback((zone, vehicleKey, isAutoDispatch = false) => {
    const vehicle = VEHICLE_TYPES[vehicleKey];
    if (!zone?.lat || !zone?.lng || !vehicle) return null;

    // ── RESOURCE CHECK ──
    const avail = fleetRef.current[vehicleKey] ?? 0;
    if (avail <= 0) {
      pushToast(`No ${vehicle.label} available — all units deployed`, 'warning');
      addLog(LOG_TYPES.RESOURCE_LOW, { resource: vehicle.label, count: 0 });
      return null;
    }

    const id         = newDispatchId();
    const distKm     = distanceKm(HQ, { lat: zone.lat, lng: zone.lng });
    const travelMs   = etaMs(distKm, vehicle.speedKmh);
    const returnMs   = etaMs(distKm, vehicle.returnSpeedKmh);
    const etaSec     = Math.round(travelMs / 1000);
    const departedAt = Date.now();

    // Decrement fleet immediately
    updateFleet(vehicleKey, -1);

    const dispatch = {
      id, vehicleKey,
      vehicleIcon: vehicle.icon, vehicleLabel: vehicle.label, vehicleColor: vehicle.color,
      zoneId: zone.zone_id, zoneName: zone.name,
      zoneLat: zone.lat, zoneLng: zone.lng,
      severity: zone.severity_level || 5,
      departedAt, travelMs, returnMs,
      returnDepartedAt: null, arrivedAt: null, returnedAt: null,
      status: 'en_route',
      currentPos: { ...HQ },
      progress: 0,
      isAutoDispatch,
      rescueTarget: zone.rescueTarget || null,
    };

    dispatchesRef.current = [dispatch, ...dispatchesRef.current];
    scheduleSync();

    addLog(LOG_TYPES.DISPATCH_SENT, { id, vehicleIcon: vehicle.icon, vehicleLabel: vehicle.label, zoneName: zone.name, etaSec, capacity: vehicle.capacity });
    pushToast(`${vehicle.icon} ${vehicle.label} dispatched → ${zone.name} (ETA ${etaSec}s)`, isAutoDispatch ? 'ai' : 'manual');

    if (isAutoDispatch) {
      addLog(LOG_TYPES.SYSTEM, { message: `🤖 AI dispatched ${vehicle.icon} ${vehicle.label} → ${zone.name} (SEV ${zone.severity_level?.toFixed(1)})` });
      setAiThoughts(prev => [`Detected unattended ${zone.threat_label} zone: ${zone.name} (SEV ${zone.severity_level?.toFixed(1)}). Dispatching ${vehicle.label}.`, ...prev].slice(0, 10));
    }

    // Warn if fleet is now low
    const remaining = fleetRef.current[vehicleKey];
    if (remaining === 1) {
      addLog(LOG_TYPES.RESOURCE_LOW, { resource: vehicle.label, count: 1 });
      pushToast(`⚠ Only 1 ${vehicle.label} remaining`, 'warning');
    }

    // Comms during travel
    [0.3, 0.6, 0.85].forEach((f, i) => {
      timersRef.current[`${id}-c${i}`] = setTimeout(() =>
        addLog(LOG_TYPES.COMMS_INTERCEPT, { id, message: randomCommsMessage(vehicleKey) }),
        travelMs * f
      );
    });

    // ── ARRIVAL ──
    timersRef.current[`${id}-arr`] = setTimeout(() => {
      updateDispatch(id, { status: 'on_scene', arrivedAt: Date.now(), currentPos: { lat: zone.lat, lng: zone.lng }, progress: 1 });
      addLog(LOG_TYPES.DISPATCH_ARRIVED, { id, zoneName: zone.name, action: vehicleKey === 'drone' ? 'aerial surveillance' : vehicleKey === 'ambulance' ? 'medical triage' : 'search & rescue' });
      pushToast(`${vehicle.icon} ${id} arrived at ${zone.name}`, 'success');

      const baseSev      = zone.severity_level || 0;
      const currentDelta = zoneOverrides[zone.zone_id] || 0;
      const currentSev   = Math.max(0, baseSev + currentDelta);
      const arrReduce    = vehicle.severityReduction * 0.5;
      const newSev       = Math.max(0, currentSev - arrReduce);
      const newDelta     = newSev - baseSev;
      setZoneOverrides(prev => ({ ...prev, [zone.zone_id]: newDelta }));
      addLog(LOG_TYPES.DISPATCH_ON_SCENE, { id, zoneName: zone.name, oldSev: currentSev, newSev });
      addLog(LOG_TYPES.SEVERITY_REDUCED, { zoneName: zone.name, oldSev: currentSev, newSev, delta: arrReduce });

      const sceneMs = onSceneMs(zone.severity_level || 5);
      timersRef.current[`${id}-sc`] = setTimeout(() =>
        addLog(LOG_TYPES.COMMS_INTERCEPT, { id, message: randomCommsMessage(vehicleKey) }),
        sceneMs * 0.5
      );

      // ── DEPART SCENE ──
      timersRef.current[`${id}-dep`] = setTimeout(() => {
        const returnDepartedAt = Date.now();
        updateDispatch(id, { status: 'returning', returnDepartedAt, returnMs });
        addLog(LOG_TYPES.DISPATCH_RETURNING, { id, zoneName: zone.name });

        const baseSev2  = zone.severity_level || 0;
        const curDelta2 = zoneOverrides[zone.zone_id] ?? newDelta;
        const curSev2   = Math.max(0, baseSev2 + curDelta2);
        const depReduce = vehicle.severityReduction * 0.5;
        const newSev2   = Math.max(0, curSev2 - depReduce);
        const newDelta2 = newSev2 - baseSev2;
        setZoneOverrides(prev => ({ ...prev, [zone.zone_id]: newDelta2 }));
        addLog(LOG_TYPES.SEVERITY_REDUCED, { zoneName: zone.name, oldSev: curSev2, newSev: newSev2, delta: depReduce });

        // ── RETURNED ──
        timersRef.current[`${id}-ret`] = setTimeout(() => {
          const totalTimeSec = Math.round((Date.now() - departedAt) / 1000);
          updateDispatch(id, { status: 'returned', returnedAt: Date.now(), currentPos: { ...HQ }, progress: 1 });
          addLog(LOG_TYPES.DISPATCH_RETURNED, { id, vehicleLabel: vehicle.label, totalTimeSec });
          pushToast(`✓ ${vehicle.icon} ${id} returned to base`, 'success');
          // Return unit to fleet
          updateFleet(vehicleKey, +1);
          // Remove from list after 5s
          setTimeout(() => {
            dispatchesRef.current = dispatchesRef.current.filter(d => d.id !== id);
            scheduleSync();
          }, 5000);
        }, returnMs);
      }, sceneMs);
    }, travelMs);

    return id;
  }, [addLog, pushToast, zoneOverrides, setZoneOverrides, updateDispatch, updateFleet, scheduleSync]);

  /* ── cancelDispatch ── */
  const cancelDispatch = useCallback((id) => {
    const d = dispatchesRef.current.find(x => x.id === id);
    if (!d || d.status === 'returned') return;
    // Clear all pending timers for this dispatch
    ['arr','dep','ret','sc','c0','c1','c2'].forEach(k => {
      clearTimeout(timersRef.current[`${id}-${k}`]);
      delete timersRef.current[`${id}-${k}`];
    });
    // Return unit to fleet
    updateFleet(d.vehicleKey, +1);
    dispatchesRef.current = dispatchesRef.current.filter(x => x.id !== id);
    scheduleSync();
    addLog(LOG_TYPES.DISPATCH_CANCELLED, { id, vehicleLabel: d.vehicleLabel });
    pushToast(`✕ ${d.vehicleIcon} ${id} cancelled — unit returned to pool`, 'warning');
  }, [addLog, pushToast, updateFleet, scheduleSync]);

  /* ── sendRescue ── */
  const sendRescue = useCallback((report, deleteFromFirebase) => {
    const rescueZone = {
      zone_id: `rescue-${report.id}`,
      name: `Rescue · ${report.name || report.id}`,
      lat: Number(report.lat), lng: Number(report.lng),
      hazard_type: 'Trapped Person', severity_level: 8,
      confidence: 95, population_at_risk: 1,
      threat_label: 'CRITICAL', priority: 0.9,
      rescueTarget: report.id,
    };
    const id = sendDispatch(rescueZone, 'helicopter');
    if (!id) return;
    addLog(LOG_TYPES.SYSTEM, { message: `🆘 RESCUE ${id} — ${report.name||'Unknown'} at (${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)})` });

    const check = setInterval(() => {
      const d = dispatchesRef.current.find(d => d.id === id);
      if (d?.status === 'returned') {
        clearInterval(check);
        deleteFromFirebase(report.id);
        addLog(LOG_TYPES.SYSTEM, { message: `✓ RESCUED — ${report.name||'person'} extracted. Firebase cleared.` });
      }
      if (!d) clearInterval(check);
    }, 1000);
  }, [sendDispatch, addLog]);

  // Keep zones in a ref so the AI interval always sees the latest without restarting
  const zonesRef       = useRef(zones);
  const sendDispatchRef = useRef(sendDispatch);
  const addLogRef      = useRef(addLog);
  useEffect(() => { zonesRef.current = zones; },            [zones]);
  useEffect(() => { sendDispatchRef.current = sendDispatch; }, [sendDispatch]);
  useEffect(() => { addLogRef.current = addLog; },          [addLog]);

  /* ── AI auto-dispatch — stable interval, never restarts ── */
  useEffect(() => {
    const interval = setInterval(() => {
      if (!aiModeRef.current) return;  // respect AI toggle

      const currentZones    = zonesRef.current;
      const currentDispatch = sendDispatchRef.current;
      const currentAddLog   = addLogRef.current;

      const activeZoneIds = new Set(
        dispatchesRef.current
          .filter(d => d.status === 'en_route' || d.status === 'on_scene')
          .map(d => d.zoneId)
      );

      // Sort by severity descending, pick unattended CRITICAL/HIGH zones
      const candidates = currentZones
        .filter(z =>
          (z.threat_label === 'CRITICAL' || z.threat_label === 'HIGH') &&
          z.severity_level >= 6 &&
          !activeZoneIds.has(z.zone_id) &&
          z.lat && z.lng
        )
        .sort((a, b) => (b.severity_level || 0) - (a.severity_level || 0));

      if (candidates.length === 0) return;

      const target = candidates[0];
      const hazardVehicles = HAZARD_VEHICLE_MAP[target.hazard_type] || ['rescue_team'];

      // Pick first vehicle type that has units available
      const vehicleKey = hazardVehicles.find(k => (fleetRef.current[k] ?? 0) > 0);
      if (!vehicleKey) {
        currentAddLog(LOG_TYPES.SYSTEM, { message: `🤖 AI wanted to dispatch to ${target.name} but no units available` });
        return;
      }

      currentDispatch(target, vehicleKey, true);
    }, 15000);

    return () => clearInterval(interval);
  }, []); // empty deps — interval is stable for the lifetime of the hook

  /* ── Zone escalation logger ── */
  const prevSevRef = useRef({});
  useEffect(() => {
    zones.forEach(z => {
      const prev = prevSevRef.current[z.zone_id];
      const curr = z.severity_level;
      if (prev !== undefined && Math.abs(curr - prev) >= 0.5) {
        const lbl = s => s > 8 ? 'CRITICAL' : s > 6 ? 'HIGH' : s > 3 ? 'MODERATE' : 'LOW';
        if (lbl(curr) !== lbl(prev))
          addLog(curr > prev ? LOG_TYPES.ZONE_ESCALATED : LOG_TYPES.ZONE_DEESCALATED,
            { zoneName: z.name, oldSev: prev, newSev: curr, newThreat: lbl(curr) });
      }
      prevSevRef.current[z.zone_id] = curr;
    });
  }, [zones, addLog]);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearTimeout);
    if (syncRef.current) clearTimeout(syncRef.current);
  }, []);

  return { dispatches, dispatchesRef, logEntries, sendDispatch, sendRescue, cancelDispatch, aiMode, setAiMode, toasts, aiThoughts, fleet };
}
