import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraftEditor } from "./draft-editor";
import { DRAFT_STORAGE_KEY } from "./draft-editor-data";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockClear();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("DraftEditor", () => {
  it("renders the reference article and writing tools", async () => {
    render(<DraftEditor />);

    expect(
      (await screen.findAllByText("Why Great Ideas Are Hard to Write Down"))[0],
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", { name: "Writing assistant" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("textbox", { name: /draft content/ }),
    ).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "Preview" })[0]).toBeVisible();
  });

  it("uses a compact outline rail and an accessible overlay drawer", async () => {
    render(<DraftEditor />);
    await screen.findByRole("complementary", { name: "Writing assistant" });

    const expandButton = screen.getByRole("button", {
      name: "Expand draft outline",
    });
    const introductionMarker = screen.getByRole("button", {
      name: "Go to Introduction",
    });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(introductionMarker).toHaveAttribute("aria-current", "location");

    await userEvent.click(
      screen.getByRole("button", { name: "Go to Conclusion" }),
    );
    expect(
      screen.getByRole("button", { name: "Go to Conclusion" }),
    ).toHaveAttribute("aria-current", "location");

    await userEvent.click(expandButton);
    const drawer = screen.getByRole("complementary", {
      name: "Outline details",
    });
    const closeButton = screen.getByRole("button", {
      name: "Collapse draft outline",
    });
    expect(drawer).toBeVisible();
    expect(drawer).toHaveAttribute("aria-hidden", "false");
    await waitFor(() => expect(closeButton).toHaveFocus());

    await userEvent.click(
      within(drawer).getByRole("button", {
        name: "1. The messy nature of great ideas",
      }),
    );
    expect(drawer).toHaveAttribute("aria-hidden", "false");

    await userEvent.keyboard("{Escape}");
    expect(drawer).toHaveAttribute("aria-hidden", "true");
    expect(drawer).toHaveAttribute("inert");
    await waitFor(() => expect(expandButton).toHaveFocus());
  });

  it("keeps outline add and reorder controls in the expanded drawer", async () => {
    render(<DraftEditor />);
    await screen.findByRole("complementary", { name: "Writing assistant" });
    await userEvent.click(
      screen.getByRole("button", { name: "Expand draft outline" }),
    );

    const drawer = screen.getByRole("complementary", {
      name: "Outline details",
    });
    await userEvent.click(
      within(drawer).getByRole("button", {
        name: "Move The messy nature of great ideas up",
      }),
    );
    expect(within(drawer).getAllByRole("listitem")[0]).toHaveTextContent(
      "The messy nature of great ideas",
    );

    await userEvent.click(
      within(drawer).getByRole("button", { name: "Add section" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Add a section" });
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Section title" }),
      "Practical next steps",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Add section" }),
    );

    expect(
      within(drawer).getByRole("button", {
        name: "5. Practical next steps",
      }),
    ).toBeVisible();
    expect(drawer).toHaveAttribute("aria-hidden", "false");
  });

  it("creates and retries deterministic assistant suggestions", async () => {
    render(<DraftEditor />);

    await screen.findByRole("complementary", { name: "Writing assistant" });

    await userEvent.click(
      screen.getAllByRole("button", { name: /Make clearer/ })[0],
    );
    expect(screen.getAllByText("Suggested revision")[0]).toBeVisible();
    const firstSuggestion = screen.getAllByText(
      /Great ideas are hard to capture/,
    )[0];
    expect(firstSuggestion).toBeVisible();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Try again" })[0],
    );
    expect(screen.getAllByText(/Ideas often resist words/)[0]).toBeVisible();
    await userEvent.click(screen.getAllByRole("button", { name: "Reject" })[0]);
    expect(screen.queryByText("Suggested revision")).not.toBeInTheDocument();
  });

  it("opens preview and marks the draft ready for review", async () => {
    render(<DraftEditor />);

    await screen.findByRole("complementary", { name: "Writing assistant" });

    await userEvent.click(
      screen.getAllByRole("button", { name: "Preview" })[0],
    );
    expect(
      screen.getByRole("dialog", { name: "Article preview" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /Back to editor/ }),
    );

    await userEvent.click(
      screen.getAllByRole("button", { name: "Review article" })[0],
    );
    expect(screen.getAllByRole("status")[1]).toHaveTextContent(
      "Draft saved and ready for review.",
    );
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeTruthy();
    expect(pushMock).toHaveBeenCalledWith("/articles/new/review");
  });

  it("persists checklist changes through autosave", async () => {
    render(<DraftEditor />);
    await screen.findByRole("complementary", { name: "Writing assistant" });
    const checkbox = screen.getAllByRole("checkbox", {
      name: /Add a personal example/,
    })[0];
    await userEvent.click(checkbox);

    await waitFor(
      () =>
        expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeTruthy(),
      { timeout: 1800 },
    );
    expect(checkbox).toBeChecked();
  });
});
