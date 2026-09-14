import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  articleErrorResponse,
  articleUpstreamError,
} from "@/lib/articles/server";

const tokenSchema = z.string().min(20).max(200);
const realtimeCallSchema = z
  .object({
    sdp: z.string().min(1).max(200_000),
  })
  .strict();

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const parsedToken = tokenSchema.safeParse(token);

  if (!parsedToken.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return articleErrorResponse(400, "invalid_json", "Send a valid JSON request.");
  }

  const input = realtimeCallSchema.safeParse(payload);
  if (!input.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );
  }

  try {
    const response = await createAuthApiClient().post(
      `/api/v1/interviews/${parsedToken.data}/realtime`,
      input.data,
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    return articleUpstreamError(error);
  }
}