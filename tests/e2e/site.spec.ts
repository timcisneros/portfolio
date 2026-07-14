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
        '#supporting-work',
        '#skills',
        '#ai',
        '#about',
        '#contact',
    ]) {
        await expect(page.locator(id)).toHaveCount(1);
    }
    await expect(page.locator('.proof-grid')).toContainText('Two promotions');
    await expect(page.locator('.proof-grid')).toContainText('Enterprise delivery');
    await expect(page.locator('.skill-level')).toHaveCount(4);
    const engineeringSourceLinks = page.locator('#ai .ai-card-file');
    await expect(engineeringSourceLinks).toHaveCount(3);
    const engineeringSourceLayout = await engineeringSourceLinks.evaluateAll(
        (links) =>
            links.map((link) => {
                const card = link.closest<HTMLElement>('.ai-card')!;
                const pathLines = Array.from(
                    link.querySelectorAll<HTMLElement>('.ai-card-file-path > span')
                );
                return {
                    fitsCard:
                        link.getBoundingClientRect().right <=
                        card.getBoundingClientRect().right,
                    pathLines: pathLines.map((line) => ({
                        display: getComputedStyle(line).display,
                        whiteSpace: getComputedStyle(line).whiteSpace,
                    })),
                };
            })
    );
    expect(
        engineeringSourceLayout.every(
            ({ fitsCard, pathLines }) =>
                fitsCard &&
                pathLines.length === 2 &&
                pathLines.every(
                    ({ display, whiteSpace }) =>
                        display === 'block' && whiteSpace === 'nowrap'
                )
        )
    ).toBe(true);
    const quietContactLinks = page.locator('#contact .contact-links');
    await expect(quietContactLinks.getByRole('link')).toHaveCount(2);
    await expect(
        quietContactLinks.getByRole('link', { name: 'Email' })
    ).toHaveCount(0);
    await expect(
        quietContactLinks.getByRole('link', { name: 'Resume' })
    ).toHaveCount(0);
    await expect(
        page.locator('.footer').getByRole('link', { name: 'Now' })
    ).toHaveCount(0);
    const sectionOrder = await page.locator('main').evaluate((main) =>
        ['projects', 'experience', 'supporting-work', 'skills'].map((id) =>
            Array.from(main.children).findIndex((child) => child.id === id)
        )
    );
    expect(sectionOrder).toEqual([...sectionOrder].sort((a, b) => a - b));
});

test('now page is a current, reciprocal Open Sauce note', async ({ page }) => {
    await page.goto('/now');
    await expect(
        page.getByRole('heading', { name: "What I'm working on" })
    ).toBeVisible();
    await expect(page.getByText(/Open Sauce July 18–19/)).toBeVisible();
    await expect(page.getByText("I'm not exhibiting")).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Making agent runs/ }))
        .toHaveAttribute('href', '/projects/ticket-system');
    await expect(page.getByRole('link', { name: /Building a private/ }))
        .toHaveAttribute('href', '/projects/my-youtube');
    await expect(page.getByRole('img', { name: 'Tim Cisneros' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Email me' }))
        .toHaveAttribute(
            'href',
            /subject=Open%20Sauce/
        );
    const followUp = page.locator('section[aria-labelledby="if-we-met"]');
    await expect(followUp.getByRole('link', { name: 'GitHub' }))
        .toHaveAttribute('href', 'https://github.com/timcisneros');
    await expect(followUp.getByRole('link', { name: 'LinkedIn' }))
        .toHaveAttribute('href', 'https://www.linkedin.com/in/timcisneros/');
});

test('headline formatting does not shift following words', async ({ page }) => {
    await page.goto('/');
    const metrics = await page.evaluate(() => {
        const fixture = document.createElement('div');
        fixture.className = 'hero';
        fixture.style.cssText =
            'position:absolute;visibility:hidden;left:0;top:0;pointer-events:none';
        fixture.innerHTML = `
            <h1>
                <span class="tw">
                    <em class="tw-line2">
                        <span data-formatted class="tw-word">validate</span><span data-suffix class="tw-word"> records?</span>
                    </em>
                </span>
            </h1>`;
        document.body.append(fixture);
        const formatted = fixture.querySelector<HTMLElement>('[data-formatted]')!;
        const suffix = fixture.querySelector<HTMLElement>('[data-suffix]')!;
        const spacedSuffixWidth = suffix.offsetWidth;
        suffix.textContent = 'records?';
        const compactSuffixWidth = suffix.offsetWidth;
        suffix.textContent = ' records?';
        const variants = ['', 'tw-b', 'tw-i', 'tw-u'].map((kind) => {
            formatted.className = `tw-word ${kind}`.trim();
            const style = getComputedStyle(formatted);
            return {
                kind,
                suffixLeft: suffix.offsetLeft,
                display: style.display,
                whiteSpace: style.whiteSpace,
                fontStyle: style.fontStyle,
                transform: style.transform,
            };
        });
        fixture.remove();
        return { variants, spacedSuffixWidth, compactSuffixWidth };
    });
    expect(metrics.spacedSuffixWidth).toBeGreaterThan(metrics.compactSuffixWidth);
    expect(new Set(metrics.variants.map(({ suffixLeft }) => suffixLeft)).size).toBe(
        1
    );
    expect(
        metrics.variants.every(
            ({ display, whiteSpace }) =>
                display === 'inline-block' && whiteSpace === 'pre'
        )
    ).toBe(true);
    const italic = metrics.variants.find(({ kind }) => kind === 'tw-i');
    expect(italic?.fontStyle).toBe('normal');
    expect(italic?.transform).not.toBe('none');
});

test('hero and headline follow the standard page grid', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
        const contentBounds = (selector: string) => {
            const element = document.querySelector<HTMLElement>(selector)!;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const left = rect.left + parseFloat(style.paddingLeft);
            const right = rect.right - parseFloat(style.paddingRight);
            return { left, right, width: right - left };
        };
        const box = (selector: string) => {
            const rect = document
                .querySelector<HTMLElement>(selector)!
                .getBoundingClientRect();
            return {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                width: rect.width,
            };
        };
        return {
            heroTrack: contentBounds('.container.hero-inner'),
            sectionTrack: contentBounds('#projects > .container'),
            copy: box('.hero-copy'),
            headline: box('.tw'),
            diagram: box('.hero-diagram-deck'),
        };
    });
    const closeTo = (actual: number, expected: number) =>
        expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.5);

    closeTo(metrics.heroTrack.left, metrics.sectionTrack.left);
    closeTo(metrics.heroTrack.right, metrics.sectionTrack.right);
    closeTo(metrics.heroTrack.width, metrics.sectionTrack.width);
    closeTo(metrics.headline.left, metrics.copy.left);
    closeTo(metrics.headline.right, metrics.copy.right);
    expect(metrics.headline.width).toBeLessThan(metrics.heroTrack.width * 0.6);
    expect(metrics.headline.right).toBeLessThan(metrics.diagram.left);
});

test('outgoing diagram card remains mounted as the rear card', async ({
    page,
}) => {
    await page.addInitScript(() => {
        (window as Window & { __heroDiagramImmediate?: boolean }).__heroDiagramImmediate =
            true;
    });
    await page.goto('/');
    const outgoing = page.locator('.hero-diagram--resting-next');
    const outgoingName = await outgoing.locator('h2').textContent();
    await outgoing.evaluate((element) => {
        (element as HTMLElement).dataset.transitionIdentity = 'outgoing-card';
    });

    const preserved = page.locator('[data-transition-identity="outgoing-card"]');
    await expect
        .poll(async () => {
            const className = (await preserved.getAttribute('class')) ?? '';
            if (className.includes('hero-diagram--resting-next')) {
                await preserved
                    .getByRole('button', { name: 'Show next project card' })
                    .click();
            }
            return (await preserved.getAttribute('class'))?.includes(
                'hero-diagram--resting-next'
            );
        })
        .toBe(false);

    await expect(preserved).toHaveClass(/hero-diagram--behind-next/);
    await expect(preserved.locator('h2')).toHaveText(outgoingName ?? '');
    await expect(preserved).toHaveCSS('z-index', '4');
    await expect(preserved).toHaveCSS('opacity', '1');
    await expect(page.locator('.hero-diagram--leaving-next')).toHaveCount(0);

    const secondOutgoing = page.locator('.hero-diagram--resting-next');
    await secondOutgoing.evaluate((element) => {
        (element as HTMLElement).dataset.transitionIdentity = 'second-outgoing';
    });
    const secondPreserved = page.locator(
        '[data-transition-identity="second-outgoing"]'
    );
    await expect
        .poll(async () => {
            const className = (await secondPreserved.getAttribute('class')) ?? '';
            if (className.includes('hero-diagram--resting-next')) {
                await secondPreserved
                    .getByRole('button', { name: 'Show next project card' })
                    .click();
            }
            return (await secondPreserved.getAttribute('class'))?.includes(
                'hero-diagram--leaving-next'
            );
        })
        .toBe(true);
    await secondPreserved.evaluate((element) => {
        element
            .getAnimations({ subtree: false })
            .forEach((animation) => animation.pause());
    });
    await expect(page.locator('.hero-diagram-deck')).toHaveClass(
        /is-transitioning/
    );
    const transitionFlowStates = await page
        .locator('.hero-diagram-deck .hd-flow-group')
        .evaluateAll((elements) =>
            elements.map(
                (element) => getComputedStyle(element).animationPlayState
            )
        );
    expect(transitionFlowStates.length).toBeGreaterThan(0);
    expect(new Set(transitionFlowStates)).toEqual(new Set(['paused']));
    await expect(preserved).toHaveClass(/hero-diagram--behind-next/);
    await expect(secondPreserved).toHaveClass(/hero-diagram--leaving-next/);
    await secondPreserved.evaluate((element) => {
        element
            .getAnimations({ subtree: false })
            .forEach((animation) => animation.play());
    });
    await expect(secondPreserved).toHaveClass(/hero-diagram--behind-next/);
    await expect(page.locator('.hero-diagram-deck')).not.toHaveClass(
        /is-transitioning/
    );
    await expect(
        page.locator('.hero-diagram--resting-next .hd-flow-group')
    ).toHaveCSS('animation-play-state', 'running');
    await expect(preserved).toHaveCount(0);
});

test('mobile diagram cards remain inside the hero throughout a flip', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
        (window as Window & { __heroDiagramImmediate?: boolean }).__heroDiagramImmediate =
            true;
    });
    await page.goto('/');
    const button = page.getByRole('button', {
        name: 'Show next project card',
    });
    await expect
        .poll(async () => {
            if (await page.locator('.hero-diagram--leaving-next').count()) {
                return true;
            }
            await button.click();
            return Boolean(
                await page.locator('.hero-diagram--leaving-next').count()
            );
        })
        .toBe(true);

    for (const time of [0, 80, 120, 152, 200, 240, 280, 308, 312, 399]) {
        const bounds = await page.evaluate((currentTime) => {
            const hero = document.querySelector<HTMLElement>('.hero')!;
            for (const card of document.querySelectorAll<HTMLElement>(
                '.hero-diagram'
            )) {
                for (const animation of card.getAnimations({ subtree: false })) {
                    animation.pause();
                    animation.currentTime = currentTime;
                }
            }
            const heroRect = hero.getBoundingClientRect();
            const elements = [
                ...document.querySelectorAll<HTMLElement>(
                    '.hero-diagram, .hero-card-sheet'
                ),
            ];
            return elements.map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                    className: element.className,
                    left: rect.left,
                    right: rect.right,
                    heroLeft: heroRect.left,
                    heroRight: heroRect.right,
                };
            });
        }, time);
        for (const bound of bounds) {
            expect(
                bound.left,
                `${bound.className} crossed the left edge at ${time}ms`
            ).toBeGreaterThanOrEqual(bound.heroLeft - 0.5);
            expect(
                bound.right,
                `${bound.className} crossed the right edge at ${time}ms`
            ).toBeLessThanOrEqual(bound.heroRight + 0.5);
        }
    }
});

test('headline follows a deterministic, non-overflowing animation trajectory', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
        let seed = 0x5eed1234;
        Math.random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 0x100000000;
        };
        (window as Window & { __headlineTestSpeed?: number }).__headlineTestSpeed =
            0.006;
    });
    await page.goto('/');
    const animatedHeadline = page.locator('.tw[data-telemetry]');
    await expect(animatedHeadline).toBeVisible();
    await animatedHeadline.evaluate((element) => {
        const root = element as HTMLElement;
        const states = new Set<string>();
        let overflowed = false;
        const sample = () => {
            const line1 = root.querySelector<HTMLElement>('.tw-line1');
            const line2 = root.querySelector<HTMLElement>('.tw-line2');
            if (root.dataset.telemetry) {
                states.add(`${root.dataset.line1}\n${root.dataset.line2}`);
                const completedOverflow = Boolean(
                    (line1 && line1.scrollWidth > line1.clientWidth + 1) ||
                        (line2 && line2.scrollWidth > line2.clientWidth + 1)
                );
                if (!overflowed && completedOverflow) {
                    root.dataset.testOverflowState = `${root.dataset.line1}\n${root.dataset.line2}`;
                }
                overflowed ||= completedOverflow;
            }
            root.dataset.testStates = JSON.stringify([...states]);
            root.dataset.testOverflowed = String(overflowed);
        };
        sample();
        new MutationObserver(sample).observe(root, {
            attributes: true,
            attributeFilter: ['data-telemetry'],
        });

        let invalidVisual = false;
        let invalidReason = '';
        let previousFormat = root.dataset.format ?? '';
        let lastVisibleSelectionAt = 0;
        const fail = (reason: string) => {
            if (!invalidVisual) invalidReason = reason;
            invalidVisual = true;
        };
        const isBoundary = (text: string, position: number) => {
            const segmenter = new Intl.Segmenter(undefined, {
                granularity: 'grapheme',
            });
            const boundaries = new Set([
                ...Array.from(segmenter.segment(text), ({ index }) => index),
                text.length,
            ]);
            return boundaries.has(position);
        };
        const sampleInvariant = () => {
            const line1Text = root.dataset.line1 ?? '';
            const line2Text = root.dataset.line2 ?? '';
            if (root.dataset.selection) lastVisibleSelectionAt = performance.now();
            const currentFormat = root.dataset.format ?? '';
            if (
                previousFormat &&
                !currentFormat &&
                performance.now() - lastVisibleSelectionAt > 500
            ) {
                fail('format-cleared-without-selection');
            }
            previousFormat = currentFormat;
            if (`${line1Text}${line2Text}`.includes('\uFFFD')) {
                fail('replacement-glyph');
            }
            const [caretLine, caretPosition] = (root.dataset.caret ?? '1:0')
                .split(':')
                .map(Number);
            const caretText = caretLine === 1 ? line1Text : line2Text;
            if (!isBoundary(caretText, caretPosition)) fail('caret-split-grapheme');

            for (const attribute of ['selection', 'format'] as const) {
                const raw = root.dataset[attribute];
                if (!raw) continue;
                const range = JSON.parse(raw) as {
                    line: 1 | 2;
                    start: number;
                    end: number;
                };
                const text = range.line === 1 ? line1Text : line2Text;
                if (
                    range.start < 0 ||
                    range.end < range.start ||
                    range.end > text.length ||
                    !isBoundary(text, range.start) ||
                    !isBoundary(text, range.end)
                ) {
                    fail(`${attribute}-invalid-range`);
                }
                if (attribute === 'format' && range.end > range.start) {
                    const formatted = text.slice(range.start, range.end);
                    if (
                        !/[a-z0-9]/i.test(formatted[0]) ||
                        !/[a-z0-9]/i.test(formatted.at(-1)!)
                    ) {
                        if (!invalidVisual) {
                            root.dataset.testInvalidState = JSON.stringify({
                                line1: line1Text,
                                line2: line2Text,
                                format: range,
                                formatted,
                            });
                        }
                        fail('format-leaked');
                    }
                    if (
                        /[a-z0-9]/i.test(text[range.start - 1] ?? '') ||
                        /[a-z0-9]/i.test(text[range.end] ?? '')
                    ) {
                        if (!invalidVisual) {
                            root.dataset.testInvalidState = JSON.stringify({
                                line1: line1Text,
                                line2: line2Text,
                                format: range,
                                formatted,
                            });
                        }
                        fail('format-split-word');
                    }
                }
            }
            root.dataset.testInvalidVisual = String(invalidVisual);
            root.dataset.testInvalidReason = invalidReason;
        };
        sampleInvariant();
        new MutationObserver(sampleInvariant).observe(root, {
            attributes: true,
            attributeFilter: [
                'data-line1',
                'data-line2',
                'data-caret',
                'data-selection',
                'data-format',
            ],
            childList: true,
            subtree: true,
        });
    });

    await expect
        .poll(
            async () => {
                const raw = await animatedHeadline.getAttribute('data-test-states');
                const states: string[] = raw ? JSON.parse(raw) : [];
                const telemetryRaw = await page
                    .locator('.tw[data-telemetry]')
                    .getAttribute('data-telemetry');
                const telemetry = telemetryRaw
                    ? (JSON.parse(telemetryRaw) as { states?: number })
                    : {};
                return {
                    enoughStates:
                        states.length > 5 && (telemetry.states ?? 0) > 15,
                    hasQuestion: states.some(
                        (state) =>
                            state.startsWith('Could ') ||
                            state.startsWith('How could ') ||
                            state.startsWith('How might ') ||
                            state.startsWith('Where could ')
                    ),
                    hasStatement: states.some((state) =>
                        /\b(that|can|could)\n/.test(state)
                    ),
                    hasPhrase: states.some(
                        (state) =>
                            !/\b(that|can|could)\n/.test(state) &&
                            !/^(Could|How could|How might|Where could) /.test(state)
                    ),
                };
            },
            { timeout: 10000 }
        )
        .toEqual({
            enoughStates: true,
            hasQuestion: true,
            hasStatement: true,
            hasPhrase: true,
        });

    const states = JSON.parse(
        (await animatedHeadline.getAttribute('data-test-states')) ?? '[]'
    ) as string[];
    expect(states.length).toBeGreaterThan(5);
    await expect(animatedHeadline).toHaveAttribute(
        'data-test-overflowed',
        'false'
    );
    await expect(animatedHeadline).toHaveAttribute(
        'data-test-invalid-visual',
        'false'
    );
    const telemetry = JSON.parse(
        (await animatedHeadline.getAttribute('data-telemetry')) ?? '{}'
    ) as {
        states: number;
        modes: { stmt: number; q: number; phrase: number };
        families: Record<string, number>;
        edits: Record<string, number>;
    };
    expect(telemetry.states).toBeGreaterThan(5);
    expect(telemetry.modes.stmt).toBeGreaterThan(0);
    expect(telemetry.modes.q).toBeGreaterThan(0);
    expect(telemetry.modes.phrase).toBeGreaterThan(0);
    expect(Object.keys(telemetry.families).length).toBeGreaterThan(2);
    expect(Object.keys(telemetry.edits).length).toBeGreaterThan(2);
    expect(telemetry.edits['runtime:recovery'] ?? 0).toBe(0);
    const behaviorFamilies = Object.entries(telemetry.edits).reduce<
        Record<string, number>
    >((counts, [behavior, count]) => {
        const family = behavior.includes(':')
            ? behavior.slice(0, behavior.indexOf(':'))
            : 'strategy';
        counts[family] = (counts[family] ?? 0) + count;
        return counts;
    }, {});
    const behaviorTotal = Object.values(behaviorFamilies).reduce(
        (sum, count) => sum + count,
        0
    );
    const dominantShare =
        Math.max(...Object.values(behaviorFamilies)) / behaviorTotal;
    expect(Object.keys(behaviorFamilies).length).toBeGreaterThan(3);
    expect(dominantShare).toBeLessThanOrEqual(0.75);

    const toggle = page.getByRole('button', {
        name: 'Pause headline animation',
    });
    await toggle.click();
    const pausedState = await animatedHeadline.evaluate((element) => [
        element.getAttribute('data-line1'),
        element.getAttribute('data-line2'),
    ]);
    await page.waitForTimeout(200);
    await expect(animatedHeadline).toHaveAttribute(
        'data-line1',
        pausedState[0] ?? ''
    );
    await expect(animatedHeadline).toHaveAttribute(
        'data-line2',
        pausedState[1] ?? ''
    );
    await page.getByRole('button', { name: 'Resume headline animation' }).click();
    await expect
        .poll(async () =>
            animatedHeadline.evaluate((element) => [
                element.getAttribute('data-line1'),
                element.getAttribute('data-line2'),
            ])
        )
        .not.toEqual(pausedState);
});

test('long keycap legends stay inside their SVG and narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/projects/dsdebug');
    const button = page.getByRole('link', { name: 'View source on GitHub' });
    await expect(button).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const geometry = await button.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const fallback = element.querySelector<HTMLElement>('.keycap-fallback-content');
        const svg = element.querySelector<SVGSVGElement>('.keycap-fallback-svg');
        return {
            left: bounds.left,
            right: bounds.right,
            viewport: window.innerWidth,
            fallbackClientWidth: fallback?.clientWidth ?? 0,
            fallbackScrollWidth: fallback?.scrollWidth ?? 0,
            svgWidth: svg?.getBoundingClientRect().width ?? 0,
        };
    });

    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.fallbackScrollWidth).toBeLessThanOrEqual(geometry.fallbackClientWidth + 1);
    expect(geometry.svgWidth).toBeGreaterThanOrEqual(geometry.fallbackScrollWidth);
});

test('featured project links to its walkthrough', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/');
    const featuredLinks = page
        .locator('.featured')
        .first()
        .locator('.project-links');
    await expect(featuredLinks).toHaveCSS('flex-wrap', 'wrap');
    const featuredLinkStyles = await featuredLinks
        .locator('.project-link')
        .evaluateAll((links) =>
            links.map((link) => getComputedStyle(link).whiteSpace)
        );
    expect(new Set(featuredLinkStyles)).toEqual(new Set(['nowrap']));
    await page.getByRole('link', { name: /read the walkthrough/i }).first().click();
    await expect(page).toHaveURL(/\/projects\/dsdebug/);
    await expect(page.locator('h1')).toContainText('DSDebug');
    await expect(page.locator('.cs-step').first()).toHaveCSS(
        'border-top-width',
        '0px'
    );
    await expect(page.locator('.cs-step').nth(1)).toHaveCSS(
        'border-top-width',
        '1px'
    );
    const caseStudyLinks = page.locator('.cs-hero .project-links');
    await expect(caseStudyLinks).toHaveCSS('flex-wrap', 'wrap');
    const caseStudyLinkStyles = await caseStudyLinks
        .locator('.project-link')
        .evaluateAll((links) =>
            links.map((link) => getComputedStyle(link).whiteSpace)
        );
    expect(new Set(caseStudyLinkStyles)).toEqual(new Set(['nowrap']));
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
            .poll(
                () =>
                    images.evaluateAll((imgs) =>
                        imgs.filter(
                            (img) =>
                                !(img as HTMLImageElement).complete ||
                                !(img as HTMLImageElement).naturalWidth
                        ).length
                    ),
                { timeout: 15_000 }
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
    for (const path of [
        '/Timothy-Cisneros-Resume.pdf',
        '/Timothy-Cisneros-Resume-Full-Stack.pdf',
        '/Timothy-Cisneros-Resume-Applied-AI.pdf',
    ]) {
        const pdf = await request.get(path);
        expect(pdf.status()).toBe(200);
        expect(pdf.headers()['content-type']).toContain('pdf');
    }

    const og = await request.get('/api/og?title=Test&subtitle=Testing');
    expect(og.status()).toBe(200);
    expect(og.headers()['content-type']).toContain('image/png');
});
