"use client";

import { ServiceTable } from "@/components/ServiceTable";
import { ConnectionForm } from "@/components/ConnectionForm";
import { UserInfo } from "@/components/UserInfo";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useRailwayServices } from "@/hooks/useRailwayServices";

export default function Home() {
  const { token, setToken, loading, me, rows, error, connect, toggleInstance } = useRailwayServices();

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>Railway Control Dashboard</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>Paste a Railway token to list service instances.</p>

      <ConnectionForm
        token={token}
        onTokenChange={setToken}
        onConnect={connect}
        loading={loading}
      />

      {me && <UserInfo me={me} />}

      {error && <ErrorBanner error={error} />}

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
