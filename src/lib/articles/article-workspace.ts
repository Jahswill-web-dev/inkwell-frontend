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

export type WorkspaceResources = {
  hasBrief: boolean;
  hasOutline: boolean;
  hasDraft: boolean;
};

export type WorkspaceReadiness = {
  id: "interviews" | "brief" | "outline" | "draft";
  label: string;
  detail: string;
  state: "complete" | "ready" | "waiting";
};

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
};

function interviewReadiness(
  metadata: ArticleSetupMetadata | null,
  invitation: InterviewInvitation | null,
  writerMaterial: WriterInterviewMaterial | null,
): WorkspaceReadiness {
  if (metadata?.interviewMethod === "notes") {
    return {
      id: "interviews",
      label: "Source material",
      detail: "Existing notes were added during setup.",
      state: "complete",
    };
  }
  if (metadata?.interviewMethod === "client") {
    if (invitation?.progressState === "completed") {
      return {
        id: "interviews",
        label: "Client interview",
        detail: "The client interview is complete and ready to review.",
        state: "complete",
      };
    }
    if (
      invitation?.status === "active" &&
      !isInterviewInvitationExpired(invitation)
    ) {
      return {
        id: "interviews",
        label: "Client interview",
        detail:
          invitation.progressState === "not_opened"
            ? "The interview link is ready and waiting for the client."
            : "The client has started the interview.",
        state: "waiting",
      };
    }
    return {
      id: "interviews",
      label: "Client interview",
      detail: "The interview link still needs to be created.",
      state: "ready",
    };
  }
  if (metadata?.interviewMethod === "self") {
    const writer = writerInterviewSummary(writerMaterial);
    if (writer.state === "completed") {
      return {
        id: "interviews",
        label: "Writer interview",
        detail: `${writer.responses} writer responses are saved and ready for source review.`,
        state: "complete",
      };
    }
    return {
      id: "interviews",
      label: "Writer interview",
      detail:
        writer.state === "in_progress"
          ? `${writer.responses} responses saved. Continue the whole-article interview.`
          : "The whole-article writer interview is ready to begin.",
      state: writer.state === "in_progress" ? "waiting" : "ready",
    };
  }
  return {
    id: "interviews",
    label: "Interview material",
    detail: "Choose how to collect expert knowledge.",
    state: "waiting",
  };
}

function resourceReadiness(
  resources: WorkspaceResources,
): WorkspaceReadiness[] {
  return [
    {
      id: "brief",
      label: "Brief",
      detail: resources.hasBrief
        ? "The article brief is available."
        : "Ready to generate from approved source material.",
      state: resources.hasBrief ? "complete" : "ready",
    },
    {
      id: "outline",
      label: "Outline",
      detail: resources.hasOutline
        ? "The structure is available."
        : resources.hasBrief
          ? "Ready to build from the brief."
          : "Waiting for the brief.",
      state: resources.hasOutline
        ? "complete"
        : resources.hasBrief
          ? "ready"
          : "waiting",
    },
    {
      id: "draft",
      label: "Draft",
      detail: resources.hasDraft
        ? "A working draft is available."
        : resources.hasOutline
          ? "Ready to draft from the outline."
          : "Waiting for the outline.",
      state: resources.hasDraft
        ? "complete"
        : resources.hasOutline
          ? "ready"
          : "waiting",
    },
  ];
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
): ArticleWorkspaceViewModel["nextAction"] {
  const encodedId = encodeURIComponent(articleId);
  if (resources.hasDraft) {
    return {
      title: "Continue editing the draft",
      description: "Review the current draft and keep shaping the article.",
      href: `/articles/new/draft?articleId=${encodedId}`,
    };
  }
  if (resources.hasOutline) {
    return {
      title: "Start the draft",
      description: "Use the approved outline to begin writing.",
      href: `/articles/new/draft?articleId=${encodedId}`,
    };
  }
  if (resources.hasBrief) {
    return {
      title: "Build the outline",
      description: "Turn the article brief into an editable structure.",
      href: `/articles/new/outline?articleId=${encodedId}`,
    };
  }
  if (metadata?.interviewMethod === "client") {
    if (invitation?.progressState === "completed") {
      return {
        title: "Review the client interview",
        description:
          "The interview is complete. Review its progress before building the brief.",
        href: "/articles/" + encodedId + "/interviews",
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
        title: "Build the article brief",
        description:
          "Your writer-supplied material is saved. Continue with the brief while source review is prepared next.",
        href: `/articles/new/brief?articleId=${encodedId}`,
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
    title: "Build the article brief",
    description: "Turn the setup and source material into a working brief.",
    href: `/articles/new/brief?articleId=${encodedId}`,
  };
}

export function toArticleWorkspaceViewModel(
  article: Article,
  currentWriter: string,
  metadata: ArticleSetupMetadata | null,
  resources: WorkspaceResources,
  invitation: InterviewInvitation | null = null,
  writerMaterial: WriterInterviewMaterial | null = null,
  now = new Date(),
): ArticleWorkspaceViewModel {
  const agencyArticle = toAgencyArticleSummary(article, currentWriter, now);
  const readiness = [
    interviewReadiness(metadata, invitation, writerMaterial),
    ...resourceReadiness(resources),
  ];
  const completedStages =
    1 + readiness.filter((item) => item.state === "complete").length;
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
    progress: Math.round((completedStages / 7) * 100),
    progressLabel: `${completedStages} of 7 stages complete`,
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
    ),
    sourceSummary: `${article.notes.length.toLocaleString()} characters of setup context and source material`,
    writerInterview: {
      ...writerInterviewSummary(writerMaterial),
      href: `/articles/${encodeURIComponent(article.id)}/writer-interview`,
    },
  };
}
