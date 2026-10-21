import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeInterview } from "./use-realtime-interview";

const { associateSessionMock, createCallMock, elevenOptions, endSessionMock, startSessionMock } =
  vi.hoisted(() => ({
  associateSessionMock: vi.fn().mockResolvedValue(undefined),
  createCallMock: vi.fn().mockResolvedValue({
    transport: "openai_webrtc",
    session_id: "11111111-1111-4111-8111-111111111111",
    sdp: "answer",
  }),
  elevenOptions: { current: undefined as Record<string, unknown> | undefined },
  endSessionMock: vi.fn(),
  startSessionMock: vi.fn(),
}));

vi.mock("@/lib/articles/client-interview-api", () => ({
  associateVoiceInterviewSession: associateSessionMock,
  createVoiceInterviewSession: createCallMock,
}));

vi.mock("@elevenlabs/react", () => ({
  useConversation: (options: Record<string, unknown>) => {
    elevenOptions.current = options;
    return {
      startSession: startSessionMock,
      endSession: endSessionMock,
    };
  },
}));

class MockDataChannel extends EventTarget {
  readyState = "open";
  send = vi.fn();

  receive(event: object) {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(event) }),
    );
  }
}

class MockPeerConnection {
  static latest: MockPeerConnection;
  channel = new MockDataChannel();
  connectionState = "connected";
  iceGatheringState = "complete";
  localDescription = { sdp: "offer" };
  onconnectionstatechange: (() => void) | null = null;
  ontrack: (() => void) | null = null;
  addTrack = vi.fn();
  close = vi.fn();
  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "offer" });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  createDataChannel = vi.fn(() => this.channel);

  constructor() {
    MockPeerConnection.latest = this;
  }
}

beforeEach(() => {
  localStorage.clear();
  createCallMock.mockClear();
  associateSessionMock.mockClear();
  startSessionMock.mockClear();
  endSessionMock.mockClear();
  elevenOptions.current = undefined;
  vi.stubGlobal("RTCPeerConnection", MockPeerConnection);
  vi.stubGlobal(
    "Audio",
    class {
      srcObject = null;
      autoplay = false;
      pause() {}
      play() {
        return Promise.resolve();
      }
    },
  );
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ readyState: "live", stop: vi.fn() }],
      }),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Live interview events", () => {
  it("saves Live transcript fragments without item IDs when the interview ends", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useRealtimeInterview("test-token", "openai_webrtc", {
        onTranscriptTurn: save,
      }),
    );
    act(() => result.current.start());
    await waitFor(() => expect(createCallMock).toHaveBeenCalledOnce());

    act(() => {
      MockPeerConnection.latest.channel.receive({ type: "session.started" });
      MockPeerConnection.latest.channel.receive({
        type: "session.input_transcript.delta",
        event_id: "fragment-1",
        delta: "First ",
        start_ms: 100,
        end_ms: 300,
      });
      MockPeerConnection.latest.channel.receive({
        type: "session.input_transcript.delta",
        event_id: "fragment-2",
        delta: "answer",
        start_ms: 300,
        end_ms: 600,
      });
      result.current.stop("manual_end_button");
    });
    await act(async () => result.current.flushTranscript());

    expect(MockPeerConnection.latest.channel.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "response.create" }),
    );
    expect(save).toHaveBeenCalledWith({
      itemId: "fragment-1",
      speaker: "participant",
      text: "First answer",
      provider: "openai_live",
      voiceSessionId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("completes after a delegated end_interview call without another event", async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeInterview("test-token", "openai_webrtc", { onComplete }),
    );
    act(() => result.current.start());
    await waitFor(() => expect(createCallMock).toHaveBeenCalledOnce());

    vi.useFakeTimers();
    act(() => {
      MockPeerConnection.latest.channel.receive({
        type: "response.event",
        event: {
          type: "response.output_item.done",
          item: {
            type: "function_call",
            name: "end_interview",
            arguments: JSON.stringify({ reason: "questions_complete" }),
          },
        },
      });
      vi.advanceTimersByTime(2_000);
    });
    expect(onComplete).toHaveBeenCalledWith("questions_complete");
  });

  it("normalizes final ElevenLabs messages into the shared transcript contract", async () => {
    createCallMock.mockResolvedValueOnce({
      transport: "elevenlabs_webrtc",
      session_id: "22222222-2222-4222-8222-222222222222",
      conversation_token: "temporary-token",
      dynamic_variables: { participant_name: "Taylor" },
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useRealtimeInterview("test-token", "elevenlabs_webrtc", {
        onTranscriptTurn: save,
      }),
    );

    act(() => result.current.start());
    await waitFor(() => expect(startSessionMock).toHaveBeenCalledOnce());
    act(() => {
      const options = elevenOptions.current as {
        onConnect: (value: { conversationId: string }) => void;
        onMessage: (value: {
          event_id: number;
          message: string;
          role: "user" | "agent";
        }) => void;
      };
      options.onConnect({ conversationId: "conv-test" });
      options.onMessage({ event_id: 7, message: "A useful answer", role: "user" });
    });
    await act(async () => result.current.flushTranscript());

    expect(save).toHaveBeenCalledWith({
      itemId: "elevenlabs:conv-test:7",
      speaker: "participant",
      text: "A useful answer",
      provider: "elevenlabs",
      voiceSessionId: "22222222-2222-4222-8222-222222222222",
    });
    expect(associateSessionMock).toHaveBeenCalledWith(
      "test-token",
      "22222222-2222-4222-8222-222222222222",
      "conv-test",
    );
  });
});
