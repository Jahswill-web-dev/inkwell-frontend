import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardHome } from "./dashboard-home";

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  listArticles: listMock,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const articles = [
  { id: "be5579e3-24fd-4272-a35f-f74740c3887e", user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31", notes: "Notes one", working_title: "The Case for Slower Thinking", target_audience: "Writers", article_goal: "inform_and_inspire", created_at: "2026-08-12T12:00:00Z", updated_at: "2026-08-12T12:00:00Z" },
  { id: "36dc2b27-f474-4d43-b8cc-c122ef782cd6", user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31", notes: "Notes two", working_title: "Designing a Life of Meaning", target_audience: "Creators", article_goal: "entertain_with_a_compelling_story", created_at: "2026-08-11T12:00:00Z", updated_at: "2026-08-11T12:00:00Z" },
] as const;

beforeEach(() => { listMock.mockReset().mockResolvedValue({ items: articles, total: 2, offset: 0, limit: 20 }); });
afterEach(cleanup);

describe("DashboardHome", () => {
  it("loads persisted article metadata", async () => {
    render(<DashboardHome />);
    expect(screen.getByText("Loading your articles…")).toBeVisible();
    expect((await screen.findAllByText("The Case for Slower Thinking"))[0]).toBeVisible();
    expect(screen.getAllByText("Inform and inspire")[0]).toBeVisible();
    expect(listMock).toHaveBeenCalledWith(0, 20);
  });

  it("filters loaded articles by title", async () => {
    render(<DashboardHome />);
    await screen.findAllByText("The Case for Slower Thinking");
    await userEvent.type(screen.getByRole("searchbox"), "Slower");
    expect(screen.getAllByText("The Case for Slower Thinking")[0]).toBeVisible();
    expect(screen.queryByText("Designing a Life of Meaning")).not.toBeInTheDocument();
  });

  it("renders an empty state", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, offset: 0, limit: 20 });
    render(<DashboardHome />);
    expect(await screen.findByRole("heading", { name: "No articles yet" })).toBeVisible();
  });

  it("retries an initial failure", async () => {
    listMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ items: articles, total: 2, offset: 0, limit: 20 });
    render(<DashboardHome />);
    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText("The Case for Slower Thinking"))[0]).toBeVisible();
  });
});
