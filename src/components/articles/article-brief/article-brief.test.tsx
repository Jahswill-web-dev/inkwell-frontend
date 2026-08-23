import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleRequestError } from "@/lib/articles/client";
import { ArticleBrief } from "./article-brief";

const {
  pushMock,
  getArticleMock,
  getBriefMock,
  generateBriefMock,
  updateBriefMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getArticleMock: vi.fn(),
  getBriefMock: vi.fn(),
  generateBriefMock: vi.fn(),
  updateBriefMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  getArticle: getArticleMock,
  getArticleBrief: getBriefMock,
  generateArticleBrief: generateBriefMock,
  updateArticleBrief: updateBriefMock,
}));

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const article = {
  id: articleId,
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Research notes",
  working_title: "A Repeatable Publishing Process",
  target_audience: ["Independent writers", "Small teams"],
  article_goal: "educate_with_practical_guidance" as const,
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};
const brief = {
  id: "ccbfce42-98bf-4f44-b4cf-206cc3661f11",
  article_id: articleId,
  summary: "A practical guide to building a repeatable publishing process.",
  core_angle: "Consistency comes from workflow rather than discipline.",
  audience_insights: ["Writers need a process they can maintain"],
  tone_and_style: "Practical, encouraging, and specific",
  key_takeaways: ["Define a small repeatable workflow"],
  evidence_gaps: ["Examples showing the workflow in use"],
  call_to_action: "Create a checklist for the next article.",
  seo: {
    suggested_titles: ["Build a Content Workflow"],
    primary_keyword: "publishing process",
    secondary_keywords: ["content workflow"],
    meta_description: "Build a practical publishing process.",
  },
  model_id: "gemini-2.5-flash",
  prompt_version: "article_brief_v1",
  input_token_count: 275,
  output_token_count: 640,
  generation_duration_ms: 3240,
  is_stale: false,
  created_at: "2026-08-14T12:00:00Z",
  updated_at: "2026-08-14T12:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  getArticleMock.mockResolvedValue(article);
  getBriefMock.mockResolvedValue(brief);
  generateBriefMock.mockResolvedValue(brief);
  updateBriefMock.mockImplementation((_id, patch) =>
    Promise.resolve({
      ...brief,
      ...patch,
      seo: { ...brief.seo, ...(patch.seo ?? {}) },
    }),
  );
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("ArticleBrief", () => {
  it("requires an article id", () => {
    render(<ArticleBrief />);
    expect(
      screen.getByRole("heading", { name: "No article selected" }),
    ).toBeVisible();
    expect(getArticleMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid article id before making requests", () => {
    render(<ArticleBrief articleId="not-a-valid-id" />);
    expect(
      screen.getByRole("heading", { name: "Invalid article link" }),
    ).toBeVisible();
    expect(getArticleMock).not.toHaveBeenCalled();
  });

  it("loads and renders an existing API-native brief without regenerating", async () => {
    render(<ArticleBrief articleId={articleId} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparing your article brief",
    );
    expect(
      await screen.findByRole("heading", { name: "Your article brief" }),
    ).toBeVisible();
    expect(screen.getByText(brief.summary)).toBeVisible();
    expect(
      screen.getByText("Practical, encouraging, and specific"),
    ).toBeVisible();
    expect(getBriefMock).toHaveBeenCalledWith(articleId);
    expect(generateBriefMock).not.toHaveBeenCalled();
  });

  it("generates when the article has no saved brief", async () => {
    getBriefMock.mockRejectedValue(
      new ArticleRequestError(404, "brief_not_found", "Brief not found"),
    );
    render(<ArticleBrief articleId={articleId} />);
    expect(await screen.findByText(brief.summary)).toBeVisible();
    expect(generateBriefMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed generation retryable without recreating the article", async () => {
    getBriefMock.mockRejectedValue(
      new ArticleRequestError(404, "brief_not_found", "Brief not found"),
    );
    generateBriefMock
      .mockRejectedValueOnce(
        new ArticleRequestError(
          503,
          "brief_generation_unavailable",
          "Brief generation is unavailable",
        ),
      )
      .mockResolvedValueOnce(brief);
    render(<ArticleBrief articleId={articleId} />);
    expect(
      await screen.findByRole("heading", {
        name: "We couldn’t generate your brief",
      }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(brief.summary)).toBeVisible();
    expect(getArticleMock).toHaveBeenCalledTimes(1);
    expect(generateBriefMock).toHaveBeenCalledTimes(2);
  });

  it("shows stale state and regenerates the saved brief", async () => {
    getBriefMock.mockResolvedValue({ ...brief, is_stale: true });
    render(<ArticleBrief articleId={articleId} />);
    expect(await screen.findByText(/article intake changed/)).toBeVisible();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Regenerate" })[0],
    );
    await waitFor(() =>
      expect(generateBriefMock).toHaveBeenCalledWith(articleId),
    );
  });

  it("opens the persisted outline flow without legacy brief storage", async () => {
    render(<ArticleBrief articleId={articleId} />);
    await screen.findByText(brief.summary);
    await userEvent.click(
      screen.getAllByRole("button", { name: "Continue to outline" })[0],
    );
    expect(sessionStorage.getItem("inkwell:article-brief")).toBeNull();
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        `/articles/new/outline?articleId=${articleId}`,
      ),
    );
  });

  it("edits all fields and sends a minimal nested patch", async () => {
    render(<ArticleBrief articleId={articleId} />);
    await screen.findByText(brief.summary);
    await userEvent.click(screen.getByRole("button", { name: "Edit brief" }));
    const summary = screen.getByRole("textbox", { name: "Summary" });
    await userEvent.clear(summary);
    await userEvent.type(summary, "A revised summary");
    const meta = screen.getByRole("textbox", { name: "Meta description" });
    await userEvent.clear(meta);
    await userEvent.type(meta, "A revised description");
    expect(
      screen.getAllByRole("button", { name: "Continue to outline" })[0],
    ).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(updateBriefMock).toHaveBeenCalledWith(articleId, {
        summary: "A revised summary",
        seo: { meta_description: "A revised description" },
      }),
    );
  });

  it("cancels edits and preserves a failed save draft", async () => {
    updateBriefMock.mockRejectedValueOnce(
      new ArticleRequestError(503, "brief_unavailable", "Unable to save"),
    );
    render(<ArticleBrief articleId={articleId} />);
    await screen.findByText(brief.summary);
    await userEvent.click(screen.getByRole("button", { name: "Edit brief" }));
    const summary = screen.getByRole("textbox", { name: "Summary" });
    await userEvent.clear(summary);
    await userEvent.type(summary, "Unsaved summary");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Unable to save")).toBeVisible();
    expect(summary).toHaveValue("Unsaved summary");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(brief.summary)).toBeVisible();
  });
});
