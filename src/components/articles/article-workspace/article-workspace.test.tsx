import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleRequestError } from "@/lib/articles/client";
import { createInterviewInvitation } from "@/lib/articles/client-interview-invitation";
import { DEFAULT_AUTH_IDENTITY } from "@/lib/auth/identity";
import { ArticleWorkspace } from "./article-workspace";

const { articleMock, briefMock, deleteMock, draftMock, outlineMock } = vi.hoisted(() => ({
  articleMock: vi.fn(),
  briefMock: vi.fn(),
  deleteMock: vi.fn(),
  outlineMock: vi.fn(),
  draftMock: vi.fn(),
}));
const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));
const {
  getInvitationMock,
  getTranscriptMock,
  createInvitationMock,
  revokeInvitationMock,
} =
  vi.hoisted(() => ({
    getInvitationMock: vi.fn(),
    getTranscriptMock: vi.fn(),
    createInvitationMock: vi.fn(),
    revokeInvitationMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  getArticle: articleMock,
  getArticleBrief: briefMock,
  deleteArticle: deleteMock,
  getArticleOutline: outlineMock,
  getArticleDraft: draftMock,
}));

vi.mock("@/lib/articles/client-interview-api", () => ({
  getInterviewInvitation: getInvitationMock,
  getInterviewTranscript: getTranscriptMock,
  createInterviewInvitationRequest: createInvitationMock,
  revokeInterviewInvitationRequest: revokeInvitationMock,
}));

const article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Useful client context",
  working_title: "Expert-led content",
  target_audience: ["Content leaders"],
  article_goal: "inform_and_inspire" as const,
  workspace_id: "27d377b3-5f98-4a6d-b0d2-89bb8ae03ae7",
  client_id: "1ca4ce18-a546-4c06-bfe6-a0dcd2234430",
  client: {
    id: "1ca4ce18-a546-4c06-bfe6-a0dcd2234430",
    name: "Northstar Labs",
  },
  assignee_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  assignee: {
    id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
    username: "writer_01",
  },
  status: "setup" as const,
  content_type: "thought_leadership" as const,
  due_date: null,
  target_length: "standard" as const,
  interview_method: "client" as const,
  interviewee_name: "Avery Chen",
  interview_instructions: "Ask for examples",
  main_angle: "A clear angle",
  key_message: "A useful message",
  call_to_action: "",
  tone: "Clear and credible",
  seo_keyword: "",
  draft_readiness: false,
  published_at: null,
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

const missing = () =>
  Promise.reject(new ArticleRequestError(404, "not_found", "Not found"));

function invitationFor(input: Parameters<typeof createInterviewInvitation>[1]) {
  return {
    ...createInterviewInvitation(article.id, input, {
      articleTitle: article.working_title,
      clientName: article.client.name,
      writerName: article.assignee.username,
    }),
    id: "8fbc56aa-9fcd-4b28-9c44-a6904dbbd748",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  articleMock.mockResolvedValue(article);
  briefMock.mockImplementation(missing);
  outlineMock.mockImplementation(missing);
  draftMock.mockImplementation(missing);
  getInvitationMock.mockResolvedValue(null);
  getTranscriptMock.mockResolvedValue(null);
  createInvitationMock.mockImplementation(async (_articleId, input) =>
    invitationFor(input),
  );
  revokeInvitationMock.mockImplementation(async () => ({
    ...invitationFor({
      participantName: "Avery Chen",
      participantEmail: "avery@client.com",
      expiresOn: "",
    }),
    status: "revoked" as const,
  }));
  deleteMock.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

describe("ArticleWorkspace", () => {
  it("loads the article, setup metadata, and recommended next action", async () => {
    render(
      <ArticleWorkspace
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Loading article workspace/ }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "Expert-led content" }),
    ).toBeVisible();
    expect(screen.getAllByText("Northstar Labs").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Create the client interview link" }),
    ).toBeVisible();
    expect(screen.getByText("Avery Chen")).toBeVisible();
    expect(screen.getByRole("link", { name: /Edit setup/ })).toHaveAttribute(
      "href",
      `/articles/${article.id}/edit`,
    );
    expect(screen.getByRole("link", { name: "Interview me" })).toHaveAttribute(
      "href",
      `/articles/${article.id}/writer-interview`,
    );
  });

  it("does not probe legacy pipeline resources", async () => {
    render(
      <ArticleWorkspace
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );
    await screen.findByRole("heading", { name: article.working_title });
    expect(briefMock).not.toHaveBeenCalled();
    expect(outlineMock).not.toHaveBeenCalled();
    expect(draftMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "Brief" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Outline" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Publish" })).not.toBeInTheDocument();
  });

  it("confirms workspace deletion before returning to the dashboard", async () => {
    render(
      <ArticleWorkspace
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );
    await screen.findByRole("heading", { name: article.working_title });

    await userEvent.click(screen.getByRole("button", { name: "Delete article" }));
    const dialog = screen.getByRole("dialog", { name: "Delete this article?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(deleteMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete article" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete article",
      }),
    );
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(article.id));
    expect(pushMock).toHaveBeenCalledWith("/dashboard?section=articles");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("creates, copies, previews, revokes, and regenerates a client link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(
      <ArticleWorkspace
        activeTab="interviews"
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Create a private interview link",
      }),
    ).toBeVisible();
    await userEvent.type(
      screen.getByLabelText("Participant email"),
      "avery@client.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Create interview link" }),
    );

    const link = screen.getByLabelText("Client interview link");
    expect((link as HTMLInputElement).value).toContain("/interview/");
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/interview/"),
    );
    expect(screen.getByText("Link copied")).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "Preview experience" }),
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Close interview preview" }),
    );

    const firstLink = (link as HTMLInputElement).value;
    await userEvent.click(screen.getByRole("button", { name: "Revoke link" }));
    expect(screen.getByText("Revoked")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate link" }),
    );
    expect(screen.getByLabelText("Client interview link")).not.toHaveValue(
      firstLink,
    );
  });

  it("shows summarized in-progress state from persisted invitation data", async () => {
    getInvitationMock.mockResolvedValue({
      ...invitationFor({
        participantName: "Avery Chen",
        participantEmail: "avery@client.com",
        expiresOn: "",
      }),
      progressState: "in_progress",
      questionsAnswered: 3,
      estimatedQuestions: 8,
      openedAt: "2026-09-08T12:03:00.000Z",
    });
    render(
      <ArticleWorkspace
        activeTab="interviews"
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );
    expect(await screen.findByText("In progress")).toBeVisible();
    expect(screen.getByLabelText("38% complete")).toBeVisible();
    expect(screen.getByText(/3 questions answered/)).toBeVisible();
    expect(screen.queryByText(/answer content/i)).not.toBeInTheDocument();
  });

  it("keeps transient failures retryable", async () => {
    articleMock.mockRejectedValueOnce(
      new ArticleRequestError(503, "unavailable", "Unavailable"),
    );
    render(
      <ArticleWorkspace
        articleId={article.id}
        identity={DEFAULT_AUTH_IDENTITY}
      />,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Try again" }),
    );
    await waitFor(() => expect(articleMock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("heading", { name: "Expert-led content" }),
    ).toBeVisible();
  });
});
