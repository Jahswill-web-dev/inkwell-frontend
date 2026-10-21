import { NextResponse } from "next/server";
import { z } from "zod";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

const idSchema = z.string().uuid();
type RouteContext = {
  params: Promise<{ articleId: string; invitationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const [{ articleId, invitationId }, token] = await Promise.all([
    context.params,
    getArticleToken(),
  ]);
  const article = idSchema.safeParse(articleId);
  const invitation = idSchema.safeParse(invitationId);
  if (!token) {
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );
  }
  if (!article.success || !invitation.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  }
  try {
    const response = await articleBackendClient(token).get(
      `/api/v1/articles/${article.data}/invitations/${invitation.data}/transcript`,
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
