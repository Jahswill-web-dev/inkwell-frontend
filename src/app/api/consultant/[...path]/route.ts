import { NextResponse } from "next/server";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (!path.length || path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part)))
    return articleErrorResponse(404, "not_found", "Not found.");
  const token = await getArticleToken();
  if (
    !token &&
    !(request.method === "GET" && path.join("/") === "availability")
  )
    return articleErrorResponse(
      401,
      "authentication_required",
      "Please sign in.",
    );
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return articleErrorResponse(
        403,
        "invalid_origin",
        "Request origin is not allowed.",
      );
  }
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    const response = await articleBackendClient(token ?? "").request({
      method: request.method,
      url: `/api/v1/consultant/${path.join("/")}${new URL(request.url).search}`,
      data: body ? JSON.parse(body) : undefined,
      timeout: 120000,
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("if-unmodified-since")
          ? {
              "If-Unmodified-Since": request.headers.get(
                "if-unmodified-since",
              )!,
            }
          : {}),
      },
    });
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (error instanceof SyntaxError)
      return articleErrorResponse(400, "invalid_json", "Send valid JSON.");
    return articleUpstreamError(error);
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
