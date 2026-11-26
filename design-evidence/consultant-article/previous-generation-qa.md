# Initial draft generation — approved option 2

final result: passed

## Source and comparison

Source visual truth: `design-evidence/consultant-generation/approved-option-2.png`, the second displayed mockup (editorial text on the left and vertical progress steps on the right). Source size is 1487 × 1058 pixels.

Implementation: the new `ConsultantGeneration` component rendered inside the actual consultant shell and root font setup. A temporary development-only fixture supplied fixed writing, queued, saving and failed states without triggering paid generation or altering stored articles. The fixture was removed after capture. The real article component uses this view when an initial generation has no draft sections; existing draft editing and Ask AI retain their existing flows.

Final screenshot: `design-evidence/consultant-generation/desktop-final.png`, captured in the in-app browser at 1487 × 1058 CSS pixels with an explicit matching clip. Both source and final screenshot are 1487 × 1058 pixels at 1x density. `comparison-final.png` pairs source left and render right, each equally downsampled to 744 × 529. `comparison-focused.png` pairs equal 660 × 740 crops of the heading, reassurance, title and action, each normalized to 396 × 444. Both combined comparisons were opened and inspected together.

`laptop-final.png` records 1366 × 768. `mobile-final.png` is the full scrollable page from a 390 × 844 CSS viewport; measured document width and viewport width are both 390px, with no horizontal overflow. `mobile-failure.png` and `mobile-saving.png` show additional states. The mobile reference was not supplied; the responsive adaptation retains the same type and colors and places progress before the exit action.

## Findings and iteration history

- Resolved P2: the first desktop render wrapped the display heading into two lines and pulled the article context/action upward, changing the source's main proportions. Constrained the heading to 600px and used natural wrapping rather than balanced wrapping. The final desktop render has the approved three-line structure. Adjusted title type, action width and step-column spacing to preserve the source hierarchy.
- Resolved P2: the first mobile render put the exit button before the progress list. Reordered the existing elements on narrow screens so users encounter progress before leaving. The final mobile capture confirms the corrected order.
- Initial evidence: `desktop-first.png`, `mobile-first.png`, `comparison-initial.png`. The initial browser screenshot was 1487 × 996 despite a 1058px requested viewport; that comparison is historical, not final fidelity evidence. The final explicit clip corrects this mismatch.
- No actionable P0/P1/P2 differences remain.

## Required fidelity surfaces

- Typography: existing Newsreader display and Manrope UI fonts are retained. The desktop heading uses 80px type with the source's three-line wrapping; short desktop and mobile have readable smaller overrides. Article context, supporting text and action hierarchy match the selected composition. The existing navigation's smaller type is intentionally preserved.
- Spacing/layout: open two-column surface, restrained back link, crimson eyebrow, thin short divider, article context and prominent lower action match the source. Compact laptop sizing keeps the action visible. Narrow screens stack the content with normal vertical scrolling.
- Colors/tokens: existing paper, navy, crimson, muted, divider and hover colors are reused. No new palette, heavy panels or shadows were introduced.
- Assets: no custom raster illustration is present in this mockup. The existing product wordmark/shell and Phosphor ArrowLeft, CheckCircle, CircleNotch, Circle and WarningCircle icons are used. Spinner rotation honors reduced-motion preferences. No screenshot, handwritten SVG or approximate artwork is embedded in the UI.
- Copy/content: the chosen writing-state heading, title, reassurance, stage labels and exit action are retained. Waiting and retry copy reflect actual job states. No invented percentage, ETA, notification or public-research step is shown.

P3 follow-up: generated-font rasterization, icon arc geometry and existing navigation scale differ slightly from the bitmap reference. These do not change the layout or function.

## Behavior and checks

- Eight integration tests passed through the real article component: initial progress without premature editing tools, queued and retry-queued states, polling through saving to the article editor, polling stopping on completion, retrying the same failed job, progress refresh recovery, preservation of existing draft content, and separation from Ask AI requests.
- Browser checks covered writing, queued, saving and failed states, the retry interaction, desktop/laptop/mobile layouts and the Back to my articles link. In the unauthenticated in-app browser, that link correctly reaches sign-in with `/consultant` as the return destination. The temporary fixture retry only changes fixture state; the actual retry API call is verified by integration tests.
- Browser error logs were empty after the final state checks. No real model call or microphone session was needed for this UI pass.
- TypeScript, targeted ESLint, Prettier and whitespace checks passed. Backend source and database schema were not changed for this screen.
- Existing generation polling stays in the article page. Successful generation automatically restores the editor. Failed jobs retain retry and readable error feedback; temporary polling errors offer Refresh progress.

## Checklist

- [x] Build the exact second displayed mockup using existing brand assets.
- [x] Connect initial progress, waiting, saving and retry states.
- [x] Preserve existing article and Ask AI behavior.
- [x] Compare source and render at matching dimensions and state.
- [x] Resolve P2 issues and inspect the final full/focused comparisons.
- [x] Verify responsive layouts and meaningful state transitions.
- [x] Remove the temporary visual fixture and preserve earlier QA in `previous-live-qa.md`.

Local services verified after restart: API health is ok, readiness is ready, PostgreSQL is healthy, and the consultant worker is running. Frontend remains available at http://127.0.0.1:3000. No real generation was requested during verification.
