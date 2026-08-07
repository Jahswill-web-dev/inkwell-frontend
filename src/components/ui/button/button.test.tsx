import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("shows its loading label and disables interaction while loading", () => {
    render(
      <Button isLoading loadingLabel="Creating account…">
        Create account
      </Button>,
    );

    const button = screen.getByRole("button", {
      name: "Creating account…",
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
