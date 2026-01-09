/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RailwayMeResponse, ServiceRow } from "@/types/railway";

export function flattenMeToServiceRows(resp: RailwayMeResponse): {
  me: { name: string | null; email: string | null };
  rows: ServiceRow[];
} {
  const me = resp.data.me;

  const rows: ServiceRow[] = [];

  for (const ws of me.workspaces ?? []) {
    const projectEdges = ws.projects?.edges ?? [];
    for (const pEdge of projectEdges) {
      const project = pEdge.node;
      const projectName = project?.name ?? "—";
      const envEdges = project?.environments?.edges ?? [];
      for (const envEdge of envEdges) {
        const env = envEdge.node;
        const environmentName = env?.name ?? "—";

        const siEdges = env?.serviceInstances?.edges ?? [];
        for (const siEdge of siEdges) {
          const si = siEdge.node;
          const ld = si.latestDeployment;


          // Skip totally empty instances
          if (!si?.serviceName) continue;

          rows.push({
            serviceInstanceId: si.id,
            serviceId: si.serviceId,
            serviceName: si.serviceName ?? "—",
            projectName,
            region: si.region ?? "—",
            environmentId: si.environmentId ?? "—",
            environmentName,
            numReplicas: si.numReplicas ?? null,
            latestDeploymentId: ld?.id ?? null,
            latestDeploymentStatus: ld?.status ?? null,
            deploymentStopped: ld?.deploymentStopped ?? null,
            latestDeploymentUrl: ld?.url ?? null,
            latestDeploymentStaticUrl: (ld as any)?.staticUrl ?? null,
            upstreamUrl: (si as any)?.upstreamUrl ?? null,
          });
        }
      }
    }
  }

  return {
    me: { name: me.name ?? null, email: me.email ?? null },
    rows,
  };
}
