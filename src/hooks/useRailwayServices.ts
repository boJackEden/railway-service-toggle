/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { flattenMeToServiceRows } from "@/lib/flattenRailway";
import { getDeploymentAction } from "@/lib/getDeploymentAction";
import type { RailwayMeResponse, ServiceRow } from "@/types/railway";
import { DeploymentStatus } from "@/types/railway";

// Terminal deployment statuses that should stop polling
const TERMINAL_STATUSES = new Set([
  DeploymentStatus.SUCCESS,
  DeploymentStatus.FAILED,
  DeploymentStatus.CRASHED,
  DeploymentStatus.REMOVED,
  DeploymentStatus.SKIPPED,
]);

export function useRailwayServices() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<{ name: string | null; email: string | null } | null>(null);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  async function fetchInstances(token: string, clearExisting = true) {
    setLoading(true);
    setError(null);
    if (clearExisting) {
      setRows([]);
      setMe(null);
    }
    try {
      const res = await fetch("/api/railway/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as RailwayMeResponse | any;

      if (!res.ok) {
        setError(json?.error ?? "Request failed");
        return;
      }

      const { me, rows } = flattenMeToServiceRows(json as RailwayMeResponse);
      setMe(me);
      setRows(rows);
    } catch (err: any) {
      setError(err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function connect() {
    fetchInstances(token);
  }

  function stopPolling() {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }

  function startPolling(serviceInstanceId: string, initialStatus: DeploymentStatus | null) {
    // Clear any existing polling
    stopPolling();

    let hasStatusChanged = false;
    const startTime = Date.now();
    const MAX_POLLING_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

    const poll = async () => {
      // Check if we've exceeded the maximum polling duration
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= MAX_POLLING_DURATION) {
        // Stop polling after 10 minutes
        return;
      }

      try {
        const res = await fetch("/api/railway/instances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json()) as RailwayMeResponse | any;

        if (res.ok) {
          const { me, rows } = flattenMeToServiceRows(json as RailwayMeResponse);

          // Check if the service instance we're tracking has reached a terminal state
          // Note: We track by serviceInstanceId because deploymentId can change during redeploy
          const targetRow = rows.find(r => r.serviceInstanceId === serviceInstanceId);

          if (targetRow) {
            // Track if the status has changed from the initial status
            // Note: latestDeploymentStatus can be null (e.g., for databases that are spun down)
            if (targetRow.latestDeploymentStatus !== initialStatus) {
              hasStatusChanged = true;
            }
          }

          // Only update state if the status has changed from initial
          // This prevents overwriting our optimistic UI with stale data from the server
          if (hasStatusChanged) {
            setMe(me);
            setRows(rows);

            // Stop polling if we've reached a terminal state
            if (targetRow) {
              const currentStatus = targetRow.latestDeploymentStatus;

              // Terminal conditions:
              // 1. Status is in TERMINAL_STATUSES set (SUCCESS, FAILED, etc.)
              // 2. Status is null (service was spun down completely, e.g., databases)
              const isTerminal = currentStatus === null || TERMINAL_STATUSES.has(currentStatus);

              if (isTerminal) {
                // Stop polling - deployment is complete
                return;
              }
            }
          }

          // Continue polling every 2 seconds
          pollingTimerRef.current = setTimeout(poll, 2000);
        } else {
          // On failed response, continue polling
          pollingTimerRef.current = setTimeout(poll, 2000);
        }
      } catch (err: any) {
        // On error, continue polling
        pollingTimerRef.current = setTimeout(poll, 2000);
      }
    };

    // Start the first poll
    poll();
  }

  async function spinDown(row: ServiceRow) {
    setError(null);

    if (!row.latestDeploymentId) {
      setError("No latestDeploymentId available for this row.");
      return;
    }

    try {
      const res = await fetch("/api/railway/deployments/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          deploymentId: row.latestDeploymentId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Spin down failed");
    } catch (err: any) {
      setError(err?.message ?? "Spin down error");
    }
  }

  async function spinUp(row: ServiceRow) {
    setError(null);

    if (!row.serviceId) {
      setError("No serviceId available for this row.");
      return;
    }

    if (!row.environmentId) {
      setError("No environmentId available for this row.");
      return;
    }

    try {
      const res = await fetch("/api/railway/deployments/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          environmentId: row.environmentId,
          serviceId: row.serviceId
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Spin up failed");
    } catch (err: any) {
      setError(err?.message ?? "Spin up error");
    }
  }

  async function toggleInstance(row: ServiceRow) {
    setError(null);

    if (!row.serviceInstanceId) {
      setError("No serviceInstanceId available for this row.");
      return;
    }

    const deploymentAction = getDeploymentAction(row.latestDeploymentStatus);

    if (deploymentAction === 'DISABLED') {
      setError("No action available");
      return;
    }

    // For SPIN_DOWN, we need a deployment to stop
    if (deploymentAction === 'SPIN_DOWN' && !row.latestDeploymentId) {
      setError("No deployment available to stop.");
      return;
    }

    // For SPIN_UP, we need serviceId and environmentId
    if (deploymentAction === 'SPIN_UP') {
      if (!row.serviceId) {
        setError("No serviceId available for this row.");
        return;
      }
      if (!row.environmentId) {
        setError("No environmentId available for this row.");
        return;
      }
    }

    if (deploymentAction === 'SPIN_DOWN') {
      // Store the initial status before starting
      const initialStatus = row.latestDeploymentStatus;

      // Optimistically update UI
      setRows(prevRows =>
        prevRows.map(r =>
          r.serviceInstanceId === row.serviceInstanceId
            ? { ...r, latestDeploymentStatus: DeploymentStatus.REMOVING }
            : r
        )
      );
      await spinDown(row);
      // Start polling to track the spin down progress
      startPolling(row.serviceInstanceId, initialStatus);
    }

    if (deploymentAction === 'SPIN_UP') {
      // Store the initial status before starting
      const initialStatus = row.latestDeploymentStatus;

      // Optimistically update UI
      setRows(prevRows =>
        prevRows.map(r =>
          r.serviceInstanceId === row.serviceInstanceId
            ? { ...r, latestDeploymentStatus: DeploymentStatus.BUILDING }
            : r
        )
      );
      await spinUp(row);
      // Start polling to track the spin up progress
      startPolling(row.serviceInstanceId, initialStatus);
    }
  }

  return {
    token,
    setToken,
    loading,
    me,
    rows,
    error,
    connect,
    toggleInstance,
  };
}
