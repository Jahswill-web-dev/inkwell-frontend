# Login Design QA

## Targets and evidence

- Desktop reference: `public/designs/mvp/login-desktop.png` (1486 × 1059)
- Desktop implementation: `design-reference/login-implementation-desktop.png` (1486 × 1059, DPR 1)
- Mobile reference: `public/designs/mvp/login-mobile.png` (853 × 1844, approximately 426.5 × 922 CSS pixels at DPR 2)
- Mobile implementation: `design-reference/login-implementation-mobile.png` (852 × 1844, captured from a 426.5-pixel clip at DPR 2; the one-pixel source-width difference is capture rounding)
- Compared state: initial `/login` screen with empty fields and no notices.

The reference and implementation captures were opened together for each full-page comparison. Focused checks covered the brand/story region, form column, form control geometry, options row, prompts, typography, and responsive stacking.

## Iteration history

### First comparison

- P2: The desktop form column was too narrow.
- P2: The desktop editorial headline was undersized.
- P2: The mobile content stack was oversized and sat too low.

The shared auth measurements, logo sizing, headline scale, form width, and mobile vertical rhythm were corrected.

### Second comparison

- P2: The desktop editorial title wrapped to three lines instead of two.
- P2: Divider and field spacing did not match the reference rhythm.

The title received explicit responsive line grouping, and divider/field spacing was adjusted.

### Final comparison

- P0 findings: none.
- P1 findings: none.
- P2 findings: none.
- P3 notes: Small font-rendering and antialiasing differences remain between the raster references and browser output. The normalized mobile capture is one physical pixel narrower because the 853-pixel reference maps to a half CSS pixel at DPR 2.

## Functional and accessibility verification

- Email and required-password validation passed.
- Password visibility toggle passed.
- Remember-me checkbox passed with native keyboard-accessible behavior.
- Google action and mocked login loading/success states passed in component tests.
- `/forgot-password` and `/signup` link targets passed.
- Desktop and mobile horizontal-overflow checks passed.
- Accessible labels and roles passed.
- Browser console and uncaught page-error checks passed.
- Production build and production-mode Playwright tests passed.

final result: passed
