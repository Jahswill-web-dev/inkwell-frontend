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

const { pushMock, createMock, createClientMock, listClientsMock } = vi.hoisted(
  () => ({
    pushMock: vi.fn(),
    createMock: vi.fn(),
    createClientMock: vi.fn(),
    listClientsMock: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  createArticle: createMock,
  createClient: createClientMock,
  listClients: listClientsMock,
}));

const client = {
  id: "8d9dd792-78d8-4c9a-84bb-67d84c78b62a",
  workspace_id: "675bd099-ae1f-4246-b91e-a49b8077f65c",
  name: "Northstar Labs",
  website: null,
  industry: null,
  brand_profile: null,
  created_at: "2026-09-10T12:00:00Z",
  updated_at: "2026-09-10T12:00:00Z",
};

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
  fireEvent.change(screen.getByLabelText(/New client name/), {
    target: { value: "Northstar Labs" },
  });
  fireEvent.change(screen.getByLabelText(/Working title or topic/), {
    target: { value: "Expert-led content" },
  });
  fireEvent.change(screen.getByLabelText(/Target audience/), {
    target: { value: "B2B content leaders" },
  });
  fireEvent.change(screen.getByLabelText(/Due date/), {
    target: { value: "2026-10-01" },
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
  createClientMock.mockResolvedValue(client);
  listClientsMock.mockResolvedValue([]);
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
    expect(screen.queryByText("Main angle is required.")).not.toBeInTheDocument();
  });

  it("creates a reusable client and persists the complete article setup", async () => {
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
    expect(createClientMock).toHaveBeenCalledWith({ name: "Northstar Labs" });
    expect(createMock.mock.calls[0][0]).toMatchObject({
      client_id: client.id,
      working_title: "Expert-led content",
      target_audience: ["B2B content leaders"],
      article_goal: "inform_and_inspire",
      content_type: "blog_post",
      due_date: "2026-10-01",
      target_length: "standard",
      interview_method: "client",
      interviewee_name: "Avery Chen",
      main_angle: "Expert knowledge makes content credible.",
      key_message: "A focused interview creates stronger source material.",
    });
    expect(createMock.mock.calls[0][0].notes).toContain(
      "Client: Northstar Labs",
    );
    expect(sessionStorage.getItem(`inkwell:article-setup:${article.id}`)).toBeNull();
    expect(pushMock).toHaveBeenCalledWith(`/articles/${article.id}/interviews`);
  });

  it("loads and selects an existing workspace client", async () => {
    listClientsMock.mockResolvedValue([client]);
    render(<ArticleSetupWizard identity={DEFAULT_AUTH_IDENTITY} />);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Northstar Labs" })).toBeVisible(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/Client \*/), client.id);
    expect(screen.queryByLabelText(/New client name/)).not.toBeInTheDocument();
    expect(createClientMock).not.toHaveBeenCalled();
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
