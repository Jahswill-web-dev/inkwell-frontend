import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardHome } from "./dashboard-home";

afterEach(cleanup);

describe("DashboardHome", () => {
  it("renders the welcome, quick actions, and writing lists", () => {
    render(<DashboardHome />);
    expect(
      screen.getByRole("heading", { name: "Good morning, Nina." }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Create new article/ }),
    ).toBeVisible();
    expect(screen.getAllByText("Continue writing").length).toBeGreaterThan(0);
  });

  it("filters articles from the accessible search field", async () => {
    render(<DashboardHome />);
    await userEvent.type(screen.getByRole("searchbox"), "Slower");
    expect(screen.getByText("The Case for Slower Thinking")).toBeVisible();
    expect(
      screen.queryByText("Designing a Life of Meaning"),
    ).not.toBeInTheDocument();
  });

  it("links each new-article action to the correct starting mode", () => {
    render(<DashboardHome />);

    expect(
      screen.getByRole("link", { name: /Create new article/ }),
    ).toHaveAttribute("href", "/articles/new");
    expect(
      screen.getAllByRole("link", { name: /Start from an idea/ }),
    ).toSatisfy((links: HTMLElement[]) =>
      links.every((link) => link.getAttribute("href") === "/articles/new"),
    );
    expect(screen.getAllByRole("link", { name: /Paste your notes/ })).toSatisfy(
      (links: HTMLElement[]) =>
        links.every(
          (link) => link.getAttribute("href") === "/articles/new?mode=notes",
        ),
    );
  });
});
