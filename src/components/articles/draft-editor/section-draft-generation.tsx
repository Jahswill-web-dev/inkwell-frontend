"use client";

import {
  ArrowClockwise,
  CheckCircle,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import type { SectionContentBlock } from "@/lib/articles/interview";
import { SectionContentBlocks } from "./section-content-blocks";
import type {
  SectionDraftGenerationError,
  SectionDraftGenerationPhase,
} from "./use-section-draft-generation";
import styles from "./section-draft-generation.module.css";

const hopefulMessages = [
  "Finding the clearest opening…",
  "Shaping your ideas into a useful flow…",
  "Adding the details that make this section land…",
] as const;

function HopefulDraftLoader({ sectionTitle }: { sectionTitle: string }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () =>
        setMessageIndex((current) => (current + 1) % hopefulMessages.length),
      2400,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      aria-label={`Drafting ${sectionTitle}`}
      className={styles.loadingState}
      role="status"
    >
      <div className={styles.loadingMessage} aria-live="polite">
        <span className={styles.sparkle} aria-hidden>
          <Sparkle size={18} weight="fill" />
        </span>
        <span>{hopefulMessages[messageIndex]}</span>
      </div>
      <div className={styles.skeleton} aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function InlineError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.error} role="alert">
      <span>{error}</span>
      {onRetry ? (
        <button onClick={onRetry} type="button">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function DraftSectionGenerationSurface({
  sectionTitle,
  phase,
  blocks,
  generationError,
  applyError,
  onApply,
  onRegenerate,
  onDiscard,
  onRetry,
}: {
  sectionTitle: string;
  phase: SectionDraftGenerationPhase;
  blocks: readonly SectionContentBlock[] | null;
  generationError: SectionDraftGenerationError | null;
  applyError: string | null;
  onApply: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
  onRetry: () => void;
}) {
  const isGenerating = phase === "generating";
  const isApplying = phase === "applying";
  const isBusy = isGenerating || isApplying;

  if (!blocks) {
    return (
      <section
        aria-label={`AI draft for ${sectionTitle}`}
        className={styles.surface}
      >
        {isGenerating ? (
          <HopefulDraftLoader sectionTitle={sectionTitle} />
        ) : generationError ? (
          <>
            <InlineError
              error={generationError.message}
              onRetry={generationError.retryable ? onRetry : undefined}
            />
            <button
              className={styles.cancelButton}
              onClick={onDiscard}
              type="button"
            >
              Back to section
            </button>
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-label={`AI draft for ${sectionTitle}`}
      className={styles.surface}
    >
      <div className={styles.proposalHeader}>
        <span>
          <CheckCircle size={20} weight="fill" aria-hidden /> Draft preview
        </span>
        <small>Review before adding</small>
      </div>
      <div className={isGenerating ? styles.rewritingContent : undefined}>
        <SectionContentBlocks
          blocks={blocks}
          className={styles.proposalContent}
          subheadingAs="h3"
        />
      </div>
      {isGenerating ? (
        <div className={styles.rewritingStatus} role="status">
          <Sparkle size={17} weight="fill" aria-hidden />
          Reworking this draft with your latest direction…
        </div>
      ) : null}
      {generationError ? (
        <InlineError
          error={generationError.message}
          onRetry={generationError.retryable ? onRetry : undefined}
        />
      ) : null}
      {applyError ? <InlineError error={applyError} /> : null}
      <div className={styles.actions}>
        <button
          className={styles.applyButton}
          disabled={isBusy}
          onClick={onApply}
          type="button"
        >
          {isApplying ? "Saving draft…" : "Use this draft"}
        </button>
        <button disabled={isBusy} onClick={onRegenerate} type="button">
          <ArrowClockwise size={18} aria-hidden /> Regenerate
        </button>
        <button disabled={isBusy} onClick={onDiscard} type="button">
          <Trash size={18} aria-hidden /> Discard
        </button>
      </div>
    </section>
  );
}

export function DraftSectionAssistantStatus({
  phase,
  hasProposal,
  direction,
  onDirectionChange,
  context,
  goal,
}: {
  phase: SectionDraftGenerationPhase;
  hasProposal: boolean;
  direction: string;
  onDirectionChange: (value: string) => void;
  context: ReactNode;
  goal: ReactNode;
}) {
  const status =
    phase === "generating"
      ? hasProposal
        ? "Rewriting the section…"
        : "Drafting the section…"
      : phase === "applying"
        ? "Adding the draft to your section…"
        : phase === "error"
          ? "The draft needs attention in the article."
          : "Draft ready — review it in the article.";
  const isBusy = phase === "generating" || phase === "applying";

  return (
    <div className={styles.assistantStatus}>
      {context}
      <div className={styles.assistantStatusMessage} role="status">
        <Sparkle size={20} weight="fill" aria-hidden />
        <span>{status}</span>
      </div>
      {goal}
      <label className={styles.directionField}>
        <span>Direction for regeneration</span>
        <textarea
          disabled={isBusy}
          maxLength={1000}
          onChange={(event) => onDirectionChange(event.target.value)}
          placeholder="Make it more practical and conversational"
          value={direction}
        />
      </label>
      <p className={styles.assistantHint}>
        Review and manage this draft directly in the article.
      </p>
    </div>
  );
}
