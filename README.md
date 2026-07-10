# timcis.com

[![CI](https://github.com/timcisneros/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/timcisneros/portfolio/actions/workflows/ci.yml)

Personal portfolio. [See it live](https://timcisneros.vercel.app/).

Built with Next.js, TypeScript (strict), and hand-rolled CSS (no UI
framework). Pages are statically generated; two API routes handle the contact
form and dynamic Open Graph images. Content lives in
[`data/projects.ts`](data/projects.ts) and
[`data/caseStudies.ts`](data/caseStudies.ts), so adding or editing a project
is a one-file change.

Every push runs typecheck, Vitest unit tests (API validation + content
integrity), a production build, and a Playwright end-to-end suite against the
built site.

## Run locally

```bash
npm install
npm run dev
```

## Checks

```bash
npm run typecheck   # tsc --noEmit, strict mode
npm test            # Vitest unit tests
npm run build       # production build
npm run test:e2e    # Playwright against the built site
```

## Environment variables

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `RESEND_API_KEY` | Sends contact-form submissions via [Resend](https://resend.com). Without it the form returns 503 and visitors see a mailto fallback. |

Set it in Vercel → Project → Settings → Environment Variables.
