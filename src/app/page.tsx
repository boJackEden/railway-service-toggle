"use client";

import { ServiceTable } from "@/components/ServiceTable";
import { ConnectionForm } from "@/components/ConnectionForm";
import { UserInfo } from "@/components/UserInfo";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useRailwayServices } from "@/hooks/useRailwayServices";
import Link from "next/link";

export default function Home() {
  const { token, setToken, loading, me, rows, error, connect, toggleInstance } = useRailwayServices();

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Railway Control Dashboard</h1>
          <p style={{ marginTop: 6, opacity: 0.8 }}>Paste a Railway token to list service instances.</p>
        </div>
        <Link
          href="/dev-journey"
          style={{
            color: "#0070f3",
            textDecoration: "none",
            fontSize: 14,
            whiteSpace: "nowrap",
            marginLeft: 16
          }}
        >
          Development Journey →
        </Link>
      </div>

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
