# Consultant new article design QA

final result: passed

## Target and evidence

- Selected layout: third displayed full-page mockup, Writing Canvas, saved at `design-evidence/consultant-new/approved-option-3.png`.
- User's additional requirement: five length choices, with the supplemental approved menu saved at `design-evidence/consultant-new/approved-length-menu.png`. This menu is a shared control detail, not a fourth layout choice.
- Implementation: `http://localhost:3000/consultant/new` in the existing signed-in Chrome session.
- Desktop captures: `desktop-final.png`, `desktop-footer.png`, and `length-menu.png` under `design-evidence/consultant-new/`.
- Source bitmap: 1487 × 1058. Native browser capture: 1366 × 768; content viewport is 1366 × 680 after removing 86px of browser chrome. Density was normalized by proportionally resizing the reference to 1366px wide.
- Combined full-page comparison: `design-evidence/consultant-new/comparison.png`, reference left and implementation right. Implementation is stitched from actual top and footer captures at a 316px scroll offset, using the top 680px plus the final 316px of the footer capture. It is not a single browser full-page raster. Cursor highlights and development indicators remain screenshot artifacts.
- Focused field comparison: `design-evidence/consultant-new/comparison-fields.png`, reference left, implementation right. Both show empty required fields and the same placeholder copy.
- Responsive evidence: `mobile-top.png` and `mobile-footer.png`, captured with Chrome responsive emulation at 390 × 844 CSS pixels and fit-to-window scaling. These show content reflow and the reachable primary action, not a 1:1 mobile bitmap comparison.

## Fidelity review

No actionable P0/P1/P2 mismatches remain.

- Fonts: actual Inkwell Newsreader headings/title input and Manrope interface/body text are retained. Title and description are real editable fields with persistent labels and explicit required indicators.
- Layout: centered open canvas, back link, editorial heading, underlined title input, spacious unboxed description, collapsed optional disclosure, quiet next-step explanation and one crimson continuation action follow the approved structure. The form scrolls naturally on shorter desktop and mobile viewports.
- Color: existing paper, navy, crimson, muted and divider tokens are used. Borders and focus treatments stay restrained. Native select option highlights follow the operating system instead of the generated menu's custom blush highlight; this intentionally preserves native keyboard and mobile select behavior.
- Assets: no raster illustration assets are required in this layout. Existing wordmark and Phosphor arrow/chevron icons are reused. The mockup is reference material, not a screenshot substituted for the interface.
- Copy: heading, helper, placeholders, optional disclosure and continuation label match the selected direction. The optional summary reflects the selected length. Reader takeaway remains available as an existing field even though the supplemental menu crop does not show it.
- Existing owner-only Generation performance navigation and experience switcher remain available. The selected mock depicts ordinary navigation; the app preserves this existing owner capability.

## Interaction verification

- Live browser: opened optional preferences, inspected all five select options, selected In-depth and observed the summary update. Collapsed preferences and checked the responsive layout at 390 × 844, including the full-width continuation button below the form. Restored desktop, refreshed to Standard/empty inputs, and left the new article screen open.
- No article was created in the user's account and no microphone session or paid model generation was started during manual QA.
- Form tests exercise saved title/description/audience/length, direct navigation to interview preparation, and retry after interview-creation failure without creating a duplicate article. Required fields and selected length use real form controls.
- Browser console inspection showed development HMR messages and extension initialization; no application error was observed in the inspected console.

## Backend completion

- API accepts short, standard, long, extended and in_depth.
- Additive migration `20261124_0022` was applied to the local development database. New lengths are allowed only for consultant articles. Downgrade refuses while longer articles exist rather than rewriting user data.
- Longer lengths are persisted and included in queued generation snapshots, verified with the isolated PostgreSQL test database.
- Direct drafting instructions include all five target ranges and preserve source fidelity over padding. Extended/In-depth have larger writing/editing/repair output budgets and a minimum 240-second request timeout for larger model responses.
- Existing rate-limit changes in the working tree were preserved. Optional metrics guards were made explicit for type checking. An existing integration fixture username was corrected from an invalid hyphenated name to an underscore name.
- Restart an already-running consultant worker to load the changed Python code. Uvicorn reload handles the API when running in development mode. Actual paid-model output lengths and latency were not measured; word ranges are targets rather than guarantees.

## Validation

- Frontend TypeScript: passed.
- Frontend scoped ESLint: passed.
- Frontend focused Vitest: 7 passed.
- Backend scoped Ruff: passed.
- Backend mypy on writer and consultant schema: passed.
- Backend consultant unit, length, rate-limit and integration tests: 55 passed.
- Whitespace checks: passed.
- Existing E2E expectations were updated for the native length select and direct interview-preparation handoff. Playwright E2E was not executed.
- The isolated test database was stopped after verification. Development database and application remain running.

## Comparison history and follow-up

The combined visual comparison and focused field view found the approved structure intact, with no required visual fixes. The stitched capture overlap was corrected before accepting comparison evidence. Small differences in generated type proportions, interface text size and vertical rhythm are P3 refinements; production uses the actual product fonts. Native select styling is an intentional implementation choice rather than a custom-menu fidelity claim.

## Implementation checklist

- [x] Third displayed page layout implemented.
- [x] Five functional length choices included.
- [x] Database, API, prompt and model budgets updated together.
- [x] Retry does not duplicate a saved article.
- [x] Desktop/mobile and expanded/collapsed states inspected.
- [x] Combined visual comparison reviewed.
- [x] Relevant tests and type/lint checks passed.
