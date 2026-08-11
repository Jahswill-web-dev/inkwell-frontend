import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "./signup-form";

const { postMock, pushMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    post: postMock,
    isAxiosError: (error: unknown) =>
      Boolean(
        error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        error.isAxiosError,
      ),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(cleanup);

beforeEach(() => {
  postMock.mockReset();
  pushMock.mockReset();
  postMock.mockResolvedValue({ data: { user: {} }, status: 201 });
});

async function fillValidForm() {
  await userEvent.type(
    screen.getByLabelText("Email address"),
    " Writer@Example.com ",
  );
  await userEvent.type(screen.getByLabelText("Username"), "writer_01");
  await userEvent.type(
    screen.getByLabelText("Password", { exact: true }),
    "thoughtful-password",
  );
}

describe("SignupForm", () => {
  it("shows useful validation for invalid details", async () => {
    render(<SignupForm />);

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    expect(
      screen.getByText(
        "Use 3-30 lowercase letters, numbers, or underscores only.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Use between 8 and 128 characters.")).toBeVisible();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("rejects uppercase and whitespace in usernames", async () => {
    render(<SignupForm />);

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "writer@example.com",
    );
    await userEvent.type(screen.getByLabelText("Username"), "Writer 01");
    await userEvent.type(
      screen.getByLabelText("Password", { exact: true }),
      "thoughtful-password",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(
      screen.getByText(
        "Use 3-30 lowercase letters, numbers, or underscores only.",
      ),
    ).toBeVisible();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("lets a user reveal and hide their password", async () => {
    render(<SignupForm />);
    const password = screen.getByLabelText("Password", { exact: true });

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

  it("submits normalized data and opens onboarding", async () => {
    render(<SignupForm />);
    await fillValidForm();

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "/api/auth/register",
        {
          email: "writer@example.com",
          username: "writer_01",
          password: "thoughtful-password",
        },
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    expect(pushMock).toHaveBeenCalledWith("/onboarding");
  });

  it("disables submission while a registration request is pending", async () => {
    let resolveRequest!: (value: unknown) => void;
    postMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    render(<SignupForm />);
    await fillValidForm();

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );
    const loadingButton = screen.getByRole("button", {
      name: "Creating account...",
    });

    expect(loadingButton).toBeDisabled();
    await userEvent.click(loadingButton);
    expect(postMock).toHaveBeenCalledOnce();

    resolveRequest({ data: { user: {} }, status: 201 });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/onboarding"));
  });

  it.each([
    ["email_already_registered", "An account with this email already exists."],
    ["username_taken", "This username is already taken."],
  ])("maps %s conflicts to the matching field", async (code, message) => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { code, message } } },
    });
    render(<SignupForm />);
    await fillValidForm();

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByText(message)).toBeVisible();
    expect(pushMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("maps backend validation details without displaying backend messages", async () => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: "validation_error",
            message: "Request validation failed",
            details: [
              {
                type: "string_too_short",
                loc: ["body", "password"],
                msg: "Internal backend validation message",
              },
            ],
          },
        },
      },
    });
    render(<SignupForm />);
    await fillValidForm();

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(
      await screen.findByText("Use between 8 and 128 characters."),
    ).toBeVisible();
    expect(
      screen.queryByText("Internal backend validation message"),
    ).not.toBeInTheDocument();
  });

  it("shows a retryable alert when registration is unavailable", async () => {
    postMock.mockRejectedValue({ isAxiosError: true });
    render(<SignupForm />);
    await fillValidForm();

    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't create your account. Try again.",
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });
});
