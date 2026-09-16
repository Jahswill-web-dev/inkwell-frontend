import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  articleErrorResponse,
  articleUpstreamError,
} from "@/lib/articles/server";

const tokenSchema = z.string().min(20).max(200);
type RouteContext = { params: Promise<{ token: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const token = tokenSchema.safeParse((await context.params).token);
  if (!token.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  try {
    const response = await createAuthApiClient().post(
      `/api/v1/interviews/${token.data}/transcript/finalize`,
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
