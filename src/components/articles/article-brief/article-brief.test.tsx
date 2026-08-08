import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ArticleBrief } from "./article-brief";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("ArticleBrief", () => {
  it("renders the reference brief and marks Brief as the current step", () => {
    render(<ArticleBrief />);

    expect(
      screen.getByRole("heading", { name: "Shape your article brief" }),
    ).toBeVisible();
    expect(
      screen.getByText("Why Great Ideas Are Hard to Write Down"),
    ).toBeVisible();
    expect(
      screen
        .getByRole("navigation", { name: "Article progress" })
        .querySelector('[aria-current="step"]'),
    ).toHaveTextContent("Brief");
  });

  it("prefills source details passed from the new-article screen", async () => {
    window.sessionStorage.setItem(
      "inkwell:new-article",
      JSON.stringify({
        mode: "notes",
        notes: "Research notes about deliberate creative practice.",
        workingTitle: "Practicing Creativity Deliberately",
        targetAudience: "Designers and writers",
        articleGoal: "educate",
      }),
    );

    render(<ArticleBrief />);

    await waitFor(() =>
      expect(
        screen.getByText("Practicing Creativity Deliberately"),
      ).toBeVisible(),
    );
    expect(screen.getByLabelText(/Main topic/)).toHaveValue(
      "Research notes about deliberate creative practice.",
    );
    expect(screen.getByLabelText(/Target audience/)).toHaveValue(
      "Designers and writers",
    );
    expect(screen.getByText("Educate with practical guidance")).toBeVisible();
  });

  it("updates character counts and preferred length", async () => {
    render(<ArticleBrief />);
    const topic = screen.getByLabelText(/Main topic/);

    await userEvent.clear(topic);
    await userEvent.type(topic, "A concise topic");
    await userEvent.click(screen.getByRole("radio", { name: /Long/ }));

    expect(screen.getByText("15 / 200")).toBeVisible();
    expect(screen.getByRole("radio", { name: /Long/ })).toBeChecked();
  });

  it("focuses the first invalid required field", async () => {
    render(<ArticleBrief />);
    const topic = screen.getByLabelText(/Main topic/);
    await userEvent.clear(topic);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Generate outline" })[0],
    );

    expect(topic).toHaveFocus();
    expect(screen.getByText("Add at least 10 characters.")).toBeVisible();
  });

  it("saves drafts and completes mocked outline generation", async () => {
    render(<ArticleBrief />);

    await userEvent.click(
      screen.getByRole("button", { name: "Save as draft" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Article brief saved.",
    );
    expect(window.sessionStorage.getItem("inkwell:article-brief")).toBeTruthy();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Generate outline" })[0],
    );
    expect(
      screen.getAllByRole("button", { name: "Generating outline…" })[0],
    ).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Outline generated.",
      ),
    );
  });
});
