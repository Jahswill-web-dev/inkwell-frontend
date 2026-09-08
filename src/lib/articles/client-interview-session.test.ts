import { describe, expect, it } from "vitest";
import {
  addFinalInterviewDetail,
  clientInterviewProgress,
  createClientInterviewSession,
  currentInterviewQuestion,
  pauseClientInterview,
  startClientInterview,
  submitClientInterviewAnswer,
} from "./client-interview-session";

const token = "a".repeat(48);

describe("client interview session", () => {
  it("starts at the welcome and persists a paused draft", () => {
    const initial = createClientInterviewSession(token);
    expect(initial.state).toBe("welcome");
    expect(currentInterviewQuestion(initial)?.id).toBe("key-message");

    const active = startClientInterview(initial);
    const paused = pauseClientInterview(active, "An unfinished thought");
    expect(paused).toMatchObject({
      state: "paused",
      draftAnswer: "An unfinished thought",
    });
  });

  it("asks a targeted follow-up after a thin answer", () => {
    const active = startClientInterview(createClientInterviewSession(token));
    const next = submitClientInterviewAnswer(active, "Customers save time.");
    expect(next.answers).toHaveLength(1);
    expect(currentInterviewQuestion(next)).toMatchObject({
      kind: "follow_up",
    });
    expect(currentInterviewQuestion(next)?.text).toContain("more specific");
  });

  it("ends early once several detailed answers provide enough coverage", () => {
    const detailed = Array.from(
      { length: 40 },
      (_, index) => "detail" + index,
    ).join(" ");
    let session = startClientInterview(createClientInterviewSession(token));
    session = submitClientInterviewAnswer(session, detailed);
    session = submitClientInterviewAnswer(session, detailed);
    session = submitClientInterviewAnswer(session, detailed);
    expect(session.state).toBe("completed");
    expect(session.completionReason).toBe("sufficient");
    expect(clientInterviewProgress(session)).toBe(100);
  });

  it("allows one final detail after completion", () => {
    const initial = createClientInterviewSession(token);
    const reopened = addFinalInterviewDetail({
      ...initial,
      state: "completed",
      completionReason: "participant_finished",
    });
    expect(currentInterviewQuestion(reopened)?.kind).toBe("final_detail");
    const complete = submitClientInterviewAnswer(reopened, "One final fact.");
    expect(complete.state).toBe("completed");
    expect(complete.finalDetailAdded).toBe(true);
  });
});
