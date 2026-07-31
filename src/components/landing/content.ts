export type NavigationLink = {
  label: string;
  href: string;
};

export type WorkflowStage = {
  id: "idea" | "brief" | "outline" | "write" | "review" | "export";
  label: string;
};

export type ProductFeatureContent = {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs: readonly string[];
  desktopImage: string;
  mobileImage: string;
  imageAlt: string;
  reverse?: boolean;
  signals?: readonly {
    label: string;
    tone: "amber" | "crimson" | "green";
  }[];
};

export const navigationLinks: readonly NavigationLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
];

export const workflowStages: readonly WorkflowStage[] = [
  { id: "idea", label: "Idea" },
  { id: "brief", label: "Brief" },
  { id: "outline", label: "Outline" },
  { id: "write", label: "Write" },
  { id: "review", label: "Review" },
  { id: "export", label: "Export" },
];

export const productFeatures: readonly ProductFeatureContent[] = [
  {
    id: "purpose",
    eyebrow: "Outline",
    title: "Give every section a purpose",
    paragraphs: [
      "Set section goals, answer key questions, and let AI keep your structure strong and on track.",
      "Built-in checklists help you cover what matters.",
    ],
    desktopImage: "/images/product/desktop/outline-builder.png",
    mobileImage: "/images/product/mobile/outline-builder.png",
    imageAlt:
      "Inkwell outline builder with section purposes, questions, and word counts",
  },
  {
    id: "write",
    eyebrow: "Write",
    title: "Write with AI, not beneath it",
    paragraphs: [
      "Inkwell’s writing assistant suggests improvements, examples, and transitions while keeping your voice in full control.",
    ],
    desktopImage: "/images/product/desktop/draft-editor.png",
    mobileImage: "/images/product/mobile/draft-editor.png",
    imageAlt:
      "Inkwell article editor with a section goal, checklist, and writing assistant",
    reverse: true,
  },
  {
    id: "review",
    eyebrow: "Review",
    title: "Feedback that reads beyond grammar",
    paragraphs: [
      "Get actionable suggestions for clarity, structure, and voice—so your message lands exactly as intended.",
    ],
    desktopImage: "/images/product/desktop/article-review.png",
    mobileImage: "/images/product/mobile/article-review.png",
    imageAlt:
      "Inkwell review screen showing clarity, structure, and voice feedback",
    signals: [
      { label: "Clarity", tone: "amber" },
      { label: "Structure", tone: "crimson" },
      { label: "Voice", tone: "green" },
    ],
  },
];
