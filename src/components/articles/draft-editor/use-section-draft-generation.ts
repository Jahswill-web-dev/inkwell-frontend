"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArticleRequestError,
  generateDraftSection,
} from "@/lib/articles/client";
import type { SectionContentBlock } from "@/lib/articles/interview";

export type SectionDraftGenerationPhase =
  "idle" | "generating" | "ready" | "applying" | "error";

export type SectionDraftProposal = {
  sectionId: string;
  blocks: SectionContentBlock[];
};

export type SectionDraftGenerationError = {
  message: string;
  retryable: boolean;
  instruction: string;
};

type SectionDraftGenerationState = {
  targetSectionId: string | null;
  phase: SectionDraftGenerationPhase;
  proposal: SectionDraftProposal | null;
  generationError: SectionDraftGenerationError | null;
  applyError: string | null;
};

const initialState: SectionDraftGenerationState = {
  targetSectionId: null,
  phase: "idle",
  proposal: null,
  generationError: null,
  applyError: null,
};

export function useSectionDraftGeneration({
  articleId,
  sectionId,
  instruction,
  prepareGeneration,
  applyBlocks,
  onAuthenticationRequired,
  onGenerationVisible,
}: {
  articleId: string | null;
  sectionId: string | null;
  instruction: string;
  prepareGeneration: () => Promise<boolean>;
  applyBlocks: (blocks: readonly SectionContentBlock[]) => Promise<void>;
  onAuthenticationRequired: () => void;
  onGenerationVisible?: () => void;
}) {
  const [state, setState] = useState<SectionDraftGenerationState>(initialState);
  const requestRef = useRef(0);

  const reset = useCallback(() => {
    requestRef.current += 1;
    setState(initialState);
  }, []);

  useEffect(() => reset(), [reset, sectionId]);

  const generate = useCallback(
    async (instructionOverride?: string) => {
      if (
        !articleId ||
        !sectionId ||
        state.phase === "applying" ||
        state.phase === "generating"
      )
        return;
      const normalizedInstruction = (instructionOverride ?? instruction).trim();
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setState((current) => ({
        ...current,
        targetSectionId: sectionId,
        phase: "generating",
        generationError: null,
        applyError: null,
      }));
      onGenerationVisible?.();

      if (!(await prepareGeneration())) {
        if (requestRef.current === requestId)
          setState((current) => ({
            ...current,
            phase: "error",
            generationError: {
              message: "Save your latest changes before drafting this section.",
              retryable: true,
              instruction: normalizedInstruction,
            },
          }));
        return;
      }
      if (requestRef.current !== requestId) return;

      try {
        const result = await generateDraftSection(
          articleId,
          sectionId,
          normalizedInstruction ? { instruction: normalizedInstruction } : {},
        );
        if (requestRef.current !== requestId) return;
        if (result.section_id !== sectionId)
          throw new ArticleRequestError(
            502,
            "invalid_article_response",
            "The generated draft did not match this section.",
          );
        setState({
          targetSectionId: sectionId,
          phase: "ready",
          proposal: { sectionId: result.section_id, blocks: result.blocks },
          generationError: null,
          applyError: null,
        });
        onGenerationVisible?.();
      } catch (caught) {
        if (requestRef.current !== requestId) return;
        if (caught instanceof ArticleRequestError && caught.status === 401) {
          reset();
          onAuthenticationRequired();
          return;
        }
        setState((current) => ({
          ...current,
          phase: "error",
          generationError: {
            message:
              caught instanceof ArticleRequestError
                ? caught.message
                : "We couldn’t draft this section. Please try again.",
            retryable:
              !(caught instanceof ArticleRequestError) ||
              [502, 503, 504].includes(caught.status),
            instruction: normalizedInstruction,
          },
        }));
      }
    },
    [
      articleId,
      instruction,
      onAuthenticationRequired,
      onGenerationVisible,
      prepareGeneration,
      reset,
      sectionId,
      state.phase,
    ],
  );

  const retry = useCallback(() => {
    if (!state.generationError?.retryable) return;
    void generate(state.generationError.instruction);
  }, [generate, state.generationError]);

  const apply = useCallback(async () => {
    if (
      !state.proposal ||
      state.proposal.sectionId !== sectionId ||
      state.phase === "applying"
    )
      return;
    setState((current) => ({
      ...current,
      phase: "applying",
      applyError: null,
    }));
    try {
      await applyBlocks(state.proposal.blocks);
      setState(initialState);
    } catch (caught) {
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        reset();
        onAuthenticationRequired();
        return;
      }
      setState((current) => ({
        ...current,
        phase: "ready",
        applyError:
          caught instanceof ArticleRequestError
            ? caught.message
            : "We couldn’t save the generated draft. Please try again.",
      }));
    }
  }, [
    applyBlocks,
    onAuthenticationRequired,
    reset,
    sectionId,
    state.phase,
    state.proposal,
  ]);

  return {
    ...state,
    apply,
    discard: reset,
    generate,
    retry,
    isVisible:
      state.targetSectionId === sectionId &&
      (state.phase !== "idle" || state.proposal !== null),
  };
}
