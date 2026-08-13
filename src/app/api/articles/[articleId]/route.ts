import { NextResponse } from "next/server";
import { z } from "zod";
import { articlePatchSchema, articleSchema } from "@/lib/articles/article";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

const articleIdSchema = z.string().uuid();
type RouteContext = { params: Promise<{ articleId: string }> };

async function requestContext(context: RouteContext) {
  const [{ articleId }, token] = await Promise.all([context.params, getArticleToken()]);
  return { articleId: articleIdSchema.safeParse(articleId), token };
}

export async function GET(_request: Request, context: RouteContext) {
  const { articleId, token } = await requestContext(context);
  if (!token) return articleErrorResponse(401, "authentication_required", "Authentication is required.");
  if (!articleId.success) return articleErrorResponse(422, "validation_error", "Request validation failed.");

  try {
    const response = await articleBackendClient(token).get(`/api/v1/articles/${articleId.data}`);
    const result = articleSchema.safeParse(response.data);
    if (!result.success) throw new Error("Invalid article response");
    return NextResponse.json(result.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { articleId, token } = await requestContext(context);
  if (!token) return articleErrorResponse(401, "authentication_required", "Authentication is required.");
  if (!articleId.success) return articleErrorResponse(422, "validation_error", "Request validation failed.");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return articleErrorResponse(400, "invalid_json", "Send a valid JSON request.");
  }
  const input = articlePatchSchema.safeParse(payload);
  if (!input.success) {
    return articleErrorResponse(422, "validation_error", "Request validation failed.", input.error.issues);
  }

  try {
    const response = await articleBackendClient(token).patch(
      `/api/v1/articles/${articleId.data}`,
      input.data,
    );
    const result = articleSchema.safeParse(response.data);
    if (!result.success) throw new Error("Invalid article response");
    return NextResponse.json(result.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { articleId, token } = await requestContext(context);
  if (!token) return articleErrorResponse(401, "authentication_required", "Authentication is required.");
  if (!articleId.success) return articleErrorResponse(422, "validation_error", "Request validation failed.");

  try {
    await articleBackendClient(token).delete(`/api/v1/articles/${articleId.data}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
