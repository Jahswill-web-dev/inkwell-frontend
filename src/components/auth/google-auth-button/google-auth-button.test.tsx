import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleAuthButton } from "./google-auth-button";

afterEach(cleanup);

describe("GoogleAuthButton", () => {
  it("invokes the supplied authentication handler", async () => {
    const handleClick = vi.fn();
    render(<GoogleAuthButton onClick={handleClick} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
