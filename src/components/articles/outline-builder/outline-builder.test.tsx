import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OutlineBuilder, type ArticleOutlineState } from "./outline-builder";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

beforeEach(() => pushMock.mockClear());

describe("OutlineBuilder", () => {
  it("renders the seeded outline and marks Outline as the current step", () => {
    render(<OutlineBuilder />);

    expect(
      screen.getByRole("heading", {
        name: "Build your article’s structure",
      }),
    ).toBeVisible();
    expect(screen.getByText("5 sections")).toBeVisible();
    expect(screen.getByText("~1,060 words")).toBeVisible();
    expect(
      screen
        .getByRole("navigation", { name: "Article progress" })
        .querySelector('[aria-current="step"]'),
    ).toHaveTextContent("Outline");
  });

  it("hydrates article metadata from the saved brief", async () => {
    window.sessionStorage.setItem(
      "inkwell:article-brief",
      JSON.stringify({
        workingTitle: "A Better Creative Practice",
        targetAudience: "Independent designers",
      }),
    );

    render(<OutlineBuilder />);

    await waitFor(() =>
      expect(screen.getByText("A Better Creative Practice")).toBeVisible(),
    );
    expect(screen.getByText("Independent designers")).toBeVisible();
  });

  it("edits notes, reorders sections, and persists the outline", async () => {
    render(<OutlineBuilder />);

    const notes = screen.getByRole("textbox", {
      name: /Notes/i,
    });
    await userEvent.type(notes, "Open with a concrete example.");
    await userEvent.click(
      screen.getByRole("button", {
        name: "More actions for The messy nature of great ideas",
      }),
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Move up" }));

    const sectionHeadings = Array.from(
      screen.getByLabelText("Outline sections").querySelectorAll("h2"),
    );
    expect(sectionHeadings[0]).toHaveTextContent(
      "The messy nature of great ideas",
    );

    await userEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);
    const saved = JSON.parse(
      window.sessionStorage.getItem("inkwell:article-outline") ?? "{}",
    ) as ArticleOutlineState;
    expect(saved.sections[0].id).toBe("messy-nature");
    expect(
      saved.sections.find((section) => section.id === "introduction")?.notes,
    ).toBe("Open with a concrete example.");
    expect(screen.getByRole("status")).toHaveTextContent("Outline saved.");
  });

  it("persists the outline and opens the draft editor", async () => {
    render(<OutlineBuilder />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Start drafting" })[0],
    );

    expect(
      window.sessionStorage.getItem("inkwell:article-outline"),
    ).toBeTruthy();
    expect(pushMock).toHaveBeenCalledWith("/articles/new/draft");
  });

  it("expands sections, regenerates content, and opens mobile health details", async () => {
    render(<OutlineBuilder />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "Expand The messy nature of great ideas",
      }),
    );
    expect(
      screen.getByText(/Show why worthwhile ideas often begin/),
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Regenerate The messy nature of great ideas",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Explore the fragments/)).toBeVisible(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Outline health" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Outline health details",
    });
    expect(dialog).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Close outline health" }),
    ).toHaveFocus();
  });
});
