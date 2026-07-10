import { test, expect } from '@playwright/test';

import { caseStudies } from '../../data/caseStudies';

test('homepage renders every section', async ({ page }) => {
    await page.goto('/');
    // The tail of the headline is an animated typewriter, so assert the static
    // prefix plus the stable full sentence exposed via aria-label.
    await expect(page.locator('h1')).toContainText('Software that');
    await expect(page.locator('h1')).toHaveAttribute(
        'aria-label',
        'Software that works for you.'
    );
    for (const id of [
        '#projects',
        '#experience',
        '#skills',
        '#ai',
        '#about',
        '#contact',
    ]) {
        await expect(page.locator(id)).toHaveCount(1);
    }
});

test('featured project links to its walkthrough', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /read the walkthrough/i }).first().click();
    await expect(page).toHaveURL(/\/projects\/dsdebug/);
    await expect(page.locator('h1')).toContainText('DSDebug');
});

for (const study of caseStudies) {
    test(`case study /projects/${study.slug} renders with images`, async ({
        page,
    }) => {
        await page.goto(`/projects/${study.slug}`);
        await expect(page.locator('h1')).toContainText(study.name);
        // every walkthrough step heading is present
        for (const step of study.steps) {
            await expect(
                page.getByRole('heading', { name: step.title })
            ).toBeVisible();
        }
        // scroll every lazy-loaded step image into view, then assert none are broken
        const images = page.locator('.cs-step-media img');
        for (let i = 0; i < (await images.count()); i++) {
            await images.nth(i).scrollIntoViewIfNeeded();
        }
        await expect
            .poll(() =>
                images.evaluateAll((imgs) =>
                    imgs.filter(
                        (img) =>
                            !(img as HTMLImageElement).complete ||
                            !(img as HTMLImageElement).naturalWidth
                    ).length
                )
            )
            .toBe(0);
    });
}

test('legacy routes redirect to homepage sections', async ({ request }) => {
    const res = await request.get('/projects', { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers()['location']).toContain('/#projects');
});

test('contact API validates input', async ({ request }) => {
    const res = await request.post('/api/contact', {
        data: { name: '', email: 'bad', message: '' },
    });
    expect(res.status()).toBe(400);
});

test('resume PDF and OG image are served', async ({ request }) => {
    const pdf = await request.get('/Timothy-Cisneros-Resume.pdf');
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('pdf');

    const og = await request.get('/api/og?title=Test&subtitle=Testing');
    expect(og.status()).toBe(200);
    expect(og.headers()['content-type']).toContain('image/png');
});
