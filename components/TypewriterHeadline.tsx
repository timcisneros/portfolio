import React, { useEffect, useRef, useState } from 'react';

// The hero headline drafts itself live, like someone editing it in place. It
// works in two forms and occasionally rewrites from one to the other:
//   statement — "<noun> <connector> <verb> for <object>"  ("Software that works for you")
//   question  — "What <modal> <noun> do for <object>?"    ("What could code do for orgs?")
// Every content word is an independent, swappable slot; each cycle the caret
// clicks onto one word and rewrites it. Grammar stays correct: a statement
// verb keeps its "s" only for a singular subject joined by "that" ("Software
// that works" vs "Systems that work" vs "Software can work"), and when that
// agreement flips the caret clicks straight to the verb's "s" and fixes just
// that character. A word, emoji, or bit of punctuation is only added if it
// still fits on the line. Clicking to another line pauses first, as if reaching
// for the mouse and resetting on the keyboard. Typing runs at a human, variable
// pace, slips to adjacent keys, and now and then leaves a mistake in and only
// catches it after finishing the word.
//
// The first sentence renders on the server so it is whole before JS runs and
// for prefers-reduced-motion users, who never see it move.
const NOUNS = [
    { word: 'Software', plural: false },
    { word: 'Systems', plural: true },
    { word: 'Programs', plural: true },
    { word: 'Ideas', plural: true },
    { word: 'Tools', plural: true },
    { word: 'Apps', plural: true },
    { word: 'Code', plural: false },
    { word: 'Automation', plural: false },
    { word: 'Data', plural: false },
    { word: 'Workflows', plural: true },
    { word: 'Agents', plural: true },
    { word: 'Pipelines', plural: true },
    { word: 'Scripts', plural: true },
    { word: 'Products', plural: true },
    { word: 'Platforms', plural: true },
    { word: 'Models', plural: true },
    { word: 'Dashboards', plural: true },
    { word: 'Integrations', plural: true },
    { word: 'Websites', plural: true },
    { word: 'Bots', plural: true },
    { word: 'Services', plural: true },
    { word: 'Solutions', plural: true },
    { word: 'Features', plural: true },
    { word: 'Experiences', plural: true },
    { word: 'Interfaces', plural: true },
    { word: 'Prototypes', plural: true },
    { word: 'Analytics', plural: true },
    { word: 'Reports', plural: true },
    { word: 'Chatbots', plural: true },
    { word: 'Databases', plural: true },
    { word: 'Infrastructure', plural: false },
    { word: 'Networks', plural: true },
    { word: 'Insights', plural: true },
    { word: 'Tech', plural: false },
    { word: 'Modules', plural: true },
    { word: 'Plugins', plural: true },
    { word: 'Portals', plural: true },
    { word: 'Storefronts', plural: true },
    { word: 'Flows', plural: true },
    { word: 'Toolkits', plural: true },
    { word: 'Frameworks', plural: true },
    { word: 'Widgets', plural: true },
    { word: 'Assistants', plural: true },
    { word: 'APIs', plural: true },
    { word: 'Backends', plural: true },
    { word: 'Frontends', plural: true },
    { word: 'UIs', plural: true },
    { word: 'Internal tools', plural: true },
    { word: 'Workbenches', plural: true },
    { word: 'Admin panels', plural: true },
    { word: 'Forms', plural: true },
    { word: 'Queues', plural: true },
    { word: 'Schedulers', plural: true },
    { word: 'Importers', plural: true },
    { word: 'Parsers', plural: true },
    { word: 'Search tools', plural: true },
    { word: 'Devtools', plural: true },
    { word: 'Consoles', plural: true },
    { word: 'Command centers', plural: true },
];
const CONNECTORS = [
    'that',
    'can',
    'could',
];
const MODALS = ['could', 'can'];
// Each verb declares which links it accepts before the object: " for " (works
// for you), " " for a direct object (helps you), or both (serves you / serves
// for you). The first listed link is its default.
const FOR = ' for ';
const TO = ' '; // direct object, no preposition
type SubjectKind =
    | 'software'
    | 'technical'
    | 'tool'
    | 'automation'
    | 'workflow'
    | 'data'
    | 'interface'
    | 'infra'
    | 'ops'
    | 'content'
    | 'concept'
    | 'business';
type ObjectKind =
    | 'human'
    | 'organization'
    | 'audience'
    | 'business'
    | 'technical'
    | 'workflow'
    | 'outcome'
    | 'abstract';
type HeadlineObject = { text: string; kinds: ObjectKind[] };
type HeadlineVerb = {
    base: string;
    links: string[];
    subjectKinds?: SubjectKind[];
    objectKinds?: ObjectKind[];
};

const SUBJECT_KINDS: SubjectKind[][] = [
    ['software'],
    ['software', 'technical'],
    ['software'],
    ['concept'],
    ['tool'],
    ['software', 'interface'],
    ['software', 'technical'],
    ['automation'],
    ['data'],
    ['workflow'],
    ['automation', 'technical'],
    ['workflow', 'automation'],
    ['automation', 'technical'],
    ['software', 'business'],
    ['software', 'technical'],
    ['data', 'technical'],
    ['data', 'interface'],
    ['technical', 'automation'],
    ['software', 'interface'],
    ['automation'],
    ['business'],
    ['software', 'business'],
    ['software'],
    ['interface'],
    ['interface'],
    ['software', 'technical'],
    ['data'],
    ['data', 'business'],
    ['automation'],
    ['data', 'technical'],
    ['infra', 'technical'],
    ['infra', 'technical'],
    ['data'],
    ['technical'],
    ['technical'],
    ['technical'],
    ['interface'],
    ['software', 'business'],
    ['workflow'],
    ['tool'],
    ['software', 'technical'],
    ['interface'],
    ['automation'],
    ['technical'],
    ['technical'],
    ['interface'],
    ['interface'],
    ['tool'],
    ['tool'],
    ['interface'],
    ['workflow', 'automation'],
    ['data', 'technical'],
    ['workflow', 'automation'],
    ['data', 'technical'],
    ['technical'],
    ['technical'],
    ['tool', 'technical'],
    ['interface', 'technical'],
    ['ops', 'workflow'],
];

const VERBS: HeadlineVerb[] = [
    { base: 'work', links: [FOR], objectKinds: ['audience', 'business', 'workflow', 'technical'] },
    { base: 'adapt', links: [FOR], objectKinds: ['audience', 'business', 'workflow', 'technical'] },
    { base: 'serve', links: [TO], objectKinds: ['audience', 'business'] },
    { base: 'help', links: [TO], objectKinds: ['audience', 'business', 'workflow'] },
    { base: 'support', links: [TO], objectKinds: ['audience', 'business', 'workflow', 'technical'] },
    { base: 'empower', links: [TO], objectKinds: ['audience', 'business'] },
    { base: 'protect', links: [TO], objectKinds: ['audience', 'business', 'technical'] },
    { base: 'connect', links: [TO], objectKinds: ['audience', 'business', 'technical', 'workflow'] },
    { base: 'free', links: [TO], objectKinds: ['audience', 'business'] },
    { base: 'back', links: [TO], objectKinds: ['audience', 'business'] },
    { base: 'build', links: [FOR], objectKinds: ['audience', 'business', 'workflow', 'technical'] },
    { base: 'prepare', links: [FOR], objectKinds: ['audience', 'business', 'workflow', 'outcome'] },
    { base: 'equip', links: [TO], objectKinds: ['audience', 'business'] },
    { base: 'save', links: [TO], objectKinds: ['abstract'] },
    { base: 'simplify', links: [TO], objectKinds: ['business', 'workflow', 'technical', 'abstract'] },
    { base: 'clarify', links: [TO], objectKinds: ['workflow', 'outcome', 'abstract'] },
    { base: 'automate', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'debug', links: [TO], objectKinds: ['workflow', 'technical'] },
    { base: 'organize', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'route', links: [TO], objectKinds: ['workflow', 'abstract'] },
    { base: 'sync', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'validate', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'reduce', links: [TO], objectKinds: ['abstract'] },
    { base: 'trace', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'monitor', links: [TO], objectKinds: ['business', 'workflow', 'technical', 'abstract'] },
    { base: 'measure', links: [TO], objectKinds: ['outcome', 'technical', 'abstract'] },
    { base: 'surface', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'reconcile', links: [TO], objectKinds: ['business', 'workflow', 'technical', 'abstract'] },
    { base: 'review', links: [TO], objectKinds: ['business', 'workflow', 'technical', 'abstract'] },
];
const OBJECTS: HeadlineObject[] = [
    { text: 'you', kinds: ['human', 'audience'] },
    { text: 'teams', kinds: ['human', 'audience'] },
    { text: 'orgs', kinds: ['organization', 'business'] },
    { text: 'your users', kinds: ['human', 'audience'] },
    { text: 'customers', kinds: ['human', 'audience'] },
    { text: 'people', kinds: ['human', 'audience'] },
    { text: 'developers', kinds: ['human', 'audience'] },
    { text: 'your team', kinds: ['human', 'audience'] },
    { text: 'users', kinds: ['human', 'audience'] },
    { text: 'your business', kinds: ['organization', 'business'] },
    { text: 'clients', kinds: ['human', 'audience'] },
    { text: 'founders', kinds: ['human', 'audience'] },
    { text: 'startups', kinds: ['organization', 'business'] },
    { text: 'creators', kinds: ['human', 'audience'] },
    { text: 'your workflow', kinds: ['workflow'] },
    { text: 'your customers', kinds: ['human', 'audience'] },
    { text: 'your roadmap', kinds: ['workflow', 'outcome'] },
    { text: 'your product', kinds: ['business', 'technical'] },
    { text: 'your launch', kinds: ['outcome'] },
    { text: 'your pipeline', kinds: ['business', 'workflow'] },
    { text: 'your next step', kinds: ['outcome'] },
    { text: 'time', kinds: ['abstract'] },
    { text: 'busywork', kinds: ['abstract'] },
    { text: 'decision context', kinds: ['abstract', 'outcome'] },
    { text: 'operations', kinds: ['business', 'workflow'] },
    { text: 'handoffs', kinds: ['workflow', 'abstract'] },
    { text: 'your data', kinds: ['technical', 'abstract'] },
    { text: 'your stack', kinds: ['technical'] },
    { text: 'your workflows', kinds: ['workflow'] },
    { text: 'support teams', kinds: ['human', 'audience'] },
    { text: 'edge cases', kinds: ['technical', 'abstract'] },
    { text: 'bottlenecks', kinds: ['workflow', 'abstract'] },
    { text: 'errors', kinds: ['technical', 'abstract'] },
    { text: 'patterns', kinds: ['technical', 'abstract'] },
    { text: 'signals', kinds: ['technical', 'abstract'] },
    { text: 'approvals', kinds: ['business', 'workflow'] },
    { text: 'requests', kinds: ['business', 'workflow'] },
    { text: 'records', kinds: ['business', 'technical'] },
];
const PUNCTS = ['.', '!'];

// Emojis that fit each noun / verb / object, so a garnish is contextual rather
// than random. Aligned by index with NOUNS, VERBS, and OBJECTS above.
const NOUN_EMOJI = ['💻', '🖥️', '🧩', '💡', '🛠️', '📱', '⌨️', '🤖', '📊', '🔀', '🕵️', '🔧', '📜', '📦', '🧱', '🧠', '🗂️', '🔗', '🌐', '🤖', '🛎️', '🔑', '✨', '🎨', '🖱️', '🧪', '📉', '📄', '💬', '🗄️', '🏗️', '🕸️', '🔍', '🔌', '🔲', '🪝', '🚪', '🏪', '🌊', '🧰', '🏛️', '🎛️', '🤵', '🔌', '🗄️', '🖥️', '🎛️', '🧰', '🛠️', '📋', '📝', '📥', '🗓️', '📥', '🧾', '🔎', '🧰', '🖥️', '🕹️'];
const VERB_EMOJI = ['✅', '🔄', '🤝', '🤲', '🫶', '💪', '🛡️', '🔗', '🔓', '🕊️', '🙌', '🏗️', '🧰', '⏱️', '✂️', '🔍', '⚙️', '🧪', '🗂️', '🔀', '🔄', '✅', '📉', '🧭', '📡', '📏', '🔎', '🔁', '✅'];
const OBJ_EMOJI = ['🙌', '👥', '🏢', '💚', '🛒', '🙋', '💻', '👥', '👤', '💼', '🤝', '🚀', '🌱', '🎨', '🔀', '🛍️', '🗺️', '📦', '🚀', '🔀', '🔮', '⏱️', '✂️', '🧭', '⚙️', '🔀', '🗄️', '🧱', '🔀', '🎧', '🧪', '⏳', '⚠️', '🧩', '📡', '✅', '📬', '🗃️'];
const EXTRA_EMOJI = ['✨', '💡', '⭐', '🔥'];

const objectText = (idx: number) => OBJECTS[idx].text;
const humanObject = (idx: number) => OBJECTS[idx].kinds.includes('human');
const organizationObject = (idx: number) =>
    OBJECTS[idx].kinds.includes('organization');
const HUMAN_DIRECTED_RISK_VERBS = new Set([
    'automate',
    'connect',
    'debug',
    'monitor',
    'measure',
    'prepare',
    'protect',
    'reconcile',
    'reduce',
    'review',
    'route',
    'sync',
    'trace',
    'validate',
]);
const HUMAN_SERVANT_VERBS = new Set([
    'back',
    'empower',
    'equip',
    'free',
    'help',
    'serve',
    'support',
    'work',
]);
const ORGANIZATION_DIRECTED_RISK_VERBS = new Set([
    'debug',
    'monitor',
    'measure',
    'optimize',
    'reconcile',
    'review',
    'sync',
    'trace',
    'validate',
]);
const ORGANIZATION_SERVANT_VERBS = new Set([
    'adapt',
    'back',
    'build',
    'empower',
    'equip',
    'free',
    'help',
    'serve',
    'support',
    'work',
]);
const HUMAN_JUDGMENT_OBJECTS = new Set(['decision context', 'your next step']);
const HUMAN_JUDGMENT_SUPPORT_VERBS = new Set([
    'clarify',
    'help',
    'organize',
    'serve',
    'support',
    'surface',
]);
const OBJECT_VERB_ALLOWLIST: Record<string, Set<string>> = {
    approvals: new Set([
        'automate',
        'clarify',
        'organize',
        'reconcile',
        'review',
        'route',
        'surface',
        'validate',
    ]),
    bottlenecks: new Set([
        'clarify',
        'monitor',
        'reduce',
        'surface',
        'trace',
    ]),
    'decision context': HUMAN_JUDGMENT_SUPPORT_VERBS,
    'edge cases': new Set([
        'clarify',
        'debug',
        'measure',
        'review',
        'surface',
        'trace',
        'validate',
    ]),
    errors: new Set([
        'clarify',
        'debug',
        'monitor',
        'reduce',
        'surface',
        'trace',
    ]),
    handoffs: new Set([
        'automate',
        'clarify',
        'organize',
        'reduce',
        'route',
        'simplify',
        'surface',
    ]),
    operations: new Set([
        'automate',
        'clarify',
        'monitor',
        'organize',
        'review',
        'simplify',
        'support',
        'surface',
    ]),
    patterns: new Set([
        'clarify',
        'measure',
        'surface',
        'trace',
    ]),
    'your launch': new Set([
        'clarify',
        'help',
        'prepare',
        'serve',
        'support',
    ]),
    'your pipeline': new Set([
        'automate',
        'clarify',
        'organize',
        'route',
        'simplify',
        'support',
        'surface',
    ]),
    'your product': new Set([
        'build',
        'clarify',
        'connect',
        'debug',
        'help',
        'simplify',
        'support',
        'validate',
    ]),
    'your roadmap': new Set([
        'clarify',
        'organize',
        'prepare',
    ]),
    'your workflow': new Set([
        'automate',
        'clarify',
        'organize',
        'reduce',
        'simplify',
        'support',
        'surface',
    ]),
    records: new Set([
        'clarify',
        'organize',
        'reconcile',
        'review',
        'surface',
        'sync',
        'validate',
    ]),
    requests: new Set([
        'clarify',
        'organize',
        'reconcile',
        'review',
        'route',
        'surface',
        'validate',
    ]),
    signals: new Set([
        'clarify',
        'measure',
        'monitor',
        'surface',
        'trace',
    ]),
    time: new Set([
        'save',
    ]),
    busywork: new Set([
        'automate',
        'reduce',
        'simplify',
    ]),
    'your data': new Set([
        'clarify',
        'organize',
        'protect',
        'reconcile',
        'surface',
        'sync',
        'validate',
    ]),
    'your next step': HUMAN_JUDGMENT_SUPPORT_VERBS,
    'your stack': new Set([
        'clarify',
        'connect',
        'debug',
        'monitor',
        'simplify',
        'support',
        'trace',
    ]),
    'your workflows': new Set([
        'automate',
        'clarify',
        'organize',
        'reduce',
        'route',
        'simplify',
        'surface',
        'trace',
        'validate',
    ]),
};
const verbAllowsObject = (verbIdx: number, objIdx: number) => {
    const base = VERBS[verbIdx].base;
    const text = objectText(objIdx);
    if (humanObject(objIdx)) {
        if (HUMAN_DIRECTED_RISK_VERBS.has(base)) return false;
        if (!HUMAN_SERVANT_VERBS.has(base)) return false;
    }
    if (organizationObject(objIdx)) {
        if (ORGANIZATION_DIRECTED_RISK_VERBS.has(base)) return false;
        if (!ORGANIZATION_SERVANT_VERBS.has(base)) return false;
    }
    if (
        HUMAN_JUDGMENT_OBJECTS.has(text) &&
        !HUMAN_JUDGMENT_SUPPORT_VERBS.has(base)
    ) {
        return false;
    }
    const objectVerbAllowlist = OBJECT_VERB_ALLOWLIST[text];
    if (objectVerbAllowlist && !objectVerbAllowlist.has(base)) return false;
    const allowed = VERBS[verbIdx].objectKinds;
    if (!allowed) return true;
    return OBJECTS[objIdx].kinds.some((kind) => allowed.includes(kind));
};
const subjectKinds = (idx: number) => SUBJECT_KINDS[idx] ?? ['software'];
const subjectMatches = (nounIdx: number, allowed: SubjectKind[]) =>
    subjectKinds(nounIdx).some((kind) => allowed.includes(kind));
const subjectAllowsObject = (nounIdx: number, objIdx: number) =>
    SUBJECT_OBJECT_ALLOWLIST[NOUNS[nounIdx].word]?.has(objectText(objIdx)) ?? true;
const QUESTION_SUBJECT_BLOCKLIST = new Set([
    'Ideas',
    'Services',
    'Solutions',
    'Experiences',
    'Tech',
    'Features',
    'Insights',
    'Modules',
    'Plugins',
]);
const QUESTION_PAIRS = [
    ['Automation', 'your workflow'],
    ['Automation', 'busywork'],
    ['Dashboards', 'your business'],
    ['Dashboards', 'decision context'],
    ['Internal tools', 'your team'],
    ['Internal tools', 'operations'],
    ['APIs', 'your product'],
    ['APIs', 'your data'],
    ['Workbenches', 'your workflow'],
    ['Admin panels', 'operations'],
    ['Search tools', 'records'],
    ['Devtools', 'your stack'],
    ['Devtools', 'errors'],
    ['Queues', 'requests'],
    ['Parsers', 'records'],
    ['Integrations', 'your workflows'],
    ['Reports', 'decision context'],
    ['Analytics', 'signals'],
    ['Forms', 'approvals'],
    ['Command centers', 'operations'],
] as const;
const PHRASE_PROMPTS = [
    {
        line1: 'Less busywork.',
        line2: 'More time for your team.',
    },
    {
        line1: 'From scattered handoffs',
        line2: 'to calmer operations.',
    },
    {
        line1: 'What could your workflow',
        line2: 'stop making you do manually?',
    },
    {
        line1: 'What could your data',
        line2: 'explain faster?',
    },
    {
        line1: 'What would your team do',
        line2: 'with fewer handoffs?',
    },
    {
        line1: 'Turn messy records',
        line2: 'into searchable context.',
    },
    {
        line1: 'Internal tools',
        line2: 'that give time back.',
    },
    {
        line1: 'Dashboards',
        line2: 'that clarify the next step.',
    },
] as const;
const SUBJECT_VERB_ALLOWLIST: Record<string, Set<string>> = {
    Forms: new Set(['automate', 'clarify', 'organize', 'route', 'validate']),
    Schedulers: new Set(['automate', 'organize', 'route', 'simplify']),
    Queues: new Set(['automate', 'organize', 'reduce', 'route', 'surface']),
    Parsers: new Set(['clarify', 'organize', 'surface', 'sync', 'validate']),
    Importers: new Set(['organize', 'sync', 'validate']),
    Plugins: new Set(['connect', 'support']),
    Widgets: new Set(['clarify', 'surface', 'support']),
    Consoles: new Set(['clarify', 'debug', 'monitor', 'surface', 'trace']),
};
const SUBJECT_OBJECT_ALLOWLIST: Record<string, Set<string>> = {
    Forms: new Set(['approvals', 'requests', 'records', 'your data']),
    Schedulers: new Set(['handoffs', 'operations', 'requests', 'your workflows']),
    Queues: new Set(['handoffs', 'requests', 'your pipeline', 'your workflows']),
    Parsers: new Set(['records', 'your data']),
    Importers: new Set(['records', 'your data']),
    APIs: new Set(['your data', 'your product', 'your stack']),
    Plugins: new Set(['your product', 'your stack']),
    Widgets: new Set(['decision context', 'signals', 'your product']),
    Consoles: new Set(['errors', 'operations', 'signals', 'your stack']),
};
const verbAllowsSubject = (verbIdx: number, nounIdx: number) => {
    const verb = VERBS[verbIdx];
    const noun = NOUNS[nounIdx].word;
    const subjectVerbAllowlist = SUBJECT_VERB_ALLOWLIST[noun];
    if (subjectVerbAllowlist && !subjectVerbAllowlist.has(verb.base)) return false;
    if (verb.subjectKinds) return subjectMatches(nounIdx, verb.subjectKinds);
    switch (verb.base) {
        case 'work':
            return ![
                'Ideas',
                'Data',
                'Services',
                'Solutions',
                'Experiences',
                'Tech',
                'Features',
                'Insights',
                'Modules',
                'Plugins',
            ].includes(noun);
        case 'debug':
        case 'trace':
        case 'sync':
        case 'validate':
        case 'monitor':
        case 'measure':
        case 'surface':
        case 'reconcile':
        case 'review':
            return subjectMatches(nounIdx, [
                'software',
                'technical',
                'tool',
                'automation',
                'workflow',
                'data',
                'interface',
                'infra',
                'ops',
            ]);
        case 'automate':
        case 'organize':
        case 'route':
        case 'simplify':
        case 'clarify':
        case 'save':
        case 'reduce':
            return subjectMatches(nounIdx, [
                'software',
                'technical',
                'tool',
                'automation',
                'workflow',
                'data',
                'interface',
                'ops',
            ]);
        case 'protect':
            return [
                'Software',
                'Systems',
                'Tools',
                'Apps',
                'Code',
                'Automation',
                'APIs',
                'Backends',
                'Internal tools',
                'Admin panels',
                'Devtools',
            ].includes(NOUNS[nounIdx].word);
        case 'connect':
            return subjectMatches(nounIdx, [
                'software',
                'technical',
                'tool',
                'automation',
                'workflow',
                'data',
                'interface',
                'infra',
                'ops',
                'business',
            ]);
        case 'serve':
        case 'help':
        case 'support':
            return [
                'Software',
                'Systems',
                'Programs',
                'Tools',
                'Apps',
                'Automation',
                'Products',
                'Platforms',
                'Websites',
                'Bots',
                'Services',
                'Solutions',
                'Interfaces',
                'Chatbots',
                'Portals',
                'Storefronts',
                'Internal tools',
                'Workbenches',
                'Admin panels',
                'Search tools',
                'Devtools',
                'Command centers',
            ].includes(NOUNS[nounIdx].word);
        case 'empower':
        case 'equip':
            return [
                'Software',
                'Systems',
                'Tools',
                'Apps',
                'Automation',
                'Products',
                'Platforms',
                'Services',
                'Solutions',
                'Internal tools',
                'Workbenches',
                'Admin panels',
                'Assistants',
            ].includes(NOUNS[nounIdx].word);
        case 'free':
            return [
                'Software',
                'Tools',
                'Apps',
                'Automation',
                'Internal tools',
                'Workbenches',
                'Admin panels',
                'Assistants',
            ].includes(NOUNS[nounIdx].word);
        case 'back':
            return [
                'Software',
                'Systems',
                'Tools',
                'Apps',
                'Automation',
                'Internal tools',
                'Platforms',
            ].includes(NOUNS[nounIdx].word);
        default:
            return !subjectKinds(nounIdx).includes('content');
    }
};

const HOLD_MS = 2600; // pause on a finished sentence
const GAP_MS = 500; // pause on an empty word before retyping
const TYPO_CHANCE = 0.08; // per keystroke, corrected immediately
const LATE_TYPO_CHANCE = 0.16; // per word, left in then fixed after finishing

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const typeDelay = () =>
    rand(90, 200) + (Math.random() < 0.12 ? rand(180, 360) : 0);
const deleteDelay = () => rand(45, 95);
const noticeDelay = () => rand(260, 520); // beat before spotting a mistake
const quickNotice = () => rand(150, 330); // faster catch (transpose/double)
const resumeDelay = () => rand(130, 260); // beat after a small reposition
const mouseDelay = () => rand(420, 720); // reaching for the mouse, resetting
const arrowDelay = () => rand(55, 130); // one arrow-key press
const shiftReach = () => rand(55, 150); // extra beat to reach for Shift
const ARROW_CHANCE = 0.4; // navigate by arrow keys instead of clicking
const SPACE_ERR = 0.16; // per internal space: run words together / double it
const BRAINO_CHANCE = 0.2; // type a plausible wrong word, then fix it

// A statement verb keeps its "s" only for a singular subject joined by "that".
const wantsS = (nounIdx: number, connIdx: number) =>
    CONNECTORS[connIdx] === 'that' && !NOUNS[nounIdx].plural;
const verbForm = (base: string, hasS: boolean) => (hasS ? base + 's' : base);

// QWERTY neighbours, so a mistyped key is one a finger could actually slip to.
const NEIGHBORS: Record<string, string> = {
    a: 'qwsz',
    b: 'vghn',
    c: 'xdfv',
    d: 'serfcx',
    e: 'wrds',
    f: 'drtgvc',
    g: 'ftyhbv',
    h: 'gyujnb',
    i: 'uokj',
    j: 'huikmn',
    k: 'jiolm',
    l: 'kop',
    m: 'njk',
    n: 'bhjm',
    o: 'iplk',
    p: 'ol',
    r: 'etfd',
    s: 'awedzx',
    t: 'rygf',
    u: 'yijh',
    v: 'cfgb',
    w: 'qesa',
    x: 'zsdc',
    y: 'tuhg',
};

const slip = (intended: string) => {
    const keys = NEIGHBORS[intended?.toLowerCase()];
    if (!keys) return null;
    const c = keys[Math.floor(Math.random() * keys.length)];
    return intended === intended?.toUpperCase() ? c.toUpperCase() : c;
};

// Pick a mistypeable position in a word (not the first char, has a neighbour).
const typoIndex = (str: string) => {
    const cands: number[] = [];
    for (let i = 1; i < str.length; i++) {
        if (NEIGHBORS[str[i]?.toLowerCase()]) cands.push(i);
    }
    return cands.length ? cands[Math.floor(Math.random() * cands.length)] : -1;
};

// First index at which two strings differ.
const firstDiff = (a: string, b: string) => {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i]) i++;
    return i;
};

// Build a plausible flawed version of `str` with one mistake left in — an
// adjacent-key substitution, a transposition, a doubled letter, or a dropped
// letter. Returns the flawed text and where it first diverges from `str`.
const makeMistake = (str: string): { flawed: string; diverge: number } | null => {
    const k = typoIndex(str);
    if (k < 0) return null;
    const sub = () => str.slice(0, k) + slip(str[k]) + str.slice(k + 1);
    const r = Math.random();
    let flawed: string;
    if (r < 0.34) {
        flawed = sub(); // adjacent-key substitution
    } else if (r < 0.58 && str[k + 1] && str[k] !== str[k + 1]) {
        flawed = str.slice(0, k) + str[k + 1] + str[k] + str.slice(k + 2); // transposition
    } else if (r < 0.8 && str[k - 1] !== str[k]) {
        flawed = str.slice(0, k) + str[k - 1] + str.slice(k); // doubled letter
    } else if (str.length > 3) {
        flawed = str.slice(0, k) + str.slice(k + 1); // dropped letter
    } else {
        flawed = sub();
    }
    const diverge = firstDiff(flawed, str);
    if (diverge >= flawed.length && diverge >= str.length) return null;
    return { flawed, diverge };
};

type Line = 1 | 2;
type Mode = 'stmt' | 'q' | 'phrase';
type FmtKind = 'b' | 'i' | 'u'; // bold / italic / underline
type Sel = { line: Line; start: number; end: number };
// Formatting tracks a character range that shifts with every edit, so the
// style stays glued to its word continuously (rather than blinking off while
// the word is mid-edited).
type Fmt = { line: Line; start: number; end: number; kind: FmtKind };
const FMT_KINDS: FmtKind[] = ['b', 'i', 'u'];
const SELECT_CHANCE = 0.28; // a word swap done by selecting then typing over it

// A caret lives on both lines at all times so each line box reserves its height
// and never grows/shrinks when the caret arrives or leaves — only its
// visibility changes. `visible` is the line the caret is actually on.
const Caret = ({ visible, moving }: { visible: boolean; moving: boolean }) => (
    <span
        className={`tw-caret${
            visible ? (moving ? ' is-moving' : '') : ' is-hidden'
        }`}
    />
);

const INIT_L1 = NOUNS[0].word + ' ' + CONNECTORS[0];
const INIT_L2 =
    verbForm(VERBS[0].base, true) + VERBS[0].links[0] + objectText(0);

const TypewriterHeadline = () => {
    const [line1, setLine1] = useState(INIT_L1);
    const [line2, setLine2] = useState(INIT_L2);
    const [caretLine, setCaretLine] = useState<Line>(2);
    const [caretPos, setCaretPos] = useState(INIT_L2.length);
    const [moving, setMoving] = useState(false);
    const [selection, setSelection] = useState<Sel | null>(null);
    const [format, setFormat] = useState<Fmt | null>(null);
    const line2Ref = useRef<HTMLElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const rootRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const reduce = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;
        if (reduce) return; // leave the first sentence in place

        let timer: ReturnType<typeof setTimeout>;
        // The whole animation is a chain of scheduled steps. `schedule` gates
        // that chain on visibility: while the hero is off-screen or the tab is
        // hidden it holds the next step instead of running it, so nothing
        // animates (or burns CPU) unseen, and it resumes exactly where it left
        // off. `running` reflects visibility; `lastFn` is the pending step.
        let running = true;
        let lastFn: (() => void) | null = null;
        const schedule = (fn: () => void, delay: number) => {
            lastFn = fn;
            if (running) timer = setTimeout(fn, delay);
        };
        const setRunning = (v: boolean) => {
            if (v === running) return;
            running = v;
            if (!running) clearTimeout(timer);
            else if (lastFn) schedule(lastFn, 0); // resume the held step
        };

        let mode: Mode = 'stmt';
        let nounIdx = 0;
        let connIdx = 0;
        let modalIdx = 0;
        let verbIdx = 0;
        let objIdx = 0;
        let link = VERBS[0].links[0]; // link between verb and object (stmt mode)
        // A single garnish at a time: an emoji after the noun (line 1), or a
        // flourish after the object / at the end (line 2: punctuation, extra
        // "?", or emoji). Only one is non-empty.
        let gNoun = '';
        let gObj = '';
        let hasS = true; // statement line two carries the verb's "s"
        // Live line contents + caret; the source of truth the primitives edit.
        let l1 = INIT_L1;
        let l2 = INIT_L2;
        let cLine: Line = 2;
        let cPos = l2.length;
        let sel: Sel | null = null; // transient highlight while selecting
        let fmt: Fmt | null = null; // a word left bold / italic / underlined

        const paint = () => {
            setLine1(l1);
            setLine2(l2);
            setCaretLine(cLine);
            setCaretPos(cPos);
        };

        // Keep the formatted range in step with edits on its line. Inserting
        // `count` chars at `pos`: before the range shifts it right; inside (or at
        // an empty range) extends it, so retyped text inherits the format.
        const fmtInsert = (line: Line, pos: number, count: number) => {
            if (!fmt || fmt.line !== line) return;
            let { start, end } = fmt;
            if (pos < start) {
                start += count;
                end += count;
            } else if (pos <= end) {
                end += count;
            }
            fmt = { ...fmt, start, end };
            setFormat(fmt);
        };
        // Removing chars [a,b) on `line`: shrink/shift the range to match.
        const fmtDelete = (line: Line, a: number, b: number) => {
            if (!fmt || fmt.line !== line) return;
            const beforeStart = Math.max(0, Math.min(b, fmt.start) - a);
            const beforeEnd = Math.max(0, Math.min(b, fmt.end) - a);
            const start = fmt.start - beforeStart;
            const end = fmt.end - beforeEnd;
            fmt = { ...fmt, start, end: Math.max(start, end) };
            setFormat(fmt);
        };

        // Would `candidate` line-two text still fit on one line?
        const fits = (candidate: string) => {
            const m = measureRef.current;
            const box = line2Ref.current;
            if (!m || !box) return candidate.length <= 16;
            m.textContent = candidate;
            return m.offsetWidth <= box.clientWidth;
        };

        const nounWord = () => NOUNS[nounIdx].word;
        const verbStr = () => verbForm(VERBS[verbIdx].base, hasS);
        // Where the noun begins on line one, per mode ("" / "What <modal> ").
        const nounStart = () =>
            mode === 'stmt' ? 0 : 5 + MODALS[modalIdx].length + 1;
        // Where the connector begins (statement), shifted by any noun garnish.
        const connStart = () => nounWord().length + gNoun.length + 1;
        // Where the object begins on line two, per mode. Statements use the
        // current verb + its link; questions are always "do for ".
        const objStart = () =>
            mode === 'stmt' ? verbStr().length + link.length : 2 + FOR.length;
        const objectAllowed = (i: number) =>
            subjectAllowsObject(nounIdx, i) &&
            (mode === 'stmt'
                ? verbAllowsObject(verbIdx, i)
                : !OBJECTS[i].kinds.includes('abstract'));
        const nounAllowed = (i: number) =>
            mode === 'stmt' || !QUESTION_SUBJECT_BLOCKLIST.has(NOUNS[i].word);
        const questionText = (n: number, o: number, m = modalIdx) => ({
            line1: `What ${MODALS[m]} ${NOUNS[n].word.toLowerCase()}`,
            line2: `do${FOR}${objectText(o)}?`,
        });
        const questionPairCandidates = () =>
            QUESTION_PAIRS.map(([noun, obj]) => ({
                nounIdx: NOUNS.findIndex((n) => n.word === noun),
                objIdx: OBJECTS.findIndex((o) => o.text === obj),
            })).filter(({ nounIdx: n, objIdx: o }) => {
                if (n < 0 || o < 0) return false;
                const q = questionText(n, o);
                return subjectAllowsObject(n, o) && fits(q.line1) && fits(q.line2);
            });
        const pickQuestionPair = (avoidNoun = nounIdx, avoidObj = objIdx) => {
            const candidates = questionPairCandidates().filter(
                (p) => p.nounIdx !== avoidNoun || p.objIdx !== avoidObj
            );
            if (!candidates.length) return null;
            return candidates[Math.floor(Math.random() * candidates.length)];
        };
        // Line one composed for the fit check, with a noun garnish `gn`.
        const composeL1 = (n: number, c: number, m: number, gn: string) =>
            mode === 'stmt'
                ? `${NOUNS[n].word}${gn} ${CONNECTORS[c]}`
                : `What ${MODALS[m]} ${NOUNS[n].word.toLowerCase()}${gn}`;

        // --- primitives ---------------------------------------------------

        // Jump the caret straight to (line, pos) with the mouse: a different
        // line pauses like reaching over and resetting; a hop is quicker.
        const jump = (line: Line, pos: number, done: () => void) => {
            const lineChanged = cLine !== line;
            cLine = line;
            cPos = pos;
            setCaretLine(line);
            setCaretPos(pos);
            setMoving(false);
            schedule(done, lineChanged ? mouseDelay() : resumeDelay());
        };

        // Walk the caret to (line, pos) with the arrow keys — Up/Down to change
        // line (column clamped), then Left/Right along it, one press at a time.
        // No mouse reach, so it flows straight from typing. Sometimes it
        // overshoots the target by a press or two, pauses, then corrects.
        const arrowTo = (line: Line, pos: number, done: () => void) => {
            const lineLen = () => (line === 1 ? l1 : l2).length;
            const walk = (target: number, after: () => void) => {
                const step = () => {
                    setMoving(true);
                    if (cLine === line && cPos === target) {
                        after();
                        return;
                    }
                    if (cLine !== line) {
                        cLine = line;
                        if (cPos > lineLen()) cPos = lineLen();
                        setCaretLine(cLine);
                    } else {
                        cPos += target > cPos ? 1 : -1;
                    }
                    setCaretPos(cPos);
                    schedule(step, arrowDelay());
                };
                schedule(step, arrowDelay());
            };
            if (Math.random() < 0.3) {
                const dir = pos >= cPos ? 1 : -1;
                const over = Math.max(
                    0,
                    Math.min(lineLen(), pos + dir * (1 + Math.floor(Math.random() * 2)))
                );
                if (over !== pos) {
                    walk(over, () => {
                        schedule(() => walk(pos, done), rand(120, 300));
                    });
                    return;
                }
            }
            walk(pos, done);
        };

        // Hop the caret to (line, pos) by whole words (Option/Ctrl+Arrow) — a
        // few big jumps between word boundaries, then a short step to land.
        const wordJumpTo = (line: Line, pos: number, done: () => void) => {
            const lineLen = () => (line === 1 ? l1 : l2).length;
            const boundaries = () => {
                const s = line === 1 ? l1 : l2;
                const b = [0];
                for (let i = 1; i < s.length; i++) {
                    if (s[i - 1] === ' ' && s[i] !== ' ') b.push(i);
                }
                if (b[b.length - 1] !== s.length) b.push(s.length);
                return b;
            };
            const hop = () => {
                setMoving(true);
                if (cLine === line && cPos === pos) {
                    done();
                    return;
                }
                if (cLine !== line) {
                    cLine = line;
                    if (cPos > lineLen()) cPos = lineLen();
                    setCaretLine(cLine);
                    setCaretPos(cPos);
                    schedule(hop, arrowDelay());
                    return;
                }
                const bs = boundaries();
                let next: number;
                if (pos > cPos) {
                    const b = bs.find((x) => x > cPos);
                    next = b !== undefined && b <= pos ? b : pos;
                } else {
                    const b = [...bs].reverse().find((x) => x < cPos);
                    next = b !== undefined && b >= pos ? b : pos;
                }
                cPos = next;
                setCaretPos(cPos);
                schedule(hop, next === pos ? rand(45, 95) : arrowDelay());
            };
            schedule(hop, arrowDelay());
        };

        // Move the caret to (line, pos): mostly a mouse click, sometimes arrow
        // keys, sometimes word-jumps.
        const click = (line: Line, pos: number, done: () => void) => {
            if (cLine === line && cPos === pos) return done();
            const r = Math.random();
            if (r < ARROW_CHANCE / 2) wordJumpTo(line, pos, done);
            else if (r < ARROW_CHANCE) arrowTo(line, pos, done);
            else jump(line, pos, done);
        };

        const write = (text: string) => {
            if (cLine === 1) l1 = text;
            else l2 = text;
        };
        const current = () => (cLine === 1 ? l1 : l2);

        // Backspace `n` code units before the caret, one keystroke at a time,
        // but never split an emoji's surrogate pair (which would flash a "�").
        // Like a held key, successive deletes accelerate to a quick repeat.
        const backspace = (n: number, done: () => void) => {
            let left = n;
            let held = 0;
            const heldDelay = () => Math.max(26, 95 - held * 11) + rand(-6, 6);
            const step = () => {
                setMoving(true);
                if (left <= 0) {
                    done();
                    return;
                }
                const s = current();
                let remove = 1;
                const lo = s.charCodeAt(cPos - 1);
                if (lo >= 0xdc00 && lo <= 0xdfff && cPos >= 2) {
                    const hi = s.charCodeAt(cPos - 2);
                    if (hi >= 0xd800 && hi <= 0xdbff) remove = 2; // full emoji
                }
                write(s.slice(0, cPos - remove) + s.slice(cPos));
                fmtDelete(cLine, cPos - remove, cPos);
                cPos -= remove;
                left -= remove;
                held += 1;
                paint();
                schedule(step, heldDelay());
            };
            schedule(step, deleteDelay());
        };

        // Type `str` at the caret. With `allowTypos`, it may make an instantly
        // caught mistake mid-word — a slip to an adjacent key, two letters
        // transposed, or a doubled letter — plus space slips (words run
        // together, or a doubled space), then correct it and carry on. Capitals
        // take a beat longer, as if reaching for Shift.
        const type = (str: string, done: () => void, allowTypos = true) => {
            let i = 0;
            let skippedAt = -1; // absolute index where a space was left out
            const insert = (ch: string) => {
                const s = current();
                write(s.slice(0, cPos) + ch + s.slice(cPos));
                fmtInsert(cLine, cPos, 1);
                cPos += 1;
                paint();
            };
            const unInsert = () => {
                const s = current();
                write(s.slice(0, cPos - 1) + s.slice(cPos));
                fmtDelete(cLine, cPos - 1, cPos);
                cPos -= 1;
                paint();
            };
            // Delay before the next char, longer for a capital (Shift reach).
            const nextDelay = () => {
                const c = str[i];
                return typeDelay() + (c >= 'A' && c <= 'Z' ? shiftReach() : 0);
            };
            const step = () => {
                setMoving(true);
                if (i >= str.length) {
                    if (skippedAt >= 0) {
                        // finished; go back and insert the space we ran past
                        const at = skippedAt;
                        skippedAt = -1;
                        setMoving(false);
                        schedule(
                            () =>
                                click(cLine, at, () => {
                                    insert(' ');
                                    done();
                                }),
                            noticeDelay()
                        );
                        return;
                    }
                    done();
                    return;
                }
                // internal single space: sometimes run the words together
                // (fix later) or double it (catch at once)
                if (
                    allowTypos &&
                    skippedAt < 0 &&
                    str[i] === ' ' &&
                    str[i - 1] &&
                    str[i - 1] !== ' ' &&
                    i + 1 < str.length &&
                    str[i + 1] !== ' ' &&
                    Math.random() < SPACE_ERR
                ) {
                    return spaceSlip();
                }
                if (allowTypos && i > 0 && Math.random() < TYPO_CHANCE) {
                    return slipUp();
                }
                insert(str[i]);
                i += 1;
                schedule(step, nextDelay());
            };
            // A space typed twice (caught) or skipped entirely (fixed later).
            const spaceSlip = () => {
                if (Math.random() < 0.5) {
                    insert(' ');
                    insert(' ');
                    schedule(() => {
                        unInsert();
                        i += 1;
                        schedule(step, nextDelay());
                    }, quickNotice());
                } else {
                    skippedAt = cPos; // where the space belongs
                    i += 1;
                    schedule(step, nextDelay());
                }
            };
            // An instantly caught mistake at position i, then resume typing.
            const slipUp = () => {
                const wrong = slip(str[i]);
                const r = Math.random();
                if (r < 0.6 && str[i + 1] && str[i] !== str[i + 1]) {
                    // transposition: type the next two letters swapped
                    insert(str[i + 1]);
                    insert(str[i]);
                    schedule(() => {
                        unInsert();
                        unInsert();
                        schedule(() => {
                            insert(str[i]);
                            insert(str[i + 1]);
                            i += 2;
                            schedule(step, typeDelay());
                        }, resumeDelay());
                    }, quickNotice());
                } else if (r < 0.8 && str[i - 1] !== str[i]) {
                    // doubled letter: repeat the previous one, then drop it
                    insert(str[i - 1]);
                    schedule(() => {
                        unInsert();
                        schedule(() => {
                            insert(str[i]);
                            i += 1;
                            schedule(step, typeDelay());
                        }, resumeDelay());
                    }, quickNotice());
                } else if (wrong) {
                    // adjacent-key substitution
                    insert(wrong);
                    schedule(() => {
                        unInsert();
                        schedule(() => {
                            insert(str[i]);
                            i += 1;
                            schedule(step, typeDelay());
                        }, resumeDelay());
                    }, noticeDelay());
                } else {
                    insert(str[i]);
                    i += 1;
                    schedule(step, typeDelay());
                }
            };
            const first = str[0];
            if (first >= 'A' && first <= 'Z') schedule(step, shiftReach());
            else step();
        };

        // Type a word with an uncaught mistake — substitution, transposition,
        // doubled or dropped letter — finish it, pause as if noticing, then go
        // back and fix it: usually by deleting back to where it went wrong and
        // retyping from there, occasionally by a targeted edit at the spot.
        const typeLate = (str: string, done: () => void) => {
            const m = makeMistake(str);
            if (!m) return type(str, done);
            const start = cPos;
            const { flawed, diverge } = m;
            // a single wrong character (substitution) can be fixed in place;
            // transpositions/doubles/drops differ in more than one spot.
            const singleSub =
                flawed.length === str.length &&
                flawed.slice(diverge + 1) === str.slice(diverge + 1);
            type(
                flawed,
                () => {
                    setMoving(false);
                    schedule(() => {
                        if (singleSub && Math.random() < 0.4) {
                            // targeted: fix just the wrong character in place
                            click(cLine, start + diverge + 1, () =>
                                backspace(1, () =>
                                    type(str[diverge], done, false)
                                )
                            );
                        } else {
                            // delete back to the mistake, then retype the rest —
                            // and now and then fumble the fix with a fresh slip
                            const fumble = Math.random() < 0.35;
                            click(cLine, start + flawed.length, () =>
                                backspace(flawed.length - diverge, () =>
                                    type(str.slice(diverge), done, fumble)
                                )
                            );
                        }
                    }, noticeDelay());
                },
                false
            );
        };

        // Type a fresh word — usually cleanly (with the odd instant slip), but
        // now and then with a mistake left in and fixed only after finishing.
        const typeWord = (str: string, done: () => void) => {
            if (str.length >= 3 && Math.random() < LATE_TYPO_CHANCE)
                typeLate(str, done);
            else type(str, done);
        };

        // Select [start, end) on `line`. Sometimes a double-click grabs the
        // whole word at once; otherwise it drag-selects one char at a time,
        // like holding shift/arrow.
        const selectRange = (
            line: Line,
            start: number,
            end: number,
            done: () => void
        ) => {
            if (Math.random() < 0.45) {
                // double-click: the word highlights all at once
                click(line, end, () => {
                    cLine = line;
                    cPos = end;
                    sel = { line, start, end };
                    setMoving(true);
                    setSelection(sel);
                    setCaretLine(line);
                    setCaretPos(end);
                    schedule(done, rand(240, 460));
                });
                return;
            }
            click(line, start, () => {
                let cur = start;
                const grow = () => {
                    setMoving(true);
                    if (cur >= end) {
                        schedule(done, rand(240, 460)); // hold selection
                        return;
                    }
                    cur += 1;
                    cLine = line;
                    cPos = cur;
                    sel = { line, start, end: cur };
                    setSelection(sel);
                    setCaretLine(line);
                    setCaretPos(cur);
                    schedule(grow, rand(35, 75));
                };
                schedule(grow, rand(120, 220));
            });
        };

        // Delete the current selection at once (as a keystroke would).
        const deleteSel = (done: () => void) => {
            if (!sel) return done();
            const line = sel.line;
            const s = line === 1 ? l1 : l2;
            const cut = s.slice(0, sel.start) + s.slice(sel.end);
            if (line === 1) l1 = cut;
            else l2 = cut;
            fmtDelete(line, sel.start, sel.end);
            cLine = line;
            cPos = sel.start;
            sel = null;
            setMoving(true);
            setSelection(null);
            paint();
            done();
        };

        // Formatting tracks a character range (see fmtInsert/fmtDelete), so it
        // shifts with edits and needs no manual bookkeeping in the swaps.

        // Replace the word of length `curLen` starting at `start` on `line` —
        // usually by deleting and retyping, sometimes by selecting then typing
        // over the highlight.
        const swapWord = (
            line: Line,
            start: number,
            curLen: number,
            next: string,
            done: () => void,
            decoy?: string
        ) => {
            // Loosen the boundaries a bit — a real selection/backspace often
            // grabs an adjacent space rather than landing exactly on the word.
            // Whatever space we swallow, we retype, so the sentence is unchanged.
            const src = line === 1 ? l1 : l2;
            let s = start;
            let e = start + curLen;
            const lead = s > 0 && src[s - 1] === ' ' && Math.random() < 0.4;
            if (lead) s -= 1;
            const trail = e < src.length && src[e] === ' ' && Math.random() < 0.4;
            if (trail) e += 1;
            const wrap = (w: string) =>
                (lead ? ' ' : '') + w + (trail ? ' ' : '');
            const repl = wrap(next);
            const span = e - s;
            // Type the replacement — but now and then type a plausible wrong
            // word first, realize, wipe it, and type the intended one.
            const typePhase = (cb: () => void) => {
                if (decoy && decoy !== next && Math.random() < BRAINO_CHANCE) {
                    const dec = wrap(decoy);
                    typeWord(dec, () => {
                        setMoving(false);
                        schedule(
                            () =>
                                backspace(dec.length, () =>
                                    schedule(() => typeWord(repl, cb), GAP_MS)
                                ),
                            rand(420, 720)
                        );
                    });
                } else {
                    typeWord(repl, cb);
                }
            };
            // Position tracking carries the format automatically: deleting the
            // word shrinks its range, retyping re-extends it (transfer), and
            // edits to other words just shift it.
            if (Math.random() < SELECT_CHANCE) {
                selectRange(line, s, e, () =>
                    deleteSel(() =>
                        schedule(() => typePhase(done), rand(70, 170))
                    )
                );
            } else {
                click(line, e, () =>
                    backspace(span, () =>
                        schedule(() => typePhase(done), GAP_MS)
                    )
                );
            }
        };

        // Pick any fitting alternative instead of walking the list in order.
        // This keeps newly appended words from being buried behind dozens of
        // earlier entries.
        const pickFitting = (
            cur: number,
            len: number,
            build: (i: number) => string
        ) => {
            const candidates: number[] = [];
            for (let i = 0; i < len; i++) {
                const candidate = build(i);
                if (i !== cur && candidate && fits(candidate)) candidates.push(i);
            }
            if (!candidates.length) return -1;
            return candidates[Math.floor(Math.random() * candidates.length)];
        };

        // --- composed edits ----------------------------------------------

        // After a line-one change in statement mode, reconcile the verb's "s".
        const reconcile = (done: () => void) => {
            const want = wantsS(nounIdx, connIdx);
            if (want === hasS) {
                done();
                return;
            }
            // the verb format follows the "s" change automatically via the
            // insert/delete position tracking below
            const sPos = VERBS[verbIdx].base.length; // the verb's "s" sits here
            if (want) {
                click(2, sPos, () =>
                    type('s', () => {
                        hasS = true;
                        done();
                    })
                );
            } else {
                click(2, sPos + 1, () =>
                    backspace(1, () => {
                        hasS = false;
                        done();
                    })
                );
            }
        };

        // Line one shares line two's width, so the same fit check keeps a noun,
        // connector, or modal from spilling past the frame.
        const swapNoun = () => {
            // swapping the noun drops any emoji attached to the old noun
            const cand = pickFitting(nounIdx, NOUNS.length, (i) =>
                mode === 'q' &&
                !QUESTION_PAIRS.some(
                    ([noun, obj]) =>
                        noun === NOUNS[i].word && obj === objectText(objIdx)
                )
                    ? ''
                    : mode === 'stmt' && !verbAllowsSubject(verbIdx, i)
                    ? ''
                    : !subjectAllowsObject(i, objIdx)
                    ? ''
                    : nounAllowed(i)
                      ? composeL1(i, connIdx, modalIdx, '')
                      : ''
            );
            if (cand < 0) return hold();
            const asWord = (i: number) =>
                mode === 'stmt'
                    ? NOUNS[i].word
                    : NOUNS[i].word.toLowerCase();
            const next = asWord(cand);
            // a plausible wrong noun to fumble first
            let decoy: string | undefined;
            for (let k = 1; k < NOUNS.length; k++) {
                const d = (cand + k) % NOUNS.length;
                if (
                    d !== nounIdx &&
                    nounAllowed(d) &&
                    subjectAllowsObject(d, objIdx) &&
                    (mode !== 'q' ||
                        QUESTION_PAIRS.some(
                            ([noun, obj]) =>
                                noun === NOUNS[d].word && obj === objectText(objIdx)
                        )) &&
                    (mode !== 'stmt' || verbAllowsSubject(verbIdx, d)) &&
                    fits(composeL1(d, connIdx, modalIdx, ''))
                ) {
                    decoy = asWord(d);
                    break;
                }
            }
            swapWord(
                1,
                nounStart(),
                nounWord().length + gNoun.length,
                next,
                () => {
                    nounIdx = cand;
                    gNoun = '';
                    if (mode === 'stmt') reconcile(hold);
                    else hold();
                },
                decoy
            );
        };

        const swapConnector = () => {
            const cand = pickFitting(connIdx, CONNECTORS.length, (i) =>
                composeL1(nounIdx, i, modalIdx, gNoun)
            );
            if (cand < 0) return hold();
            swapWord(
                1,
                connStart(),
                CONNECTORS[connIdx].length,
                CONNECTORS[cand],
                () => {
                    connIdx = cand;
                    reconcile(hold);
                }
            );
        };

        const swapModal = () => {
            const cand = pickFitting(modalIdx, MODALS.length, (i) =>
                composeL1(nounIdx, connIdx, i, gNoun)
            );
            if (cand < 0) return hold();
            swapWord(1, 5, MODALS[modalIdx].length, MODALS[cand], () => {
                modalIdx = cand;
                hold();
            });
        };

        // Swap the verb (and re-pick a link it accepts), replacing "<verb><link>"
        // as one unit since a new verb may take a different link.
        const swapVerb = () => {
            const candidates: Array<{ verbIdx: number; link: string }> = [];
            for (let ci = 0; ci < VERBS.length; ci++) {
                if (ci === verbIdx) continue;
                const links = VERBS[ci].links;
                for (const lk of links) {
                    const head = verbForm(VERBS[ci].base, hasS) + lk;
                    if (
                        verbAllowsSubject(ci, nounIdx) &&
                        subjectAllowsObject(nounIdx, objIdx) &&
                        verbAllowsObject(ci, objIdx) &&
                        fits(head + objectText(objIdx) + gObj)
                    ) {
                        candidates.push({ verbIdx: ci, link: lk });
                    }
                }
            }
            if (!candidates.length) return hold();
            const cand = candidates[Math.floor(Math.random() * candidates.length)];
            const head = verbForm(VERBS[cand.verbIdx].base, hasS) + cand.link;
            swapWord(2, 0, verbStr().length + link.length, head, () => {
                verbIdx = cand.verbIdx;
                link = cand.link;
                hold();
            });
        };

        // Toggle a both-ways verb between "serves for you" and "serves you" by
        // editing just the "for " between the verb and the object.
        const swapLink = () => {
            if (VERBS[verbIdx].links.length < 2) return hold();
            const other = link === FOR ? TO : FOR;
            if (!fits(verbStr() + other + objectText(objIdx) + gObj)) return hold();
            const afterVerb = verbStr().length;
            if (other === TO) {
                // drop "for ": caret past it, backspace the 4 chars
                click(2, afterVerb + FOR.length, () =>
                    backspace(FOR.length - 1, () => {
                        link = TO;
                        hold();
                    })
                );
            } else {
                // add "for ": caret after the space, type it
                click(2, afterVerb + 1, () =>
                    type('for ', () => {
                        link = FOR;
                        hold();
                    })
                );
            }
        };

        const swapObject = () => {
            const head = mode === 'stmt' ? verbStr() + link : 'do' + FOR;
            const tailQ = mode === 'stmt' ? '' : '?';
            const cand = pickFitting(
                objIdx,
                OBJECTS.length,
                (i) =>
                    mode === 'q' &&
                    !QUESTION_PAIRS.some(
                        ([noun, obj]) =>
                            noun === NOUNS[nounIdx].word && obj === objectText(i)
                    )
                        ? ''
                        : objectAllowed(i)
                          ? head + objectText(i) + tailQ + gObj
                          : ''
            );
            if (cand < 0) return hold();
            // a plausible wrong object to fumble first
            let decoy: string | undefined;
            for (let k = 1; k < OBJECTS.length; k++) {
                const d = (cand + k) % OBJECTS.length;
                if (
                    d !== objIdx &&
                    objectAllowed(d) &&
                    fits(head + objectText(d) + tailQ + gObj)
                ) {
                    decoy = objectText(d);
                    break;
                }
            }
            swapWord(
                2,
                objStart(),
                objectText(objIdx).length,
                objectText(cand),
                () => {
                    objIdx = cand;
                    hold();
                },
                decoy
            );
        };

        // --- garnishes: punctuation / emoji, after the noun or the object -----

        const objEmoji = () => {
            const pool =
                mode === 'stmt'
                    ? [VERB_EMOJI[verbIdx], OBJ_EMOJI[objIdx], ...EXTRA_EMOJI]
                    : [OBJ_EMOJI[objIdx], ...EXTRA_EMOJI];
            return pool[Math.floor(Math.random() * pool.length)];
        };
        const nounEmoji = () => {
            const pool = [NOUN_EMOJI[nounIdx], ...EXTRA_EMOJI];
            return pool[Math.floor(Math.random() * pool.length)];
        };

        // An emoji arrives whole, as if from a picker, not typed key by key
        // (its surrogate pair must never be split). `place` records where it went.
        const addGarnish = (t: string, place: 'noun' | 'obj', done: () => void) => {
            schedule(() => {
                setMoving(true);
                const s = current();
                write(s.slice(0, cPos) + t + s.slice(cPos));
                fmtInsert(cLine, cPos, t.length);
                cPos += t.length;
                if (place === 'noun') gNoun = t;
                else gObj = t;
                paint();
                done();
            }, rand(300, 600));
        };
        const removeGarnish = (
            n: number,
            place: 'noun' | 'obj',
            done: () => void
        ) => {
            const clear = () => {
                if (place === 'noun') gNoun = '';
                else gObj = '';
            };
            if (/[^\x00-\x7F]/.test(current().slice(cPos - n, cPos))) {
                schedule(() => {
                    setMoving(true);
                    const s = current();
                    write(s.slice(0, cPos - n) + s.slice(cPos));
                    fmtDelete(cLine, cPos - n, cPos);
                    cPos -= n;
                    clear();
                    paint();
                    done();
                }, deleteDelay());
            } else {
                backspace(n, () => {
                    clear();
                    done();
                });
            }
        };

        const garnish = () => {
            // clear whichever garnish is present
            if (gObj) {
                click(2, l2.length, () => removeGarnish(gObj.length, 'obj', hold));
                return;
            }
            if (gNoun) {
                const end = nounStart() + nounWord().length + gNoun.length;
                click(1, end, () => removeGarnish(gNoun.length, 'noun', hold));
                return;
            }
            const roll = Math.random();
            if (roll < 0.34) {
                // punctuation in statements; a doubled "?" in questions — at end
                const p =
                    mode === 'stmt'
                        ? PUNCTS[Math.floor(Math.random() * PUNCTS.length)]
                        : '?';
                if (!fits(l2 + p)) return hold();
                click(2, l2.length, () =>
                    type(p, () => {
                        gObj = p;
                        hold();
                    })
                );
            } else if (roll < 0.67) {
                // emoji after the object
                const t = ' ' + objEmoji();
                if (!fits(l2 + t)) return hold();
                click(2, l2.length, () => addGarnish(t, 'obj', hold));
            } else {
                // emoji after the subject noun
                const t = ' ' + nounEmoji();
                if (!fits(composeL1(nounIdx, connIdx, modalIdx, t))) return hold();
                click(1, nounStart() + nounWord().length, () =>
                    addGarnish(t, 'noun', hold)
                );
            }
        };

        // Highlight a content word, then style it bold/italic/underline — or,
        // if one is already styled, reselect it and clear or change it.
        const pickFormatWord = () => {
            const opts =
                mode === 'stmt'
                    ? [
                          { line: 1 as Line, start: nounStart(), text: nounWord() },
                          { line: 2 as Line, start: 0, text: verbStr() },
                          {
                              line: 2 as Line,
                              start: objStart(),
                              text: objectText(objIdx),
                          },
                      ]
                    : [
                          { line: 1 as Line, start: 5, text: MODALS[modalIdx] },
                          {
                              line: 1 as Line,
                              start: nounStart(),
                              text: nounWord().toLowerCase(),
                          },
                          {
                              line: 2 as Line,
                              start: objStart(),
                              text: objectText(objIdx),
                          },
                      ];
            return opts[Math.floor(Math.random() * opts.length)];
        };

        // Trim a range down to just its word(s): drop leading spaces and any
        // trailing space / punctuation / emoji.
        const cleanRange = (
            line: Line,
            start: number,
            end: number
        ): [number, number] => {
            const s = line === 1 ? l1 : l2;
            let a = start;
            let b = end;
            while (a < b && s[a] === ' ') a++;
            while (b > a && !/[a-z]/i.test(s[b - 1])) b--;
            return [a, b];
        };

        // If the format has spread past its word (into a space, emoji, or
        // punctuation — happens for every kind, just most visible underlined),
        // return the clean word range; otherwise null.
        const messyFmt = (): [number, number] | null => {
            if (!fmt || fmt.end <= fmt.start) return null;
            const [a, b] = cleanRange(fmt.line, fmt.start, fmt.end);
            if (b <= a) return null;
            return a !== fmt.start || b !== fmt.end ? [a, b] : null;
        };

        // Go back and retract the formatting to just its word, so it reads as
        // intentional rather than a "forgot to turn it off" smear.
        const tidyFormat = () => {
            const clean = messyFmt();
            if (!clean || !fmt) return hold();
            const prev = fmt;
            selectRange(prev.line, prev.start, prev.end, () => {
                fmt = {
                    line: prev.line,
                    start: clean[0],
                    end: clean[1],
                    kind: prev.kind,
                };
                setFormat(fmt);
                sel = null;
                setSelection(null);
                hold();
            });
        };

        const formatWord = () => {
            if (fmt && fmt.end > fmt.start) {
                // if it has smeared past the word, sometimes just tidy it
                if (messyFmt() && Math.random() < 0.6) return tidyFormat();
                const prev = fmt;
                selectRange(prev.line, prev.start, prev.end, () => {
                    if (Math.random() < 0.5) {
                        fmt = null; // clear formatting
                    } else {
                        const others = FMT_KINDS.filter((k) => k !== prev.kind);
                        fmt = {
                            ...prev,
                            kind: others[Math.floor(Math.random() * others.length)],
                        };
                    }
                    setFormat(fmt);
                    sel = null;
                    setSelection(null);
                    hold();
                });
                return;
            }
            const w = pickFormatWord();
            selectRange(w.line, w.start, w.start + w.text.length, () => {
                fmt = {
                    line: w.line,
                    start: w.start,
                    end: w.start + w.text.length,
                    kind: FMT_KINDS[Math.floor(Math.random() * FMT_KINDS.length)],
                };
                setFormat(fmt);
                sel = null;
                setSelection(null);
                hold();
            });
        };

        const switchPhrase = () => {
            const candidates = PHRASE_PROMPTS.filter(
                (p) => fits(p.line1) && fits(p.line2)
            );
            if (!candidates.length) return hold();
            const prompt = candidates[Math.floor(Math.random() * candidates.length)];
            click(2, l2.length, () =>
                backspace(l2.length, () =>
                    click(1, l1.length, () =>
                        backspace(l1.length, () => {
                            mode = 'phrase';
                            gNoun = '';
                            gObj = '';
                            fmt = null;
                            setFormat(null);
                            schedule(
                                () =>
                                    type(prompt.line1, () =>
                                        click(2, 0, () => type(prompt.line2, hold))
                                    ),
                                GAP_MS
                            );
                        })
                    )
                )
            );
        };

        // Rewrite the whole headline into the other form. The target lines are
        // computed (and fit-adjusted) up front so we never clear the frame for a
        // rewrite that wouldn't fit inside it.
        const switchMode = () => {
            const target: Mode = mode === 'stmt' ? 'q' : 'stmt';
            let nl1: string;
            let nl2: string;
            let nounTo = nounIdx;
            let objTo = objIdx;
            let modalTo = modalIdx;
            let verbTo = verbIdx;
            let linkTo = link;
            let hasTo = hasS;
            if (target === 'stmt') {
                hasTo = wantsS(nounIdx, connIdx);
                if (!VERBS[verbTo].links.includes(linkTo)) {
                    linkTo = VERBS[verbTo].links[0];
                }
                const statement = (v: number, lk: string, o: number) =>
                    verbForm(VERBS[v].base, hasTo) + lk + objectText(o);
                const valid = (v: number, lk: string, o: number) =>
                    verbAllowsSubject(v, nounIdx) &&
                    subjectAllowsObject(nounIdx, o) &&
                    verbAllowsObject(v, o) &&
                    fits(statement(v, lk, o));
                if (!valid(verbTo, linkTo, objTo)) {
                    const candidates: Array<{
                        verbIdx: number;
                        link: string;
                        objIdx: number;
                    }> = [];
                    for (let vi = 0; vi < VERBS.length; vi++) {
                        if (!verbAllowsSubject(vi, nounIdx)) continue;
                        for (const lk of VERBS[vi].links) {
                            for (let oi = 0; oi < OBJECTS.length; oi++) {
                                if (
                                    subjectAllowsObject(nounIdx, oi) &&
                                    verbAllowsObject(vi, oi) &&
                                    fits(statement(vi, lk, oi))
                                ) {
                                    candidates.push({ verbIdx: vi, link: lk, objIdx: oi });
                                }
                            }
                        }
                    }
                    if (!candidates.length) return hold();
                    const cand =
                        candidates[Math.floor(Math.random() * candidates.length)];
                    verbTo = cand.verbIdx;
                    linkTo = cand.link;
                    objTo = cand.objIdx;
                }
                nl1 = `${NOUNS[nounTo].word} ${CONNECTORS[connIdx]}`;
                nl2 = statement(verbTo, linkTo, objTo);
            } else {
                const pair = pickQuestionPair(nounTo, objTo);
                if (pair) {
                    nounTo = pair.nounIdx;
                    objTo = pair.objIdx;
                } else {
                    if (QUESTION_SUBJECT_BLOCKLIST.has(NOUNS[nounTo].word)) {
                        const buildNoun = (i: number) =>
                            !QUESTION_SUBJECT_BLOCKLIST.has(NOUNS[i].word)
                                ? `What ${MODALS[modalTo]} ${NOUNS[i].word.toLowerCase()}`
                                : '';
                        const c = pickFitting(nounTo, NOUNS.length, buildNoun);
                        if (c >= 0) nounTo = c;
                    }
                    if (OBJECTS[objTo].kinds.includes('abstract')) {
                        const buildObj = (i: number) =>
                            !OBJECTS[i].kinds.includes('abstract')
                                ? `do${FOR}${objectText(i)}?`
                                : '';
                        const c = pickFitting(objTo, OBJECTS.length, buildObj);
                        if (c >= 0) objTo = c;
                    }
                }
                const build = (i: number) =>
                    `What ${MODALS[i]} ${NOUNS[nounTo].word.toLowerCase()}`;
                if (!fits(build(modalTo))) {
                    const c = pickFitting(modalTo, MODALS.length, build);
                    if (c >= 0) modalTo = c;
                }
                nl1 = build(modalTo);
                nl2 = `do${FOR}${objectText(objTo)}?`;
            }
            if (!fits(nl1) || !fits(nl2)) return hold(); // can't fit — skip it

            click(2, l2.length, () =>
                backspace(l2.length, () =>
                    click(1, l1.length, () =>
                        backspace(l1.length, () => {
                            mode = target;
                            gNoun = '';
                            gObj = '';
                            fmt = null;
                            setFormat(null);
                            nounIdx = nounTo;
                            hasS = hasTo;
                            verbIdx = verbTo;
                            link = linkTo;
                            objIdx = objTo;
                            modalIdx = modalTo;
                            schedule(
                                () =>
                                    type(nl1, () =>
                                        click(2, 0, () => type(nl2, hold))
                                    ),
                                GAP_MS
                            );
                        })
                    )
                )
            );
        };

        function hold() {
            setMoving(false);
            schedule(() => {
                if (mode === 'phrase') return switchMode();
                // if a format has smeared past its word, sometimes go fix it
                if (messyFmt() && Math.random() < 0.22) return tidyFormat();
                const r = Math.random();
                if (mode === 'stmt') {
                    const canLink = VERBS[verbIdx].links.length > 1;
                    if (r < 0.18) swapVerb();
                    else if (r < 0.35) swapObject();
                    else if (r < 0.49) swapNoun();
                    else if (r < 0.61) swapConnector();
                    else if (r < 0.74) garnish();
                    else if (r < 0.83) formatWord();
                    else if (r < 0.89) canLink ? swapLink() : swapObject();
                    else if (r < 0.95) switchPhrase();
                    else switchMode();
                } else {
                    if (r < 0.3) swapObject();
                    else if (r < 0.5) swapNoun();
                    else if (r < 0.67) swapModal();
                    else if (r < 0.81) garnish();
                    else if (r < 0.9) formatWord();
                    else switchMode();
                }
            }, HOLD_MS);
        }

        // Pause while the hero is off-screen or the tab is hidden; resume on
        // return. Combines the Page Visibility API with an IntersectionObserver.
        let tabHidden = document.hidden;
        let offScreen = false;
        const sync = () => setRunning(!tabHidden && !offScreen);
        const onVis = () => {
            tabHidden = document.hidden;
            sync();
        };
        document.addEventListener('visibilitychange', onVis);
        let io: IntersectionObserver | null = null;
        const el = rootRef.current;
        if (el && 'IntersectionObserver' in window) {
            io = new IntersectionObserver(
                (entries) => {
                    offScreen = !entries[0].isIntersecting;
                    sync();
                },
                { threshold: 0 }
            );
            io.observe(el);
        }

        schedule(hold, HOLD_MS);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVis);
            io?.disconnect();
        };
    }, []);

    // Render a line split into runs, styling the selection highlight and any
    // formatted word, with the caret placed at its position.
    const renderLine = (lineNum: Line, text: string) => {
        const caretVisible = caretLine === lineNum;
        const cp = caretVisible ? caretPos : text.length;
        const selR =
            selection && selection.line === lineNum
                ? [selection.start, selection.end]
                : null;
        let fmtR: [number, number] | null = null;
        if (format && format.line === lineNum && format.end > format.start) {
            fmtR = [
                Math.min(format.start, text.length),
                Math.min(format.end, text.length),
            ];
        }
        const cuts = new Set<number>([0, text.length, cp]);
        if (selR) cuts.add(selR[0]), cuts.add(selR[1]);
        if (fmtR) cuts.add(fmtR[0]), cuts.add(fmtR[1]);
        const pts = [...cuts]
            .filter((n) => n >= 0 && n <= text.length)
            .sort((a, b) => a - b);
        const out: React.ReactNode[] = [];
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            if (a === cp)
                out.push(
                    <Caret
                        key={`car${lineNum}`}
                        visible={caretVisible}
                        moving={moving}
                    />
                );
            const b = pts[i + 1];
            if (b === undefined || b === a) continue;
            const cls = ['tw-word'];
            if (selR && a >= selR[0] && b <= selR[1] && selR[1] > selR[0])
                cls.push('tw-sel');
            if (fmtR && a >= fmtR[0] && b <= fmtR[1]) cls.push(`tw-${format!.kind}`);
            out.push(
                <span key={`${lineNum}-${a}`} className={cls.join(' ')}>
                    {text.slice(a, b)}
                </span>
            );
        }
        return out;
    };

    return (
        <span className="tw" aria-hidden="true" ref={rootRef}>
            <span className="tw-line1">{renderLine(1, line1)}</span>
            <em className="tw-line2" ref={line2Ref}>
                {renderLine(2, line2)}
            </em>
            <span className="tw-measure" ref={measureRef} aria-hidden="true" />
            {/* Design-tool selection handles around the text area. */}
            <i className="tw-handle tw-handle-tl" />
            <i className="tw-handle tw-handle-tr" />
            <i className="tw-handle tw-handle-bl" />
            <i className="tw-handle tw-handle-br" />
        </span>
    );
};

export default TypewriterHeadline;
