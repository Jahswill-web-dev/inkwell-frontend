import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingScreen } from "./onboarding-screen";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(cleanup);
beforeEach(() => pushMock.mockClear());

describe("OnboardingScreen", () => {
  it("starts with the reference goals selected and toggles from the row label", async () => {
    render(<OnboardingScreen />);
    expect(screen.getByRole("checkbox", { name: /Blog posts/ })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Educational articles/ }),
    ).toBeChecked();
    await userEvent.click(screen.getByText("Thought leadership"));
    expect(
      screen.getByRole("checkbox", { name: /Thought leadership/ }),
    ).toBeChecked();
  });

  it("requires at least one writing goal before continuing", async () => {
    render(<OnboardingScreen />);
    await userEvent.click(screen.getByText("Blog posts"));
    await userEvent.click(screen.getByText("Educational articles"));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose at least one writing goal to continue.",
    );
  });

  it("opens the dashboard after saving the selected goals", async () => {
    render(<OnboardingScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("skips directly to the dashboard and exposes the back route", async () => {
    render(<OnboardingScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Skip/ }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });
});
