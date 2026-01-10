"use client";

import { getDeploymentAction } from "@/lib/getDeploymentAction";
import type { ServiceRow } from "@/types/railway";

function stateLabel(row: ServiceRow) {
  const deploymentAction = getDeploymentAction(row.latestDeploymentStatus);
  if (deploymentAction === "SPIN_UP") return { label: "Stopped" };
  if (deploymentAction === "SPIN_DOWN") return { label: "Running" };
  return { label: "Unknown" };
}

function bestLink(row: ServiceRow) {
  return row.latestDeploymentUrl ?? row.latestDeploymentStaticUrl ?? row.upstreamUrl ?? null;
}

export function ServiceTable({ rows, onToggle }: { rows: ServiceRow[]; onToggle: (row: ServiceRow) => void }) {

  return (
    <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#fafafa", color: '#000000' }}>
            <th style={th}>Service</th>
            <th style={th}>Project</th>
            <th style={th}>Environment</th>
            <th style={th}>Region</th>
            <th style={th}>State</th>
            <th style={th}>Replicas</th>
            <th style={th}>Deployment</th>
            <th style={th}>Link</th>
            <th style={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const st = stateLabel(r);
            const link = bestLink(r);
            return (
              <tr key={r.serviceInstanceId ?? `${r.serviceName}-${idx}`} style={{ borderTop: "1px solid #eee" }}>
                <td style={td}><b>{r.serviceName}</b></td>
                <td style={td}>{r.projectName}</td>
                <td style={td}>{r.environmentName}</td>
                <td style={td}>{r.region}</td>
                <td style={td}>
                  {st.label}
                </td>
                <td style={td}>{typeof r.numReplicas === "number" ? r.numReplicas : "—"}</td>
                <td style={td}>{r.latestDeploymentStatus ?? "—"}</td>
                <td style={td}>
                  {link ? (
                    <a href={'//' + link} target="_blank" rel="noreferrer">open</a>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={td}>
                  <button
                    onClick={() => onToggle(r)}
                    style={btn}
                    disabled={getDeploymentAction(r.latestDeploymentStatus) === 'DISABLED'}
                    title={!r.region ? "Missing region for this instance" : ""}
                  >
                    {st.label === 'Running' ? 'Spin Down': 'Spin Up'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 13,
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const btn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
};
