import { describe, expect, it } from 'vitest';

import {
    auditHeadlineGrammar,
    getHeadlineFormatSlots,
    getHeadlineFitLines,
    getHeadlineTripleQuality,
    isHeadlineTripleEligibleFor,
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
        expect(lines).toContain('Workflow tools that');
        expect(lines).toContain('surface execution history');
        expect(lines).toContain('simplify complex workflows');
        expect(lines).toContain('Agent systems');
        expect(lines).toContain('with people in control.');
        expect(lines).toContain('Workflow visualizers that');
        expect(lines).toContain('clarify execution history');
        expect(lines).toContain('validate your data');
        expect(lines).toContain('Tested when things fail.');
        expect(lines).toContain('Operational software that');
        expect(lines).toContain('trace failure paths');
        expect(lines).toContain('surface application state');
        expect(lines).toContain('where every value came from?');
        expect(lines).toContain('People authorize.');
        expect(lines).toContain('should leave evidence.');
        expect(lines).toContain('Not the other way around.');
        expect(lines).toContain('without one vendor?');
        expect(lines).toContain('What still needs a person?');
        expect(lines).toContain('what should keep working?');
        expect(lines).toContain('Explicit deployment steps.');
        expect(lines).toContain('Solve the actual problem.');
        expect(lines).toContain('Keep judgment with people.');
        expect(lines).toContain('Then the simplest useful product.');
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
        expect(audit.isolatedTriples).toEqual([
            'Field tools | generate | field reports',
        ]);
        expect(audit.questionUnreachableNouns).toEqual(['Systems']);
        expect(audit.statementUnreachableNouns).toEqual([
            'Systems',
            'Tech',
            'Toolkits',
            'Frameworks',
        ]);
        expect(audit.questionUnreachableByModal).toEqual([
            {
                modal: 'Could',
                nouns: ['Systems', 'Tech', 'Toolkits', 'Frameworks'],
            },
            { modal: 'How could', nouns: ['Systems'] },
            { modal: 'How might', nouns: ['Systems'] },
            {
                modal: 'Where could',
                nouns: ['Systems', 'Tech', 'Toolkits', 'Frameworks'],
            },
        ]);
        expect(audit.questionLeadCount).toBe(4);
        expect(audit.phrasePromptCount).toBeGreaterThan(30);
        expect(audit.stancePromptCount).toBeGreaterThan(0);
        expect(audit.counterfactualPromptCount).toBeGreaterThan(0);
        expect(audit.roleManifestValid).toBe(true);
        expect(audit.inheritedSubjectCount).toBe(4);
        expect(audit.suppressedInherentCapabilityCount).toBeGreaterThan(0);
        expect(audit.emojiArraysAligned).toBe(true);
        expect(audit.combinationCount).toBeGreaterThan(100);
    });

    it('binds verbs to compatible outcomes instead of crossing profile lists', () => {
        expect(isHeadlineTripleAllowed('APIs', 'sync', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('APIs', 'support', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Bots', 'serve', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Forms', 'route', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Forms', 'route', 'approvals')).toBe(false);
        expect(isHeadlineTripleAllowed('Forms', 'organize', 'approvals')).toBe(false);
        expect(isHeadlineTripleAllowed('Forms', 'validate', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Forms', 'organize', 'field data')).toBe(false);
        expect(isHeadlineTripleAllowed('Programs', 'work', 'people')).toBe(false);
        expect(isHeadlineTripleAllowed('Features', 'support', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Apps', 'work', 'people')).toBe(false);
        expect(isHeadlineTripleAllowed('Tools', 'help', 'developers')).toBe(false);
        expect(isHeadlineTripleAllowed('Tools', 'generate', 'field reports')).toBe(false);
        expect(isHeadlineTripleAllowed('Apps', 'generate', 'field reports')).toBe(false);
        expect(isHeadlineTripleAllowed('Field tools', 'generate', 'field reports')).toBe(true);
        expect(isHeadlineTripleAllowed('Data', 'clarify', 'patterns')).toBe(false);
        expect(isHeadlineTripleAllowed('Data', 'surface', 'signals')).toBe(false);
        expect(isHeadlineTripleAllowed('Workflows', 'clarify', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Flows', 'clarify', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Internal tools', 'clarify', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Developer tools', 'surface', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('Automation', 'automate', 'busywork')).toBe(false);
        expect(isHeadlineTripleAllowed('Automation', 'reduce', 'busywork')).toBe(true);
        expect(isHeadlineTripleAllowed('Workflows', 'organize', 'your workflow')).toBe(false);
        expect(isHeadlineTripleAllowed('Workflows', 'simplify', 'handoffs')).toBe(true);
        expect(isHeadlineTripleAllowed('Infrastructure', 'support', 'your stack')).toBe(false);
        expect(isHeadlineTripleAllowed('Infrastructure', 'monitor', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Networks', 'connect', 'your stack')).toBe(false);
        expect(isHeadlineTripleAllowed('Backends', 'support', 'your stack')).toBe(false);
        expect(isHeadlineTripleAllowed('Backends', 'validate', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Modules', 'connect', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Pipelines', 'sync', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Code', 'support', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Experiences', 'serve', 'users')).toBe(false);
        expect(isHeadlineTripleAllowed('Experiences', 'simplify', 'complex workflows')).toBe(true);
        expect(isHeadlineTripleAllowed('Ideas', 'prepare', 'your roadmap')).toBe(false);
        expect(isHeadlineTripleAllowed('Ideas', 'clarify', 'your roadmap')).toBe(true);
        expect(isHeadlineTripleAllowed('Prototypes', 'prepare', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Prototypes', 'prepare', 'your launch')).toBe(true);
        expect(isHeadlineTripleAllowed('Services', 'serve', 'customers')).toBe(false);
        expect(isHeadlineTripleAllowed('Services', 'support', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Solutions', 'clarify', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Solutions', 'simplify', 'business processes')).toBe(false);
        expect(isHeadlineTripleAllowed('Solutions', 'simplify', 'complex workflows')).toBe(true);
        expect(isHeadlineTripleAllowed('Analytics', 'measure', 'your business')).toBe(false);
        expect(isHeadlineTripleAllowed('Analytics', 'clarify', 'bottlenecks')).toBe(true);
        expect(isHeadlineTripleAllowed('Insights', 'support', 'your business')).toBe(false);
        expect(isHeadlineTripleAllowed('Modules', 'clarify', 'decision context')).toBe(false);
        expect(isHeadlineTripleAllowed('Widgets', 'clarify', 'signals')).toBe(false);
        expect(isHeadlineTripleAllowed('Widgets', 'surface', 'signals')).toBe(false);
        expect(isHeadlineTripleAllowed('Widgets', 'clarify', 'workflow state')).toBe(true);
        expect(isHeadlineTripleAllowed('Workbenches', 'organize', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Workbenches', 'organize', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Frontends', 'connect', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Frontends', 'simplify', 'complex workflows')).toBe(true);
        expect(isHeadlineTripleAllowed('Consoles', 'trace', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('Consoles', 'trace', 'your stack')).toBe(false);
        expect(isHeadlineTripleAllowed('Consoles', 'monitor', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Consoles', 'surface', 'workflow state')).toBe(false);
        expect(isHeadlineTripleAllowed('Consoles', 'debug', 'your stack')).toBe(false);
        expect(isHeadlineTripleAllowed('Dashboards', 'monitor', 'decision context')).toBe(false);
        expect(isHeadlineTripleAllowed('Products', 'serve', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Ideas', 'help', 'your business')).toBe(false);
        expect(isHeadlineTripleAllowed('Data', 'support', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Services', 'help', 'clients')).toBe(false);
        expect(isHeadlineTripleAllowed('Schedulers', 'route', 'requests')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Schedulers', 'simplify', 'your workflows')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Storefronts', 'organize', 'records')).toBe(false);
        expect(
            isHeadlineTripleAllowed(
                'Visualizations',
                'clarify',
                'complex workflows'
            )
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Workflow tools', 'trace', 'system behavior')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Agent systems', 'surface', 'execution history')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Cloud applications', 'sync', 'your data')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Field tools', 'generate', 'field reports')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Agent systems', 'monitor', 'teams')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Field tools', 'surface', 'execution history')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed(
                'Business applications',
                'simplify',
                'business processes'
            )
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Business applications', 'simplify', 'busywork')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed(
                'Workflow visualizers',
                'trace',
                'system behavior'
            )
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Audit trails', 'clarify', 'execution history')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Data pipelines', 'validate', 'your data')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Serverless systems', 'connect', 'your stack')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Test suites', 'validate', 'system behavior')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Test suites', 'validate', 'application state')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Audit trails', 'monitor', 'teams')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Test suites', 'validate', 'your users')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Agents', 'support', 'users')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Agent systems', 'support', 'teams')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Code', 'protect', 'your data')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Cloud applications', 'serve', 'your users')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Field tools', 'simplify', 'business processes')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed(
                'Full-stack applications',
                'connect',
                'your stack'
            )
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed(
                'Operational software',
                'simplify',
                'business processes'
            )
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Operational software', 'simplify', 'busywork')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Developer tools', 'trace', 'failure paths')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('AI workflows', 'surface', 'execution history')
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('Self-hosted apps', 'protect', 'your data')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Apps', 'simplify', 'your workflow')).toBe(false);
        expect(isHeadlineTripleAllowed('Scripts', 'simplify', 'your workflow')).toBe(false);
        expect(isHeadlineTripleAllowed('Experiences', 'simplify', 'your workflow')).toBe(false);
        expect(isHeadlineTripleAllowed('Interfaces', 'simplify', 'your workflow')).toBe(false);
        expect(isHeadlineTripleAllowed('UIs', 'simplify', 'your workflow')).toBe(false);
        expect(isHeadlineTripleAllowed('Admin panels', 'simplify', 'your workflow')).toBe(false);
        expect(isHeadlineTripleAllowed('Cloud applications', 'simplify', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Full-stack applications', 'simplify', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Systems', 'organize', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Automation', 'organize', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Dashboards', 'measure', 'operational metrics')).toBe(false);
        expect(isHeadlineTripleAllowed('Databases', 'protect', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Models', 'clarify', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Reports', 'clarify', 'signals')).toBe(false);
        expect(isHeadlineTripleAllowed('Data pipelines', 'organize', 'your data')).toBe(false);
        expect(
            isHeadlineTripleAllowed(
                'Diagnostic tools',
                'clarify',
                'application state'
            )
        ).toBe(true);
        expect(
            isHeadlineTripleAllowed('AI workflows', 'monitor', 'teams')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Diagnostic tools', 'review', 'users')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Software', 'work', 'users')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Software', 'work', 'your users')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Apps', 'work', 'users')).toBe(false);
        expect(isHeadlineTripleAllowed('Tools', 'work', 'your users')).toBe(false);
        expect(isHeadlineTripleAllowed('Assistants', 'work', 'users')).toBe(false);
        expect(isHeadlineTripleAllowed('Models', 'work', 'users')).toBe(true);
        expect(isHeadlineTripleAllowed('Websites', 'help', 'users')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Websites', 'support', 'your users')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Apps', 'help', 'users')).toBe(false);
        expect(isHeadlineTripleAllowed('Platforms', 'serve', 'users')).toBe(false);
        expect(isHeadlineTripleAllowed('Products', 'help', 'users')).toBe(false);
        expect(isHeadlineTripleAllowed('Features', 'support', 'users')).toBe(false);
        expect(isHeadlineTripleAllowed('Interfaces', 'serve', 'users')).toBe(false);
        expect(isHeadlineTripleAllowed('Frontends', 'support', 'users')).toBe(
            false
        );
        expect(isHeadlineTripleAllowed('UIs', 'help', 'your users')).toBe(false);
        expect(isHeadlineTripleAllowed('Websites', 'clarify', 'your product')).toBe(
            false
        );
        expect(
            isHeadlineTripleAllowed('Dashboards', 'surface', 'real-time updates')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Dashboards', 'clarify', 'workflow state')).toBe(true);
        expect(isHeadlineTripleAllowed('Dashboards', 'monitor', 'operations')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Internal tools', 'generate', 'field reports')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Forms', 'organize', 'field data')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Consoles', 'surface', 'workflow state')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Reports', 'clarify', 'operational metrics')
        ).toBe(true);
        expect(isHeadlineTripleAllowed('Reports', 'surface', 'patterns')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Visualizations', 'monitor', 'workflow state')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Websites', 'surface', 'real-time updates')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Search tools', 'surface', 'patterns')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Search tools', 'surface', 'records')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Parsers', 'sync', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Parsers', 'validate', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Queues', 'route', 'handoffs')).toBe(false);
        expect(isHeadlineTripleAllowed('Queues', 'route', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Consoles', 'debug', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('Consoles', 'surface', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('Devtools', 'debug', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('Devtools', 'debug', 'edge cases')).toBe(false);
        expect(isHeadlineTripleAllowed('Diagnostic tools', 'trace', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('Diagnostic tools', 'trace', 'failure paths')).toBe(true);
        expect(isHeadlineTripleAllowed('Importers', 'sync', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Importers', 'validate', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Data pipelines', 'sync', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Data pipelines', 'reconcile', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Audit trails', 'surface', 'execution history')).toBe(false);
        expect(isHeadlineTripleAllowed('Audit trails', 'clarify', 'execution history')).toBe(false);
        expect(isHeadlineTripleAllowed('Audit trails', 'clarify', 'system behavior')).toBe(true);
        expect(isHeadlineTripleAllowed('Apps', 'organize', 'field data')).toBe(false);
        expect(isHeadlineTripleAllowed('Workflows', 'organize', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Workflows', 'organize', 'handoffs')).toBe(true);
        expect(isHeadlineTripleAllowed('Flows', 'organize', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Scripts', 'organize', 'your data')).toBe(false);
        expect(isHeadlineTripleAllowed('Internal tools', 'organize', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Dashboards', 'clarify', 'decision context')).toBe(false);
        expect(isHeadlineTripleAllowed('Reports', 'clarify', 'patterns')).toBe(false);
        expect(isHeadlineTripleAllowed('Workflow tools', 'surface', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('Workflow tools', 'trace', 'errors')).toBe(true);
        expect(isHeadlineTripleAllowed('Developer tools', 'debug', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('Developer tools', 'debug', 'edge cases')).toBe(true);
        expect(isHeadlineTripleAllowed('Diagnostic tools', 'surface', 'errors')).toBe(false);
        expect(isHeadlineTripleAllowed('AI workflows', 'organize', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Workflow visualizers', 'clarify', 'workflow state')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Workbenches', 'clarify', 'decision context')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Workbenches', 'organize', 'records')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Plugins', 'support', 'your product')).toBe(
            false
        );
        expect(
            isHeadlineTripleAllowed('Integrations', 'sync', 'your workflows')
        ).toBe(false);
        expect(isHeadlineTripleAllowed('Integrations', 'simplify', 'handoffs')).toBe(true);
        expect(isHeadlineTripleAllowed('Platforms', 'connect', 'your stack')).toBe(false);
        expect(isHeadlineTripleAllowed('Plugins', 'connect', 'your product')).toBe(false);
        expect(isHeadlineTripleAllowed('Databases', 'organize', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Databases', 'validate', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Backends', 'organize', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Portals', 'clarify', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Portals', 'organize', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Systems', 'connect', 'your stack')).toBe(false);
        expect(isHeadlineTripleAllowed('Agents', 'organize', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Command centers', 'monitor', 'signals')).toBe(false);
        expect(isHeadlineTripleAllowed('Visualizations', 'surface', 'patterns')).toBe(false);
        expect(isHeadlineTripleAllowed('Visualizations', 'clarify', 'patterns')).toBe(true);
        expect(isHeadlineTripleAllowed('Business applications', 'organize', 'records')).toBe(false);
        expect(isHeadlineTripleAllowed('Operational software', 'organize', 'requests')).toBe(false);
        expect(isHeadlineTripleAllowed('Self-hosted apps', 'simplify', 'your workflow')).toBe(false);
        expect(isHeadlineTripleAllowed('Interfaces', 'clarify', 'operations')).toBe(false);
        expect(isHeadlineTripleAllowed('Interfaces', 'simplify', 'complex workflows')).toBe(true);
        expect(isHeadlineTripleAllowed('UIs', 'clarify', 'operations')).toBe(false);
        expect(
            isHeadlineTripleAllowed('Admin panels', 'organize', 'approvals')
        ).toBe(false);
        expect(
            isHeadlineTripleAllowed('Admin panels', 'support', 'support teams')
        ).toBe(false);
        expect(
            getHeadlineTripleQuality('Services', 'support', 'startups')
        ).toBeNull();
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
        expect(
            getHeadlineTripleQuality(
                'Experiences',
                'simplify',
                'complex workflows'
            )
        ).toBe('strong');
        expect(getHeadlineTripleQuality('Products', 'serve', 'users')).toBeNull();
        expect(
            getHeadlineTripleQuality('Solutions', 'support', 'startups')
        ).toBeNull();
    });

    it('keeps servant relationships in stances instead of generic claims', () => {
        expect(
            isHeadlineTripleEligibleFor('Software', 'serve', 'your team', 'stance')
        ).toBe(true);
        expect(
            isHeadlineTripleEligibleFor('Software', 'serve', 'your team', 'statement')
        ).toBe(false);
        expect(
            isHeadlineTripleEligibleFor('Software', 'serve', 'your team', 'question')
        ).toBe(false);
        expect(
            isHeadlineTripleEligibleFor('Tech', 'empower', 'people', 'question')
        ).toBe(true);
        expect(
            isHeadlineTripleEligibleFor('Assistants', 'work', 'people', 'stance')
        ).toBe(true);
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
