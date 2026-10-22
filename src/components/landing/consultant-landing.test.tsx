import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConsultantLanding } from "./consultant-landing";

afterEach(cleanup);

describe("consultant landing page", () => {
  it("explains the consultant journey and links to sign-up", () => {
    render(<ConsultantLanding />);

    expect(
      screen.getByRole("heading", {
        name: "Talk through your ideas. Turn them into articles that sound like you.",
      }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start with what you know." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "See your thinking take shape." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Refine every word." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ready when you are." })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /start an article/i })[0]).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(screen.getAllByRole("link", { name: "How it works" })[0]).toHaveAttribute(
      "href",
      "#how-it-works",
    );
  });
});
