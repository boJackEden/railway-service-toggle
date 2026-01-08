export type RailwayMeResponse = {
  data: {
    me: {
      id: string;
      name: string | null;
      email: string | null;
      username: string | null;
      workspaces: Array<{
        id: string;
        projects: {
          edges: Array<{
            node: {
              name: string | null;
              environments: {
                edges: Array<{
                  node: {
                    id: string;
                    name: string | null;
                    serviceInstances: {
                      edges: Array<{
                        node: {
                          id: string;
                          region: string;
                          serviceId: string;
                          serviceName: string | null;
                          environmentId: string | null;
                          numReplicas: number | null;
                          latestDeployment: null | {
                            id: string;
                            status: DeploymentStatus | null;
                            deploymentStopped: boolean | null;
                            url: string | null;
                          };
                        };
                      }>;
                    };
                  };
                }>;
              };
            };
          }>;
        };
      }>;

    };
  };
};

export type ServiceRow = {
  serviceInstanceId?: string;
  serviceId?: string;

  serviceName: string;
  projectName: string;
  environmentId: string;
  environmentName: string;
  region: string;
  numReplicas: number | null;
  latestDeploymentId: string | null;
  latestDeploymentStatus: DeploymentStatus | null;
  deploymentStopped: boolean | null;

  latestDeploymentUrl: string | null;
  latestDeploymentStaticUrl: string | null;
  upstreamUrl: string | null;
};

export enum DeploymentStatus {
  BUILDING = "BUILDING",
  CRASHED = "CRASHED",
  DEPLOYING = "DEPLOYING",
  FAILED = "FAILED",
  INITIALIZING = "INITIALIZING",
  NEEDS_APPROVAL = "NEEDS_APPROVAL",
  QUEUED = "QUEUED",
  REMOVED = "REMOVED",
  REMOVING = "REMOVING",
  SKIPPED = "SKIPPED",
  SLEEPING = "SLEEPING",
  SUCCESS = "SUCCESS",
  WAITING = "WAITING",
}

export type DeploymentAction =
  | "SPIN_UP"
  | "SPIN_DOWN"
  | "DISABLED";
