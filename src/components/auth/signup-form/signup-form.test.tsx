import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "./signup-form";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(cleanup);

beforeEach(() => pushMock.mockClear());

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

  it("opens onboarding after a valid mocked signup", async () => {
    render(<SignupForm />);

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "you@example.com",
    );
    await userEvent.type(
      screen.getByLabelText("Password"),
      "thoughtful-password",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/onboarding"));
  });
});
