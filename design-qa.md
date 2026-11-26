# Ask AI — approved option 2

final result: passed

## Findings and fixes

- Resolved P2, typography: the first browser render inherited Manrope for the modal heading because the proposed display variable was not a runtime CSS variable. Bound the heading to the existing Newsreader variable and tuned the type sizes against the approved image. Final combined comparisons confirm the serif heading and readable input, context, and actions.
- Resolved P2, keyboard return: applying a proposal removed the review trigger and initially left focus on the document body. Added a connected-trigger fallback to the toolbar Ask AI control. A subsequent browser approval returned focus to that control and restored scrolling; the integration test also asserts this.
- Resolved P2, recovery: submission and approval errors must be visible inside the active modal rather than behind its backdrop. Added inline error feedback to both request and review surfaces. Integration tests cover failures while preserving the request and saved draft.
- No actionable P0/P1/P2 visual findings remain. P3: minor icon shape and font rasterization differences from the generated image remain acceptable. The existing centered article, navigation, and account control are intentionally retained rather than repositioning the surrounding workspace to follow incidental background changes in the generated mockup.

## Source and comparison evidence

Selected source: `design-evidence/consultant-ask-ai/approved-option-2.png`, the second displayed generated image from the latest Ask AI ideation set. The source is a centered white modal on the existing article workspace.

Final desktop: `desktop-final.jpg`, 1487 × 1058 pixels at a matching 1487 × 1058 CSS viewport and 1x density. `comparison-full.png` places the source left and implementation right, both equally reduced to 744 × 529. `comparison-modal.png` places identical 701 × 650 crops together at native size. Both combined comparisons were opened and inspected after the final typography refinement.

Responsive evidence: `mobile.jpg` (390 × 844), `mobile-small.jpg` (320 × 568), and `tablet.jpg` (834 × 1194). The short mobile viewport scrolls the form body while preserving reachable header and footer controls; measured document width was 320px at the 320px viewport. Additional states: `progress.jpg`, `review.jpg`, `clarification-mobile.jpg`, `failure-mobile.jpg`.

Previous article-workspace QA is archived as `previous-article-qa.md`.

## Required fidelity surfaces

- Typography: existing Newsreader for Ask AI; Manrope for controls and request content. The article retains its editorial typography. Explicit responsive sizes keep mobile inputs at 16px.
- Spacing/layout: a centered 700px modal, 34px desktop content gutters, large request field, lightweight prompt pills, one divider and a clear footer action. On mobile the dialog fits the viewport with 16px outer gutters, a scrollable body and stacked footer.
- Colors/tokens: existing navy, crimson, paper, white, muted and divider tokens. Subtle neutral backdrop, restrained shadow, crimson focus treatment and primary action.
- Assets/icons: no raster artwork is required or embedded in the application. Existing Phosphor Sparkle, FileText, Microphone and X icons replace generated approximations. The approved bitmap is retained only as design evidence.
- Copy/content: concise source labels and reassurance are implemented. Short prompt labels still submit the original supported backend instructions. The context line explains use of the draft and interview. Progress reflects plan, optional research, writing and preview preparation; it no longer advertises an independent accuracy review.

## Behavior and validation

The request, polling, proposal, sources, comparison, rejection and approval contracts remain connected to the existing backend. The saved draft changes only on approval. This change adds no conversational memory, scope selector or independent fact-checking feature.

Browser verification used the real ConsultantArticleScreen and Lexical editor with an isolated, development-only sample article and in-memory API responses. It exercised submit/progress, review comparison, close/return, rejection without draft mutation, approval, clarification, failure/retry, mobile and tablet layouts. The background becomes inert, keyboard focus stays within the active modal, Escape restores focus, and scrolling is restored on close. Final browser error logs were empty. No live AI call or stored user-article mutation was made.

19 focused tests passed across article and generation components. The article tests cover request submission, focus/scroll behavior, retained requests, inline request and approval failures, versioned approval, and the existing article editing/export behaviors. TypeScript and targeted ESLint checks passed. Existing Playwright selectors were updated for the new labels; the Playwright CLI suite was not run.

The temporary preview page was removed after verification. No authentication rules or production API routes were changed. The frontend dev server remains available on port 3000.

## Checklist

- [x] Implement the exact second displayed design.
- [x] Preserve existing AI request and review-before-apply behavior.
- [x] Match source and render in full and focused combined comparisons.
- [x] Inspect responsive, keyboard and recovery states.
- [x] Preserve user data and remove the sample preview route.
