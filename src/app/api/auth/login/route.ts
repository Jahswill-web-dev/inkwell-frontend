import axios from "axios";
import { NextResponse } from "next/server";
import {
  AuthConfigurationError,
  createAuthApiClient,
} from "@/lib/auth/backend";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/constants";
import {
  authErrorResponseSchema,
  backendRegistrationResponseSchema,
  loginSchema,
  type AuthErrorResponse,
} from "@/lib/auth/registration";

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: AuthErrorResponse["error"]["details"],
  headers?: HeadersInit,
) {
  return NextResponse.json<AuthErrorResponse>(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status, headers },
  );
}

function retryAfterHeader(value: unknown): string | undefined {
  const normalized = Array.isArray(value) ? value[0] : value;
  return typeof normalized === "string" && /^\d+$/.test(normalized)
    ? normalized
    : undefined;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Send a valid JSON request");
  }

  const input = loginSchema.safeParse(payload);
  if (!input.success) {
    return errorResponse(
      422,
      "validation_error",
      "Request validation failed",
      input.error.issues.map((issue) => ({
        type: issue.code,
        loc: ["body", ...issue.path.map(String)],
        msg: issue.message,
      })),
    );
  }

  try {
    const response = await createAuthApiClient().post(
      "/api/v1/auth/login",
      input.data,
    );
    const result = backendRegistrationResponseSchema.safeParse(response.data);

    if (!result.success) {
      console.error(
        "Authentication service returned an invalid login response.",
      );
      return errorResponse(
        502,
        "login_unavailable",
        "Sign in is temporarily unavailable",
      );
    }

    const browserResponse = NextResponse.json(
      { user: result.data.user },
      { status: 200 },
    );
    browserResponse.cookies.set(
      AUTH_COOKIE_NAME,
      result.data.access_token,
      authCookieOptions(),
    );
    return browserResponse;
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      console.error(error.message);
      return errorResponse(
        500,
        "auth_not_configured",
        "Sign in is temporarily unavailable",
      );
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const backendError = authErrorResponseSchema.safeParse(
        error.response?.data,
      );

      if (
        (status === 401 || status === 422 || status === 429) &&
        backendError.success
      ) {
        const retryAfter = retryAfterHeader(
          error.response?.headers?.["retry-after"],
        );
        return NextResponse.json(backendError.data, {
          status,
          headers:
            status === 429 && retryAfter
              ? { "Retry-After": retryAfter }
              : undefined,
        });
      }
    }

    console.error("Authentication service login request failed.");
    return errorResponse(
      502,
      "login_unavailable",
      "Sign in is temporarily unavailable",
    );
  }
}
