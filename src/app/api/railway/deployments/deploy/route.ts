/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

const ENDPOINT = process.env.RAILWAY_GQL_ENDPOINT!;

const SERVICE_INSTANCE_DEPLOY_MUTATION = `
  mutation ServiceInstanceDeploy($environmentId: String!, $serviceId: String!) {
    serviceInstanceDeploy(environmentId: $environmentId, serviceId: $serviceId)
  }
`;

export async function POST(req: Request) {
  try {
    const { token, environmentId, serviceId } = await req.json();

    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
    if (!environmentId) return NextResponse.json({ error: "Missing environmentId" }, { status: 400 });
    if (!serviceId) return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: SERVICE_INSTANCE_DEPLOY_MUTATION,
        variables: { environmentId, serviceId },
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