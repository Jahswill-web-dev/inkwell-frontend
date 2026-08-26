import axios from "axios";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  sectionDraftGenerationInputSchema,
  sectionDraftGenerationResultSchema,
} from "@/lib/articles/draft";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

const idSchema = z.string().uuid();
const SECTION_DRAFT_GENERATION_TIMEOUT_MS = 120_000;
type RouteContext = {
  params: Promise<{ articleId: string; sectionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const [{ articleId, sectionId }, token] = await Promise.all([
    context.params,
    getArticleToken(),
  ]);
  if (!token)
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );

  const parsedArticleId = idSchema.safeParse(articleId);
  const parsedSectionId = idSchema.safeParse(sectionId);
  if (!parsedArticleId.success || !parsedSectionId.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );

  let payload: unknown = {};
  const text = await request.text();
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      return articleErrorResponse(
        400,
        "invalid_json",
        "Send a valid JSON request.",
      );
    }
  }
  const input = sectionDraftGenerationInputSchema.safeParse(payload);
  if (!input.success)
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );

  try {
    const path = `/api/v1/articles/${parsedArticleId.data}/draft/sections/${parsedSectionId.data}/generate`;
    const client = articleBackendClient(token);
    const response = await client.post(
      path,
      input.data.instruction ? input.data : undefined,
      { timeout: SECTION_DRAFT_GENERATION_TIMEOUT_MS },
    );
    const result = sectionDraftGenerationResultSchema.safeParse(response.data);
    if (!result.success || result.data.section_id !== parsedSectionId.data)
      throw new Error("Invalid section-draft generation response");
    return NextResponse.json(result.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === "ECONNABORTED")
      return articleErrorResponse(
        504,
        "section_draft_generation_timeout",
        "Section generation timed out. Please try again.",
      );
    return articleUpstreamError(error);
  }
}
