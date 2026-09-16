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

export async function DELETE(_request: Request, context: RouteContext) {
  const [{ articleId, invitationId }, token] = await Promise.all([
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
  const parsedInvitationId = idSchema.safeParse(invitationId);
  if (!parsedArticleId.success || !parsedInvitationId.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );

  try {
    const response = await articleBackendClient(token).delete(
      `/api/v1/articles/${parsedArticleId.data}/invitations/${parsedInvitationId.data}`,
    );
    return NextResponse.json(response.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}
