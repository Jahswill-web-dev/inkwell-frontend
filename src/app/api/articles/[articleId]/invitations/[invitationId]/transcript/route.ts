import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  articleErrorResponse,
  articleUpstreamError,
} from "@/lib/articles/server";

const idSchema = z.string().uuid();
type RouteContext = {
  params: Promise<{ articleId: string; invitationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { articleId, invitationId } = await context.params;
  const article = idSchema.safeParse(articleId);
  const invitation = idSchema.safeParse(invitationId);
  if (!article.success || !invitation.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  }
  try {
    const response = await createAuthApiClient().get(
      `/api/v1/articles/${article.data}/invitations/${invitation.data}/transcript`,
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
