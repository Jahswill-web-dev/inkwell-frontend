import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  authCookieOptions,
  refreshCookieOptions,
} from "@/lib/auth/constants";
import { backendRefreshResponseSchema } from "@/lib/auth/registration";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: { code: "invalid_origin" } },
      { status: 403 },
    );
  }
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: "session_expired" } },
      { status: 401 },
    );
  }
  try {
    const upstream = await createAuthApiClient().post("/api/v1/auth/refresh", {
      refresh_token: refreshToken,
    });
    const parsed = backendRefreshResponseSchema.safeParse(upstream.data);
    if (!parsed.success) throw new Error("Invalid refresh response");
    const response = NextResponse.json({ refreshed: true });
    response.cookies.set(
      AUTH_COOKIE_NAME,
      parsed.data.access_token,
      authCookieOptions(),
    );
    response.cookies.set(
      REFRESH_COOKIE_NAME,
      parsed.data.refresh_token,
      refreshCookieOptions(parsed.data.refresh_expires_at),
    );
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const response = NextResponse.json(
        { error: { code: "session_expired" } },
        { status: 401 },
      );
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        ...authCookieOptions(),
        maxAge: 0,
      });
      response.cookies.set(REFRESH_COOKIE_NAME, "", {
        ...authCookieOptions(),
        maxAge: 0,
      });
      return response;
    }
    return NextResponse.json(
      { error: { code: "refresh_unavailable" } },
      { status: 503 },
    );
  }
}
