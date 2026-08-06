# Inkwell build roadmap

This is the working checklist for building Inkwell from the existing landing
page into a complete writing product. Build the frontend against typed mock
data first, cover each user-visible workflow with Playwright, and then replace
the mocks with real backend services in dependency order.

## Product goal

Help a writer move through this workflow without losing their voice:

`Idea -> Brief -> Outline -> Draft -> Review -> Publish -> Export`

The core rule is: AI suggests; the writer approves. AI must never silently
replace the user's work.

## Definition of done for every feature

- [ ] Desktop UI matches the approved Inkwell visual system.
- [ ] Mobile UI works at approximately 390 px without horizontal overflow.
- [ ] Loading, empty, error, success, disabled, and unsaved states are covered.
- [ ] Keyboard navigation, focus states, labels, and accessible names work.
- [ ] Logic has focused Vitest/React Testing Library tests where useful.
- [ ] The important user behavior has a Playwright test.
- [ ] Lint, typecheck, unit tests, production build, and Playwright pass.

## Current baseline

- [x] Next.js 16, React 19, TypeScript, and Tailwind CSS are configured.
- [x] Responsive marketing landing page is implemented.
- [x] Desktop and mobile landing-page Playwright coverage exists.
- [x] Vitest, React Testing Library, Playwright, and CI are configured.
- [x] Approved product references exist for Outline, Draft, and Review.
- [ ] `/signup`, `/login`, and `/pricing` currently need to be built.
- [ ] Authentication, database, AI integration, billing, and the product app do
      not exist yet.

---

# Part 1: Frontend product build

Use typed fixtures and mocked API functions in this part. Do not wait for the
backend before making the complete product flow usable in the browser.

## 1. Frontend foundation and design system

- [ ] Define shared colors, typography, spacing, borders, shadows, and status
      styles using the existing Inkwell tokens.
- [ ] Create reusable Button, Input, Textarea, Select, Checkbox, Dialog, Toast,
      EmptyState, Skeleton, and ErrorState components.
- [ ] Create the responsive authenticated app shell:
  - [ ] Desktop sidebar: Home, Articles, Ideas, Templates, Settings.
  - [ ] Mobile navigation/drawer.
  - [ ] User/profile menu.
  - [ ] Article workflow stepper.
- [ ] Add route-level error, loading, and not-found screens.
- [ ] Create typed mock models for User, Article, Brief, OutlineSection,
      ReviewIssue, Source, Version, and Export.

Playwright:

- [ ] App shell works on desktop and mobile.
- [ ] Sidebar/current-route state is correct.
- [ ] Mobile menu opens, traps focus, closes with Escape, and closes after
      navigation.
- [ ] No main route has horizontal overflow.

## 2. Authentication screens

- [ ] Build `/signup` with email/password and Google sign-up UI.
- [ ] Build `/login` with remember me, forgot password, and Google sign-in UI.
- [ ] Build forgot-password, reset-password, email-verification, and auth-error
      screens.
- [ ] Add validation, submitting, success, and server-error states.

Playwright:

- [ ] A visitor can reach signup from the landing page.
- [ ] Invalid input shows useful inline errors.
- [ ] A successful mocked signup enters onboarding.
- [ ] A successful mocked login enters the dashboard.
- [ ] Forgot/reset-password screens complete their mocked flow.

## 3. Welcome onboarding

- [ ] Step 1: select writing goals/content types.
- [ ] Step 2: describe audience, industry/topic, and reader knowledge level.
- [ ] Step 3: select tone/style preferences.
- [ ] Allow an optional pasted or uploaded writing sample.
- [ ] Allow back/next navigation without losing entered values.
- [ ] Add skip and resume-onboarding behavior.

Playwright:

- [ ] A new user completes all three steps and reaches the dashboard.
- [ ] Back/next preserves data.
- [ ] Required-field and writing-sample validation works.

## 4. Dashboard and article library

- [ ] Build dashboard welcome and `Create new article` action.
- [ ] Show recently edited articles with title, stage, word count, progress,
      and last-edited time.
- [ ] Build the Articles page with search, stage/status filters, sort, and
      pagination/load-more behavior.
- [ ] Add article actions: open, rename, duplicate, archive, and delete with
      confirmation.
- [ ] Add first-user empty states and skeleton/loading states.

Playwright:

- [ ] Empty account prompts the user to create the first article.
- [ ] Returning user can search, filter, open, rename, and archive an article.
- [ ] Destructive actions require confirmation.

## 5. New article: idea capture

- [ ] Build `/articles/new`.
- [ ] Let the user start from an idea, rough notes, or a template.
- [ ] Capture optional working title, target audience, and article goal.
- [ ] Add initial templates: how-to, list, opinion, thought leadership,
      product announcement, and case study.
- [ ] Preserve form state if the user changes starting method.

Playwright:

- [ ] Each starting method can create a mocked article.
- [ ] Required input and length validation works.
- [ ] `Build my article brief` opens the correct new article.

## 6. Guided article brief

- [ ] Build the Brief step with topic, audience, reader problem, desired
      outcome, main insight, examples, exclusions, tone, and target length.
- [ ] Prefill values from idea capture and onboarding preferences.
- [ ] Support short, standard, detailed, and custom word targets.
- [ ] Add `Save draft` and `Generate outline` actions.
- [ ] Show generation progress, retry, cancellation, and failure states.

Playwright:

- [ ] A user edits and saves a brief.
- [ ] A mocked generation moves the article to Outline.
- [ ] Failed generation keeps the brief and permits retry.

## 7. Outline builder

- [ ] Match the approved Outline reference.
- [ ] Display title, audience, objective, and estimated length.
- [ ] Each section contains heading, purpose, questions, notes, and estimated
      word count.
- [ ] Add, edit, reorder, duplicate, regenerate, expand, and delete sections.
- [ ] Add outline actions: another approach, simplify, add detail, add
      examples, and find missing sections.
- [ ] Show outline-health feedback for progression, balance, and conclusion.
- [ ] Require user approval before starting the draft.

Playwright:

- [ ] User can add, edit, reorder, duplicate, and delete a section.
- [ ] Regeneration previews a change and supports accept/reject.
- [ ] Word-count estimates update.
- [ ] Approved outline moves to Draft and persists after reload.

## 8. Draft editor

- [ ] Match the approved Draft Editor reference.
- [ ] Build the section outline rail with completion indicators and reordering.
- [ ] Add a rich-text editor with headings, lists, quotes, links, undo/redo,
      word count, and keyboard shortcuts.
- [ ] Add autosave status: saving, saved, offline, failed, and retrying.
- [ ] Add preview and distraction-free/focus mode.
- [ ] Warn before leaving when local changes are unsaved.

Playwright:

- [ ] User types and formats text, reloads, and sees the saved draft.
- [ ] Switching sections preserves content.
- [ ] Keyboard shortcuts and undo/redo work.
- [ ] Autosave failure is visible and retryable.

## 9. Contextual writing assistant

- [ ] Add section goal and checklist to the desktop assistant panel and mobile
      bottom sheet.
- [ ] Add actions: help me start, continue, expand, example, clarify, shorten,
      transition, challenge argument, and rewrite in my voice.
- [ ] Use selected text and current section as visible context.
- [ ] Present original text, suggestion, and explanation.
- [ ] Support accept, reject, try again, and edit manually.
- [ ] Keep a short undo history for accepted AI changes.

Playwright:

- [ ] Selecting text enables contextual actions.
- [ ] Suggestions never alter content before acceptance.
- [ ] Accept, reject, retry, undo, and AI-error states work.
- [ ] The mobile assistant sheet remains usable with the keyboard open.

## 10. Research and sources panel

- [ ] Add source URL, manual note, quotation, and fact entry.
- [ ] List source title, site, summary, notes, and referenced sections.
- [ ] Search and filter saved research.
- [ ] Attach a source to selected article text.
- [ ] Show claims that may need citations.

Playwright:

- [ ] User adds, edits, searches, attaches, and removes a source.
- [ ] Citation markers remain connected to article text after reload.
- [ ] Invalid URLs and failed metadata fetches have usable fallback states.

## 11. Article review

- [ ] Match the approved Review reference.
- [ ] Show separate categories: important, clarity, structure, repetition,
      grammar, voice consistency, sources, unsupported claims, and reading
      difficulty.
- [ ] Highlight the selected issue inside the article.
- [ ] Show original text, suggested revision, and explanation.
- [ ] Add apply, ignore, edit manually, previous, and next controls.
- [ ] Re-run review after material changes.

Playwright:

- [ ] User filters and navigates issues.
- [ ] Applying a suggestion updates the correct text and issue count.
- [ ] Ignoring an issue does not change article text.
- [ ] Review failure/retry and no-issues states work.

## 12. Title, introduction, and conclusion workshop

- [ ] Generate clear, search-friendly, curiosity-driven, practical,
      contrarian, and story-led title options.
- [ ] Explain why each option works.
- [ ] Select, edit, regenerate, and save alternatives.
- [ ] Reuse the interaction for introduction, conclusion, and article summary.

Playwright:

- [ ] Selecting a title updates the publishing draft.
- [ ] User-edited alternatives are not overwritten by regeneration.

## 13. Publishing details and preview

- [ ] Build final title, slug, summary, meta description, author, category,
      tags, and featured-image upload.
- [ ] Add article, search-result, and social-sharing previews.
- [ ] Add slug and meta-description validation/counters.
- [ ] Warn about incomplete metadata without blocking basic export.

Playwright:

- [ ] Metadata changes update all relevant previews.
- [ ] Image upload, replacement, validation, and removal work.
- [ ] Publishing details persist after reload.

## 14. Export and completion

- [ ] Export formatted copy, Markdown, HTML, PDF, and Word.
- [ ] Add options for title, author, sources, summary, and metadata.
- [ ] Show export progress, success, and failure states.
- [ ] Build completion screen with title, word count, reading time, format,
      completion date, and next actions.

Playwright:

- [ ] User completes the full mocked flow from Idea through Export.
- [ ] Markdown/HTML downloads have the expected filename and content.
- [ ] Export errors can be retried without losing settings.

## 15. Ideas, templates, and settings

- [ ] Ideas: create, tag, search, archive, and turn an idea into an article.
- [ ] Templates: browse, preview, favorite, and start from a template.
- [ ] Profile: name, email, and image.
- [ ] Writing preferences: audience, tone, length, language, avoided phrases,
      and formatting.
- [ ] Voice profile: writing samples, characteristics, update, and disable.
- [ ] Account: subscription, password, data export, and account deletion UI.

Playwright:

- [ ] Idea becomes an article without losing its source text.
- [ ] Template correctly prefills a new article.
- [ ] Settings persist in mocked storage.

## 16. Pricing and subscription UI

- [ ] Build `/pricing` with Free and Pro as the initial plans.
- [ ] Show clear limits and monthly/annual selection.
- [ ] Build checkout redirect, success, cancellation, billing, and usage-limit
      screens using mock states.
- [ ] Add upgrade prompts only at real product limits.

Playwright:

- [ ] Visitor can compare plans and begin checkout.
- [ ] Checkout success/cancel routes show the correct state.
- [ ] A mocked free-plan limit displays an upgrade path without losing work.

---

# Part 2: Backend foundation

## 17. Backend architecture and local development

- [ ] Decide whether to keep the backend inside Next.js Route Handlers or use a
      separate service. For the MVP, one Next.js application is the simplest
      starting point.
- [ ] Add PostgreSQL for persistent product data.
- [ ] Add an ORM and migrations (for example Prisma or Drizzle).
- [ ] Add environment validation for database, auth, AI, storage, email, and
      billing secrets.
- [ ] Define consistent API success/error shapes and request IDs.
- [ ] Add local seed data and a repeatable test database reset.

Initial data model:

- [ ] User, Account, Session, VerificationToken.
- [ ] UserPreferences and VoiceProfile.
- [ ] Article, ArticleBrief, OutlineSection, DraftSection.
- [ ] Source and Citation.
- [ ] ReviewRun and ReviewIssue.
- [ ] ArticleVersion.
- [ ] ExportJob.
- [ ] Subscription and UsageEvent.

Tests:

- [ ] Migration and repository/service integration tests.
- [ ] Playwright global setup creates an isolated test user and seeded data.

## 18. Real authentication and authorization

- [ ] Implement email/password and Google authentication.
- [ ] Implement verification, password reset, logout, and session expiry.
- [ ] Protect app routes and redirect authenticated visitors away from auth
      screens.
- [ ] Enforce article ownership in every read/write endpoint.
- [ ] Add login throttling and secure cookie/session settings.

Playwright:

- [ ] Run real signup, verification-test shortcut, login, logout, and reset
      flows against the test database.
- [ ] Confirm one user cannot open or modify another user's article.

## 19. User preferences and onboarding API

- [ ] Persist onboarding progress and completion.
- [ ] Persist writing preferences and voice samples.
- [ ] Resume incomplete onboarding after a new session.
- [ ] Add account/profile update APIs.

Playwright:

- [ ] Complete onboarding, sign out, sign in, and verify preferences remain.

## 20. Article CRUD and workflow state

- [ ] Implement create, read, update, archive, duplicate, and delete.
- [ ] Implement article search, filters, sort, and pagination.
- [ ] Validate allowed workflow transitions.
- [ ] Record timestamps, word count, current stage, and completion progress.
- [ ] Replace dashboard and library mocks with real APIs/server actions.

Playwright:

- [ ] Create, reopen, rename, duplicate, archive, and delete real articles.

## 21. Brief and outline services

- [ ] Persist briefs and all outline section fields/order.
- [ ] Implement safe reorder and concurrent-update handling.
- [ ] Implement outline approval and transition to Draft.
- [ ] Add AI outline generation with structured schema validation.
- [ ] Store generation status and support retry/idempotency.

Tests:

- [ ] Unit-test prompt construction and AI response parsing.
- [ ] Integration-test malformed responses, timeouts, and usage accounting.
- [ ] Convert Brief and Outline Playwright specs from mocks to real APIs.

## 22. Draft storage, autosave, and version history

- [ ] Persist rich-text document content and section ordering.
- [ ] Implement debounced autosave with revision/version checks.
- [ ] Prevent stale browser tabs from silently overwriting newer work.
- [ ] Create milestone versions at outline approval, first draft, review, and
      export.
- [ ] Add version listing, diff metadata, and restore.
- [ ] Add offline/reconnect recovery behavior.

Playwright:

- [ ] Save and recover a draft across reload and a new browser session.
- [ ] Simulate an autosave failure and recovery.
- [ ] Detect a two-tab edit conflict and preserve both versions.
- [ ] Restore an earlier version.

## 23. AI writing assistant

- [ ] Create server-only AI provider integration; never expose keys to the
      browser.
- [ ] Build versioned prompts for every writing action.
- [ ] Send only the necessary article/section context.
- [ ] Validate structured responses and preserve original/suggested text.
- [ ] Add streaming or progress feedback where it improves the experience.
- [ ] Add timeout, cancellation, retry, rate limit, and idempotency behavior.
- [ ] Track AI usage per user and plan.
- [ ] Add content/privacy controls and redact sensitive logs.

Tests:

- [ ] Contract-test the AI adapter with deterministic fixtures.
- [ ] Playwright uses a fake AI provider in CI for stable responses.
- [ ] Add a small, separate provider smoke test outside the main E2E suite.

## 24. Research and citation backend

- [ ] Persist sources, notes, quotations, facts, and citation links.
- [ ] Fetch URL metadata safely with SSRF protections and timeouts.
- [ ] Keep provenance for every AI-produced source summary.
- [ ] Detect deleted sources still referenced by article text.

Playwright:

- [ ] Add a source, attach it, reload, and verify the citation relationship.

## 25. Review engine

- [ ] Run category-specific review prompts instead of one unexplained score.
- [ ] Anchor issues to stable document ranges/section IDs.
- [ ] Persist issue state: open, applied, ignored, obsolete.
- [ ] Reconcile or invalidate issues after article edits.
- [ ] Track review runs and model/prompt versions.

Playwright:

- [ ] Run a deterministic review, apply/ignore issues, edit the article, and
      confirm stale issues are handled correctly.

## 26. File storage and exports

- [ ] Add private object storage for writing samples and featured images.
- [ ] Validate file type, size, ownership, and signed access URLs.
- [ ] Generate Markdown, HTML, PDF, and Word exports on the server.
- [ ] Store export history and clean up expired artifacts.
- [ ] Make export jobs retryable and idempotent.

Playwright:

- [ ] Upload an image and verify authorized retrieval.
- [ ] Download and inspect each generated export format.

## 27. Billing and usage limits

- [ ] Integrate a billing provider and hosted checkout.
- [ ] Store customer/subscription identifiers and plan status.
- [ ] Verify webhook signatures and process events idempotently.
- [ ] Enforce plan limits on the server, especially AI usage and article count.
- [ ] Add billing portal, upgrade, downgrade, cancellation, and grace-period
      behavior.
- [ ] Preserve work when a user reaches or loses a paid plan.

Playwright:

- [ ] Use the provider's test mode for checkout and webhook flows.
- [ ] Verify free limits, upgrade, cancellation, and expired subscription.

## 28. Email and notifications

- [ ] Send verification, password reset, welcome, and billing emails.
- [ ] Add in-app notification storage only for useful events.
- [ ] Add notification preferences and unsubscribe handling where required.
- [ ] Test templates in development without sending real mail.

## 29. Security, privacy, and reliability

- [ ] Add request validation, authorization checks, CSRF strategy, secure
      headers, rate limits, and abuse controls.
- [ ] Keep secrets and article contents out of logs.
- [ ] Add user-data export and complete account deletion.
- [ ] Define backup, restore, retention, and AI data-handling policies.
- [ ] Add error monitoring, structured logs, health checks, and performance
      metrics.
- [ ] Add database indexes after measuring real query patterns.
- [ ] Run accessibility, dependency, and security reviews before launch.

## 30. Production CI and launch readiness

- [ ] Give Playwright a dedicated test database and fake AI/email services.
- [ ] Shard or tag Playwright suites into smoke and full regression groups.
- [ ] Run smoke E2E on every pull request and the full suite on main/nightly.
- [ ] Upload Playwright HTML reports, traces, screenshots, and videos on
      failure.
- [ ] Add staging and production environment checks and migrations.
- [ ] Test backup restoration and rollback procedures.
- [ ] Complete responsive browser QA and a production smoke test.

---

# Part 3: Post-MVP backlog

Do not build these until the complete MVP workflow is stable and used by real
writers.

- [ ] Automatic web research and source discovery.
- [ ] Advanced voice analysis and paragraph-level voice-match feedback.
- [ ] Reader simulation for beginner, expert, skeptic, busy reader, and search
      visitor.
- [ ] SEO content-gap and internal-link assistance.
- [ ] Content repurposing for newsletter, LinkedIn, X, video, and email.
- [ ] Editorial calendar, writing goals, and streaks.
- [ ] Direct WordPress, Ghost, Medium, Webflow, and Notion publishing.
- [ ] Team workspaces, roles, comments, approvals, and shared brand voice.
- [ ] Real-time collaborative editing.
- [ ] Public API and integrations.

## Recommended milestone releases

### Milestone 1: Clickable product prototype

Steps 1-11 using mock data. The user can experience the complete writing loop
through Review, and all key flows have Playwright coverage.

### Milestone 2: Usable private alpha

Steps 12-25. Real authentication, persistent articles, autosave, AI outlining,
writing assistance, sources, review, and version history work end to end.

### Milestone 3: Paid beta

Steps 26-30. Real exports, uploads, billing, email, security, monitoring, and
production CI are complete.

### Milestone 4: Product expansion

Build only the post-MVP items validated by usage and customer feedback.

## The next task

Start with **Step 1: Frontend foundation and design system**. Do not begin the
backend yet. The first deliverable should be the authenticated responsive app
shell, shared UI states, typed mock models, and its desktop/mobile Playwright
tests.
