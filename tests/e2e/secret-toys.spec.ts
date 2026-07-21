import { expect, test, type Page } from "@playwright/test";

async function waitForCarEngineRunning(page: Page) {
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => { engineState: string };
    }).getCarAuditAudioDiagnostics?.().engineState ?? null
  )), { timeout: 3500 }).toBe("running");
}
async function waitForCarSpeed(
  page: Page,
  comparison: "above" | "below",
  target: number,
  timeout: number,
) {
  await page.waitForFunction(
    ({ comparison: direction, target: threshold }) => {
      const canvas = document.querySelector('canvas[class*="carCanvas"]');
      const speed = (canvas as HTMLCanvasElement & {
        getCarAuditSpeed?: () => number;
      } | null)?.getCarAuditSpeed?.() ?? 0;
      return direction === "above"
        ? speed > threshold
        : speed < threshold;
    },
    { comparison, target },
    { timeout },
  );
}


test("car engine recovers when its first audio resume is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    const originalResume = AudioContext.prototype.resume;
    let blockFirstResume = true;
    AudioContext.prototype.resume = function resume() {
      if (blockFirstResume) {
        blockFirstResume = false;
        return Promise.reject(new DOMException("User activation required", "NotAllowedError"));
      }
      return originalResume.call(this);
    };
  });

  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditEngineReady?: () => boolean })
      .getCarAuditEngineReady?.() ?? false
  ))).toBe(true);

  await page.keyboard.down("ArrowUp");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => {
        contextState: string;
        engineActive: boolean;
        muted: boolean;
        outputPeak: number;
      };
    }).getCarAuditAudioDiagnostics?.() ?? null
  ))).toMatchObject({ contextState: "running", engineActive: true, muted: false });
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => { outputPeak: number };
    }).getCarAuditAudioDiagnostics?.().outputPeak ?? 0
  ))).toBeGreaterThan(0.005);
  await expect.poll(() => canvas.evaluate((element) => {
    const diagnostics = (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => {
        outputRms: number;
        spectralCentroidHz: number;
      };
    }).getCarAuditAudioDiagnostics?.();
    return Boolean(
      diagnostics
      && diagnostics.outputRms > 0.001
      && diagnostics.spectralCentroidHz > 60
      && diagnostics.spectralCentroidHz < 12_000,
    );
  })).toBe(true);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Park" }).click();
});

test("held throttle recovers a stopped engine controller", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await canvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      stopCarAuditEngine?: () => void;
    };
    if (!auditCanvas.stopCarAuditEngine) {
      throw new Error("Car engine stop audit hook is unavailable");
    }
    auditCanvas.stopCarAuditEngine();
  });
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => { engineState: string };
    }).getCarAuditAudioDiagnostics?.().engineState ?? null
  ))).toBe("off");

  await page.keyboard.down("ArrowUp");
  await waitForCarEngineRunning(page);
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? 0
  ))).toBeGreaterThan(1);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Park" }).click();
});

test("held throttle retries a failed initial engine load", async ({ page }) => {
  let idleRequests = 0;
  await page.route(/engine-natural-idle\.wav$/, async (route) => {
    idleRequests += 1;
    if (idleRequests === 1) {
      await route.fulfill({ status: 503, body: "temporary audio failure" });
      return;
    }
    await route.continue();
  });
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await page.keyboard.down("ArrowUp");
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? 0
  ))).toBeGreaterThan(1);
  expect(idleRequests).toBeGreaterThanOrEqual(2);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Park" }).click();
});

test("car engine keeps its banked fallback when the cycle worklet is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(BaseAudioContext.prototype, "audioWorklet", {
      configurable: true,
      get: () => undefined,
    });
  });
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await waitForCarEngineRunning(page);
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { renderer: string };
    }).getCarAuditDrivetrain?.().renderer ?? null
  ))).toBe("banked");
  await page.keyboard.down("ArrowUp");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => { outputPeak: number };
    }).getCarAuditAudioDiagnostics?.().outputPeak ?? 0
  ))).toBeGreaterThan(0.005);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Park" }).click();
});

test("cold start gates torque and parking completes a recorded shutdown", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const diagnostics = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => {
        engineActive: boolean;
        engineState: "starting" | "running" | "stopping" | "off";
        outputPeak: number;
      };
    }).getCarAuditAudioDiagnostics?.() ?? null
  ));
  const speed = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? Number.POSITIVE_INFINITY
  ));

  await expect.poll(async () => (await diagnostics())?.engineState).toBe("starting");
  await expect.poll(async () => (await diagnostics())?.outputPeak ?? 0).toBeGreaterThan(0.005);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(300);
  expect(Math.abs(await speed())).toBeLessThan(1);
  await expect.poll(async () => (await diagnostics())?.engineState, {
    timeout: 3000,
  }).toBe("running");
  await expect.poll(speed).toBeGreaterThan(1);
  const movingSpeed = Math.abs(await speed());
  await page.keyboard.up("ArrowUp");

  await page.getByRole("button", { name: "Park" }).click();
  const stoppingButton = page.getByRole("button", { name: "Stopping…" });
  await expect(stoppingButton).toBeDisabled();
  await expect.poll(async () => (await diagnostics())?.engineState, {
    timeout: 750,
  }).toBe("stopping");
  await expect.poll(async () => Math.abs(await speed())).toBeLessThanOrEqual(movingSpeed);
  await expect.poll(diagnostics).toMatchObject({
    engineActive: false,
    engineState: "stopping",
  });
  await expect.poll(async () => (await diagnostics())?.outputPeak ?? 0).toBeGreaterThan(0.005);
  await expect.poll(async () => (await diagnostics())?.engineState, {
    timeout: 5500,
  }).toBe("off");
});

test("car engine becomes ready from idle while its stable RPM bank streams", async ({ page }) => {
  let releaseBank = () => {};
  const bankGate = new Promise<void>((resolve) => {
    releaseBank = resolve;
  });
  let delayedRequests = 0;
  await page.route(/engine-city-(mid|high)\.wav$/, async (route) => {
    delayedRequests += 1;
    await bankGate;
    await route.continue();
  });

  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(() => delayedRequests).toBe(2);
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditEngineReady?: () => boolean })
      .getCarAuditEngineReady?.() ?? false
  )), { timeout: 2000 }).toBe(true);

  releaseBank();
  await expect.poll(() => page.evaluate(() => (
    new Set(
      performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /engine-(natural-idle|city-(mid|high))\.wav$/.test(name)),
    ).size
  ))).toBe(3);
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => {
        gear: number;
        ignitionPhase: string;
        load: number;
        targetRpm: number;
      };
    }).getCarAuditDrivetrain?.() ?? null
  ))).toMatchObject({ gear: 0, load: 0 });
  await expect.poll(() => canvas.evaluate((element) => {
    const drivetrain = (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { ignitionPhase: string; targetRpm: number };
    }).getCarAuditDrivetrain?.();
    return Boolean(
      drivetrain &&
      drivetrain.ignitionPhase !== "off" &&
      drivetrain.targetRpm > 0,
    );
  })).toBe(true);
  await waitForCarEngineRunning(page);
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { renderer: string };
    }).getCarAuditDrivetrain?.().renderer ?? null
  ))).toBe("banked");
  await page.keyboard.down("ArrowUp");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { acousticLoad: number };
    }).getCarAuditDrivetrain?.().acousticLoad ?? 0
  ))).toBeGreaterThan(0.8);
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => { limiterReductionDb: number };
    }).getCarAuditAudioDiagnostics?.().limiterReductionDb ?? -20
  ))).toBeGreaterThan(-2.5);
  await page.keyboard.down("ArrowDown");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { rapidRpmRecovery: boolean };
    }).getCarAuditDrivetrain?.().rapidRpmRecovery ?? false
  ))).toBe(true);
  await expect.poll(() => canvas.evaluate((element) => {
    const drivetrain = (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { rpm: number; targetRpm: number };
    }).getCarAuditDrivetrain?.();
    return drivetrain ? drivetrain.rpm - drivetrain.targetRpm : Number.POSITIVE_INFINITY;
  })).toBeLessThan(150);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Park" }).click();
});

test("car focus follows explicit car and outside clicks", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const controls = page.getByLabel("Car controls. Use W A S D or arrow keys to drive.");
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await expect(controls).toHaveAttribute("data-focused", "true");

  await page.locator("body").click({ position: { x: 2, y: 2 } });
  await expect(controls).toHaveAttribute("data-focused", "false");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditCameraSuppressed?: () => boolean })
      .getCarAuditCameraSuppressed?.() ?? false
  ))).toBe(true);
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditCameraMode?: () => string })
      .getCarAuditCameraMode?.() ?? null
  ))).toBe("idle");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(180);
  await page.keyboard.up("ArrowUp");
  await expect.poll(() => canvas.evaluate((element) => Math.abs(
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? Number.POSITIVE_INFINITY,
  ))).toBeLessThan(1);

  await page.getByRole("button", { name: "Focus car controls" }).click();
  await expect(controls).toHaveAttribute("data-focused", "true");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditCameraSuppressed?: () => boolean })
      .getCarAuditCameraSuppressed?.() ?? true
  ))).toBe(false);
  await page.keyboard.down("ArrowUp");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? 0
  ))).toBeGreaterThan(1);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Park" }).click();
});

test("parked car selection persists across ordinary page navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const auditWindow = window as Window & { __carVariantPaints?: string[] };
    auditWindow.__carVariantPaints = [];
    const record = (element: Element) => {
      if (element.hasAttribute("data-car-variant")) {
        auditWindow.__carVariantPaints!.push(element.getAttribute("data-car-variant") ?? "");
      }
      element.querySelectorAll("[data-car-variant]").forEach(record);
    };
    new MutationObserver((records) => {
      records.forEach((mutation) => {
        if (mutation.type === "attributes") record(mutation.target as Element);
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) record(node);
        });
      });
    }).observe(document, {
      attributeFilter: ["data-car-variant"],
      attributes: true,
      childList: true,
      subtree: true,
    });
  });
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Yellow taxi" }).click();
  await expect(page.locator('[class*="carVehicle"]')).toHaveAttribute(
    "data-car-variant",
    "taxi",
  );

  await page.goto("/projects/dsdebug?car-audit=1");
  await page.locator(".cs-car-navigation").scrollIntoViewIfNeeded();
  await expect(page.locator('[class*="carVehicle"]')).toHaveAttribute(
    "data-car-variant",
    "taxi",
  );
  expect(await page.evaluate(() => (
    (window as Window & { __carVariantPaints?: string[] }).__carVariantPaints ?? []
  ))).not.toContain("city");
});

test("homepage car can be driven and parked without moving page layout", async ({ page }) => {
  await page.goto("/?car-audit=1");
  const lane = page.locator(".secret-car-lane");
  await lane.scrollIntoViewIfNeeded();
  const car = page.getByRole("button", { name: "Take the little car for a drive" });
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const hasClearCanvasMargin = () => canvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("webgl")!;
    const { width, height } = canvas;
    const data = new Uint8Array(width * height * 4);
    context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, data);
    let left = width;
    let right = -1;
    let top = height;
    let bottom = -1;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) continue;
      const pixel = index / 4;
      const x = pixel % width;
      const y = height - 1 - Math.floor(pixel / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    return right >= 0 && left > 0 && top > 0 && right < width - 1 && bottom < height - 1;
  });
  await expect(car).toBeVisible();
  await expect.poll(hasClearCanvasMargin).toBe(true);
  const parkedYaw = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditYaw?: () => number })
      .getCarAuditYaw?.() ?? null
  ));
  await car.click();
  const drivingYaw = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditYaw?: () => number })
      .getCarAuditYaw?.() ?? null
  ));
  const drivingHeading = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditTravelHeading?: () => number })
      .getCarAuditTravelHeading?.() ?? null
  ));
  expect(parkedYaw).not.toBeNull();
  expect(drivingYaw).toBeCloseTo(parkedYaw!, 4);
  expect(drivingHeading).toBeCloseTo(parkedYaw!, 4);
  await waitForCarEngineRunning(page);
  const readLaunchGrip = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditChassis?: () => { gripMultipliers: number[] };
    }).getCarAuditChassis?.().gripMultipliers ?? []
  ));
  await expect.poll(async () => (await readLaunchGrip()).length).toBe(4);
  const launchGrip = await readLaunchGrip();
  expect(launchGrip).toHaveLength(4);
  expect(launchGrip.every((grip) => grip > 1)).toBe(true);
  await canvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditBarriersEnabled?: (enabled: boolean) => void;
      setCarAuditRoutesEnabled?: (enabled: boolean) => void;
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
    };
    auditCanvas.setCarAuditBarriersEnabled?.(false);
    auditCanvas.setCarAuditRoutesEnabled?.(false);
    const rect = element.getBoundingClientRect();
    auditCanvas.setCarAuditPose?.(
      window.scrollX + window.innerWidth / 2,
      window.scrollY + rect.top + rect.height / 2,
      -Math.PI / 2,
    );
  });

  const controls = page.getByLabel("Car controls. Use W A S D or arrow keys to drive.");
  await expect(controls).toBeVisible();
  const horn = page.getByRole("button", { name: "Honk" });
  const hornBox = await horn.boundingBox();
  expect(hornBox).not.toBeNull();
  await page.mouse.move(
    hornBox!.x + hornBox!.width / 2,
    hornBox!.y + hornBox!.height / 2,
  );
  await page.mouse.down();
  await expect(horn).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(650);
  await expect(horn).toHaveAttribute("aria-pressed", "true");
  await page.mouse.up();
  await expect(horn).toHaveAttribute("aria-pressed", "false");
  await horn.focus();
  await page.keyboard.down("Space");
  await expect(horn).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(420);
  await expect(horn).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.up("Space");
  await expect(horn).toHaveAttribute("aria-pressed", "false");
  const vehicle = page.locator('[class*="carVehicle"]');
  const carLayer = Number.parseInt(await vehicle.evaluate((element) => (
    getComputedStyle(element).zIndex
  )), 10);
  const navLayer = Number.parseInt(await page.locator(".nav").evaluate((element) => (
    getComputedStyle(element).zIndex
  )), 10);
  expect(carLayer).toBeLessThan(navLayer);
  const facingYaw = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditYaw?: () => number }).getCarAuditYaw?.() ?? null
  ));
  const drivingSpeed = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number }).getCarAuditSpeed?.() ?? null
  ));
  const drivetrain = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => {
        braking: boolean;
        clutch: number;
        clutchSlipRpm: number;
        engineLabel: string;
        gear: number;
        gearCount: number;
        load: number;
        overrun: number;
        roadSpeedKph: number;
        rpm: number;
        serviceBraking: boolean;
        steering: number;
        shiftState: string;
        targetRpm: number;
        torqueFactor: number;
        variant: string;
        wheelForceNewtons: number;
      };
    }).getCarAuditDrivetrain?.() ?? null
  ));
  const yawRate = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditYawRate?: () => number }).getCarAuditYawRate?.() ?? null
  ));
  const travelHeading = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditTravelHeading?: () => number })
      .getCarAuditTravelHeading?.() ?? null
  ));
  const cameraMode = () => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditCameraMode?: () => string })
      .getCarAuditCameraMode?.() ?? null
  ));
  const before = await vehicle.getAttribute("style");
  const initialYaw = await facingYaw();
  const initialTravelHeading = await travelHeading();

  // Steering changes wheel angle at rest, but natural vehicle yaw requires
  // road speed rather than rotating the car in place.
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(220);
  const stationarySteerYaw = await facingYaw();
  const stationaryTravelHeading = await travelHeading();
  await page.keyboard.up("ArrowRight");
  expect(initialYaw).not.toBeNull();
  expect(initialTravelHeading).not.toBeNull();
  expect(stationarySteerYaw).not.toBeNull();
  expect(stationaryTravelHeading).not.toBeNull();
  expect(Math.abs(stationarySteerYaw! - initialYaw!)).toBeLessThan(0.02);
  expect(Math.abs(stationaryTravelHeading! - initialTravelHeading!)).toBeLessThan(0.02);
  await expect.poll(() => canvas.evaluate((element) => Math.abs(
    (element as HTMLCanvasElement & { getCarAuditSteeringAngle?: () => number })
      .getCarAuditSteeringAngle?.() ?? Number.POSITIVE_INFINITY,
  ))).toBeLessThan(0.01);

  const straightStartBox = await vehicle.boundingBox();
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(160);
  const straightEndBox = await vehicle.boundingBox();
  expect(straightStartBox).not.toBeNull();
  expect(straightEndBox).not.toBeNull();
  expect(Math.abs(straightEndBox!.x - straightStartBox!.x)).toBeLessThan(2);
  expect(straightEndBox!.y).toBeLessThan(straightStartBox!.y);
  await expect.poll(async () => (await drivetrain())?.rpm ?? 0).toBeGreaterThan(850);
  const acceleratingDrivetrain = await drivetrain();
  expect(acceleratingDrivetrain).not.toBeNull();
  expect(acceleratingDrivetrain!.gear).toBeGreaterThanOrEqual(1);
  // The unified wheel-force model can already be inside its first torque-cut
  // shift here, so combustion load need not still be near one.
  expect(acceleratingDrivetrain!.load).toBeGreaterThan(0.3);
  expect(acceleratingDrivetrain!.wheelForceNewtons).toBeGreaterThan(0);
  expect(acceleratingDrivetrain!.roadSpeedKph).toBeGreaterThan(0);
  expect(acceleratingDrivetrain!.targetRpm).toBeGreaterThan(850);
  expect(acceleratingDrivetrain!.variant).toBe("city");
  expect(acceleratingDrivetrain!.engineLabel).toBe("Compact five-speed");
  expect(acceleratingDrivetrain!.gearCount).toBe(5);
  const cityEngineBanks = await page.evaluate(() => (
    performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => /(engine-natural-idle|engine-city-(mid|high))\.wav$/.test(name))
  ));
  expect(new Set(cityEngineBanks).size).toBe(3);

  await expect.poll(async () => (await drivetrain())?.gear ?? 0).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => (await drivetrain())?.clutch ?? 1).toBeLessThan(1);
  await expect.poll(async () => (await drivetrain())?.torqueFactor ?? 1).toBeLessThan(1);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(240);
  const facingRight = await facingYaw();
  const travelRight = await travelHeading();
  const rightYawRate = await yawRate();
  const turningChassis = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditChassis?: () => unknown })
      .getCarAuditChassis?.() ?? null
  ));
  const suspensionTravel = (await vehicle.getAttribute("data-suspension-travel"))
    ?.split(",")
    .map(Number) ?? [];
  const turningDrivetrain = await drivetrain();
  await page.keyboard.up("ArrowRight");
  expect(facingRight).not.toBeNull();
  expect(travelRight).not.toBeNull();
  expect(rightYawRate).not.toBeNull();
  expect(turningDrivetrain).not.toBeNull();
  expect(turningDrivetrain!.gear).toBeGreaterThanOrEqual(2);
  expect(turningDrivetrain!.steering).toBeGreaterThan(0.2);
  expect(Math.abs(rightYawRate!)).toBeLessThanOrEqual(2);
  expect(rightYawRate!, JSON.stringify(turningChassis)).toBeGreaterThan(0);
  expect(suspensionTravel).toHaveLength(4);
  expect(suspensionTravel.every(Number.isFinite)).toBe(true);
  expect(Math.max(...suspensionTravel) - Math.min(...suspensionTravel))
    .toBeGreaterThan(0.02);
  expect(travelRight!).toBeGreaterThan(initialTravelHeading! + 0.1);
  expect(await hasClearCanvasMargin()).toBe(true);

  await page.waitForTimeout(120);
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(320);
  const facingLeft = await facingYaw();
  const travelLeft = await travelHeading();
  const leftYawRate = await yawRate();
  const countersteeringChassis = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditChassis?: () => unknown })
      .getCarAuditChassis?.() ?? null
  ));
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.up("ArrowUp");
  const gearBeforeBraking = (await drivetrain())?.gear;
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(30);
  const brakingDrivetrain = await drivetrain();
  const brakeLightIntensity = Number(
    await vehicle.getAttribute("data-brake-intensity") ?? "0",
  );
  await page.keyboard.up("ArrowDown");
  expect(facingLeft).not.toBeNull();
  expect(travelLeft).not.toBeNull();
  expect(leftYawRate).not.toBeNull();
  expect(Math.abs(leftYawRate!)).toBeLessThanOrEqual(2);
  // Rotational inertia means the body need not undo the preceding turn
  // immediately, but sustained opposite steering must reverse yaw rate.
  expect(leftYawRate!, JSON.stringify(countersteeringChassis)).toBeLessThan(0);
  expect(await hasClearCanvasMargin()).toBe(true);
  expect(brakingDrivetrain).not.toBeNull();
  expect(brakingDrivetrain!.braking).toBe(true);
  expect(brakingDrivetrain!.serviceBraking).toBe(true);
  expect(brakingDrivetrain!.overrun).toBeGreaterThan(0);
  expect(brakingDrivetrain!.gear).toBe(gearBeforeBraking);
  expect(brakingDrivetrain!.shiftState).toBe("steady");
  expect(brakeLightIntensity).toBeGreaterThan(0);

  const speedBeforeCoastingTurn = await drivingSpeed();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(140);
  const speedAfterCoastingTurn = await drivingSpeed();
  await page.keyboard.up("ArrowRight");
  expect(speedBeforeCoastingTurn).not.toBeNull();
  expect(speedAfterCoastingTurn).not.toBeNull();
  expect(Math.abs(speedAfterCoastingTurn!)).toBeLessThanOrEqual(Math.abs(speedBeforeCoastingTurn!));

  const after = await vehicle.getAttribute("style");
  expect(after).not.toBe(before);

  // Use simultaneous pedals as an unambiguous service-brake command before
  // isolating scroll anchoring from intentional vehicle movement. Waiting for
  // a glancing boundary coast to end makes this assertion depend on page edge.
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowDown");
  await expect.poll(async () => Math.abs((await drivingSpeed()) ?? Number.POSITIVE_INFINITY), {
    timeout: 5000,
  }).toBeLessThan(1);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.up("ArrowUp");
  // "idle" is also the camera's normal state while the car is moving safely
  // inside its breathing room. Wait for the observable centering outcome
  // before checking that the settle state has returned to idle; otherwise the
  // assertion can sample the pre-settle idle frame and race the next RAF.
  await expect.poll(async () => {
    const box = await vehicle.boundingBox();
    const viewport = page.viewportSize();
    const state = await canvas.evaluate((element) => (
      (element as HTMLCanvasElement & {
        getCarAuditCameraState?: () => {
          carCenterPageY: number;
          documentHeight: number;
        };
      }).getCarAuditCameraState?.() ?? null
    ));
    if (!box || !viewport || !state) return Number.POSITIVE_INFINITY;
    const maximumScroll = Math.max(0, state.documentHeight - viewport.height);
    const expectedScroll = Math.max(0, Math.min(
      maximumScroll,
      state.carCenterPageY - viewport.height / 2,
    ));
    const expectedScreenY = state.carCenterPageY - expectedScroll;
    return Math.abs(box.y + box.height / 2 - expectedScreenY);
  }, { timeout: 10000 }).toBeLessThan(12);
  await expect.poll(cameraMode, { timeout: 10000 }).toBe("idle");
  const centeredVehicleBox = await vehicle.boundingBox();
  const centeredViewport = page.viewportSize();
  const settledCamera = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditCameraState?: () => {
        carCenterPageY: number;
        documentHeight: number;
      };
    }).getCarAuditCameraState?.() ?? null
  ));
  expect(centeredVehicleBox).not.toBeNull();
  expect(centeredViewport).not.toBeNull();
  expect(settledCamera).not.toBeNull();
  const centeredMaximumScroll = Math.max(
    0,
    settledCamera!.documentHeight - centeredViewport!.height,
  );
  const centeredExpectedScroll = Math.max(0, Math.min(
    centeredMaximumScroll,
    settledCamera!.carCenterPageY - centeredViewport!.height / 2,
  ));
  const centeredExpectedScreenY = settledCamera!.carCenterPageY
    - centeredExpectedScroll;
  expect(
    Math.abs(
      centeredVehicleBox!.y + centeredVehicleBox!.height / 2 - centeredExpectedScreenY,
    ),
    JSON.stringify({ centeredExpectedScreenY, centeredVehicleBox, settledCamera }),
  ).toBeLessThan(12);
  const beforeScrollBox = await vehicle.boundingBox();
  const beforeScrollY = await page.evaluate(() => window.scrollY);
  const manualScrollDelta = await page.evaluate(() => {
    const maximumScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    return window.scrollY > maximumScroll / 2 ? -240 : 240;
  });
  await page.mouse.wheel(0, manualScrollDelta);
  await page.waitForTimeout(100);
  const afterScrollY = await page.evaluate(() => window.scrollY);
  const afterScrollBox = await vehicle.boundingBox();
  const scrollDelta = afterScrollY - beforeScrollY;
  expect(Math.abs(scrollDelta)).toBeGreaterThan(0);
  expect(beforeScrollBox).not.toBeNull();
  expect(afterScrollBox).not.toBeNull();
  expect(
    Math.abs(afterScrollBox!.y - (beforeScrollBox!.y - scrollDelta)),
    JSON.stringify({ afterScrollBox, beforeScrollBox, afterScrollY, beforeScrollY, scrollDelta }),
  ).toBeLessThan(2);

  await page.getByRole("button", { name: "Park" }).click();
  await expect(controls).toBeHidden();
  await expect(car).toBeVisible();
  await expect(vehicle).not.toHaveAttribute("style", /transform/);
});

test("homepage car engages reverse promptly after forward travel", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const vehicle = page.locator('[class*="carVehicle"]');
  const reverseControl = page.getByRole("button", { name: "Brake or reverse" });
  const parkedStartBox = await vehicle.boundingBox();
  const reverseControlBox = await reverseControl.boundingBox();
  expect(parkedStartBox).not.toBeNull();
  expect(reverseControlBox).not.toBeNull();
  await page.mouse.move(
    reverseControlBox!.x + reverseControlBox!.width / 2,
    reverseControlBox!.y + reverseControlBox!.height / 2,
  );
  await page.mouse.down();
  await waitForCarSpeed(page, "below", -20, 650);
  await expect(vehicle).toHaveAttribute("data-reverse-active", "true");
  await page.waitForTimeout(220);
  const parkedReverseBox = await vehicle.boundingBox();
  await page.mouse.up();
  expect(parkedReverseBox).not.toBeNull();
  expect(Math.hypot(
    parkedReverseBox!.x - parkedStartBox!.x,
    parkedReverseBox!.y - parkedStartBox!.y,
  )).toBeGreaterThan(2);

  const viewport = page.viewportSize()!;
  const scrollY = await page.evaluate(() => window.scrollY);
  await canvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
    };
    auditCanvas.setCarAuditPose?.(pose.x, pose.y, pose.heading);
  }, {
    x: viewport.width / 2,
    y: scrollY + viewport.height / 2,
    heading: -Math.PI / 2,
  });

  const getAverageWheelRotation = () => canvas.evaluate((element) => {
    const rotations = (element as HTMLCanvasElement & {
      getCarAuditWheelRotations?: () => [number, number, number, number];
    }).getCarAuditWheelRotations?.() ?? [0, 0, 0, 0];
    return rotations.reduce((sum, rotation) => sum + rotation, 0)
      / rotations.length;
  });

  await page.keyboard.down("ArrowUp");
  await waitForCarSpeed(page, "above", 200, 3_000);
  const forwardRotationStart = await getAverageWheelRotation();
  await page.waitForTimeout(140);
  const forwardRotationEnd = await getAverageWheelRotation();
  expect(forwardRotationEnd).toBeLessThan(forwardRotationStart);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.down("ArrowDown");
  await waitForCarSpeed(page, "below", -20, 1_200);
  const reverseRotationStart = await getAverageWheelRotation();
  const reversingDrivetrain = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { direction: number; wheelForceNewtons: number };
    }).getCarAuditDrivetrain?.() ?? null
  ));
  expect(reversingDrivetrain?.direction).toBe(-1);
  expect(reversingDrivetrain?.wheelForceNewtons).toBeLessThan(0);
  const reverseStartBox = await vehicle.boundingBox();
  await page.waitForTimeout(220);
  const reverseRotationEnd = await getAverageWheelRotation();
  const reverseEndBox = await vehicle.boundingBox();
  expect(reverseStartBox).not.toBeNull();
  expect(reverseEndBox).not.toBeNull();
  expect(reverseRotationEnd).toBeGreaterThan(reverseRotationStart);
  expect(reverseEndBox!.y).toBeGreaterThan(reverseStartBox!.y + 2);
  await page.keyboard.up("ArrowDown");
});

test("taxi reverses visibly from its parked position", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Yellow taxi" }).click();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const vehicle = page.locator('[class*="carVehicle"]');
  const startBox = await vehicle.boundingBox();
  expect(startBox).not.toBeNull();
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(800);
  const reverseState = await canvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      getCarAuditChassis?: () => unknown;
      getCarAuditDrivetrain?: () => unknown;
      getCarAuditSpeed?: () => number;
    };
    return {
      chassis: auditCanvas.getCarAuditChassis?.() ?? null,
      drivetrain: auditCanvas.getCarAuditDrivetrain?.() ?? null,
      speed: auditCanvas.getCarAuditSpeed?.() ?? 0,
    };
  });
  expect(reverseState.speed, JSON.stringify(reverseState)).toBeLessThan(-20);
  await page.waitForTimeout(220);
  const endBox = await vehicle.boundingBox();
  await page.keyboard.up("ArrowDown");
  expect(endBox).not.toBeNull();
  expect(Math.hypot(
    endBox!.x - startBox!.x,
    endBox!.y - startBox!.y,
  )).toBeGreaterThan(2);
});

test("rally car reverses visibly from its parked position", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Blue rally car" }).click();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const vehicle = page.locator('[class*="carVehicle"]');
  const startBox = await vehicle.boundingBox();
  expect(startBox).not.toBeNull();
  await page.keyboard.down("ArrowDown");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? 0
  )), { timeout: 800 }).toBeLessThan(-20);
  await page.waitForTimeout(220);
  const endBox = await vehicle.boundingBox();
  await page.keyboard.up("ArrowDown");
  expect(endBox).not.toBeNull();
  expect(Math.hypot(
    endBox!.x - startBox!.x,
    endBox!.y - startBox!.y,
  )).toBeGreaterThan(2);
});

test("vehicle variants keep a shared running engine bank phase-continuous", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(() => canvas.evaluate((element) => Boolean(
    (element as HTMLCanvasElement & {
      setCarAuditEngineVariant?: (variant: "city" | "rally" | "taxi") => void;
    }).setCarAuditEngineVariant,
  ))).toBe(true);
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditEngineReady?: () => boolean })
      .getCarAuditEngineReady?.() ?? false
  ))).toBe(true);
  await canvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditEngineVariant?: (variant: "city" | "rally" | "taxi") => void;
    };
    if (!auditCanvas.setCarAuditEngineVariant) {
      throw new Error("Car engine-bank audit hook is unavailable");
    }
    auditCanvas.setCarAuditEngineVariant("rally");
  });

  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { gearCount: number; variant: string };
    }).getCarAuditDrivetrain?.() ?? null
  ))).toMatchObject({ gearCount: 6, variant: "rally" });
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditAudioDiagnostics?: () => { engineState: string };
    }).getCarAuditAudioDiagnostics?.().engineState ?? null
  ))).toBe("running");
  expect(await page.evaluate(() => (
    performance.getEntriesByType("resource")
      .filter((entry) => /engine-rally-(mid|high)\.wav$/.test(entry.name))
      .length
  ))).toBe(0);
  await page.getByRole("button", { name: "Park" }).click();
});

test("homepage car camera keeps sustained forward travel in view", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const controls = page.getByLabel("Car controls. Use W A S D or arrow keys to drive.");
  const vehicle = page.locator('[class*="carVehicle"]');
  await expect(controls).toBeVisible();

  const canvas = page.locator('canvas[class*="carCanvas"]');
  const initialVehicleBox = await vehicle.boundingBox();
  const initialViewport = page.viewportSize();
  expect(initialVehicleBox).not.toBeNull();
  expect(initialViewport).not.toBeNull();
  const pageScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  await canvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
    };
    if (!auditCanvas.setCarAuditPose) throw new Error("Car pose audit hook is unavailable");
    auditCanvas.setCarAuditPose(pose.x, pose.y, -Math.PI / 2);
  }, {
    x: initialVehicleBox!.x + pageScroll.x + initialVehicleBox!.width / 2,
    y: pageScroll.y + initialViewport!.height / 2,
  });

  const initialScrollY = await page.evaluate(() => window.scrollY);
  // A short feint remains inside the racing-camera dead zone.
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(120);
  await page.keyboard.up("ArrowUp");
  const feintScrollY = await page.evaluate(() => window.scrollY);
  const feintCameraMode = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditCameraMode?: () => string })
      .getCarAuditCameraMode?.() ?? null
  ));
  expect(Math.abs(feintScrollY - initialScrollY)).toBeLessThan(2);
  expect(feintCameraMode).toBe("idle");

  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1800);
  const vehicleBox = await vehicle.boundingBox();
  const viewport = page.viewportSize();
  const followedScrollY = await page.evaluate(() => window.scrollY);
  await page.keyboard.up("ArrowUp");

  expect(vehicleBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  const vehicleCenterY = vehicleBox!.y + vehicleBox!.height / 2;
  expect(vehicleCenterY).toBeGreaterThan(0);
  expect(vehicleCenterY).toBeLessThan(viewport!.height);
  expect(Math.abs(followedScrollY - initialScrollY)).toBeGreaterThan(40);

  // Braking into reverse changes the travel direction without allowing the
  // vehicle to escape while the camera releases and reacquires.
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(700);
  const reversedBox = await vehicle.boundingBox();
  await page.keyboard.up("ArrowDown");
  expect(reversedBox).not.toBeNull();
  expect(reversedBox!.y + reversedBox!.height).toBeGreaterThan(0);
  expect(reversedBox!.y).toBeLessThan(viewport!.height);

  await page.getByRole("button", { name: "Park" }).click();
});

test("manual scrolling takes control from the driving camera", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const scrollY = await page.evaluate(() => window.scrollY);
  await canvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
    };
    auditCanvas.setCarAuditPose?.(pose.x, pose.y, -Math.PI / 2);
  }, {
    x: viewport!.width / 2,
    y: scrollY + viewport!.height / 2,
  });

  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(360);
  const beforeUserScroll = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 420);
  await expect.poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(beforeUserScroll + 100);
  await page.keyboard.up("ArrowUp");
  const userScrollPosition = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(350);
  const releasedScrollPosition = await page.evaluate(() => window.scrollY);
  const cameraSuppressed = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditCameraSuppressed?: () => boolean })
      .getCarAuditCameraSuppressed?.() ?? false
  ));
  expect(cameraSuppressed).toBe(true);
  expect(Math.abs(releasedScrollPosition - userScrollPosition)).toBeLessThan(2);

  // A fresh driving gesture deliberately hands control back to the racing camera.
  await page.keyboard.down("ArrowUp");
  await expect.poll(() => canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditCameraSuppressed?: () => boolean })
      .getCarAuditCameraSuppressed?.() ?? true
  ))).toBe(false);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Park" }).click();
});

test("homepage keycaps behave as anchored road barriers", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const barrier = page.locator(".btn").first();
  await expect(barrier).toBeAttached();
  const barrierBox = await barrier.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      centerX: rect.left + window.scrollX + rect.width / 2,
      bottom: rect.bottom + window.scrollY,
    };
  });
  await canvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
    };
    if (!auditCanvas.setCarAuditPose) throw new Error("Car pose audit hook is unavailable");
    auditCanvas.setCarAuditPose(pose.x, pose.y, -Math.PI / 2);
  }, { x: barrierBox.centerX, y: barrierBox.bottom + 44 });

  await page.keyboard.down("ArrowUp");
  await expect.poll(() => barrier.getAttribute("data-car-impact"), {
    timeout: 1200,
  }).toBe("true");
  // The impact flag is set when the impulse is received; allow the following
  // fixed physics steps to convert velocity into visible spring displacement.
  await page.waitForTimeout(50);
  const displacedBarrier = await barrier.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      centerX: rect.left + window.scrollX + rect.width / 2,
      bottom: rect.bottom + window.scrollY,
      rotate: (element as HTMLElement).style.rotate,
      translate: (element as HTMLElement).style.translate,
    };
  });
  expect(
    Math.hypot(
      displacedBarrier.centerX - barrierBox.centerX,
      displacedBarrier.bottom - barrierBox.bottom,
    ),
  ).toBeGreaterThan(0.2);
  expect(
    Math.hypot(
      displacedBarrier.centerX - barrierBox.centerX,
      displacedBarrier.bottom - barrierBox.bottom,
    ),
  ).toBeLessThanOrEqual(10);
  expect(displacedBarrier.translate).not.toBe("");
  expect(displacedBarrier.rotate).not.toBe("");
  await page.waitForTimeout(100);
  await page.keyboard.up("ArrowUp");
  const hits = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditBarrierHits?: () => number })
      .getCarAuditBarrierHits?.() ?? 0
  ));
  expect(hits).toBeGreaterThan(0);
  await expect.poll(() => barrier.getAttribute("data-car-impact"), {
    timeout: 2000,
  }).toBeNull();

  await page.getByRole("button", { name: "Park" }).click();
});

test("page barriers stop inward momentum instead of turning it into wall sliding", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const vehicle = page.locator('[class*="carVehicle"]');
  await canvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditBarriersEnabled?: (enabled: boolean) => void;
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
      setCarAuditRoutesEnabled?: (enabled: boolean) => void;
    };
    auditCanvas.setCarAuditBarriersEnabled?.(false);
    auditCanvas.setCarAuditRoutesEnabled?.(false);
    if (!auditCanvas.setCarAuditPose) throw new Error("Car pose audit hook is unavailable");
    auditCanvas.setCarAuditPose(window.innerWidth / 2, 92, -Math.PI / 2 + 0.16);
  });

  const pageCenter = async () => {
    const box = await vehicle.boundingBox();
    const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    if (!box) throw new Error("Car is not visible");
    return {
      x: box.x + scroll.x + box.width / 2,
      y: box.y + scroll.y + box.height / 2,
    };
  };
  const start = await pageCenter();
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(700);
  await page.keyboard.up("ArrowUp");
  const end = await pageCenter();
  const chassis = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement & {
      getCarAuditChassis?: () => {
        velocityX: number;
        velocityY: number;
      };
    }).getCarAuditChassis?.() ?? null
  ));

  expect(end.y).toBeGreaterThanOrEqual(110);
  expect(Math.abs(end.x - start.x)).toBeLessThan(90);
  expect(chassis).not.toBeNull();
  expect(chassis!.velocityY).toBeGreaterThanOrEqual(-1);
  expect(Math.abs(chassis!.velocityX)).toBeLessThan(80);

  await page.getByRole("button", { name: "Park" }).click();
});

test("stopping during an edge crossing does not snap the car onscreen", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const vehicle = page.locator('[class*="carVehicle"]');
  const scrollY = await page.evaluate(() => window.scrollY);
  await canvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditBarriersEnabled?: (enabled: boolean) => void;
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
      setCarAuditRoutesEnabled?: (enabled: boolean) => void;
    };
    auditCanvas.setCarAuditBarriersEnabled?.(false);
    auditCanvas.setCarAuditRoutesEnabled?.(false);
    auditCanvas.setCarAuditPose?.(65, pose.y, Math.PI);
  }, { y: scrollY + page.viewportSize()!.height / 2 });

  await page.keyboard.down("ArrowUp");
  await expect.poll(() => canvas.evaluate((element) => Math.abs(
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? 0,
  ))).toBeGreaterThan(55);
  const crossingBox = await vehicle.boundingBox();
  expect(crossingBox).not.toBeNull();
  expect(crossingBox!.x).toBeLessThan(0);
  await page.keyboard.down("ArrowDown");
  await expect.poll(() => canvas.evaluate((element) => Math.abs(
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? Number.POSITIVE_INFINITY,
  )), { timeout: 2_000 }).toBeLessThan(1);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.up("ArrowUp");
  const stoppedBox = await vehicle.boundingBox();
  await page.waitForTimeout(250);
  const settledBox = await vehicle.boundingBox();
  expect(stoppedBox).not.toBeNull();
  expect(settledBox).not.toBeNull();
  expect(stoppedBox!.x).toBeLessThan(0);
  expect(Math.abs(settledBox!.x - stoppedBox!.x)).toBeLessThan(2);
});

test("a cancelled car route handoff recovers on the current page", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const vehicle = page.locator('[class*="carVehicle"]');
  const controls = page.getByLabel("Car controls. Use W A S D or arrow keys to drive.");
  const viewport = page.viewportSize()!;
  const scrollY = await page.evaluate(() => window.scrollY);

  await expect.poll(() => canvas.evaluate((element) => Boolean(
    (element as HTMLCanvasElement & { failNextCarAuditNavigation?: () => void })
      .failNextCarAuditNavigation,
  ))).toBe(true);

  const placeBeyondRightEdge = () => canvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      failNextCarAuditNavigation?: () => void;
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
    };
    auditCanvas.setCarAuditPose?.(pose.x, pose.y, 0);
  }, {
    x: viewport.width + 40,
    y: scrollY + viewport.height / 2,
  });

  await canvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      failNextCarAuditNavigation?: () => void;
    };
    if (!auditCanvas.failNextCarAuditNavigation) {
      throw new Error("Car navigation failure audit hook is unavailable");
    }
    auditCanvas.failNextCarAuditNavigation();
  });
  await placeBeyondRightEdge();
  await page.keyboard.down("ArrowUp");
  await expect.poll(() => canvas.evaluate((element) => (
    element as HTMLCanvasElement & {
      getCarAuditRouteState?: () => { failNext: boolean };
    }
  ).getCarAuditRouteState?.().failNext ?? true)).toBe(false);
  await page.keyboard.up("ArrowUp");

  await expect(page).toHaveURL(/\/\?car-audit=1$/);
  await expect(controls).toBeVisible();
  await expect.poll(async () => {
    const box = await vehicle.boundingBox();
    return box ? box.x + box.width : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(viewport.width - 80);
  const recoveredBox = await vehicle.boundingBox();
  expect(recoveredBox).not.toBeNull();
  expect(recoveredBox!.x).toBeGreaterThanOrEqual(0);
  expect(recoveredBox!.x + recoveredBox!.width).toBeLessThanOrEqual(viewport.width);

  // The recovered car must be able to retry the same edge transition rather
  // than remaining locked at the boundary with a stale navigation flag.
  await page.waitForTimeout(520);
  await placeBeyondRightEdge();
  await page.keyboard.down("ArrowUp");
  await expect(page).toHaveURL(/\/projects\/dsdebug\?car-audit=1$/, { timeout: 5000 });
  await page.keyboard.up("ArrowUp");
});

test("a stalled client route falls back to a continuity-preserving document navigation", async ({
  page,
}) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(() => canvas.evaluate((element) => Boolean(
    (element as HTMLCanvasElement & { stallNextCarAuditNavigation?: () => void })
      .stallNextCarAuditNavigation,
  ))).toBe(true);
  await canvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
      stallNextCarAuditNavigation?: () => void;
    };
    if (!auditCanvas.setCarAuditPose || !auditCanvas.stallNextCarAuditNavigation) {
      throw new Error("Car stalled-navigation audit hooks are unavailable");
    }
    auditCanvas.stallNextCarAuditNavigation();
    auditCanvas.setCarAuditPose(pose.x, pose.y, 0);
  }, {
    x: page.viewportSize()!.width + 70,
    y: await page.evaluate(() => window.scrollY + window.innerHeight / 2),
  });

  await page.keyboard.down("ArrowUp");
  // The audit fallback is intentionally short and a document navigation can
  // replace the page before Playwright samples an intermediate off-screen
  // frame. Assert the durable route and live-car outcomes below instead.
  await expect(page).toHaveURL(/\/projects\/dsdebug\?car-audit=1$/, { timeout: 5000 });
  await expect(page.getByLabel(
    "Car controls. Use W A S D or arrow keys to drive.",
  )).toBeVisible();
  const arrivedCanvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(() => arrivedCanvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
      .getCarAuditSpeed?.() ?? 0
  ))).toBeGreaterThan(1);
  await page.keyboard.up("ArrowUp");
});

test("reverse driving stays live through rapid page round trips", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);

  const crossInReverse = async (edge: "left" | "right", destination: RegExp) => {
    const canvas = page.locator('canvas[class*="carCanvas"]');
    await expect.poll(() => canvas.evaluate((element) => Boolean(
      (element as HTMLCanvasElement & {
        setCarAuditPose?: (x: number, y: number, heading: number) => void;
      }).setCarAuditPose,
    ))).toBe(true);
    const viewport = page.viewportSize()!;
    const scrollY = await page.evaluate(() => window.scrollY);
    await canvas.evaluate((element, pose) => {
      const auditCanvas = element as HTMLCanvasElement & {
        setCarAuditPose?: (x: number, y: number, heading: number) => void;
      };
      if (!auditCanvas.setCarAuditPose) throw new Error("Car pose audit hook is unavailable");
      auditCanvas.setCarAuditPose(pose.x, pose.y, pose.heading);
    }, {
      x: edge === "right" ? viewport.width + 70 : -70,
      y: scrollY + viewport.height / 2,
      // Reverse points opposite the edge while its signed road speed carries
      // the car across it: facing left reverses right, and vice versa.
      heading: edge === "right" ? Math.PI : 0,
    });

    await page.keyboard.down("ArrowDown");
    await expect(page).toHaveURL(destination, { timeout: 5000 });
    const arrivedCanvas = page.locator('canvas[class*="carCanvas"]');
    const arrivedVehicle = page.locator('[class*="carVehicle"]');
    await expect.poll(() => arrivedCanvas.evaluate((element) => (
      (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
        .getCarAuditSpeed?.() ?? 0
    ))).toBeLessThan(-1);
    const before = await arrivedVehicle.boundingBox();
    await page.waitForTimeout(180);
    const after = await arrivedVehicle.boundingBox();
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    const inwardTravel = edge === "right"
      ? after!.x - before!.x
      : before!.x - after!.x;
    expect(inwardTravel).toBeGreaterThan(2);
    await page.keyboard.up("ArrowDown");
  };

  const turnAroundAtArrival = async (
    control: "ArrowUp" | "ArrowDown",
    destination: RegExp,
    inwardDirection: "left" | "right",
  ) => {
    await page.keyboard.down(control);
    await expect(page).toHaveURL(destination, { timeout: 7_500 });
    const arrivedCanvas = page.locator('canvas[class*="carCanvas"]');
    const arrivedVehicle = page.locator('[class*="carVehicle"]');
    const arrivedSpeed = () => arrivedCanvas.evaluate((element) => (
      (element as HTMLCanvasElement & { getCarAuditSpeed?: () => number })
        .getCarAuditSpeed?.() ?? 0
    ));
    if (control === "ArrowUp") {
      await expect.poll(arrivedSpeed).toBeGreaterThan(1);
    } else {
      await expect.poll(arrivedSpeed).toBeLessThan(-1);
    }
    const before = await arrivedVehicle.boundingBox();
    await page.waitForTimeout(180);
    const after = await arrivedVehicle.boundingBox();
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    const inwardTravel = inwardDirection === "right"
      ? after!.x - before!.x
      : before!.x - after!.x;
    expect(inwardTravel).toBeGreaterThan(2);
    await page.keyboard.up(control);
  };

  await crossInReverse("right", /\/projects\/dsdebug\?car-audit=1$/);
  // Turn around at the arrival edge twice without teleporting the car. This
  // reproduces the rapid reverse/forward route race that used to let a stale
  // completion from the previous page interfere with the current handoff.
  await turnAroundAtArrival("ArrowUp", /\/\?car-audit=1#toy-car$/, "left");
  await turnAroundAtArrival(
    "ArrowDown",
    /\/projects\/dsdebug\?car-audit=1$/,
    "right",
  );
  await crossInReverse("right", /\/projects\/entity-visualization\?car-audit=1$/);
  await crossInReverse("left", /\/projects\/dsdebug\?car-audit=1$/);
  await crossInReverse("left", /\/\?car-audit=1#toy-car$/);
});

test("steering, torque, and controls remain continuous through a route handoff", async ({
  page,
}) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Blue rally car" }).click();
  await page.getByRole("button", { name: "Take the little car for a drive" }).click();
  await waitForCarEngineRunning(page);
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const viewport = page.viewportSize()!;
  const pageY = await page.evaluate(() => window.scrollY + window.innerHeight / 2);
  await canvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
    };
    if (!auditCanvas.setCarAuditPose) throw new Error("Car pose audit hook is unavailable");
    auditCanvas.setCarAuditPose(pose.x, pose.y, 0);
  }, { x: viewport.width / 2, y: pageY });

  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(260);
  const departure = await canvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { rpm: number; variant: string };
      getCarAuditSpeed?: () => number;
      getCarAuditSteeringAngle?: () => number;
      getCarAuditYawRate?: () => number;
    };
    return {
      drivetrain: auditCanvas.getCarAuditDrivetrain?.(),
      speed: auditCanvas.getCarAuditSpeed?.() ?? 0,
      steering: auditCanvas.getCarAuditSteeringAngle?.() ?? 0,
      yawRate: auditCanvas.getCarAuditYawRate?.() ?? 0,
    };
  });
  expect(departure.speed).toBeGreaterThan(1);
  expect(departure.steering).toBeGreaterThan(0);
  expect(departure.yawRate).toBeGreaterThan(0);

  await canvas.evaluate((element, position) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditPosition?: (x: number, y: number) => void;
    };
    if (!auditCanvas.setCarAuditPosition) {
      throw new Error("Car position-only audit hook is unavailable");
    }
    auditCanvas.setCarAuditPosition(position.x, position.y);
  }, { x: viewport.width + 70, y: pageY });

  await expect(page).toHaveURL(/\/projects\/dsdebug\?car-audit=1$/, { timeout: 5000 });
  const arrivedCanvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(() => arrivedCanvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditControls?: () => string[] })
      .getCarAuditControls?.() ?? []
  ))).toEqual(expect.arrayContaining(["up", "right"]));
  await expect.poll(() => arrivedCanvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditSteeringAngle?: () => number })
      .getCarAuditSteeringAngle?.() ?? 0
  ))).toBeGreaterThan(0);
  await expect.poll(() => arrivedCanvas.evaluate((element) => (
    (element as HTMLCanvasElement & { getCarAuditYawRate?: () => number })
      .getCarAuditYawRate?.() ?? 0
  ))).toBeGreaterThan(0);
  const arrival = await arrivedCanvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      getCarAuditDrivetrain?: () => { rpm: number; variant: string };
      getCarAuditSpeed?: () => number;
    };
    return {
      drivetrain: auditCanvas.getCarAuditDrivetrain?.(),
      speed: auditCanvas.getCarAuditSpeed?.() ?? 0,
    };
  });
  expect(arrival.speed).toBeGreaterThan(1);
  expect(arrival.drivetrain?.variant).toBe("rally");
  expect(arrival.drivetrain?.rpm ?? 0)
    .toBeGreaterThanOrEqual((departure.drivetrain?.rpm ?? 0) - 160);

  const vehicle = page.locator('[class*="carVehicle"]');
  const before = await vehicle.boundingBox();
  await page.waitForTimeout(140);
  const after = await vehicle.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after!.x - before!.x).toBeGreaterThan(1);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ArrowUp");
});

test("car screen edges follow the walkthrough pager order", async ({ page }) => {
  const expectStableHorizontalViewport = async () => {
    await expect.poll(() => page.evaluate(() => window.scrollX)).toBe(0);
    const overflow = await page.evaluate(() => (
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    expect(overflow).toBeLessThanOrEqual(0);
  };

  const readArrivalState = (canvas: ReturnType<typeof page.locator>) => canvas.evaluate((element) => {
    const auditCanvas = element as HTMLCanvasElement & {
      getCarAuditYaw?: () => number;
      getCarAuditTravelHeading?: () => number;
      getCarAuditSpeed?: () => number;
      getCarAuditYawRate?: () => number;
      getCarAuditSteeringAngle?: () => number;
      getCarAuditControls?: () => string[];
      getCarAuditDrivetrain?: () => {
        engineLabel: string;
        gear: number;
        gearCount: number;
        roadSpeedKph: number;
        rpm: number;
        variant: string;
      };
      getCarAuditCameraState?: () => {
        actualScrollY: number;
        carCenterPageY: number;
        carCenterScreenY: number;
        documentHeight: number;
      };
    };
    const yaw = auditCanvas.getCarAuditYaw?.() ?? Number.NaN;
    const heading = auditCanvas.getCarAuditTravelHeading?.() ?? Number.NaN;
    const angularError = Math.abs(
      ((yaw - heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI,
    );
    const camera = auditCanvas.getCarAuditCameraState?.();
    return {
      actualScrollY: camera?.actualScrollY ?? Number.NaN,
      angularError,
      carCenterPageY: camera?.carCenterPageY ?? Number.NaN,
      carCenterScreenY: camera?.carCenterScreenY ?? Number.NaN,
      controls: auditCanvas.getCarAuditControls?.() ?? [],
      documentHeight: camera?.documentHeight ?? Number.NaN,
      drivetrain: auditCanvas.getCarAuditDrivetrain?.() ?? {
        engineLabel: "unknown",
        gear: Number.NaN,
        gearCount: Number.NaN,
        roadSpeedKph: Number.NaN,
        rpm: Number.NaN,
        variant: "unknown",
      },
      heading,
      speed: auditCanvas.getCarAuditSpeed?.() ?? Number.NaN,
      steeringAngle: auditCanvas.getCarAuditSteeringAngle?.() ?? Number.NaN,
      yawRate: auditCanvas.getCarAuditYawRate?.() ?? Number.NaN,
    };
  });

  const driveOffEdge = async (
    route: string,
    laneSelector: string,
    edge: "left" | "right",
    carLabel?: "Red city car" | "Blue rally car" | "Yellow taxi",
    keepAccelerating = false,
  ) => {
    await page.goto(route);
    await page.locator(laneSelector).scrollIntoViewIfNeeded();
    if (carLabel) await page.getByRole("button", { name: carLabel }).click();
    await page.getByRole("button", { name: "Take the little car for a drive" }).click();
    await waitForCarEngineRunning(page);
    const canvas = page.locator('canvas[class*="carCanvas"]');
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const scrollY = await page.evaluate(() => window.scrollY);
    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const sourceCenterPageY = scrollY + viewport!.height / 2;
    const progressStart = 72 + 132 / 2;
    const progressEnd = Math.max(progressStart, documentHeight - 132 / 2);
    const verticalProgress = progressEnd === progressStart
      ? 0
      : (sourceCenterPageY - progressStart) / (progressEnd - progressStart);
    await canvas.evaluate((element, pose) => {
      const auditCanvas = element as HTMLCanvasElement & {
        setCarAuditPose?: (x: number, y: number, heading: number) => void;
      };
      if (!auditCanvas.setCarAuditPose) throw new Error("Car pose audit hook is unavailable");
      auditCanvas.setCarAuditPose(pose.x, pose.y, pose.heading);
    }, {
      x: edge === "right" ? viewport!.width + 40 : -40,
      y: scrollY + viewport!.height / 2,
      heading: edge === "right" ? 0 : Math.PI,
    });
    const departureUrl = page.url();
    await page.keyboard.down("ArrowUp");
    await expect.poll(() => page.url(), { timeout: 5_000 })
      .not.toBe(departureUrl);
    if (!keepAccelerating) await page.keyboard.up("ArrowUp");
    return { screenY: viewport!.height / 2, verticalProgress };
  };

  const driveActiveCarOffEdge = async (edge: "left" | "right") => {
    const canvas = page.locator('canvas[class*="carCanvas"]');
    const departureState = await readArrivalState(canvas);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const scrollY = await page.evaluate(() => window.scrollY);
    await canvas.evaluate((element, pose) => {
      const auditCanvas = element as HTMLCanvasElement & {
        setCarAuditPose?: (x: number, y: number, heading: number) => void;
      };
      if (!auditCanvas.setCarAuditPose) throw new Error("Car pose audit hook is unavailable");
      auditCanvas.setCarAuditPose(pose.x, pose.y, pose.heading);
    }, {
      x: edge === "right" ? viewport!.width + 40 : -40,
      y: scrollY + viewport!.height / 2,
      heading: edge === "right" ? 0 : Math.PI,
    });
    const departureUrl = page.url();
    await page.keyboard.down("ArrowUp");
    await expect.poll(() => page.url(), { timeout: 5_000 })
      .not.toBe(departureUrl);
    await page.keyboard.up("ArrowUp");
    return departureState;
  };

  const firstDeparture = await driveOffEdge(
    "/?car-audit=1",
    ".secret-car-lane",
    "right",
    "Blue rally car",
    true,
  );
  await expect(page).toHaveURL(/\/projects\/dsdebug\?car-audit=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("DSDebug");
  await expectStableHorizontalViewport();
  const firstArrivalControls = page.getByLabel(
    "Car controls. Use W A S D or arrow keys to drive.",
  );
  await expect(firstArrivalControls).toBeVisible();
  const firstArrivalVehicle = page.locator('[class*="carVehicle"]');
  await expect(firstArrivalVehicle).toHaveAttribute("data-car-variant", "rally");
  const firstArrivalCanvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(async () => (await readArrivalState(firstArrivalCanvas)).angularError)
    .toBeLessThan(0.01);
  await expect.poll(async () => (await readArrivalState(firstArrivalCanvas)).drivetrain.rpm)
    .toBeGreaterThan(850);
  const firstArrivalState = await readArrivalState(firstArrivalCanvas);
  expect(firstArrivalState.drivetrain.gear).toBeGreaterThanOrEqual(1);
  expect(firstArrivalState.drivetrain.roadSpeedKph).toBeGreaterThan(0);
  expect(firstArrivalState.drivetrain.variant).toBe("rally");
  expect(firstArrivalState.drivetrain.engineLabel).toBe("Close-ratio six-speed");
  expect(firstArrivalState.drivetrain.gearCount).toBe(6);
  const arrivalProgressStart = 72 + 132 / 2;
  const arrivalProgressEnd = Math.max(
    arrivalProgressStart,
    firstArrivalState.documentHeight - 132 / 2,
  );
  const arrivalProgress = (firstArrivalState.carCenterPageY - arrivalProgressStart)
    / (arrivalProgressEnd - arrivalProgressStart || 1);
  expect(firstArrivalState.actualScrollY).toBeGreaterThan(0);
  expect(Math.abs(arrivalProgress - firstDeparture.verticalProgress)).toBeLessThan(0.015);
  expect(Math.abs(firstArrivalState.carCenterScreenY - firstDeparture.screenY)).toBeLessThan(2);
  const settledEntryBox = await firstArrivalVehicle.boundingBox();
  await page.waitForTimeout(50);
  const nextEntryBox = await firstArrivalVehicle.boundingBox();
  expect(settledEntryBox).not.toBeNull();
  expect(nextEntryBox).not.toBeNull();
  expect(Math.abs(nextEntryBox!.y - settledEntryBox!.y)).toBeLessThan(2);
  expect(settledEntryBox!.x + settledEntryBox!.width).toBeGreaterThan(0);
  expect(settledEntryBox!.x).toBeLessThan(page.viewportSize()!.width);
  expect(firstArrivalState.controls).toContain("up");
  expect(firstArrivalState.speed).toBeGreaterThan(0);
  expect(Math.abs(firstArrivalState.steeringAngle)).toBeLessThan(0.001);
  expect(Math.abs(firstArrivalState.yawRate)).toBeLessThan(0.001);
  await page.keyboard.up("ArrowUp");
  await expect.poll(async () => (await readArrivalState(firstArrivalCanvas)).controls)
    .toEqual([]);
  await firstArrivalCanvas.evaluate((element, pose) => {
    const auditCanvas = element as HTMLCanvasElement & {
      setCarAuditPose?: (x: number, y: number, heading: number) => void;
    };
    if (!auditCanvas.setCarAuditPose) throw new Error("Car pose audit hook is unavailable");
    auditCanvas.setCarAuditPose(pose.x, pose.y, pose.heading);
  }, {
    x: page.viewportSize()!.width / 2,
    y: await page.evaluate(() => window.scrollY + window.innerHeight / 2),
    heading: firstArrivalState.heading,
  });
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(220);
  const turnedArrivalState = await readArrivalState(firstArrivalCanvas);
  const clockwiseTurn = (
    (turnedArrivalState.heading - firstArrivalState.heading + Math.PI) % (Math.PI * 2)
      + Math.PI * 2
  ) % (Math.PI * 2) - Math.PI;
  expect(turnedArrivalState.controls).toEqual(expect.arrayContaining(["up", "right"]));
  expect(turnedArrivalState.yawRate).toBeGreaterThan(0);
  expect(clockwiseTurn).toBeGreaterThan(0);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ArrowUp");
  await expect.poll(() => firstArrivalVehicle.boundingBox()).not.toBeNull();
  const firstArrivalBox = await firstArrivalVehicle.boundingBox();
  expect(firstArrivalBox).not.toBeNull();

  // A second edge crossing without reloading must commit the next project,
  // not merely reposition the retained car on the current case-study page.
  const secondDepartureState = await driveActiveCarOffEdge("right");
  await expect(page).toHaveURL(/\/projects\/entity-visualization\?car-audit=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entity Visualization");
  await expectStableHorizontalViewport();
  const secondArrivalCanvas = page.locator('canvas[class*="carCanvas"]');
  const secondArrivalState = await readArrivalState(secondArrivalCanvas);
  expect(secondArrivalState.drivetrain.variant)
    .toBe(secondDepartureState.drivetrain.variant);
  expect(secondArrivalState.drivetrain.rpm)
    .toBeGreaterThanOrEqual(secondDepartureState.drivetrain.rpm - 120);

  await driveOffEdge("/projects/dsdebug?car-audit=1", ".cs-car-navigation", "left");
  await expect(page).toHaveURL(/\/\?car-audit=1#toy-car$/);
  await expectStableHorizontalViewport();

  await driveOffEdge("/?car-audit=1", ".secret-car-lane", "left");
  await expect(page).toHaveURL(/\/projects\/waydaw\?car-audit=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Waydaw");
  await expectStableHorizontalViewport();
  const lastArrivalControls = page.getByLabel(
    "Car controls. Use W A S D or arrow keys to drive.",
  );
  await expect(lastArrivalControls).toBeVisible();
  const lastArrivalVehicle = page.locator('[class*="carVehicle"]');
  const lastArrivalCanvas = page.locator('canvas[class*="carCanvas"]');
  await expect.poll(async () => (await readArrivalState(lastArrivalCanvas)).angularError)
    .toBeLessThan(0.01);
  await expect.poll(() => lastArrivalVehicle.boundingBox()).not.toBeNull();
  const lastArrivalBox = await lastArrivalVehicle.boundingBox();
  expect(lastArrivalBox).not.toBeNull();
  expect(lastArrivalBox!.x + lastArrivalBox!.width).toBeGreaterThan(0);
  expect(lastArrivalBox!.x).toBeLessThan(page.viewportSize()!.width);

  await driveOffEdge("/projects/waydaw?car-audit=1", ".cs-car-navigation", "right");
  await expect(page).toHaveURL(/\/\?car-audit=1#toy-car$/);
  await expectStableHorizontalViewport();
});

test("car structure remains intact through a deterministic 360-degree turntable", async ({ page }) => {
  await page.goto("/?car-audit=1");
  await page.locator(".secret-car-lane").scrollIntoViewIfNeeded();
  const canvas = page.locator('canvas[class*="carCanvas"]');
  const vehicle = page.locator('[class*="carVehicle"]');
  await expect(canvas).toBeVisible();

  const variants = [
    { id: "city", label: "Red city car" },
    { id: "rally", label: "Blue rally car" },
    { id: "taxi", label: "Yellow taxi" },
  ] as const;

  for (const variant of variants) {
    await page.getByRole("button", { name: variant.label }).click();
    await expect(vehicle).toHaveAttribute("data-car-variant", variant.id);
    await page.waitForTimeout(50);

    for (let degrees = 0; degrees < 360; degrees += 15) {
      const frame = await canvas.evaluate((element, angle) => {
      const auditCanvas = element as HTMLCanvasElement & {
        setCarAuditYaw?: (yaw: number) => void;
      };
      if (!auditCanvas.setCarAuditYaw) throw new Error("Car turntable hook is unavailable");
      auditCanvas.setCarAuditYaw(angle * Math.PI / 180);
      const context = auditCanvas.getContext("webgl")!;
      const { width, height } = auditCanvas;
      const data = new Uint8Array(width * height * 4);
      context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, data);
      let opaque = 0;
      let cabinDark = 0;
      let left = width;
      let right = -1;
      let top = height;
      let bottom = -1;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] === 0) continue;
        opaque += 1;
        const pixel = index / 4;
        const x = pixel % width;
        const y = height - 1 - Math.floor(pixel / width);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        if (
          y < height * 0.58
          && data[index] < 100
          && data[index + 1] < 100
          && data[index + 2] < 100
        ) cabinDark += 1;
      }
        return { bottom, cabinDark, height, left, opaque, right, top, width };
      }, degrees);

      const pose = `${variant.id} ${degrees}°`;
      expect(frame.opaque, `${pose} car silhouette`).toBeGreaterThan(1_500);
      expect(frame.cabinDark, `${pose} cabin glass`).toBeGreaterThan(100);
      expect(frame.left, `${pose} left canvas margin`).toBeGreaterThan(0);
      expect(frame.top, `${pose} top canvas margin`).toBeGreaterThan(0);
      expect(frame.right, `${pose} right canvas margin`).toBeLessThan(frame.width - 1);
      expect(frame.bottom, `${pose} bottom canvas margin`).toBeLessThan(frame.height - 1);
    }
  }
});

test("Now-page radio tunes and stops only after a user gesture", async ({ page }) => {
  await page.goto("/now");
  const radio = page.getByRole("region", { name: "Three original loops. No autoplay." });
  await radio.scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('canvas[class*="radioCanvas"]').evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("2d")!;
    return context.getImageData(0, 0, context.canvas.width, context.canvas.height).data.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  await expect(page.getByRole("button", { name: "Turn on the radio" })).toBeVisible();
  await page.getByRole("button", { name: "Turn on the radio" }).click();
  await expect(page.getByRole("button", { name: "Turn off the radio" })).toBeVisible();
  await page.getByRole("button", { name: "Next station" }).click();
  await expect(radio).toContainText("Small Machines");
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("YouTube case-study sample pad works with pointer and keyboard", async ({ page }) => {
  await page.goto("/projects/my-youtube");
  await page.locator(".cs-secret-toy").scrollIntoViewIfNeeded();
  const pad = page.getByRole("region", { name: "Make a beat while the video buffers." });
  await pad.scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('canvas[class*="launchpadCanvas"]').evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("2d")!;
    return context.getImageData(0, 0, context.canvas.width, context.canvas.height).data.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  await page.getByRole("button", { name: "1: kick" }).click();
  await expect(pad).toContainText("1 · kick");
  await pad.focus();
  await pad.press("q");
  await expect(pad).toContainText("Q · bell");
});

test("DSDebug oscilloscope exposes and completes a test trace", async ({ page }) => {
  await page.goto("/projects/dsdebug");
  await page.locator(".cs-secret-toy").scrollIntoViewIfNeeded();
  const scope = page.getByRole("region", { name: "Debug the thing you can't see." });
  await scope.scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('canvas[class*="scopeCanvas"]').evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("2d")!;
    return context.getImageData(0, 0, context.canvas.width, context.canvas.height).data.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  await page.getByRole("button", { name: "Send test pulse" }).click();
  await expect(scope).toContainText("Tracing test signal");
  await expect(scope).toContainText("Trace complete", { timeout: 2500 });
});

const phoneRoutes = [
  ["/", "#toy-car"],
  ["/now", "#toy-radio"],
  ["/projects/my-youtube", "#toy-launchpad"],
  ["/projects/dsdebug", "#toy-oscilloscope"],
] as const;

for (const [path, selector] of phoneRoutes) {
  test(`${path} secret object does not introduce horizontal overflow on phone layouts`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(path);
    // Let the intentional two-frame reload-to-top restoration settle before
    // simulating a person's later scroll to the object.
    await page.waitForTimeout(120);
    await page.locator(selector).scrollIntoViewIfNeeded();
    await expect(page.locator(`${selector} canvas`)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  });
}
