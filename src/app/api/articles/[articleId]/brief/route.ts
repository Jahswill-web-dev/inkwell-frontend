import { NextResponse } from "next/server";
import { z } from "zod";
import {
  articleBriefPatchSchema,
  articleBriefSchema,
} from "@/lib/articles/brief";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

const articleIdSchema = z.string().uuid();
const BRIEF_GENERATION_TIMEOUT_MS = 120_000;
type RouteContext = { params: Promise<{ articleId: string }> };

async function requestContext(context: RouteContext) {
  const [{ articleId }, token] = await Promise.all([
    context.params,
    getArticleToken(),
  ]);
  return { articleId: articleIdSchema.safeParse(articleId), token };
}

async function briefRequest(
  method: "get" | "post" | "patch",
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
    const path = `/api/v1/articles/${articleId.data}/brief`;
    const client = articleBackendClient(token);
    const response =
      method === "get"
        ? await client.get(path)
        : method === "post"
          ? await client.post(path, undefined, {
              timeout: BRIEF_GENERATION_TIMEOUT_MS,
            })
          : await client.patch(path, body);
    const result = articleBriefSchema.safeParse(response.data);
    if (!result.success) throw new Error("Invalid article brief response");
    return NextResponse.json(result.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  return briefRequest("get", context);
}

export async function POST(_request: Request, context: RouteContext) {
  return briefRequest("post", context);
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
  const input = articleBriefPatchSchema.safeParse(payload);
  if (!input.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );
  }
  return briefRequest("patch", context, input.data);
}
