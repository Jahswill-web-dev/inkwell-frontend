import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadWriterInterviewMaterial } from "@/lib/articles/writer-interview-storage";
import { WriterInterview } from "./writer-interview";

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const detailedAnswer =
  "The most important idea is that useful interviews need specific evidence, a clear point of view, and concrete examples from real projects so readers can trust and apply the advice immediately. In our client work, that combination consistently produces clearer decisions, stronger stories, and more credible guidance for the intended audience.";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("WriterInterview", () => {
  it("saves, resumes, adapts, and labels whole-article material", async () => {
    const props = {
      articleId,
      articleTitle: "Expert-led content",
      clientName: "Northstar Labs",
      writerName: "Nina",
    };
    const view = render(<WriterInterview {...props} />);
    expect(screen.getByText("Whole-article writer interview")).toBeVisible();
    expect(screen.getByText(/Saved as writer-supplied material/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Interview me/ }));
    await userEvent.type(
      screen.getByLabelText("Your answer"),
      "A useful idea.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("A quick follow-up")).toBeVisible();
    await userEvent.type(
      screen.getByLabelText("Your answer"),
      "A concrete customer result.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Save for later/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Your interview is saved" }),
    ).toBeVisible();

    view.unmount();
    render(<WriterInterview {...props} />);
    expect(
      screen.getByRole("button", { name: /Continue interview/ }),
    ).toBeVisible();
    expect(loadWriterInterviewMaterial(articleId)).toMatchObject({
      sourceLabel: "Writer-supplied material",
      scope: "whole_article",
      session: { draftAnswer: "A concrete customer result." },
    });
  });

  it("finishes early once enough useful material is collected", async () => {
    render(
      <WriterInterview
        articleId={articleId}
        articleTitle="Expert-led content"
        clientName="Northstar Labs"
        writerName="Nina"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Interview me/ }));
    for (let index = 0; index < 3; index += 1) {
      fireEvent.change(screen.getByLabelText("Your answer"), {
        target: { value: detailedAnswer },
      });
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    }
    expect(screen.getByText("Whole-article interview complete")).toBeVisible();
    expect(
      screen.getByText(/saved separately as writer-supplied material/),
    ).toBeVisible();
  });
});
