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
        name: /turn your idea into a publish-ready article/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Start writing free" }),
    ).toHaveAttribute("href", "/signup");
    expect(
      screen.getByRole("link", { name: "See how it works" }),
    ).toHaveAttribute("href", "#how-it-works");
    expect(
      screen.getAllByAltText(/Inkwell editor helping a writer/i),
    ).toHaveLength(1);
  });

  it("renders every stage of the writing workflow", () => {
    render(<WritingWorkflow />);
    const list = screen.getByRole("list");

    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(within(list).getByText("Idea")).toBeVisible();
    expect(within(list).getByText("Export")).toBeVisible();
  });

  it("renders the three focused product features", () => {
    render(<ProductFeatures />);

    expect(
      screen.getByRole("heading", { name: "Give every section a purpose" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Write with AI, not beneath it" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Feedback that reads beyond grammar",
      }),
    ).toBeVisible();
  });
});
