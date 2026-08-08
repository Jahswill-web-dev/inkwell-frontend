import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewArticleForm } from "./new-article-form";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

beforeEach(() => pushMock.mockClear());

describe("NewArticleForm", () => {
  it("offers only idea and notes starting methods", () => {
    render(<NewArticleForm />);

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(
      screen.getByRole("tab", { name: /Start with an idea/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.queryByRole("tab", { name: /Template/ }),
    ).not.toBeInTheDocument();
  });

  it("can open in notes mode and counts pasted words", async () => {
    render(<NewArticleForm initialMode="notes" />);

    const notes = screen.getByRole("textbox", { name: "Your notes" });
    await userEvent.type(notes, "One useful rough note");

    expect(screen.getByText("4 words")).toBeVisible();
    expect(
      screen.getByRole("tab", { name: /Paste your notes/ }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("preserves source content when switching modes", async () => {
    render(<NewArticleForm />);

    await userEvent.type(
      screen.getByRole("textbox", { name: "Your article idea" }),
      "An idea worth keeping",
    );
    await userEvent.click(
      screen.getByRole("tab", { name: /Paste your notes/ }),
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Your notes" }),
      "Notes that should also remain",
    );
    await userEvent.click(
      screen.getByRole("tab", { name: /Start with an idea/ }),
    );

    expect(
      screen.getByRole("textbox", { name: "Your article idea" }),
    ).toHaveValue("An idea worth keeping");
  });

  it("validates the active source before building a brief", async () => {
    render(<NewArticleForm />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Build my article brief" })[0],
    );
    expect(
      screen.getByRole("textbox", { name: "Your article idea" }),
    ).toHaveFocus();
    expect(screen.getByText(/Add at least 20 characters/)).toBeVisible();

    await userEvent.type(
      screen.getByRole("textbox", { name: "Your article idea" }),
      "A sufficiently detailed article idea",
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "Build my article brief" })[0],
    );
    expect(pushMock).toHaveBeenCalledWith("/articles/new/brief");
    expect(
      JSON.parse(window.sessionStorage.getItem("inkwell:new-article") ?? "{}"),
    ).toMatchObject({
      mode: "idea",
      idea: "A sufficiently detailed article idea",
    });
  });

  it("passes notes and shared metadata into the guided brief", async () => {
    render(<NewArticleForm initialMode="notes" />);

    await userEvent.type(
      screen.getByRole("textbox", { name: "Your notes" }),
      "Detailed notes to turn into an article brief.",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: /Working title/ }),
      "A useful working title",
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "Build my article brief" })[0],
    );

    expect(
      JSON.parse(window.sessionStorage.getItem("inkwell:new-article") ?? "{}"),
    ).toMatchObject({
      mode: "notes",
      notes: "Detailed notes to turn into an article brief.",
      workingTitle: "A useful working title",
    });
    expect(pushMock).toHaveBeenCalledWith("/articles/new/brief");
  });

  it("keeps the save action on the current screen", async () => {
    render(<NewArticleForm />);

    await userEvent.click(
      screen.getByRole("button", { name: "Save as draft" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Draft saved.");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
