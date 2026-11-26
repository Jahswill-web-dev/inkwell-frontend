# Interview preparation — approved option 2

final result: passed

## Current revision — supplied three-row icon layout

Applied the user's latest reference (`design-evidence/consultant-preparation/approved-icon-rows.png`): three left-aligned rows with Clock, ChatCircle and PauseCircle Phosphor icons, matching copy, and thin token-based dividers above, between and below the rows. The list is centered at a maximum 560px width and uses the existing Manrope typography and Inkwell colors. This supersedes the side-by-side duration/reassurance grouping below.

Latest evidence: `icon-rows-desktop.png`, `icon-rows-mobile.png`, and `icon-rows-content.png` in the same directory. Inspected desktop 1366 × 768 native capture and 390 × 844 CSS mobile viewport fitted to the window. All three rows, CTA and microphone notice fit. `icon-rows-comparison.png` pairs the supplied 432 × 110 reference scaled to 560px width with the rendered 560 × 122px list crop. Checked the icon/text alignment, three-row structure, matching text, understated dividers, colors and readable type; existing product font sizing is retained rather than copying compressed screenshot text. No outstanding P0/P1/P2 findings. TypeScript, formatting and whitespace checks passed. Voice start behavior was not changed or exercised.

## Current revision — restored guidance with clearer grouping

The user asked to restore the removed text and improve its positioning. Restored the eyebrow, complete explanation and reassurance. The explanation is now a muted 640px-wide block directly under the title. Duration and reassurance share a compact row on desktop, then stack with an 8px gap on mobile. Supporting type, CTA size and group spacing are reduced from the original layout to keep the article title prominent. This revision supersedes the less-text revision below.

Rendered evidence: `design-evidence/consultant-preparation/regrouped-desktop.png` and `regrouped-mobile.png`. Inspected 1366px desktop, 683px intermediate window and 390 × 844 CSS mobile viewport. All guidance and the start action remain visible; mobile stacks the metadata without horizontal overflow. Existing colors and typography are retained. Formatting and whitespace checks passed. Voice behavior was unchanged, so the existing passing integration coverage was not rerun for these presentational changes. No real conversation or microphone access was started.

## Latest revision — less text

The user requested reduced copy after reviewing the implementation. Removed the eyebrow, explanatory paragraph, reassurance sentence, and separator. Retained the article title, duration, start button and microphone notice. This supersedes the copy fidelity notes below; the earlier mockup remains the layout reference.

Latest rendered evidence: `design-evidence/consultant-preparation/simplified-desktop.png`. Visually checked at full desktop and a narrower 683px window: the remaining content is centered, readable, and the primary action stays visible. The two existing interview integration tests, Prettier check and whitespace check passed. No voice session was started. Mobile was not separately recaptured for this copy-only revision.

## Evidence and state

- Source visual truth: `design-evidence/consultant-preparation/approved-option-2.png`, the selected centered welcome mockup (1487 × 1058 pixels).
- Implementation: `/consultant/interviews/ff84594a-d60e-4d00-ae78-bdf6ba77b57e`, authenticated preparation state using the user's existing article. Its stored title says “wont”; user data was preserved.
- Tall desktop: `design-evidence/consultant-preparation/desktop-tall.png`. Chrome responsive viewport 1487 × 1058 CSS pixels, fit-to-window displayed at approximately 50%. Native capture 1366 × 768; content crop is 744 × 529 at (20,154). Source downsampled to the same 744 × 529 dimensions. This is a normalized composition comparison, not pixel-exact rendering or unscaled device density.
- Full comparison: `design-evidence/consultant-preparation/comparison-full.png` (source left, implementation right).
- Focused comparison: `design-evidence/consultant-preparation/comparison-focused.png`, paired heading, description, guidance, CTA and microphone notice. Both regions enlarged equally for inspection.
- Laptop: `design-evidence/consultant-preparation/desktop-final.png`, native 1366 × 768 screenshot, approximately 1352 × 679 content viewport excluding scrollbar and browser chrome. Content-only export: `desktop-content.png` in the same directory.
- Mobile: `design-evidence/consultant-preparation/mobile.png`, Chrome 390 × 844 CSS viewport fitted to the native window. Content-only export: `mobile-content.png` (274 × 591 display pixels). Title wraps, navigation stacks, CTA fits without horizontal overflow, and microphone guidance remains visible.
- Previous create-article QA archived at `design-evidence/consultant-preparation/previous-new-article-qa.md`.

## Findings and comparison history

- Resolved P2: initial laptop layout placed the primary action below the fold (`desktop-first.png`). Added spacing and type adjustments for desktop viewports at most 800 CSS pixels tall. Post-fix `desktop-final.png` shows the full start button and microphone notice.
- Resolved P2: initial tall-screen content was undersized relative to the mockup (`comparison-initial.png`). Increased display heading to 68px, description to 26px, guidance to 24px, CTA to 420 × 78px, and adjusted content width and vertical spacing. Preserved compact laptop and mobile overrides. Post-fix full and focused comparisons show the intended two-line headline, centered hierarchy, separator and prominent crimson CTA.
- No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces

- Fonts/typography: existing Newsreader headings and Manrope UI retained. Tall-screen headline wraps before “broken handoffs,” matching the source structure; smaller viewport overrides retain legibility. Minor image-generation/font-rasterization differences are acceptable.
- Spacing/layout: centered column, back link, thin separator, duration, reassurance, CTA and notice match the selected layout. Short screens use reduced spacing to keep the action reachable.
- Colors/tokens: existing paper, navy, crimson, muted and divider tokens used. No new palette introduced.
- Image quality/assets: no raster artwork required. Existing wordmark and Phosphor ArrowLeft, Clock and Microphone icons used. No screenshot embedded into the live UI.
- Copy/content: approved welcome text, duration, pause reassurance and microphone notice preserved. Dynamic article title comes from existing data. Existing application navigation, including Generation performance and experience selector, remains functional.

## Behavior and validation

- Browser inspection covered authenticated laptop, tall desktop and mobile preparation layouts. The inspected Chrome console output showed development Fast Refresh messages and no visible application errors; this is not an exhaustive runtime error audit.
- Existing article → Resume interview opens preparation. No real conversation was started and no browser microphone permission was accepted during verification.
- Integration tests confirm opening preparation does not call voice.start; clicking Start conversation calls it once and shows existing live interview controls. Completed interviews still redirect to their article.
- TypeScript and targeted ESLint passed. Nine relevant tests passed across consultant-interview.test.tsx and consultant-start.test.tsx. Formatting passed. Final whitespace check recorded separately below.

## Follow-up polish and limits

- P3: existing application navigation and small icon scale differ slightly from the generated mockup; retained the established shell and icon system.
- Live microphone/provider streaming was not exercised; its existing implementation is unchanged.

## Implementation checklist

- [x] Replace the pre-start view with the selected centered welcome.
- [x] Preserve explicit voice start and completed-interview routing.
- [x] Verify responsive layouts and compare source plus implementation together.
- [x] Resolve P2 layout issues and capture post-fix evidence.
- [x] Pass relevant checks and preserve previous screen's QA.
