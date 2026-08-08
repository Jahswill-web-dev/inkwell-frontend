import type { Icon } from "@phosphor-icons/react";
import {
  Article,
  Briefcase,
  Buildings,
  FileText,
  GraduationCap,
  Lightbulb,
  LightbulbFilament,
  PencilSimple,
  User,
} from "@phosphor-icons/react";

export type WritingGoalId =
  | "blog-posts"
  | "educational-articles"
  | "thought-leadership"
  | "company-content"
  | "personal-essays"
  | "something-else";

export type WritingGoal = {
  id: WritingGoalId;
  label: string;
  description: string;
  desktopIcon: Icon;
  mobileIcon?: Icon;
};

export const WRITING_GOALS: readonly WritingGoal[] = [
  {
    id: "blog-posts",
    label: "Blog posts",
    description: "Inform, engage, and grow your audience.",
    desktopIcon: Article,
    mobileIcon: FileText,
  },
  {
    id: "educational-articles",
    label: "Educational articles",
    description: "Teach concepts and explain ideas clearly.",
    desktopIcon: GraduationCap,
  },
  {
    id: "thought-leadership",
    label: "Thought leadership",
    description: "Share insights and build authority.",
    desktopIcon: Lightbulb,
    mobileIcon: LightbulbFilament,
  },
  {
    id: "company-content",
    label: "Product and company content",
    description: "Communicate value and drive impact.",
    desktopIcon: Buildings,
    mobileIcon: Briefcase,
  },
  {
    id: "personal-essays",
    label: "Personal essays",
    description: "Share stories and personal perspectives.",
    desktopIcon: User,
  },
  {
    id: "something-else",
    label: "Something else",
    description: "A mix of formats or something different.",
    desktopIcon: PencilSimple,
  },
];

export const DEFAULT_WRITING_GOALS: readonly WritingGoalId[] = [
  "blog-posts",
  "educational-articles",
];
