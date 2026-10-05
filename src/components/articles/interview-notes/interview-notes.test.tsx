import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterviewInvitationRequestError } from "@/lib/articles/client-interview-api";
import type { InterviewTranscript } from "@/lib/articles/client-interview-api";
import type { ArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import { InterviewNotes } from "./interview-notes";

const { getInterviewInvitationMock, getInterviewTranscriptMock } = vi.hoisted(
  () => ({
    getInterviewInvitationMock: vi.fn(),
    getInterviewTranscriptMock: vi.fn(),
  }),
);

vi.mock("@/lib/articles/client-interview-api", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/articles/client-interview-api")
  >()),
  getInterviewInvitation: getInterviewInvitationMock,
  getInterviewTranscript: getInterviewTranscriptMock,
}));

const workspace = {
  article: { id: "eb2b0824-1346-4a34-a9ff-387d4d01571a" },
} as ArticleWorkspaceViewModel;

const transcript: InterviewTranscript = {
  id: "9c6d64ea-8836-458b-b9cd-04ea8b94050b",
  invitation_id: "b8cfc60a-0747-43ee-b00b-b80a8d2c7558",
  turns: [
    {
      item_id: "client-1",
      speaker: "participant",
      text: "Our onboarding team loses time to manual handoffs.",
    },
    {
      item_id: "inkwell-1",
      speaker: "interviewer",
      text: "What would a better process change?",
    },
  ],
  insight_status: "ready",
  insights: {
    summary: "Manual handoffs slow the onboarding team.",
    key_insights: [
      { text: "Manual handoffs create delays.", source_item_ids: ["client-1"] },
    ],
    examples_and_evidence: [],
    claims_to_verify: [
      { text: "Handoffs take too long.", source_item_ids: ["client-1"] },
    ],
    open_questions: ["Which handoff causes the largest delay?"],
  },
  model_id: "gpt-5.6-luna",
  generation_error: null,
  created_at: "2026-10-05T12:00:00Z",
  updated_at: "2026-10-05T12:05:00Z",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InterviewNotes", () => {
  it("loads the completed transcript and structured API insights", async () => {
    getInterviewInvitationMock.mockResolvedValue({
      id: transcript.invitation_id,
      participantName: "Avery Chen",
      progressState: "completed",
    });
    getInterviewTranscriptMock.mockResolvedValue(transcript);

    render(<InterviewNotes workspace={workspace} />);

    expect(
      await screen.findByRole("heading", { name: "Interview notes" }),
    ).toBeVisible();
    expect(
      screen.getByText("Manual handoffs slow the onboarding team."),
    ).toBeVisible();
    expect(screen.getByText("Manual handoffs create delays.")).toBeVisible();
    expect(getInterviewTranscriptMock).toHaveBeenCalledWith(
      workspace.article.id,
      transcript.invitation_id,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "View source" })[0]);
    await waitFor(() =>
      expect(
        screen
          .getByText("Our onboarding team loses time to manual handoffs.")
          .closest("article"),
      ).toHaveAttribute("aria-current", "true"),
    );
  });

  it("keeps the saved transcript visible while insights are pending", async () => {
    getInterviewInvitationMock.mockResolvedValue({
      id: transcript.invitation_id,
      participantName: "Avery Chen",
      progressState: "completed",
    });
    getInterviewTranscriptMock.mockResolvedValue({
      ...transcript,
      insight_status: "pending",
      insights: null,
    });

    render(<InterviewNotes workspace={workspace} />);

    expect(
      await screen.findByText("Preparing structured notes…"),
    ).toBeVisible();
    expect(
      screen.getByText("Our onboarding team loses time to manual handoffs."),
    ).toBeVisible();
  });

  it("loads saved turns even when finalization has not completed", async () => {
    getInterviewInvitationMock.mockResolvedValue({
      id: transcript.invitation_id,
      participantName: "Avery Chen",
      progressState: "opened",
    });
    getInterviewTranscriptMock.mockResolvedValue({
      ...transcript,
      insight_status: "pending",
      insights: null,
    });

    render(<InterviewNotes workspace={workspace} />);

    expect(await screen.findByText("Interview not finished")).toBeVisible();
    expect(
      screen.getByText("Our onboarding team loses time to manual handoffs."),
    ).toBeVisible();
    expect(getInterviewTranscriptMock).toHaveBeenCalledWith(
      workspace.article.id,
      transcript.invitation_id,
    );
  });

  it("shows the in-progress state when no transcript exists yet", async () => {
    getInterviewInvitationMock.mockResolvedValue({
      id: transcript.invitation_id,
      participantName: "Avery Chen",
      progressState: "opened",
    });
    getInterviewTranscriptMock.mockRejectedValue(
      new InterviewInvitationRequestError(
        404,
        "interview_transcript_not_found",
        "Not found",
      ),
    );

    render(<InterviewNotes workspace={workspace} />);

    expect(
      await screen.findByText("Avery Chen's interview is still in progress"),
    ).toBeVisible();
  });
});
