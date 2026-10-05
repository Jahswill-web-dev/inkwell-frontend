import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  articleErrorResponse,
  articleUpstreamError,
} from "@/lib/articles/server";

const tokenSchema = z.string().min(20).max(200);
const sessionIdSchema = z.string().uuid();
const associationSchema = z
  .object({ external_session_id: z.string().min(1).max(200) })
  .strict();
type RouteContext = {
  params: Promise<{ token: string; sessionId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const params = await context.params;
  const token = tokenSchema.safeParse(params.token);
  const sessionId = sessionIdSchema.safeParse(params.sessionId);
  const input = associationSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!token.success || !sessionId.success || !input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  try {
    await createAuthApiClient().put(
      `/api/v1/interviews/${token.data}/voice/sessions/${sessionId.data}`,
      input.data,
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
