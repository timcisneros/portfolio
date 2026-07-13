import { describe, expect, it } from 'vitest';

import {
    auditHeadlineGrammar,
    getHeadlineFormatSlots,
    getHeadlineFitLines,
    getHeadlineTripleQuality,
    isHeadlineTripleAllowed,
} from '../../components/TypewriterHeadline';

describe('typewriter headline grammar', () => {
    it('enumerates a unique committed-line corpus for fit auditing', () => {
        const lines = getHeadlineFitLines();

        expect(lines.length).toBe(new Set(lines).size);
        expect(lines).toContain('Visualizations that');
        expect(lines).toContain('clarify complex workflows');
        expect(lines).toContain('surface real-time updates');
        expect(lines).toContain('generate field reports');
        expect(lines).toContain('Operational metrics');
        expect(lines.some((line) => /[✨💡⭐🔥]/u.test(line))).toBe(true);
    });

    it('keeps every vocabulary slot reachable and every profile valid', () => {
        const audit = auditHeadlineGrammar();

        expect(audit.unreachableNouns).toEqual([]);
        expect(audit.unreachableVerbs).toEqual([]);
        expect(audit.unreachableObjects).toEqual([]);
        expect(audit.invalidProfileNouns).toEqual([]);
        expect(audit.invalidProfileVerbs).toEqual([]);
        expect(audit.invalidProfileObjects).toEqual([]);
        expect(audit.invalidQualityOverrides).toEqual([]);
        expect(audit.unprofiledNouns).toEqual([]);
        expect(audit.deadCapabilities).toEqual([]);
        expect(audit.isolatedTriples).toEqual([]);
        expect(audit.questionUnreachableNouns).toEqual([]);
        expect(audit.statementUnreachableNouns).toEqual(['Experiences']);
        expect(audit.questionUnreachableByModal).toEqual([
            { modal: 'Could', nouns: ['Experiences'] },
            { modal: 'How could', nouns: [] },
            { modal: 'How might', nouns: [] },
            { modal: 'Where could', nouns: ['Experiences'] },
        ]);
        expect(audit.questionLeadCount).toBe(4);
        expect(audit.phrasePromptCount).toBeGreaterThan(30);
        expect(audit.stancePromptCount).toBeGreaterThan(0);
        expect(audit.counterfactualPromptCount).toBeGreaterThan(0);
        expect(audit.roleManifestValid).toBe(true);
        expect(audit.inheritedSubjectCount).toBe(4);
        expect(audit.emojiArraysAligned).toBe(true);
        expect(audit.combinationCount).toBeGreaterThan(100);
    });

    it('binds verbs to compatible outcomes instead of crossing profile lists', () => {
        expect(isHeadlineTripleAllowed('APIs', 'sync', 'your data')).toBe(true);
        expect(isHeadlineTripleAllowed('APIs', 'support', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Bots', 'serve', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Forms', 'route', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Dashboards', 'monitor', 'decision context')).toBe(false);
        expect(isHeadlineTripleAllowed('Products', 'serve', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Ideas', 'help', 'your business')).toBe(false);
        expect(isHeadlineTripleAllowed('Data', 'support', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Services', 'help', 'clients')).toBe(false);
        expect(isHeadlineTripleAllowed('Schedulers', 'route', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Storefronts', 'organize', 'records')).toBe(false);
        expect(
            isHeadlineTripleAllowed(
                'Visualizations',
                'clarify',
                'complex workflows'
            )
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Dashboards', 'surface', 'real-time updates')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Internal tools', 'generate', 'field reports')
        ).toBe(true);
        expect(isHeadlineTripleAllowed('Forms', 'organize', 'field data')).toBe(true);
        expect(
            isHeadlineTripleAllowed('Consoles', 'surface', 'workflow state')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Reports', 'clarify', 'operational metrics')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Visualizations', 'monitor', 'workflow state')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Websites', 'surface', 'real-time updates')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Documentation', 'clarify', 'workflow state')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Briefs', 'clarify', 'field data')).toBe(
            false
        );
        expect(
            isHeadlineTripleAllowed(
                'Communication tools',
                'surface',
                'real-time updates'
            )
        ).toBe(false);
        expect(getHeadlineTripleQuality('Experiences', 'serve', 'users')).toBe(
            'exploratory'
        );
        expect(getHeadlineTripleQuality('Products', 'serve', 'users')).toBe(
            'supporting'
        );
        expect(getHeadlineTripleQuality('Solutions', 'support', 'startups')).toBe(
            'supporting'
        );
    });

    it('derives every question formatting range from rendered text', () => {
        expect(
            getHeadlineFormatSlots(
                'q',
                'Could APIs',
                'connect your product?',
                {
                    noun: 'APIs',
                    modal: 'Could',
                    verb: 'connect',
                    object: 'your product',
                }
            )
        ).toEqual([
            { line: 1, start: 0, text: 'Could' },
            { line: 1, start: 6, text: 'APIs' },
            { line: 2, start: 0, text: 'connect' },
            { line: 2, start: 8, text: 'your product' },
        ]);
    });
});
