import { DeploymentAction, DeploymentStatus } from "@/types/railway";

export function getDeploymentAction(status: DeploymentStatus | null): DeploymentAction {
    // If status is null, the service has no deployment (e.g., database that's been spun down)
    // Allow the user to spin it up
    if (!status) return "SPIN_UP";

    if (status === "SUCCESS" || status === "SLEEPING") {
      return "SPIN_DOWN";
    }

    if (
      status === "REMOVED" ||
      status === "FAILED" ||
      status === "CRASHED" ||
      status === "SKIPPED"
    ) {
      return "SPIN_UP";
    }

    return "DISABLED";
  }