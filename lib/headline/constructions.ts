import {
    lowerSubject,
    pastTense,
    thirdPerson,
    type VerbForms,
} from './grammar';
import type { ConstructionFamily } from './planner';

export type ConstructionTerms = {
    subject: string;
    subjectPlural: boolean;
    verb: VerbForms;
    link: string;
    object: string;
    modal?: string;
};

export type RenderedConstruction = {
    family: ConstructionFamily;
    line1: string;
    line2: string;
};

export type ConstructionPlugin = {
    id: ConstructionFamily;
    render: (terms: ConstructionTerms) => RenderedConstruction;
};

const statement: ConstructionPlugin = {
    id: 'statement',
    render: (terms) => ({
        family: 'statement',
        line1: `${terms.subject} that`,
        line2: `${
            terms.subjectPlural ? terms.verb.base : thirdPerson(terms.verb)
        }${terms.link}${terms.object}`,
    }),
};

const question: ConstructionPlugin = {
    id: 'question',
    render: (terms) => ({
        family: 'question',
        line1: `${terms.modal ?? 'How could'} ${lowerSubject(terms.subject)}`,
        line2: `${terms.verb.base}${terms.link}${terms.object}?`,
    }),
};

const stance: ConstructionPlugin = {
    id: 'stance',
    render: (terms) => ({
        family: 'stance',
        line1: `${terms.subject} should`,
        line2: `${terms.verb.base}${terms.link}${terms.object}.`,
    }),
};

const counterfactual: ConstructionPlugin = {
    id: 'counterfactual',
    render: (terms) => ({
        family: 'counterfactual',
        line1: `What if ${lowerSubject(terms.subject)}`,
        line2: `${pastTense(terms.verb)}${terms.link}${terms.object}?`,
    }),
};

export const CONSTRUCTION_PLUGINS = new Map<
    ConstructionFamily,
    ConstructionPlugin
>([
    ['statement', statement],
    ['question', question],
    ['stance', stance],
    ['counterfactual', counterfactual],
]);

export const renderConstruction = (
    family: ConstructionFamily,
    terms: ConstructionTerms
) => {
    const plugin = CONSTRUCTION_PLUGINS.get(family);
    if (!plugin) throw new Error(`No headline construction plugin: ${family}`);
    return plugin.render(terms);
};

export type OutcomeChain = {
    friction: string;
    capability: string;
    intermediate: string;
    humanOutcome: string;
};

export const renderOutcomeChain = (chain: OutcomeChain): RenderedConstruction[] => [
    {
        family: 'reflection',
        line1: `Less ${chain.friction}.`,
        line2: `More ${chain.intermediate}.`,
    },
    {
        family: 'reflection',
        line1: `${chain.capability}`,
        line2: `for ${chain.humanOutcome}.`,
    },
];
