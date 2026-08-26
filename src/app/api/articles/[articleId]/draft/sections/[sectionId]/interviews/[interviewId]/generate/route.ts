import { NextResponse } from "next/server";
import { z } from "zod";
import { sectionInterviewSchema } from "@/lib/articles/interview";
import {
  ARTICLE_GENERATION_TIMEOUT_MS,
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
  isArticleRequestTimeout,
} from "@/lib/articles/server";

const idSchema = z.string().uuid();
type RouteContext = {
  params: Promise<{
    articleId: string;
    sectionId: string;
    interviewId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const [{ articleId, sectionId, interviewId }, token] = await Promise.all([
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
  const parsedInterviewId = idSchema.safeParse(interviewId);
  if (
    !parsedArticleId.success ||
    !parsedSectionId.success ||
    !parsedInterviewId.success
  )
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );

  try {
    const path = `/api/v1/articles/${parsedArticleId.data}/draft/sections/${parsedSectionId.data}/interviews/${parsedInterviewId.data}/generate`;
    const response = await articleBackendClient(token).post(path, undefined, {
      timeout: ARTICLE_GENERATION_TIMEOUT_MS,
    });
    const interview = sectionInterviewSchema.safeParse(response.data);
    if (
      !interview.success ||
      interview.data.section_id !== parsedSectionId.data ||
      interview.data.id !== parsedInterviewId.data ||
      interview.data.status !== "generated"
    )
      throw new Error("Invalid section-interview response");
    return NextResponse.json(interview.data);
  } catch (error) {
    if (isArticleRequestTimeout(error))
      return articleErrorResponse(
        504,
        "section_interview_generation_timeout",
        "Write with me generation timed out. Please try again.",
      );
    return articleUpstreamError(error);
  }
}
