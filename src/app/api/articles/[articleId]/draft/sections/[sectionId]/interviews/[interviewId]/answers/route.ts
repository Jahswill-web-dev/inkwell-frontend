import { NextResponse } from "next/server";
import { z } from "zod";
import {
  replaceSectionInterviewAnswersInputSchema,
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
  params: Promise<{
    articleId: string;
    sectionId: string;
    interviewId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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
  const input = replaceSectionInterviewAnswersInputSchema.safeParse(payload);
  if (!input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );

  try {
    const path = `/api/v1/articles/${parsedArticleId.data}/draft/sections/${parsedSectionId.data}/interviews/${parsedInterviewId.data}/answers`;
    const response = await articleBackendClient(token).patch(path, input.data);
    const interview = sectionInterviewSchema.safeParse(response.data);
    if (
      !interview.success ||
      interview.data.section_id !== parsedSectionId.data ||
      interview.data.id !== parsedInterviewId.data
    )
      throw new Error("Invalid section-interview response");
    return NextResponse.json(interview.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}
