# Inkwell

Inkwell is a responsive product landing page for a guided AI writing workspace.
It shows how writers move from an initial idea through planning, drafting,
review, and export without losing their voice.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4 with shared theme tokens
- Phosphor icons
- Vitest, React Testing Library, and Playwright

Node.js 20.9 or newer and npm are required.

## Local setup

```bash
npm ci
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Commands

| Command                | Purpose                      |
| ---------------------- | ---------------------------- |
| `npm run dev`          | Start the development server |
| `npm run build`        | Create a production build    |
| `npm run lint`         | Run ESLint                   |
| `npm run typecheck`    | Check TypeScript             |
| `npm test`             | Run unit and component tests |
| `npm run test:e2e`     | Run Playwright tests         |
| `npm run format:check` | Check formatting             |

## Architecture

The landing page is composed from small components under
`src/components/landing`. Copy and repeated product content live in a typed
configuration file. Styling uses Tailwind utilities backed by the Inkwell
theme tokens in `src/app/globals.css`. The page is server-rendered except for
the accessible mobile navigation.

Approved desktop and mobile product mockups live under
`public/images/product`. The responsive image component selects the
appropriate artwork for the current viewport.

The existing waitlist route and validation remain available as isolated legacy
infrastructure, but the public landing page now points to `/signup`, `/login`,
and `/pricing`.
