import type { Article } from "./article";
import type { ArticleSetupMetadata } from "./article-setup";
import {
  agencyStatusLabels,
  type AgencyArticleStatus,
} from "@/lib/dashboard/agency-dashboard";
import { toAgencyArticleSummary } from "@/lib/dashboard/agency-view-model";

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
};

function interviewReadiness(
  metadata: ArticleSetupMetadata | null,
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
    return {
      id: "interviews",
      label: "Client interview",
      detail: "The interview link still needs to be created.",
      state: "ready",
    };
  }
  if (metadata?.interviewMethod === "self") {
    return {
      id: "interviews",
      label: "Writer interview",
      detail: "The writer interview is ready to begin.",
      state: "ready",
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
): WorkspaceParticipant[] {
  if (metadata?.interviewMethod === "client") {
    return [
      {
        name: metadata.intervieweeName,
        role: "Client expert",
        state: "Link not created",
      },
    ];
  }
  if (metadata?.interviewMethod === "self") {
    return [
      { name: currentWriter, role: "Writer", state: "Ready to interview" },
    ];
  }
  return [];
}

function nextAction(
  articleId: string,
  metadata: ArticleSetupMetadata | null,
  resources: WorkspaceResources,
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
    return {
      title: "Create the client interview link",
      description:
        "Prepare a focused interview for the selected client expert.",
      href: null,
      unavailableLabel: "Available in the next milestone",
    };
  }
  if (metadata?.interviewMethod === "self") {
    return {
      title: "Start your interview",
      description: "Answer guided questions before Inkwell builds the brief.",
      href: null,
      unavailableLabel: "Writer interviews are coming next",
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
  now = new Date(),
): ArticleWorkspaceViewModel {
  const agencyArticle = toAgencyArticleSummary(article, currentWriter, now);
  const readiness = [
    interviewReadiness(metadata),
    ...resourceReadiness(resources),
  ];
  const completedStages =
    1 + readiness.filter((item) => item.state === "complete").length;
  const status = resources.hasDraft
    ? "drafting"
    : resources.hasOutline
      ? "ready_to_draft"
      : metadata?.interviewMethod === "client"
        ? "waiting_for_client"
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
    participants: participants(metadata, currentWriter),
    nextAction: nextAction(article.id, metadata, resources),
    sourceSummary: `${article.notes.length.toLocaleString()} characters of setup context and source material`,
  };
}
