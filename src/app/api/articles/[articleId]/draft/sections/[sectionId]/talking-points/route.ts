import { NextResponse } from "next/server";
import { z } from "zod";
import {
  talkingPointsInputSchema,
  talkingPointsResultSchema,
} from "@/lib/articles/draft";
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
  const input = talkingPointsInputSchema.safeParse(payload);
  if (!input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );

  try {
    const path = `/api/v1/articles/${parsedArticleId.data}/draft/sections/${parsedSectionId.data}/talking-points`;
    const client = articleBackendClient(token);
    const response = input.data.instruction
      ? await client.post(path, input.data)
      : await client.post(path);
    const result = talkingPointsResultSchema.safeParse(response.data);
    if (!result.success || result.data.section_id !== parsedSectionId.data)
      throw new Error("Invalid talking-points response");
    return NextResponse.json(result.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}
