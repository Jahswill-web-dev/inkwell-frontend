import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInterviewInvitation } from "@/lib/articles/client-interview-invitation";
import {
  createClientInterviewSession,
  completeClientInterview,
} from "@/lib/articles/client-interview-session";
import { InterviewInvitationRequestError } from "@/lib/articles/client-interview-api";
import { ClientInterview } from "./client-interview";

const token = "a".repeat(48);
const { getGuestMock, updateGuestMock } = vi.hoisted(() => ({
  getGuestMock: vi.fn(),
  updateGuestMock: vi.fn(),
}));
const { startVoiceMock, stopVoiceMock } = vi.hoisted(() => ({
  startVoiceMock: vi.fn(),
  stopVoiceMock: vi.fn(),
}));

vi.mock("@/lib/articles/client-interview-api", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/articles/client-interview-api")
  >()),
  getGuestInterview: getGuestMock,
  updateGuestInterview: updateGuestMock,
}));

vi.mock("./use-realtime-interview", () => ({
  useRealtimeInterview: () => ({
    error: null,
    flushTranscript: vi.fn().mockResolvedValue(undefined),
    start: startVoiceMock,
    status: "idle",
    stop: stopVoiceMock,
  }),
}));

function seedInvitation(
  overrides: Partial<ReturnType<typeof createInterviewInvitation>> = {},
) {
  const invitation = {
    ...createInterviewInvitation(
      "article-1",
      {
        participantName: "Avery Chen",
        participantEmail: "avery@client.com",
        expiresOn: "",
      },
      {
        tokenFactory: () => token,
        articleTitle: "Expert-led content",
        clientName: "Northstar Labs",
        writerName: "Morgan",
      },
    ),
    ...overrides,
  };
  let session =
    invitation.progressState === "completed"
      ? completeClientInterview(createClientInterviewSession(token))
      : createClientInterviewSession(token);
  getGuestMock.mockResolvedValue({ invitation, session });
  updateGuestMock.mockImplementation(async (_token, nextSession) => {
    session = nextSession;
    return { invitation, session };
  });
  return invitation;
}

beforeEach(() => {
  vi.clearAllMocks();
  getGuestMock.mockRejectedValue(
    new InterviewInvitationRequestError(
      404,
      "invitation_not_found",
      "Not found",
    ),
  );
});

afterEach(() => {
  cleanup();
});

describe("ClientInterview", () => {
  it("shows a safe invalid-link state", async () => {
    render(<ClientInterview token="missing-token-value-123456" />);
    expect(
      await screen.findByRole("heading", {
        name: "This interview link isn’t valid",
      }),
    ).toBeVisible();
  });

  it("welcomes the participant and starts the voice connection", async () => {
    seedInvitation();
    render(<ClientInterview token={token} />);
    expect(
      await screen.findByRole("heading", {
        name: /Share your expertise for “Expert-led content”/,
      }),
    ).toBeVisible();
    expect(screen.getByText(/About 5–10 minutes/)).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /Start voice interview/ }),
    );
    expect(startVoiceMock).toHaveBeenCalledOnce();
  });

  it("tells the participant that microphone access is needed", async () => {
    seedInvitation();
    render(<ClientInterview token={token} />);
    expect(await screen.findByText(/allow microphone access/i)).toBeVisible();
  });

  it.each([
    [
      "revoked",
      { status: "revoked" as const },
      "This interview link was revoked",
    ],
    [
      "expired",
      { expiresAt: "2020-01-01T23:59:59.999Z" },
      "This interview link has expired",
    ],
  ])("shows the %s state", async (_state, overrides, heading) => {
    getGuestMock.mockRejectedValue(
      new InterviewInvitationRequestError(
        "status" in overrides && overrides.status === "revoked" ? 403 : 410,
        "invitation_unavailable",
        "Unavailable",
      ),
    );
    render(<ClientInterview token={token} />);
    expect(await screen.findByRole("heading", { name: heading })).toBeVisible();
  });

  it("allows one final detail on an already completed interview", async () => {
    seedInvitation({ progressState: "completed" });
    render(<ClientInterview token={token} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Add one final detail" }),
    );
    expect(screen.getByRole("heading", { name: /final detail/ })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "One last customer result." },
    });
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("heading", { name: "Thank you, Avery Chen" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Add one final detail" }),
    ).not.toBeInTheDocument();
  });

  it("lets the participant skip an optional final detail", async () => {
    seedInvitation({ progressState: "completed" });
    render(<ClientInterview token={token} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Add one final detail" }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Skip this detail" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Thank you, Avery Chen" }),
    ).toBeVisible();
    expect(updateGuestMock).toHaveBeenLastCalledWith(
      token,
      expect.objectContaining({
        state: "completed",
        answers: [],
        finalDetailAdded: true,
      }),
    );
  });
});
