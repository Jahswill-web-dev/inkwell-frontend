import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  articleErrorResponse,
  articleUpstreamError,
} from "@/lib/articles/server";

const tokenSchema = z.string().min(20).max(200);
const turnSchema = z
  .object({
    item_id: z.string().min(1).max(200),
    speaker: z.enum(["participant", "interviewer"]),
    text: z.string().trim().min(1).max(10_000),
  })
  .strict();
type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const token = tokenSchema.safeParse((await context.params).token);
  const payload = await request.json().catch(() => undefined);
  const input = z
    .object({ turns: z.array(turnSchema).min(1).max(40) })
    .strict()
    .safeParse(payload);
  if (!token.success || !input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  try {
    const response = await createAuthApiClient().post(
      `/api/v1/interviews/${token.data}/transcript`,
      input.data,
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
