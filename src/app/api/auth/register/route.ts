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
  registrationSchema,
  type AuthErrorResponse,
} from "@/lib/auth/registration";

const BACKEND_REGISTER_PATH = "/api/v1/auth/register";

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: AuthErrorResponse["error"]["details"],
) {
  return NextResponse.json<AuthErrorResponse>(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Send a valid JSON request");
  }

  const input = registrationSchema.safeParse(payload);

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
    const backend = createAuthApiClient();
    const upstreamResponse = await backend.post(
      BACKEND_REGISTER_PATH,
      input.data,
    );
    const result = backendRegistrationResponseSchema.safeParse(
      upstreamResponse.data,
    );

    if (!result.success) {
      console.error("Authentication service returned an invalid response.");
      return errorResponse(
        502,
        "registration_unavailable",
        "Registration is temporarily unavailable",
      );
    }

    const response = NextResponse.json(
      { user: result.data.user },
      { status: 201 },
    );
    response.cookies.set(
      AUTH_COOKIE_NAME,
      result.data.access_token,
      authCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      console.error(error.message);
      return errorResponse(
        500,
        "auth_not_configured",
        "Registration is temporarily unavailable",
      );
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const backendError = authErrorResponseSchema.safeParse(
        error.response?.data,
      );

      if ((status === 409 || status === 422) && backendError.success) {
        return NextResponse.json(backendError.data, { status });
      }
    }

    console.error("Authentication service request failed.");
    return errorResponse(
      502,
      "registration_unavailable",
      "Registration is temporarily unavailable",
    );
  }
}
