export interface CaseStudyStep {
    title: string;
    body: string;
    image: string;
    imageWidth: number;
    imageHeight: number;
    imageAlt: string;
}

export interface CaseStudyLink {
    label: string;
    href: string;
}

export interface RepoArtifact {
    label: string;
    href: string;
    note: string;
}

export interface CaseStudyDeepDive {
    label: string;
    title: string;
    body: string[];
    artifacts: RepoArtifact[];
}

export interface CaseStudy {
    slug: string;
    name: string;
    tagline: string;
    tags: string[];
    code: string;
    demo?: string;
    extraLinks?: CaseStudyLink[];
    employerValue: string;
    overview: { label: string; value: string }[];
    intro: string[];
    steps: CaseStudyStep[];
    build: string[];
    deepDive?: CaseStudyDeepDive;
}

const CASE_STUDIES: CaseStudy[] = [
    {
        slug: 'dsdebug',
        name: 'DSDebug',
        tagline: 'Build and debug DocuSign CLM workflows visually',
        tags: ['React', 'Next.js', 'React Flow', 'Chakra UI', 'DocuSign CLM'],
        employerValue: 'Demonstrates enterprise domain learning, developer-tool design, and an observed reduction in day-to-day debugging time for operational workflows.',
        demo: 'https://dsdebug-prod.vercel.app/',
        code: 'https://github.com/timcisneros/dsdebug-2023',
        extraLinks: [
            {
                label: 'v1 live (2022)',
                href: 'https://dsdebug.vercel.app',
            },
            {
                label: 'v1 source',
                href: 'https://github.com/timcisneros/dsdebug',
            },
        ],
        overview: [
            { label: 'Role', value: 'Solutions Engineer and product developer' },
            { label: 'Context', value: 'Enterprise DocuSign CLM workflow debugging' },
            { label: 'Implemented', value: 'Variable tracing, graph rendering, visual authoring, and console tooling' },
            { label: 'Constraint', value: 'Make dense exported workflow JSON usable without a manual trace' },
            { label: 'Outcome', value: 'In team use, reduced an afternoon-scale inspection task to minutes of visual tracing' },
            { label: 'Status', value: '2022 tracer and 2023 workbench both deployed' },
        ],
        intro: [
            'At Bitwise Industries my team maintained large-scale DocuSign CLM automations for enterprise clients. When a workflow misbehaved, the only way to inspect it was to export the definition and read the raw JSON. Hundreds of steps, variables, and routing rules were flattened into a format meant for machines.',
            'In day-to-day use by my team, DSDebug turned an afternoon-scale raw-JSON inspection task into minutes of tracing on an interactive graph. This is an observed workflow improvement, not a formal benchmark. The 2022 original was built for exactly that one job: tracing variables through a workflow. The 2023 rebuild kept the tracer and shifted the focus to editing, adding drag-and-drop authoring, a template library, and a console that turned a debugging aid into a full workflow workbench. Both versions are linked above.',
            'The workflows behind this tool are classic document automation: a document arrives, gets classified, has data extracted, and is routed through review and signature. At Bitwise I built those pipelines end-to-end, including HR onboarding that ran through Laserfiche processes wired into DocuSign eSignature. DSDebug exists because pipelines like that fail in production and someone has to trace why. The same operational question applies whenever automated workflows or agents act on business processes: when the automation misbehaves, can you see exactly what it did? My [Ticket System](/projects/ticket-system) takes that question on directly for agent-run work.',
        ],
        steps: [
            {
                title: 'Start with a template, or upload your own',
                body: 'The workbench opens with a library of real workflow patterns: indexing, routing, contract management, internal approvals, and signature flows. There is also an upload button that accepts any exported workflow definition. The palette on the left holds every DocuSign CLM step type, from Salesforce tasks to signature checkpoints, ready to drag onto the canvas.',
                image: '/project-imgs/case/dsdebug-01-start.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'DSDebug on first load: template library and step palette beside an empty canvas',
            },
            {
                title: 'A 30-step workflow, readable at a glance',
                body: 'Here is a 30-step contract-management workflow, one drag later. Phases render as labeled groups, including document generation, departmental review, and exception handling, with decision diamonds, success and failure edges, and finish states laid out automatically. What was a wall of JSON is now something you can pan, zoom, and reason about in seconds.',
                image: '/project-imgs/case/dsdebug-02-graph.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'A 30-step contract management workflow rendered as an interactive node graph with labeled phases',
            },
            {
                title: 'Every variable, traced',
                body: 'Loading the template merged 25 variables into the Variables panel, typed, grouped, and expandable: params, vendor names, contract folders, e-form configs, signature dates. Variable tracing is the job the 2022 original existed for, and it survived the rebuild intact: when a workflow of this size breaks, the question is almost always "where does this variable get set, and who reads it?"',
                image: '/project-imgs/case/dsdebug-03-variables.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'The Variables panel listing 25 typed workflow variables next to the rendered graph',
            },
            {
                title: 'A command line for when you need it',
                body: 'A built-in command line logs every action (template added, variables merged) and accepts commands like alias nodes with friendly names, list them, or rebuild the start activity.',
                image: '/project-imgs/case/dsdebug-04-console.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'The DSDebug console showing help output with alias and node-listing commands',
            },
        ],
        build: [
            'Next.js and React, with React Flow driving the graph rendering and drag-and-drop authoring, and Chakra UI for the panels and controls.',
            'Workflow definitions are parsed and rendered client-side, so templates load instantly and the graph stays responsive at dozens of nodes and edges.',
            'Two generations, both still deployed: the 2022 original is the variable tracer I built as an internal productivity tool at Bitwise; the 2023 rebuild added the step editor, template library, and console.',
        ],
    },
    {
        slug: 'entity-visualization',
        name: 'Entity Visualization',
        tagline: 'Trace complex ownership structures visually',
        tags: ['React', 'React Flow', 'Dagre', 'Amazon Cognito'],
        employerValue: 'Demonstrates professional application delivery, graph-model transformation, automatic layout, authentication boundaries, and responsible publication of anonymized client-derived work.',
        code: 'https://github.com/timcisneros/entity-visualization',
        overview: [
            { label: 'Role', value: 'Solutions Engineer and application developer' },
            { label: 'Context', value: 'Professional organization-chart and ownership analysis at Bitwise Industries / Stria' },
            { label: 'Implemented', value: 'Graph construction, automatic layout, relationship tracing, summaries, authentication, navigation, and print output' },
            { label: 'Constraint', value: 'Publish credible implementation evidence without exposing client entities, records, links, credentials, or infrastructure' },
            { label: 'Public scale', value: '142 anonymized relationships across 10 charts and 73 entities' },
            { label: 'Status', value: 'Sanitized public edition with security, test, and production-build CI' },
        ],
        intro: [
            'I built Entity Visualization as a Solutions Engineer at Bitwise Industries / Stria. The application turns flat ownership records into an interactive organization chart where users can move through separate structures, follow an entity through its parent relationships, inspect ownership and distribution summaries, navigate with a minimap, and print the resulting view.',
            'The public edition is deliberately not a copy of the former environment. Production identifiers, entity names, document URLs, deployment configuration, and legacy history remain private. The graph construction, Dagre layout, Cognito integration boundary, selection behavior, summaries, and print workflow remain reviewable against generated demonstration data.',
        ],
        steps: [
            {
                title: 'From flat ownership records to a navigable graph',
                body: 'For the selected chart, the application deduplicates parent entities into nodes, converts each ownership record into a labeled edge, identifies top-level entities, and passes the result through Dagre for a top-to-bottom layout. Selecting a node recursively gathers its incoming relationships so the same workspace becomes both the overview and the trace surface.',
                image: '/project-imgs/entity-visualization.png',
                imageWidth: 1440,
                imageHeight: 1000,
                imageAlt: 'Entity Visualization displaying an automatically laid-out ownership graph with navigation and relationship details',
            },
            {
                title: 'Selection turns the overview into a relationship trace',
                body: 'Selecting an entity marks it in blue and recursively follows its incoming ownership connections. The surrounding graph remains visible, so a user can understand the selected record in context instead of losing the broader structure in a separate detail screen.',
                image: '/project-imgs/case/entity-visualization-02-trace.png',
                imageWidth: 1440,
                imageHeight: 1000,
                imageAlt: 'Entity Visualization with one anonymized entity selected in blue and its ownership relationships visible across the graph',
            },
        ],
        build: [
            'React Flow renders the graph and supplies pan, zoom, minimap, controls, selection, and connection traversal; Dagre calculates positions from the relationship topology.',
            'Amazon Cognito is isolated behind environment-provided user-pool and client identifiers. Without that configuration, the public edition opens directly in demo mode against anonymized local data.',
            'Repository tests reject professional document domains and known environment identifiers, while GitHub Actions runs dependency auditing, tests, and a Vite production build on every change.',
        ],
        deepDive: {
            label: 'Implementation evidence',
            title: 'The public boundary is part of the engineering',
            body: [
                'Publishing professional work safely required more than renaming a few visible nodes. The active data was anonymized, environment-specific exports were removed, connected-record URLs were blanked, Cognito identifiers moved to local configuration, and the obsolete production deployment workflow was excluded.',
                'The public repository begins with a clean sanitized history, while the former professional history remains private. That boundary makes the implementation inspectable without implying that the demonstration dataset, infrastructure, or credentials belong in a public portfolio.',
            ],
            artifacts: [
                {
                    label: 'src/components/Chart/index.js',
                    href: 'https://github.com/timcisneros/entity-visualization/blob/main/src/components/Chart/index.js',
                    note: 'Builds nodes and ownership edges, applies Dagre layout, and recursively traces incoming relationships.',
                },
                {
                    label: 'src/UserPool.js',
                    href: 'https://github.com/timcisneros/entity-visualization/blob/main/src/UserPool.js',
                    note: 'Keeps Cognito configuration outside source and exposes the optional authentication boundary.',
                },
                {
                    label: 'tests/repository.test.mjs',
                    href: 'https://github.com/timcisneros/entity-visualization/blob/main/tests/repository.test.mjs',
                    note: 'Guards the public edition against professional identifiers and unsafe configuration guidance.',
                },
            ],
        },
    },
    {
        slug: 'action-plan',
        name: 'Action Plan Generator',
        tagline: 'Turn any YouTube video into a 7-day action plan',
        tags: ['TypeScript', 'Astro', 'Vue 3', 'OpenAI API'],
        employerValue: 'Demonstrates product judgment by constraining an open-ended model task into a focused input, predictable structure, and usable next action.',
        demo: 'https://seo-project-umber.vercel.app/',
        code: 'https://github.com/timcisneros/seo-project',
        overview: [
            { label: 'Role', value: 'Independent full-stack developer and product designer' },
            { label: 'Context', value: 'Video summaries explain content but rarely turn it into action' },
            { label: 'Implemented', value: 'A constrained LLM pipeline, structured plan UI, copy flow, and share links' },
            { label: 'Constraint', value: 'Keep the experience stateless, immediate, and specific rather than freeform' },
            { label: 'Outcome', value: 'A working tool that converts one video link into a time-boxed seven-day plan' },
            { label: 'Status', value: 'Live product prototype with public source' },
        ],
        intro: [
            'Watching self-improvement content rarely changes behavior, but acting on it does. Every AI tool in this space produces summaries, which just retell the video. This app produces something different: a concrete, dated, day-by-day plan you can start today.',
            'The walkthrough below is a real run. I pasted Tim Urban’s TED talk ["Inside the Mind of a Master Procrastinator"](https://www.ted.com/talks/tim_urban_inside_the_mind_of_a_master_procrastinator) and captured what came back.',
        ],
        steps: [
            {
                title: 'One input, one button, done',
                body: 'One input, one button, no login, no saved history. The value is in the output, so everything before that takes five seconds.',
                image: '/project-imgs/case/actionplan-01-paste.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'The Action Plan Generator landing page with a single YouTube link input',
            },
            {
                title: 'It extracts what the video actually argues',
                body: 'From the TED talk it pulled the core idea and the three insights that matter: the "Instant Gratification Monkey," the "Panic Monster," and deadline-driven urgency. It then converted each into an action with a time attached: block distractions for two 30-minute sessions today, set a deadline within 24 hours. Insights on the left, actions on the right; understanding versus doing.',
                image: '/project-imgs/case/actionplan-02-result.png',
                imageWidth: 904,
                imageHeight: 424,
                imageAlt:
                    'Generated result from a TED talk: core idea, three insights, and three concrete actions',
            },
            {
                title: 'Seven days, one concrete task each',
                body: 'The plan is deliberately specific: "60 minutes before noon," "10am and 3pm," and "write 3 bullet points tonight." Vague plans are the problem this app avoids. A copy button and share link let you get it out of the browser before you watch another video.',
                image: '/project-imgs/case/actionplan-03-plan.png',
                imageWidth: 904,
                imageHeight: 340,
                imageAlt:
                    'A generated 7-day plan with one specific, time-boxed task per day',
            },
        ],
        build: [
            'TypeScript, Astro server routes, and a Vue 3 interface, with an OpenAI Responses API pipeline that extracts the video’s content and reshapes it into the fixed plan structure: core idea, insights, actions, and a 7-day schedule.',
            'Stateless by design: no accounts, no stored history. A generated plan lives in the share link.',
            'Prompt-shaped output, not freeform: the model is constrained to produce actions with times and quantities, which is what separates a plan from a summary.',
        ],
    },
    {
        slug: 'my-youtube',
        name: 'Self-Hosted YouTube Frontend',
        tagline: 'Watch your subscriptions privately without touching Google',
        tags: ['TypeScript', 'Express', 'Redis / BullMQ', 'Shaka Player', 'Playwright', 'Docker'],
        employerValue: 'Demonstrates full-stack systems ownership across ingestion, media proxying, storage, queues, graceful degradation, testing, and deployment options.',
        code: 'https://github.com/timcisneros/my-youtube',
        overview: [
            { label: 'Role', value: 'Independent full-stack and systems developer' },
            { label: 'Context', value: 'Private, chronological subscription viewing without browser calls to Google' },
            { label: 'Implemented', value: 'Feed ingestion, stream extraction, media proxying, playback, storage, queues, and deployment tooling' },
            { label: 'Constraint', value: 'Keep every dependency beyond Node optional and swappable' },
            { label: 'Outcome', value: 'One tested codebase that runs locally or with PostgreSQL, S3, Redis, and worker replicas' },
            { label: 'Status', value: 'Working self-hosted application with resilience and deployment suites' },
        ],
        intro: [
            'YouTube knows a lot about you. This is a self-hosted frontend where the server proxies every stream, thumbnail, and piece of metadata. The browser never makes a single request to Google. No account, no tracking, no algorithm. Just a chronological feed of channels I chose.',
            'Every screenshot below is a live capture from a running instance with imported subscriptions, real feed, and real playback.',
        ],
        steps: [
            {
                title: 'A subscription feed without the algorithm',
                body: 'The Today page lists new videos from subscribed channels in plain chronological order. Durations, titles, and thumbnails are all served through the proxy. Subscriptions come in via OPML/CSV import or straight from your browser session, so leaving YouTube proper is a five-minute move, not a fresh start.',
                image: '/project-imgs/case/myyt-01-today.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'The Today feed showing new subscription videos with proxied thumbnails and durations',
            },
            {
                title: 'Playback through the server, not Google',
                body: 'The watch page shows the hard part working: the server extracts the stream (the badge in the header reads "innertube/dash, 0.78s"), and Shaka Player plays adaptive DASH through the proxy with a progressive MP4 fallback. Metadata, subscriber counts, and comments all arrive server-side. This frame was captured mid-playback.',
                image: '/project-imgs/case/myyt-02-watch.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'A video playing through the server proxy with extraction timing badge and full metadata',
            },
            {
                title: 'Own your subscription graph',
                body: 'The import surface handles the messy reality of leaving a platform: fetch subscriptions from your logged-in browser, upload a cookies.txt, import OPML/CSV, and refresh extraction cookies when YouTube’s bot detection bites. Operational edge cases are treated as first-class UI, not error messages.',
                image: '/project-imgs/case/myyt-03-subs.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'The subscriptions page with browser fetch, cookies.txt upload, and OPML/CSV import options',
            },
        ],
        build: [
            'TypeScript and Express with server-rendered EJS that streams. The page shell flushes before data is ready, so navigation feels instant.',
            'Every dependency beyond Node is optional and swappable: SQLite by default with PostgreSQL via one env var, local disk or S3 for downloads, in-process work or a Redis/BullMQ extraction queue with worker replicas. The same code runs on a laptop or a cluster.',
            'Tested with Playwright suites for e2e flows, the player, and resilience; ships with Dockerfile, docker-compose, nginx config, and Terraform deploy definitions.',
        ],
        deepDive: {
            label: 'Swappable by design',
            title: 'The same code runs on a laptop or a cluster',
            body: [
                'The premise is privacy: the server proxies every stream, thumbnail, and byte of metadata, so the browser never makes a request to Google. The hard part is extraction — pulling a playable stream server-side and handing it to the player through the proxy — and that is where most of the engineering went.',
                'Everything beyond Node is optional and chosen by an environment variable, not baked in. The store is SQLite by default or PostgreSQL; downloads live on local disk or any S3-compatible bucket; extraction runs in-process or on a Redis/BullMQ queue with worker replicas. One code path serves a single laptop process and a clustered deployment.',
                'And it is built to actually run somewhere. Playwright suites cover the end-to-end flows, the player, and resilience — the failure paths, not just the happy ones — and the repo ships a real deploy tree: Dockerfile, nginx, Terraform, Ansible, systemd units, and a Varnish cache. It reads like something meant to be operated, not just demoed.',
            ],
            artifacts: [
                {
                    label: 'extractors.ts',
                    href: 'https://github.com/timcisneros/my-youtube/blob/master/extractors.ts',
                    note: 'The proxy’s hard part: extracting a playable stream server-side, with fallback backends, so the browser never calls Google.',
                },
                {
                    label: 'db.ts',
                    href: 'https://github.com/timcisneros/my-youtube/blob/master/db.ts',
                    note: 'The data store behind one interface — SQLite by default, PostgreSQL (db-pg.ts) via a single env var.',
                },
                {
                    label: 'lib/storage.ts',
                    href: 'https://github.com/timcisneros/my-youtube/blob/master/lib/storage.ts',
                    note: 'Downloads on local disk by default, or any S3-compatible bucket when STORAGE_URL is set — one abstraction, two backends.',
                },
                {
                    label: 'extraction-worker.ts',
                    href: 'https://github.com/timcisneros/my-youtube/blob/master/extraction-worker.ts',
                    note: 'Extraction runs in-process, or on a Redis/BullMQ queue with worker replicas when you scale out.',
                },
                {
                    label: 'cluster.ts',
                    href: 'https://github.com/timcisneros/my-youtube/blob/master/cluster.ts',
                    note: 'The single-process-to-clustered switch: the same code path runs on a laptop or across worker replicas.',
                },
                {
                    label: 'deploy/',
                    href: 'https://github.com/timcisneros/my-youtube/tree/master/deploy',
                    note: 'Infrastructure as code: Terraform, Ansible, systemd units, and a Varnish config — a real deploy path, not a toy.',
                },
                {
                    label: 'tests/resilience.test.mjs',
                    href: 'https://github.com/timcisneros/my-youtube/blob/master/tests/resilience.test.mjs',
                    note: 'Part of the Playwright coverage: e2e, the player, and resilience — the failure paths get exercised, not just the happy ones.',
                },
            ],
        },
    },
    {
        slug: 'ticket-system',
        name: 'Ticket System',
        tagline: 'Auditable, controlled execution for AI agents',
        tags: ['Node.js', 'Fastify', 'AI Agents', 'Systems Design'],
        employerValue: 'Demonstrates reliability-oriented implementation through explicit authority, inspectable state, failure recovery, independent verification, and regression-tested invariants.',
        code: 'https://github.com/timcisneros/ticket-system',
        overview: [
            { label: 'Role', value: 'Independent full-stack and systems developer' },
            { label: 'Context', value: 'Agent-run work needs explicit authority, evidence, verification, and operator review' },
            { label: 'Implemented', value: 'Ticket and run lifecycles, evidence ledger, triage, replay, CLI operations, and eval harnesses' },
            { label: 'Constraint', value: 'No off-ledger effects and no completion without independent verification' },
            { label: 'Outcome', value: 'A seeded reference system with inspectable failure paths and regression-tested invariants' },
            { label: 'Status', value: 'Working reference implementation with public source and operational documentation' },
        ],
        intro: [
            'Every unit of work is a durable ticket, every execution runs under explicit authority, every external effect flows through a target provider.',
            'The screenshots below are from the seeded demo environment. Six tickets are engineered to show the full lifecycle, including the failure paths.',
        ],
        steps: [
            {
                title: 'Every ticket and its state, at a glance',
                body: 'The ticket list shows the whole story at a glance: completed-and-verified work, a verification failure routed to run triage, a ticket blocked at ticket-level triage, and a manual rerun ceiling (maxAttempts 2). States are explicit and auditable. There is no "the agent is doing something" limbo.',
                image: '/project-imgs/case/ticketsys-01-tickets.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'Ticket list showing completed, failed, and blocked tickets with execution status lines',
            },
            {
                title: 'Finished doesn\'t mean verified',
                body: 'A finished run doesn’t get a pass by default. This ticket completed, but the system flags it "Needs review" and says exactly why: the full objective was not independently verified, and objective path coverage was not scored. Rerun, test-gate, and plan-simulation controls sit alongside. Simulation tests the agent’s plan without creating a run or touching the workspace.',
                image: '/project-imgs/case/ticketsys-02-detail.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'Ticket detail with a Needs Review banner explaining unverified objectives, plus rerun and simulation controls',
            },
            {
                title: 'Triage tells the operator what they may and may not do',
                body: 'The triage inbox is read-only and decision-oriented. A blocked ticket needing a scope change lists allowed actions (review, edit ticket) and prohibited ones (start a run without the scope change); a failed verification lists review and rerun-from-start, and explicitly forbids marking complete without verification. The system encodes its own guardrails.',
                image: '/project-imgs/case/ticketsys-03-triage.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'Triage inbox with ticket-level and run-level entries showing allowed and prohibited actions',
            },
            {
                title: 'A live snapshot of the whole system',
                body: 'The ops page is a read-only snapshot computed live from the underlying stores. It creates no new source of truth and offers no mutation controls. Warnings surface unresolved triage, blocked tickets, and failed runs; the summary counts every primitive in the substrate, from work contexts to model routing policies.',
                image: '/project-imgs/case/ticketsys-04-ops.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'Operational Transparency page with warnings and substrate-wide summary counts',
            },
        ],
        build: [
            'A single-process Fastify server with EJS views and JSON-file stores. Keeps infrastructure simple so the execution model stands out.',
            'Sessions with argon2 password hashing; a seeded demo mode; and an [eval harness](https://github.com/timcisneros/ticket-system/tree/master/scripts) that scores agent behavior against fixed rubrics, including workflow-draft quality, repair ability, and operational endurance. It also includes regression suites for recovery and truncation edge cases.',
            'Documented like an operated system, not a repo: [operator contract](https://github.com/timcisneros/ticket-system/blob/master/OPERATOR_CONTRACT.md), state surfaces, failure-cluster reports, and a release-candidate audit.',
        ],
        deepDive: {
            label: 'A self-improving repo',
            title: 'It studies its own failures and hardens against them',
            body: [
                'The interesting part isn’t that the system runs agent work; it’s that it treats every failure as material to improve from. Agent runs execute against realistic business fixtures — vendor compliance, legal intake, customer support, and shared-drive cleanup — and a verifier scores each result against an explicit contract. A wrong answer isn’t discarded. It becomes a case.',
                'From there the repo runs a loop. A [failure-classification workflow](https://github.com/timcisneros/ticket-system/blob/master/docs/FAILURE_CLASSIFICATION_WORKFLOW.md) sorts each failure into a frozen S1–S5 taxonomy, and recurring cases are grouped by root cause in a [failure-cluster report](https://github.com/timcisneros/ticket-system/blob/master/failure-cluster-report.md). The classifier itself is agent work: it builds a dossier per failed run, drafts a classification on a cheap model tier, and escalates to a stronger one only when confidence is low — the same governed execution the rest of the system uses, pointed at itself.',
                'None of this needs a human at the console. Every action in the web UI has a headless equivalent in [oquery](https://github.com/timcisneros/ticket-system/blob/master/scripts/oquery.js), a CLI an agent drives under the same authority and evidence rules: create a ticket and wait for its run as JSON, inspect a timeline, replay a run, resolve triage, even operate the bounded workspace. It’s the seam that lets the system act on itself — the failure classifier files its own tickets through this very interface.',
                'When a fix is proven by direct causal evidence, it graduates through a documented [promotion process](https://github.com/timcisneros/ticket-system/blob/master/docs/PRINCIPLE_PROMOTION_PROCESS.md) — observation, analysis, experiment, validated improvement, candidate principle, invariant — and a regression test locks it in so the same failure can’t return. The [architecture invariants](https://github.com/timcisneros/ticket-system/blob/master/docs/ARCHITECTURE_INVARIANTS.md) even forbid the tempting shortcut: don’t widen a limit or special-case the runtime to make a benchmark pass. Improve the guidance instead.',
                'The whole thing leaves receipts, and the receipts are built to be trusted rather than just kept. The append-only event log is the source of truth; the tickets and runs you see are projections rebuilt from it, and an integrity audit proves the derived state still matches. Replay goes beyond reproduce — a tamper test corrupts snapshots ten ways and asserts the verifier catches every one, so history can’t be quietly rewritten and still pass.',
                'Collaboration is held to the same standard. A handoff between agents isn’t a private channel or a chat transcript; it’s an ordinary ticket transition with receipts, so whoever picks up the work inherits the full trail. Agent-produced changes don’t merge on trust either — a verification gate runs build, workflow, postcondition, endurance, and regression checks before one is accepted.',
                'The result reads less like source and more like an operated system’s logbook — the reasoning behind each principle written down next to the evidence that earned it.',
            ],
            artifacts: [
                {
                    label: 'OPERATOR_CONTRACT.md',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/OPERATOR_CONTRACT.md',
                    note: 'The authority model: what a run may and may not do, and why nothing executes off-ledger.',
                },
                {
                    label: 'docs/EXECUTION_MODEL.md',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/docs/EXECUTION_MODEL.md',
                    note: 'Ticket → run → authority → target provider → evidence, defined against committed milestone work rather than aspiration.',
                },
                {
                    label: 'scripts/oquery.js',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/scripts/oquery.js',
                    note: 'The agent-facing interface: a headless CLI mirroring every UI control, so an agent can query and drive the system as JSON under the same authority rules.',
                },
                {
                    label: 'docs/AGENT_HANDOFF_QUEUE_PROTOCOL.md',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/docs/AGENT_HANDOFF_QUEUE_PROTOCOL.md',
                    note: 'Agents hand off work by creating ordinary tickets with receipts — never a private channel — so the multi-agent pattern adds no new execution path.',
                },
                {
                    label: 'scripts/rebuild-tickets-projection.js',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/scripts/rebuild-tickets-projection.js',
                    note: 'Tickets and runs are projections rebuilt from the append-only event log; a companion integrity audit proves the derived state still matches.',
                },
                {
                    label: 'scripts/replay-tamper-test.js',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/scripts/replay-tamper-test.js',
                    note: 'A corruption matrix that mutates replay snapshots ten ways and asserts the verifier catches every one — history you can’t quietly rewrite.',
                },
                {
                    label: 'failure-cluster-report.md',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/failure-cluster-report.md',
                    note: 'Real agent failures grouped by root cause across the four business domains, with representative cases.',
                },
                {
                    label: 'scripts/auto-classify-failures.js',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/scripts/auto-classify-failures.js',
                    note: 'The classifier that turns failed runs into structured findings, with two-tier model escalation.',
                },
                {
                    label: 'docs/PRINCIPLE_PROMOTION_PROCESS.md',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/docs/PRINCIPLE_PROMOTION_PROCESS.md',
                    note: 'The gate a fix passes through before an observation is allowed to become an invariant.',
                },
                {
                    label: 'docs/ARCHITECTURE_INVARIANTS.md',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/docs/ARCHITECTURE_INVARIANTS.md',
                    note: 'The properties now locked in and regression-tested, including the rule against widening limits to pass benchmarks.',
                },
                {
                    label: 'scripts/codex-verify.js',
                    href: 'https://github.com/timcisneros/ticket-system/blob/master/scripts/codex-verify.js',
                    note: 'The release gate agent-produced changes must pass: build, workflow, postcondition, endurance, and regression checks before a change is accepted.',
                },
            ],
        },
    },
    {
        slug: 'stringing-report',
        name: 'Stringing Report App',
        tagline: 'Turn pipeline field records into reusable, structured reports',
        tags: ['React', 'Field Operations', 'Workflow Design', 'Structured Export'],
        employerValue: 'Demonstrates paid client delivery: learning a specialized field workflow, translating it into a focused interface, and retaining clear evidence without exposing client records.',
        demo: 'https://stringing-report.netlify.app/',
        code: 'https://github.com/timcisneros/stringing-report-app',
        overview: [
            { label: 'Role', value: 'Independent client application developer through TimCis Media' },
            { label: 'Context', value: 'Pipeline construction crews recording joints and fittings for stringing reports' },
            { label: 'Implemented', value: 'Reusable report tables, structured field entry, row duplication, editing, and spreadsheet export' },
            { label: 'Constraint', value: 'Reflect the field workflow in a simple interface suitable for on-site use' },
            { label: 'Outcome', value: 'Replaced repeated paper entry with reusable digital tables and exportable records' },
            { label: 'Status', value: 'Completed professional project retained as an evidence-backed public demonstration' },
        ],
        intro: [
            'I built the Stringing Report App through TimCis Media as part of my professional pipeline-support work. The job was not to make a generic table editor; it was to understand how field crews record joints and fittings, preserve the vocabulary they already use, and reduce repeated paper entry.',
            'The application keeps each report focused on the fields needed on the job: joint or fitting number, size, length, wall, grade, heat number, purchase order, and comments. Crews can edit rows, copy the preceding row when specifications repeat, keep multiple tables, and export the result for the next part of the reporting process.',
            'The walkthrough uses fictional representative values created specifically for this portfolio. It contains no client records.',
        ],
        steps: [
            {
                title: 'A field record shaped around the actual work',
                body: 'The populated table shows the operational model directly: sequential joints, repeated pipe specifications, traceable heat and purchase-order fields, and location-specific comments. Copy Last Row accelerates the common case without hiding differences, while editing and spreadsheet export keep the record useful after field entry.',
                image: '/project-imgs/case/stringing-report-01-field-log.png',
                imageWidth: 1440,
                imageHeight: 1000,
                imageAlt: 'Stringing Report App showing three fictional pipeline joint records in a structured field table',
            },
        ],
        build: [
            'React components model report tables and editable joint or fitting rows; browser persistence keeps working records available between page visits.',
            'The interface supports repeated-row entry and spreadsheet export because those actions match the surrounding field and reporting workflow rather than a generic CRUD checklist.',
            'The interface reflects the period in which it was delivered. The public repository now uses Vite and React 18, replaces its unmaintained export wrapper with a small browser-native export path, passes a high-severity dependency audit, and retains the original workflow without presenting a redesign as new client work.',
        ],
        deepDive: {
            label: 'Professional delivery evidence',
            title: 'Domain learning was part of the implementation',
            body: [
                'This project sits alongside my CAD-derived 2D isometric work for pipeline operations. Understanding the records, terminology, and handoff mattered as much as writing the interface. That connection between operating procedure and implementation is also the thread through my enterprise workflow and internal-tool work.',
                'The public application and repository show the delivered interaction model. The screenshot uses newly entered fictional values so the evidence remains reviewable without presenting client data as portfolio content.',
            ],
            artifacts: [
                {
                    label: 'src/components',
                    href: 'https://github.com/timcisneros/stringing-report-app/tree/master/src/components',
                    note: 'Contains the report-table, entry, editing, and supporting interface components.',
                },
                {
                    label: 'README.md',
                    href: 'https://github.com/timcisneros/stringing-report-app/blob/master/README.md',
                    note: 'Documents the field workflow, project status, and historical technology context.',
                },
            ],
        },
    },
    {
        slug: 'waydaw',
        name: 'Waydaw',
        tagline: 'Ableton Live 12 on Linux',
        tags: ['Linux', 'Bash', 'Wine', 'KDE Wayland', 'Audio Production'],
        employerValue: 'Demonstrates disciplined debugging under compatibility constraints, with non-mutating diagnostics and documentation that turns investigation into reusable operational knowledge.',
        code: 'https://github.com/timcisneros/waydaw',
        overview: [
            { label: 'Role', value: 'Independent developer and investigator' },
            { label: 'Context', value: 'Run Ableton Live, Max for Live, MIDI tools, and Windows plugins on Linux' },
            { label: 'Implemented', value: 'Launchers, recovery tools, logs, 59 focused diagnostics, and investigation documentation' },
            { label: 'Constraint', value: 'Diagnostics must be explicit, non-mutating, and safe for a shared Wine prefix' },
            { label: 'Outcome', value: 'A reproducible working environment with evidence behind each compatibility decision' },
            { label: 'Status', value: 'Active personal tooling used on KDE Plasma Wayland' },
        ],
        intro: [
            'I produce music in Ableton Live, and I run Linux. Waydaw is a harness that makes the two work together: one shared Wine prefix for Ableton Live 12, Max for Live, Bome MIDI Translator, and Windows VST plugins, with explicit launchers, logs, and recovery commands on KDE Plasma Wayland.',
            'It’s bash-first and minimal: installs nothing, touches nothing it doesn’t own, and everything it assumes is something you can verify.',
        ],
        steps: [
            {
                title: 'An environment you can interrogate',
                body: 'The harness ships 59 focused commands, and ./bin/check verifies the environment in one pass: Wine, the prefix, the Ableton executable, display compatibility, and PipeWire, warning instead of guessing. The rest of bin/ reads like a debugging diary: auth-liveness probes, DXVK loader audits, window-flicker capture, and MIDI route inspection. Each one was built to answer a specific question that came up in a real session. This output is a live capture from my machine.',
                image: '/project-imgs/case/waydaw-01-check.png',
                imageWidth: 1440,
                imageHeight: 900,
                imageAlt:
                    'Terminal showing waydaw bin/check output with PASS and WARN lines, and a listing of harness commands',
            },
        ],
        build: [
            'Bash with strict mode throughout; a single WINEPREFIX so DAW, MIDI tooling, plugin scanners, and licenses all see one consistent Windows environment.',
            'A trail of [investigation documents](https://github.com/timcisneros/waydaw/tree/master/docs) records the why, not just the how. They include window presentation contracts, message-pump starvation experiments, thread backtrace captures with gdb and winedbg, and explicit criteria for when a technique earns its way into the stable launcher.',
            'Diagnostics never modify anything: probes don\'t write to the registry, don\'t reconfigure the prefix, and leave the session running.',
        ],
    },
];

const CASE_STUDY_ORDER = [
    'dsdebug',
    'entity-visualization',
    'my-youtube',
    'ticket-system',
    'action-plan',
    'stringing-report',
    'waydaw',
];

export const caseStudies = [...CASE_STUDIES].sort(
    (left, right) =>
        CASE_STUDY_ORDER.indexOf(left.slug) - CASE_STUDY_ORDER.indexOf(right.slug)
);

export const getCaseStudy = (slug: string): CaseStudy | undefined =>
    caseStudies.find((study) => study.slug === slug);
