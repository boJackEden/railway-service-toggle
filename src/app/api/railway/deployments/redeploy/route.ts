/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

const ENDPOINT = process.env.RAILWAY_GQL_ENDPOINT!;

const DEPLOYMENT_REDEPLOY_MUTATION = `
  mutation DeploymentRedeploy($id: String!, $usePreviousImageTag: Boolean!) {
    deploymentRedeploy(id: $id, usePreviousImageTag: $usePreviousImageTag) {
        status
    }
} 
`;

export async function POST(req: Request) {
  try {
    const { token, deploymentId } = await req.json();

    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
    if (!deploymentId) return NextResponse.json({ error: "Missing deploymentId" }, { status: 400 });

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: DEPLOYMENT_REDEPLOY_MUTATION,
        variables: { id: deploymentId, usePreviousImageTag: true },
      }),
    });

    const json = await res.json();

    if (!res.ok || json.errors) {
      return NextResponse.json(
        { error: json?.errors?.map((e: any) => e.message).join("; ") ?? `HTTP ${res.status}`, raw: json },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: json.data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}