import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCarRouteTransfer,
  consumeCarRouteTransfer,
  createCarRouteTransferId,
  getCarRouteTarget,
  hasCarRouteTransfer,
  readSelectedCarVariant,
  storeSelectedCarVariant,
  storeCarRouteTransfer,
} from "../../lib/carContinuity";
import { createCarChassisState } from "../../lib/carChassis";
import {
  createCarDrivetrainState,
  updateCarDrivetrain,
} from "../../lib/carDrivetrain";
import { CAR_ENGINE_STYLES } from "../../lib/carEngineStyles";

const STORAGE_KEY = "portfolio:car-route-transfer";

function installWindow(href = "https://timcis.com/", rejectStorage = false) {
  const values = new Map<string, string>();
  const url = new URL(href);
  const storage = {
    getItem(key: string) {
      if (rejectStorage) throw new Error("storage disabled");
      return values.get(key) ?? null;
    },
    removeItem(key: string) {
      if (rejectStorage) throw new Error("storage disabled");
      values.delete(key);
    },
    setItem(key: string, value: string) {
      if (rejectStorage) throw new Error("storage disabled");
      values.set(key, value);
    },
  };
  vi.stubGlobal("window", {
    location: {
      hash: url.hash,
      href: url.href,
      pathname: url.pathname,
      search: url.search,
    },
    sessionStorage: storage,
  } as unknown as Window);
  return values;
}

function transfer(id: string) {
  return {
    id,
    entryEdge: "left" as const,
    screenY: 420,
    verticalProgress: 0.45,
    heading: Math.PI,
    speed: -240,
    variant: "city" as const,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("car route continuity", () => {
  it("matches and consumes the complete canonical destination", () => {
    installWindow();
    const id = createCarRouteTransferId();
    const target = "/projects/dsdebug?car-audit=1#drive";
    storeCarRouteTransfer(target, transfer(id));

    expect(getCarRouteTarget(target)).toBe(target);
    expect(hasCarRouteTransfer("/projects/dsdebug")).toBe(false);
    expect(consumeCarRouteTransfer("/projects/dsdebug")).toBeNull();
    expect(hasCarRouteTransfer(target)).toBe(true);
    expect(consumeCarRouteTransfer(target)).toMatchObject({ id, targetRoute: target });
    expect(hasCarRouteTransfer(target)).toBe(false);
  });

  it("only clears the transfer owned by the expected transition", () => {
    installWindow();
    storeCarRouteTransfer("/projects/dsdebug", transfer("current-transition"));

    expect(clearCarRouteTransfer("stale-transition")).toBe(false);
    expect(hasCarRouteTransfer("/projects/dsdebug")).toBe(true);
    expect(clearCarRouteTransfer("current-transition")).toBe(true);
    expect(hasCarRouteTransfer("/projects/dsdebug")).toBe(false);
  });

  it("uses the in-memory transfer when session storage is unavailable", () => {
    installWindow("https://timcis.com/", true);
    storeCarRouteTransfer("/projects/entity-visualization", transfer("memory-transition"));

    expect(consumeCarRouteTransfer("/projects/entity-visualization"))
      .toMatchObject({ id: "memory-transition" });
  });

  it("round-trips the complete dynamic state without flattening a moving car", () => {
    installWindow();
    const chassis = {
      ...createCarChassisState(0.72, 410),
      frontWheelSpeed: 428,
      rearWheelSpeed: 421,
      steeringAngle: 0.16,
      steeringCommand: 0.38,
      yawRate: 0.42,
    };
    const drivetrain = {
      ...createCarDrivetrainState(CAR_ENGINE_STYLES.rally),
      clutch: 0.93,
      forwardGear: 3,
      rpm: 3_800,
    };
    const drivetrainOutput = updateCarDrivetrain(
      drivetrain,
      CAR_ENGINE_STYLES.rally,
      {
        deltaSeconds: 1 / 180,
        engagedDirection: 1,
        signedSpeedRatio: 0.42,
        steering: 0.2,
        throttle: 1,
      },
    ).output;
    storeCarRouteTransfer("/projects/dsdebug", {
      ...transfer("dynamic-transition"),
      chassis,
      drivetrain,
      drivetrainOutput,
      visual: {
        frontLeftWheelRotation: 2.12,
        frontRightWheelRotation: 2.24,
        frontWheelRotation: 2.18,
        pitch: -0.04,
        pitchVelocity: 0.03,
        previousSpeed: 405,
        rearLeftWheelRotation: 1.97,
        rearRightWheelRotation: 2.07,
        rearWheelRotation: 2.02,
        roll: 0.08,
        rollVelocity: -0.02,
        wheelRotation: 2.1,
      },
    });

    const restored = consumeCarRouteTransfer("/projects/dsdebug");
    expect(restored?.chassis).toEqual(chassis);
    expect(restored?.drivetrain).toEqual(drivetrain);
    expect(restored?.drivetrainOutput).toEqual(drivetrainOutput);
    expect(restored?.visual).toEqual({
      frontLeftWheelRotation: 2.12,
      frontRightWheelRotation: 2.24,
      frontWheelRotation: 2.18,
      pitch: -0.04,
      pitchVelocity: 0.03,
      previousSpeed: 405,
      rearLeftWheelRotation: 1.97,
      rearRightWheelRotation: 2.07,
      rearWheelRotation: 2.02,
      roll: 0.08,
      rollVelocity: -0.02,
      wheelRotation: 2.1,
    });
  });

  it("rejects malformed or expired persisted transfers", () => {
    const values = installWindow();
    values.set(STORAGE_KEY, JSON.stringify({
      ...transfer("expired-transition"),
      targetRoute: "/projects/dsdebug",
      createdAt: Date.now() - 20_000,
    }));

    expect(hasCarRouteTransfer("/projects/dsdebug")).toBe(false);
    expect(values.has(STORAGE_KEY)).toBe(false);
  });

  it("retains the selected car independently of route-transfer consumption", () => {
    installWindow();
    storeSelectedCarVariant("taxi");
    storeCarRouteTransfer("/projects/dsdebug", {
      ...transfer("taxi-transition"),
      variant: "taxi",
    });

    expect(readSelectedCarVariant()).toBe("taxi");
    expect(consumeCarRouteTransfer("/projects/dsdebug")?.variant).toBe("taxi");
    expect(readSelectedCarVariant()).toBe("taxi");
  });

  it("uses in-memory selection when session storage is unavailable", () => {
    installWindow("https://timcis.com/", true);
    storeSelectedCarVariant("rally");
    expect(readSelectedCarVariant()).toBe("rally");
  });
});
