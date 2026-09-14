import { NextResponse } from "next/server";
import { workspaceSchema } from "@/lib/agency/agency";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

export async function GET() {
  const token = await getArticleToken();
  if (!token) {
    return articleErrorResponse(401, "authentication_required", "Authentication is required.");
  }
  try {
    const response = await articleBackendClient(token).get("/api/v1/workspaces/current");
    return NextResponse.json(workspaceSchema.parse(response.data));
  } catch (error) {
    return articleUpstreamError(error);
  }
}
