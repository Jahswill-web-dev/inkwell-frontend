import { describe, expect, it } from "vitest";
import {
  createInterviewInvitation,
  interviewInvitationLabel,
  interviewInvitationUrl,
  interviewProgressPercent,
  isInterviewInvitationExpired,
  revokeInterviewInvitation,
} from "./client-interview-invitation";

const input = {
  participantName: " Avery Chen ",
  participantEmail: "AVERY@CLIENT.COM",
  expiresOn: "2099-09-20",
};

describe("client interview invitations", () => {
  it("creates a normalized invitation with a replaceable token", () => {
    const invitation = createInterviewInvitation("article-1", input, {
      now: new Date("2026-09-08T12:00:00Z"),
      tokenFactory: () => "a".repeat(48),
    });
    expect(invitation).toMatchObject({
      participantName: "Avery Chen",
      participantEmail: "avery@client.com",
      progressState: "not_opened",
      generation: 1,
    });
    expect(interviewInvitationUrl(invitation, "https://inkwell.test/")).toBe(
      "https://inkwell.test/interview/" + "a".repeat(48),
    );
  });

  it("derives summarized progress without exposing answers", () => {
    const invitation = createInterviewInvitation("article-1", input, {
      tokenFactory: () => "b".repeat(48),
    });
    const progress = {
      ...invitation,
      progressState: "in_progress" as const,
      questionsAnswered: 3,
      estimatedQuestions: 8,
    };
    expect(interviewInvitationLabel(progress)).toBe("In progress");
    expect(interviewProgressPercent(progress)).toBe(38);
    expect(Object.keys(progress)).not.toContain("answers");
  });

  it("recognizes revoked and expired links", () => {
    const invitation = createInterviewInvitation("article-1", input, {
      tokenFactory: () => "c".repeat(48),
    });
    expect(
      interviewInvitationLabel(revokeInterviewInvitation(invitation)),
    ).toBe("Revoked");
    expect(
      isInterviewInvitationExpired(
        { ...invitation, expiresAt: "2026-09-07T23:59:59.999Z" },
        new Date("2026-09-08T00:00:00Z"),
      ),
    ).toBe(true);
  });
});
