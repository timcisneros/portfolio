import { describe, expect, it } from 'vitest';

import {
    auditVisualReachability,
    runTrajectoryAudit,
} from '../../lib/headline/audit';

describe('headline scale audits', () => {
    const candidates = [
        {
            value: 'api',
            key: 'api-connect-product',
            subject: 'APIs',
            verb: 'connect',
            object: 'product',
            domain: 'developer' as const,
            family: 'statement' as const,
            quality: 'strong' as const,
            energy: 'concrete' as const,
            surprise: 0.2,
            concepts: ['developer', 'product'],
        },
        {
            value: 'dashboard',
            key: 'dashboard-surface-signal',
            subject: 'Dashboards',
            verb: 'surface',
            object: 'signals',
            domain: 'data' as const,
            family: 'question' as const,
            quality: 'strong' as const,
            energy: 'curious' as const,
            surprise: 0.4,
            concepts: ['data', 'decision-support'],
        },
    ];

    it('runs repeatable multi-seed trajectory distribution audits', () => {
        const report = runTrajectoryAudit(candidates, { seeds: 20, steps: 25 });

        expect(report.totalSelections).toBe(500);
        expect(report.uniqueKeys).toBe(2);
        expect(report.immediateRepeats).toBeLessThan(250);
        expect(Object.keys(report.domainFrequency)).toEqual([
            'developer',
            'data',
        ]);
    });

    it('reports construction reachability by rendered width', () => {
        const report = auditVisualReachability(
            [
                { key: 'short', line1: 'Could APIs', line2: 'sync data?' },
                {
                    key: 'long',
                    line1: 'How might internal tools',
                    line2: 'simplify your workflows?',
                },
            ],
            [12, 30],
            (text) => text.length
        );

        expect(report[0].unreachable).toEqual(['long']);
        expect(report[1].unreachable).toEqual([]);
    });
});
