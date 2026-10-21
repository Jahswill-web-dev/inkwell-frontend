import type { Article } from "./article";
import type { ArticleSetupMetadata } from "./article-setup";
import {
  interviewInvitationLabel,
  isInterviewInvitationExpired,
  type InterviewInvitation,
} from "./client-interview-invitation";
import {
  agencyStatusLabels,
  type AgencyArticleStatus,
} from "@/lib/dashboard/agency-dashboard";
import { toAgencyArticleSummary } from "@/lib/dashboard/agency-view-model";
import {
  writerInterviewSummary,
  type WriterInterviewMaterial,
} from "./writer-interview-storage";
import type { SourceReview } from "./source-review";

export type WorkspaceResources = {
  hasBrief: boolean;
  hasOutline: boolean;
  hasDraft: boolean;
};

export type WorkspaceReadiness = {
  id: "setup" | "collection" | "notes";
  label: string;
  detail: string;
  state: "complete" | "in_progress" | "not_started" | "needs_attention";
};

export type ClientInterviewNotesState =
  "pending" | "ready" | "failed" | "unavailable" | null;

export type WorkspaceParticipant = {
  name: string;
  role: string;
  state: string;
};

export type ArticleWorkspaceViewModel = {
  article: Article;
  clientName: string;
  assignee: string;
  dueDate: string | null;
  status: AgencyArticleStatus;
  statusLabel: string;
  progress: number;
  progressLabel: string;
  readiness: WorkspaceReadiness[];
  participants: WorkspaceParticipant[];
  nextAction: {
    title: string;
    description: string;
    href: string | null;
    unavailableLabel?: string;
  };
  sourceSummary: string;
  writerInterview: {
    state: "not_started" | "in_progress" | "completed";
    progress: number;
    responses: number;
    href: string;
  };
  sourceReview: {
    state: "not_started" | "in_progress" | "approved";
    included: number;
    total: number;
    href: string;
  };
};

function collectionReadiness(
  metadata: ArticleSetupMetadata | null,
  invitation: InterviewInvitation | null,
  writerMaterial: WriterInterviewMaterial | null,
): WorkspaceReadiness {
  if (metadata?.interviewMethod === "notes") {
    return {
      id: "collection",
      label: "Source material",
      detail: "Existing notes and source material were added during setup.",
      state: "complete",
    };
  }
  if (metadata?.interviewMethod === "client") {
    if (invitation?.progressState === "completed") {
      return {
        id: "collection",
        label: "Client interview",
        detail: `${invitation.questionsAnswered} questions were answered in the completed interview.`,
        state: "complete",
      };
    }
    if (
      invitation?.status === "active" &&
      !isInterviewInvitationExpired(invitation)
    ) {
      return {
        id: "collection",
        label: "Client interview",
        detail:
          invitation.progressState === "not_opened"
            ? "The client interview has not been opened yet."
            : invitation.progressState === "opened"
              ? "The client has opened the interview."
              : `${invitation.questionsAnswered} of ${invitation.estimatedQuestions} questions answered.`,
        state: "in_progress",
      };
    }
    return {
      id: "collection",
      label: "Client interview",
      detail: "No client interview has been started.",
      state: "not_started",
    };
  }
  if (metadata?.interviewMethod === "self") {
    const writer = writerInterviewSummary(writerMaterial);
    const responseLabel = `${writer.responses} ${writer.responses === 1 ? "response" : "responses"}`;
    if (writer.state === "completed") {
      return {
        id: "collection",
        label: "Writer interview",
        detail: `${responseLabel} saved from the writer interview.`,
        state: "complete",
      };
    }
    return {
      id: "collection",
      label: "Writer interview",
      detail:
        writer.state === "in_progress"
          ? `${responseLabel} saved. Continue the whole-article interview.`
          : "The whole-article writer interview is ready to begin.",
      state: writer.state === "in_progress" ? "in_progress" : "not_started",
    };
  }
  return {
    id: "collection",
    label: "Source material",
    detail: "No source collection method has been selected.",
    state: "not_started",
  };
}

function clientNotesReadiness(
  invitation: InterviewInvitation | null,
  notesState: ClientInterviewNotesState,
): WorkspaceReadiness {
  if (invitation?.progressState !== "completed") {
    return {
      id: "notes",
      label: "Interview notes",
      detail: "Available after the client interview is complete.",
      state: "not_started",
    };
  }
  if (notesState === "ready") {
    return {
      id: "notes",
      label: "Interview notes",
      detail: "Structured interview notes are ready to review.",
      state: "complete",
    };
  }
  if (notesState === "failed") {
    return {
      id: "notes",
      label: "Interview notes",
      detail: "The interview is saved, but its notes could not be prepared.",
      state: "needs_attention",
    };
  }
  if (notesState === "unavailable") {
    return {
      id: "notes",
      label: "Interview notes",
      detail: "The interview is saved, but the notes status is unavailable.",
      state: "needs_attention",
    };
  }
  return {
    id: "notes",
    label: "Interview notes",
    detail: "Interview complete; notes are being prepared.",
    state: "in_progress",
  };
}

function participants(
  metadata: ArticleSetupMetadata | null,
  currentWriter: string,
  invitation: InterviewInvitation | null,
  writerMaterial: WriterInterviewMaterial | null,
): WorkspaceParticipant[] {
  const writer = writerInterviewSummary(writerMaterial);
  const writerParticipant: WorkspaceParticipant | null =
    writer.state !== "not_started" || metadata?.interviewMethod === "self"
      ? {
          name: currentWriter,
          role: "Writer · Whole article",
          state:
            writer.state === "completed"
              ? "Complete"
              : writer.state === "in_progress"
                ? `${writer.progress}% complete`
                : "Ready to interview",
        }
      : null;
  if (metadata?.interviewMethod === "client") {
    return [
      {
        name: invitation?.participantName || metadata.intervieweeName,
        role: "Client expert",
        state: invitation
          ? interviewInvitationLabel(invitation)
          : "Link not created",
      },
      ...(writerParticipant ? [writerParticipant] : []),
    ];
  }
  if (metadata?.interviewMethod === "self") {
    return writerParticipant ? [writerParticipant] : [];
  }
  return writerParticipant ? [writerParticipant] : [];
}

function nextAction(
  articleId: string,
  metadata: ArticleSetupMetadata | null,
  resources: WorkspaceResources,
  invitation: InterviewInvitation | null,
  writerMaterial: WriterInterviewMaterial | null,
  sourceReview: SourceReview | null,
): ArticleWorkspaceViewModel["nextAction"] {
  const encodedId = encodeURIComponent(articleId);
  if (resources.hasDraft || resources.hasOutline || resources.hasBrief) {
    return {
      title: "Content production is unavailable",
      description:
        "The previous brief, outline, and drafting workflow is not part of this workspace.",
      href: null,
      unavailableLabel: "Coming soon",
    };
  }
  if (sourceReview?.status === "approved") {
    return {
      title: "Source material approved",
      description: "Content generation is not available in this workspace yet.",
      href: null,
      unavailableLabel: "Coming soon",
    };
  }
  if (metadata?.interviewMethod === "client") {
    if (invitation?.progressState === "completed") {
      return {
        title: "Review collected source material",
        description:
          "The interview is complete. Approve what Inkwell may use before building the brief.",
        href: "/articles/" + encodedId + "/sources",
      };
    }
    if (
      invitation?.status === "active" &&
      !isInterviewInvitationExpired(invitation)
    ) {
      return {
        title: "Track the client interview",
        description:
          invitation.progressState === "not_opened"
            ? "The link is ready. Copy it or check whether the client has opened it."
            : "The client has started. Follow summarized progress here.",
        href: "/articles/" + encodedId + "/interviews",
      };
    }
    return {
      title: "Create the client interview link",
      description:
        "Prepare a focused interview for the selected client expert.",
      href: "/articles/" + encodedId + "/interviews",
    };
  }
  if (metadata?.interviewMethod === "self") {
    const writer = writerInterviewSummary(writerMaterial);
    if (writer.state === "completed") {
      return {
        title: "Review your source material",
        description:
          "Your writer-supplied material is ready. Approve what Inkwell may use before generation.",
        href: `/articles/${encodedId}/sources`,
      };
    }
    return {
      title:
        writer.state === "in_progress"
          ? "Continue your interview"
          : "Start your interview",
      description: "Answer guided questions before Inkwell builds the brief.",
      href: `/articles/${encodedId}/writer-interview`,
    };
  }
  return {
    title: "Content production is unavailable",
    description:
      "The previous brief, outline, and drafting workflow is not part of this workspace.",
    href: null,
    unavailableLabel: "Coming soon",
  };
}

export function toArticleWorkspaceViewModel(
  article: Article,
  currentWriter: string,
  metadata: ArticleSetupMetadata | null,
  resources: WorkspaceResources,
  invitation: InterviewInvitation | null = null,
  writerMaterial: WriterInterviewMaterial | null = null,
  sourceReview: SourceReview | null = null,
  clientNotesState: ClientInterviewNotesState = null,
): ArticleWorkspaceViewModel {
  const agencyArticle = toAgencyArticleSummary(article, currentWriter);
  const readiness = [
    {
      id: "setup",
      label: "Article setup",
      detail: "Article details and source approach are saved.",
      state: "complete",
    } satisfies WorkspaceReadiness,
    collectionReadiness(metadata, invitation, writerMaterial),
    ...(metadata?.interviewMethod === "client"
      ? [clientNotesReadiness(invitation, clientNotesState)]
      : []),
  ];
  const completedStages = readiness.filter(
    (item) => item.state === "complete",
  ).length;
  const status = resources.hasDraft
    ? "drafting"
    : resources.hasOutline
      ? "ready_to_draft"
      : metadata?.interviewMethod === "client"
        ? invitation?.progressState === "completed"
          ? "ready_to_draft"
          : "waiting_for_client"
        : metadata
          ? "setup"
          : agencyArticle.status;

  return {
    article,
    clientName: metadata?.clientName ?? agencyArticle.clientName,
    assignee: agencyArticle.assignee,
    dueDate: agencyArticle.dueDate,
    status,
    statusLabel: agencyStatusLabels[status],
    progress: Math.round((completedStages / readiness.length) * 100),
    progressLabel: `${completedStages} of ${readiness.length} stages complete`,
    readiness,
    participants: participants(
      metadata,
      currentWriter,
      invitation,
      writerMaterial,
    ),
    nextAction: nextAction(
      article.id,
      metadata,
      resources,
      invitation,
      writerMaterial,
      sourceReview,
    ),
    sourceSummary: `${article.notes.length.toLocaleString()} characters of setup context and source material`,
    writerInterview: {
      ...writerInterviewSummary(writerMaterial),
      href: `/articles/${encodeURIComponent(article.id)}/writer-interview`,
    },
    sourceReview: {
      state:
        sourceReview?.status === "approved"
          ? "approved"
          : sourceReview?.items.length
            ? "in_progress"
            : "not_started",
      included: sourceReview?.items.filter((item) => item.included).length ?? 0,
      total: sourceReview?.items.length ?? 0,
      href: `/articles/${encodeURIComponent(article.id)}/sources`,
    },
  };
}
