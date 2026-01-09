# Build Log: Railway Spin Up / Spin Down App

This document captures the **decision-making process**, dead ends, and course corrections taken while building this app. It’s intentionally written like an annotated commit history to show how understanding of Railway’s platform evolved over time.

The original prompt was deceptively simple:

> “Build an application to spin up and spin down a container using our GraphQL API.”

What follows is how that requirement was interpreted, challenged, refined, and ultimately implemented in a way that aligns with Railway’s real operational model.

---

## Initial Interpretation: “Start / Stop a Service”

**Initial assumption**
- “Spin up / spin down” meant starting and stopping a *service*.
- First instinct was to look for a `serviceUpdate` or `serviceInstanceUpdate` mutation.

**What I tried**
- Queried `serviceInstances`
- Discovered fields like `numReplicas` and `sleepApplication`
- Attempted to use `numReplicas = 0 / 1` as a stop/start mechanism

**What broke**
- `numReplicas` was often `null`
- Mutations failed with `Invalid input`
- Even when accepted, behavior was inconsistent or non-immediate

**Conclusion**
- `numReplicas` is **not a reliable runtime control surface**
- This was the first signal that “service” was the wrong abstraction

---

## Shift in Mental Model: Service vs Deployment

After reviewing Railway’s documentation and GraphQL schema more carefully:

- A **Service** is a deployment target / definition
- A **Deployment** is the actual running container(s)
- Runtime lifecycle is owned by **deployments**, not services

This aligned with the docs:

> “Deployment = built and deliverable unit of a service”

This reframing unlocked everything else.

---

## Attempt #2: `serviceInstanceUpdate` + `sleepApplication`

**What I tried**
- Used `sleepApplication: true/false` to model “spin down”
- Mutation succeeded and returned `true`

**What didn’t feel right**
- No immediate visible effect
- Required idleness to trigger
- Hard to explain as “spin down” in a concrete way

**Conclusion**
- Valid feature, but **not an immediate or explicit stop**
- Not a great fit for the prompt

---

## Discovery: The Dashboard Uses the Same GraphQL API

Key realization from the docs:

> “The Railway dashboard uses the exact same GraphQL API.”

This reframed the task entirely:

> If the UI can stop a deployment, the API must expose that exact primitive.

That led to inspecting deployment-level mutations.

---

## Breakthrough: `deploymentRemove`, `deploymentStop`, `deploymentRedeploy`

### Spin Down Options Explored

#### `deploymentRemove`
- Mirrors the dashboard’s “Remove deployment”
- Immediate effect
- But resulted in confusing terminal states (`FAILED` instead of `REMOVED`)

#### `deploymentStop` (final choice)
- Stops the running containers without deleting the deployment record
- Cleaner mental model for “spin down”
- More predictable for redeploy flows

### Spin Up

- Used `deploymentRedeploy`
- Redeploys a previous deployment (optionally reusing the image)
- Clear, explicit “spin up” action

**Final mapping**
- **Spin down** → `deploymentStop(deploymentId)`
- **Spin up** → `deploymentRedeploy(deploymentId)`

This matches Railway’s real operational model while keeping the UX intuitive.

---

## UI State: Why Deployment Status Was Tricky

Railway exposes a `DeploymentStatus` enum with values like:
BUILDING, DEPLOYING, SUCCESS, FAILED, CRASHED, REMOVED, SLEEPING, etc.


### Key discovery
- After stopping or removing a deployment, the UI often shows `FAILED` or `CRASHED`
- This is not a “bug” — it reflects **how the process exited**, not user intent

### Decision
- Do **not** treat `FAILED` as a literal failure
- Treat status as *lifecycle metadata*, not “is running?”

### Final UI logic
- Transitional states → disable actions
- Running states → allow spin down
- Terminal / stopped states → allow spin up

This logic is derived directly from Railway’s enum, not invented state.

---

## Build Failure: `tsc not found`

After wiring redeploy correctly, builds started failing with:
sh: 1: tsc: not found
npm warn config production Use --omit=dev instead.


### Root cause
- Railway builds were running with `production=true`
- Dev dependencies (including `typescript`) were not installed
- Redeploy triggered a true cold build, exposing this

### Fix
- Explicitly disabled production-only installs during build:

NPM_CONFIG_PRODUCTION=false

- This allowed devDependencies to be installed for the build phase

Important note:
- This had **nothing to do** with deployment stop/remove
- It was a build configuration issue surfaced by redeploying

---

## Final Architecture

### Frontend
- Single-page UI
- User pastes an account token
- Lists services and their deployments
- Shows context-aware actions (Spin up / Spin down)

### Backend (Next.js API routes)
- Acts as a thin proxy to Railway’s GraphQL API
- Encapsulates all mutations:
- `deploymentStop`
- `deploymentRedeploy`
- Keeps GraphQL complexity off the client

### Why this matters
- Clear separation of concerns
- Mirrors how a real product would be structured
- Easy to extend (auth, permissions, audit logs, etc.)

---

## Real-Time State Updates: The Polling Problem

After implementing the core start/stop functionality, a UX gap became apparent:

**The problem**
- User clicks "Spin Down"
- Mutation succeeds
- But the UI still shows "Spin Up" button (last known state)
- User has no feedback that anything happened

The deployment status change wasn't instant, and the UI wasn't reactive.

---

## Naive Solution vs Reality

**First instinct**
- Poll `deploymentInstances` constantly in the background
- Update all deployment cards in real-time

**Why that's wrong**
- Wasteful: polling for services the user isn't actively interacting with
- Noisy: creates unnecessary load on Railway's API
- Unfocused: treats all state equally when only one matters at a time

**Better approach**
- Poll **only the deployment the user just acted on**
- Stop polling once it reaches a terminal state
- Keep it scoped, efficient, and intentional

---

## Implementation: Optimistic UI + Targeted Polling

### The Flow

1. **User clicks action** → Mutation fires
2. **Optimistic state** → Button immediately toggles to loading
3. **Backend mutation completes** → Returns success/failure
4. **Start polling** → Query only that specific deployment's status
5. **Poll every 2s** → Check if status has changed to a terminal state
6. **Stop polling** → Once `SUCCESS`, `FAILED`, `CRASHED`, or `REMOVED` is detected
7. **Update UI** → Re-enable buttons based on final state

### Key design choices

- **Loading states are per-deployment**, not global
- Polling is **scoped to the deployment ID**, not the entire project
- Polling **stops automatically** when the state stabilizes
- UI remains **responsive during transitions**

### Why this matters

Railway's backend doesn't send webhooks or use subscriptions for deployment state changes. The only way to track progress is polling. But **how** you poll determines whether the UX feels janky or polished.

This approach mirrors how production dashboards handle async operations:
- Optimistic feedback
- Targeted data fetching
- Automatic cleanup

---

## What's Next: Potential Improvements

This implementation is functional but intentionally minimal. Here are concrete ways to expand it:

### 1. Differentiate Restart vs Redeploy

**Current limitation**
- "Spin Up" always uses `deploymentRedeploy(usePreviousImageTag: true)`
- This redeploys the last deployment without rebuilding

**Better approach**
- Add `deploymentRestart` mutation for simple restarts
- Reserve `deploymentRedeploy` for when you want to rebuild
- Offer both as distinct actions:
  - **Restart** → Faster, uses existing image
  - **Redeploy** → Slower, rebuilds from source

**Implementation**
```graphql
mutation DeploymentRestart($id: String!) {
  deploymentRestart(id: $id)
}
```

This would require:
- New API route: `/api/railway/deployments/restart`
- UI toggle or dropdown to choose action type
- Update button logic to distinguish intent

---

### 2. Add `deploymentTrigger` for New Deployments

**Current limitation**
- Can only redeploy existing deployments
- Can't trigger a fresh deployment from current source

**Better approach**
- Use `deploymentTrigger` to create a new deployment from the latest commit
- This is what the dashboard does when you click "Deploy"

**Implementation**
```graphql
mutation ServiceInstanceDeploy($environmentId: String!, $serviceId: String!) {
  serviceInstanceDeploy(environmentId: $environmentId, serviceId: $serviceId) {
    id
  }
}
```

This would enable:
- "Deploy Latest" button for services with no active deployment
- Deploying new code without stopping/redeploying
- More granular control over deployment lifecycle

---

### 3. Expose Deployment Logs

**Why it matters**
- Users can't see why a deployment failed
- No visibility into build or runtime logs

**Implementation**
- Use `deploymentLogs` query to fetch logs by deployment ID
- Stream logs in real-time during builds/deploys
- Add a "View Logs" button next to each deployment

**GraphQL example**
```graphql
query DeploymentLogs($deploymentId: String!, $limit: Int) {
  deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
    edges {
      node {
        message
        timestamp
      }
    }
  }
}
```

---

### 4. Support Multi-Environment Workflows

**Current limitation**
- Shows all environments in a flat list
- No way to target "production" vs "staging"

**Better approach**
- Group services by environment
- Add environment-level actions (deploy all, stop all)
- Filter/toggle between environments

This would make the tool more useful for real-world workflows where you want to:
- Spin down staging to save costs
- Deploy only to production
- Compare state across environments

---

### 5. Track Deployment History

**Why it matters**
- Users can't see past deployments
- No way to rollback to a previous version

**Implementation**
- Query `service.deployments` to show deployment history
- Add "Rollback" action that redeploys a previous deployment
- Show metadata: commit hash, deploy time, status

**GraphQL example**
```graphql
query ServiceDeployments($serviceId: String!) {
  service(id: $serviceId) {
    deployments(first: 10) {
      edges {
        node {
          id
          status
          createdAt
          meta {
            commitHash
            commitMessage
          }
        }
      }
    }
  }
}
```

---

### 6. Batch Operations

**Current limitation**
- Must manually click each deployment to stop/start
- No way to act on multiple services at once

**Better approach**
- Checkbox selection for multiple services
- "Stop All Selected" / "Start All Selected" buttons
- Useful for shutting down entire environments

This would be especially valuable for:
- Cost management (stop all preview environments)
- Testing (restart all services in an environment)
- Maintenance windows

---

### 7. Cost Estimation

**Why it matters**
- Users don't know what they're spending on running services
- No visibility into savings from stopping deployments

**Implementation**
- Use Railway's usage API to fetch service costs
- Show estimated monthly cost per service
- Display potential savings when spinning down

---

## Architectural Considerations

The current implementation uses:
- **`deploymentStop`** → Stops containers
- **`deploymentRedeploy`** → Restarts with previous image

A more mature version would use:
- **`deploymentStop`** → Explicit stop
- **`deploymentRestart`** → Fast restart without rebuild
- **`deploymentRedeploy`** → Full rebuild and deploy
- **`serviceInstanceDeploy`** → New deployment from latest code

This would require:
- Refactoring the API routes to support multiple mutation types
- Updating the UI to present these as distinct actions
- Smarter state logic to determine which actions are available

**Key insight**: Railway's API doesn't have a single "start/stop" toggle. It has **lifecycle primitives** that can be composed into workflows. The right abstraction depends on what the user is trying to accomplish:
- Saving money → `deploymentStop`
- Fixing a crash → `deploymentRestart`
- Deploying new code → `serviceInstanceDeploy`
- Rolling back → `deploymentRedeploy` with older deployment ID

The current implementation collapses these into "Spin Up / Spin Down" for simplicity. A production tool would expose them as distinct, intentional actions.


