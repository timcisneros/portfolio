import { expect, test, type Page } from '@playwright/test';

const compositorSelector =
    'canvas.keycap-webgpu-compositor[data-render-backend]';

async function expectSettledFrame(page: Page) {
    await expect
        .poll(() =>
            page.locator(compositorSelector).evaluate((canvas) => {
                const element = canvas as HTMLElement;
                const scene = Number(element.dataset.sceneVersion);
                const frame = Number(element.dataset.frameVersion);
                return Number.isInteger(scene) && scene >= 0 && frame === scene;
            })
        )
        .toBe(true);
}

test('keycap compositor stays coherent through reference angles and rapid orbit', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('console', (message) => {
        if (
            message.type() === 'error' &&
            !message.text().startsWith('Failed to load resource:')
        ) {
            errors.push(message.text());
        }
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await expect(page.locator(compositorSelector)).toHaveCount(1);
    await expect(page.locator('[data-keycap-instance]')).toHaveCount(5);
    await expect(page.locator('.keycap-heightfield-svg')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-keycap-legends', 'ready');
    await expectSettledFrame(page);

    const hero = page.locator('.hero-actions');
    await page.screenshot({ path: '/tmp/keycap-compositor-default.png' });
    await hero.screenshot({ path: '/tmp/keycap-compositor-default-detail.png' });

    const box = await page.locator('.camera-trackball').boundingBox();
    if (!box) throw new Error('camera trackball was not laid out');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const controlRadius = Math.min(box.width, box.height) / 2 - 14;

    // Previously reported topology regression: surfaces disappeared while
    // azimuth crossed zero. The single compositor must produce a complete,
    // settled frame at this exact inspection angle.
    await page.mouse.move(
        cx + (-0.7 / 55) * controlRadius,
        cy + ((52 - 47.6) / 36) * controlRadius
    );
    await page.mouse.down();
    await page.mouse.up();
    await expect(page.locator('.camera-readout dd').nth(0)).toHaveText('47.6°');
    await expect(page.locator('.camera-readout dd').nth(1)).toHaveText('-0.7°');
    await expectSettledFrame(page);
    await page.screenshot({ path: '/tmp/keycap-47.6--0.7-9.00.png' });

    // Low-angle material/geometry regression supplied during visual audit.
    await page.mouse.move(
        cx + (15.6 / 55) * controlRadius,
        cy + ((52 - 17.5) / 36) * controlRadius
    );
    await page.mouse.down();
    await page.mouse.up();
    await expect(page.locator('.camera-readout dd').nth(0)).toHaveText('17.5°');
    await expect(page.locator('.camera-readout dd').nth(1)).toHaveText('15.6°');
    await expectSettledFrame(page);
    await page.screenshot({ path: '/tmp/keycap-compositor-17.5-15.6.png' });
    await hero.screenshot({ path: '/tmp/keycap-compositor-17.5-15.6-detail.png' });

    const initialScene = Number(
        await page
            .locator(compositorSelector)
            .getAttribute('data-scene-version')
    );
    const radius = Math.min(box.width, box.height) * 0.34;
    await page.mouse.move(cx + radius, cy);
    await page.mouse.down();
    for (let step = 0; step <= 36; step += 1) {
        const angle = (step / 36) * Math.PI * 2;
        await page.mouse.move(
            cx + Math.cos(angle) * radius,
            cy + Math.sin(angle) * radius
        );
    }
    await page.mouse.move(cx - radius * 0.55, cy + radius * 0.66, {
        steps: 16,
    });
    await page.mouse.up();

    await expect
        .poll(() =>
            page.locator(compositorSelector).evaluate((canvas) =>
                Number((canvas as HTMLElement).dataset.sceneVersion)
            )
        )
        .toBeGreaterThan(initialScene);
    await expectSettledFrame(page);
    await expect(page.locator(compositorSelector)).toHaveCount(1);
    await expect(hero).toBeVisible();
    await page.screenshot({ path: '/tmp/keycap-compositor-orbit.png' });
    expect(errors).toEqual([]);
});

test('continuous compositor preserves a full-width CSS control', async ({
    page,
}) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto('/');
    await expect(page.locator(compositorSelector)).toHaveCount(1);
    await expect(page.locator('.keycap-heightfield-svg')).toHaveCount(0);

    const form = page.locator('.contact-form');
    const submit = form.getByRole('button', { name: 'Send' });
    const instance = submit.locator('[data-keycap-instance]');
    await submit.scrollIntoViewIfNeeded();

    const [formBox, submitBox, instanceBox] = await Promise.all([
        form.boundingBox(),
        submit.boundingBox(),
        instance.boundingBox(),
    ]);
    expect(formBox).not.toBeNull();
    expect(submitBox).not.toBeNull();
    expect(instanceBox).not.toBeNull();
    expect(Math.abs(submitBox!.width - formBox!.width)).toBeLessThan(1);
    expect(Math.abs(instanceBox!.width - submitBox!.width)).toBeLessThan(1);
    await expectSettledFrame(page);
    await page.screenshot({
        path: '/tmp/keycap-compositor-full-width.png',
    });
});
