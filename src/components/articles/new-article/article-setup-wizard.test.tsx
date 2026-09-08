import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AUTH_IDENTITY } from "@/lib/auth/identity";
import { ArticleSetupWizard } from "./article-setup-wizard";

const { pushMock, createMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  createArticle: createMock,
}));

const article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Structured setup",
  working_title: "Expert-led content",
  target_audience: ["B2B content leaders"],
  article_goal: "inform_and_inspire" as const,
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

async function completeFirstTwoSteps() {
  fireEvent.change(screen.getByLabelText(/Client \*/), {
    target: { value: "Northstar Labs" },
  });
  fireEvent.change(screen.getByLabelText(/Working title or topic/), {
    target: { value: "Expert-led content" },
  });
  fireEvent.change(screen.getByLabelText(/Target audience/), {
    target: { value: "B2B content leaders" },
  });
  await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
  fireEvent.change(screen.getByLabelText(/Main angle or hypothesis/), {
    target: { value: "Expert knowledge makes content credible." },
  });
  fireEvent.change(screen.getByLabelText(/Key message/), {
    target: { value: "A focused interview creates stronger source material." },
  });
  await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  createMock.mockResolvedValue(article);
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("ArticleSetupWizard", () => {
  it("shows only errors for the active step", async () => {
    render(<ArticleSetupWizard identity={DEFAULT_AUTH_IDENTITY} />);
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Client is required.")).toBeVisible();
    expect(
      screen.queryByText("Main angle is required."),
    ).not.toBeInTheDocument();
  });

  it("creates an article and preserves interview metadata for the next milestone", async () => {
    render(<ArticleSetupWizard identity={DEFAULT_AUTH_IDENTITY} />);
    await completeFirstTwoSteps();
    fireEvent.change(screen.getByLabelText(/Client or expert name/), {
      target: { value: "Avery Chen" },
    });
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Northstar Labs")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", {
        name: "Create article & prepare interview",
      }),
    );

    await waitFor(() => expect(createMock).toHaveBeenCalledOnce());
    expect(createMock.mock.calls[0][0]).toMatchObject({
      working_title: "Expert-led content",
      target_audience: ["B2B content leaders"],
      article_goal: "inform_and_inspire",
    });
    expect(createMock.mock.calls[0][0].notes).toContain(
      "Client: Northstar Labs",
    );
    expect(
      JSON.parse(
        sessionStorage.getItem(`inkwell:article-setup:${article.id}`) ?? "{}",
      ),
    ).toMatchObject({
      clientName: "Northstar Labs",
      interviewMethod: "client",
      intervieweeName: "Avery Chen",
    });
    expect(pushMock).toHaveBeenCalledWith(
      `/articles/${article.id}?next=client-interview`,
    );
  });

  it("requires source material when the writer skips interviews", async () => {
    render(<ArticleSetupWizard identity={DEFAULT_AUTH_IDENTITY} />);
    await completeFirstTwoSteps();
    await userEvent.click(
      screen.getByRole("radio", { name: /Use existing notes/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(
      await screen.findByText("Add the source notes you want Inkwell to use."),
    ).toBeVisible();
  });
});
