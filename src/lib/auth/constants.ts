import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const AUTH_COOKIE_NAME = "inkwell_access_token";

export function authCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function safeProtectedPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard";

  try {
    const url = new URL(value, "http://inkwell.local");
    const isProtected =
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
