# Generated article workspace — approved option 1

final result: passed

## Source and final evidence

Source visual truth: `design-evidence/consultant-article/approved-option-1.png`, the first displayed mockup from the article workspace ideation set. It is the open centered editorial canvas with the compact toolbar and closed AI panel.

Implementation: the real `ConsultantArticleScreen` and `DraftRichSection` inside the existing consultant shell. Browser verification used a temporary development-only harness with the same synthetic article text as the source and isolated in-memory API responses for that harness's article ID. This exercised the real editor and request client without modifying stored user articles or making paid AI calls. Both harness files were removed after verification, and its browser tab was closed.

Source and final desktop capture (`desktop-final.png`) are both 1487 × 1058 pixels, captured with an explicit matching viewport clip at 1x density. `comparison-final.png` pairs source left and implementation right, equally downsampled to 744 × 529 each. `comparison-focused.png` pairs matching title/intro/section crops at the same scale. `comparison-toolbar.png` pairs matching toolbar crops at native scale. All three combined comparisons were opened and inspected together.

Additional evidence in the same directory: `laptop-final.png` (1366 × 768), `tablet.png` (834 × 1194), `mobile-final.png` (375 × 1773 full content from a 390 × 844 viewport with a 15px scrollbar), `mobile-360-final.png` (360 × 800 clip), `mobile-320.png` (320 × 800 clip), `mobile-unsaved.png`, `details-mobile.png`, `export-desktop.png`, `export-mobile.png`, and `ask-ai-mobile.png`. Responsive screenshots show different interaction states and content heights, not same-size source comparisons.

Previous generation-screen QA is preserved as `previous-generation-qa.md`.

## Findings and iteration history

- Resolved P2: the first headline wrapped with “broken” on the first line, changing the source hierarchy. Increased the display size to 62px, adjusted line height and toolbar spacing, then recaptured the desktop state. The final title wraps before “broken handoffs,” matching the source.
- Resolved P2: initial article prose and section spacing pushed later sections lower than the source. Tuned the scoped editorial body to 22px with explicit paragraph line height, and adjusted heading spacing. Final full and focused comparisons show the intended reading rhythm.
- Resolved P2: long editable section headings were clipped in a single-line field on mobile. The consultant's editorial appearance now uses a wrapping textarea that resizes with its content and viewport. A long synthetic heading was edited and saved in the browser without horizontal overflow. Other editor appearances retain their existing controls.
- Resolved P2: the initial narrow-phone toolbar wrapped the back link and crowded the Details control. Adjusted the grid, button spacing and compact metadata label; added a stacked fallback below 340px. Post-fix 360px and 320px captures confirm reachable controls. The accessible metadata label remains “Article details.”
- Initial evidence: `desktop-first.png`, `mobile-first.png`, `comparison-initial.png`. Intermediate desktop comparison: `desktop-revised.png` and `comparison-revised.png`. Final evidence supersedes these.
- No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces

Typography: existing Newsreader and Manrope are retained. The centered 850px article has the selected two-line title, generous serif prose and prominent section headings. Controls use compact Manrope. The unchanged product navigation has a slightly smaller scale than the generated image; this is intentional consistency with the existing application.

Spacing/layout: the raised document card and stacked toolbar are replaced with the source's open paper surface, one compact action row, collapsed metadata and quiet Article/Markdown controls. The article occupies the central reading column. Mobile stacks the layout and keeps section headings fully visible.

Colors/tokens: existing paper, navy, crimson, muted text, divider and hover tokens are used. Saved is a neutral checkmarked status, not a disabled primary action. The save action appears when there are unsaved edits. No autosave claim is introduced.

Assets/icons: the source contains no raster artwork needing generation. Existing wordmark and Phosphor ArrowLeft, FileText, CheckCircle, Sparkle, Export and CaretDown icons are used. No screenshot is embedded in the product and no custom replacement artwork is drawn.

Copy/content: Article names the editable view; Markdown is explicitly read-only. The source's hierarchy and action labels are retained. Existing article text remains data-driven. The synthetic comparison article corrects punctuation errors in the generated bitmap. Existing AI review-before-apply and export formats are preserved.

P3 follow-up: small differences in font rasterization, icon geometry and navigation scale remain. These do not change hierarchy or behavior.

## Behavior and validation

- 15 focused integration tests passed: seven article-workspace tests and eight generation-flow tests. They cover saved/unsaved status, editing and versioned save, failed save recovery, source switching without losing edits, metadata updates, copy/export options, AI preview requests, Escape/focus restoration, and preservation of the preceding generation flow.
- Browser checks exercised the real Lexical editor, Article/Markdown switching, successful saving, wrapping/editing long section headings, metadata disclosure/cancel, the AI panel, and the export menu. An actual downloaded Markdown file was read and confirmed to contain the synthetic edited text. Request persistence in these browser checks is in-memory fixture persistence; backend contracts are covered by integration mocks. No new live model generation was triggered.
- Desktop, laptop, tablet, standard mobile and narrow mobile were inspected. Post-fix measured content widths did not exceed viewport widths. Mobile export remained within the viewport.
- Final browser error logs were empty. TypeScript, targeted ESLint, formatting and whitespace checks passed. Existing Playwright labels were updated for Article and Article editor; the Playwright CLI suite was not run.
- The new editorial appearance is opt-in for consultant articles; the generic rich editor retains its default appearance elsewhere. Backend source and API contracts are unchanged.

## Checklist

- [x] Implement the exact first displayed mockup.
- [x] Preserve direct editing, manual save, metadata, AI review and export.
- [x] Verify interactions and inspect responsive states in the browser.
- [x] Compare source/render together and resolve P2 findings.
- [x] Pass focused checks and remove the temporary visual harness.
