import { NextResponse } from "next/server";
import { z } from "zod";
import { sectionInterviewSchema } from "@/lib/articles/interview";
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

export async function GET(_request: Request, context: RouteContext) {
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

  try {
    const path = `/api/v1/articles/${parsedArticleId.data}/draft/sections/${parsedSectionId.data}/interviews/latest`;
    const response = await articleBackendClient(token).get(path);
    const interview = sectionInterviewSchema.safeParse(response.data);
    if (
      !interview.success ||
      interview.data.section_id !== parsedSectionId.data
    )
      throw new Error("Invalid section-interview response");
    return NextResponse.json(interview.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}
