# Export page design QA

## Comparison target

- Desktop source: `public/designs/mvp/export-article-desktop.png`
- Desktop implementation: `design-reference/export-implementation-desktop.png`
- Desktop viewport: 1487 × 1058 CSS px, device scale factor 1; both images are 1487 × 1058 px.
- Mobile source: `public/designs/mvp/export-article-mobile.png` (853 × 1844 px, treated as a 2× design asset).
- Mobile normalized source: `design-reference/export-source-mobile-normalized.png` (426 × 922 px).
- Mobile implementation: `design-reference/export-implementation-mobile.png`
- Mobile viewport: 426 × 922 CSS px, device scale factor 1; normalized source and implementation are both 426 × 922 px.
- State: default Copy formatted text selection, inclusion options expanded, Title/Author/Sources/Article summary selected, Publishing metadata unselected.

## Evidence reviewed

- Full-view side-by-side comparisons:
  - `design-reference/export-comparison-desktop.png`
  - `design-reference/export-comparison-mobile.png`
- Focused regions reviewed within the full-resolution comparisons: desktop progress/header, format rows, inclusion controls, summary preview, fixed action bar; mobile header, selected/disabled format states, disclosure and checkbox rows, compact summary, primary CTA.
- Fonts and typography: Manrope and Newsreader match the existing product and target hierarchy; wrapping, weights, line heights, and editorial title treatment remain stable at both viewports.
- Spacing and layout: desktop sidebar, two-column grid, action bar, mobile stack, card dimensions, row rhythm, and normalized mobile density align without overlap or overflow.
- Colors and tokens: navy, crimson, paper, blue selection, borders, disabled opacity, and warm summary surface map to the target and existing tokens.
- Image and icon quality: existing Inkwell raster logos are used; all UI icons come from the installed Phosphor family. No placeholder imagery, custom SVG, CSS art, or generated asset substitutes are present.
- Copy and content: static UI copy follows the target. Live word count, read time, estimated size, and preview text are derived from the current draft.

## Findings

- No actionable P0, P1, or P2 issues remain.
- Accepted intentional differences:
  - Desktop uses the approved existing five-step Brief/Outline/Draft/Review/Export workflow instead of the mock's four alternate labels.
  - Statistics show the real default draft values (279 words, 2 min read, ~2 KB) instead of hard-coded mock values.
  - PDF and Word remain visibly disabled and include the approved “Coming soon” clarification.
- P3: minor optical differences remain between several Phosphor document glyphs and the mock's source icon artwork; sizing, meaning, alignment, and family consistency are acceptable.

## Interaction and accessibility verification

- Playwright tested Markdown selection and download, disabled PDF/Word controls, mobile inclusion disclosure, responsive visibility, and horizontal overflow in desktop and mobile Chromium projects.
- Component tests cover clipboard fallback, HTML/Markdown downloads, session hydration/persistence, inclusion changes, back navigation, and Review-to-Export navigation.
- Native radio/checkbox controls, semantic fieldsets, disclosure attributes, keyboard focus styles, disabled states, and live status messages are present.
- Browser console and page errors were captured during desktop and mobile end-to-end runs: none were reported.

## Comparison history

1. Initial mobile capture used the raw 853 px asset width as CSS width, exposing a P1 desktop-layout capture and oversized controls. The source was correctly normalized to 426 × 922 and the implementation was recaptured at that CSS viewport.
2. First normalized pass found P2 vertical-density drift in the mobile format rows and action placement. Mobile row heights, spacing, summary metrics, and CTA dimensions were recalibrated.
3. Second pass found P2 icon scale and small vertical offsets. Header/format icons and section spacing were adjusted, then both production views were recaptured.
4. Final full-view and focused comparisons show no actionable P0/P1/P2 differences.

## Implementation checklist

- [x] Desktop and mobile layouts match the selected sources.
- [x] Primary selection, disclosure, save, copy, and download interactions work.
- [x] Responsive overflow and console checks pass.
- [x] Intentional product/data differences are documented.

final result: passed
