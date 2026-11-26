# AI suggestion review — approved option 2

final result: passed

## Findings and fixes

- Resolved P2, reading hierarchy: the initial title included “broken” on the first line and inherited paragraph line height made the tracked content substantially taller than the source. Constrained the title measure, set explicit review prose line height, and adjusted legend spacing. `desktop-first.jpg` / `comparison-first.png` show the initial state; `desktop-final.jpg`, `comparison-final.png`, and `comparison-reading.png` show the corrected render.
- Resolved P2, return behavior: the former preview close reopened the Ask AI modal. “Back to article” and Escape now close both review and assistant, preserve the proposal, restore scrolling and focus the article toolbar trigger. Browser verification and an integration test cover this behavior.
- Resolved P2, error visibility: approval errors rendered at the top of the reading content could be missed after scrolling. Errors now stay in the fixed footer beside the decision controls. `conflict-mobile.jpg` shows a stale-draft error with both actions reachable; the alert was measured within the 390 × 844 viewport.
- Resolved P2, narrow controls: reduced compact control sizes below 360px so Back to article and Show changes share one row and neither approval label wraps. `mobile-small.jpg` and `mobile-small-scrolled.jpg` show the 320 × 568 view at the start and end of the article, with the action bar fixed in place.
- No actionable P0/P1/P2 findings remain.

## Source and comparison evidence

Source: `design-evidence/consultant-review/approved-option-2.png`, the second displayed mockup in the latest review ideation set, with a full-page reading surface and inline change markers.

The source and final desktop render are each 1487 × 1058 pixels, at a matching CSS viewport and 1x density. `comparison-final.png` pairs source left and implementation right at equal 744 × 529 reductions. `comparison-reading.png` pairs corresponding 900 × 680 article crops at equal 675 × 510 reductions. Both combined comparisons were opened and inspected. The initial comparison is retained as `comparison-first.png`.

Other evidence: `clean-view.jpg`, `mobile.jpg` (390 × 844), `tablet.jpg` (834 × 1194), `mobile-small.jpg` and `mobile-small-scrolled.jpg` (320 × 568), and `conflict-mobile.jpg`. The final narrow captures used a fresh preview tab at the target viewport after an earlier resized-browser capture contained compositor artifacts. The fresh capture and DOM measurements agree: content width 320px, footer entirely inside the viewport, and article body scrolls independently.

Previous Ask AI modal QA is archived as `previous-ask-ai-qa.md`.

## Required fidelity surfaces

Typography: existing Newsreader and Manrope. The editorial title wraps before “broken handoffs”; serif prose and section headings retain the selected hierarchy. Explicit line height prevents surrounding application styles from changing the reading rhythm. Mobile scales the title and controls without horizontal overflow.

Spacing/layout: full-page review surface, existing brand/navigation language, compact review toolbar, centered reading column, one Show changes switch, and a fixed footer. The body scrolls while Back to article and approval actions stay accessible. No duplicate current/proposed article panels or boxed diff summaries remain.

Colors/tokens: existing navy, crimson, warm paper, white, muted and divider tokens. Removed text has rose highlighting and strikethrough; added text has pale green highlighting. Text labels and screen-reader annotations communicate the changes independently of color.

Assets/icons: no bitmap artwork or generated screenshot is embedded in the interface. The existing wordmark, Phosphor ArrowLeft and standard form controls are used. Source bitmap is design evidence only.

Copy/content: request and summary are data-driven. Both original and proposed content are preserved in the change view; the clean view contains only the proposal. The real second-paragraph edit removes more words than the illustrative mock shows, so its mark is intentionally longer. Full rewrites, section deletion, additions and moves remain reviewable. Source links, lists and inline formatting are preserved. The footer describes approval accurately, and its actions apply or reject the complete proposal.

P3 differences: small font-rasterization/icon and navigation-spacing differences remain; the precise change spans follow the actual source/proposal rather than copying incomplete marks from the generated bitmap. These do not change hierarchy or behavior.

## Behavior and validation

The real ConsultantArticleScreen now hosts ConsultantReview. Existing apply/reject endpoints and version headers are retained. Applying is blocked when there are unsaved edits. Closing preserves the suggestion; rejection preserves the current draft; approval replaces the complete draft. Background content remains inert and focus returns to the article control.

Browser interaction verification used a temporary development-only sample article with isolated in-memory API responses through the real request client and article component. It exercised opening, tracked/clean toggle, closing, Escape, rejection, approval on a narrow screen, restored focus/scrolling, and a simulated stale-draft response. A second temporary render of the actual review component was used solely to obtain a clean narrow-viewport visual capture and verify scrolling. Both temporary preview files were removed. No stored user article or live model call was changed or triggered. Final browser error logs were empty.

26 focused tests passed: 12 article integration tests, 6 review tests and 8 generation tests. Review coverage includes rich links/formatting, unsafe URL handling, complete section deletions/full rewrites with new IDs, moves without false text changes, clean-view content, dirty-state approval protection, and long rewrite preservation. Long sections use a bounded block comparison instead of the previous unbounded word-level matrix. TypeScript and targeted ESLint passed. Existing Playwright labels/selectors were updated; the Playwright CLI suite was not run.

## Checklist

- [x] Build the exact second displayed review concept.
- [x] Preserve the existing backend proposal and approval contracts.
- [x] Compare source and render together at matching dimensions.
- [x] Verify tracked/clean views, complete removals, responsive controls and recovery.
- [x] Preserve user data and remove temporary preview routes.
