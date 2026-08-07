import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SignupForm } from "./signup-form";

afterEach(cleanup);

describe("SignupForm", () => {
  it("shows useful validation for invalid details", async () => {
    render(<SignupForm />);

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    expect(screen.getByText("Use at least 8 characters.")).toBeVisible();
  });

  it("lets a user reveal and hide their password", async () => {
    render(<SignupForm />);
    const password = screen.getByLabelText("Password");

    await userEvent.type(password, "thoughtful-password");
    await userEvent.click(
      screen.getByRole("button", { name: "Show password" }),
    );
    expect(password).toHaveAttribute("type", "text");

    await userEvent.click(
      screen.getByRole("button", { name: "Hide password" }),
    );
    expect(password).toHaveAttribute("type", "password");
  });
});
