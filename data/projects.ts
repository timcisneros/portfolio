export interface ShowcaseProject {
    id: string;
    name: string;
    tagline: string;
    description: string[];
    tags: string[];
    image: string;
    imageWidth: number;
    imageHeight: number;
    imageAlt: string;
    code: string;
    demo?: string;
    caseStudy?: string;
}

export interface GridProject {
    id: string;
    name: string;
    description: string;
    tags: string[];
    code: string;
    demo?: string;
}

export interface SkillGroup {
    group: string;
    items: string[];
}

export interface Job {
    id: string;
    role: string;
    company: string;
    period: string;
    location: string;
    bullets: string[];
}

export interface Certification {
    name: string;
    detail: string;
}

export const featuredProjects: ShowcaseProject[] = [
    {
        id: 'dsdebug',
        name: 'DSDebug',
        tagline: 'Debug DocuSign workflows visually',
        description: [
            'I built this as a Solutions Engineer at Bitwise Industries. Our team maintained large-scale DocuSign CLM automations, and tracing a variable through a workflow meant reading dense JSON exports by hand. DSDebug parses those exports and renders them as an interactive graph, turning an afternoon of reading JSON into minutes of tracing.',
            'The 2022 original did one thing: trace variables through a workflow. The 2023 rebuild added a drag-and-drop editor, a template library, and a built-in console for inspecting workflow state, turning a debugging helper into a full authoring tool. Both versions are still deployed.',
        ],
        tags: ['React', 'Next.js', 'DocuSign CLM', 'Graph Visualization', 'Developer Tools'],
        image: '/project-imgs/dsdebug.png',
        imageWidth: 1280,
        imageHeight: 780,
        imageAlt:
            'DSDebug rendering a DocuSign contract-management workflow as an interactive node graph',
        demo: 'https://dsdebug-prod.vercel.app/',
        code: 'https://github.com/timcisneros/dsdebug-2023',
        caseStudy: '/projects/dsdebug',
    },
    {
        id: 'action-plan',
        name: 'Action Plan Generator',
        tagline: 'A YouTube link in, a 7-day plan out',
        description: [
            'Watching self-improvement content rarely changes behavior, but acting on it does. Paste a YouTube link and this app distills the video into its core idea, three key insights, and a concrete day-by-day execution plan you can start today.',
            'Built with TypeScript and Next.js, with a focus on a fast single-input flow: one paste, one click, one plan.',
        ],
        tags: ['TypeScript', 'Next.js', 'AI', 'Product Design'],
        image: '/project-imgs/seo-project.png',
        imageWidth: 1440,
        imageHeight: 900,
        imageAlt:
            'Action Plan Generator landing page: paste a YouTube link to create a 7-day action plan',
        demo: 'https://seo-project-umber.vercel.app/',
        code: 'https://github.com/timcisneros/seo-project',
        caseStudy: '/projects/action-plan',
    },
];

export const systemsProjects: ShowcaseProject[] = [
    {
        id: 'my-youtube',
        name: 'Self-Hosted YouTube Frontend',
        tagline: 'Watch your subscriptions privately',
        description: [
            'The server proxies every stream, thumbnail, and piece of metadata. The browser never makes a single request to Google. Chronological subscription feed, DASH playback through Shaka Player, and an import surface so you can import your subscriptions and go.',
            'TypeScript and Express, with every dependency beyond Node optional: SQLite or Postgres, local disk or S3, in-process work or a Redis/BullMQ worker queue. Tested with Playwright e2e, player, and resilience suites.',
        ],
        tags: ['TypeScript', 'Express', 'Redis / BullMQ', 'Playwright', 'Docker'],
        image: '/project-imgs/case/myyt-02-watch.png',
        imageWidth: 1440,
        imageHeight: 900,
        imageAlt:
            'A video playing through the self-hosted proxy with extraction badge and full metadata',
        code: 'https://github.com/timcisneros/my-youtube',
        caseStudy: '/projects/my-youtube',
    },
    {
        id: 'ticket-system',
        name: 'Ticket System',
        tagline: 'Run AI agents you can actually audit',
        description: [
            'Every task is a durable ticket running under explicit authority. Nothing executes off-ledger.',
            'A completed run isn\'t automatically verified: unverified objectives get flagged for review, and the triage inbox tells the operator exactly which actions are allowed and which are prohibited.',
        ],
        tags: ['Node.js', 'Fastify', 'AI Agents', 'Systems Design'],
        image: '/project-imgs/case/ticketsys-03-triage.png',
        imageWidth: 1440,
        imageHeight: 900,
        imageAlt:
            'The triage inbox listing allowed and prohibited operator actions for flagged tickets',
        code: 'https://github.com/timcisneros/ticket-system',
        caseStudy: '/projects/ticket-system',
    },
    {
        id: 'waydaw',
        name: 'Waydaw',
        tagline: 'Ableton Live on Linux',
        description: [
            'I produce music in Ableton and I run Linux. This harness makes the two work together: one shared Wine prefix for Live 12, Max for Live, and Windows VSTs, with 59 explicit, non-mutating diagnostic commands on KDE Wayland.',
            'A trail of [investigation docs](https://github.com/timcisneros/waydaw/tree/master/docs) records the why behind every decision, from DXVK loader audits to thread backtraces of a frozen authorization dialog.',
        ],
        tags: ['Linux', 'Bash', 'Wine', 'Audio Production'],
        image: '/project-imgs/case/waydaw-01-check.png',
        imageWidth: 1440,
        imageHeight: 900,
        imageAlt:
            'Terminal output of the waydaw environment check with PASS and WARN lines',
        code: 'https://github.com/timcisneros/waydaw',
        caseStudy: '/projects/waydaw',
    },
];

export const moreProjects: GridProject[] = [
    {
        id: 'stringing-report',
        name: 'Stringing Report App',
        description:
            'A field-logging tool for pipeline construction crews: record joints and fittings in reusable tables and generate stringing reports on-site instead of on paper.',
        tags: ['React', 'Real-World Tooling'],
        demo: 'https://stringing-report.netlify.app/',
        code: 'https://github.com/timcisneros/stringing-report-app',
    },
    {
        id: 'json-name-changer',
        name: 'JSON Renamer',
        description:
            'A paste-in utility that batch-renames values across a JSON file.',
        tags: ['JavaScript', 'Developer Tools'],
        demo: 'https://json-name-changer.vercel.app',
        code: 'https://github.com/timcisneros/json-name-changer',
    },
    {
        id: 'next-news',
        name: 'Next News',
        description:
            'A news reader that pulls live headlines from GNews through a Next.js API route, so the key never reaches the browser; React Query fetches and caches by category.',
        tags: ['Next.js', 'React Query', 'REST APIs'],
        demo: 'https://next-js-news.vercel.app/',
        code: 'https://github.com/timcisneros/next-news',
    },
];

export const skills: SkillGroup[] = [
    {
        group: 'Frontend',
        items: [
            'React & React Hooks',
            'Next.js',
            'TypeScript',
            'JavaScript (ES6+)',
            'HTML & JSX',
            'CSS / Sass',
            'Bootstrap',
            'Material & Semantic UI',
        ],
    },
    {
        group: 'Backend & Cloud',
        items: [
            'Node.js / Express',
            'REST APIs',
            'AWS Lambda & API Gateway',
            'AWS S3 & Cognito',
            'DynamoDB & Step Functions',
            'Amplify & CloudFormation',
            'PostgreSQL & SQLite',
            'MongoDB / Mongoose',
            'Redis & BullMQ',
            'Python',
        ],
    },
    {
        group: 'Tools & Practices',
        items: [
            'Git (Git Flow)',
            'GitHub Actions CI/CD',
            'Docker & Nginx',
            'Terraform',
            'Playwright',
            'SCRUM / Agile',
            'Vercel / Netlify',
            'Laserfiche',
        ],
    },
    {
        group: 'AI & Agents',
        items: [
            'LLM APIs (OpenAI)',
            'Agent orchestration',
            'Eval & benchmark design',
            'Structured LLM outputs',
            'AI-assisted development',
        ],
    },
    {
        group: 'Design & UI/UX',
        items: [
            'Figma',
            'Sketch',
            'Adobe Suite',
            'Affinity Designer',
            'Draw.io / Lucidchart',
        ],
    },
];

export const experience: Job[] = [
    {
        id: 'bitwise',
        role: 'Solutions Engineer',
        company: 'Bitwise Industries / Stria',
        period: 'Mar 2021 – May 2023',
        location: 'Bakersfield, CA',
        bullets: [
            'Built and shipped AWS web applications end-to-end: Next.js frontends with CI/CD through Amplify and CloudFormation, backed by Cognito, S3, Lambda, API Gateway, and DynamoDB.',
            'Created an internal Next.js tool for tracing and querying variables in large-scale DocuSign CLM automations. It was the origin of [DSDebug](/projects/dsdebug), featured above.',
            'Developed an interactive org chart with React Flow, S3, and Cognito, deployed via GitHub Actions.',
            'Streamlined HR onboarding with Laserfiche business processes integrated with DocuSign eSignature, and built real-time onboarding dashboards in Zoho Analytics and SQL Server.',
        ],
    },
    {
        id: 'timcis-media',
        role: 'Digital Media Producer',
        company: 'TimCis Media',
        period: 'Mar 2020 – Present',
        location: 'California',
        bullets: [
            'Build internal business applications for clients using React, MongoDB / Express, and AWS serverless stacks (API Gateway, Step Functions, Lambda, DynamoDB).',
            'Convert CAD pipeline schematics into 2D isometric drawings for on-the-job field use, in the same domain that produced the Stringing Report app.',
        ],
    },
    {
        id: 'conduent',
        role: 'T1 Advisor → Workforce Analyst → Quality Assurance',
        company: 'Conduent',
        period: 'Jul 2016 – Feb 2020',
        location: 'Bakersfield, CA',
        bullets: [
            'Promoted three times in four years, from troubleshooting mobile devices to coaching advisors against company metrics.',
            'As workforce analyst, wrote VBA, JavaScript, and AppleScript automations to process adherence metrics and push real-time updates.',
        ],
    },
];

export const certifications: Certification[] = [
    {
        name: 'AWS Cloud Practitioner',
        detail: 'Core AWS services and use cases, billing and pricing models, and security concepts.',
    },
    {
        name: 'Laserfiche Gold',
        detail: 'Capture, system administration, and integration capabilities across Cloud and On-Prem.',
    },
    {
        name: 'DocuSign CLM Implementation',
        detail: 'System administration, Salesforce integration, and workflow conventions.',
    },
];
