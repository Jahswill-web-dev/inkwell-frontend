import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  articleErrorResponse,
  articleUpstreamError,
} from "@/lib/articles/server";

const tokenSchema = z.string().min(20).max(200);
type RouteContext = { params: Promise<{ token: string }> };

async function tokenFrom(context: RouteContext) {
  const { token } = await context.params;
  return tokenSchema.safeParse(token);
}

export async function GET(_request: Request, context: RouteContext) {
  const token = await tokenFrom(context);
  if (!token.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  try {
    const response = await createAuthApiClient().get(
      `/api/v1/interviews/${token.data}`,
    );
    return NextResponse.json(response.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}
