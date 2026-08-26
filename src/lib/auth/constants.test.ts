import { describe, expect, it } from "vitest";
import { safeProtectedPath } from "./constants";

describe("safeProtectedPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/articles/new?mode=notes", "/articles/new?mode=notes"],
    ["/onboarding", "/onboarding"],
    ["https://evil.example/steal", "/dashboard"],
    ["//evil.example/steal", "/dashboard"],
    ["/login", "/dashboard"],
  ])("maps %s to %s", (input, expected) => {
    expect(safeProtectedPath(input)).toBe(expected);
  });
});
