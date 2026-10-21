import { NextResponse } from "next/server";
import { workspaceSchema } from "@/lib/agency/agency";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

export async function GET(request?: Request) {
  const token = await getArticleToken();
  if (!token) {
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );
  }
  try {
    const experience = request
      ? new URL(request.url).searchParams.get("experience")
      : null;
    if (experience && !["marketing", "consultant"].includes(experience))
      return articleErrorResponse(
        422,
        "invalid_experience",
        "Choose a valid experience.",
      );
    const path = `/api/v1/workspaces/current${experience ? `?experience=${experience}` : ""}`;
    const response = await articleBackendClient(token).get(path);
    return NextResponse.json(workspaceSchema.parse(response.data));
  } catch (error) {
    return articleUpstreamError(error);
  }
}
