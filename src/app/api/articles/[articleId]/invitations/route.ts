import { NextResponse } from "next/server";
import { z } from "zod";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

const articleIdSchema = z.string().uuid();
const createInvitationSchema = z
  .object({
    participant_name: z.string().trim().min(1).max(120),
    participant_email: z.string().trim().email().max(254),
    expires_on: z.string().date().nullable(),
  })
  .strict();

type RouteContext = { params: Promise<{ articleId: string }> };

async function requestContext(context: RouteContext) {
  const [{ articleId }, token] = await Promise.all([
    context.params,
    getArticleToken(),
  ]);
  return { articleId: articleIdSchema.safeParse(articleId), token };
}

export async function GET(_request: Request, context: RouteContext) {
  const { articleId, token } = await requestContext(context);
  if (!token)
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );
  if (!articleId.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );

  try {
    const response = await articleBackendClient(token).get(
      `/api/v1/articles/${articleId.data}/invitations`,
    );
    return NextResponse.json(response.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { articleId, token } = await requestContext(context);
  if (!token)
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );
  if (!articleId.success)
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
  const input = createInvitationSchema.safeParse(payload);
  if (!input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );

  try {
    const response = await articleBackendClient(token).post(
      `/api/v1/articles/${articleId.data}/invitations`,
      input.data,
    );
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
