import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Hero } from "./hero";
import { ProductFeatures } from "./product-features";
import { WritingWorkflow } from "./writing-workflow";

afterEach(cleanup);

describe("landing page content", () => {
  it("renders the hero promise and conversion paths", () => {
    render(<Hero />);

    expect(
      screen.getByRole("heading", {
        name: /turn client expertise into content writers can use/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Build a client article" }),
    ).toHaveAttribute("href", "/signup");
    expect(
      screen.getByRole("link", { name: "See the client flow" }),
    ).toHaveAttribute("href", "#how-it-works");
    expect(
      screen.getAllByAltText(/Inkwell agency article setup screen/i),
    ).toHaveLength(1);
  });

  it("renders every stage of the writing workflow", () => {
    render(<WritingWorkflow />);
    const list = screen.getByRole("list");

    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getByText("Set the foundation")).toBeVisible();
    expect(within(list).getByText("Send the link")).toBeVisible();
    expect(within(list).getByText("Hand off to writers")).toBeVisible();
  });

  it("renders the agency-focused product features", () => {
    render(<ProductFeatures />);

    expect(
      screen.getByRole("heading", {
        name: "Set the angle before the interview starts",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Let clients share what they know—on their own time",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Send a private interview link, not another form",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Give writers a source of truth—not a messy transcript",
      }),
    ).toBeVisible();
  });
});
