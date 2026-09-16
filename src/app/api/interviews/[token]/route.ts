import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  articleErrorResponse,
  articleUpstreamError,
} from "@/lib/articles/server";

const tokenSchema = z.string().min(20).max(200);
const sessionUpdateSchema = z
  .object({
    state: z.enum(["welcome", "active", "paused", "completed"]),
    questions: z.array(z.record(z.string(), z.unknown())),
    current_question_index: z.number().int().min(0),
    answers: z.array(z.record(z.string(), z.unknown())),
    completion_reason: z
      .enum(["sufficient", "participant_finished", "question_limit"])
      .nullable(),
    final_detail_added: z.boolean(),
    draft_answer: z.string().max(10_000),
  })
  .strict();

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

export async function PATCH(request: Request, context: RouteContext) {
  const token = await tokenFrom(context);
  if (!token.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return articleErrorResponse(
      400,
      "invalid_json",
      "Send a valid JSON request.",
    );
  }
  const input = sessionUpdateSchema.safeParse(payload);
  if (!input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );
  try {
    const response = await createAuthApiClient().patch(
      `/api/v1/interviews/${token.data}`,
      input.data,
    );
    return NextResponse.json(response.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}
