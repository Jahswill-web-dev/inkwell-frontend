import { NextResponse } from "next/server";
import {
  agencyClientInputSchema,
  agencyClientListSchema,
  agencyClientSchema,
} from "@/lib/agency/agency";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

export async function GET(request: Request) {
  const token = await getArticleToken();
  if (!token) {
    return articleErrorResponse(401, "authentication_required", "Authentication is required.");
  }
  const url = new URL(request.url);
  const offset = url.searchParams.get("offset") ?? "0";
  const limit = url.searchParams.get("limit") ?? "100";
  try {
    const response = await articleBackendClient(token).get("/api/v1/clients", {
      params: { offset, limit },
    });
    return NextResponse.json(agencyClientListSchema.parse(response.data));
  } catch (error) {
    return articleUpstreamError(error);
  }
}

export async function POST(request: Request) {
  const token = await getArticleToken();
  if (!token) {
    return articleErrorResponse(401, "authentication_required", "Authentication is required.");
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return articleErrorResponse(400, "invalid_json", "Send a valid JSON request.");
  }
  const input = agencyClientInputSchema.safeParse(payload);
  if (!input.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );
  }
  try {
    const response = await articleBackendClient(token).post("/api/v1/clients", input.data);
    return NextResponse.json(agencyClientSchema.parse(response.data), { status: 201 });
  } catch (error) {
    return articleUpstreamError(error);
  }
}
