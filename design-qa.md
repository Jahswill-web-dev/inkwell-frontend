# Article Review Design QA

## Evidence

- Source visual truth:
  - `public/designs/mvp/review-screen-editorial-triage-desktop.png`
  - `public/designs/mvp/review-screen-readiness-overview-desktop.png`
  - `public/designs/mvp/article-review-mobile.png`
- Browser-rendered implementation:
  - `design-reference/review-implementation-desktop.png`
  - `design-reference/review-summary-implementation-desktop.png`
  - `design-reference/review-implementation-mobile.png`
  - `design-reference/draft-with-progress-desktop.png`
- Combined comparison evidence:
  - `design-reference/review-comparison-desktop.png`
  - `design-reference/review-comparison-mobile.png`
- Desktop normalization: source and implementation are both `1487 × 1058` pixels at a `1487 × 1058` CSS viewport and device scale factor 1.
- Mobile normalization: source is `852 × 1846` pixels and treated as a 2× export of a `426 × 923` CSS viewport. The Pixel 5 Playwright capture is `1172 × 2538` pixels at device scale factor 2.75 and was resampled to `852 × 1846` for the combined comparison.
- State: Review step current, All issues selected, issue 2 of 7 active, Abrupt transition highlighted, no dialog or manual-edit field open.
- Focused evidence: the original-size desktop triage capture was inspected for the article highlight and right issue panel; the normalized mobile capture was inspected for header, progress, filter strip, article rhythm, and bottom sheet. The readiness and Draft progress captures were inspected separately at original size.

## Findings

- No actionable P0, P1, or P2 visual or interaction differences remain in the captured states.
- Fonts and typography: Newsreader and Manrope match the existing Inkwell references, including editorial heading scale, body line height, UI weights, wrapping, and hierarchy.
- Spacing and layout: desktop sidebar, filters, article column, right panel, readiness split, and Draft header align with the source grid. Mobile header, compact progress, filters, article, and bottom-sheet boundaries remain usable without horizontal overflow.
- Colors and tokens: navy, crimson, paper, selection blue, green readiness, orange attention, borders, and muted text use the existing product tokens and preserve accessible contrast.
- Image and icon fidelity: the supplied Inkwell logo assets are reused directly and controls use the established Phosphor icon family. No placeholder imagery, custom SVG, or generated raster substitute was introduced.
- Copy and content: target article and selected-issue copy match. Additional seeded issues are coherent with the review categories and remain deterministic.
- Accessibility and behavior: progress uses semantic navigation links and `aria-current`; future Export is disabled; filters expose pressed state; issue, dialog, status, and manual-edit controls have accessible names; keyboard focus uses the global visible focus treatment.

## Comparison History

1. Initial desktop capture showed the article centered too far right and excessive issue-panel inset. The article was left-aligned to the reference grid and panel padding was reduced; the revised desktop comparison aligns both major columns.
2. Initial mobile capture placed the article too low and opened an oversized bottom sheet too high on the viewport. Header/progress/filter heights and the sheet maximum height were normalized; the revised comparison restores the source reading area and sheet boundary.
3. Initial readiness capture centered the article more narrowly than the source. Summary padding and article alignment were corrected; the revised readiness view follows the source split.

## Intentional Differences and Follow-up Polish

- The mobile reference shows an older three-stage indicator and a short “Prepare” label. The implementation intentionally uses the requested functional five-step Brief → Export navigation and full “Prepare for publishing” label.
- Desktop triage includes a Review summary affordance so the second supplied state is reachable; the isolated triage reference does not show that control.
- The readiness ring uses the closest Phosphor progress icon rather than custom SVG/CSS art, producing a small P3 shape difference.
- The local development captures include the Next.js development indicator near the lower-left corner; it is development chrome and is absent from the production build.

## Verification

- Primary interactions tested: Draft → Review routing, completed-step navigation, filtering, previous/next issue navigation, accept, ignore, manual revision, persistence across reload, stale-anchor protection, readiness summary, preview, publishing confirmation, and mobile overflow.
- Console and page errors checked by Playwright: none.
- Unit/component tests: 66 passed across 21 files.
- Review Playwright: 4 passed across desktop and mobile Chromium.
- Lint: passed.
- Typecheck: passed.
- Production build: passed.
- In-app browser availability: unavailable in this session; the user-requested local Playwright Chromium run supplied the browser-rendered interaction and screenshot evidence.

final result: passed
