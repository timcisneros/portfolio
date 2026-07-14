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
  level: string;
  description: string;
  items: string[];
}

export interface Job {
  id: string;
  role: string;
  company: string;
  period: string;
  location: string;
  context?: string;
  bullets: string[];
}

export interface Credential {
  name: string;
  detail: string;
}

export const featuredProjects: ShowcaseProject[] = [
  {
    id: "dsdebug",
    name: "DSDebug",
    tagline: "Debug DocuSign workflows visually",
    description: [
      "I built this as a Solutions Engineer at Bitwise Industries. Our team maintained large-scale DocuSign CLM automations, and tracing a variable through a workflow meant reading dense JSON exports by hand. DSDebug parses those exports and renders them as an interactive graph, turning an afternoon of reading JSON into minutes of tracing.",
      "The 2022 original did one thing: trace variables through a workflow. The 2023 rebuild added a drag-and-drop editor, a template library, and a built-in console for inspecting workflow state, turning a debugging helper into a full authoring tool. Both versions are still deployed.",
    ],
    tags: [
      "React",
      "Next.js",
      "DocuSign CLM",
      "Graph Visualization",
      "Developer Tools",
    ],
    image: "/project-imgs/dsdebug.png",
    imageWidth: 1280,
    imageHeight: 780,
    imageAlt:
      "DSDebug rendering a DocuSign contract-management workflow as an interactive node graph",
    demo: "https://dsdebug-prod.vercel.app/",
    code: "https://github.com/timcisneros/dsdebug-2023",
    caseStudy: "/projects/dsdebug",
  },
  {
    id: "entity-visualization",
    name: "Entity Visualization",
    tagline: "Trace complex ownership structures visually",
    description: [
      "I built this professional organization-chart application as a Solutions Engineer at Bitwise Industries / Stria. It turns dense ownership records into an automatically laid-out React Flow graph where users can follow parent and subsidiary relationships, inspect ownership and distribution summaries, switch charts, and open connected records.",
      "The public edition deliberately separates portfolio evidence from the former client environment: it retains the graph, Dagre layout, Cognito boundary, navigation, summaries, and print workflow while replacing production identifiers, document links, and entity names. Its anonymized dataset exercises 142 relationships across 10 charts and 73 entities.",
    ],
    tags: ["React Flow", "Dagre", "AWS Cognito", "Data Visualization"],
    image: "/project-imgs/entity-visualization.png",
    imageWidth: 1280,
    imageHeight: 780,
    imageAlt:
      "Entity Visualization showing an automatically laid-out organization chart with relationship controls",
    code: "https://github.com/timcisneros/entity-visualization",
    caseStudy: "/projects/entity-visualization",
  },
  {
    id: "action-plan",
    name: "Action Plan Generator",
    tagline: "A YouTube link in, a 7-day plan out",
    description: [
      "Watching self-improvement content rarely changes behavior, but acting on it does. Paste a YouTube link and this app distills the video into its core idea, three key insights, and a concrete day-by-day execution plan you can start today.",
      "Built with TypeScript, Astro, and Vue 3, with a focus on a fast single-input flow: one paste, one click, one plan.",
    ],
    tags: ["TypeScript", "Astro", "Vue 3", "OpenAI API"],
    image: "/project-imgs/seo-project.png",
    imageWidth: 1440,
    imageHeight: 900,
    imageAlt:
      "Action Plan Generator landing page: paste a YouTube link to create a 7-day action plan",
    demo: "https://seo-project-umber.vercel.app/",
    code: "https://github.com/timcisneros/seo-project",
    caseStudy: "/projects/action-plan",
  },
];

export const systemsProjects: ShowcaseProject[] = [
  {
    id: "my-youtube",
    name: "Self-Hosted YouTube Frontend",
    tagline: "Watch your subscriptions privately",
    description: [
      "The server proxies every stream, thumbnail, and piece of metadata. The browser never makes a single request to Google. Chronological subscription feed, DASH playback through Shaka Player, and an import surface so you can import your subscriptions and go.",
      "TypeScript and Express, with every dependency beyond Node optional: SQLite or Postgres, local disk or S3, in-process work or a Redis/BullMQ worker queue. Tested with Playwright e2e, player, and resilience suites.",
    ],
    tags: ["TypeScript + JavaScript", "Express", "Redis / BullMQ", "Playwright", "Docker"],
    image: "/project-imgs/case/myyt-02-watch.png",
    imageWidth: 1440,
    imageHeight: 900,
    imageAlt:
      "A video playing through the self-hosted proxy with extraction badge and full metadata",
    code: "https://github.com/timcisneros/my-youtube",
    caseStudy: "/projects/my-youtube",
  },
  {
    id: "ticket-system",
    name: "Ticket System",
    tagline: "Run AI agents you can actually audit",
    description: [
      "Every task is a durable ticket running under explicit authority. Nothing executes off-ledger.",
      "A completed run isn't automatically verified: unverified objectives get flagged for review, and the triage inbox tells the operator exactly which actions are allowed and which are prohibited.",
    ],
    tags: ["Node.js", "Fastify", "AI Agents", "Systems Design"],
    image: "/project-imgs/case/ticketsys-03-triage.png",
    imageWidth: 1440,
    imageHeight: 900,
    imageAlt:
      "The triage inbox listing allowed and prohibited operator actions for flagged tickets",
    code: "https://github.com/timcisneros/ticket-system",
    caseStudy: "/projects/ticket-system",
  },
  {
    id: "waydaw",
    name: "Waydaw",
    tagline: "Ableton Live on Linux",
    description: [
      "I produce music in Ableton and I run Linux. This harness makes the two work together: one shared Wine prefix for Live 12, Max for Live, and Windows VSTs, with 59 explicit, non-mutating diagnostic commands on KDE Wayland.",
      "A trail of [investigation docs](https://github.com/timcisneros/waydaw/tree/master/docs) records the why behind every decision, from DXVK loader audits to thread backtraces of a frozen authorization dialog.",
    ],
    tags: ["Linux", "Bash", "Wine", "Audio Production"],
    image: "/project-imgs/case/waydaw-01-check.png",
    imageWidth: 1440,
    imageHeight: 900,
    imageAlt:
      "Terminal output of the waydaw environment check with PASS and WARN lines",
    code: "https://github.com/timcisneros/waydaw",
    caseStudy: "/projects/waydaw",
  },
];

// Order the proof for hiring review: paid product work first, followed by
// infrastructure, systems, product, and specialist debugging depth.
export const showcaseProjects: ShowcaseProject[] = [
  featuredProjects[0],
  featuredProjects[1],
  systemsProjects[0],
  systemsProjects[1],
  featuredProjects[2],
  systemsProjects[2],
];

export const leadProjects = showcaseProjects.slice(0, 3);
export const supportingProjects = showcaseProjects.slice(3);

export const moreProjects: GridProject[] = [
  {
    id: "stringing-report",
    name: "Stringing Report App",
    description:
      "A field-logging tool for pipeline construction crews: record joints and fittings in reusable tables and generate stringing reports on-site instead of on paper.",
    tags: ["React", "Real-World Tooling"],
    demo: "https://stringing-report.netlify.app/",
    code: "https://github.com/timcisneros/stringing-report-app",
  },
  {
    id: "json-name-changer",
    name: "JSON Renamer",
    description:
      "A paste-in utility that batch-renames values across a JSON file.",
    tags: ["JavaScript", "Developer Tools"],
    demo: "https://json-name-changer.vercel.app",
    code: "https://github.com/timcisneros/json-name-changer",
  },
  {
    id: "next-news",
    name: "Next News",
    description:
      "A news reader that pulls live headlines from GNews through a Next.js API route, so the key never reaches the browser; React Query fetches and caches by category.",
    tags: ["Next.js", "React Query", "REST APIs"],
    demo: "https://next-js-news.vercel.app/",
    code: "https://github.com/timcisneros/next-news",
  },
];

export const skills: SkillGroup[] = [
  {
    group: "Core application stack",
    level: "Core",
    description: "The technologies I use to build full-stack applications end to end.",
    items: [
      "TypeScript",
      "React",
      "Next.js",
      "Vue.js & Composition API",
      "Node.js & Express",
      "REST APIs",
      "AWS",
      "SQL (PostgreSQL, SQLite & SQL Server)",
    ],
  },
  {
    group: "Professional delivery",
    level: "Professional",
    description: "Used in client work, enterprise automation, deployment, or ongoing maintenance.",
    items: [
      "JavaScript",
      "MongoDB / Mongoose",
      "AWS Lambda & API Gateway",
      "AWS S3 & Cognito",
      "DynamoDB & Step Functions",
      "Amplify & CloudFormation",
      "GitHub Actions CI/CD",
      "Business process automation",
      "Workflow & graph visualization",
      "DocuSign CLM & eSignature",
      "Laserfiche",
      "Technical documentation",
      "Client & stakeholder communication",
    ],
  },
  {
    group: "Project & systems experience",
    level: "Hands-on projects",
    description: "Implemented in working public projects, prototypes, test suites, or infrastructure.",
    items: [
      "Tailwind CSS",
      "Pinia",
      "Vue Router",
      "Fastify",
      "Redis & BullMQ",
      "Docker & Nginx",
      "Terraform",
      "Playwright",
      "Python",
      "OpenAI API prototyping",
      "Agent workflow implementation",
      "Eval & benchmark implementation",
      "Structured LLM outputs",
    ],
  },
  {
    group: "Interface & supporting tools",
    level: "Supporting",
    description: "Tools and foundations that support accessible interfaces and clear delivery.",
    items: [
      "HTML",
      "CSS / Sass",
      "Bootstrap",
      "Material & Semantic UI",
      "Git & GitHub",
      "Automated testing & debugging",
      "Vercel / Netlify",
      "Figma",
      "Sketch",
      "Adobe Suite",
      "Affinity Designer",
      "Draw.io / Lucidchart",
    ],
  },
];

export const experience: Job[] = [
  {
    id: "bitwise",
    role: "Solutions Engineer",
    company: "Bitwise Industries / Stria",
    period: "Mar 2021 – May 2023",
    location: "Bakersfield, CA",
    bullets: [
      "Owned AWS web-application delivery across Next.js interfaces, authentication, APIs, storage, infrastructure, and CI/CD using Cognito, S3, Lambda, API Gateway, DynamoDB, Amplify, and CloudFormation.",
      "Created [DSDebug](/projects/dsdebug), an internal Next.js tool that converted dense DocuSign CLM workflow exports into interactive graphs and reduced variable tracing from an afternoon of JSON inspection to minutes.",
      "Built [Entity Visualization](https://github.com/timcisneros/entity-visualization), an interactive organization chart using React Flow, S3, and Cognito to trace ownership, related entities, distributions, and connected records; the public source uses anonymized data.",
      "Implemented an end-to-end HR onboarding workflow across Laserfiche and DocuSign eSignature, with operational visibility through Zoho Analytics and SQL Server dashboards.",
    ],
  },
  {
    id: "timcis-media",
    role: "Digital Media Producer — Client Software Development & Digital Production",
    company: "TimCis Media",
    period: "Mar 2020 – Present",
    location: "California",
    context: "Official title spanning client software development and digital production",
    bullets: [
      "Translate client operating procedures into maintained internal applications using React, MongoDB / Express, and AWS serverless workflows across API Gateway, Step Functions, Lambda, and DynamoDB.",
      "Own delivery from workflow discovery through interfaces, APIs, data models, release, and ongoing changes, keeping implementation decisions tied to the work users perform on the job.",
      "Support pipeline field operations by converting CAD schematics into 2D isometric drawings and by building the related Stringing Report app for structured joint-and-fitting records.",
    ],
  },
  {
    id: "conduent",
    role: "T1 Advisor → Workforce Analyst → Quality Assurance",
    company: "Conduent",
    period: "Jul 2016 – Feb 2020",
    location: "Bakersfield, CA",
    bullets: [
      "Promoted twice in four years, from troubleshooting mobile devices to workforce analytics and quality assurance.",
      "As workforce analyst, wrote VBA, JavaScript, and AppleScript automations to process adherence metrics and push real-time updates.",
    ],
  },
];

export const credentials: Credential[] = [
  {
    name: "AWS Cloud Practitioner training",
    detail:
      "Core AWS services and use cases, billing and pricing models, and security concepts.",
  },
  {
    name: "Laserfiche Gold training",
    detail:
      "Capture, system administration, and integration capabilities across Cloud and On-Prem.",
  },
  {
    name: "DocuSign CLM Implementation training",
    detail:
      "System administration, Salesforce integration, and workflow conventions.",
  },
];
