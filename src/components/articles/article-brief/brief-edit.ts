import {
  articleBriefPatchSchema,
  type ArticleBrief,
  type ArticleBriefPatch,
} from "@/lib/articles/brief";

export type BriefEditState = {
  summary: string;
  coreAngle: string;
  audienceInsights: string;
  toneAndStyle: string;
  keyTakeaways: string;
  evidenceGaps: string;
  callToAction: string;
  suggestedTitles: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  metaDescription: string;
};

const lines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export function createBriefEditState(brief: ArticleBrief): BriefEditState {
  return {
    summary: brief.summary,
    coreAngle: brief.core_angle,
    audienceInsights: brief.audience_insights.join("\n"),
    toneAndStyle: brief.tone_and_style,
    keyTakeaways: brief.key_takeaways.join("\n"),
    evidenceGaps: brief.evidence_gaps.join("\n"),
    callToAction: brief.call_to_action,
    suggestedTitles: brief.seo.suggested_titles.join("\n"),
    primaryKeyword: brief.seo.primary_keyword,
    secondaryKeywords: brief.seo.secondary_keywords.join("\n"),
    metaDescription: brief.seo.meta_description,
  };
}

export function changedBriefFields(
  original: ArticleBrief,
  draft: BriefEditState,
): ArticleBriefPatch | null {
  const patch: Record<string, unknown> = {};
  const addText = (key: string, value: string, previous: string) => {
    const normalized = value.trim();
    if (normalized !== previous) patch[key] = normalized;
  };
  const addList = (key: string, value: string, previous: string[]) => {
    const normalized = lines(value);
    if (JSON.stringify(normalized) !== JSON.stringify(previous))
      patch[key] = normalized;
  };

  addText("summary", draft.summary, original.summary);
  addText("core_angle", draft.coreAngle, original.core_angle);
  addList(
    "audience_insights",
    draft.audienceInsights,
    original.audience_insights,
  );
  addText("tone_and_style", draft.toneAndStyle, original.tone_and_style);
  addList("key_takeaways", draft.keyTakeaways, original.key_takeaways);
  addList("evidence_gaps", draft.evidenceGaps, original.evidence_gaps);
  addText("call_to_action", draft.callToAction, original.call_to_action);

  const seo: Record<string, unknown> = {};
  const addSeoText = (key: string, value: string, previous: string) => {
    const normalized = value.trim();
    if (normalized !== previous) seo[key] = normalized;
  };
  const addSeoList = (key: string, value: string, previous: string[]) => {
    const normalized = lines(value);
    if (JSON.stringify(normalized) !== JSON.stringify(previous))
      seo[key] = normalized;
  };
  addSeoList(
    "suggested_titles",
    draft.suggestedTitles,
    original.seo.suggested_titles,
  );
  addSeoText(
    "primary_keyword",
    draft.primaryKeyword,
    original.seo.primary_keyword,
  );
  addSeoList(
    "secondary_keywords",
    draft.secondaryKeywords,
    original.seo.secondary_keywords,
  );
  addSeoText(
    "meta_description",
    draft.metaDescription,
    original.seo.meta_description,
  );
  if (Object.keys(seo).length) patch.seo = seo;

  if (!Object.keys(patch).length) return null;
  return articleBriefPatchSchema.parse(patch);
}
