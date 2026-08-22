import { useCallback, useEffect, useRef, useState } from 'react';
import { reportsApi } from '../services/api';

const TERMINAL = ['completed', 'failed'];

/**
 * Polls a report until the local ML worker finishes with it.
 *
 * Polling (rather than websockets) is a deliberate choice for this prototype:
 * inference runs on a laptop that is not publicly reachable, the API is
 * serverless, and a 30–60 second wait only needs a handful of cheap requests.
 *
 * @param {string} reportId
 * @param {{ intervalMs?: number, enabled?: boolean, maxWaitMs?: number }} options
 */
export default function useReportPolling(reportId, options = {}) {
  const { intervalMs = 6000, enabled = true, maxWaitMs = 5 * 60 * 1000 } = options;

  const [report, setReport] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const timerRef = useRef(null);
  const startedAtRef = useRef(Date.now());
  const mountedRef = useRef(true);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchOnce = useCallback(async () => {
    const { report: fresh } = await reportsApi.get(reportId);
    if (!mountedRef.current) return null;
    setReport(fresh);
    setError(null);
    return fresh;
  }, [reportId]);

  useEffect(() => {
    mountedRef.current = true;
    startedAtRef.current = Date.now();
    setTimedOut(false);
    setLoading(true);

    if (!reportId || !enabled) {
      setLoading(false);
      return undefined;
    }

    async function tick() {
      try {
        const fresh = await fetchOnce();
        if (!mountedRef.current || !fresh) return;

        if (TERMINAL.includes(fresh.status)) {
          setLoading(false);
          return; // no further polling needed
        }

        // Keep the lightweight status endpoint in play for job-level detail.
        try {
          const statusPayload = await reportsApi.status(reportId);
          if (mountedRef.current) setJob(statusPayload.job);
        } catch {
          /* job detail is optional context, never a hard failure */
        }

        if (Date.now() - startedAtRef.current > maxWaitMs) {
          setTimedOut(true);
          setLoading(false);
          return;
        }

        timerRef.current = setTimeout(tick, intervalMs);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err.message);
        setLoading(false);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    tick();

    const elapsedTimer = setInterval(() => {
      if (mountedRef.current) setElapsedMs(Date.now() - startedAtRef.current);
    }, 1000);

    return () => {
      mountedRef.current = false;
      stop();
      clearInterval(elapsedTimer);
    };
  }, [reportId, enabled, intervalMs, maxWaitMs, fetchOnce, stop]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await fetchOnce();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchOnce]);

  return {
    report,
    job,
    loading,
    error,
    elapsedMs,
    timedOut,
    isProcessing: report ? !TERMINAL.includes(report.status) : false,
    refresh,
  };
}
