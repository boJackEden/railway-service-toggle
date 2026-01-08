/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

const ENDPOINT = process.env.RAILWAY_GQL_ENDPOINT!;

const ME_QUERY = `
  query MeProjectsEnvsInstances {
  me {
    id
    name
    email
    username
    workspaces {
      id
      projects {
        edges {
          node {
            name
            environments {
              edges {
                node {
                  id
                  name
                  serviceInstances {
                    edges {
                      node {
                        id
                        serviceId
                        serviceName
                        environmentId
                        numReplicas
                        latestDeployment {
                          id
                          status
                          deploymentStopped
                          url
                          staticUrl
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = (body?.token ?? "").trim();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: ME_QUERY,
        variables: {},
      }),
    });

    const json = await res.json();

    // Railway returns 200 even for GraphQL errors sometimes, so check both.
    if (!res.ok || json.errors) {
      return NextResponse.json(
        {
          error:
            json?.errors?.map((e: any) => e.message).join("; ") ??
            `Request failed (${res.status})`,
          raw: json,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: json.data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
