import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const AUTH_COOKIE_NAME = "inkwell_access_token";
export const REFRESH_COOKIE_NAME = "inkwell_refresh_token";

export function authCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function refreshCookieOptions(
  expiresAt: string,
): Partial<ResponseCookie> {
  return {
    ...authCookieOptions(),
    maxAge: Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
    ),
  };
}

export function safeProtectedPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard";

  try {
    const url = new URL(value, "http://inkwell.local");
    const isProtected =
      url.pathname === "/consultant" ||
      url.pathname.startsWith("/consultant/") ||
      url.pathname === "/onboarding" ||
      url.pathname === "/dashboard" ||
      url.pathname.startsWith("/dashboard/") ||
      url.pathname === "/articles" ||
      url.pathname.startsWith("/articles/");

    return isProtected ? `${url.pathname}${url.search}` : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
