import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/constants";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...authCookieOptions(),
    maxAge: 0,
  });
  return response;
}
