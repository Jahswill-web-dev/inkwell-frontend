# Draft Editor Design QA

## Evidence

- Source visual truth:
  - `public/designs/mvp/draft-editor-desktop.png`
  - `public/designs/mvp/draft-editor-mobile.png`
- Browser-rendered implementation captures:
  - `design-reference/draft-implementation-desktop.png`
  - `design-reference/draft-implementation-mobile.png`
- Combined comparison evidence:
  - `design-reference/qa-comparison-draft-desktop.png`
  - `design-reference/qa-comparison-draft-mobile.png`
- Desktop normalization: source `1487 × 1058` pixels normalized to the `1488 × 1058` CSS viewport; implementation captured at `1488 × 1058`, device scale factor 1.
- Mobile normalization: source `852 × 1846` pixels treated as a 2× design export and normalized to the `426 × 923` CSS viewport; implementation captured at `426 × 923`, device scale factor 1.
- State: Introduction active, the reference sentence selected with native browser selection, writing assistant open, first checklist item complete, no suggestion or dialog open.
- Focused comparison: desktop editor/toolbar and assistant panel plus the mobile selected-text region, bottom sheet, and bottom navigation were compared at readable scale in the combined images.

## Findings

- No actionable P0, P1, or P2 visual differences remain in the local browser-rendered comparison evidence.
- Fonts and typography: the implementation uses Newsreader for article content and Manrope for product UI, with matching editorial hierarchy, line lengths, and wrapping at both reference viewports.
- Spacing and layout: the desktop sidebar, outline rail, editor, toolbar, and assistant proportions align with the source. The mobile header, article viewport, half-height assistant sheet, and fixed tool navigation align with the normalized source.
- Colors and tokens: navy, crimson, paper, selection blue, borders, and muted copy use the existing Inkwell tokens and closely match the references.
- Image and icon fidelity: the supplied Inkwell logo assets are used directly, and all interface icons use the established Phosphor family. No placeholder or custom-drawn image substitutes were introduced.
- Copy and content: visible article and assistant copy matches the reference. The live seeded word count is `279` instead of the static reference value `1,248`; this is intentional because the implementation derives the count from the editable document.
- Native selection handles are browser/platform-owned and therefore are not simulated in the desktop Playwright capture.

## Comparison History

1. Initial capture exposed a sans-serif article surface, centered desktop content drift, an obscured mobile article header, and overly tall mobile checklist rows.
2. The editorial font was corrected to Newsreader, the desktop article and toolbar were aligned to the reference grid, the supplied pen logo was accurately cropped in its viewport, and mobile article/sheet spacing was normalized.
3. Final combined comparisons show no remaining actionable P0/P1/P2 visual differences in the captured states.

## Verification

- Primary interactions tested: outline-to-draft navigation, editing, formatting toolbar visibility, section state, autosave and reload recovery, offline status, assistant suggestion/retry/reject, preview, ready-for-review confirmation, and mobile tab switching.
- Console errors checked by Playwright: none.
- Unit tests: 60 passed.
- Playwright: 40 passed and 2 intentionally skipped across desktop and mobile Chromium.
- Lint: passed.
- Typecheck: passed.
- Production build: passed.
- Blocking limitation: neither the in-app browser nor connected Chrome browser was available to this session, so the Product Design browser-choice requirement could not be completed even though local Playwright captures and comparisons were produced.

final result: blocked
