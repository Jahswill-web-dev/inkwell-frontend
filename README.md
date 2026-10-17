# Inkwell Frontend

Inkwell supports two writing experiences in one account:

- **Content marketing:** manage clients and work through source collection, briefs, outlines,
  section drafting, review, and export.
- **Consultant:** describe an article, talk through it in a live or typed interview, and receive
  a structured draft in your voice. Review voice preferences, edit drafts, and accept revisions explicitly.

Consultants use a separate personal workspace. Switching experiences does not move articles or change
permissions. Existing marketing accounts and workflows remain supported.

## Tech stack

- [Next.js 16](https://nextjs.org/) with the App Router
- [React 19](https://react.dev/) and TypeScript
- CSS Modules for component and feature styling
- Global CSS for shared theme tokens and base styles
- [Tailwind CSS 4](https://tailwindcss.com/) utilities in the landing page and
  waitlist form
- [Lexical](https://lexical.dev/) for rich-text editing
- [Zod](https://zod.dev/) for API request and response validation
- [Axios](https://axios-http.com/) for API requests
- [Phosphor Icons](https://phosphoricons.com/)
- Vitest, React Testing Library, and Testing Library User Event
- Playwright for end-to-end tests
- ESLint and Prettier for code quality and formatting

## Requirements

- Node.js 20.9.0 or newer
- npm

## Getting started

Install the locked dependency versions:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

If PowerShell blocks `npm.ps1`, use the Windows command shim instead:

```powershell
npm.cmd run dev
```

## Environment variables

The authentication and waitlist API routes use server-only environment
variables. Copy `.env.example` to `.env.local` and replace the example values
for the services you are running.

```env
AUTH_API_URL=http://127.0.0.1:8000
WAITLIST_API_URL=https://example.com/api/waitlist
WAITLIST_API_KEY=replace-with-your-server-side-key
```

Do not prefix these values with `NEXT_PUBLIC_`; they are intended to remain on
the server. `AUTH_API_URL` is the backend origin without `/api/v1`; successful
registration and login store the returned access token in an HTTP-only session
cookie.

## Authentication

- Registration and login use same-origin Next.js API routes, so access tokens
  are never exposed to browser JavaScript.
- `/onboarding`, `/dashboard`, `/articles/*`, and `/consultant/*` require authentication.
- `src/proxy.ts` redirects requests without a session cookie, while the
  server-side session layer validates existing tokens through
  `GET /api/v1/auth/me` before protected pages render.
- Authentication-service outages fail closed and preserve the session cookie
  so the user can retry without being signed out.
- Profile menus expose sign out, which deletes the authentication cookie.

## Available scripts

| Command                  | Description                               |
| ------------------------ | ----------------------------------------- |
| `npm run dev`            | Start the Next.js development server      |
| `npm run build`          | Create an optimized production build      |
| `npm run start`          | Start the production server after a build |
| `npm run lint`           | Run ESLint across the project             |
| `npm run typecheck`      | Check TypeScript without emitting files   |
| `npm test`               | Run Vitest tests once                     |
| `npm run test:watch`     | Run Vitest in watch mode                  |
| `npm run test:e2e`       | Run Playwright tests                      |
| `npm run format`         | Format the project with Prettier          |
| `npm run format:check`   | Check formatting without changing files   |
| `npm run capture:design` | Run the design-capture script             |

## Project structure

```text
inkwell-frontend/
|-- src/
|   |-- app/                    # App Router pages, layout, global styles, and API routes
|   |   |-- api/auth/           # Login, logout, registration, and secure cookies
|   |   |-- api/consultant/     # Authenticated consultant API proxy
|   |   |-- consultant/         # Consultant dashboard, interview, editor, voice, and settings
|   |   |-- api/waitlist/       # Server-side waitlist endpoint
|   |   |-- articles/new/       # Brief, outline, draft, review, and export pages
|   |   |-- dashboard/          # Dashboard route
|   |   |-- login/              # Login route
|   |   |-- onboarding/         # Onboarding route
|   |   `-- signup/             # Sign-up route
|   |-- components/
|   |   |-- articles/           # Article workflow components
|   |   |-- auth/               # Login and sign-up components
|   |   |-- dashboard/          # Dashboard content and navigation
|   |   |-- consultant/         # Consultant screens and experience switcher
|   |   |-- landing/            # Landing-page sections
|   |   |-- onboarding/         # Onboarding flow components
|   |   `-- ui/                 # Shared form, button, and checkbox components
|   |-- lib/                    # Shared schemas, types, and utilities
|   `-- proxy.ts               # Optimistic protected-route redirects
|-- e2e/                        # Playwright end-to-end tests
|-- public/
|   |-- designs/mvp/            # Product design reference screens
|   `-- images/                 # Static images, logos, and product screenshots
|-- scripts/                    # Browser-based design capture scripts
|-- design-reference/           # Visual implementation and QA references
|-- next.config.ts              # Next.js configuration
|-- playwright.config.ts        # End-to-end test configuration
|-- vitest.config.ts            # Unit and component test configuration
`-- tsconfig.json               # TypeScript configuration and @/* alias
```

## Codebase conventions

- Routes and layouts use the Next.js App Router under `src/app`.
- Feature components are grouped by product area under `src/components`.
- Reusable UI controls live under `src/components/ui`.
- Most styling is written in colocated `*.module.css` files and imported into
  the corresponding components.
- Shared theme tokens, fonts, and base element styles live in
  `src/app/globals.css`.
- The landing-page components and waitlist form use Tailwind utility classes
  backed by the theme defined in `globals.css`.
- Unit and component tests are colocated with their source files as
  `*.test.ts` or `*.test.tsx`.
- Imports can use the `@/*` alias for files under `src`.

## Testing

Run the unit and component test suite:

```bash
npm test
```

Run the end-to-end suite:

```bash
npm run test:e2e
```

Playwright starts the application on port `3100` unless `E2E_BASE_URL` points
to an already-running deployment. The suite covers desktop Chromium and a
mobile Chromium profile.

## Production build

```bash
npm run build
npm run start
```


## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Product landing page |
| `/signup` | Experience selection, followed by the existing account form |
| `/login` | Sign in |
| `/onboarding` | Marketing onboarding; preferred consultants redirect to consultant onboarding |
| `/dashboard` | Marketing dashboard; preferred consultants redirect to consultant dashboard |
| `/articles/new` | Marketing article setup |
| `/articles/[articleId]` | Article entry point; consultant articles redirect to their stored workflow |
| `/articles/[articleId]/sources` | Marketing source collection |
| `/articles/[articleId]/interviews` | Marketing interview management |
| `/articles/[articleId]/writer-interview` | Marketing writer interview |
| `/articles/[articleId]/edit` | Existing article editor |
| `/articles/new/brief`, `/outline`, `/draft`, `/review`, `/export` | Existing marketing wizard pages; each suffix follows `/articles/new` |
| `/interview/[token]` | Invited client interview using a guest token |
| `/consultant` | Personal article dashboard |
| `/consultant/onboarding` | Display name, specialty, and typical audience |
| `/consultant/new` | Working title, description, optional reader/takeaway/length |
| `/consultant/interviews/[interviewId]` | Live or typed conversation, persisted transcript, pause/resume/finish |
| `/consultant/articles/[articleId]` | Generation progress, rich-text editing, proposals, transcript, and export |
| `/consultant/voice` | Approved voice preferences and suggested updates |
| `/consultant/settings` | Consultant profile settings |

Signup keeps the experience and form step in URL parameters so Back and refresh preserve the
selection. Registration sends the selected experience to the backend; the server remains the source
of truth. The experience switcher persists the preference and enables a workspace when needed.
Article deep links follow the article's classification, independently of the selected dashboard.

## Backend integration and API proxies

Run the FastAPI backend at `AUTH_API_URL` and apply its migrations. This variable is used by article,
workspace, consultant, and authentication server code; it is not limited to authentication.
No provider key belongs in browser code or a `NEXT_PUBLIC_` variable.

| Browser endpoint | Backend / behavior |
| --- | --- |
| `POST /api/auth/register` | `/api/v1/auth/register`; forwards optional experience and stores session cookie |
| `POST /api/auth/login` | `/api/v1/auth/login`; stores session cookie |
| `POST /api/auth/logout` | Deletes the local session cookie |
| `/api/workspaces/current?experience=consultant` | `/api/v1/workspaces/current` with experience query |
| `/api/clients/*` | Existing `/api/v1/clients/*` endpoints |
| `/api/articles/*` | Existing `/api/v1/articles/*` endpoints, including draft/brief/outline operations |
| `/api/interviews/[token]/*` | Existing guest interview and voice endpoints |
| `/api/consultant/*` | Same suffix under `/api/v1/consultant/*`; supports GET, POST, and PUT |
| `POST /api/waitlist` | Configured waitlist service with server-only credentials |

The consultant catch-all proxy attaches the session bearer token on the server, restricts URL path
segments, rejects mismatched origins on mutations, forwards query parameters and
`If-Unmodified-Since`, and uses a 120-second upstream timeout. Only
`GET /api/consultant/availability` is accessible without a session. Provider credentials are never
forwarded to the browser; live audio setup exchanges an SDP offer through the authenticated proxy.

### Consultant endpoint map

Paths in this table follow `/api/consultant` in the browser (or `/api/v1/consultant` on FastAPI).

| Method | Path | Used for |
| --- | --- | --- |
| GET | `/availability` | Signup feature visibility |
| GET / PUT | `/experience` | Read or select enabled experience |
| GET / PUT | `/profile` | Read or save onboarding/settings |
| PUT | `/voice` | Save, approve, dismiss, or reset preferences |
| GET / POST | `/articles` | Dashboard listing or minimal article creation |
| GET | `/articles/{article_id}` | Article, accepted sections, revisions, latest generation job |
| PUT | `/articles/{article_id}/details` | Working title and topic changes |
| POST | `/articles/{article_id}/interviews` | Create/resume conversation or start follow-up |
| GET | `/interviews/{interview_id}` | Reload saved transcript and interview context |
| POST | `/interviews/{interview_id}/voice/session` | Live WebRTC setup |
| POST | `/interviews/{interview_id}/transcript` | Acknowledge deduplicated turns |
| POST | `/interviews/{interview_id}/answer` | Typed answer and next question |
| PUT | `/interviews/{interview_id}/corrections` | Correct or exclude source material |
| POST | `/interviews/{interview_id}/pause` | Save paused state |
| POST | `/interviews/{interview_id}/finish` | Finalize and queue automatic draft |
| POST | `/interviews/{interview_id}/generate` | Updated or voice-aware rewrite proposal |
| POST | `/jobs/{job_id}/retry` | Retry failed generation |
| PUT | `/articles/{article_id}/draft` | Save edited sections |
| POST | `/articles/{article_id}/revisions/{revision_id}/apply` | Accept or restore revision |

Example using the shared browser client:

```typescript
import { consultantRequest } from "@/lib/consultant/client";

const article = await consultantRequest<{ id: string }>("articles", "POST", {
  title: "Why handoffs matter more than dashboards",
  description: "How unclear ownership creates expensive confusion.",
  length: "standard",
});
const interview = await consultantRequest<{ id: string }>(
  `articles/${article.id}/interviews`,
  "POST",
);
```

For full field limits, response shapes, idempotency, and errors, see the backend README's
**Consultant API reference** and the local [Swagger UI](http://127.0.0.1:8000/docs).

## Running the consultant experience locally

1. Start PostgreSQL, apply backend migrations, and run FastAPI.
2. Configure `OPENAI_API_KEY` on the backend. Consultant drafting uses
   `CONSULTANT_MODEL=gpt-5.6-sol`, independently of marketing generation settings.
3. In a separate backend terminal run `uv run python -m app.workers.consultant` with the same
   database and OpenAI key. Draft generation requires this worker even when the frontend is running.
4. Consultant signup is enabled by default. There is no separate frontend environment flag;
   set backend `CONSULTANT_ENABLED=false` only for an intentional rollback.
5. Set frontend `AUTH_API_URL`, start `npm run dev`, and choose Consultant on `/signup`.

Live interviews require microphone permission and a WebRTC-capable browser. Use localhost during
local development or HTTPS in deployment. The typed alternative uses the same persisted interview
and drafting pipeline and still needs the backend OpenAI configuration.

When the backend flag is disabled, new consultant signup/enablement is stopped while saved consultant
work remains accessible. Frontend deployment alone neither migrates the database nor starts the worker.

## Interview and editor behavior

- Setup is saved before microphone access. Refresh/resume reloads acknowledged server transcript turns.
- Live sessions share `use-realtime-interview.ts` through a custom session adapter. Consultant screens
  provide listening/speaking state, mute, pause/resume, elapsed time, and typed answers.
- Finish flushes pending transcript writes before calling the finalization endpoint. Pause or a lost
  connection must not be treated as completion. Natural completion uses the same finish path.
- The article screen polls article detail for job progress. Generation continues after closing the tab.
- The first draft is accepted automatically. Follow-up interviews, corrections, and rewrite requests
  produce proposals that must be previewed and explicitly applied; manual edits are preserved.
- Draft saves and revision application send the exact `draft_updated_at` value in
  `If-Unmodified-Since`. On a conflict, reload before saving; never overwrite a newer draft blindly.
- The editor reuses Lexical sections. Transcript corrections, missing information, and voice suggestions
  stay outside article prose. Only approved voice preferences carry into later articles.
- Copy, Markdown, and HTML export use the accepted draft and exclude transcript/voice metadata.
  Export does not mark the article published. Save edits before exporting them.

### Consultant implementation map

| File / directory | Responsibility |
| --- | --- |
| `src/app/consultant/` | Protected layouts and pages |
| `src/app/api/consultant/[...path]/route.ts` | Authenticated server proxy |
| `src/lib/consultant/client.ts` | Browser requests and shared response types |
| `src/components/consultant/consultant-start.tsx` | Dashboard, onboarding/settings, article setup |
| `src/components/consultant/consultant-interview.tsx` | Live and typed interview orchestration |
| `src/components/consultant/consultant-article.tsx` | Jobs, editing, proposals, transcript corrections, exports |
| `src/components/consultant/consultant-voice.tsx` | Approved and suggested voice preferences |
| `src/components/consultant/experience-switcher.tsx` | Persistent experience selection |
| `src/components/interview/use-realtime-interview.ts` | Shared live transport and transcript outbox |
| `e2e/consultant.spec.ts` | Desktop/mobile consultant flow tests with mocked APIs |

## Consultant verification and troubleshooting

```bash
npm run typecheck
npx vitest run --configLoader runner src
npx playwright test e2e/consultant.spec.ts
```

The `src` filter limits Vitest discovery to application tests when local scratch folders contain
third-party tests. The consultant browser suite checks signup selection across refresh, minimal
article creation and typed completion, explicit proposal acceptance, and export on desktop/mobile.
It mocks APIs: it does not validate real voice transport, database durability, or generated voice quality.
Those checks belong to the backend integration suite and a real consultant pilot.

| Symptom | Check |
| --- | --- |
| Consultant signup is unavailable | Backend `/api/v1/consultant/availability` and `CONSULTANT_ENABLED` |
| Generation stays queued | Separate worker process, shared database, and worker logs |
| Generation or typed interviewer is unavailable | Backend/worker OpenAI credentials and model configuration |
| Microphone fails | Browser permission, secure context, audio device; use typed answers to continue |
| Draft save/apply conflicts | Reload the latest draft timestamp before retrying |
| Proposal is stale | Generate a new proposal from the corrected transcript |
| Protected pages cannot load | Backend reachability and authentication; check `AUTH_API_URL` |
