import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const { postMock, refreshMock, replaceMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  refreshMock: vi.fn(),
  replaceMock: vi.fn(),
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
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

afterEach(cleanup);
beforeEach(() => {
  postMock.mockReset().mockResolvedValue({ status: 200, data: { user: {} } });
  replaceMock.mockReset();
  refreshMock.mockReset();
});

async function fillLogin() {
  await userEvent.type(
    screen.getByLabelText("Email address"),
    " Writer@Example.com ",
  );
  await userEvent.type(
    screen.getByLabelText("Password", { exact: true }),
    " thoughtful password ",
  );
}

describe("LoginForm", () => {
  it("shows useful validation for invalid details", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    expect(screen.getByText("Enter your password.")).toBeVisible();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("supports password visibility and no longer promises persistence", async () => {
    render(<LoginForm />);
    const password = screen.getByLabelText("Password", { exact: true });
    await userEvent.type(password, "thoughtful-password");
    await userEvent.click(
      screen.getByRole("button", { name: "Show password" }),
    );

    expect(password).toHaveAttribute("type", "text");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("submits normalized credentials and follows a safe return path", async () => {
    render(<LoginForm redirectTo="/articles/new?mode=notes" />);
    await fillLogin();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "/api/auth/login",
        {
          email: "writer@example.com",
          password: " thoughtful password ",
        },
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    expect(replaceMock).toHaveBeenCalledWith("/articles/new?mode=notes");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("rejects unsafe return paths", async () => {
    render(<LoginForm redirectTo="https://evil.example/steal" />);
    await fillLogin();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("disables duplicate submissions while login is pending", async () => {
    let resolveRequest!: (value: unknown) => void;
    postMock.mockImplementation(
      () => new Promise((resolve) => (resolveRequest = resolve)),
    );
    render(<LoginForm />);
    await fillLogin();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const pending = screen.getByRole("button", { name: "Signing in..." });
    expect(pending).toBeDisabled();
    await userEvent.click(pending);
    expect(postMock).toHaveBeenCalledOnce();
    resolveRequest({ status: 200 });
    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
  });

  it.each([
    ["invalid_credentials", "Invalid email or password."],
    [
      "too_many_login_attempts",
      "Too many login attempts. Try again in 742 seconds.",
    ],
  ])("shows safe %s feedback", async (code, message) => {
    postMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { error: { code, message: "Backend detail" } },
        headers:
          code === "too_many_login_attempts" ? { "retry-after": "742" } : {},
      },
    });
    render(<LoginForm />);
    await fillLogin();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows generic retryable feedback for unavailable login", async () => {
    postMock.mockRejectedValue({ isAxiosError: true });
    render(<LoginForm />);
    await fillLogin();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't sign you in. Try again.",
    );
  });
});
