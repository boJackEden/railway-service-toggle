import { DeploymentAction, DeploymentStatus } from "@/types/railway";

export function getDeploymentAction(status: DeploymentStatus | null): DeploymentAction {
    if (!status) return "DISABLED";
  
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