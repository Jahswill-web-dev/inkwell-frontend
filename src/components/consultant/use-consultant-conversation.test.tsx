import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  Interview,
  VoiceQuestion,
  VoiceQuestionState,
} from "@/lib/consultant/client";
import {
  useConsultantConversation,
  questionEvidence,
} from "./use-consultant-conversation";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/consultant/client", async (original) => ({
  ...(await original<typeof import("@/lib/consultant/client")>()),
  consultantRequest: api,
}));
const question: VoiceQuestion = {
  id: "question",
  voice_session_id: "session",
  sequence: 2,
  text: "What happened at the handoff?",
  kind: "follow_up",
  status: "pending",
  created_at: "2026-11-24T12:00:00Z",
  delivered_at: null,
  transcript_item_ids: [],
};
const previous: VoiceQuestion = {
  ...question,
  id: "previous",
  sequence: 1,
  text: "What is your perspective?",
  status: "delivered",
};
let state: VoiceQuestionState;
function initial(): Interview {
  return {
    id: "interview",
    turns: [],
    current_question: previous,
    pending_question: question,
  } as unknown as Interview;
}
const turn = {
  itemId: "spoken",
  speaker: "interviewer" as const,
  text: "Thanks. What happened at the handoff?",
  voiceSessionId: "session",
  saved: false,
};
beforeEach(() => {
  api.mockReset();
  state = { current_question: previous, pending_question: question };
  api.mockImplementation(
    async (_path: string, method?: string, body?: { status: string }) => {
      if (method === "POST")
        state = {
          current_question:
            body?.status === "delivered"
              ? {
                  ...question,
                  status: "delivered",
                  transcript_item_ids: ["spoken"],
                }
              : previous,
          pending_question: null,
        };
      return state;
    },
  );
});
afterEach(cleanup);

it("requires actual playback plus matching saved words before delivery acknowledgment", async () => {
  const interview = initial();
  const { result } = renderHook(() =>
    useConsultantConversation("interview", interview, true),
  );
  await act(async () =>
    result.current.onEvent({ type: "session.started" }, "session"),
  );
  act(() => result.current.onTranscriptChange(turn));
  expect(result.current.question?.id).toBe("previous");
  expect(api.mock.calls.filter((call) => call[1] === "POST")).toHaveLength(0);
  act(() =>
    result.current.onPlayback({ state: "speaking", voiceSessionId: "session" }),
  );
  expect(result.current.question?.id).toBe("question");
  act(() =>
    result.current.onPlayback({ state: "quiet", voiceSessionId: "session" }),
  );
  expect(api.mock.calls.filter((call) => call[1] === "POST")).toHaveLength(0);
  await act(async () =>
    result.current.onTranscriptChange({ ...turn, saved: true }),
  );
  expect(api).toHaveBeenCalledWith(
    "interviews/interview/voice/sessions/session/questions/question/delivery",
    "POST",
    { status: "delivered", transcript_item_ids: ["spoken"] },
  );
  expect(result.current.question?.status).toBe("delivered");
  await act(async () => result.current.flushDelivery());
  expect(api.mock.calls.filter((call) => call[1] === "POST")).toHaveLength(1);
});

it("keeps the previous question after an interruption or blocked audio", async () => {
  const interview = initial();
  const { result } = renderHook(() =>
    useConsultantConversation("interview", interview, true),
  );
  await act(async () =>
    result.current.onEvent({ type: "session.started" }, "session"),
  );
  act(() =>
    result.current.onPlayback({ state: "speaking", voiceSessionId: "session" }),
  );
  act(() => result.current.onTranscriptChange({ ...turn, saved: true }));
  await act(async () =>
    result.current.onEvent(
      { type: "session.input_transcript.delta", delta: "Wait" },
      "session",
    ),
  );
  act(() =>
    result.current.onPlayback({ state: "quiet", voiceSessionId: "session" }),
  );
  expect(result.current.question?.id).toBe("previous");
  expect(api).toHaveBeenCalledWith(expect.any(String), "POST", {
    status: "interrupted",
    transcript_item_ids: [],
  });
  expect(api.mock.calls.some((call) => call[2]?.status === "delivered")).toBe(
    false,
  );
});

it("does not confirm blocked playback or observations from an old session", async () => {
  const interview = initial();
  const { result } = renderHook(() =>
    useConsultantConversation("interview", interview, true),
  );
  await act(async () =>
    result.current.onEvent({ type: "session.started" }, "session"),
  );
  act(() => result.current.onTranscriptChange({ ...turn, saved: true }));
  act(() =>
    result.current.onPlayback({ state: "speaking", voiceSessionId: "session" }),
  );
  act(() =>
    result.current.onPlayback({ state: "blocked", voiceSessionId: "session" }),
  );
  act(() =>
    result.current.onPlayback({
      state: "quiet",
      voiceSessionId: "old-session",
    }),
  );
  expect(api.mock.calls.some((call) => call[1] === "POST")).toBe(false);
  expect(result.current.question?.id).toBe("previous");
});

it("retries an acknowledgment after a temporary failure without inventing saved state", async () => {
  const interview = initial();
  const implementation = api.getMockImplementation()!;
  api.mockImplementation(async (...args) => {
    if (args[1] === "POST") throw new Error("offline");
    return implementation(...args);
  });
  const { result } = renderHook(() =>
    useConsultantConversation("interview", interview, true),
  );
  await act(async () =>
    result.current.onEvent({ type: "session.started" }, "session"),
  );
  act(() => result.current.onTranscriptChange({ ...turn, saved: true }));
  act(() =>
    result.current.onPlayback({ state: "speaking", voiceSessionId: "session" }),
  );
  await act(async () =>
    result.current.onPlayback({ state: "quiet", voiceSessionId: "session" }),
  );
  expect(result.current.questionError).toBe(true);
  expect(result.current.question?.status).toBe("pending");
  api.mockImplementation(implementation);
  await act(async () => result.current.flushDelivery());
  await waitFor(() =>
    expect(result.current.question?.status).toBe("delivered"),
  );
});

it("matches fragments in order from the same interviewer and session", () => {
  const parts = [
    { ...turn, itemId: "a", text: "What happened" },
    { ...turn, itemId: "b", text: "at the handoff?" },
  ];
  expect(questionEvidence(question, parts).map((part) => part.itemId)).toEqual([
    "a",
    "b",
  ]);
  expect(questionEvidence(question, [...parts].reverse())).toEqual([]);
  expect(
    questionEvidence(question, [
      parts[0],
      { ...parts[1], speaker: "participant" },
    ]),
  ).toEqual([]);
  expect(
    questionEvidence(
      question,
      parts.map((part) => ({ ...part, voiceSessionId: "old" })),
    ),
  ).toEqual([]);
});
