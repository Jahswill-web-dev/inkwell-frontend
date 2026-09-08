import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardHome } from "./dashboard-home";

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  listArticles: listMock,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const articles = [
  {
    id: "be5579e3-24fd-4272-a35f-f74740c3887e",
    user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
    notes: "Notes one",
    working_title: "The Case for Slower Thinking",
    target_audience: ["Writers"],
    article_goal: "inform_and_inspire",
    created_at: "2026-08-12T12:00:00Z",
    updated_at: "2026-08-12T12:00:00Z",
  },
  {
    id: "36dc2b27-f474-4d43-b8cc-c122ef782cd6",
    user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
    notes: "Notes two",
    working_title: "Designing a Life of Meaning",
    target_audience: ["Creators"],
    article_goal: "entertain_with_a_compelling_story",
    created_at: "2026-08-11T12:00:00Z",
    updated_at: "2026-08-11T12:00:00Z",
  },
] as const;

beforeEach(() => {
  listMock.mockReset().mockResolvedValue({
    items: articles,
    total: 2,
    offset: 0,
    limit: 20,
  });
});
afterEach(cleanup);

describe("DashboardHome", () => {
  it("loads articles into the agency workspace", async () => {
    render(<DashboardHome />);

    expect(screen.getByText("Loading your articles…")).toBeVisible();
    expect(
      (await screen.findAllByText("The Case for Slower Thinking"))[0],
    ).toBeVisible();
    expect(screen.getAllByText("Northstar Labs")[0]).toBeVisible();
    const summary = screen.getByLabelText("Workspace summary");
    expect(within(summary).getByText("Active articles")).toBeVisible();
    expect(within(summary).getAllByText("2")[0]).toBeVisible();
    expect(listMock).toHaveBeenCalledWith(0, 20);
  });

  it("opens each article at its existing brief route", async () => {
    render(<DashboardHome />);
    const workspace = screen.getByLabelText("Article workspace");

    for (const article of articles) {
      const titles = await within(workspace).findAllByText(
        article.working_title,
      );
      expect(titles).toHaveLength(2);
      for (const title of titles) {
        expect(title.closest("a")).toHaveAttribute(
          "href",
          `/articles/${encodeURIComponent(article.id)}`,
        );
      }
    }
  });

  it("searches by title and client name", async () => {
    render(<DashboardHome />);
    await screen.findAllByText("The Case for Slower Thinking");
    const workspace = screen.getByLabelText("Article workspace");

    await userEvent.type(screen.getAllByRole("searchbox")[0], "Field Notes");

    expect(
      within(workspace).getAllByText("Designing a Life of Meaning")[0],
    ).toBeVisible();
    expect(
      within(workspace).queryByText("The Case for Slower Thinking"),
    ).not.toBeInTheDocument();
  });

  it("combines client and status filters and can clear them", async () => {
    render(<DashboardHome />);
    await screen.findAllByText("The Case for Slower Thinking");
    const workspace = screen.getByLabelText("Article workspace");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Client" }),
      "Northstar Labs",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Status" }),
      "waiting_for_client",
    );

    expect(
      within(workspace).getAllByText("The Case for Slower Thinking")[0],
    ).toBeVisible();
    expect(
      within(workspace).queryByText("Designing a Life of Meaning"),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(
      (await within(workspace).findAllByText("Designing a Life of Meaning"))[0],
    ).toBeVisible();
  });

  it("shows and resets a no-results state", async () => {
    render(<DashboardHome />);
    await screen.findAllByText("The Case for Slower Thinking");

    await userEvent.type(screen.getAllByRole("searchbox")[0], "No match");
    expect(
      screen.getByRole("heading", { name: "No articles match these filters" }),
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "Clear filters" }),
    );
    expect(
      (await screen.findAllByText("The Case for Slower Thinking"))[0],
    ).toBeVisible();
  });

  it("renders an empty state", async () => {
    listMock.mockResolvedValue({
      items: [],
      total: 0,
      offset: 0,
      limit: 20,
    });
    render(<DashboardHome />);

    expect(
      await screen.findByRole("heading", { name: "No client articles yet" }),
    ).toBeVisible();
  });

  it("retries an initial failure", async () => {
    listMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      items: articles,
      total: 2,
      offset: 0,
      limit: 20,
    });
    render(<DashboardHome />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Try again" }),
    );
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    expect(
      (await screen.findAllByText("The Case for Slower Thinking"))[0],
    ).toBeVisible();
  });
});
