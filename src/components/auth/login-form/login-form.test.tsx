import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LoginForm } from "./login-form";

afterEach(cleanup);

describe("LoginForm", () => {
  it("shows useful validation for invalid details", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    expect(screen.getByText("Enter your password.")).toBeVisible();
  });

  it("supports password visibility and remembering the user", async () => {
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");
    const rememberMe = screen.getByRole("checkbox", { name: "Remember me" });

    await userEvent.type(password, "thoughtful-password");
    await userEvent.click(
      screen.getByRole("button", { name: "Show password" }),
    );
    await userEvent.click(rememberMe);

    expect(password).toHaveAttribute("type", "text");
    expect(rememberMe).toBeChecked();
  });

  it("shows loading and mocked success feedback for valid details", async () => {
    render(<LoginForm />);

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "writer@example.com",
    );
    await userEvent.type(
      screen.getByLabelText("Password"),
      "thoughtful-password",
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(
      await screen.findByText(
        "You’re signed in. Your dashboard will open next.",
      ),
    ).toBeVisible();
  });

  it("shows feedback when Google sign-in is selected", async () => {
    render(<LoginForm />);

    await userEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(
      screen.getByText("Google sign-in will be available soon."),
    ).toBeVisible();
  });
});
