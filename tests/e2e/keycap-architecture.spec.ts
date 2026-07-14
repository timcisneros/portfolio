import { expect, test, type Locator, type Page } from '@playwright/test';

const compositorSelector =
    'canvas.keycap-webgpu-compositor[data-render-backend]';

async function waitForSettledScene(page: Page) {
    await expect
        .poll(
            () =>
                page.locator(compositorSelector).evaluate((canvas) => ({
                    scene: Number((canvas as HTMLElement).dataset.sceneVersion),
                    frame: Number((canvas as HTMLElement).dataset.frameVersion),
                })),
            { message: 'the presented frame should catch up to the scene', timeout: 20_000 }
        )
        .toEqual(
            expect.objectContaining({
                scene: expect.any(Number),
                frame: expect.any(Number),
            })
        );

    await expect
        .poll(
            () =>
                page.locator(compositorSelector).evaluate((canvas) => {
                    const element = canvas as HTMLElement;
                    const scene = Number(element.dataset.sceneVersion);
                    const frame = Number(element.dataset.frameVersion);
                    return Number.isInteger(scene) && scene >= 0 && frame === scene;
                }),
            { timeout: 20_000 }
        )
        .toBe(true);
}

async function box(locator: Locator) {
    const bounds = await locator.boundingBox();
    expect(bounds).not.toBeNull();
    return bounds!;
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-keycap-instance]')).not.toHaveCount(0);
});

test('uses one shared compositor and removes the layered SVG renderer', async ({
    page,
}) => {
    const compositor = page.locator(compositorSelector);

    await expect(compositor).toHaveCount(1);
    await expect(compositor).toHaveAttribute(
        'data-render-backend',
        /^(webgpu-analytic|software-analytic|dom-fallback)$/
    );
    await expect
        .poll(() => compositor.getAttribute('data-renderer-state'))
        .toMatch(/^(ready|unsupported|lost)$/);
    if (process.env.WEBGPU_TEST === '1') {
        const state = await compositor.evaluate((canvas) => ({
            backend: (canvas as HTMLElement).dataset.renderBackend,
            reason: (canvas as HTMLElement).dataset.rendererReason,
        }));
        expect(state.backend, state.reason).toBe('webgpu-analytic');
        await expect(page.locator('html')).toHaveAttribute('data-keycap-legends', 'ready');
        await expect(compositor).toHaveAttribute('data-legend-atlas', '2048x768');
        await expect
            .poll(async () => Number(await compositor.getAttribute('data-legend-instances')))
            .toBeGreaterThan(0);
    }
    await expect(page.locator('.keycap-heightfield-svg')).toHaveCount(0);
    await expect(page.locator('canvas.keycap-gpu-canvas')).toHaveCount(0);

    const presentation = await compositor.evaluate((canvas) => {
        const element = canvas as HTMLCanvasElement;
        const style = getComputedStyle(element);
        return {
            pointerEvents: style.pointerEvents,
            cssWidth: element.getBoundingClientRect().width,
            cssHeight: element.getBoundingClientRect().height,
            pixelWidth: element.width,
            pixelHeight: element.height,
        };
    });
    expect(presentation.pointerEvents).toBe('none');
    const softwareWorker = await compositor.getAttribute('data-software-thread') === 'worker';
    if (softwareWorker) {
        const tiles = page.locator('.keycap-software-tile');
        await expect(tiles).not.toHaveCount(0);
        const tileBounds = await box(tiles.first());
        expect(tileBounds.width).toBeGreaterThan(0);
        expect(tileBounds.height).toBeGreaterThan(0);
    } else {
        expect(presentation.cssWidth).toBeGreaterThan(0);
        expect(presentation.cssHeight).toBeGreaterThan(0);
    }
    expect(presentation.pixelWidth).toBeGreaterThan(0);
    expect(presentation.pixelHeight).toBeGreaterThan(0);

    const backend = await compositor.getAttribute('data-render-backend');
    if (backend?.endsWith('-analytic')) {
        await expect(compositor).toHaveAttribute('data-render-presented', 'true');
        await waitForSettledScene(page);
    } else {
        const fallback = await page.locator('.hero-actions .btn').first().evaluate((button) => {
            const style = getComputedStyle(button);
            const label = button.querySelector<HTMLElement>('.btn-cap');
            return {
                borderImage: style.borderImageSource,
                labelColor: label ? getComputedStyle(label).color : '',
            };
        });
        expect(fallback.borderImage).not.toBe('none');
        expect(fallback.labelColor).not.toBe('rgba(0, 0, 0, 0)');
    }
    await page.screenshot({ path: '/tmp/keycap-default-browser.png' });
});

test('falls through to the custom software renderer when WebGPU initialization fails', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'gpu', {
            configurable: true,
            value: {
                requestAdapter: async () => { throw new Error('intentional adapter failure'); },
                getPreferredCanvasFormat: () => 'bgra8unorm',
            },
        });
    });
    await page.reload();
    const compositor = page.locator(compositorSelector);
    await expect(compositor).toHaveAttribute('data-render-backend', 'software-analytic');
    await expect(compositor).toHaveAttribute('data-renderer-state', 'ready');
    await expect(compositor).toHaveAttribute('data-webgpu-failure', /intentional adapter failure/);
    await waitForSettledScene(page);
    await expect(page.locator('html')).toHaveAttribute('data-keycap-renderer', 'webgpu');
});

test('keeps intrinsic controls content-sized and the submit control full-width', async ({
    page,
}) => {
    const heroActions = page.locator('.hero-actions');
    const heroButtons = heroActions.locator('.btn');
    await expect(heroButtons).toHaveCount(3);

    const actionBounds = await box(heroActions);
    const heroMetrics = await heroButtons.evaluateAll((buttons) =>
        buttons.map((button) => {
            const host = button as HTMLElement;
            const label = host.querySelector<HTMLElement>('.btn-cap');
            const instance = host.querySelector<HTMLElement>(
                '[data-keycap-instance]'
            );
            return {
                hostWidth: host.getBoundingClientRect().width,
                labelWidth: label?.getBoundingClientRect().width ?? 0,
                instanceWidth: instance?.getBoundingClientRect().width ?? 0,
            };
        })
    );

    for (const metric of heroMetrics) {
        expect(metric.hostWidth).toBeLessThan(actionBounds.width);
        expect(metric.hostWidth).toBeGreaterThanOrEqual(metric.labelWidth);
        expect(Math.abs(metric.instanceWidth - metric.hostWidth)).toBeLessThan(1);
    }

    const form = page.locator('.contact-form');
    const submit = form.getByRole('button', { name: 'Send' });
    const submitInstance = submit.locator('[data-keycap-instance]');
    const [formBounds, submitBounds, instanceBounds] = await Promise.all([
        box(form),
        box(submit),
        box(submitInstance),
    ]);

    expect(Math.abs(submitBounds.width - formBounds.width)).toBeLessThan(1);
    expect(Math.abs(instanceBounds.width - submitBounds.width)).toBeLessThan(1);
});

test('recompiles live CSS text requirements into the physical surface', async ({ page }) => {
    const button = page.locator('.hero-actions .btn').first();
    await expect(button).toHaveAttribute('data-keycap-text-contract', 'exact');
    await expect(button).not.toHaveAttribute('data-keycap-text-issues', /.+/);

    const compositor = page.locator(compositorSelector);
    const before = Number(await compositor.getAttribute('data-scene-version'));
    const assetBefore = await button.locator('.keycap-content-image').getAttribute('data-keycap-asset-key');

    await button.evaluate((element) => {
        element.setAttribute('style', '--cap-top: rgb(30, 90, 140); --keycap-roughness: 0.62; --keycap-ambient: 0.11');
        const label = element.querySelector('.btn-cap') as HTMLElement;
        label.style.letterSpacing = '0.12em';
        label.style.color = 'rgb(245, 230, 110)';
    });
    await expect(button).toHaveAttribute('data-keycap-text-contract', 'exact');
    await expect(button).toHaveAttribute('data-keycap-material-contract', 'exact');
    await expect.poll(() => button.locator('.keycap-content-image').getAttribute('data-keycap-asset-key'))
        .not.toBe(assetBefore);
    await expect.poll(() => compositor.evaluate((element) => Number((element as HTMLElement).dataset.sceneVersion)))
        .toBeGreaterThan(before);
});

test('keeps a stable native SVG legend alongside the fingerprinted render asset', async ({ page }) => {
    const buttons = page.locator('.btn');
    await expect(buttons.first()).toHaveAttribute('data-keycap-text-contract', 'exact');
    const assets = await buttons.evaluateAll((elements) => elements.map((element) => {
        const image = element.querySelector<SVGImageElement>('.keycap-content-image');
        return {
            key: image?.dataset.keycapAssetKey,
            url: image?.dataset.keycapAssetUrl,
            href: image?.getAttribute('href'),
            font: image?.dataset.keycapFontFingerprint,
            sourceTextNodes: element.querySelectorAll('.keycap-content-svg text').length,
            fallbackTextNodes: element.querySelectorAll('.keycap-fallback-content > span').length,
            imageOpacity: image ? getComputedStyle(image).opacity : null,
        };
    }));
    for (const asset of assets) {
        expect(asset.key).toMatch(/^[a-f0-9]{64}$/);
        expect(asset.font).toMatch(/^[a-f0-9]{64}$/);
        expect(asset.url).toBe(asset.href);
        expect(asset.url).toMatch(/^blob:/);
        expect(asset.sourceTextNodes).toBe(1);
        expect(asset.fallbackTextNodes).toBe(1);
        expect(asset.imageOpacity).toBe('0');
    }
});

test('rapid camera motion is committed as one shared scene frame', async ({
    page,
}) => {
    const compositor = page.locator(compositorSelector);
    await expect
        .poll(() => compositor.getAttribute('data-renderer-state'))
        .toMatch(/^(ready|unsupported|lost)$/);
    const backend = await compositor.getAttribute('data-render-backend');
    test.skip(!backend?.endsWith('-analytic'), 'mesh camera requires an active analytic renderer');
    await waitForSettledScene(page);
    const initialScene = Number(
        await compositor.getAttribute('data-scene-version')
    );
    expect(Number.isInteger(initialScene)).toBe(true);

    const trackball = page.locator('.camera-trackball');
    const bounds = await box(trackball);
    const center = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
    };
    const radius = Math.min(bounds.width, bounds.height) * 0.38;

    await page.mouse.move(center.x + radius, center.y);
    await page.mouse.down();
    for (let step = 0; step < 36; step += 1) {
        const angle = (step / 36) * Math.PI * 4;
        await page.mouse.move(
            center.x + Math.cos(angle) * radius,
            center.y + Math.sin(angle) * radius,
            { steps: 1 }
        );
    }
    await page.mouse.up();

    await expect
        .poll(() =>
            compositor.evaluate((canvas) =>
                Number((canvas as HTMLElement).dataset.sceneVersion)
            )
        )
        .toBeGreaterThan(initialScene);
    await waitForSettledScene(page);
    const finalFrameBudget = backend === 'webgpu-analytic'
        ? (process.env.DEV_TEST === '1' ? 33.34 : 16.67)
        // The software path is a full-document, full-resolution reference
        // renderer used when headless CI exposes no GPU. Its contract is an
        // atomic final frame; interactive latency belongs to the WebGPU path.
        : 5_000;
    await expect
        .poll(async () => Number(await compositor.getAttribute('data-gpu-frame-ms')))
        .toBeLessThan(finalFrameBudget);

    // One compositor and one final scene version are the synchronization
    // boundary for every keycap; independent per-keycap presentation surfaces
    // would allow objects to display different camera revisions.
    await expect(page.locator(compositorSelector)).toHaveCount(1);
    const instanceVersions = await page
        .locator('[data-keycap-instance]')
        .evaluateAll((instances) =>
            instances
                .map((instance) => (instance as HTMLElement).dataset.sceneVersion)
                .filter((version): version is string => Boolean(version))
        );
    expect(new Set(instanceVersions).size).toBeLessThanOrEqual(1);
});

test('camera control remains fixed, visible, and inside a compact viewport', async ({
    page,
}) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    const control = page.getByRole('complementary', {
        name: 'Button camera controls',
    });
    await expect(control).toBeVisible();
    const metrics = await control.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
            left: bounds.left,
            top: bounds.top,
            right: bounds.right,
            bottom: bounds.bottom,
            position: style.position,
            zIndex: Number(style.zIndex),
        };
    });
    expect(metrics.position).toBe('fixed');
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.top).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(320);
    expect(metrics.bottom).toBeLessThanOrEqual(568);
    expect(metrics.zIndex).toBeGreaterThan(40);
});

test('software backend orbits the rendered mesh rather than the CSS fallback', async ({ page }) => {
    await page.goto('/?keycap-renderer=software');
    const compositor = page.locator(compositorSelector);
    await expect(compositor).toHaveAttribute('data-render-backend', 'software-analytic');
    await expect(compositor).toHaveAttribute('data-software-thread', 'worker');
    await expect.poll(async () => Number(await compositor.getAttribute('data-software-tiles'))).toBeGreaterThan(0);
    const tiles = page.locator('.keycap-software-tile');
    await expect(tiles.first()).toHaveCSS('position', 'absolute');
    const tileMetrics = await tiles.evaluateAll((elements) => elements.map((element) => ({
        height: element.getBoundingClientRect().height,
        top: Number.parseFloat((element as HTMLElement).style.top),
    })));
    expect(tileMetrics.every((tile) => tile.height <= 1024 && tile.top % 1024 === 0)).toBe(true);
    const tileCountBeforeLongPage = tileMetrics.length;
    await page.evaluate(() => {
        const spacer = document.createElement('div');
        spacer.id = 'keycap-long-page-probe';
        spacer.style.height = '100000px';
        document.body.appendChild(spacer);
    });
    await page.waitForTimeout(100);
    await expect(tiles).toHaveCount(tileCountBeforeLongPage);
    await page.evaluate(() => document.getElementById('keycap-long-page-probe')?.remove());
    await expect(compositor).toHaveAttribute('data-render-presented', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-keycap-renderer', 'webgpu');
    await expect(page.locator('.camera-readout')).toContainText('Software analytic');
    const paintOwners = await page.locator('.btn').evaluateAll((buttons) => buttons.map((button) => {
        const style = getComputedStyle(button);
        const before = getComputedStyle(button, '::before');
        const after = getComputedStyle(button, '::after');
        return {
            borderImage: style.borderImageSource,
            backgroundImage: style.backgroundImage,
            boxShadow: style.boxShadow,
            before: before.content,
            after: after.content,
        };
    }));
    for (const owner of paintOwners) {
        expect(owner.borderImage).toBe('none');
        expect(owner.backgroundImage).toBe('none');
        expect(owner.boxShadow).toBe('none');
        expect(owner.before).toBe('none');
        expect(owner.after).toBe('none');
    }
    const before = Number(await compositor.getAttribute('data-scene-version'));
    const trackball = page.locator('.camera-trackball');
    const bounds = await box(trackball);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.78, bounds.y + bounds.height * 0.28, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => compositor.evaluate((element) => Number((element as HTMLElement).dataset.sceneVersion))).toBeGreaterThan(before);
    await waitForSettledScene(page);
    const sceneBeforeScroll = Number(await compositor.getAttribute('data-scene-version'));
    await page.evaluate(async () => {
        for (let step = 1; step <= 30; step += 1) {
            window.scrollTo(0, step * 20);
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
    });
    expect(Number(await compositor.getAttribute('data-scene-version'))).toBe(sceneBeforeScroll);
    await expect(compositor).not.toHaveAttribute('style', /transform/);
    await page.screenshot({ path: '/tmp/keycap-software-mesh.png' });
});
