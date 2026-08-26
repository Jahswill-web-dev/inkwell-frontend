export type ArticleStage = "Draft" | "Outline" | "Brief" | "Review" | "Idea";

export type DashboardArticle = {
  title: string;
  stage: ArticleStage;
  progress: number;
  words?: string;
  edited: string;
};

export const desktopArticles: readonly DashboardArticle[] = [
  {
    title: "Why Great Ideas Are Hard to Write Down",
    stage: "Draft",
    progress: 62,
    words: "1,248",
    edited: "2m ago",
  },
  {
    title: "The Power of Intentional Thinking",
    stage: "Outline",
    progress: 34,
    words: "872",
    edited: "Yesterday",
  },
  {
    title: "Building Better Habits That Stick",
    stage: "Brief",
    progress: 18,
    words: "312",
    edited: "2 days ago",
  },
  {
    title: "Designing a Life of Meaning",
    stage: "Review",
    progress: 91,
    words: "2,103",
    edited: "3 days ago",
  },
];

export const mobileArticles: readonly DashboardArticle[] = [
  {
    title: "Why Great Ideas Are Hard to Write Down",
    stage: "Draft",
    progress: 62,
    edited: "2m ago",
  },
  {
    title: "The Case for Slower Thinking",
    stage: "Draft",
    progress: 48,
    edited: "1h ago",
  },
  {
    title: "Turning Notes into Narrative",
    stage: "Outline",
    progress: 23,
    edited: "Yesterday",
  },
  {
    title: "On Writing With Clarity and Purpose",
    stage: "Idea",
    progress: 12,
    edited: "3d ago",
  },
];
