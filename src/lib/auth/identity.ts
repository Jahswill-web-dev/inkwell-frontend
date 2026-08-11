import type { PublicUser } from "./registration";

export type AuthIdentity = { username: string; initials: string };

export const DEFAULT_AUTH_IDENTITY: AuthIdentity = {
  username: "writer_01",
  initials: "WR",
};

export function toAuthIdentity(
  user: Pick<PublicUser, "username">,
): AuthIdentity {
  const characters = user.username.replace(/[^a-z0-9]/gi, "").slice(0, 2);
  return {
    username: user.username,
    initials: (characters || "U").toUpperCase(),
  };
}
