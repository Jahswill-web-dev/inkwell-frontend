import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuthApiClient } from "@/lib/auth/backend";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/constants";
import { articleApiErrorSchema } from "./article";

export function articleErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export async function getArticleToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value ?? null;
}

export function articleBackendClient(token: string) {
  const client = createAuthApiClient();
  client.defaults.headers.common.Authorization = `Bearer ${token}`;
  return client;
}

export function articleUpstreamError(error: unknown): NextResponse {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const parsed = articleApiErrorSchema.safeParse(error.response?.data);
    if (
      (status === 401 || status === 404 || status === 422) &&
      parsed.success
    ) {
      const response = NextResponse.json(parsed.data, { status });
      if (status === 401) {
        response.cookies.set(AUTH_COOKIE_NAME, "", {
          ...authCookieOptions(),
          maxAge: 0,
        });
      }
      return response;
    }
  }

  console.error("Article service request failed.");
  return articleErrorResponse(
    502,
    "articles_unavailable",
    "Articles are temporarily unavailable.",
  );
}
