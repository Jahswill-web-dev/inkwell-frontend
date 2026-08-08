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
      screen.getByRole("button", { name: /Create new article/ }),
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

  it("provides mocked feedback for primary dashboard actions", async () => {
    render(<DashboardHome />);
    await userEvent.click(
      screen.getByRole("button", { name: /Create new article/ }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "New article setup will open next.",
    );
  });
});
