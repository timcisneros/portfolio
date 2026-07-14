import React, { memo, useEffect, useRef, useState } from 'react';
import {
    TrajectoryMemory,
    weightedChoice,
    type HeadlineQuality,
} from '../lib/headline/engine';
import { lowerSubject, thirdPerson } from '../lib/headline/grammar';
import {
    renderConstruction,
    renderOutcomeChain,
    type OutcomeChain,
} from '../lib/headline/constructions';
import { compileHeadlineManifest } from '../lib/headline/manifest';
import { HeadlineEditRuntime } from '../lib/headline/runtime';
import {
    HeadlineBehaviorPolicy,
    timingDelay,
    type TimingProfile,
} from '../lib/headline/policy';
import {
    expandRangeToWordBoundaries,
    type FormattingAffinity,
    nextGraphemeBoundary,
    normalizeGraphemeRange,
    previousGraphemeBoundary,
    transformFormattedDelete,
    transformFormattedInsert,
} from '../lib/headline/text';
import {
    CaretAnchorMemory,
    planSemanticPath,
    type CaretAnchorSlot,
    type CaretNavigationMode,
} from '../lib/headline/path';
import {
    CompositeEditPlanner,
    compileCompositeEditOperations,
    compileTextEditOperations,
    diffTextRevision,
    EditStrategyPlanner,
    planCoordinatedRevision,
    simulateEditTransaction,
    type WordEditChoreography,
    type EditOperation,
} from '../lib/headline/edits';
import {
    NarrativePlanner,
    analyzeRelationGraph,
    type ConstructionFamily,
    type Energy,
    type HeadlineDomain,
    type TrajectoryCandidate,
} from '../lib/headline/planner';

// The hero headline drafts itself live, like someone editing it in place. It
// works in two forms and occasionally rewrites from one to the other:
//   statement — "<noun> <connector> <verb> for <object>"  ("Software that works for you")
//   question  — "<Modal> <noun> <verb> <object>?"         ("Could APIs connect your product?")
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
const ALL_NOUNS = [
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
    { word: 'Visualizations', plural: true },
    { word: 'Workflow tools', plural: true },
    { word: 'Agent systems', plural: true },
    { word: 'Cloud applications', plural: true },
    { word: 'Field tools', plural: true },
    { word: 'Business applications', plural: true },
    { word: 'Workflow visualizers', plural: true },
    { word: 'Audit trails', plural: true },
    { word: 'Data pipelines', plural: true },
    { word: 'Serverless systems', plural: true },
    { word: 'Test suites', plural: true },
    { word: 'Full-stack applications', plural: true },
    { word: 'Operational software', plural: false },
    { word: 'Developer tools', plural: true },
    { word: 'AI workflows', plural: true },
    { word: 'Self-hosted apps', plural: true },
    { word: 'Diagnostic tools', plural: true },
];
const DISABLED_SUBJECTS = new Set([
    'Bots',
    'Chatbots',
    'Code',
    'Backends',
    'Features',
    'Infrastructure',
    'Modules',
    'Networks',
    'Pipelines',
    'APIs',
    'Agents',
    'Apps',
    'Command centers',
    'Consoles',
    'Cloud applications',
    'Data pipelines',
    'Data',
    'Databases',
    'Devtools',
    'Forms',
    'Full-stack applications',
    'Importers',
    'Admin panels',
    'Platforms',
    'Plugins',
    'Portals',
    'Programs',
    'Products',
    'Queues',
    'Search tools',
    'Self-hosted apps',
    'Serverless systems',
    'Schedulers',
    'Storefronts',
    'Test suites',
    'Websites',
    'Workbenches',
    'Parsers',
]);
const ACTIVE_NOUN_INDEXES = ALL_NOUNS.flatMap((noun, index) =>
    DISABLED_SUBJECTS.has(noun.word) ? [] : [index]
);
const NOUNS = ACTIVE_NOUN_INDEXES.map((index) => ALL_NOUNS[index]);
const CONNECTORS = [
    'that',
    'can',
    'could',
];
const MODALS = ['Could', 'How could', 'How might', 'Where could'];
const modalText = (idx: number) => MODALS[idx];
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
    past?: string;
    links: string[];
    subjectKinds?: SubjectKind[];
    objectKinds?: ObjectKind[];
};

const ALL_SUBJECT_KINDS: SubjectKind[][] = [
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
    ['data', 'interface'],
    ['tool', 'workflow'],
    ['automation', 'technical'],
    ['software', 'technical'],
    ['tool', 'ops'],
    ['software', 'business'],
    ['tool', 'workflow', 'interface'],
    ['data', 'technical'],
    ['data', 'workflow', 'automation'],
    ['infra', 'automation', 'technical'],
    ['tool', 'technical'],
    ['software', 'technical', 'business'],
    ['software', 'ops', 'business'],
    ['tool', 'technical'],
    ['automation', 'workflow', 'technical'],
    ['software', 'interface', 'infra'],
    ['tool', 'technical'],
];
const SUBJECT_KINDS = ACTIVE_NOUN_INDEXES.map(
    (index) => ALL_SUBJECT_KINDS[index]
);

const VERBS: HeadlineVerb[] = [
    { base: 'work', links: [FOR], objectKinds: ['audience', 'business', 'workflow', 'technical'] },
    { base: 'serve', links: [TO], objectKinds: ['audience', 'business'] },
    { base: 'support', links: [TO], objectKinds: ['audience', 'business', 'workflow', 'technical'] },
    { base: 'empower', links: [TO], objectKinds: ['audience', 'business'] },
    { base: 'prepare', links: [FOR], objectKinds: ['audience', 'business', 'workflow', 'outcome'] },
    { base: 'simplify', links: [TO], objectKinds: ['business', 'workflow', 'technical', 'abstract'] },
    { base: 'clarify', links: [TO], objectKinds: ['business', 'workflow', 'outcome', 'technical', 'abstract'] },
    { base: 'automate', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'debug', past: 'debugged', links: [TO], objectKinds: ['workflow', 'technical'] },
    { base: 'organize', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'validate', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'reduce', links: [TO], objectKinds: ['abstract'] },
    { base: 'trace', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'measure', links: [TO], objectKinds: ['outcome', 'technical', 'abstract'] },
    { base: 'surface', links: [TO], objectKinds: ['workflow', 'technical', 'abstract'] },
    { base: 'generate', links: [TO], objectKinds: ['outcome'] },
];
const ALL_OBJECTS: HeadlineObject[] = [
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
    { text: 'complex workflows', kinds: ['workflow', 'technical'] },
    { text: 'real-time updates', kinds: ['workflow', 'abstract'] },
    { text: 'field data', kinds: ['business', 'technical'] },
    { text: 'field reports', kinds: ['outcome'] },
    { text: 'workflow state', kinds: ['workflow', 'technical'] },
    { text: 'operational metrics', kinds: ['business', 'technical', 'abstract'] },
    { text: 'business processes', kinds: ['business', 'workflow'] },
    { text: 'execution history', kinds: ['technical', 'abstract'] },
    { text: 'system behavior', kinds: ['technical', 'abstract'] },
    { text: 'failure paths', kinds: ['workflow', 'technical', 'abstract'] },
    { text: 'application state', kinds: ['workflow', 'technical', 'abstract'] },
];
const DISABLED_OBJECTS = new Set([
    'approvals',
    'clients',
    'creators',
    'customers',
    'developers',
    'field data',
    'founders',
    'requests',
    'startups',
    'support teams',
    'time',
    'your customers',
    'your pipeline',
    'your workflow',
    'your workflows',
]);
const ACTIVE_OBJECT_INDEXES = ALL_OBJECTS.flatMap((object, index) =>
    DISABLED_OBJECTS.has(object.text) ? [] : [index]
);
const OBJECTS = ACTIVE_OBJECT_INDEXES.map((index) => ALL_OBJECTS[index]);
const PUNCTS = ['.', '!'];

// Emojis that fit each noun / verb / object, so a garnish is contextual rather
// than random. Aligned by index with NOUNS, VERBS, and OBJECTS above.
const ALL_NOUN_EMOJI = ['💻', '🖥️', '🧩', '💡', '🛠️', '📱', '⌨️', '🤖', '📊', '🔀', '🕵️', '🔧', '📜', '📦', '🧱', '🧠', '🗂️', '🔗', '🌐', '🤖', '🛎️', '🔑', '✨', '🎨', '🖱️', '🧪', '📉', '📄', '💬', '🗄️', '🏗️', '🕸️', '🔍', '🔌', '🔲', '🪝', '🚪', '🏪', '🌊', '🧰', '🏛️', '🎛️', '🤵', '🔌', '🗄️', '🖥️', '🎛️', '🧰', '🛠️', '📋', '📝', '📥', '🗓️', '📥', '🧾', '🔎', '🧰', '🖥️', '🕹️', '📈', '🧭', '🧾', '☁️', '🦺', '🏢', '🕸️', '🧾', '🔀', '☁️', '✅', '🧱', '⚙️', '🛠️', '🤖', '🏠', '🔬'];
const NOUN_EMOJI = ACTIVE_NOUN_INDEXES.map(
    (index) => ALL_NOUN_EMOJI[index]
);
const VERB_EMOJI = ['✅', '🤝', '🫶', '💪', '🏗️', '✂️', '🔍', '⚙️', '🧪', '🗂️', '✅', '📉', '🧭', '📏', '🔎', '🧾'];
const ALL_OBJ_EMOJI = ['🙌', '👥', '🏢', '💚', '🛒', '🙋', '💻', '👥', '👤', '💼', '🤝', '🚀', '🌱', '🎨', '🔀', '🛍️', '🗺️', '📦', '🚀', '🔀', '🔮', '⏱️', '✂️', '🧭', '⚙️', '🔀', '🗄️', '🧱', '🔀', '🎧', '🧪', '⏳', '⚠️', '🧩', '📡', '✅', '📬', '🗃️', '🕸️', '📣', '📋', '🧾', '🔍', '📊', '⚙️', '🧾', '🔍', '⚠️', '🔎'];
const OBJ_EMOJI = ACTIVE_OBJECT_INDEXES.map(
    (index) => ALL_OBJ_EMOJI[index]
);
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
const SIMPLIFY_OBJECTS = new Set([
    'busywork',
    'complex workflows',
    'handoffs',
]);
const OBJECT_VERB_ALLOWLIST: Record<string, Set<string>> = {
    approvals: new Set([
        'clarify',
        'organize',
        'reconcile',
        'review',
        'route',
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
    'field data': new Set([
        'clarify',
        'organize',
    ]),
    'field reports': new Set([
        'generate',
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
    'operational metrics': new Set([
        'clarify',
        'measure',
        'monitor',
        'surface',
    ]),
    'business processes': new Set([
        'automate',
        'clarify',
        'organize',
        'simplify',
        'support',
    ]),
    'execution history': new Set([
        'clarify',
        'surface',
    ]),
    'system behavior': new Set([
        'clarify',
        'monitor',
        'surface',
        'trace',
        'validate',
    ]),
    'failure paths': new Set([
        'clarify',
        'debug',
        'monitor',
        'surface',
        'trace',
        'validate',
    ]),
    'application state': new Set([
        'clarify',
        'monitor',
        'surface',
        'trace',
        'validate',
    ]),
    patterns: new Set([
        'clarify',
        'measure',
        'surface',
        'trace',
    ]),
    'real-time updates': new Set([
        'surface',
    ]),
    'complex workflows': new Set([
        'clarify',
        'simplify',
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
    'workflow state': new Set([
        'clarify',
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
        'sync',
        'trace',
        'validate',
    ]),
};
const verbAllowsObject = (verbIdx: number, objIdx: number) => {
    const base = VERBS[verbIdx].base;
    const text = objectText(objIdx);
    if (base === 'simplify' && !SIMPLIFY_OBJECTS.has(text)) return false;
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
const domainForNoun = (nounIdx: number): HeadlineDomain => {
    const kinds = subjectKinds(nounIdx);
    if (kinds.includes('automation')) return 'automation';
    if (kinds.includes('data')) return 'data';
    if (kinds.includes('workflow') || kinds.includes('ops')) return 'operations';
    if (kinds.includes('interface')) return 'experience';
    if (kinds.includes('business') || kinds.includes('concept')) return 'product';
    return 'developer';
};
const STATIC_PHRASE_PROMPTS = [
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
        line1: 'Turn field data',
        line2: 'into reports crews can use.',
    },
    {
        line1: 'Make complex workflows',
        line2: 'easier to explain.',
    },
    {
        line1: 'Operational metrics',
        line2: 'made visible in real time.',
    },
    {
        line1: 'What still takes your team',
        line2: 'too many manual steps?',
    },
    {
        line1: 'Can your team see',
        line2: 'why a workflow failed?',
    },
    {
        line1: 'Agent systems',
        line2: 'with people in control.',
    },
    {
        line1: 'From operating procedure',
        line2: 'to maintained software.',
    },
    {
        line1: 'Build around the work',
        line2: 'your team actually does.',
    },
    {
        line1: 'What should your software',
        line2: 'make easier to inspect?',
    },
    {
        line1: 'Could one application',
        line2: 'replace scattered steps?',
    },
    {
        line1: 'Can you trace a failure',
        line2: 'from interface to system?',
    },
    {
        line1: 'Who stays in control',
        line2: 'when agents do the work?',
    },
    {
        line1: 'Readable workflows.',
        line2: 'Inspectable execution.',
    },
    {
        line1: 'Built to run.',
        line2: 'Tested when things fail.',
    },
    {
        line1: 'What happens after',
        line2: 'the happy path fails?',
    },
    {
        line1: 'From failure signal',
        line2: 'to reproducible cause.',
    },
    {
        line1: 'AI work should leave',
        line2: 'evidence people can inspect.',
    },
    {
        line1: 'Could your internal software',
        line2: 'fit the process you have?',
    },
    {
        line1: 'One owner, end to end.',
        line2: 'Interface through deployment.',
    },
    {
        line1: 'Could your workflow show',
        line2: 'where every value came from?',
    },
    {
        line1: 'Can the system fail',
        line2: 'without becoming a mystery?',
    },
    {
        line1: 'Agents can propose.',
        line2: 'People authorize.',
    },
    {
        line1: 'Every automated action',
        line2: 'should leave evidence.',
    },
    {
        line1: 'Software should fit the work.',
        line2: 'Not the other way around.',
    },
    {
        line1: 'What does your team learn',
        line2: 'only after something breaks?',
    },
    {
        line1: 'From field input',
        line2: 'to a report ready on-site.',
    },
    {
        line1: 'Can your application run',
        line2: 'without one vendor?',
    },
    {
        line1: 'Trace the value.',
        line2: 'Understand the workflow.',
    },
    {
        line1: 'What should be automated?',
        line2: 'What still needs a person?',
    },
    {
        line1: 'When an integration fails,',
        line2: 'what should keep working?',
    },
    {
        line1: 'Repeatable releases.',
        line2: 'Explicit deployment steps.',
    },
    {
        line1: 'From workflow discovery',
        line2: 'to the next maintained release.',
    },
    {
        line1: 'Build the narrow tool.',
        line2: 'Solve the actual problem.',
    },
    {
        line1: 'Plan the fallback.',
        line2: 'Failure paths are product work.',
    },
    {
        line1: 'Could one data model',
        line2: 'replace duplicate entry?',
    },
    {
        line1: 'Where does context disappear',
        line2: 'between systems?',
    },
    {
        line1: 'What changes after launch?',
        line2: 'The software should too.',
    },
    {
        line1: 'Automate the repeatable.',
        line2: 'Keep judgment with people.',
    },
    {
        line1: 'Constraints first.',
        line2: 'Then the simplest useful product.',
    },
] as const;
type Quality = HeadlineQuality;
type SubjectCapability = {
    verbs: string[];
    objects: string[];
    quality: Quality;
    editorial: 'informative' | 'inherent';
    constructions: Array<'statement' | 'question' | 'stance'>;
};
const capability = (
    verbs: string[],
    objects: string[],
    quality: Quality = 'strong',
    editorial: SubjectCapability['editorial'] = 'informative',
    constructions: SubjectCapability['constructions'] = ['statement', 'question']
): SubjectCapability => ({ verbs, objects, quality, editorial, constructions });
const inherentCapability = (verbs: string[], objects: string[]) =>
    capability(verbs, objects, 'supporting', 'inherent');
const stanceCapability = (verbs: string[], objects: string[]) =>
    capability(verbs, objects, 'strong', 'informative', ['stance']);
const ROLE_MANIFEST = compileHeadlineManifest({
    subjects: [
        {
            id: 'APIs',
            capabilities: ['connect-systems', 'sync-data', 'support-product'],
        },
        {
            id: 'Dashboards',
            capabilities: ['reveal-decisions', 'monitor-operations'],
        },
        {
            id: 'Forms',
            capabilities: ['organize-input', 'validate-data'],
        },
        {
            id: 'Search tools',
            capabilities: ['organize-information', 'reveal-information'],
        },
    ],
    verbs: [
        { id: 'connect', capability: 'connect-systems', objectRoles: ['product', 'infrastructure'] },
        { id: 'sync', capability: 'sync-data', objectRoles: ['data'] },
        { id: 'support', capability: 'support-product', objectRoles: ['product'] },
        { id: 'clarify', capability: 'reveal-decisions', objectRoles: ['decision-support'] },
        { id: 'surface', capability: 'reveal-decisions', objectRoles: ['decision-support'] },
        { id: 'measure', capability: 'monitor-operations', objectRoles: ['operations', 'decision-support'] },
        { id: 'monitor', capability: 'monitor-operations', objectRoles: ['operations', 'decision-support'] },
        { id: 'organize', capability: 'organize-input', objectRoles: ['workflow', 'data'] },
        { id: 'validate', capability: 'validate-data', objectRoles: ['data'] },
        { id: 'organize', capability: 'organize-information', objectRoles: ['information'] },
        { id: 'clarify', capability: 'reveal-information', objectRoles: ['information'] },
        { id: 'surface', capability: 'reveal-information', objectRoles: ['information'] },
    ],
    objects: [
        { id: 'your product', roles: ['product'] },
        { id: 'your stack', roles: ['infrastructure'] },
        { id: 'your data', roles: ['data', 'information'] },
        { id: 'records', roles: ['data', 'information'] },
        { id: 'patterns', roles: ['decision-support', 'information'] },
        { id: 'signals', roles: ['decision-support'] },
        { id: 'decision context', roles: ['decision-support'] },
        { id: 'your next step', roles: ['decision-support'] },
        { id: 'bottlenecks', roles: ['decision-support'] },
        { id: 'operations', roles: ['operations'] },
        { id: 'requests', roles: ['workflow'] },
        { id: 'approvals', roles: ['workflow'] },
    ],
});
const inheritedCapabilities = (subject: string): SubjectCapability[] => {
    const grouped = new Map<string, string[]>();
    for (const relation of ROLE_MANIFEST.relations.filter(
        (candidate) => candidate.subject === subject
    )) {
        grouped.set(relation.verb, [
            ...new Set([...(grouped.get(relation.verb) ?? []), relation.object]),
        ]);
    }
    return [...grouped].map(([verb, objects]) => capability([verb], objects));
};
// Capabilities bind actions to their compatible outcomes. A subject can have
// several capabilities without gaining the Cartesian product between them.
const SUBJECT_CAPABILITIES: Record<string, SubjectCapability[]> = {
    Software: [stanceCapability(['serve', 'support', 'work'], ['you', 'teams', 'orgs', 'your business', 'your team']), capability(['simplify'], ['busywork']), capability(['empower'], ['teams', 'your team'], 'exploratory', 'informative', ['question', 'stance'])],
    Systems: [stanceCapability(['serve', 'support', 'work'], ['teams', 'your business', 'your team'])],
    Ideas: [capability(['clarify'], ['your next step', 'your roadmap'])],
    Tools: [capability(['simplify'], ['busywork']), inherentCapability(['support', 'work'], ['teams', 'your team']), inherentCapability(['empower'], ['teams', 'your team'])],
    Automation: [capability(['reduce', 'simplify'], ['busywork', 'handoffs']), inherentCapability(['automate'], ['busywork', 'handoffs'])],
    Workflows: [capability(['clarify'], ['handoffs']), capability(['organize', 'simplify'], ['handoffs']), capability(['reduce'], ['busywork'])],
    Scripts: [capability(['automate'], ['busywork']), capability(['validate'], ['records', 'your data'])],
    Models: [capability(['work'], ['users', 'your team', 'your users']), capability(['clarify', 'surface'], ['patterns', 'signals'])],
    Integrations: [capability(['simplify'], ['handoffs'])],
    Services: [capability(['prepare'], ['your launch'])],
    Solutions: [capability(['simplify'], ['complex workflows'])],
    Experiences: [capability(['simplify'], ['complex workflows'])],
    Interfaces: [capability(['simplify'], ['complex workflows']), capability(['clarify'], ['workflow state'])],
    Prototypes: [capability(['clarify'], ['your next step', 'your product']), capability(['prepare'], ['your launch'])],
    Analytics: [capability(['clarify', 'surface'], ['bottlenecks', 'decision context', 'operational metrics', 'patterns', 'signals']), capability(['measure'], ['operational metrics', 'signals'])],
    Insights: [capability(['clarify'], ['decision context', 'your next step']), capability(['surface'], ['patterns', 'signals'])],
    Tech: [stanceCapability(['serve'], ['people', 'teams', 'your team']), capability(['empower'], ['people', 'teams', 'your team'], 'exploratory', 'informative', ['question', 'stance'])],
    Dashboards: [capability(['clarify'], ['workflow state']), inherentCapability(['surface'], ['operational metrics', 'real-time updates', 'workflow state'])],
    Flows: [capability(['clarify'], ['handoffs']), capability(['organize', 'simplify'], ['handoffs']), capability(['reduce'], ['busywork'])],
    'Internal tools': [capability(['automate', 'reduce', 'simplify'], ['busywork', 'handoffs']), capability(['clarify'], ['complex workflows', 'operations', 'workflow state']), capability(['surface'], ['real-time updates', 'workflow state'])],
    Reports: [capability(['clarify'], ['decision context', 'operational metrics']), inherentCapability(['surface'], ['operational metrics', 'patterns', 'signals'])],
    Widgets: [capability(['clarify'], ['workflow state']), inherentCapability(['surface'], ['signals'])],
    Toolkits: [capability(['simplify'], ['complex workflows'], 'exploratory')],
    Frameworks: [capability(['simplify'], ['complex workflows'], 'exploratory')],
    Assistants: [stanceCapability(['work'], ['people', 'teams', 'your team']), capability(['clarify'], ['your next step'])],
    Frontends: [capability(['simplify'], ['complex workflows'])],
    UIs: [capability(['simplify'], ['complex workflows']), capability(['clarify'], ['workflow state'])],
    Visualizations: [capability(['clarify'], ['complex workflows', 'operational metrics', 'patterns', 'workflow state']), inherentCapability(['surface'], ['operational metrics', 'patterns', 'workflow state'])],
    'Workflow tools': [capability(['clarify'], ['business processes', 'complex workflows', 'workflow state']), capability(['trace'], ['errors', 'system behavior'])],
    'Agent systems': [capability(['clarify', 'surface'], ['execution history', 'system behavior'])],
    'Field tools': [capability(['generate'], ['field reports']), inherentCapability(['organize'], ['records'])],
    'Business applications': [capability(['simplify'], ['busywork']), inherentCapability(['organize'], ['operations', 'records'])],
    'Workflow visualizers': [capability(['clarify'], ['business processes', 'complex workflows', 'system behavior']), capability(['surface'], ['system behavior']), capability(['trace'], ['errors', 'system behavior']), inherentCapability(['clarify', 'surface'], ['workflow state'])],
    'Audit trails': [capability(['clarify', 'surface'], ['system behavior']), inherentCapability(['clarify', 'surface'], ['execution history'])],
    'Operational software': [capability(['simplify'], ['busywork']), inherentCapability(['organize'], ['business processes', 'operations', 'records'])],
    'Developer tools': [capability(['clarify', 'trace'], ['application state', 'failure paths', 'system behavior', 'your stack']), capability(['debug'], ['edge cases', 'your stack']), capability(['surface'], ['application state', 'workflow state']), inherentCapability(['debug', 'surface'], ['errors'])],
    'AI workflows': [capability(['clarify', 'surface'], ['execution history', 'failure paths', 'system behavior'])],
    'Diagnostic tools': [capability(['clarify'], ['application state', 'failure paths', 'signals', 'system behavior']), capability(['trace'], ['application state', 'failure paths', 'system behavior']), capability(['surface'], ['application state', 'signals']), inherentCapability(['surface', 'trace'], ['errors'])],
};
const subjectAllowsTriple = (nounIdx: number, verbIdx: number, objIdx: number) => {
    const capabilities = SUBJECT_CAPABILITIES[NOUNS[nounIdx].word];
    if (!capabilities) return true;
    return capabilities.some(
        ({ verbs, objects, editorial }) =>
            editorial === 'informative' &&
            verbs.includes(VERBS[verbIdx].base) && objects.includes(objectText(objIdx))
    );
};
const capabilityAllowsConstruction = (
    nounIdx: number,
    verbIdx: number,
    objIdx: number,
    construction: SubjectCapability['constructions'][number]
) =>
    (SUBJECT_CAPABILITIES[NOUNS[nounIdx].word] ?? []).some(
        ({ verbs, objects, editorial, constructions }) =>
            editorial === 'informative' &&
            constructions.includes(construction) &&
            verbs.includes(VERBS[verbIdx].base) &&
            objects.includes(objectText(objIdx))
    );
const tripleKey = (noun: string, verb: string, object: string) =>
    `${noun}\u0000${verb}\u0000${object}`;
// Exact overrides handle combinations whose portfolio value differs from the
// rest of an otherwise coherent capability group.
const TRIPLE_QUALITY_OVERRIDES: Record<string, Quality> = {};
const qualityForTriple = (nounIdx: number, verbIdx: number, objIdx: number): Quality => {
    const override = TRIPLE_QUALITY_OVERRIDES[
        tripleKey(NOUNS[nounIdx].word, VERBS[verbIdx].base, objectText(objIdx))
    ];
    if (override) return override;
    const matches = (SUBJECT_CAPABILITIES[NOUNS[nounIdx].word] ?? []).filter(
        ({ verbs, objects, editorial }) =>
            editorial === 'informative' &&
            verbs.includes(VERBS[verbIdx].base) && objects.includes(objectText(objIdx))
    );
    if (matches.some(({ quality }) => quality === 'strong')) return 'strong';
    if (matches.some(({ quality }) => quality === 'exploratory')) return 'exploratory';
    return 'supporting';
};
const QUALITY_WEIGHT: Record<Quality, number> = {
    strong: 4,
    exploratory: 3,
    supporting: 1,
};
const verbAllowsSubject = (verbIdx: number, nounIdx: number) => {
    const verb = VERBS[verbIdx];
    const noun = NOUNS[nounIdx].word;
    const capabilities = SUBJECT_CAPABILITIES[noun];
    if (capabilities) {
        return capabilities.some(({ verbs }) => verbs.includes(verb.base));
    }
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
                'Experiences',
                'Tech',
                'Features',
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
                'Tech',
                'Internal tools',
                'Workbenches',
                'Admin panels',
                'Assistants',
                'Toolkits',
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

const allowsTriple = (nounIdx: number, verbIdx: number, objIdx: number) =>
    verbAllowsSubject(verbIdx, nounIdx) &&
    subjectAllowsTriple(nounIdx, verbIdx, objIdx) &&
    verbAllowsObject(verbIdx, objIdx);
type HeadlineTriple = {
    nounIdx: number;
    verbIdx: number;
    objIdx: number;
    link: string;
    quality: Quality;
    domain: HeadlineDomain;
};
const VALID_TRIPLES: HeadlineTriple[] = NOUNS.flatMap((_, nounIdx) =>
    VERBS.flatMap((verb, verbIdx) =>
        verb.links.flatMap((link) =>
            OBJECTS.flatMap((_, objIdx) =>
                allowsTriple(nounIdx, verbIdx, objIdx)
                    ? [{
                          nounIdx,
                          verbIdx,
                          objIdx,
                          link,
                          quality: qualityForTriple(nounIdx, verbIdx, objIdx),
                          domain: domainForNoun(nounIdx),
                      }]
                    : []
            )
        )
    )
);
const indexTriples = (key: keyof Pick<HeadlineTriple, 'nounIdx' | 'verbIdx' | 'objIdx'>) =>
    VALID_TRIPLES.reduce<Map<number, HeadlineTriple[]>>((index, triple) => {
        const value = triple[key];
        index.set(value, [...(index.get(value) ?? []), triple]);
        return index;
    }, new Map());
const TRIPLES_BY_NOUN = indexTriples('nounIdx');
const TRIPLES_BY_VERB = indexTriples('verbIdx');
const TRIPLES_BY_OBJECT = indexTriples('objIdx');
const statementEligible = (triple: HeadlineTriple) =>
    triple.quality !== 'exploratory' &&
    capabilityAllowsConstruction(
        triple.nounIdx,
        triple.verbIdx,
        triple.objIdx,
        'statement'
    );
const questionEligible = (triple: HeadlineTriple, modalIdx: number) =>
    capabilityAllowsConstruction(
        triple.nounIdx,
        triple.verbIdx,
        triple.objIdx,
        'question'
    ) && (modalText(modalIdx).startsWith('How ') || triple.quality !== 'exploratory');
const STATEMENT_POOL = VALID_TRIPLES.flatMap((triple) =>
    statementEligible(triple)
        ? Array.from({ length: QUALITY_WEIGHT[triple.quality] }, () => triple)
        : []
);
type QuestionCandidate = HeadlineTriple & { line1: string; line2: string };
const QUESTION_POOLS: QuestionCandidate[][] = MODALS.map((_, modalIdx) =>
    VALID_TRIPLES.flatMap((triple) => {
        if (!questionEligible(triple, modalIdx)) return [];
        const candidate = {
            ...triple,
            line1: `${modalText(modalIdx)} ${lowerSubject(NOUNS[triple.nounIdx].word)}`,
            line2: `${VERBS[triple.verbIdx].base}${triple.link}${objectText(triple.objIdx)}?`,
        };
        return Array.from(
            { length: QUALITY_WEIGHT[triple.quality] },
            () => candidate
        );
    })
);
const STANCE_VERBS = new Set([
    'empower',
    'help',
    'protect',
    'serve',
    'support',
    'work',
]);
const STANCE_PROMPTS = VALID_TRIPLES.filter(
    (triple) =>
        triple.quality === 'strong' &&
        capabilityAllowsConstruction(
            triple.nounIdx,
            triple.verbIdx,
            triple.objIdx,
            'stance'
        ) &&
        STANCE_VERBS.has(VERBS[triple.verbIdx].base) &&
        (humanObject(triple.objIdx) || organizationObject(triple.objIdx))
).map((triple) =>
    renderConstruction('stance', {
        subject: NOUNS[triple.nounIdx].word,
        subjectPlural: NOUNS[triple.nounIdx].plural,
        verb: VERBS[triple.verbIdx],
        link: triple.link,
        object: objectText(triple.objIdx),
    })
);
const REFLECTION_AUDIENCES = ['your team', 'your users', 'customers'] as const;
const COUNTABLE_FRICTION = ['handoffs', 'bottlenecks', 'errors', 'requests'] as const;
const REFLECTION_PROMPTS = [
    ...COUNTABLE_FRICTION.flatMap((friction) => [
        {
            line1: `What gets easier`,
            line2: `with fewer ${friction}?`,
        },
        ...REFLECTION_AUDIENCES.map((audience) => ({
            line1: `Fewer ${friction}.`,
            line2: `More time for ${audience}.`,
        })),
    ]),
    ...REFLECTION_AUDIENCES.map((audience) => ({
        line1: 'Less busywork.',
        line2: `More time for ${audience}.`,
    })),
    {
        line1: 'What could your team do',
        line2: 'with less busywork?',
    },
];
const COUNTERFACTUAL_PROMPTS = VALID_TRIPLES.filter(
    (triple) => triple.quality !== 'supporting'
).map((triple) =>
    renderConstruction('counterfactual', {
        subject: NOUNS[triple.nounIdx].word,
        subjectPlural: NOUNS[triple.nounIdx].plural,
        verb: VERBS[triple.verbIdx],
        link: triple.link,
        object: objectText(triple.objIdx),
    })
);
const OUTCOME_CHAINS: OutcomeChain[] = [
    {
        friction: 'busywork',
        capability: 'Clearer workflows',
        intermediate: 'time for your team',
        humanOutcome: 'people focused on useful work',
    },
    {
        friction: 'scattered handoffs',
        capability: 'Searchable context',
        intermediate: 'calm in operations',
        humanOutcome: 'teams deciding with context',
    },
    {
        friction: 'unclear signals',
        capability: 'Useful dashboards',
        intermediate: 'context before decisions',
        humanOutcome: 'people keeping final say',
    },
];
const OUTCOME_CHAIN_PROMPTS = OUTCOME_CHAINS.flatMap(renderOutcomeChain);
const PHRASE_PROMPTS = [
    ...new Map(
        [
            ...STANCE_PROMPTS,
            ...REFLECTION_PROMPTS,
            ...COUNTERFACTUAL_PROMPTS,
            ...OUTCOME_CHAIN_PROMPTS,
            ...STATIC_PHRASE_PROMPTS,
        ].map((prompt) => [`${prompt.line1}\u0000${prompt.line2}`, prompt])
    ).values(),
];
// Complete committed-line corpus used by grammar and fit audits. Runtime
// candidates still have to fit the rendered copy track before they commit;
// transient mid-edit text is intentionally excluded.
let headlineFitLines: string[] | null = null;
const buildHeadlineFitLines = () => {
    const lines = new Set<string>();
    const addNounLines = (base: string, nounIdx: number) => {
        lines.add(base);
        const noun = lowerSubject(NOUNS[nounIdx].word);
        const nounAt = base.toLowerCase().lastIndexOf(noun.toLowerCase());
        if (nounAt < 0) return;
        for (const emoji of [NOUN_EMOJI[nounIdx], ...EXTRA_EMOJI]) {
            const end = nounAt + noun.length;
            lines.add(`${base.slice(0, end)} ${emoji}${base.slice(end)}`);
        }
    };
    const addObjectLines = (
        base: string,
        triple: HeadlineTriple,
        question: boolean
    ) => {
        lines.add(base);
        const emojis = question
            ? [OBJ_EMOJI[triple.objIdx], ...EXTRA_EMOJI]
            : [
                  VERB_EMOJI[triple.verbIdx],
                  OBJ_EMOJI[triple.objIdx],
                  ...EXTRA_EMOJI,
              ];
        for (const emoji of emojis) lines.add(`${base} ${emoji}`);
        if (!question) for (const punctuation of PUNCTS) lines.add(base + punctuation);
    };

    for (const triple of VALID_TRIPLES.filter(statementEligible)) {
        for (const connector of CONNECTORS) {
            const line1 = `${NOUNS[triple.nounIdx].word} ${connector}`;
            addNounLines(line1, triple.nounIdx);
            const conjugated =
                connector === 'that' && !NOUNS[triple.nounIdx].plural
                    ? thirdPerson(VERBS[triple.verbIdx])
                    : VERBS[triple.verbIdx].base;
            addObjectLines(
                `${conjugated}${triple.link}${objectText(triple.objIdx)}`,
                triple,
                false
            );
        }
    }
    for (const pool of QUESTION_POOLS) {
        for (const candidate of pool) {
            addNounLines(candidate.line1, candidate.nounIdx);
            addObjectLines(candidate.line2, candidate, true);
        }
    }
    for (const prompt of PHRASE_PROMPTS) {
        lines.add(prompt.line1);
        lines.add(prompt.line2);
    }
    return [...lines];
};

export const getHeadlineFitLines = () => {
    headlineFitLines ??= buildHeadlineFitLines();
    return [...headlineFitLines];
};
const NARRATIVE_FOLLOWUPS = new Map(
    [...REFLECTION_PROMPTS, ...COUNTERFACTUAL_PROMPTS].flatMap((prompt) => {
        const object = OBJECTS.find(({ text }) =>
            `${prompt.line1} ${prompt.line2}`.includes(text)
        )?.text;
        const followup = object
            ? STANCE_PROMPTS.find((candidate) => candidate.line2.includes(object))
            : undefined;
        return followup
            ? [[`${prompt.line1}\u0000${prompt.line2}`, followup] as const]
            : [];
    })
);
export const isHeadlineTripleAllowed = (noun: string, verb: string, object: string) => {
    const nounIdx = NOUNS.findIndex(({ word }) => word === noun);
    const verbIdx = VERBS.findIndex(({ base }) => base === verb);
    const objIdx = OBJECTS.findIndex(({ text }) => text === object);
    return nounIdx >= 0 && verbIdx >= 0 && objIdx >= 0
        ? allowsTriple(nounIdx, verbIdx, objIdx)
        : false;
};
export const getHeadlineTripleQuality = (
    noun: string,
    verb: string,
    object: string
): Quality | null => {
    const nounIdx = NOUNS.findIndex(({ word }) => word === noun);
    const verbIdx = VERBS.findIndex(({ base }) => base === verb);
    const objIdx = OBJECTS.findIndex(({ text }) => text === object);
    return nounIdx >= 0 && verbIdx >= 0 && objIdx >= 0 && allowsTriple(nounIdx, verbIdx, objIdx)
        ? qualityForTriple(nounIdx, verbIdx, objIdx)
        : null;
};
export const isHeadlineTripleEligibleFor = (
    noun: string,
    verb: string,
    object: string,
    construction: SubjectCapability['constructions'][number]
) => {
    const nounIdx = NOUNS.findIndex(({ word }) => word === noun);
    const verbIdx = VERBS.findIndex(({ base }) => base === verb);
    const objIdx = OBJECTS.findIndex(({ text }) => text === object);
    return nounIdx >= 0 && verbIdx >= 0 && objIdx >= 0
        ? capabilityAllowsConstruction(nounIdx, verbIdx, objIdx, construction)
        : false;
};
export const getHeadlineFormatSlots = (
    mode: 'stmt' | 'q',
    line1: string,
    line2: string,
    words: { noun: string; modal: string; verb: string; object: string }
) => {
    const slot = (line: 1 | 2, text: string, after = 0) => {
        const source = line === 1 ? line1 : line2;
        return { line, start: Math.max(0, source.indexOf(text, after)), text };
    };
    return mode === 'stmt'
        ? [slot(1, words.noun), slot(2, words.verb), slot(2, words.object, words.verb.length)]
        : [
              slot(1, words.modal),
              slot(1, words.noun, words.modal.length),
              slot(2, words.verb),
              slot(2, words.object, words.verb.length),
          ];
};

export const auditHeadlineGrammar = () => {
    const combinations = VALID_TRIPLES;
    const knownNouns = new Set(NOUNS.map(({ word }) => word));
    const knownVerbs = new Set(VERBS.map(({ base }) => base));
    const knownObjects = new Set(OBJECTS.map(({ text }) => text));
    const hasSemanticNeighbor = (triple: HeadlineTriple) =>
        (TRIPLES_BY_NOUN.get(triple.nounIdx) ?? []).some(
            (candidate) =>
                candidate.objIdx === triple.objIdx && candidate.verbIdx !== triple.verbIdx ||
                candidate.verbIdx === triple.verbIdx && candidate.objIdx !== triple.objIdx
        ) ||
        (TRIPLES_BY_OBJECT.get(triple.objIdx) ?? []).some(
            (candidate) =>
                candidate.verbIdx === triple.verbIdx && candidate.nounIdx !== triple.nounIdx
        );

    return {
        unreachableNouns: NOUNS.filter(
            (_, nounIdx) => !combinations.some((c) => c.nounIdx === nounIdx)
        ).map(({ word }) => word),
        unreachableVerbs: VERBS.filter(
            (_, verbIdx) => !combinations.some((c) => c.verbIdx === verbIdx)
        ).map(({ base }) => base),
        unreachableObjects: OBJECTS.filter(
            (_, objIdx) => !combinations.some((c) => c.objIdx === objIdx)
        ).map(({ text }) => text),
        invalidProfileNouns: [
            ...new Set([
                ...Object.keys(SUBJECT_CAPABILITIES),
            ]),
        ].filter((noun) => !knownNouns.has(noun)),
        invalidProfileVerbs: Object.entries(SUBJECT_CAPABILITIES).flatMap(
            ([noun, capabilities]) => capabilities.flatMap(({ verbs }) => verbs.filter((verb) => !knownVerbs.has(verb)).map((verb) => `${noun}: ${verb}`))
        ),
        invalidProfileObjects: Object.entries(SUBJECT_CAPABILITIES).flatMap(
            ([noun, capabilities]) => capabilities.flatMap(({ objects }) => objects.filter((object) => !knownObjects.has(object)).map((object) => `${noun}: ${object}`))
        ),
        invalidQualityOverrides: Object.keys(TRIPLE_QUALITY_OVERRIDES).filter(
            (key) => {
                const [noun, verb, object] = key.split('\u0000');
                const nounIdx = NOUNS.findIndex(({ word }) => word === noun);
                const verbIdx = VERBS.findIndex(({ base }) => base === verb);
                const objIdx = OBJECTS.findIndex(({ text }) => text === object);
                return (
                    nounIdx < 0 ||
                    verbIdx < 0 ||
                    objIdx < 0 ||
                    !allowsTriple(nounIdx, verbIdx, objIdx)
                );
            }
        ),
        unprofiledNouns: NOUNS.map(({ word }) => word).filter(
            (noun) => !SUBJECT_CAPABILITIES[noun]
        ),
        deadCapabilities: Object.entries(SUBJECT_CAPABILITIES).flatMap(
            ([noun, capabilities]) => {
                const nounIdx = NOUNS.findIndex(({ word }) => word === noun);
                return capabilities.flatMap(({ verbs, objects, editorial }, capabilityIdx) =>
                    editorial === 'inherent' || combinations.some(
                        (triple) =>
                            triple.nounIdx === nounIdx &&
                            verbs.includes(VERBS[triple.verbIdx].base) &&
                            objects.includes(objectText(triple.objIdx))
                    )
                        ? []
                        : [`${noun}[${capabilityIdx}]`]
                );
            }
        ),
        isolatedTriples: combinations.filter((triple) => !hasSemanticNeighbor(triple)).map(
            ({ nounIdx, verbIdx, objIdx }) =>
                `${NOUNS[nounIdx].word} | ${VERBS[verbIdx].base} | ${objectText(objIdx)}`
        ),
        questionUnreachableNouns: NOUNS.filter(
            (_, nounIdx) =>
                !VALID_TRIPLES.some(
                    (triple) =>
                        triple.nounIdx === nounIdx &&
                        MODALS.some((_, modalIdx) => questionEligible(triple, modalIdx))
                )
        ).map(({ word }) => word),
        statementUnreachableNouns: NOUNS.filter(
            (_, nounIdx) =>
                !VALID_TRIPLES.some(
                    (triple) => triple.nounIdx === nounIdx && statementEligible(triple)
                )
        ).map(({ word }) => word),
        questionUnreachableByModal: MODALS.map((modal, modalIdx) => ({
            modal,
            nouns: NOUNS.filter(
                (_, nounIdx) =>
                    !VALID_TRIPLES.some(
                        (triple) =>
                            triple.nounIdx === nounIdx &&
                            questionEligible(triple, modalIdx)
                    )
            ).map(({ word }) => word),
        })),
        qualityCounts: VALID_TRIPLES.reduce<Record<Quality, number>>(
            (counts, triple) => ({
                ...counts,
                [triple.quality]: counts[triple.quality] + 1,
            }),
            { strong: 0, exploratory: 0, supporting: 0 }
        ),
        suppressedInherentCapabilityCount: Object.values(SUBJECT_CAPABILITIES)
            .flat()
            .filter(({ editorial }) => editorial === 'inherent').length,
        questionLeadCount: MODALS.length,
        phrasePromptCount: PHRASE_PROMPTS.length,
        stancePromptCount: STANCE_PROMPTS.length,
        counterfactualPromptCount: COUNTERFACTUAL_PROMPTS.length,
        emojiArraysAligned:
            NOUN_EMOJI.length === NOUNS.length &&
            VERB_EMOJI.length === VERBS.length &&
            OBJ_EMOJI.length === OBJECTS.length,
        combinationCount: combinations.length,
        graphHealth: analyzeRelationGraph(
            VALID_TRIPLES.map((triple) => ({
                subject: NOUNS[triple.nounIdx].word,
                verb: VERBS[triple.verbIdx].base,
                object: objectText(triple.objIdx),
            }))
        ),
        roleManifestValid: ROLE_MANIFEST.valid,
        inheritedSubjectCount: ROLE_MANIFEST.relations.reduce(
            (subjects, relation) => subjects.add(relation.subject),
            new Set<string>()
        ).size,
    };
};

const HOLD_MS = 2600; // pause on a finished sentence
const GAP_MS = 500; // pause on an empty word before retyping
export const HEADLINE_FIT_SAFETY_PX = 20; // emoji fallback, caret, and emphasis overhang
const TYPO_CHANCE = 0.025; // occasional adjacent-key slip, corrected visibly
const LATE_TYPO_CHANCE = 0.07; // rarer mistake noticed after finishing a word

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
const SPACE_ERR = 0.04; // rare internal-space mistake

// A statement verb keeps its "s" only for a singular subject joined by "that".
const wantsS = (nounIdx: number, connIdx: number) =>
    CONNECTORS[connIdx] === 'that' && !NOUNS[nounIdx].plural;
const verbForm = (base: string, hasS: boolean) =>
    hasS ? thirdPerson({ base }) : base;

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

type HeadlineLineRunsProps = {
    lineNum: Line;
    text: string;
    caretVisible: boolean;
    caretPosition: number;
    moving: boolean;
    selection: Sel | null;
    format: Fmt | null;
};

const HeadlineLineRuns = memo(
    ({
        lineNum,
        text,
        caretVisible,
        caretPosition,
        moving,
        selection,
        format,
    }: HeadlineLineRunsProps) => {
        const formatRange: [number, number] | null =
            format && format.end > format.start
                ? [
                      Math.min(format.start, text.length),
                      Math.min(format.end, text.length),
                  ]
                : null;
        const cuts = new Set<number>([0, text.length, caretPosition]);
        if (selection) cuts.add(selection.start), cuts.add(selection.end);
        if (formatRange) cuts.add(formatRange[0]), cuts.add(formatRange[1]);
        const points = [...cuts]
            .filter((position) => position >= 0 && position <= text.length)
            .sort((left, right) => left - right);
        const runs: React.ReactNode[] = [];

        for (let index = 0; index < points.length; index += 1) {
            const start = points[index];
            if (start === caretPosition) {
                runs.push(
                    <Caret
                        key={`car${lineNum}`}
                        visible={caretVisible}
                        moving={moving}
                    />
                );
            }
            const end = points[index + 1];
            if (end === undefined || end === start) continue;
            const classes = ['tw-word'];
            if (
                selection &&
                start >= selection.start &&
                end <= selection.end &&
                selection.end > selection.start
            ) {
                classes.push('tw-sel');
            }
            if (
                formatRange &&
                start >= formatRange[0] &&
                end <= formatRange[1]
            ) {
                classes.push(`tw-${format!.kind}`);
            }
            runs.push(
                <span key={`${lineNum}-${start}`} className={classes.join(' ')}>
                    {text.slice(start, end)}
                </span>
            );
        }
        return runs;
    }
);

HeadlineLineRuns.displayName = 'HeadlineLineRuns';

const INIT_L1 = NOUNS[0].word + ' ' + CONNECTORS[0];
const INIT_L2 =
    verbForm(VERBS[0].base, true) + VERBS[0].links[0] + objectText(0);

const TypewriterHeadline = () => {
    const [line1, setLine1] = useState(INIT_L1);
    const [line2, setLine2] = useState(INIT_L2);
    const [caretLine, setCaretLine] = useState<Line>(2);
    const [caretPos, setCaretPos] = useState(INIT_L2.length);
    const [moving, setMoving] = useState(false);
    const [testMode, setTestMode] = useState(false);
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
        let activeRuntime: HeadlineEditRuntime | null = null;
        let runtimeCadence = 65;
        // The whole animation is a chain of scheduled steps. `schedule` gates
        // that chain on visibility: while the hero is off-screen or the tab is
        // hidden it holds the next step instead of running it, so nothing
        // animates (or burns CPU) unseen, and it resumes exactly where it left
        // off. `running` reflects visibility; `lastFn` is the pending step.
        let running = true;
        let lastFn: (() => void) | null = null;
        const testSpeed = (window as Window & { __headlineTestSpeed?: number })
            .__headlineTestSpeed;
        const speed =
            typeof testSpeed === 'number' && testSpeed > 0
                ? Math.min(testSpeed, 1)
                : 1;
        if (speed < 1) {
            setTestMode(true);
        }
        const measuredWidths = new Map<string, number>();
        const measurementLimit = 512;
        let headlineWidth = line2Ref.current?.clientWidth ?? 600;
        let disposed = false;
        const clearMeasurements = () => measuredWidths.clear();
        const fitResizeObserver =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(([entry]) => {
                      const nextWidth = entry.target.clientWidth;
                      if (nextWidth === headlineWidth) return;
                      headlineWidth = nextWidth;
                      clearMeasurements();
                  });
        if (line2Ref.current) fitResizeObserver?.observe(line2Ref.current);
        void document.fonts?.ready.then(() => {
            if (!disposed) clearMeasurements();
        });
        const schedule = (fn: () => void, delay: number) => {
            lastFn = fn;
            if (running) timer = setTimeout(fn, Math.max(1, delay * speed));
        };
        const setRunning = (v: boolean) => {
            if (v === running) return;
            running = v;
            if (!running) {
                clearTimeout(timer);
                activeRuntime?.pause();
            } else {
                activeRuntime?.resume(false);
                if (lastFn) schedule(lastFn, 0); // resume the held adapter step
            }
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
        let fmtAffinity: (FormattingAffinity & { line: Line }) | null = null;
        let phraseQueue: Array<{ line1: string; line2: string }> = [];
        let triplePathQueue: HeadlineTriple[] = [];
        let phraseFamily: ConstructionFamily = 'reflection';
        const telemetry = {
            states: 0,
            modes: { stmt: 0, q: 0, phrase: 0 },
            families: {} as Record<string, number>,
            domains: {} as Record<string, number>,
            edits: {} as Record<string, number>,
        };
        const trajectory = new TrajectoryMemory(18);
        const narrative = new NarrativePlanner(10, 1.4);
        const editPlanner = new EditStrategyPlanner(7);
        const compositeEdits = new CompositeEditPlanner();
        const caretAnchors = new CaretAnchorMemory();
        const behaviorPolicy = new HeadlineBehaviorPolicy(10);
        let plannedNavigation: CaretNavigationMode | null = null;
        let plannedTiming: TimingProfile = 'deliberate';
        const tripleTrajectoryKey = (triple: HeadlineTriple) =>
            `${NOUNS[triple.nounIdx].word}|${VERBS[triple.verbIdx].base}|${objectText(
                triple.objIdx
            )}`;
        const currentTrajectoryKey = () =>
            `${NOUNS[nounIdx].word}|${VERBS[verbIdx].base}|${objectText(objIdx)}`;
        trajectory.remember(currentTrajectoryKey());
        const candidateBudget = () =>
            headlineWidth < 420 ? 24 : 48;
        const familyEnergy = (family: ConstructionFamily): Energy => {
            if (family === 'counterfactual' || family === 'question') return 'curious';
            if (family === 'reflection') return 'quiet';
            if (family === 'stance') return 'playful';
            return 'concrete';
        };
        const trajectoryCandidate = <T,>(
            value: T,
            triple: HeadlineTriple,
            family: ConstructionFamily,
            key: string
        ): TrajectoryCandidate<T> => ({
            value,
            key,
            subject: NOUNS[triple.nounIdx].word,
            verb: VERBS[triple.verbIdx].base,
            object: objectText(triple.objIdx),
            domain: triple.domain,
            family,
            quality: triple.quality,
            energy: familyEnergy(family),
            surprise:
                family === 'counterfactual'
                    ? 0.8
                    : family === 'question'
                      ? 0.45
                      : 0.2,
            concepts: [
                triple.domain,
                VERBS[triple.verbIdx].base,
                ...OBJECTS[triple.objIdx].kinds,
            ],
        });

        const paint = () => {
            setLine1(l1);
            setLine2(l2);
            setCaretLine(cLine);
            setCaretPos(cPos);
        };

        // Keep the formatted range in step with edits on its line. Inserting
        // `count` chars at `pos`: before the range shifts it right; inside (or at
        // an empty range) extends it, so retyped text inherits the format.
        const fmtInsert = (line: Line, pos: number, text: string) => {
            if (!fmt || fmt.line !== line) return;
            const transformed = transformFormattedInsert(
                [fmt.start, fmt.end],
                pos,
                text,
                fmtAffinity?.line === line ? fmtAffinity : null
            );
            const [start, end] = expandRangeToWordBoundaries(
                line === 1 ? l1 : l2,
                transformed.range
            );
            fmtAffinity = transformed.affinity
                ? { ...transformed.affinity, line }
                : null;
            fmt = { ...fmt, start, end };
            setFormat(fmt);
        };
        // Removing chars [a,b) on `line`: shrink/shift the range to match.
        const fmtDelete = (line: Line, a: number, b: number) => {
            if (!fmt || fmt.line !== line) return;
            const transformed = transformFormattedDelete(
                [fmt.start, fmt.end],
                [a, b],
                fmtAffinity?.line === line ? fmtAffinity : null
            );
            const [start, end] = expandRangeToWordBoundaries(
                line === 1 ? l1 : l2,
                transformed.range
            );
            fmtAffinity = transformed.affinity
                ? { ...transformed.affinity, line }
                : null;
            fmt = { ...fmt, start, end };
            setFormat(fmt);
        };

        // Would `candidate` line-two text still fit on one line?
        const fits = (candidate: string) => {
            const m = measureRef.current;
            if (!m) return candidate.length <= 16;
            let measuredWidth = measuredWidths.get(candidate);
            if (measuredWidth === undefined) {
                m.textContent = candidate;
                measuredWidth = m.offsetWidth;
                if (measuredWidths.size >= measurementLimit) {
                    measuredWidths.delete(measuredWidths.keys().next().value!);
                }
                measuredWidths.set(candidate, measuredWidth);
            }
            return measuredWidth <= headlineWidth - HEADLINE_FIT_SAFETY_PX;
        };

        const nounWord = () => NOUNS[nounIdx].word;
        const verbStr = () => verbForm(VERBS[verbIdx].base, hasS);
        // Where the noun begins on line one, per mode ("" / "<Modal> ").
        const nounStart = () =>
            mode === 'stmt' ? 0 : MODALS[modalIdx].length + 1;
        // Where the connector begins (statement), shifted by any noun garnish.
        const connStart = () => nounWord().length + gNoun.length + 1;
        // Where the object begins on line two, per mode. Statements use the
        // current verb + its link; questions use the base verb after a modal.
        const objStart = () =>
            (mode === 'stmt' ? verbStr().length : VERBS[verbIdx].base.length) +
            link.length;
        const constructionAllows = (
            n: number,
            v: number,
            o: number,
            m = modalIdx
        ) => {
            if (!allowsTriple(n, v, o)) return false;
            const quality = qualityForTriple(n, v, o);
            return mode === 'stmt'
                ? quality !== 'exploratory'
                : modalText(m).startsWith('How ') || quality !== 'exploratory';
        };
        const objectAllowed = (i: number) =>
            constructionAllows(nounIdx, verbIdx, i);
        const pickQuestion = () => {
            const pool = QUESTION_POOLS[modalIdx];
            const start = Math.floor(Math.random() * pool.length);
            const fitting: TrajectoryCandidate<QuestionCandidate>[] = [];
            const seen = new Set<string>();
            for (let offset = 0; offset < pool.length; offset++) {
                const candidate = pool[(start + offset) % pool.length];
                if (
                    candidate.nounIdx === nounIdx &&
                    candidate.verbIdx === verbIdx &&
                    candidate.objIdx === objIdx
                ) continue;
                const key = `${modalText(modalIdx)}|${tripleTrajectoryKey(candidate)}`;
                if (
                    !seen.has(key) &&
                    fits(candidate.line1) &&
                    fits(candidate.line2)
                ) {
                    seen.add(key);
                    fitting.push(
                        trajectoryCandidate(candidate, candidate, 'question', key)
                    );
                    if (fitting.length >= candidateBudget()) break;
                }
            }
            return narrative.choose(fitting);
        };
        // Line one composed for the fit check, with a noun garnish `gn`.
        const composeL1 = (n: number, c: number, m: number, gn: string) =>
            mode === 'stmt'
                ? `${NOUNS[n].word}${gn} ${CONNECTORS[c]}`
                    : `${modalText(m)} ${lowerSubject(NOUNS[n].word)}${gn}`;

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
                        const text = line === 1 ? l1 : l2;
                        cPos =
                            target > cPos
                                ? nextGraphemeBoundary(text, cPos)
                                : previousGraphemeBoundary(text, cPos);
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
                const text = line === 1 ? l1 : l2;
                const safeOver = normalizeGraphemeRange(text, over, over)[0];
                if (safeOver !== pos) {
                    walk(safeOver, () => {
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
            const semanticMode = plannedNavigation;
            plannedNavigation = null;
            if (cLine === line && cPos === pos) return done();
            if (semanticMode) {
                telemetry.edits[`navigation:${semanticMode}`] =
                    (telemetry.edits[`navigation:${semanticMode}`] ?? 0) + 1;
                if (semanticMode === 'arrow') return arrowTo(line, pos, done);
                if (semanticMode === 'word-jump') {
                    return wordJumpTo(line, pos, done);
                }
                return jump(line, pos, done);
            }
            const distance = cLine === line ? Math.abs(cPos - pos) : Infinity;
            if (distance <= 4) return arrowTo(line, pos, done);
            if (distance <= 16 && Math.random() < 0.65) {
                return wordJumpTo(line, pos, done);
            }
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
                const boundaries = normalizeGraphemeRange(s, cPos, cPos);
                const safeCaret =
                    boundaries[0] === cPos ? cPos : boundaries[1];
                const from = previousGraphemeBoundary(s, safeCaret);
                const remove = safeCaret - from;
                write(s.slice(0, from) + s.slice(safeCaret));
                fmtDelete(cLine, from, safeCaret);
                cPos = from;
                left -= Math.min(left, remove);
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
                fmtInsert(cLine, cPos, ch);
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
            // A single adjacent-key slip, noticed and corrected at a readable
            // pace. Multi-character mistakes are reserved for `typeLate`, so
            // correction never flashes several mutations in one frame.
            const slipUp = () => {
                const wrong = slip(str[i]);
                if (wrong) {
                    insert(wrong);
                    schedule(() => {
                        unInsert();
                        schedule(() => {
                            insert(str[i]);
                            i += 1;
                            schedule(step, typeDelay());
                        }, rand(180, 340));
                    }, rand(360, 620));
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
            const source = line === 1 ? l1 : l2;
            [start, end] = normalizeGraphemeRange(source, start, end);
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
            const distanceToStart = cLine === line ? Math.abs(cPos - start) : Infinity;
            const distanceToEnd = cLine === line ? Math.abs(cPos - end) : Infinity;
            const backward =
                distanceToEnd < distanceToStart
                    ? Math.random() < 0.8
                    : distanceToEnd === distanceToStart
                      ? Math.random() < 0.35
                      : false;
            const origin = backward ? end : start;
            const direction = backward ? 'backward' : 'forward';
            telemetry.edits[`selection:${direction}`] =
                (telemetry.edits[`selection:${direction}`] ?? 0) + 1;
            click(line, origin, () => {
                let cur = origin;
                const grow = () => {
                    setMoving(true);
                    if ((!backward && cur >= end) || (backward && cur <= start)) {
                        schedule(done, rand(240, 460)); // hold selection
                        return;
                    }
                    cur = backward
                        ? previousGraphemeBoundary(source, cur)
                        : nextGraphemeBoundary(source, cur);
                    cLine = line;
                    cPos = cur;
                    sel = backward
                        ? { line, start: cur, end }
                        : { line, start, end: cur };
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

        const executeOperations = (
            operations: EditOperation[],
            onCommit: () => void,
            expectedLines: [string, string] = [l1, l2],
            timingProfile: TimingProfile = behaviorPolicy.chooseTiming()
        ) => {
            const initialLines: [string, string] = [l1, l2];
            runtimeCadence =
                timingProfile === 'crisp'
                    ? 24
                    : timingProfile === 'exploratory'
                      ? 135
                      : 65;
            activeRuntime ??= new HeadlineEditRuntime(
                {
                    execute: (operation, next) => {
                        const advance = () => schedule(next, runtimeCadence);
                        switch (operation.type) {
                            case 'move-caret':
                                click(operation.line, operation.position, advance);
                                break;
                            case 'select-range':
                                selectRange(
                                    operation.line,
                                    operation.start,
                                    operation.end,
                                    advance
                                );
                                break;
                            case 'delete-selection':
                                deleteSel(advance);
                                break;
                            case 'backspace':
                                backspace(operation.count, advance);
                                break;
                            case 'insert-text':
                                if (operation.allowTypos) {
                                    typeWord(operation.text, advance);
                                } else {
                                    type(operation.text, advance, false);
                                }
                                break;
                            case 'replace-punctuation': {
                                const text = operation.line === 1 ? l1 : l2;
                                const at = text.lastIndexOf(operation.from);
                                if (at < 0) return advance();
                                selectRange(
                                    operation.line,
                                    at,
                                    at + operation.from.length,
                                    () =>
                                        deleteSel(() =>
                                            type(operation.to, advance, false)
                                        )
                                );
                                break;
                            }
                            case 'transfer-emphasis':
                                selectRange(
                                    operation.line,
                                    operation.start,
                                    operation.end,
                                    () => {
                                        fmt = {
                                            line: operation.line,
                                            start: operation.start,
                                            end: operation.end,
                                            kind: fmt?.kind ?? 'b',
                                        };
                                        setFormat(fmt);
                                        sel = null;
                                        setSelection(null);
                                        advance();
                                    }
                                );
                                break;
                            case 'pause':
                                schedule(
                                    next,
                                    timingDelay(
                                        timingProfile,
                                        operation.duration === 'brief'
                                            ? quickNotice()
                                            : noticeDelay()
                                    )
                                );
                                break;
                            case 'commit-semantic-state':
                                advance();
                                break;
                        }
                    },
                },
                speed < 1 && rootRef.current
                    ? (trace) => {
                          rootRef.current!.dataset.editTrace = JSON.stringify(
                              trace.map(({ phase, operationIndex, operation }) => ({
                                  phase,
                                  operationIndex,
                                  operation: operation?.type ?? null,
                              }))
                          );
                      }
                    : undefined
            );
            activeRuntime.run({
                initialLines,
                expectedLines,
                operations,
                onCommit,
                onRecovery: () => {
                    telemetry.edits['runtime:recovery'] =
                        (telemetry.edits['runtime:recovery'] ?? 0) + 1;
                    onCommit();
                },
            });
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
            decoy?: string,
            forcedChoreography?: WordEditChoreography
        ) => {
            // Loosen the boundaries a bit — a real selection/backspace often
            // grabs an adjacent space rather than landing exactly on the word.
            // Whatever space we swallow, we retype, so the sentence is unchanged.
            const src = line === 1 ? l1 : l2;
            const semanticSlot = (): CaretAnchorSlot => {
                if (start === 0 && curLen === src.length) return 'construction';
                if (line === 2) return start === 0 ? 'verb' : 'object';
                if (mode === 'q' && start === 0) return 'modal';
                if (start === nounStart()) return 'subject';
                return 'connector';
            };
            plannedNavigation = caretAnchors.plan(
                {
                    slot: semanticSlot(),
                    line,
                    start,
                    end: start + curLen,
                },
                { line: cLine, position: cPos }
            );
            const safeNavigation: Array<{
                value: CaretNavigationMode;
                weight: number;
            }> = (() => {
                const distance = cLine === line ? Math.abs(cPos - start) : Infinity;
                return cLine !== line || distance > 22
                    ? [{ value: 'direct', weight: 1 }]
                    : [
                          { value: plannedNavigation, weight: 7 },
                          { value: 'word-jump', weight: 2 },
                          { value: 'direct', weight: 1 },
                      ];
            })();
            plannedNavigation = behaviorPolicy.choose(
                'navigation',
                safeNavigation.filter(
                    (candidate, index, all) =>
                        all.findIndex(({ value }) => value === candidate.value) === index
                )
            );
            const slot = semanticSlot();
            behaviorPolicy.record('slot', slot);
            plannedTiming = behaviorPolicy.chooseTiming();
            let s = start;
            let e = start + curLen;
            const lead = s > 0 && src[s - 1] === ' ' && Math.random() < 0.4;
            if (lead) s -= 1;
            const trail = e < src.length && src[e] === ' ' && Math.random() < 0.4;
            if (trail) e += 1;
            const wrap = (w: string) =>
                (lead ? ' ' : '') + w + (trail ? ' ' : '');
            const repl = wrap(next);
            // Type the replacement — but now and then type a plausible wrong
            // word first, realize, wipe it, and type the intended one.
            const planned = forcedChoreography
                ? {
                      strategy: forcedChoreography,
                      choreography: forcedChoreography,
                      revision: diffTextRevision(
                          src.slice(s, e),
                          repl,
                          forcedChoreography
                      ),
                  }
                : editPlanner.choose(src.slice(s, e), repl, Boolean(decoy));
            const { choreography, revision } = planned;
            behaviorPolicy.record('operation', planned.strategy);
            telemetry.edits[planned.strategy] =
                (telemetry.edits[planned.strategy] ?? 0) + 1;
            const expected = src.slice(0, s) + repl + src.slice(e);
            const editStart = s + revision.removeStart;
            const editEnd = s + revision.removeEnd;
            const span = editEnd - editStart;
            const verify = (cb: () => void) => {
                const actual = line === 1 ? l1 : l2;
                if (actual === expected) return cb();
                selectRange(line, 0, actual.length, () =>
                    deleteSel(() => type(expected, cb, false))
                );
            };
            const typePhase = (cb: () => void) => {
                const verified = () => verify(cb);
                if (decoy && decoy !== next && choreography === 'reconsider') {
                    const dec = wrap(decoy);
                    typeWord(dec, () => {
                        setMoving(false);
                        schedule(
                            () =>
                                backspace(dec.length, () =>
                                    schedule(() => typeWord(repl, verified), GAP_MS)
                                ),
                            rand(420, 720)
                        );
                    });
                } else {
                    // Typo repair navigates relative to the end of a fresh
                    // word. A preserved suffix means the caret is mid-word,
                    // so keep this local insertion clean and predictable.
                    if (revision.preservedSuffix) {
                        type(revision.insert, verified, false);
                    } else {
                        typeWord(revision.insert, verified);
                    }
                }
            };
            // Position tracking carries the format automatically: deleting the
            // word shrinks its range, retyping re-extends it (transfer), and
            // edits to other words just shift it.
            if (choreography === 'reconsider' && decoy && decoy !== next) {
                click(line, editEnd, () =>
                    backspace(span, () =>
                        schedule(
                            () => typePhase(done),
                            timingDelay(plannedTiming, GAP_MS)
                        )
                    )
                );
            } else {
                const operations = compileTextEditOperations(
                    line,
                    s,
                    revision,
                    choreography
                );
                const expectedLines: [string, string] =
                    line === 1 ? [expected, l2] : [l1, expected];
                const transaction = simulateEditTransaction(
                    [l1, l2],
                    operations,
                    expectedLines
                );
                telemetry.edits[transaction.valid ? 'transaction:valid' : 'transaction:recovery'] =
                    (telemetry.edits[
                        transaction.valid ? 'transaction:valid' : 'transaction:recovery'
                    ] ?? 0) + 1;
                if (transaction.valid) {
                    executeOperations(
                        operations,
                        () => verify(done),
                        expectedLines,
                        plannedTiming
                    );
                } else {
                    const actual = line === 1 ? l1 : l2;
                    selectRange(line, 0, actual.length, () =>
                        deleteSel(() => type(expected, () => verify(done), false))
                    );
                }
            }
        };

        const rewriteHeadline = (
            nextLine1: string,
            nextLine2: string,
            done: () => void
        ) => {
            // Formatting belongs to the current wording. Clear it through a
            // visible selection before a construction rewrite; otherwise the
            // range collapses during deletion, expands over replacement text,
            // and then disappears when the new construction commits.
            if (fmt && fmt.end > fmt.start) {
                const previous = fmt;
                selectRange(
                    previous.line,
                    previous.start,
                    previous.end,
                    () => {
                        fmt = null;
                        setFormat(null);
                        sel = null;
                        setSelection(null);
                        telemetry.edits['format:clear-before-rewrite'] =
                            (telemetry.edits['format:clear-before-rewrite'] ?? 0) +
                            1;
                        schedule(
                            () => rewriteHeadline(nextLine1, nextLine2, done),
                            quickNotice()
                        );
                    }
                );
                return;
            }
            const plan = compositeEdits.plan(
                [l1, l2],
                [nextLine1, nextLine2],
                headlineWidth,
                {
                    subject: nounWord(),
                    connector: mode === 'stmt' ? CONNECTORS[connIdx] : undefined,
                    modal: mode === 'q' ? modalText(modalIdx) : undefined,
                    verb: mode === 'stmt' ? verbStr() : VERBS[verbIdx].base,
                    object: objectText(objIdx),
                }
            );
            telemetry.edits[`personality:${plan.personality}`] =
                (telemetry.edits[`personality:${plan.personality}`] ?? 0) + 1;
            telemetry.edits[`template:${plan.template}`] =
                (telemetry.edits[`template:${plan.template}`] ?? 0) + 1;
            behaviorPolicy.record('template', plan.template);
            behaviorPolicy.record('operation', `personality:${plan.personality}`);
            const operations = compileCompositeEditOperations(plan);
            const transaction = simulateEditTransaction(
                [l1, l2],
                operations,
                [nextLine1, nextLine2]
            );
            if (!transaction.valid) {
                return swapWord(
                    1,
                    0,
                    l1.length,
                    nextLine1,
                    () =>
                        swapWord(2, 0, l2.length, nextLine2, done, undefined, 'select-replace'),
                    undefined,
                    'select-replace'
                );
            }
            telemetry.edits['transaction:composite'] =
                (telemetry.edits['transaction:composite'] ?? 0) + 1;
            executeOperations(operations, done, [nextLine1, nextLine2]);
        };

        // Pick any fitting alternative instead of walking the list in order.
        // This keeps newly appended words from being buried behind dozens of
        // earlier entries.
        const pickFitting = (
            cur: number,
            len: number,
            build: (i: number) => string,
            weight: (i: number) => number = () => 1
        ) => {
            const candidates: Array<{ value: number; weight: number }> = [];
            for (let i = 0; i < len; i++) {
                const candidate = build(i);
                if (i !== cur && candidate && fits(candidate)) {
                    candidates.push({ value: i, weight: weight(i) });
                }
            }
            return weightedChoice(candidates) ?? -1;
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
                !constructionAllows(i, verbIdx, objIdx)
                    ? ''
                    : composeL1(i, connIdx, modalIdx, '')
            , (i) =>
                QUALITY_WEIGHT[qualityForTriple(i, verbIdx, objIdx)] *
                trajectory.noveltyWeight(
                    `${NOUNS[i].word}|${VERBS[verbIdx].base}|${objectText(objIdx)}`
                ));
            if (cand < 0) return formatWord();
            const asWord = (i: number) =>
                mode === 'stmt'
                    ? NOUNS[i].word
                    : lowerSubject(NOUNS[i].word);
            const next = asWord(cand);
            // a plausible wrong noun to fumble first
            let decoy: string | undefined;
            for (let k = 1; k < NOUNS.length; k++) {
                const d = (cand + k) % NOUNS.length;
                if (
                    d !== nounIdx &&
                    constructionAllows(d, verbIdx, objIdx) &&
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
                    trajectory.remember(currentTrajectoryKey());
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
            if (cand < 0) return formatWord();
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
                constructionAllows(nounIdx, verbIdx, objIdx, i)
                    ? composeL1(nounIdx, connIdx, i, gNoun)
                    : ''
            );
            if (cand < 0) return formatWord();
            swapWord(1, 0, MODALS[modalIdx].length, modalText(cand), () => {
                modalIdx = cand;
                hold();
            });
        };

        // Swap the verb (and re-pick a link it accepts), replacing "<verb><link>"
        // as one unit since a new verb may take a different link.
        const swapVerb = () => {
            const candidates: Array<{
                value: { verbIdx: number; link: string };
                weight: number;
            }> = [];
            for (let ci = 0; ci < VERBS.length; ci++) {
                if (ci === verbIdx) continue;
                const links = VERBS[ci].links;
                for (const lk of links) {
                    const head =
                        (mode === 'stmt'
                            ? verbForm(VERBS[ci].base, hasS)
                            : VERBS[ci].base) + lk;
                    if (
                        constructionAllows(nounIdx, ci, objIdx) &&
                        fits(head + objectText(objIdx) + (mode === 'q' ? '?' : '') + gObj)
                    ) {
                        candidates.push({
                            value: { verbIdx: ci, link: lk },
                            weight:
                                QUALITY_WEIGHT[qualityForTriple(nounIdx, ci, objIdx)] *
                                trajectory.noveltyWeight(
                                    `${NOUNS[nounIdx].word}|${VERBS[ci].base}|${objectText(objIdx)}`
                                ),
                        });
                    }
                }
            }
            if (!candidates.length) return formatWord();
            const cand = weightedChoice(candidates);
            if (!cand) return formatWord();
            const head =
                (mode === 'stmt'
                    ? verbForm(VERBS[cand.verbIdx].base, hasS)
                    : VERBS[cand.verbIdx].base) + cand.link;
            const currentVerb =
                mode === 'stmt' ? verbStr() : VERBS[verbIdx].base;
            swapWord(2, 0, currentVerb.length + link.length, head, () => {
                verbIdx = cand.verbIdx;
                link = cand.link;
                trajectory.remember(currentTrajectoryKey());
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
            const head =
                (mode === 'stmt' ? verbStr() : VERBS[verbIdx].base) + link;
            const tailQ = mode === 'stmt' ? '' : '?';
            const cand = pickFitting(
                objIdx,
                OBJECTS.length,
                (i) => objectAllowed(i) ? head + objectText(i) + tailQ + gObj : '',
                (i) =>
                    QUALITY_WEIGHT[qualityForTriple(nounIdx, verbIdx, i)] *
                    trajectory.noveltyWeight(
                        `${NOUNS[nounIdx].word}|${VERBS[verbIdx].base}|${objectText(i)}`
                    )
            );
            if (cand < 0) return formatWord();
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
                    trajectory.remember(currentTrajectoryKey());
                    hold();
                },
                decoy
            );
        };

        // Revise a complete relation in two legible edits. The target is a
        // prevalidated triple; the temporary verb/object mismatch is repaired
        // immediately and never reaches `hold`.
        const coordinatedRevision = () => {
            const candidates = (TRIPLES_BY_NOUN.get(nounIdx) ?? []).filter(
                (triple) =>
                    triple.verbIdx !== verbIdx &&
                    triple.objIdx !== objIdx &&
                    constructionAllows(
                        nounIdx,
                        triple.verbIdx,
                        triple.objIdx
                    )
            );
            const fitting = candidates.filter((triple) => {
                const nextHead =
                    (mode === 'stmt'
                        ? verbForm(VERBS[triple.verbIdx].base, hasS)
                        : VERBS[triple.verbIdx].base) + triple.link;
                return fits(
                    nextHead +
                        objectText(triple.objIdx) +
                        (mode === 'q' ? '?' : '')
                );
            });
            let target = triplePathQueue.shift();
            if (!target) {
                const finalTarget = weightedChoice(
                    fitting.map((triple) => ({
                        value: triple,
                        weight:
                            QUALITY_WEIGHT[triple.quality] *
                            trajectory.noveltyWeight(tripleTrajectoryKey(triple)),
                    }))
                );
                if (finalTarget) {
                    const conceptsFor = (triple: HeadlineTriple) => [
                        triple.domain,
                        VERBS[triple.verbIdx].base,
                        ...OBJECTS[triple.objIdx].kinds,
                    ];
                    const source: HeadlineTriple = {
                        nounIdx,
                        verbIdx,
                        objIdx,
                        link,
                        quality: qualityForTriple(nounIdx, verbIdx, objIdx),
                        domain: domainForNoun(nounIdx),
                    };
                    const node = (triple: HeadlineTriple) => ({
                        value: triple,
                        key: tripleTrajectoryKey(triple),
                        concepts: conceptsFor(triple),
                        valid: constructionAllows(
                            triple.nounIdx,
                            triple.verbIdx,
                            triple.objIdx
                        ),
                    });
                    const path = planSemanticPath(
                        node(source),
                        node(finalTarget),
                        fitting.map(node)
                    );
                    triplePathQueue = path.slice(1).map(({ value }) => value);
                    target = triplePathQueue.shift();
                    if (triplePathQueue.length) {
                        behaviorPolicy.record('path', 'semantic-bridge');
                        telemetry.edits['path:semantic-bridge'] =
                            (telemetry.edits['path:semantic-bridge'] ?? 0) + 1;
                    }
                }
            }
            if (!target) return mode === 'stmt' ? swapVerb() : swapObject();

            planCoordinatedRevision();
            const oldVerbLength =
                (mode === 'stmt' ? verbStr() : VERBS[verbIdx].base).length +
                link.length;
            const nextHead =
                (mode === 'stmt'
                    ? verbForm(VERBS[target.verbIdx].base, hasS)
                    : VERBS[target.verbIdx].base) + target.link;
            swapWord(2, 0, oldVerbLength, nextHead, () => {
                verbIdx = target.verbIdx;
                link = target.link;
                schedule(
                    () =>
                        swapWord(
                            2,
                            objStart(),
                            objectText(objIdx).length,
                            objectText(target.objIdx),
                            () => {
                                objIdx = target.objIdx;
                                trajectory.remember(currentTrajectoryKey());
                                hold();
                            },
                            undefined,
                            'select-replace'
                        ),
                    quickNotice()
                );
            }, undefined, 'select-replace');
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
                fmtInsert(cLine, cPos, t);
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
                // Questions already carry their punctuation. Adding another
                // question mark reads as accidental duplication, not editing.
                if (mode === 'q') return hold();
                const p = PUNCTS[Math.floor(Math.random() * PUNCTS.length)];
                if (!fits(l2 + p)) return hold();
                const operations: EditOperation[] = [
                    {
                        type: 'replace-punctuation',
                        line: 2,
                        from: '',
                        to: p,
                    },
                    { type: 'commit-semantic-state' },
                ];
                const transaction = simulateEditTransaction(
                    [l1, l2],
                    operations,
                    [l1, l2 + p]
                );
                if (!transaction.valid) return hold();
                executeOperations(operations, () => {
                    gObj = p;
                    telemetry.edits['operation:punctuation'] =
                        (telemetry.edits['operation:punctuation'] ?? 0) + 1;
                    hold();
                }, [l1, l2 + p]);
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
            const opts = getHeadlineFormatSlots(
                mode === 'stmt' ? 'stmt' : 'q',
                l1,
                l2,
                {
                    noun: mode === 'stmt' ? nounWord() : lowerSubject(nounWord()),
                    modal: modalText(modalIdx),
                    verb: mode === 'stmt' ? verbStr() : VERBS[verbIdx].base,
                    object: objectText(objIdx),
                }
            );
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
            const kind = FMT_KINDS[Math.floor(Math.random() * FMT_KINDS.length)];
            fmt = null;
            executeOperations(
                [
                    {
                        type: 'transfer-emphasis',
                        line: w.line,
                        start: w.start,
                        end: w.start + w.text.length,
                    },
                    { type: 'commit-semantic-state' },
                ],
                () => {
                    if (fmt) {
                        fmt = { ...fmt, kind };
                        setFormat(fmt);
                    }
                    telemetry.edits['operation:emphasis'] =
                        (telemetry.edits['operation:emphasis'] ?? 0) + 1;
                    hold();
                }
            );
        };

        const switchPhrase = () => {
            const continuingNarrative = phraseQueue.length > 0;
            const candidates = (continuingNarrative
                ? [phraseQueue.shift()!]
                : PHRASE_PROMPTS
            ).filter(
                (p) => fits(p.line1) && fits(p.line2)
            );
            if (!candidates.length) return hold();
            const prompt = narrative.choose(
                candidates.map((candidate): TrajectoryCandidate<(typeof candidates)[number]> => {
                    const family: ConstructionFamily = candidate.line1.startsWith(
                        'What if '
                    )
                        ? 'counterfactual'
                        : candidate.line1.endsWith(' should')
                          ? 'stance'
                          : 'reflection';
                    return {
                    value: candidate,
                    key: `phrase|${candidate.line1}|${candidate.line2}`,
                    subject: candidate.line1,
                    verb: family,
                    object: candidate.line2,
                    domain: 'operations',
                    family,
                    quality: 'strong',
                    energy: familyEnergy(family),
                    surprise: family === 'counterfactual' ? 0.8 : 0.35,
                    concepts: [family, candidate.line1, candidate.line2],
                };
                })
            );
            if (!prompt) return hold();
            phraseFamily = prompt.line1.startsWith('What if ')
                ? 'counterfactual'
                : prompt.line1.endsWith(' should')
                  ? 'stance'
                  : 'reflection';
            if (!continuingNarrative) {
                const followup = NARRATIVE_FOLLOWUPS.get(
                    `${prompt.line1}\u0000${prompt.line2}`
                );
                phraseQueue = followup ? [followup] : [];
            }
            rewriteHeadline(prompt.line1, prompt.line2, () => {
                mode = 'phrase';
                gNoun = '';
                gObj = '';
                fmt = null;
                setFormat(null);
                hold();
            });
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
                hasTo = wantsS(nounTo, connIdx);
                if (!VERBS[verbTo].links.includes(linkTo)) {
                    linkTo = VERBS[verbTo].links[0];
                }
                const statement = (n: number, v: number, lk: string, o: number) =>
                    verbForm(VERBS[v].base, wantsS(n, connIdx)) + lk + objectText(o);
                const currentTriple = VALID_TRIPLES.find(
                    (triple) =>
                        triple.nounIdx === nounTo &&
                        triple.verbIdx === verbTo &&
                        triple.objIdx === objTo &&
                        triple.link === linkTo
                );
                if (
                    !currentTriple ||
                    !statementEligible(currentTriple) ||
                    !fits(statement(nounTo, verbTo, linkTo, objTo))
                ) {
                    const start = Math.floor(Math.random() * STATEMENT_POOL.length);
                    const fitting: TrajectoryCandidate<HeadlineTriple>[] = [];
                    const seen = new Set<string>();
                    for (let offset = 0; offset < STATEMENT_POOL.length; offset++) {
                        const candidate =
                            STATEMENT_POOL[(start + offset) % STATEMENT_POOL.length];
                        const key = tripleTrajectoryKey(candidate);
                        if (
                            !seen.has(key) &&
                            fits(
                                statement(
                                    candidate.nounIdx,
                                    candidate.verbIdx,
                                    candidate.link,
                                    candidate.objIdx
                                )
                            )
                        ) {
                            seen.add(key);
                            fitting.push(
                                trajectoryCandidate(
                                    candidate,
                                    candidate,
                                    'statement',
                                    key
                                )
                            );
                            if (fitting.length >= candidateBudget()) break;
                        }
                    }
                    const cand = narrative.choose(fitting);
                    if (!cand) return hold();
                    nounTo = cand.nounIdx;
                    verbTo = cand.verbIdx;
                    linkTo = cand.link;
                    objTo = cand.objIdx;
                }
                hasTo = wantsS(nounTo, connIdx);
                nl1 = `${NOUNS[nounTo].word} ${CONNECTORS[connIdx]}`;
                nl2 = statement(nounTo, verbTo, linkTo, objTo);
            } else {
                const question = pickQuestion();
                if (!question) return hold();
                nounTo = question.nounIdx;
                verbTo = question.verbIdx;
                objTo = question.objIdx;
                linkTo = question.link;
                nl1 = question.line1;
                nl2 = question.line2;
            }
            if (!fits(nl1) || !fits(nl2)) return hold(); // can't fit — skip it

            rewriteHeadline(nl1, nl2, () => {
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
                hold();
            });
        };

        const canSwapNoun = () =>
            (TRIPLES_BY_VERB.get(verbIdx) ?? []).some(
                (triple) =>
                    triple.objIdx === objIdx &&
                    triple.nounIdx !== nounIdx &&
                    constructionAllows(triple.nounIdx, verbIdx, objIdx)
            );
        const canSwapVerb = () =>
            (TRIPLES_BY_NOUN.get(nounIdx) ?? []).some(
                (triple) => {
                    if (
                        triple.verbIdx === verbIdx ||
                        triple.objIdx !== objIdx
                    ) return false;
                    return constructionAllows(nounIdx, triple.verbIdx, objIdx);
                }
            );
        const canSwapObject = () => {
            return (TRIPLES_BY_NOUN.get(nounIdx) ?? []).some(
                (triple) =>
                    triple.verbIdx === verbIdx &&
                    triple.objIdx !== objIdx &&
                    objectAllowed(triple.objIdx)
            );
        };
        const canSwapConnector = () =>
            CONNECTORS.some((_, i) => i !== connIdx);
        const canSwapModal = () =>
            MODALS.some(
                (_, i) =>
                    i !== modalIdx &&
                    constructionAllows(nounIdx, verbIdx, objIdx, i)
            );

        function hold() {
            setMoving(false);
            fmtAffinity = null;
            const family: ConstructionFamily =
                mode === 'stmt' ? 'statement' : mode === 'q' ? 'question' : phraseFamily;
            const domain = domainForNoun(nounIdx);
            telemetry.states++;
            telemetry.modes[mode]++;
            telemetry.families[family] = (telemetry.families[family] ?? 0) + 1;
            telemetry.domains[domain] = (telemetry.domains[domain] ?? 0) + 1;
            if (speed < 1 && rootRef.current) {
                rootRef.current.dataset.telemetry = JSON.stringify(telemetry);
                rootRef.current.dataset.planner = JSON.stringify(narrative.snapshot());
                rootRef.current.dataset.behaviorPolicy = JSON.stringify(
                    behaviorPolicy.snapshot()
                );
            }
            schedule(() => {
                if (mode === 'phrase') {
                    return phraseQueue.length ? switchPhrase() : switchMode();
                }
                if (triplePathQueue.length) return coordinatedRevision();
                // if a format has smeared past its word, sometimes go fix it
                if (messyFmt() && Math.random() < 0.22) return tidyFormat();
                if (mode === 'stmt') {
                    const content: Array<{
                        value: () => void;
                        weight: number;
                    }> = [
                        ...(canSwapVerb() ? [{ value: swapVerb, weight: 18 }] : []),
                        ...(canSwapObject() ? [{ value: swapObject, weight: 17 }] : []),
                        ...(canSwapNoun() ? [{ value: swapNoun, weight: 14 }] : []),
                        { value: coordinatedRevision, weight: 8 },
                        ...(canSwapConnector()
                            ? [{ value: swapConnector, weight: 12 }]
                            : []),
                    ];
                    const decoration = [
                        { value: garnish, weight: 13 },
                        { value: formatWord, weight: 4 },
                    ];
                    const transitions = [
                        ...(VERBS[verbIdx].links.length > 1
                            ? [{ value: swapLink, weight: 6 }]
                            : []),
                        { value: switchPhrase, weight: 6 },
                        { value: switchMode, weight: 5 },
                    ];
                    const groups = [
                        ...(content.length
                            ? [{ value: () => weightedChoice(content)?.(), weight: 61 }]
                            : []),
                        { value: () => weightedChoice(decoration)?.(), weight: 15 },
                        { value: () => weightedChoice(transitions)?.(), weight: 24 },
                    ];
                    weightedChoice(groups)?.();
                } else {
                    const content: Array<{
                        value: () => void;
                        weight: number;
                    }> = [
                        ...(canSwapObject() ? [{ value: swapObject, weight: 24 }] : []),
                        ...(canSwapNoun() ? [{ value: swapNoun, weight: 18 }] : []),
                        ...(canSwapVerb() ? [{ value: swapVerb, weight: 16 }] : []),
                        ...(canSwapModal() ? [{ value: swapModal, weight: 12 }] : []),
                        { value: coordinatedRevision, weight: 9 },
                    ];
                    const decoration = [
                        { value: garnish, weight: 11 },
                        { value: formatWord, weight: 4 },
                    ];
                    const transitions = [
                        { value: switchMode, weight: 10 },
                    ];
                    const groups = [
                        ...(content.length
                            ? [{ value: () => weightedChoice(content)?.(), weight: 70 }]
                            : []),
                        { value: () => weightedChoice(decoration)?.(), weight: 12 },
                        { value: () => weightedChoice(transitions)?.(), weight: 18 },
                    ];
                    weightedChoice(groups)?.();
                }
            }, HOLD_MS);
        }

        // Pause while the hero is off-screen or the tab is hidden; resume on
        // return. Combines the Page Visibility API with an IntersectionObserver.
        let tabHidden = document.hidden;
        let offScreen = false;
        let manuallyPaused = false;
        const sync = () => setRunning(!tabHidden && !offScreen && !manuallyPaused);
        const onVis = () => {
            tabHidden = document.hidden;
            sync();
        };
        document.addEventListener('visibilitychange', onVis);
        const onMotion = (event: Event) => {
            manuallyPaused = Boolean(
                (event as CustomEvent<{ paused?: boolean }>).detail?.paused
            );
            sync();
        };
        window.addEventListener('headline-motion', onMotion);
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
            disposed = true;
            clearTimeout(timer);
            activeRuntime?.cancel();
            fitResizeObserver?.disconnect();
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('headline-motion', onMotion);
            io?.disconnect();
        };
    }, []);

    return (
        <span
            className="tw"
            aria-hidden="true"
            ref={rootRef}
            {...(testMode
                ? {
                      'data-line1': line1,
                      'data-line2': line2,
                      'data-moving': moving ? 'true' : 'false',
                      'data-caret': `${caretLine}:${caretPos}`,
                      'data-selection': selection
                          ? JSON.stringify(selection)
                          : '',
                      'data-format': format ? JSON.stringify(format) : '',
                  }
                : {})}
        >
            <span className="tw-line1">
                <HeadlineLineRuns
                    lineNum={1}
                    text={line1}
                    caretVisible={caretLine === 1}
                    caretPosition={caretLine === 1 ? caretPos : line1.length}
                    moving={caretLine === 1 && moving}
                    selection={selection?.line === 1 ? selection : null}
                    format={format?.line === 1 ? format : null}
                />
            </span>
            <em className="tw-line2" ref={line2Ref}>
                <HeadlineLineRuns
                    lineNum={2}
                    text={line2}
                    caretVisible={caretLine === 2}
                    caretPosition={caretLine === 2 ? caretPos : line2.length}
                    moving={caretLine === 2 && moving}
                    selection={selection?.line === 2 ? selection : null}
                    format={format?.line === 2 ? format : null}
                />
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
