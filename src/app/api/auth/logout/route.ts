import { NextRequest, NextResponse } from "next/server";
import { createAuthApiClient } from "@/lib/auth/backend";
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  authCookieOptions,
} from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshToken) {
    try {
      await createAuthApiClient().post("/api/v1/auth/logout", {
        refresh_token: refreshToken,
      });
    } catch {
      // Clear browser credentials even if the auth service is unavailable.
    }
  }
  const response = new NextResponse(null, { status: 204 });
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
