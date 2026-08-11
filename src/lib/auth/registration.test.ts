import { describe, expect, it } from "vitest";
import { registrationSchema } from "./registration";

describe("registrationSchema", () => {
  it("normalizes email without changing a valid username or password", () => {
    expect(
      registrationSchema.parse({
        email: " Writer@Example.com ",
        username: "writer_01",
        password: "  password with spaces  ",
      }),
    ).toEqual({
      email: "writer@example.com",
      username: "writer_01",
      password: "  password with spaces  ",
    });
  });

  it.each(["Writer_01", " writer_01", "writer-01", "ab"])(
    "rejects the username %s",
    (username) => {
      expect(
        registrationSchema.safeParse({
          email: "writer@example.com",
          username,
          password: "password",
        }).success,
      ).toBe(false);
    },
  );

  it("rejects passwords outside the backend length bounds", () => {
    expect(
      registrationSchema.safeParse({
        email: "writer@example.com",
        username: "writer_01",
        password: "1234567",
      }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({
        email: "writer@example.com",
        username: "writer_01",
        password: "x".repeat(129),
      }).success,
    ).toBe(false);
  });
});
