import { NextResponse } from "next/server";
import { z } from "zod";
import {
  articleOutlinePatchSchema,
  articleOutlineSchema,
} from "@/lib/articles/outline";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

const articleIdSchema = z.string().uuid();
type RouteContext = { params: Promise<{ articleId: string }> };

async function requestContext(context: RouteContext) {
  const [{ articleId }, token] = await Promise.all([
    context.params,
    getArticleToken(),
  ]);
  return { articleId: articleIdSchema.safeParse(articleId), token };
}

async function outlineRequest(
  method: "get" | "post" | "patch" | "delete",
  context: RouteContext,
  body?: unknown,
) {
  const { articleId, token } = await requestContext(context);
  if (!token) {
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );
  }
  if (!articleId.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  }

  try {
    const path = `/api/v1/articles/${articleId.data}/outline`;
    const client = articleBackendClient(token);
    if (method === "delete") {
      await client.delete(path);
      return new NextResponse(null, { status: 204 });
    }
    const response =
      method === "get"
        ? await client.get(path)
        : method === "post"
          ? await client.post(path)
          : await client.patch(path, body);
    const result = articleOutlineSchema.safeParse(response.data);
    if (!result.success) throw new Error("Invalid article outline response");
    return NextResponse.json(result.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  return outlineRequest("get", context);
}

export async function POST(_request: Request, context: RouteContext) {
  return outlineRequest("post", context);
}

export async function PATCH(request: Request, context: RouteContext) {
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
  const input = articleOutlinePatchSchema.safeParse(payload);
  if (!input.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );
  }
  return outlineRequest("patch", context, input.data);
}

export async function DELETE(_request: Request, context: RouteContext) {
  return outlineRequest("delete", context);
}
