# Inkwell Frontend

Inkwell is a responsive frontend for a guided writing workspace. The current
codebase includes a product landing page, authentication and onboarding
screens, a dashboard, and an article workflow covering brief creation,
outlining, drafting, review, and export.

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
- `/onboarding`, `/dashboard`, and `/articles/*` require authentication.
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
