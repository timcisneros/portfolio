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
    intro: string[];
    steps: CaseStudyStep[];
    build: string[];
    deepDive?: CaseStudyDeepDive;
}

export const caseStudies: CaseStudy[] = [
    {
        slug: 'dsdebug',
        name: 'DSDebug',
        tagline: 'Build and debug DocuSign CLM workflows visually',
        tags: ['React', 'Next.js', 'React Flow', 'Chakra UI', 'DocuSign CLM'],
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
        intro: [
            'At Bitwise Industries my team maintained large-scale DocuSign CLM automations for enterprise clients. When a workflow misbehaved, the only way to inspect it was to export the definition and read the raw JSON. Hundreds of steps, variables, and routing rules were flattened into a format meant for machines.',
            'DSDebug turned an afternoon of reading raw JSON exports into minutes of tracing on an interactive graph. The 2022 original was built for exactly that one job: tracing variables through a workflow. The 2023 rebuild kept the tracer and shifted the focus to editing, adding drag-and-drop authoring, a template library, and a console that turned a debugging aid into a full workflow workbench. Both versions are linked above.',
            'The workflows behind this tool are classic document automation: a document arrives, gets classified, has data extracted, and is routed through review and signature. At Bitwise I built those pipelines end-to-end, including HR onboarding that ran through Laserfiche processes wired into DocuSign eSignature. DSDebug exists because pipelines like that fail in production and someone has to trace why. In 2026 the same pattern is being rebuilt around AI agents, and it carries the same operational question DSDebug answered for CLM: when the automation misbehaves, can you see exactly what it did? My [Ticket System](/projects/ticket-system) takes that question on directly for agent-run work.',
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
        slug: 'action-plan',
        name: 'Action Plan Generator',
        tagline: 'Turn any YouTube video into a 7-day action plan',
        tags: ['TypeScript', 'Next.js', 'AI', 'Product Design'],
        demo: 'https://seo-project-umber.vercel.app/',
        code: 'https://github.com/timcisneros/seo-project',
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
            'TypeScript and Next.js, with an LLM pipeline that transcribes the video’s content and reshapes it into the fixed plan structure: core idea, insights, actions, and a 7-day schedule.',
            'Stateless by design: no accounts, no stored history. A generated plan lives in the share link.',
            'Prompt-shaped output, not freeform: the model is constrained to produce actions with times and quantities, which is what separates a plan from a summary.',
        ],
    },
    {
        slug: 'my-youtube',
        name: 'Self-Hosted YouTube Frontend',
        tagline: 'Watch your subscriptions privately without touching Google',
        tags: ['TypeScript', 'Express', 'Redis / BullMQ', 'Shaka Player', 'Playwright', 'Docker'],
        code: 'https://github.com/timcisneros/my-youtube',
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
        code: 'https://github.com/timcisneros/ticket-system',
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
        slug: 'waydaw',
        name: 'Waydaw',
        tagline: 'Ableton Live 12 on Linux',
        tags: ['Linux', 'Bash', 'Wine', 'KDE Wayland', 'Audio Production'],
        code: 'https://github.com/timcisneros/waydaw',
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

export const getCaseStudy = (slug: string): CaseStudy | undefined =>
    caseStudies.find((study) => study.slug === slug);
