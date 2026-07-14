import { expect, test } from "@playwright/test";

test("homepage stays within runtime stability budgets", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { cls: 0, longestTask: 0, longestTaskStart: 0 };
    (window as Window & { __performanceBudget?: typeof metrics }).__performanceBudget = metrics;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
        if (!entry.hadRecentInput) metrics.cls += entry.value ?? 0;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > metrics.longestTask) {
          metrics.longestTask = entry.duration;
          metrics.longestTaskStart = entry.startTime;
        }
      }
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto("/");
  await page.waitForTimeout(2200);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.locator(".btn-coral .keycap-fallback-content")).toBeVisible();
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() =>
    (window as Window & { __performanceBudget?: { cls: number; longestTask: number; longestTaskStart: number } }).__performanceBudget,
  );
  console.log("performance metrics", metrics);
  expect(metrics).toBeDefined();
  expect(metrics!.cls).toBeLessThanOrEqual(0.1);
  /* Cold React/Next hydration on the CI browser measures 270-330ms. This
     ceiling leaves narrow variance headroom while still catching added
     renderer/animation startup work. */
  expect(metrics!.longestTask).toBeLessThanOrEqual(350);

  const externalFonts = await page.evaluate(() =>
    performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => /fonts\.(googleapis|gstatic)\.com/.test(url)),
  );
  expect(externalFonts).toEqual([]);
  await expect(page.locator("canvas.keycap-webgpu-compositor")).toHaveCount(0);
  await expect(page.locator(".btn-coral .keycap-fallback-content")).toHaveCSS("color", "rgb(255, 255, 255)");
});

test("HTML resume stays within runtime stability budgets", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { cls: 0, longestTask: 0 };
    (window as Window & { __resumePerformanceBudget?: typeof metrics }).__resumePerformanceBudget = metrics;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
        if (!entry.hadRecentInput) metrics.cls += entry.value ?? 0;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) metrics.longestTask = Math.max(metrics.longestTask, entry.duration);
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto("/resume");
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() =>
    (window as Window & { __resumePerformanceBudget?: { cls: number; longestTask: number } }).__resumePerformanceBudget,
  );
  expect(metrics).toBeDefined();
  expect(metrics!.cls).toBeLessThanOrEqual(0.05);
  expect(metrics!.longestTask).toBeLessThanOrEqual(350);
  await expect(page.locator("#downloads")).toBeVisible();
  await expect(page.locator("canvas.keycap-webgpu-compositor")).toHaveCount(0);
});
