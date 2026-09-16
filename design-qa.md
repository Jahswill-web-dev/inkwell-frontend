# Agency landing-page design QA

**Comparison target**

- Product visual truth: the user-supplied agency screens, preserved at `public/images/landing/agency-flow/`:
  - `agency-article-setup.png` (1350 × 653)
  - `editorial-direction.png` (1352 × 642)
  - `expertise-collection.png` (1350 × 638)
  - `private-interview-link.png` (1348 × 653)
  - `client-interview-workspace.png` (1354 × 636)
- Implementation: `http://localhost:3000/`, rendered in the Codex in-app browser.
- Desktop evidence: 1440 × 1000 CSS px, device scale factor 1.
- Mobile evidence: 390 × 844 CSS px, device scale factor 1.
- Browser-rendered screenshot evidence: in-app browser captures from this QA pass. The browser surface does not persist its captures as local files.
- State: default landing page, `#how-it-works` anchor, and opened/closed mobile navigation.

**Findings**

- No actionable P0, P1, or P2 findings.
- The first desktop pass wrapped the new agency headline too aggressively. The hero measure was widened and display size tuned; the revised desktop pass presents it in two balanced lines.

**Required fidelity surfaces**

- Fonts and typography: preserved the existing Newsreader display / Manrope UI pairing from the approved Inkwell product screens. The agency message uses the same editorial hierarchy on desktop and mobile.
- Spacing and layout rhythm: preserved the warm-paper background, centered marketing composition, airy image treatment, card framing, and alternating feature rows. The five-stage workflow becomes a vertical scan on mobile.
- Colors and visual tokens: retained Inkwell navy, crimson, muted text, warm-paper, and border tokens. The active interview step uses crimson consistently with the product screens.
- Image quality and asset fidelity: all visible product screenshots are the supplied real application captures, copied unchanged at their native dimensions. `ResponsiveProductImage` now accepts source dimensions to avoid aspect-ratio drift and layout shift.
- Copy and content: the page now accurately explains the agency flow: editorial setup, client/expert interview choice, private AI interview link, source review, and writer-ready handoff.

**Interaction evidence**

- Desktop `See the client flow` scrolled to `#how-it-works`.
- On mobile, the menu opened with keyboard focus on `How it works` and closed after it was selected.
- Browser console: no errors.
- Focused landing component tests: 5 passing.
- Type checking: passing.

**Comparison history**

1. Replaced the generic writer-first product story with the user-supplied agency screens and current client-interview workflow.
2. Updated screenshots to preserve their native aspect ratios in the responsive image component.
3. Tuned the desktop hero measure after visual inspection, then rechecked desktop and mobile layouts plus primary navigation.

**Implementation checklist**

- [x] Use the supplied agency application screens as real landing-page assets.
- [x] Explain the private AI client interview and structured writer handoff.
- [x] Preserve responsive image proportions and accessible alternative text.
- [x] Keep desktop and mobile navigation functional.
- [x] Verify browser rendering, interaction states, and console errors.

**Follow-up polish**

- [P3] Add dedicated, full-height mobile product captures if a future campaign needs legible text inside every screenshot at a very narrow viewport.

final result: passed
