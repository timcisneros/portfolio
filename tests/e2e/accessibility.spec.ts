import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { caseStudies } from '../../data/caseStudies';
import {
    SECRET_TOY_ENABLED,
    type SecretToyKind,
} from '../../lib/secretToys';

const auditedTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectAccessible(page: Page) {
    const results = await new AxeBuilder({ page })
        .withTags(auditedTags)
        .analyze();
    const violations = results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        targets: violation.nodes.flatMap((node) => node.target),
    }));
    expect(violations).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
    test(`homepage passes WCAG A/AA checks in ${theme} mode`, async ({ page }) => {
        await page.addInitScript((selectedTheme) => {
            localStorage.setItem('theme', selectedTheme);
        }, theme);
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expectAccessible(page);
    });

    test(`now page passes WCAG A/AA checks in ${theme} mode`, async ({ page }) => {
        await page.addInitScript((selectedTheme) => {
            localStorage.setItem('theme', selectedTheme);
        }, theme);
        await page.goto('/now');
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expectAccessible(page);
    });
}

for (const study of caseStudies) {
    test(`${study.name} case study passes WCAG A/AA checks`, async ({ page }) => {
        await page.goto(`/projects/${study.slug}`);
        await expectAccessible(page);
    });
}

test('HTML resume passes WCAG A/AA checks', async ({ page }) => {
    await page.goto('/resume');
    await expectAccessible(page);
});

const interactiveSecrets = [
    ['car', 'homepage car', '/', '#toy-car'],
    ['radio', 'Now-page radio', '/now', '#toy-radio'],
    ['launchpad', 'YouTube sample pad', '/projects/my-youtube', '#toy-launchpad'],
    ['oscilloscope', 'DSDebug oscilloscope', '/projects/dsdebug', '#toy-oscilloscope'],
] as const satisfies readonly (readonly [
    SecretToyKind,
    string,
    string,
    string,
])[];

for (const [kind, name, path, selector] of interactiveSecrets) {
    if (!SECRET_TOY_ENABLED[kind]) continue;
    test(`${name} passes WCAG A/AA checks after it is revealed`, async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
        await page.goto(path);
        await page.locator(selector).scrollIntoViewIfNeeded();
        await expect(page.locator(`${selector} canvas`)).toBeVisible();
        await expectAccessible(page);
    });
}
