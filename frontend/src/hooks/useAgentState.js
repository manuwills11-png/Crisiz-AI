import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchState } from '../api';

const POLL_INTERVAL = 6000;

export function useAgentState() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const data = await fetchState();
      setState(data);
      setError(null);
      setLastUpdated(new Date());
      if (loading) setLoading(false);
    } catch (err) {
      setError(err.message);
      if (loading) setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  return { state, loading, error, lastUpdated, refresh: poll };
}
