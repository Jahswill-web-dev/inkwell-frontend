"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  consultantRequest as api,
  ConsultantRequestError,
  type Interview,
  type VoiceQuestion,
  type VoiceQuestionState,
} from "@/lib/consultant/client";
import type {
  LiveTranscriptTurn,
  PlaybackObservation,
} from "@/components/interview/use-realtime-interview";

const words = (text: string) =>
  text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}_]+/gu)
    ?.join(" ") ?? "";

// Mirrors the backend's word comparison; never derives a new question from captions.
export function questionEvidence(
  question: VoiceQuestion,
  turns: LiveTranscriptTurn[],
) {
  const expected = words(question.text);
  if (!expected) return [];
  for (let end = turns.length; end > 0; end--) {
    const fragments: LiveTranscriptTurn[] = [];
    for (let index = end - 1; index >= 0 && fragments.length < 40; index--) {
      const turn = turns[index];
      if (
        turn.speaker !== "interviewer" ||
        turn.voiceSessionId !== question.voice_session_id
      )
        break;
      fragments.unshift(turn);
      if (
        ` ${words(fragments.map((part) => part.text).join(" "))} `.includes(
          ` ${expected} `,
        )
      )
        return fragments;
    }
  }
  return [];
}

export function useConsultantConversation(
  interviewId: string,
  interview: Interview | null,
  enabled: boolean,
) {
  const [questions, setQuestions] = useState<VoiceQuestionState>({
    current_question: null,
    pending_question: null,
  });
  const [turns, setTurns] = useState<LiveTranscriptTurn[]>([]);
  const [questionError, setQuestionError] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<VoiceQuestion | null>(
    null,
  );
  const questionsRef = useRef(questions);
  const turnsRef = useRef(new Map<string, LiveTranscriptTurn>());
  const sessionRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const interruptedRef = useRef(false);
  const heardRef = useRef(new Set<string>());
  const interruptedQuestionsRef = useRef(new Set<string>());
  const proofRef = useRef<{
    question: VoiceQuestion;
    ids: string[];
    status: "delivered" | "interrupted";
  } | null>(null);
  const deliveryRef = useRef<Promise<void> | null>(null);
  const getRef = useRef(false);
  const epochRef = useRef(0);
  const mountedRef = useRef(true);
  const initialRef = useRef<string | null>(null);
  const publishPreview = useCallback(() => {
    const pending = questionsRef.current.pending_question;
    const visible =
      pending &&
      pending.voice_session_id === sessionRef.current &&
      questionEvidence(pending, [...turnsRef.current.values()]).length > 0 &&
      (playingRef.current || heardRef.current.has(pending.id)) &&
      !interruptedQuestionsRef.current.has(pending.id);
    if (mountedRef.current) setPreviewQuestion(visible ? pending : null);
  }, []);

  const applyQuestions = useCallback(
    (state: VoiceQuestionState) => {
      if (!mountedRef.current) return;
      if (
        (state.current_question?.sequence ?? 0) <
        (questionsRef.current.current_question?.sequence ?? 0)
      )
        return;
      questionsRef.current = state;
      setQuestions(state);
      setQuestionError(false);
      publishPreview();
    },
    [publishPreview],
  );

  useEffect(() => {
    if (!interview || initialRef.current === interview.id) return;
    initialRef.current = interview.id;
    for (const turn of interview.turns ?? [])
      turnsRef.current.set(turn.item_id, {
        itemId: turn.item_id,
        speaker: turn.speaker,
        text: turn.text,
        voiceSessionId: turn.voice_session_id,
        saved: true,
      });
    setTurns([...turnsRef.current.values()]);
    applyQuestions({
      current_question: interview.current_question ?? null,
      pending_question: interview.pending_question ?? null,
    });
  }, [interview, applyQuestions]);

  const refresh = useCallback(async () => {
    if (getRef.current || deliveryRef.current) return;
    getRef.current = true;
    const epoch = epochRef.current;
    try {
      const state = await api<VoiceQuestionState>(
        `interviews/${interviewId}/current-question`,
      );
      if (epoch === epochRef.current) applyQuestions(state);
    } catch {
      if (mountedRef.current) setQuestionError(true);
    } finally {
      getRef.current = false;
    }
  }, [interviewId, applyQuestions]);

  const flushDelivery = useCallback(async () => {
    if (deliveryRef.current) return deliveryRef.current;
    const proof = proofRef.current;
    if (!proof || !proof.ids.every((id) => turnsRef.current.get(id)?.saved))
      return;
    epochRef.current++;
    const promise = (async () => {
      try {
        const state = await api<VoiceQuestionState>(
          `interviews/${interviewId}/voice/sessions/${proof.question.voice_session_id}/questions/${proof.question.id}/delivery`,
          "POST",
          { status: proof.status, transcript_item_ids: proof.ids },
        );
        if (proofRef.current === proof) proofRef.current = null;
        applyQuestions(state);
      } catch (error) {
        if (
          error instanceof ConsultantRequestError &&
          [404, 409, 422].includes(error.status)
        ) {
          if (proofRef.current === proof) proofRef.current = null;
        } else if (mountedRef.current) setQuestionError(true);
      }
    })();
    deliveryRef.current = promise;
    try {
      await promise;
    } finally {
      deliveryRef.current = null;
    }
  }, [interviewId, applyQuestions]);
  const flushRef = useRef(flushDelivery);
  useEffect(() => {
    flushRef.current = flushDelivery;
  }, [flushDelivery]);
  const invalidateGets = useCallback(() => {
    epochRef.current++;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidateGets();
    };
  }, [invalidateGets]);
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      if (!sessionRef.current) return;
      void flushDelivery();
      void refresh();
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled, refresh, flushDelivery]);

  const onTranscriptChange = useCallback(
    (turn: LiveTranscriptTurn) => {
      // Ignore late callbacks from a replaced session for question matching, but
      // still keep their transcript/save result visible.
      turnsRef.current.set(turn.itemId, turn);
      if (mountedRef.current) setTurns([...turnsRef.current.values()]);
      publishPreview();
      if (turn.saved) void flushRef.current();
    },
    [publishPreview],
  );

  const onEvent = useCallback(
    (event: Record<string, unknown>, voiceSessionId: string | null) => {
      if (voiceSessionId && sessionRef.current !== voiceSessionId) {
        sessionRef.current = voiceSessionId;
        playingRef.current = false;
        publishPreview();
        interruptedRef.current = false;
        void refresh();
      }
      if (
        [
          "session.input_transcript.delta",
          "input_audio_buffer.speech_started",
          "session.closed",
        ].includes(String(event.type))
      ) {
        if (playingRef.current) {
          interruptedRef.current = true;
          const pending = questionsRef.current.pending_question;
          if (pending && pending.voice_session_id === voiceSessionId) {
            interruptedQuestionsRef.current.add(pending.id);
            proofRef.current = {
              question: pending,
              ids: [],
              status: "interrupted",
            };
            void flushRef.current();
          }
          publishPreview();
        }
      }
      const nested = event.event as { item?: { name?: string } } | undefined;
      if (nested?.item?.name === "present_question") void refresh();
    },
    [refresh, publishPreview],
  );

  const onPlayback = useCallback(
    ({ state, voiceSessionId }: PlaybackObservation) => {
      if (!voiceSessionId || voiceSessionId !== sessionRef.current) return;
      if (state === "speaking") {
        playingRef.current = true;
        interruptedRef.current = false;
        publishPreview();
        return;
      }
      const complete =
        state === "quiet" && playingRef.current && !interruptedRef.current;
      playingRef.current = false;
      const pending = questionsRef.current.pending_question;
      if (!pending || pending.voice_session_id !== voiceSessionId) return;
      const fragments = questionEvidence(pending, [
        ...turnsRef.current.values(),
      ]);
      if (
        complete &&
        fragments.length &&
        !interruptedQuestionsRef.current.has(pending.id)
      ) {
        heardRef.current.add(pending.id);
        proofRef.current = {
          question: pending,
          ids: fragments.map((turn) => turn.itemId),
          status: "delivered",
        };
        void flushRef.current();
      }
      publishPreview();
    },
    [publishPreview],
  );

  const interrupt = useCallback(() => {
    interruptedRef.current = true;
    playingRef.current = false;
    publishPreview();
  }, [publishPreview]);
  const disconnect = useCallback(() => {
    sessionRef.current = null;
    interrupt();
  }, [interrupt]);

  return {
    turns,
    questionError,
    question: previewQuestion ?? questions.current_question,
    refresh,
    onEvent,
    onTranscriptChange,
    onPlayback,
    flushDelivery,
    interrupt,
    disconnect,
  };
}
