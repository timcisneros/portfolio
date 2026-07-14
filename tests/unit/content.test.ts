import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    featuredProjects,
    systemsProjects,
    leadProjects,
    supportingProjects,
    moreProjects,
    skills,
} from '../../data/projects';
import { caseStudies } from '../../data/caseStudies';

const PUBLIC = join(__dirname, '..', '..', 'public');
const showcase = [...featuredProjects, ...systemsProjects];

describe('project content integrity', () => {
    it('every showcase image exists in public/', () => {
        for (const project of showcase) {
            expect(existsSync(join(PUBLIC, project.image)), project.image).toBe(
                true
            );
        }
    });

    it('every case-study step image exists in public/', () => {
        for (const study of caseStudies) {
            for (const step of study.steps) {
                expect(existsSync(join(PUBLIC, step.image)), step.image).toBe(
                    true
                );
            }
        }
    });

    it('every caseStudy link on a project points to a real case study', () => {
        const slugs = new Set(caseStudies.map((s) => `/projects/${s.slug}`));
        for (const project of showcase) {
            if (project.caseStudy) {
                expect(slugs.has(project.caseStudy), project.caseStudy).toBe(
                    true
                );
            }
        }
    });

    it('sitemap.xml lists every case study', () => {
        const sitemap = readFileSync(join(PUBLIC, 'sitemap.xml'), 'utf8');
        for (const study of caseStudies) {
            expect(sitemap).toContain(`/projects/${study.slug}</loc>`);
        }
    });

    it('all projects have non-empty required fields', () => {
        for (const project of [...showcase, ...moreProjects]) {
            expect(project.name.length).toBeGreaterThan(0);
            expect(project.tags.length).toBeGreaterThan(0);
            expect(project.code).toMatch(/^https:\/\/github\.com\//);
        }
        for (const study of caseStudies) {
            expect(study.employerValue.length).toBeGreaterThan(20);
            expect(study.intro.length).toBeGreaterThan(0);
            expect(study.steps.length).toBeGreaterThan(0);
            expect(study.build.length).toBeGreaterThan(0);
            for (const step of study.steps) {
                expect(step.imageAlt.length).toBeGreaterThan(10);
            }
        }
    });

    it('leads with professional and systems evidence before supporting work', () => {
        expect(leadProjects.map((project) => project.id)).toEqual([
            'dsdebug',
            'my-youtube',
            'ticket-system',
        ]);
        expect(supportingProjects.map((project) => project.id)).toEqual([
            'action-plan',
            'waydaw',
        ]);
    });

    it('qualifies skill depth and avoids production AI claims', () => {
        for (const group of skills) {
            expect(group.level.length).toBeGreaterThan(0);
            expect(group.description.length).toBeGreaterThan(20);
        }
        const labels = skills.flatMap((group) => group.items);
        expect(labels).toContain('OpenAI API prototyping');
        expect(labels).toContain('Eval & benchmark implementation');
        expect(labels).not.toContain('Production AI integration');
        expect(labels).not.toContain('Agent orchestration');
    });

    it('the served resume PDFs exist', () => {
        for (const filename of [
            'Timothy-Cisneros-Resume.pdf',
            'Timothy-Cisneros-Resume-Full-Stack.pdf',
            'Timothy-Cisneros-Resume-Applied-AI.pdf',
        ]) {
            expect(existsSync(join(PUBLIC, filename))).toBe(true);
        }
    });
});
