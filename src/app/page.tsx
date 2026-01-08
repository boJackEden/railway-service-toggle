/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { ServiceTable } from "@/components/ServiceTable";
import { flattenMeToServiceRows } from "@/lib/flattenRailway";
import type { RailwayMeResponse, ServiceRow } from "@/types/railway";
import { getDeploymentAction } from "@/lib/getDeploymentAction";

export default function Home() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<{ name: string | null; email: string | null } | null>(null);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    fetchInstances(token);
  }

  async function fetchInstances(token: string) {
    setLoading(true);
    setError(null);
    setRows([]);
    setMe(null);
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

      // Refresh list so UI updates
      // await connect();
    } catch (err: any) {
      setError(err?.message ?? "Spin down error");
    }
  }

  async function spinUp(row: ServiceRow) {
    setError(null);

    if (!row.latestDeploymentId) {
      setError("No latestDeploymentId available for this row.");
      return;
    }

    try {
      const res = await fetch("/api/railway/deployments/redeploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          deploymentId: row.latestDeploymentId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Spin up failed");

      // Refresh list so UI updates
      // await connect();
    } catch (err: any) {
      setError(err?.message ?? "Spin up error");
    }
  }

  async function toggleInstance(row: ServiceRow) {
    setError(null);

    if (!row.latestDeploymentId) {
      setError("No latestDeploymentId available for this row.");
      return;
    }
    const deploymentAction = getDeploymentAction(row.latestDeploymentStatus);

    if (deploymentAction === 'DISABLED') {
      setError("No action available");
      return;
    }

    if (deploymentAction === 'SPIN_DOWN') {
      // call spin down api
      spinDown(row).then(() => {
        fetchInstances(token);
      });
    }

    if (deploymentAction === 'SPIN_UP') {
      // call spin up
      spinUp(row).then(() => {
        fetchInstances(token);
      });
    }

    // figure out a polling function can update the UI
  }

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>Railway Control Dashboard</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>Paste a Railway token to list service instances.</p>

      <form onSubmit={connect} style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Railway token (account token)"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button type="submit" disabled={loading || token.trim().length === 0} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc" }}>
          {loading ? "Loading…" : "Connect"}
        </button>
      </form>

      {me && (
        <div style={{ marginTop: 12 }}>
          Connected as <b>{me.name ?? "Unknown"}</b> {me.email ? `(${me.email})` : ""}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f3c2c2", borderRadius: 8 }}>
          <b>Error:</b> {error}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {rows.length === 0 ? (
          <p style={{ opacity: 0.8 }}>{loading ? "Loading…" : "No service instances found."}</p>
        ) : (
          <ServiceTable rows={rows} onToggle={toggleInstance} />
        )}
      </div>
    </main>
  );
}
