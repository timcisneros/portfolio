export type WordEditChoreography =
    | 'backspace'
    | 'select-replace'
    | 'reconsider';

export type EditStrategyId =
    | 'insert'
    | 'delete'
    | 'preserve-fragments'
    | 'select-replace'
    | 'backspace'
    | 'reconsider';

export type SemanticEditKind =
    | 'word-revision'
    | 'coordinated-revision'
    | 'construction-rewrite'
    | 'punctuation'
    | 'emphasis';

export type SemanticEditPlan = {
    kind: SemanticEditKind;
    operations: string[];
    allowsSemanticHoldBetweenOperations: boolean;
};

export type TextRevision = {
    removeStart: number;
    removeEnd: number;
    insert: string;
    preservedPrefix: string;
    preservedSuffix: string;
};

export type EditOperation =
    | { type: 'move-caret'; line: 1 | 2; position: number }
    | { type: 'select-range'; line: 1 | 2; start: number; end: number }
    | { type: 'delete-selection' }
    | { type: 'backspace'; count: number }
    | { type: 'insert-text'; text: string; allowTypos: boolean }
    | { type: 'replace-punctuation'; line: 1 | 2; from: string; to: string }
    | { type: 'transfer-emphasis'; line: 1 | 2; start: number; end: number }
    | { type: 'pause'; duration: 'brief' | 'deliberate' }
    | { type: 'commit-semantic-state' };

export type IntermediateStatePolicy = 'valid' | 'transient' | 'prohibited';

export type SimulatedEditState = {
    lines: [string, string];
    caret: { line: 1 | 2; position: number };
    selection: { line: 1 | 2; start: number; end: number } | null;
    policy: IntermediateStatePolicy;
    operation: EditOperation | null;
};

export type EditTransaction = {
    valid: boolean;
    states: SimulatedEditState[];
    errors: string[];
    finalLines: [string, string];
};

export const simulateEditTransaction = (
    initialLines: [string, string],
    operations: EditOperation[],
    expectedLines?: [string, string]
): EditTransaction => {
    const lines: [string, string] = [...initialLines];
    let caret = { line: 2 as 1 | 2, position: lines[1].length };
    let selection: SimulatedEditState['selection'] = null;
    const errors: string[] = [];
    const states: SimulatedEditState[] = [{
        lines: [...lines],
        caret: { ...caret },
        selection: null,
        policy: 'valid',
        operation: null,
    }];
    const fail = (message: string) => errors.push(message);
    for (const operation of operations) {
        switch (operation.type) {
            case 'move-caret':
                if (
                    operation.position < 0 ||
                    operation.position > lines[operation.line - 1].length
                ) fail('caret-out-of-bounds');
                else caret = { line: operation.line, position: operation.position };
                selection = null;
                break;
            case 'select-range':
                if (
                    operation.start < 0 ||
                    operation.end < operation.start ||
                    operation.end > lines[operation.line - 1].length
                ) fail('selection-out-of-bounds');
                else {
                    selection = { ...operation };
                    caret = { line: operation.line, position: operation.end };
                }
                break;
            case 'delete-selection':
                if (!selection) fail('delete-without-selection');
                else {
                    const index = selection.line - 1;
                    lines[index] =
                        lines[index].slice(0, selection.start) +
                        lines[index].slice(selection.end);
                    caret = { line: selection.line, position: selection.start };
                    selection = null;
                }
                break;
            case 'backspace': {
                if (operation.count < 0 || operation.count > caret.position) {
                    fail('backspace-out-of-bounds');
                    break;
                }
                const index = caret.line - 1;
                lines[index] =
                    lines[index].slice(0, caret.position - operation.count) +
                    lines[index].slice(caret.position);
                caret = { ...caret, position: caret.position - operation.count };
                break;
            }
            case 'insert-text': {
                const index = caret.line - 1;
                lines[index] =
                    lines[index].slice(0, caret.position) +
                    operation.text +
                    lines[index].slice(caret.position);
                caret = { ...caret, position: caret.position + operation.text.length };
                break;
            }
            case 'replace-punctuation': {
                const index = operation.line - 1;
                const at = lines[index].lastIndexOf(operation.from);
                if (at < 0) fail('punctuation-not-found');
                else {
                    lines[index] =
                        lines[index].slice(0, at) +
                        operation.to +
                        lines[index].slice(at + operation.from.length);
                    caret = { line: operation.line, position: at + operation.to.length };
                }
                break;
            }
            case 'transfer-emphasis':
                if (
                    operation.start < 0 ||
                    operation.end < operation.start ||
                    operation.end > lines[operation.line - 1].length
                ) fail('emphasis-out-of-bounds');
                break;
            case 'pause':
                break;
            case 'commit-semantic-state':
                if (expectedLines && (lines[0] !== expectedLines[0] || lines[1] !== expectedLines[1])) {
                    fail('target-mismatch');
                }
                break;
        }
        states.push({
            lines: [...lines],
            caret: { ...caret },
            selection: selection ? { ...selection } : null,
            policy: errors.length
                ? 'prohibited'
                : operation.type === 'commit-semantic-state'
                  ? 'valid'
                  : 'transient',
            operation,
        });
        if (errors.length) break;
    }
    if (operations.at(-1)?.type !== 'commit-semantic-state') {
        fail('missing-final-commit');
    }
    return {
        valid: errors.length === 0,
        states,
        errors,
        finalLines: [...lines],
    };
};

export const auditOperationReachability = (plans: EditOperation[][]) => {
    const reached = new Set(plans.flatMap((plan) => plan.map(({ type }) => type)));
    const all: EditOperation['type'][] = [
        'move-caret',
        'select-range',
        'delete-selection',
        'backspace',
        'insert-text',
        'replace-punctuation',
        'transfer-emphasis',
        'pause',
        'commit-semantic-state',
    ];
    return { reached: [...reached], unreachable: all.filter((type) => !reached.has(type)) };
};

export const compileTextEditOperations = (
    line: 1 | 2,
    absoluteStart: number,
    revision: TextRevision,
    choreography: WordEditChoreography
): EditOperation[] => {
    const start = absoluteStart + revision.removeStart;
    const end = absoluteStart + revision.removeEnd;
    const removeCount = end - start;
    const insert: EditOperation[] = revision.insert
        ? [{
              type: 'insert-text',
              text: revision.insert,
              allowTypos: !revision.preservedSuffix && !revision.preservedPrefix,
          }]
        : [];
    if (removeCount === 0) {
        return [
            { type: 'move-caret', line, position: start },
            ...insert,
            { type: 'commit-semantic-state' },
        ];
    }
    if (choreography === 'select-replace') {
        return [
            { type: 'select-range', line, start, end },
            { type: 'delete-selection' },
            ...insert,
            { type: 'commit-semantic-state' },
        ];
    }
    return [
        { type: 'move-caret', line, position: end },
        { type: 'backspace', count: removeCount },
        ...insert,
        { type: 'commit-semantic-state' },
    ];
};

export const validateEditOperations = (
    operations: EditOperation[],
    lineLengths: Record<1 | 2, number>
) => {
    let hasCommit = false;
    for (const operation of operations) {
        if (operation.type === 'move-caret') {
            if (operation.position < 0 || operation.position > lineLengths[operation.line]) return false;
        }
        if (operation.type === 'select-range') {
            if (
                operation.start < 0 ||
                operation.end < operation.start ||
                operation.end > lineLengths[operation.line]
            ) return false;
        }
        if (operation.type === 'backspace' && operation.count < 0) return false;
        if (operation.type === 'transfer-emphasis') {
            if (operation.start < 0 || operation.end < operation.start) return false;
        }
        if (operation.type === 'commit-semantic-state') hasCommit = true;
    }
    return hasCommit && operations.at(-1)?.type === 'commit-semantic-state';
};

const sharedPrefixLength = (a: string, b: string) => {
    let index = 0;
    while (index < a.length && index < b.length && a[index] === b[index]) index++;
    return index;
};

const sharedSuffixLength = (a: string, b: string, prefixLength: number) => {
    let length = 0;
    while (
        length < a.length - prefixLength &&
        length < b.length - prefixLength &&
        a[a.length - 1 - length] === b[b.length - 1 - length]
    ) {
        length++;
    }
    return length;
};

export const diffTextRevision = (
    current: string,
    target: string,
    choreography: WordEditChoreography
): TextRevision => {
    if (choreography === 'reconsider') {
        return {
            removeStart: 0,
            removeEnd: current.length,
            insert: target,
            preservedPrefix: '',
            preservedSuffix: '',
        };
    }
    const rawPrefixLength = sharedPrefixLength(current, target);
    // People commonly append/remove a suffix or keep a recognizable stem, but
    // rarely preserve one coincidental letter while replacing the middle of a
    // word. In particular, leaving a lone plural "s" reads algorithmic.
    const edgeExtension =
        rawPrefixLength > 0 &&
        rawPrefixLength === Math.min(current.length, target.length);
    const prefixLength =
        edgeExtension || rawPrefixLength >= 3 ? rawPrefixLength : 0;
    const rawSuffixLength =
        choreography === 'select-replace'
            ? sharedSuffixLength(current, target, prefixLength)
            : 0;
    const suffixLength = rawSuffixLength >= 4 ? rawSuffixLength : 0;
    return {
        removeStart: prefixLength,
        removeEnd: current.length - suffixLength,
        insert: target.slice(prefixLength, target.length - suffixLength),
        preservedPrefix: current.slice(0, prefixLength),
        preservedSuffix: current.slice(current.length - suffixLength),
    };
};

const tokenOverlap = (a: string, b: string) => {
    const left = new Set(a.toLowerCase().match(/[a-z]+/g) ?? []);
    return (b.toLowerCase().match(/[a-z]+/g) ?? []).filter((word) => left.has(word))
        .length;
};

export const planConstructionRewrite = (
    current: [string, string],
    target: [string, string]
): SemanticEditPlan & { lineOrder: Array<1 | 2> } => {
    const firstScore = tokenOverlap(current[0], target[0]);
    const secondScore = tokenOverlap(current[1], target[1]);
    return {
        kind: 'construction-rewrite',
        operations: ['replace-first-phrase', 'replace-second-phrase'],
        allowsSemanticHoldBetweenOperations: false,
        lineOrder: firstScore >= secondScore ? [1, 2] : [2, 1],
    };
};

export const planWordRevision = (
    hasDecoy: boolean,
    random: () => number = Math.random
): { choreography: WordEditChoreography; plan: SemanticEditPlan } => {
    const roll = random();
    const choreography: WordEditChoreography =
        hasDecoy && roll < 0.16
            ? 'reconsider'
            : roll < 0.5
              ? 'select-replace'
              : 'backspace';
    return {
        choreography,
        plan: {
            kind: 'word-revision',
            operations:
                choreography === 'reconsider'
                    ? ['remove-current', 'type-alternative', 'reconsider', 'type-target']
                    : [
                          choreography === 'select-replace'
                              ? 'select-current'
                              : 'remove-current',
                          'type-target',
                      ],
            allowsSemanticHoldBetweenOperations: false,
        },
    };
};

export type PlannedTextEdit = {
    strategy: EditStrategyId;
    choreography: WordEditChoreography;
    revision: TextRevision;
    plan: SemanticEditPlan;
};

type EditStrategy = {
    id: EditStrategyId;
    choreography: WordEditChoreography;
    weight: number;
    supports: (revision: TextRevision, hasDecoy: boolean) => boolean;
    operations: (revision: TextRevision) => string[];
};

export const EDIT_STRATEGIES: EditStrategy[] = [
    {
        id: 'insert',
        choreography: 'select-replace',
        weight: 10,
        supports: (revision) => revision.removeStart === revision.removeEnd && Boolean(revision.insert),
        operations: () => ['move-caret', 'insert-text'],
    },
    {
        id: 'delete',
        choreography: 'select-replace',
        weight: 10,
        supports: (revision) => revision.removeStart < revision.removeEnd && !revision.insert,
        operations: () => ['select-text', 'delete-text'],
    },
    {
        id: 'preserve-fragments',
        choreography: 'select-replace',
        weight: 4,
        supports: (revision) =>
            revision.preservedPrefix.length + revision.preservedSuffix.length >= 3,
        operations: () => ['select-difference', 'replace-difference'],
    },
    {
        id: 'reconsider',
        choreography: 'reconsider',
        weight: 2,
        supports: (_revision, hasDecoy) => hasDecoy,
        operations: () => ['remove-current', 'type-alternative', 'reconsider', 'type-target'],
    },
    {
        id: 'select-replace',
        choreography: 'select-replace',
        weight: 3,
        supports: () => true,
        operations: () => ['select-current', 'type-target'],
    },
    {
        id: 'backspace',
        choreography: 'backspace',
        weight: 3,
        supports: () => true,
        operations: () => ['move-caret', 'backspace-current', 'type-target'],
    },
];

export class EditStrategyPlanner {
    private recent: EditStrategyId[] = [];

    constructor(private readonly memorySize = 6) {}

    choose(
        current: string,
        target: string,
        hasDecoy: boolean,
        random: () => number = Math.random
    ): PlannedTextEdit {
        const candidates = EDIT_STRATEGIES.flatMap((strategy) => {
            const revision = diffTextRevision(current, target, strategy.choreography);
            if (!strategy.supports(revision, hasDecoy)) return [];
            const recentIndex = this.recent.indexOf(strategy.id);
            const novelty = recentIndex < 0 ? 1 : Math.max(0.18, (recentIndex + 1) / (this.memorySize + 1));
            return [{ strategy, revision, weight: strategy.weight * novelty }];
        });
        const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
        let roll = random() * total;
        const selected =
            candidates.find((candidate) => {
                roll -= candidate.weight;
                return roll <= 0;
            }) ?? candidates[candidates.length - 1];
        this.recent = [
            selected.strategy.id,
            ...this.recent.filter((id) => id !== selected.strategy.id),
        ].slice(0, this.memorySize);
        return {
            strategy: selected.strategy.id,
            choreography: selected.strategy.choreography,
            revision: selected.revision,
            plan: {
                kind: 'word-revision',
                operations: selected.strategy.operations(selected.revision),
                allowsSemanticHoldBetweenOperations: false,
            },
        };
    }

    snapshot() {
        return [...this.recent];
    }
}

export type SemanticSlotName =
    | 'subject'
    | 'connector'
    | 'modal'
    | 'verb'
    | 'object'
    | 'punctuation';

export type SemanticTextRange = {
    slot: SemanticSlotName;
    line: 1 | 2;
    start: number;
    end: number;
    text: string;
};

export const mapSemanticRanges = (
    lines: [string, string],
    slots: Partial<Record<SemanticSlotName, string>>
): SemanticTextRange[] =>
    Object.entries(slots).flatMap(([slot, text]) => {
        if (!text) return [];
        for (const line of [1, 2] as const) {
            const start = lines[line - 1].toLowerCase().indexOf(text.toLowerCase());
            if (start >= 0) {
                return [{
                    slot: slot as SemanticSlotName,
                    line,
                    start,
                    end: start + text.length,
                    text: lines[line - 1].slice(start, start + text.length),
                }];
            }
        }
        return [];
    });

export type EditPersonality =
    | 'concise-correction'
    | 'deliberate-revision'
    | 'exploratory-rethink';

export type SemanticTransition = {
    changedLines: Array<1 | 2>;
    sharedTokenCount: number;
    sourceLength: number;
    targetLength: number;
    sourceQuestion: boolean;
    targetQuestion: boolean;
};

export const describeSemanticTransition = (
    current: [string, string],
    target: [string, string]
): SemanticTransition => ({
    changedLines: ([1, 2] as const).filter(
        (line) => current[line - 1] !== target[line - 1]
    ),
    sharedTokenCount:
        tokenOverlap(current[0], target[0]) +
        tokenOverlap(current[1], target[1]),
    sourceLength: current[0].length + current[1].length,
    targetLength: target[0].length + target[1].length,
    sourceQuestion: current[1].trimEnd().endsWith('?'),
    targetQuestion: target[1].trimEnd().endsWith('?'),
});

export type EditTemplateId =
    | 'local-conversion'
    | 'progressive-refinement'
    | 'prune-phrase'
    | 'extend-phrase'
    | 'focused-revision'
    | 'reconstruct-thought';

type EditPlanTemplate = {
    id: EditTemplateId;
    weight: number;
    supports: (transition: SemanticTransition) => boolean;
};

export const EDIT_PLAN_TEMPLATES: EditPlanTemplate[] = [
    {
        id: 'local-conversion',
        weight: 9,
        supports: (transition) =>
            transition.sourceQuestion !== transition.targetQuestion &&
            transition.sharedTokenCount > 0,
    },
    {
        id: 'progressive-refinement',
        weight: 7,
        supports: (transition) =>
            transition.sharedTokenCount >= 2 &&
            transition.targetLength >= transition.sourceLength,
    },
    {
        id: 'prune-phrase',
        weight: 7,
        supports: (transition) =>
            transition.targetLength < transition.sourceLength &&
            transition.sharedTokenCount > 0,
    },
    {
        id: 'extend-phrase',
        weight: 7,
        supports: (transition) =>
            transition.targetLength > transition.sourceLength &&
            transition.sharedTokenCount > 0,
    },
    {
        id: 'focused-revision',
        weight: 5,
        supports: (transition) => transition.changedLines.length === 1,
    },
    {
        id: 'reconstruct-thought',
        weight: 2,
        supports: () => true,
    },
];

export class EditTemplateRegistry {
    private recent: EditTemplateId[] = [];

    choose(
        transition: SemanticTransition,
        random: () => number = Math.random
    ): EditTemplateId {
        const candidates = EDIT_PLAN_TEMPLATES.filter(({ supports }) =>
            supports(transition)
        ).map((template) => ({
            ...template,
            effectiveWeight:
                template.weight * (this.recent.includes(template.id) ? 0.25 : 1),
        }));
        let roll =
            random() *
            candidates.reduce((sum, candidate) => sum + candidate.effectiveWeight, 0);
        const selected =
            candidates.find((candidate) => {
                roll -= candidate.effectiveWeight;
                return roll <= 0;
            }) ?? candidates[candidates.length - 1];
        this.recent = [
            selected.id,
            ...this.recent.filter((id) => id !== selected.id),
        ].slice(0, 4);
        return selected.id;
    }

    snapshot() {
        return [...this.recent];
    }
}

export const auditTemplateReachability = (transitions: SemanticTransition[]) => ({
    unreachable: EDIT_PLAN_TEMPLATES.filter(
        (template) => !transitions.some((transition) => template.supports(transition))
    ).map(({ id }) => id),
});

export type CompositeEditStep = {
    line: 1 | 2;
    current: string;
    target: string;
    edit: PlannedTextEdit;
};

export type CompositeEditPlan = {
    template: EditTemplateId;
    personality: EditPersonality;
    steps: CompositeEditStep[];
    operationBudget: number;
    semanticRanges: SemanticTextRange[];
    allowsSemanticHoldBetweenSteps: false;
};

export const compileCompositeEditOperations = (
    plan: CompositeEditPlan
): EditOperation[] => {
    const hesitation: EditOperation[] =
        plan.personality === 'concise-correction'
            ? []
            : [
                  {
                      type: 'pause',
                      duration:
                          plan.personality === 'exploratory-rethink'
                              ? 'deliberate'
                              : 'brief',
                  },
              ];
    const operations = plan.steps.flatMap((step) =>
        compileTextEditOperations(
            step.line,
            0,
            step.edit.revision,
            step.edit.choreography
        ).filter(({ type }) => type !== 'commit-semantic-state')
    );
    return [...hesitation, ...operations, { type: 'commit-semantic-state' }];
};

export class CompositeEditPlanner {
    private recentPersonalities: EditPersonality[] = [];
    private readonly strategies = new EditStrategyPlanner(7);
    private readonly templates = new EditTemplateRegistry();

    plan(
        current: [string, string],
        target: [string, string],
        viewportWidth: number,
        slots: Partial<Record<SemanticSlotName, string>> = {},
        random: () => number = Math.random
    ): CompositeEditPlan {
        const order = planConstructionRewrite(current, target).lineOrder;
        const transition = describeSemanticTransition(current, target);
        const template = this.templates.choose(transition, random);
        if (template === 'local-conversion') {
            order.splice(0, order.length, 1, 2);
        }
        const changed = order.filter((line) => current[line - 1] !== target[line - 1]);
        const operationBudget = viewportWidth < 420 ? 5 : 8;
        const personalityCandidates: EditPersonality[] =
            changed.length > 1
                ? ['deliberate-revision', 'exploratory-rethink', 'concise-correction']
                : ['concise-correction', 'deliberate-revision'];
        const weighted = personalityCandidates.map((personality) => ({
            personality,
            weight: this.recentPersonalities.includes(personality) ? 0.3 : 1,
        }));
        let roll = random() * weighted.reduce((sum, item) => sum + item.weight, 0);
        const personality =
            weighted.find((item) => {
                roll -= item.weight;
                return roll <= 0;
            })?.personality ?? weighted[0].personality;
        this.recentPersonalities = [
            personality,
            ...this.recentPersonalities.filter((item) => item !== personality),
        ].slice(0, 3);

        let operations = 0;
        const steps = changed.map((line): CompositeEditStep => {
            let edit = this.strategies.choose(
                current[line - 1],
                target[line - 1],
                personality === 'exploratory-rethink',
                random
            );
            const preferredChoreography: WordEditChoreography | null =
                template === 'reconstruct-thought'
                    ? 'backspace'
                    : template === 'local-conversion' ||
                        template === 'progressive-refinement' ||
                        template === 'prune-phrase' ||
                        template === 'extend-phrase'
                      ? 'select-replace'
                      : null;
            if (preferredChoreography) {
                const revision = diffTextRevision(
                    current[line - 1],
                    target[line - 1],
                    preferredChoreography
                );
                const insertion = revision.removeStart === revision.removeEnd;
                const deletion = !revision.insert;
                edit = {
                    strategy: insertion
                        ? 'insert'
                        : deletion
                          ? 'delete'
                          : preferredChoreography === 'backspace'
                            ? 'backspace'
                            : 'preserve-fragments',
                    choreography: preferredChoreography,
                    revision,
                    plan: {
                        kind: 'construction-rewrite',
                        operations: insertion
                            ? ['move-caret', 'insert-text']
                            : deletion
                              ? ['select-text', 'delete-text']
                              : ['preserve-context', 'replace-difference'],
                        allowsSemanticHoldBetweenOperations: false,
                    },
                };
            }
            operations += edit.plan.operations.length;
            if (operations > operationBudget) {
                const choreography: WordEditChoreography = 'select-replace';
                edit = {
                    strategy: 'select-replace',
                    choreography,
                    revision: diffTextRevision(
                        current[line - 1],
                        target[line - 1],
                        choreography
                    ),
                    plan: {
                        kind: 'construction-rewrite',
                        operations: ['select-phrase', 'replace-phrase'],
                        allowsSemanticHoldBetweenOperations: false,
                    },
                };
            }
            return {
                line,
                current: current[line - 1],
                target: target[line - 1],
                edit,
            };
        });
        return {
            template,
            personality,
            steps,
            operationBudget,
            semanticRanges: mapSemanticRanges(current, slots),
            allowsSemanticHoldBetweenSteps: false,
        };
    }

    snapshot() {
        return {
            personalities: [...this.recentPersonalities],
            strategies: this.strategies.snapshot(),
            templates: this.templates.snapshot(),
        };
    }
}

export const planCoordinatedRevision = (): SemanticEditPlan => ({
    kind: 'coordinated-revision',
    operations: ['replace-verb', 'repair-object'],
    allowsSemanticHoldBetweenOperations: false,
});

export const isVisitorReadablePlan = (plan: SemanticEditPlan) =>
    plan.operations.length > 0 &&
    (plan.allowsSemanticHoldBetweenOperations || plan.operations.length <= 4);
