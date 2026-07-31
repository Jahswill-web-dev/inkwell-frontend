import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Navigation } from "./navigation";

afterEach(cleanup);

describe("Navigation", () => {
  it("uses the expected product routes", () => {
    render(<Navigation />);

    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.getAllByRole("link", { name: "Start writing free" })[0],
    ).toHaveAttribute("href", "/signup");
  });

  it("opens, focuses, and closes the mobile navigation", async () => {
    const user = userEvent.setup();
    render(<Navigation />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toHaveAttribute("aria-expanded", "true");
    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(
      within(mobileNavigation).getByRole("link", { name: "How it works" }),
    ).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
