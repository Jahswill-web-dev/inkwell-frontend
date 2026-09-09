import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Article } from "@/lib/articles/article";
import type { ArticleSetupMetadata } from "@/lib/articles/article-setup";
import { toArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import {
  completeClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
} from "@/lib/articles/client-interview-session";
import {
  createWriterInterviewMaterial,
  saveWriterInterviewMaterial,
} from "@/lib/articles/writer-interview-storage";
import { loadSourceReview } from "@/lib/articles/source-review-storage";
import { SourceReview } from "./source-review";

const article: Article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Useful source notes",
  working_title: "A useful article",
  target_audience: ["Content leaders"],
  article_goal: "inform_and_inspire",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

const metadata: ArticleSetupMetadata = {
  clientName: "Northstar Labs",
  contentType: "thought_leadership",
  mainAngle: "A clear angle",
  keyMessage: "A useful message",
  callToAction: "",
  tone: "Clear and credible",
  targetLength: "standard",
  seoKeyword: "",
  interviewMethod: "self",
  intervieweeName: "",
  interviewInstructions: "Ask for examples",
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe("SourceReview", () => {
  it("edits, excludes, filters, and approves attributed writer material", async () => {
    const material = createWriterInterviewMaterial(article.id);
    const answered = submitClientInterviewAnswer(
      startClientInterview(material.session),
      "The strongest takeaway comes from direct work with agency content teams and their client experts.",
    );
    const writerMaterial = saveWriterInterviewMaterial(
      material,
      completeClientInterview(answered),
    );
    const workspace = toArticleWorkspaceViewModel(
      article,
      "Nina",
      metadata,
      { hasBrief: false, hasOutline: false, hasDraft: false },
      null,
      writerMaterial,
    );
    render(<SourceReview workspace={workspace} />);

    expect(
      screen.getByRole("heading", { name: "Review source material" }),
    ).toBeVisible();
    expect(screen.getAllByText("Writer · Nina").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Missing information").length).toBeGreaterThan(0);

    await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.change(screen.getByLabelText("Edit material"), {
      target: { value: "A sharper approved summary." },
    });
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("A sharper approved summary.")).toBeVisible();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Exclude" })[0],
    );
    await userEvent.click(screen.getByRole("button", { name: "Writer" }));
    expect(screen.queryByText("Coverage check")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Approve material for generation" }),
    );
    expect(screen.getByText("Source material approved")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Continue to brief" }),
    ).toHaveAttribute("href", `/articles/new/brief?articleId=${article.id}`);
    expect(loadSourceReview(article.id)?.status).toBe("approved");
  });

  it("shows a useful empty state before any interview answers exist", () => {
    const workspace = toArticleWorkspaceViewModel(article, "Nina", metadata, {
      hasBrief: false,
      hasOutline: false,
      hasDraft: false,
    });
    render(<SourceReview workspace={workspace} />);
    expect(
      screen.getByRole("heading", { name: "No interview material yet" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Interview me" })).toBeVisible();
  });
});
