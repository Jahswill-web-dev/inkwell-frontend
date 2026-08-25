import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSectionInterviewInputSchema,
  sectionInterviewSchema,
} from "@/lib/articles/interview";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

const idSchema = z.string().uuid();
type RouteContext = {
  params: Promise<{ articleId: string; sectionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const [{ articleId, sectionId }, token] = await Promise.all([
    context.params,
    getArticleToken(),
  ]);
  if (!token)
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );

  const parsedArticleId = idSchema.safeParse(articleId);
  const parsedSectionId = idSchema.safeParse(sectionId);
  if (!parsedArticleId.success || !parsedSectionId.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );

  let payload: unknown = {};
  const text = await request.text();
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      return articleErrorResponse(
        400,
        "invalid_json",
        "Send a valid JSON request.",
      );
    }
  }
  const input = createSectionInterviewInputSchema.safeParse(payload);
  if (!input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );

  try {
    const path = `/api/v1/articles/${parsedArticleId.data}/draft/sections/${parsedSectionId.data}/interviews`;
    const client = articleBackendClient(token);
    const response = input.data.instruction
      ? await client.post(path, input.data)
      : await client.post(path);
    const interview = sectionInterviewSchema.safeParse(response.data);
    if (
      !interview.success ||
      interview.data.section_id !== parsedSectionId.data ||
      interview.data.status !== "awaiting_answers"
    )
      throw new Error("Invalid section-interview response");
    return NextResponse.json(interview.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}
