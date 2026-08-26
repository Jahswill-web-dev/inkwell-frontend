import { articleInputSchema, articleListSchema, articlePaginationSchema, articleSchema } from "@/lib/articles/article";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";
import { NextResponse } from "next/server";

async function requireToken() {
  const token = await getArticleToken();
  return token;
}

export async function GET(request: Request) {
  const token = await requireToken();
  if (!token) {
    return articleErrorResponse(401, "authentication_required", "Authentication is required.");
  }

  const url = new URL(request.url);
  const pagination = articlePaginationSchema.safeParse({
    offset: url.searchParams.get("offset") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!pagination.success) {
    return articleErrorResponse(422, "validation_error", "Request validation failed.", pagination.error.issues);
  }

  try {
    const response = await articleBackendClient(token).get("/api/v1/articles", {
      params: pagination.data,
    });
    const result = articleListSchema.safeParse(response.data);
    if (!result.success) throw new Error("Invalid article list response");
    return NextResponse.json(result.data);
  } catch (error) {
    return articleUpstreamError(error);
  }
}

export async function POST(request: Request) {
  const token = await requireToken();
  if (!token) {
    return articleErrorResponse(401, "authentication_required", "Authentication is required.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return articleErrorResponse(400, "invalid_json", "Send a valid JSON request.");
  }
  const input = articleInputSchema.safeParse(payload);
  if (!input.success) {
    return articleErrorResponse(422, "validation_error", "Request validation failed.", input.error.issues);
  }

  try {
    const response = await articleBackendClient(token).post("/api/v1/articles", input.data);
    const result = articleSchema.safeParse(response.data);
    if (!result.success) throw new Error("Invalid article response");
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
