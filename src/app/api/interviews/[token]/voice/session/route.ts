import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  articleErrorResponse,
  articleUpstreamError,
} from "@/lib/articles/server";

const tokenSchema = z.string().min(20).max(200);
const sessionSchema = z
  .object({ sdp: z.string().min(1).max(200_000).optional() })
  .strict();
type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const token = tokenSchema.safeParse((await context.params).token);
  const input = sessionSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!token.success || !input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  try {
    const response = await createAuthApiClient().post(
      `/api/v1/interviews/${token.data}/voice/session`,
      input.data,
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
