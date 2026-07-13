import { describe, expect, it } from 'vitest';

import {
    TrajectoryMemory,
    compileRoleRelations,
    weightedChoice,
} from '../../lib/headline/engine';
import { gerund, pastTense, thirdPerson } from '../../lib/headline/grammar';
import {
    NarrativePlanner,
    analyzeRelationGraph,
} from '../../lib/headline/planner';
import {
    renderConstruction,
    renderOutcomeChain,
} from '../../lib/headline/constructions';
import { compileHeadlineManifest } from '../../lib/headline/manifest';
import { HeadlineEditRuntime } from '../../lib/headline/runtime';
import {
    auditBehaviorDistribution,
    HeadlineBehaviorPolicy,
    timingDelay,
} from '../../lib/headline/policy';
import {
    graphemeBoundaries,
    normalizeGraphemeRange,
    previousGraphemeBoundary,
    transformFormattedDelete,
    transformFormattedInsert,
    transformRangeAfterDelete,
} from '../../lib/headline/text';
import {
    CaretAnchorMemory,
    orderSemanticDependencies,
    planSemanticPath,
} from '../../lib/headline/path';
import {
    CompositeEditPlanner,
    compileCompositeEditOperations,
    EditTemplateRegistry,
    auditOperationReachability,
    auditTemplateReachability,
    compileTextEditOperations,
    diffTextRevision,
    describeSemanticTransition,
    EditStrategyPlanner,
    isVisitorReadablePlan,
    planCoordinatedRevision,
    planConstructionRewrite,
    planWordRevision,
    mapSemanticRanges,
    validateEditOperations,
    simulateEditTransaction,
} from '../../lib/headline/edits';

describe('headline engine primitives', () => {
    it('lets new vocabulary inherit relationships through semantic roles', () => {
        const relations = compileRoleRelations(
            [
                { id: 'Dashboards', capabilities: ['reveal'] },
                { id: 'Portals', capabilities: ['serve'] },
            ],
            [
                {
                    id: 'surface',
                    capability: 'reveal',
                    objectRoles: ['decision-support'],
                },
                {
                    id: 'support',
                    capability: 'serve',
                    objectRoles: ['audience'],
                },
            ],
            [
                { id: 'signals', roles: ['decision-support'] },
                { id: 'customers', roles: ['audience'] },
            ]
        );

        expect(relations).toEqual([
            { subject: 'Dashboards', verb: 'surface', object: 'signals' },
            { subject: 'Portals', verb: 'support', object: 'customers' },
        ]);
    });

    it('discounts recently shown states without making them unreachable', () => {
        const memory = new TrajectoryMemory(4);
        memory.remember('recent');

        expect(memory.noveltyWeight('new')).toBe(1);
        expect(memory.noveltyWeight('recent')).toBeGreaterThan(0);
        expect(memory.noveltyWeight('recent')).toBeLessThan(1);
        expect(
            memory.choose(
                [
                    { value: 'recent', weight: 1 },
                    { value: 'new', weight: 1 },
                ],
                (value) => value,
                () => 0.99
            )
        ).toBe('new');
    });

    it('supports reusable weighted selection and English morphology', () => {
        expect(
            weightedChoice(
                [
                    { value: 'strong', weight: 4 },
                    { value: 'supporting', weight: 1 },
                ],
                () => 0
            )
        ).toBe('strong');
        expect(thirdPerson({ base: 'clarify' })).toBe('clarifies');
        expect(pastTense({ base: 'validate' })).toBe('validated');
        expect(gerund({ base: 'serve' })).toBe('serving');
    });

    it('plans across energy, domain, and surprise facets', () => {
        const planner = new NarrativePlanner(4, 1);
        const candidate = {
            value: 'question',
            key: 'api-connect-product',
            subject: 'APIs',
            verb: 'connect',
            object: 'your product',
            domain: 'developer' as const,
            family: 'question' as const,
            quality: 'strong' as const,
            energy: 'curious' as const,
            surprise: 0.4,
            concepts: ['developer', 'product'],
        };

        expect(planner.choose([candidate], () => 0)).toBe('question');
        expect(planner.snapshot().recent.domain).toContain('developer');
        expect(planner.score(candidate)).toBeGreaterThan(0);
    });

    it('reports graph hubs and underconnected subjects', () => {
        const graph = analyzeRelationGraph([
            { subject: 'APIs', verb: 'connect', object: 'products' },
            { subject: 'APIs', verb: 'sync', object: 'data' },
            { subject: 'Forms', verb: 'validate', object: 'records' },
        ]);

        expect(graph.relationCount).toBe(3);
        expect(graph.subjectDegrees[0]).toEqual(['APIs', 2]);
        expect(graph.underconnectedSubjects).toContainEqual(['Forms', 1]);
    });

    it('registers grammar-aware construction plugins and outcome chains', () => {
        expect(
            renderConstruction('counterfactual', {
                subject: 'APIs',
                subjectPlural: true,
                verb: { base: 'connect' },
                link: ' ',
                object: 'your product',
            })
        ).toEqual({
            family: 'counterfactual',
            line1: 'What if APIs',
            line2: 'connected your product?',
        });
        expect(
            renderOutcomeChain({
                friction: 'busywork',
                capability: 'Clearer workflows',
                intermediate: 'time for your team',
                humanOutcome: 'people doing meaningful work',
            })
        ).toHaveLength(2);
    });

    it('validates and compiles role-driven manifests', () => {
        const result = compileHeadlineManifest({
            subjects: [{ id: 'APIs', capabilities: ['connect-system'] }],
            verbs: [
                {
                    id: 'connect',
                    capability: 'connect-system',
                    objectRoles: ['product'],
                },
            ],
            objects: [{ id: 'products', roles: ['product'] }],
        });

        expect(result.valid).toBe(true);
        expect(result.relations).toEqual([
            { subject: 'APIs', verb: 'connect', object: 'products' },
        ]);
    });

    it('plans visible edits without holding an unfinished semantic state', () => {
        expect(planWordRevision(true, () => 0).choreography).toBe('reconsider');
        expect(planWordRevision(false, () => 0.2).choreography).toBe(
            'select-replace'
        );
        expect(planWordRevision(false, () => 0.9).choreography).toBe('backspace');

        const coordinated = planCoordinatedRevision();
        expect(coordinated.operations).toEqual([
            'replace-verb',
            'repair-object',
        ]);
        expect(coordinated.allowsSemanticHoldBetweenOperations).toBe(false);
        expect(isVisitorReadablePlan(coordinated)).toBe(true);
    });

    it('preserves recognizable text when planning local revisions', () => {
        expect(diffTextRevision('records', 'requests', 'select-replace')).toEqual({
            removeStart: 0,
            removeEnd: 7,
            insert: 'requests',
            preservedPrefix: '',
            preservedSuffix: '',
        });
        expect(diffTextRevision('connect', 'clarify', 'backspace')).toEqual({
            removeStart: 0,
            removeEnd: 7,
            insert: 'clarify',
            preservedPrefix: '',
            preservedSuffix: '',
        });
        expect(diffTextRevision('API', 'APIs', 'select-replace')).toMatchObject({
            removeStart: 3,
            removeEnd: 3,
            insert: 's',
            preservedPrefix: 'API',
        });
        expect(diffTextRevision('signals', 'patterns', 'select-replace')).toMatchObject({
            removeStart: 0,
            removeEnd: 7,
            preservedSuffix: '',
        });
    });

    it('rewrites the line with more shared meaning first', () => {
        expect(
            planConstructionRewrite(
                ['Could APIs', 'connect your product?'],
                ['What if APIs', 'connected your product?']
            ).lineOrder
        ).toEqual([2, 1]);
    });

    it('selects specialized edit strategies and discounts recent behavior', () => {
        const planner = new EditStrategyPlanner(4);
        const insertion = planner.choose('API', 'APIs', false, () => 0);
        expect(insertion.strategy).toBe('insert');
        expect(insertion.plan.operations).toEqual(['move-caret', 'insert-text']);

        const next = planner.choose('API', 'APIs', false, () => 0.2);
        expect(next.strategy).not.toBe('insert');
        expect(planner.snapshot()).toHaveLength(2);
    });

    it('maps semantic ranges and composes bounded multi-line revisions', () => {
        expect(
            mapSemanticRanges(['Could APIs', 'connect your product?'], {
                subject: 'APIs',
                verb: 'connect',
                object: 'your product',
            })
        ).toEqual([
            { slot: 'subject', line: 1, start: 6, end: 10, text: 'APIs' },
            { slot: 'verb', line: 2, start: 0, end: 7, text: 'connect' },
            { slot: 'object', line: 2, start: 8, end: 20, text: 'your product' },
        ]);

        const plan = new CompositeEditPlanner().plan(
            ['Could APIs', 'connect your product?'],
            ['What if APIs', 'connected your product?'],
            390,
            { subject: 'APIs' },
            () => 0
        );
        expect(plan.steps.map(({ line }) => line)).toEqual([2, 1]);
        expect(plan.operationBudget).toBe(5);
        expect(plan.allowsSemanticHoldBetweenSteps).toBe(false);
        expect(plan.semanticRanges[0].slot).toBe('subject');
        expect(plan.template).toBe('progressive-refinement');
        expect(plan.steps.every(({ edit }) => edit.choreography === 'select-replace')).toBe(
            true
        );
    });

    it('compiles valid typed operations for insertion and replacement', () => {
        const insertion = compileTextEditOperations(
            1,
            0,
            diffTextRevision('API', 'APIs', 'select-replace'),
            'select-replace'
        );
        expect(insertion).toEqual([
            { type: 'move-caret', line: 1, position: 3 },
            { type: 'insert-text', text: 's', allowTypos: false },
            { type: 'commit-semantic-state' },
        ]);
        expect(validateEditOperations(insertion, { 1: 3, 2: 0 })).toBe(true);

        const replacement = compileTextEditOperations(
            2,
            4,
            diffTextRevision('records', 'requests', 'select-replace'),
            'select-replace'
        );
        expect(replacement.map(({ type }) => type)).toEqual([
            'select-range',
            'delete-selection',
            'insert-text',
            'commit-semantic-state',
        ]);
        expect(validateEditOperations(replacement, { 1: 0, 2: 20 })).toBe(true);
    });

    it('simulates transactions and rejects prohibited intermediate states', () => {
        const operations = compileTextEditOperations(
            2,
            0,
            diffTextRevision('records', 'requests', 'select-replace'),
            'select-replace'
        );
        const transaction = simulateEditTransaction(
            ['Forms that', 'records'],
            operations,
            ['Forms that', 'requests']
        );
        expect(transaction.valid).toBe(true);
        expect(transaction.finalLines[1]).toBe('requests');
        expect(transaction.states.at(-1)?.policy).toBe('valid');
        expect(transaction.states.slice(1, -1).every(({ policy }) => policy === 'transient')).toBe(true);

        const invalid = simulateEditTransaction(
            ['Forms that', 'records'],
            [
                { type: 'move-caret', line: 2, position: 99 },
                { type: 'commit-semantic-state' },
            ]
        );
        expect(invalid.valid).toBe(false);
        expect(invalid.errors).toContain('caret-out-of-bounds');
        expect(invalid.states.at(-1)?.policy).toBe('prohibited');
    });

    it('audits typed operation reachability', () => {
        const audit = auditOperationReachability([
            [
                { type: 'move-caret', line: 1, position: 0 },
                { type: 'insert-text', text: 'A', allowTypos: false },
                { type: 'commit-semantic-state' },
            ],
        ]);
        expect(audit.reached).toContain('insert-text');
        expect(audit.unreachable).toContain('transfer-emphasis');
    });

    it('classifies semantic transitions and selects reachable templates', () => {
        const conversion = describeSemanticTransition(
            ['APIs that', 'connect your product'],
            ['Could APIs', 'connect your product?']
        );
        expect(conversion.sourceQuestion).toBe(false);
        expect(conversion.targetQuestion).toBe(true);
        expect(new EditTemplateRegistry().choose(conversion, () => 0)).toBe(
            'local-conversion'
        );

        const transitions = [
            conversion,
            describeSemanticTransition(
                ['Tools that', 'support teams'],
                ['Tools that', 'support product teams']
            ),
            describeSemanticTransition(
                ['Software that', 'reduces repetitive busywork'],
                ['Software that', 'reduces busywork']
            ),
            describeSemanticTransition(
                ['Dashboards that', 'surface signals'],
                ['Forms that', 'validate records']
            ),
        ];
        expect(auditTemplateReachability(transitions).unreachable).toEqual([]);
    });

    it('compiles a multi-line plan with one final semantic commit', () => {
        const current: [string, string] = ['APIs that', 'connect products'];
        const target: [string, string] = ['Could APIs', 'connect your product?'];
        const plan = new CompositeEditPlanner().plan(
            current,
            target,
            600,
            { subject: 'APIs' },
            () => 0
        );
        const operations = compileCompositeEditOperations(plan);
        expect(operations[0]).toEqual({ type: 'pause', duration: 'brief' });
        expect(
            operations.filter(({ type }) => type === 'commit-semantic-state')
        ).toHaveLength(1);
        expect(operations.at(-1)?.type).toBe('commit-semantic-state');
        expect(simulateEditTransaction(current, operations, target).valid).toBe(true);
    });

    it('runs typed operations through a traced state machine', () => {
        const phases: string[] = [];
        let committed = false;
        const runtime = new HeadlineEditRuntime(
            { execute: (_operation, done) => done() },
            (trace) => phases.push(trace.at(-1)!.phase)
        );
        const accepted = runtime.run({
            initialLines: ['API', 'tools'],
            expectedLines: ['APIs', 'tools'],
            operations: [
                { type: 'move-caret', line: 1, position: 3 },
                { type: 'insert-text', text: 's', allowTypos: false },
                { type: 'commit-semantic-state' },
            ],
            onCommit: () => {
                committed = true;
            },
            onRecovery: () => undefined,
        });
        expect(accepted).toBe(true);
        expect(committed).toBe(true);
        expect(phases).toEqual([
            'planning',
            'navigating',
            'mutating',
            'verifying',
            'committed',
        ]);
    });

    it('plans valid semantic bridges and orders dependent repairs', () => {
        const source = {
            value: 'broad',
            key: 'broad',
            concepts: ['product', 'teams'],
            valid: true,
        };
        const target = {
            value: 'outcome',
            key: 'outcome',
            concepts: ['workflow', 'time'],
            valid: true,
        };
        const path = planSemanticPath(source, target, [
            {
                value: 'bridge',
                key: 'bridge',
                concepts: ['product', 'workflow'],
                valid: true,
            },
        ]);
        expect(path.map(({ value }) => value)).toEqual([
            'broad',
            'bridge',
            'outcome',
        ]);
        expect(
            orderSemanticDependencies([
                'punctuation',
                'object',
                'mode',
                'verb',
            ])
        ).toEqual(['mode', 'punctuation', 'verb', 'object']);
    });

    it('checkpoints, pauses, resumes, and cancels runtime execution', () => {
        let pending: (() => void) | null = null;
        let committed = false;
        const runtime = new HeadlineEditRuntime({
            execute: (_operation, done) => {
                pending = done;
            },
        });
        runtime.run({
            initialLines: ['API', 'tools'],
            expectedLines: ['APIs', 'tools'],
            operations: [
                { type: 'move-caret', line: 1, position: 3 },
                { type: 'insert-text', text: 's', allowTypos: false },
                { type: 'commit-semantic-state' },
            ],
            onCommit: () => {
                committed = true;
            },
            onRecovery: () => undefined,
        });
        runtime.pause();
        pending!();
        expect(runtime.checkpoint()).toMatchObject({
            operationIndex: 1,
            paused: true,
        });
        runtime.resume();
        pending!();
        expect(runtime.checkpoint().operationIndex).toBe(2);
        expect(committed).toBe(true);

        runtime.cancel();
        expect(runtime.checkpoint().cancelled).toBe(false);
    });

    it('can unpause a runtime while its adapter owns the pending operation', () => {
        let pending: (() => void) | null = null;
        const runtime = new HeadlineEditRuntime({
            execute: (_operation, done) => {
                pending = done;
            },
        });
        runtime.run({
            initialLines: ['API', 'tools'],
            expectedLines: ['APIs', 'tools'],
            operations: [
                { type: 'move-caret', line: 1, position: 3 },
                { type: 'insert-text', text: 's', allowTypos: false },
                { type: 'commit-semantic-state' },
            ],
            onCommit: () => undefined,
            onRecovery: () => undefined,
        });
        runtime.pause();
        runtime.resume(false);
        expect(runtime.checkpoint().paused).toBe(false);
        expect(runtime.checkpoint().operationIndex).toBe(0);
        pending!();
        expect(runtime.checkpoint().operationIndex).toBe(1);
    });

    it('plans caret travel from semantic anchor continuity', () => {
        const memory = new CaretAnchorMemory();
        expect(
            memory.plan(
                { slot: 'object', line: 2, start: 8, end: 15 },
                { line: 1, position: 4 }
            )
        ).toBe('direct');
        expect(
            memory.plan(
                { slot: 'object', line: 2, start: 12, end: 20 },
                { line: 2, position: 9 }
            )
        ).toBe('arrow');
        expect(
            memory.plan(
                { slot: 'verb', line: 2, start: 0, end: 7 },
                { line: 2, position: 18 }
            )
        ).toBe('word-jump');
        expect(memory.snapshot().anchor?.slot).toBe('verb');
    });

    it('balances behavior facets and applies timing profiles', () => {
        const policy = new HeadlineBehaviorPolicy(4);
        expect(
            policy.choose(
                'navigation',
                [
                    { value: 'arrow', weight: 3 },
                    { value: 'direct', weight: 1 },
                ],
                () => 0
            )
        ).toBe('arrow');
        expect(
            policy.choose(
                'navigation',
                [
                    { value: 'arrow', weight: 3 },
                    { value: 'direct', weight: 1 },
                ],
                () => 0.9
            )
        ).toBe('direct');
        expect(policy.snapshot().counts.navigation).toEqual({ arrow: 1, direct: 1 });
        expect(timingDelay('crisp', 100)).toBe(65);
        expect(timingDelay('deliberate', 100)).toBe(100);
        expect(timingDelay('exploratory', 100)).toBe(135);
    });

    it('keeps emoji graphemes and formatting ranges intact during edits', () => {
        const text = 'Tools 👩‍💻 that';
        const emojiEnd = text.indexOf(' that');
        const emojiStart = text.indexOf('👩');
        expect(previousGraphemeBoundary(text, emojiEnd)).toBe(emojiStart);
        expect(normalizeGraphemeRange(text, emojiStart + 1, emojiEnd - 1)).toEqual([
            emojiStart,
            emojiEnd,
        ]);
        expect(graphemeBoundaries('A🔥B')).toEqual([0, 1, 3, 4]);
        expect(graphemeBoundaries('A👍🏽B')).toEqual([0, 1, 5, 6]);
        expect(graphemeBoundaries('A🇺🇸B')).toEqual([0, 1, 5, 6]);
        expect(graphemeBoundaries('A❤️B')).toEqual([0, 1, 3, 4]);
        expect(graphemeBoundaries(text)).toBe(graphemeBoundaries(text));
        expect(transformRangeAfterDelete([5, 12], [3, 8])).toEqual([3, 7]);
        expect(transformRangeAfterDelete([5, 12], [7, 9])).toEqual([5, 10]);
    });

    it('flags mechanically dominant long-run behavior distributions', () => {
        expect(
            auditBehaviorDistribution({ select: 40, backspace: 35, rewrite: 25 })
        ).toMatchObject({
            representedBehaviors: 3,
            dominantBehavior: 'select',
            dominantShare: 0.4,
            balanced: true,
        });
        expect(
            auditBehaviorDistribution({ select: 90, backspace: 10 })
        ).toMatchObject({ dominantShare: 0.9, balanced: false });
    });

    it('keeps formatting across a complete retyped replacement word', () => {
        let range: [number, number] = [5, 5];
        let affinity: { position: number } | null = { position: 5 };
        for (const character of 'word') {
            const transformed = transformFormattedInsert(
                range,
                affinity!.position,
                character,
                affinity
            );
            range = transformed.range;
            affinity = transformed.affinity;
        }
        expect(range).toEqual([5, 9]);
        expect(
            transformFormattedInsert(range, 9, ' ', affinity)
        ).toEqual({ range: [5, 9], affinity: null });

        expect(
            transformFormattedInsert([5, 5], 5, ' ', { position: 5 })
        ).toEqual({ range: [6, 6], affinity: { position: 6 } });
    });

    it('keeps formatting across a shared-prefix suffix replacement', () => {
        const deleted = transformFormattedDelete([5, 12], [7, 12], null);
        expect(deleted).toEqual({
            range: [5, 7],
            affinity: { position: 7 },
        });

        let { range, affinity } = deleted;
        for (const character of 'rface') {
            const inserted = transformFormattedInsert(
                range,
                affinity!.position,
                character,
                affinity
            );
            range = inserted.range;
            affinity = inserted.affinity;
        }
        expect(range).toEqual([5, 12]);
        expect(
            transformFormattedDelete(range, [11, 12], affinity)
        ).toEqual({ range: [5, 11], affinity: { position: 11 } });
    });
});
