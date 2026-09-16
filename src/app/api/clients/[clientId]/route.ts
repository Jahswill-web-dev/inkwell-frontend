import { NextResponse } from "next/server";
import { z } from "zod";
import {
  agencyClientPatchSchema,
  agencyClientSchema,
} from "@/lib/agency/agency";
import {
  articleBackendClient,
  articleErrorResponse,
  articleUpstreamError,
  getArticleToken,
} from "@/lib/articles/server";

const clientIdSchema = z.string().uuid();
type RouteContext = { params: Promise<{ clientId: string }> };

async function requestContext(context: RouteContext) {
  const [{ clientId }, token] = await Promise.all([
    context.params,
    getArticleToken(),
  ]);
  return { clientId: clientIdSchema.safeParse(clientId), token };
}

export async function GET(_request: Request, context: RouteContext) {
  const { clientId, token } = await requestContext(context);
  if (!token) {
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );
  }
  if (!clientId.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  }
  try {
    const response = await articleBackendClient(token).get(
      `/api/v1/clients/${clientId.data}`,
    );
    return NextResponse.json(agencyClientSchema.parse(response.data));
  } catch (error) {
    return articleUpstreamError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { clientId, token } = await requestContext(context);
  if (!token) {
    return articleErrorResponse(
      401,
      "authentication_required",
      "Authentication is required.",
    );
  }
  if (!clientId.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
    );
  }
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
  const input = agencyClientPatchSchema.safeParse(payload);
  if (!input.success) {
    return articleErrorResponse(
      422,
      "validation_error",
      "Request validation failed.",
      input.error.issues,
    );
  }
  try {
    const response = await articleBackendClient(token).patch(
      `/api/v1/clients/${clientId.data}`,
      input.data,
    );
    return NextResponse.json(agencyClientSchema.parse(response.data));
  } catch (error) {
    return articleUpstreamError(error);
  }
}
