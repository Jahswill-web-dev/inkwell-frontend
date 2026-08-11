import axios from "axios";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthApiClient } from "./backend";
import { AUTH_COOKIE_NAME, safeProtectedPath } from "./constants";
import { publicUserSchema, type PublicUser } from "./registration";

export type SessionResult =
  | { status: "authenticated"; user: PublicUser }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

const E2E_USER: PublicUser = {
  id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  email: "writer@example.com",
  username: "writer_01",
  created_at: "2026-08-11T12:00:00Z",
  updated_at: "2026-08-11T12:00:00Z",
};

export async function validateAccessToken(
  token: string,
): Promise<SessionResult> {
  const testToken = process.env.E2E_AUTH_BYPASS_TOKEN;
  const unavailableTestToken = process.env.E2E_AUTH_UNAVAILABLE_TOKEN;
  if (
    process.env.NODE_ENV !== "production" &&
    unavailableTestToken &&
    token === unavailableTestToken
  ) {
    return { status: "unavailable" };
  }
  if (
    process.env.NODE_ENV !== "production" &&
    testToken &&
    token === testToken
  ) {
    return { status: "authenticated", user: E2E_USER };
  }

  try {
    const response = await createAuthApiClient().get("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = publicUserSchema.safeParse(response.data);
    return user.success
      ? { status: "authenticated", user: user.data }
      : { status: "unavailable" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { status: "unauthenticated" };
    }
    return { status: "unavailable" };
  }
}

export const getSession = cache(async (): Promise<SessionResult> => {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { status: "unauthenticated" };
  return validateAccessToken(token);
});

export async function requireUser(returnTo: string): Promise<PublicUser> {
  const safeReturnTo = safeProtectedPath(returnTo);
  const session = await getSession();

  if (session.status === "authenticated") return session.user;
  if (session.status === "unavailable") {
    redirect(`/auth/unavailable?next=${encodeURIComponent(safeReturnTo)}`);
  }
  redirect(`/login?next=${encodeURIComponent(safeReturnTo)}`);
}
