import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewArticleForm } from "./new-article-form";

const { pushMock, refreshMock, createMock, updateMock, deleteMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    createMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/lib/articles/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles/client")>()),
  createArticle: createMock,
  updateArticle: updateMock,
  deleteArticle: deleteMock,
}));

const article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "Research notes and an early idea",
  working_title: "Original title",
  target_audience: ["Independent", "writers"],
  article_goal: "educate_with_practical_guidance" as const,
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  createMock.mockResolvedValue(article);
  updateMock.mockResolvedValue({ ...article, working_title: "Revised title" });
  deleteMock.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("NewArticleForm", () => {
  it("uses the agency setup wizard for new articles", () => {
    render(<NewArticleForm />);
    expect(
      screen.getByRole("heading", { name: "Create a client article" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Article setup progress")).toBeVisible();
  });

  it("patches only changed fields and confirms deletion", async () => {
    render(<NewArticleForm article={article} />);
    const title = screen.getByRole("textbox", { name: /Working title/ });
    await userEvent.clear(title);
    await userEvent.type(title, "Revised title");
    await userEvent.click(
      screen.getByRole("button", { name: "Save as draft" }),
    );
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(article.id, {
        working_title: "Revised title",
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Delete article" }),
    );
    expect(deleteMock).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm delete" }),
    );
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(article.id));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });
});
