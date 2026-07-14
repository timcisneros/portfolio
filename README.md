# timcis.com

[![CI](https://github.com/timcisneros/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/timcisneros/portfolio/actions/workflows/ci.yml)

Portfolio and project case studies for Tim Cisneros, a full-stack software
developer focused on cloud-backed applications, operational tooling, and
business-process automation. [See it live](https://timcisneros.vercel.app/).

## What this repository demonstrates

- Strict TypeScript and statically generated project case studies
- Accessible, responsive interfaces built without a component framework
- Automated content-integrity, API, layout, and interaction tests
- A shared WebGPU/DOM renderer for physical keycap controls
- Dynamic Open Graph images and structured person metadata
- A Resend-backed contact API with validation and a direct-email fallback

The featured work connects implementation details to business and operational
outcomes: DSDebug reduced enterprise workflow tracing from an afternoon to
minutes; Entity Visualization makes complex ownership structures navigable;
the Self-Hosted YouTube Frontend exercises portable storage, queues, media
proxying, and resilience; and Ticket System implements auditable agent
execution with explicit authority and verification gates.

## Source-use terms

This repository is public for portfolio review. No license is granted unless a
specific file or dependency states otherwise. Project repositories document
their own reuse terms; professional work may intentionally remain
source-available for evaluation rather than open source.

## Architecture

Built with Next.js, TypeScript (strict), and hand-rolled CSS (no UI
framework). Pages are statically generated; two API routes handle the contact
form and dynamic Open Graph images. Content lives in
[`data/projects.ts`](data/projects.ts) and
[`data/caseStudies.ts`](data/caseStudies.ts), so adding or editing a project
is a one-file change.

Every push runs typecheck, Vitest unit tests (API validation + content
integrity), a production build, and required Playwright checks for portfolio
content, navigation, case studies, résumé delivery, and contact validation.
The retained camera/headline rendering subsystem runs as a separate visible
audit because graphics readiness can vary across headless CI environments.

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
npm run test:e2e:portfolio # required recruiter-facing paths
npm run test:e2e:a11y      # WCAG A/AA + theme contrast checks
npm run test:e2e:rendering # camera/headline subsystem audit
```

## Environment variables

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `RESEND_API_KEY` | Sends contact-form submissions via [Resend](https://resend.com). Without it the form returns 503 and visitors see a mailto fallback. |

Set it in Vercel → Project → Settings → Environment Variables.
