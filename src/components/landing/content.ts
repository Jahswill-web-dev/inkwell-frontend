export type NavigationLink = {
  label: string;
  href: string;
};

export type WorkflowStage = {
  id: "foundation" | "direction" | "interview" | "review" | "write";
  label: string;
  description: string;
};

export type ProductFeatureContent = {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs: readonly string[];
  desktopImage: string;
  mobileImage: string;
  imageWidth: number;
  imageHeight: number;
  imageAlt: string;
  reverse?: boolean;
  signals?: readonly {
    label: string;
    tone: "amber" | "crimson" | "green";
  }[];
};

export const navigationLinks: readonly NavigationLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For agencies", href: "#features" },
  { label: "Pricing", href: "/pricing" },
];

export const workflowStages: readonly WorkflowStage[] = [
  {
    id: "foundation",
    label: "Set the foundation",
    description: "Create the article around the client, audience, and goal.",
  },
  {
    id: "direction",
    label: "Set direction",
    description: "Give the interview an editorial angle and a clear outcome.",
  },
  {
    id: "interview",
    label: "Send the link",
    description: "Invite the client or expert to a focused AI conversation.",
  },
  {
    id: "review",
    label: "Review the material",
    description: "Approve the details your team can use before drafting.",
  },
  {
    id: "write",
    label: "Hand off to writers",
    description: "Turn approved expertise into a writer-ready brief and draft.",
  },
];

export const productFeatures: readonly ProductFeatureContent[] = [
  {
    id: "direction",
    eyebrow: "Editorial setup",
    title: "Set the angle before the interview starts",
    paragraphs: [
      "Capture the point of view, key message, audience, tone, and outcome your client needs before the AI asks a single question.",
      "Every client conversation starts from an editor’s direction—not a blank form.",
    ],
    desktopImage: "/images/landing/agency-flow/editorial-direction.png",
    mobileImage: "/images/landing/agency-flow/editorial-direction.png",
    imageWidth: 1352,
    imageHeight: 642,
    imageAlt:
      "Inkwell editorial direction form for setting an article's angle, key message, and voice",
  },
  {
    id: "collection",
    eyebrow: "Client expertise",
    title: "Let clients share what they know—on their own time",
    paragraphs: [
      "Choose a client interview, a writer interview, or your existing notes. Inkwell adapts the source-collection path to the article at hand.",
      "The AI keeps the conversation focused, so your team gets substance without scheduling another discovery call.",
    ],
    desktopImage: "/images/landing/agency-flow/expertise-collection.png",
    mobileImage: "/images/landing/agency-flow/expertise-collection.png",
    imageWidth: 1350,
    imageHeight: 638,
    imageAlt:
      "Inkwell options for collecting client, writer, or existing-note expertise",
    reverse: true,
  },
  {
    id: "invite",
    eyebrow: "Private client link",
    title: "Send a private interview link, not another form",
    paragraphs: [
      "Invite one client or subject-matter expert with a simple, private link. They answer a short AI-led interview while you see progress without chasing them.",
      "Their responses stay connected to the article, ready for a thoughtful editorial review.",
    ],
    desktopImage: "/images/landing/agency-flow/private-interview-link.png",
    mobileImage: "/images/landing/agency-flow/private-interview-link.png",
    imageWidth: 1348,
    imageHeight: 653,
    imageAlt:
      "Inkwell private interview link form for inviting a client contributor",
    signals: [
      { label: "One private link", tone: "amber" },
      { label: "AI-led questions", tone: "crimson" },
      { label: "Progress, not chasing", tone: "green" },
    ],
  },
  {
    id: "handoff",
    eyebrow: "Writer-ready handoff",
    title: "Give writers a source of truth—not a messy transcript",
    paragraphs: [
      "Keep client answers, writer perspective, and article direction together in one workspace before the brief, outline, and draft begin.",
      "Writers arrive with the details that make a good article credible, specific, and on-brand.",
    ],
    desktopImage: "/images/landing/agency-flow/client-interview-workspace.png",
    mobileImage: "/images/landing/agency-flow/client-interview-workspace.png",
    imageWidth: 1354,
    imageHeight: 636,
    imageAlt:
      "Inkwell article workspace showing client and writer interview material",
    reverse: true,
    signals: [
      { label: "Client context", tone: "amber" },
      { label: "Writer expertise", tone: "crimson" },
      { label: "Approved source material", tone: "green" },
    ],
  },
];
