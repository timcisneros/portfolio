import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    featuredProjects,
    systemsProjects,
    moreProjects,
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
            expect(study.intro.length).toBeGreaterThan(0);
            expect(study.steps.length).toBeGreaterThan(0);
            expect(study.build.length).toBeGreaterThan(0);
            for (const step of study.steps) {
                expect(step.imageAlt.length).toBeGreaterThan(10);
            }
        }
    });

    it('the served resume PDF exists', () => {
        expect(existsSync(join(PUBLIC, 'Timothy-Cisneros-Resume.pdf'))).toBe(
            true
        );
    });
});
