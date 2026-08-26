import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DraftSectionAssistantStatus,
  DraftSectionGenerationSurface,
} from "./section-draft-generation";

const blocks = [
  { type: "paragraph" as const, text: "A readable proposal." },
  { type: "subheading" as const, text: "A useful lesson" },
  { type: "numbered_list" as const, items: ["First step"] },
];
const originalMatchMedia = window.matchMedia;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: originalMatchMedia,
  });
});

describe("DraftSectionGenerationSurface", () => {
  it("shows a hopeful article-shaped loading state", () => {
    render(
      <DraftSectionGenerationSurface
        applyError={null}
        blocks={null}
        generationError={null}
        onApply={vi.fn()}
        onDiscard={vi.fn()}
        onRegenerate={vi.fn()}
        onRetry={vi.fn()}
        phase="generating"
        sectionTitle="Introduction"
      />,
    );

    expect(
      screen.getByRole("status", { name: "Drafting Introduction" }),
    ).toHaveTextContent("Finding the clearest opening");
    expect(
      screen.queryByRole("button", { name: "Use this draft" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the first hopeful message when reduced motion is requested", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    render(
      <DraftSectionGenerationSurface
        applyError={null}
        blocks={null}
        generationError={null}
        onApply={vi.fn()}
        onDiscard={vi.fn()}
        onRegenerate={vi.fn()}
        onRetry={vi.fn()}
        phase="generating"
        sectionTitle="Introduction"
      />,
    );

    vi.advanceTimersByTime(10_000);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Finding the clearest opening",
    );
  });

  it("renders a semantic inline proposal and wires canvas actions", async () => {
    const onApply = vi.fn();
    const onRegenerate = vi.fn();
    const onDiscard = vi.fn();
    render(
      <DraftSectionGenerationSurface
        applyError={null}
        blocks={blocks}
        generationError={null}
        onApply={onApply}
        onDiscard={onDiscard}
        onRegenerate={onRegenerate}
        onRetry={vi.fn()}
        phase="ready"
        sectionTitle="Introduction"
      />,
    );

    const surface = screen.getByRole("region", {
      name: "AI draft for Introduction",
    });
    expect(within(surface).getByText("A readable proposal.")).toBeVisible();
    expect(
      within(surface).getByRole("heading", { name: "A useful lesson" }),
    ).toBeVisible();
    await userEvent.click(
      within(surface).getByRole("button", { name: "Use this draft" }),
    );
    await userEvent.click(
      within(surface).getByRole("button", { name: "Regenerate" }),
    );
    await userEvent.click(
      within(surface).getByRole("button", { name: "Discard" }),
    );
    expect(onApply).toHaveBeenCalledOnce();
    expect(onRegenerate).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("preserves the proposal while regenerating and disables actions", () => {
    render(
      <DraftSectionGenerationSurface
        applyError={null}
        blocks={blocks}
        generationError={null}
        onApply={vi.fn()}
        onDiscard={vi.fn()}
        onRegenerate={vi.fn()}
        onRetry={vi.fn()}
        phase="generating"
        sectionTitle="Introduction"
      />,
    );

    expect(screen.getByText("A readable proposal.")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reworking this draft",
    );
    expect(
      screen.getByRole("button", { name: "Use this draft" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeDisabled();
  });

  it("keeps save errors beside an actionable proposal", () => {
    render(
      <DraftSectionGenerationSurface
        applyError="Save unavailable."
        blocks={blocks}
        generationError={null}
        onApply={vi.fn()}
        onDiscard={vi.fn()}
        onRegenerate={vi.fn()}
        onRetry={vi.fn()}
        phase="ready"
        sectionTitle="Introduction"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Save unavailable");
    expect(
      screen.getByRole("button", { name: "Use this draft" }),
    ).toBeEnabled();
  });
});

describe("DraftSectionAssistantStatus", () => {
  it("keeps direction and status in the assistant without proposal actions", () => {
    render(
      <DraftSectionAssistantStatus
        context={<div>Section 1</div>}
        direction="Keep it practical"
        goal={<div>Section goal</div>}
        hasProposal
        onDirectionChange={vi.fn()}
        phase="ready"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "review it in the article",
    );
    expect(
      screen.getByRole("textbox", { name: "Direction for regeneration" }),
    ).toHaveValue("Keep it practical");
    expect(
      screen.queryByRole("button", { name: "Use this draft" }),
    ).not.toBeInTheDocument();
  });
});
