import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Article } from "@/lib/consultant/client";
import { ConsultantArticleScreen } from "./consultant-article";

const { api, router } = vi.hoisted(() => ({
  api: vi.fn(),
  router: { push: vi.fn() },
}));
vi.mock("@/lib/consultant/client", () => ({ consultantRequest: api }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/articles/draft-editor/draft-rich-section", () => ({
  DraftRichSection: () => <div>Article editor</div>,
}));

let article: Article;
beforeEach(() => {
  api.mockReset();
  article = {
    id: "article",
    title: "Why better tools won’t fix broken handoffs",
    description: "A consultant’s perspective on handoffs.",
    status: "generating",
    interviews: [{ id: "interview", state: "completed" }],
    job: {
      id: "job",
      state: "running",
      stage: "write",
      error: null,
      attempts: 1,
      request_kind: "generation",
    },
    sections: [],
    revisions: [],
    findings: [],
    open_finding_count: 0,
    draft_updated_at: null,
  };
  api.mockImplementation(async () => structuredClone(article));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("shows the selected generation screen and keeps the article tools out of the initial waiting flow", async () => {
  render(<ConsultantArticleScreen articleId="article" />);
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Your ideas are becoming an article.",
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Back to my articles" }),
  ).toHaveAttribute("href", "/consultant");
  expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
    "Writing your draft",
  );
  expect(
    screen.queryByRole("button", { name: "Article details" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/Your interview is saved. You can leave/),
  ).toBeVisible();
});

it("polls through saving and opens the article editor automatically after completion", async () => {
  vi.useFakeTimers();
  await act(async () => {
    render(<ConsultantArticleScreen articleId="article" />);
  });
  screen.getByRole("heading", {
    level: 1,
    name: "Your ideas are becoming an article.",
  });
  article.job!.stage = "saving";
  await act(async () => {
    vi.advanceTimersByTime(2500);
  });
  expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
    "Saving your article",
  );
  article.job!.state = "succeeded";
  article.job!.stage = "complete";
  article.sections = [
    {
      id: "section",
      title: "A better handoff",
      goal: "",
      checklist: [],
      outline_section_id: null,
      editor_state: JSON.stringify({ root: { children: [] } }),
    },
  ];
  article.draft_updated_at = "2026-11-26T12:00:00Z";
  await act(async () => {
    vi.advanceTimersByTime(2500);
  });
  expect(screen.getByText("Article editor")).toBeVisible();
  expect(
    screen.queryByText("Your ideas are becoming an article."),
  ).not.toBeInTheDocument();
  const calls = api.mock.calls.length;
  await act(async () => {
    vi.advanceTimersByTime(10_000);
  });
  expect(api).toHaveBeenCalledTimes(calls);
});

it.each([0, 1])(
  "shows an honest queued state for attempt %i",
  async (attempts) => {
    article.job = { ...article.job!, state: "queued", attempts };
    render(<ConsultantArticleScreen articleId="article" />);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: attempts
          ? "Your draft will retry shortly."
          : "Your draft is waiting to begin.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("listitem", { current: "step" }),
    ).not.toBeInTheDocument();
  },
);

it("retries the existing failed job and returns to progress without recreating the article", async () => {
  article.job = {
    ...article.job!,
    state: "failed",
    error: "The service was temporarily unavailable.",
  };
  api.mockImplementation(async (_path: string, method?: string) => {
    if (method === "POST") article.job = { ...article.job!, state: "queued" };
    return structuredClone(article);
  });
  render(<ConsultantArticleScreen articleId="article" />);
  const retry = await screen.findByRole("button", { name: "Retry generation" });
  fireEvent.click(retry);
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("jobs/job/retry", "POST"),
  );
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Your draft will retry shortly.",
    }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Retry generation" }),
  ).not.toBeInTheDocument();
});

it("offers progress recovery after a failed poll", async () => {
  vi.useFakeTimers();
  await act(async () => {
    render(<ConsultantArticleScreen articleId="article" />);
  });
  screen.getByRole("heading", {
    level: 1,
    name: "Your ideas are becoming an article.",
  });
  api.mockRejectedValueOnce(new Error("offline"));
  await act(async () => {
    vi.advanceTimersByTime(2500);
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "We couldn’t refresh your progress.",
  );
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Refresh progress" })),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("retains an existing article while a subsequent generation runs", async () => {
  article.sections = [
    {
      id: "section",
      title: "Existing draft",
      goal: "",
      checklist: [],
      outline_section_id: null,
      editor_state: JSON.stringify({ root: { children: [] } }),
    },
  ];
  render(<ConsultantArticleScreen articleId="article" />);
  expect(await screen.findByText("Article editor")).toBeVisible();
  expect(
    screen.queryByText("Your ideas are becoming an article."),
  ).not.toBeInTheDocument();
});

it("keeps Ask AI requests in their existing flow", async () => {
  article.job = { ...article.job!, request_kind: "ask_ai", stage: "plan" };
  render(<ConsultantArticleScreen articleId="article" />);
  expect(
    await screen.findByRole("heading", { level: 1, name: article.title }),
  ).toBeVisible();
  expect(
    screen.queryByText("Your ideas are becoming an article."),
  ).not.toBeInTheDocument();
});
