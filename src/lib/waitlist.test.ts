import { describe, expect, it } from "vitest";
import { waitlistSchema } from "./waitlist";

describe("waitlistSchema", () => {
  it("normalizes valid waitlist details", () => {
    const result = waitlistSchema.parse({
      name: "  Ada Lovelace  ",
      email: "  ADA@EXAMPLE.COM ",
    });

    expect(result).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("rejects an empty name and invalid email", () => {
    const result = waitlistSchema.safeParse({
      name: "",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });
});
