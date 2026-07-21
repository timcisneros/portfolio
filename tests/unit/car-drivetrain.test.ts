import { describe, expect, it } from "vitest";
import {
  createCarDrivetrainState,
  getCarWheelForceNewtons,
  getCarIgnitionState,
  getCarIgnitionThrottleAuthority,
  updateCarDrivetrain,
  type CarDrivetrainState,
} from "../../lib/carDrivetrain";
import { CAR_ENGINE_STYLES } from "../../lib/carEngineStyles";

function step(
  state: CarDrivetrainState,
  speed: number,
  throttle = 1,
  steering = 0,
) {
  return updateCarDrivetrain(state, CAR_ENGINE_STYLES.city, {
    deltaSeconds: 1 / 60,
    signedSpeedRatio: speed,
    steering,
    throttle,
  });
}

describe("car drivetrain", () => {
  it("makes selected-ratio wheel force authoritative in both directions", () => {
    const style = CAR_ENGINE_STYLES.city;
    const first = getCarWheelForceNewtons(style, 1_750, 1, 1, 1);
    const fifth = getCarWheelForceNewtons(style, 1_750, 5, 1, 1);
    const reverse = getCarWheelForceNewtons(style, 1_750, -1, -1, 1);

    expect(first).toBeGreaterThan(fifth);
    expect(fifth).toBeGreaterThan(0);
    expect(reverse).toBeLessThan(0);
    const alteredEnvelope = {
      ...style,
      physics: {
        ...style.physics,
        massKg: style.physics.massKg * 2,
      },
    };
    expect(getCarWheelForceNewtons(alteredEnvelope, 1_750, 1, 1, 1))
      .toBeCloseTo(first, 8);
    expect(first / fifth).toBeCloseTo(
      style.transmission.gears[0].ratio / style.transmission.gears[4].ratio,
      8,
    );
  });

  it("derives distinct vehicle acceleration from wheel force and mass", () => {
    const acceleration = Object.values(CAR_ENGINE_STYLES).map((style) => (
      getCarWheelForceNewtons(style, 1_750, 1, 1, 1) / style.physics.massKg
    ));

    expect(new Set(acceleration.map((value) => value.toFixed(3))).size)
      .toBe(acceleration.length);
  });

  it("uses the chassis-engaged reverse state while stationary", () => {
    const style = CAR_ENGINE_STYLES.city;
    let state = createCarDrivetrainState(style);
    let output = updateCarDrivetrain(state, style, {
      deltaSeconds: 1 / 60,
      engagedDirection: -1,
      signedSpeedRatio: 0,
      steering: 0,
      throttle: -1,
    }).output;
    for (let frame = 0; frame < 18; frame += 1) {
      const update = updateCarDrivetrain(state, style, {
        deltaSeconds: 1 / 60,
        engagedDirection: -1,
        signedSpeedRatio: 0,
        steering: 0,
        throttle: -1,
      });
      state = update.state;
      output = update.output;
    }

    expect(output.direction).toBe(-1);
    expect(output.gear).toBe(-1);
    expect(output.wheelForceNewtons).toBeLessThan(0);
  });

  it("cuts clutch torque during a completed upshift and restores it smoothly", () => {
    let state = createCarDrivetrainState(CAR_ENGINE_STYLES.city);
    let sawShift = false;
    let sawMidShift = false;
    let minimumClutch = 1;
    for (let frame = 0; frame < 180; frame += 1) {
      const update = step(state, Math.min(0.55, frame / 220));
      state = update.state;
      if (update.output.shiftState === "shifting") sawShift = true;
      if (update.output.shiftProgress > 0 && update.output.shiftProgress < 1) {
        sawMidShift = true;
      }
      minimumClutch = Math.min(minimumClutch, update.output.clutch);
    }

    expect(sawShift).toBe(true);
    expect(sawMidShift).toBe(true);
    expect(minimumClutch).toBeLessThan(0.25);
    expect(state.forwardGear).toBeGreaterThan(1);
    for (let frame = 0; frame < 30; frame += 1) state = step(state, 0.55).state;
    expect(step(state, 0.55).output.clutch).toBeCloseTo(1, 4);
  });

  it("releases the clutch before selecting the next ratio", () => {
    let state = createCarDrivetrainState(CAR_ENGINE_STYLES.city);
    let originalGear: number | null = null;
    let ratioChanged = false;
    let shiftCompleted = false;

    for (let frame = 0; frame < 240; frame += 1) {
      const update = step(state, Math.min(0.38, frame / 360));
      state = update.state;
      if (update.output.shiftState === "shifting" && originalGear === null) {
        originalGear = update.output.gear;
        expect(state.shiftTargetGear).toBe(originalGear + 1);
        expect(update.output.shiftProgress).toBe(0);
      }
      if (originalGear !== null && !ratioChanged) {
        if (update.output.shiftProgress > 0 && update.output.shiftProgress < 0.5) {
          expect(update.output.gear).toBe(originalGear);
        }
        if (update.output.shifted) {
          ratioChanged = true;
          expect(update.output.shiftProgress).toBeGreaterThanOrEqual(0.5);
          expect(update.output.gear).toBe(originalGear + 1);
          expect(update.output.clutch).toBeLessThan(0.6);
          expect(update.output.load).toBeLessThan(state.engineLoad);
        }
      }
      if (ratioChanged && update.output.shiftState === "steady") {
        shiftCompleted = true;
        expect(state.shiftTargetGear).toBeNull();
        break;
      }
    }

    expect(originalGear).toBe(1);
    expect(ratioChanged).toBe(true);
    expect(shiftCompleted).toBe(true);
  });

  it("models crank, catch, flare, and settling before a stable idle", () => {
    const style = CAR_ENGINE_STYLES.city;
    const crank = getCarIgnitionState(style, 0.08);
    const catching = getCarIgnitionState(style, 0.42);
    const flare = getCarIgnitionState(style, 0.66);
    const settling = getCarIgnitionState(style, 0.94);
    const running = getCarIgnitionState(style, 1.12);

    expect(crank.phase).toBe("cranking");
    expect(crank.rpm).toBeLessThan(style.rpm.idle);
    expect(catching.phase).toBe("catching");
    expect(catching.rpmVelocity).toBeGreaterThan(0);
    expect(flare.phase).toBe("flaring");
    expect(flare.rpm).toBeGreaterThan(style.rpm.idle * 1.35);
    expect(settling.phase).toBe("settling");
    expect(settling.rpmVelocity).toBeLessThan(0);
    expect(running).toMatchObject({
      phase: "running",
      progress: 1,
      rpm: style.rpm.idle,
      rpmVelocity: 0,
    });
  });

  it("releases held throttle progressively after combustion catches", () => {
    expect(getCarIgnitionThrottleAuthority(0.4, 0.58, 1.12)).toBe(0);
    expect(getCarIgnitionThrottleAuthority(0.85, 0.58, 1.12)).toBeCloseTo(0.5);
    expect(getCarIgnitionThrottleAuthority(1.12, 0.58, 1.12)).toBe(1);
  });

  it("balances firing torque, pumping loss, and clutch reaction without RPM flutter", () => {
    const style = CAR_ENGINE_STYLES.city;
    let state = createCarDrivetrainState(style);
    for (let frame = 0; frame < 50; frame += 1) {
      state = step(state, 0, 1).state;
    }
    const loadedRpm = state.rpm;
    expect(loadedRpm).toBeGreaterThanOrEqual(style.rpm.idle);
    const torqueFrame = step(state, 0, 1).output;
    expect(torqueFrame.crankNetTorqueNm).toBeCloseTo(
      torqueFrame.combustionTorqueNm
        + torqueFrame.idleGovernorTorqueNm
        + torqueFrame.clutchReactionTorqueNm
        - torqueFrame.pumpingTorqueNm
        - torqueFrame.drivenReactionTorqueNm,
      8,
    );
    expect(torqueFrame.combustionTorqueNm).toBeGreaterThan(0);
    expect(torqueFrame.pumpingTorqueNm).toBeGreaterThan(0);

    let previousRpm = state.rpm;
    let previousDirection = 0;
    let directionChanges = 0;
    for (let frame = 0; frame < 80; frame += 1) {
      state = step(state, 0, 0).state;
      const delta = state.rpm - previousRpm;
      const direction = Math.abs(delta) <= 0.5 ? 0 : Math.sign(delta);
      if (direction && previousDirection && direction !== previousDirection) {
        directionChanges += 1;
      }
      if (direction) previousDirection = direction;
      previousRpm = state.rpm;
    }
    expect(directionChanges).toBeLessThanOrEqual(1);
    expect(state.rpm - style.rpm.idle).toBeLessThan(25);
  });

  it("keeps the torque integration stable across ordinary frame rates", () => {
    const style = CAR_ENGINE_STYLES.city;
    const simulate = (deltaSeconds: number, frames: number) => {
      let state = {
        ...createCarDrivetrainState(style),
        shiftCooldownSeconds: 10,
      };
      for (let frame = 0; frame < frames; frame += 1) {
        state = updateCarDrivetrain(state, style, {
          deltaSeconds,
          signedSpeedRatio: 0.32,
          steering: 0,
          throttle: 0.6,
        }).state;
      }
      return state;
    };
    const sixtyFps = simulate(1 / 60, 120);
    const thirtyFps = simulate(1 / 30, 60);
    expect(Math.abs(sixtyFps.rpm - thirtyFps.rpm)).toBeLessThan(20);
    expect(Math.abs(sixtyFps.clutch - thirtyFps.clutch)).toBeLessThan(0.01);
  });

  it("holds the selected gear while service braking", () => {
    let state = createCarDrivetrainState(CAR_ENGINE_STYLES.city);
    for (let frame = 0; frame < 180; frame += 1) {
      state = step(state, Math.min(0.62, frame / 190)).state;
    }
    const gear = state.forwardGear;
    for (let frame = 0; frame < 60; frame += 1) {
      const update = step(state, 0.3, -1);
      state = update.state;
      expect(update.output.braking).toBe(true);
      expect(update.output.shiftState).toBe("steady");
    }
    expect(state.forwardGear).toBe(gear);
    for (let frame = 0; frame < 24; frame += 1) {
      const update = step(state, 0.3, 0);
      state = update.state;
      expect(update.output.shiftState).toBe("steady");
    }
    expect(state.forwardGear).toBe(gear);
  });

  it("models reverse as a lower-RPM single gear", () => {
    let state = createCarDrivetrainState(CAR_ENGINE_STYLES.rally);
    const update = updateCarDrivetrain(state, CAR_ENGINE_STYLES.rally, {
      deltaSeconds: 1 / 60,
      signedSpeedRatio: -0.8,
      steering: 0,
      throttle: -1,
    });
    state = update.state;

    expect(update.output.gear).toBe(-1);
    expect(update.output.roadSpeedKph).toBeLessThan(0);
    expect(update.output.targetRpm).toBeLessThan(CAR_ENGINE_STYLES.rally.rpm.maximum);
    expect(state.forwardGear).toBe(1);
  });

  it("suppresses shifting under sustained cornering load", () => {
    let state = createCarDrivetrainState(CAR_ENGINE_STYLES.city);
    for (let frame = 0; frame < 90; frame += 1) {
      state = step(state, 0.25, 1, 1).state;
    }
    expect(state.forwardGear).toBeLessThanOrEqual(2);
    expect(state.shiftCandidateGear).toBeNull();
  });

  it("takes up a partially engaged launch clutch without underspeed", () => {
    const style = CAR_ENGINE_STYLES.city;
    let state = createCarDrivetrainState(style);
    for (let frame = 0; frame < 18; frame += 1) {
      state = step(state, 0, 1).state;
    }
    const launch = step(state, 0, 1).output;

    expect(launch.rpm).toBeGreaterThanOrEqual(style.rpm.idle);
    expect(launch.clutch).toBeGreaterThan(0.35);
    expect(launch.clutch).toBeLessThanOrEqual(0.8);
    expect(launch.clutchSlipRpm).toBeGreaterThan(100);
    expect(launch.torqueFactor).toBeGreaterThan(0.35);
    expect(launch.torqueFactor).toBeLessThan(launch.clutch);
  });

  it("gives a torque converter more launch slip and a softer shift release", () => {
    let manual = createCarDrivetrainState(CAR_ENGINE_STYLES.city);
    let automatic = createCarDrivetrainState(CAR_ENGINE_STYLES.taxi);
    for (let frame = 0; frame < 18; frame += 1) {
      manual = updateCarDrivetrain(manual, CAR_ENGINE_STYLES.city, {
        deltaSeconds: 1 / 60,
        signedSpeedRatio: 0,
        steering: 0,
        throttle: 1,
      }).state;
      automatic = updateCarDrivetrain(automatic, CAR_ENGINE_STYLES.taxi, {
        deltaSeconds: 1 / 60,
        signedSpeedRatio: 0,
        steering: 0,
        throttle: 1,
      }).state;
    }
    expect(automatic.clutch).toBeLessThan(manual.clutch);

    automatic = { ...automatic, clutch: 1, shiftSecondsRemaining: 0.12 };
    const shifting = updateCarDrivetrain(automatic, CAR_ENGINE_STYLES.taxi, {
      deltaSeconds: 1 / 60,
      signedSpeedRatio: 0.45,
      steering: 0,
      throttle: 1,
    }).output;
    const taxiCoupling = CAR_ENGINE_STYLES.taxi.transmission.coupling;
    if (taxiCoupling.kind !== "torque-converter") {
      throw new Error("Taxi transmission must use a torque converter");
    }
    expect(shifting.clutch)
      .toBeGreaterThan(taxiCoupling.shiftCoupling * 0.9);
    expect(shifting.clutch).toBeLessThan(1);
  });

  it("takes up torque continuously after selecting a new direction", () => {
    const style = CAR_ENGINE_STYLES.city;
    let state = createCarDrivetrainState(style);
    for (let frame = 0; frame < 45; frame += 1) {
      state = updateCarDrivetrain(state, style, {
        deltaSeconds: 1 / 180,
        engagedDirection: 1,
        signedSpeedRatio: 0,
        steering: 0,
        throttle: 1,
      }).state;
    }
    expect(state.directionCoupling).toBe(1);

    const selectedReverse = updateCarDrivetrain(state, style, {
      deltaSeconds: 1 / 180,
      engagedDirection: -1,
      signedSpeedRatio: 0,
      steering: 0,
      throttle: -1,
    });
    expect(selectedReverse.state.directionCoupling).toBe(0);
    expect(selectedReverse.output.wheelForceNewtons).toBe(0);

    let takingUp = selectedReverse.state;
    for (let frame = 0; frame < 12; frame += 1) {
      takingUp = updateCarDrivetrain(takingUp, style, {
        deltaSeconds: 1 / 180,
        engagedDirection: -1,
        signedSpeedRatio: 0,
        steering: 0,
        throttle: -1,
      }).state;
    }
    expect(takingUp.directionCoupling).toBeGreaterThan(0);
    expect(takingUp.directionCoupling).toBeLessThanOrEqual(1);
  });

  it("hydrates direction coupling safely from an older route snapshot", () => {
    const style = CAR_ENGINE_STYLES.city;
    const legacy = {
      ...createCarDrivetrainState(style),
      directionCoupling: undefined,
      lastDirection: undefined,
    } as unknown as CarDrivetrainState;
    const update = updateCarDrivetrain(legacy, style, {
      deltaSeconds: 1 / 180,
      engagedDirection: 1,
      signedSpeedRatio: 0.2,
      steering: 0,
      throttle: 1,
    });

    expect(Number.isFinite(update.state.directionCoupling)).toBe(true);
    expect([-1, 0, 1]).toContain(update.state.lastDirection);
    expect(Number.isFinite(update.output.wheelForceNewtons)).toBe(true);
  });

  it("keeps every keyboard-driven transmission at rest without pedal demand", () => {
    const settle = (style: typeof CAR_ENGINE_STYLES.city) => {
      let state = createCarDrivetrainState(style);
      for (let frame = 0; frame < 90; frame += 1) {
        state = updateCarDrivetrain(state, style, {
          deltaSeconds: 1 / 180,
          engagedDirection: 1,
          signedSpeedRatio: 0,
          steering: 0,
          throttle: 0,
        }).state;
      }
      return updateCarDrivetrain(state, style, {
        deltaSeconds: 1 / 180,
        engagedDirection: 1,
        signedSpeedRatio: 0,
        steering: 0,
        throttle: 0,
      }).output;
    };

    expect(settle(CAR_ENGINE_STYLES.city).torqueFactor).toBe(0);
    expect(settle(CAR_ENGINE_STYLES.taxi).torqueFactor).toBe(0);
  });

  it("locks the converter while cruising and releases lockup under load", () => {
    const style = CAR_ENGINE_STYLES.taxi;
    const coupling = style.transmission.coupling;
    if (coupling.kind !== "torque-converter") {
      throw new Error("Taxi transmission must use a torque converter");
    }
    const settle = (speed: number, throttle: number) => {
      let state = {
        ...createCarDrivetrainState(style),
        shiftCooldownSeconds: 10,
      };
      for (let frame = 0; frame < 150; frame += 1) {
        state = updateCarDrivetrain(state, style, {
          deltaSeconds: 1 / 60,
          signedSpeedRatio: speed,
          steering: 0,
          throttle,
        }).state;
      }
      return updateCarDrivetrain(state, style, {
        deltaSeconds: 1 / 60,
        signedSpeedRatio: speed,
        steering: 0,
        throttle,
      }).output;
    };

    const stall = settle(0, 1);
    const cruise = settle(0.62, 0.25);
    const accelerating = settle(0.62, 1);

    expect(stall.clutch).toBeCloseTo(coupling.stallCoupling, 2);
    expect(stall.torqueFactor).toBeGreaterThan(0.65);
    expect(stall.torqueFactor).toBeGreaterThan(stall.clutch);
    expect(stall.wheelForceNewtons).toBeGreaterThan(0);
    expect(cruise.clutch)
      .toBeCloseTo(coupling.fluidCoupling, 2);
    expect(cruise.lockup).toBeGreaterThan(accelerating.lockup);
    expect(cruise.lockup).toBeGreaterThan(0.8);
    expect(accelerating.clutch).toBeGreaterThan(0.8);
    expect(accelerating.load).toBeGreaterThan(cruise.load);
  });

  it("keeps closed-throttle overrun separate from the service brake", () => {
    let state = createCarDrivetrainState(CAR_ENGINE_STYLES.city);
    for (let frame = 0; frame < 90; frame += 1) {
      state = step(state, Math.min(0.5, frame / 140), 1).state;
    }
    for (let frame = 0; frame < 45; frame += 1) {
      state = step(state, 0.5, 1).state;
    }
    let coasting = step(state, 0.49, 0);
    for (let frame = 0; frame < 14; frame += 1) {
      coasting = step(coasting.state, 0.49, 0);
    }
    const braking = step(coasting.state, 0.42, -1);

    expect(coasting.output.serviceBraking).toBe(false);
    expect(coasting.output.overrun).toBeGreaterThan(0.5);
    expect(braking.output.serviceBraking).toBe(true);
    expect(braking.output.overrun).toBeGreaterThan(0.5);
    expect(braking.output.torqueFactor).toBe(0);
  });

  it("keeps an uncoupled overrun snapshot passive", () => {
    const style = CAR_ENGINE_STYLES.city;
    let state = {
      ...createCarDrivetrainState(style),
      clutch: 1,
      engineLoad: 0.8,
      lastLoad: 0.8,
      lastSpeedRatio: 0.45,
      rpm: 3_200,
    };
    let output = updateCarDrivetrain(state, style, {
      deltaSeconds: 1 / 180,
      engagedDirection: 1,
      signedSpeedRatio: 0.45,
      steering: 0,
      throttle: 0,
    }).output;
    for (let frame = 0; frame < 40; frame += 1) {
      const update = updateCarDrivetrain(state, style, {
        deltaSeconds: 1 / 180,
        engagedDirection: 1,
        signedSpeedRatio: 0.44,
        steering: 0,
        throttle: 0,
      });
      state = update.state;
      output = update.output;
    }

    expect(output.serviceBraking).toBe(false);
    expect(output.overrun).toBeGreaterThan(0.4);
    expect(output.wheelForceNewtons).toBeLessThanOrEqual(0);
    expect(Math.abs(output.wheelForceNewtons)).toBeLessThanOrEqual(
      style.physics.maximumEngineBrakeWheelTorqueNm
        / style.physics.wheelRadiusM,
    );
  });

  it("keeps fixed-step drivetrain integration consistent with display cadence", () => {
    const style = CAR_ENGINE_STYLES.city;
    const simulate = (deltaSeconds: number, frames: number) => {
      let state = {
        ...createCarDrivetrainState(style),
        shiftCooldownSeconds: 10,
      };
      for (let frame = 0; frame < frames; frame += 1) {
        state = updateCarDrivetrain(state, style, {
          deltaSeconds,
          engagedDirection: 1,
          signedSpeedRatio: 0.28,
          steering: 0.15,
          throttle: 0.62,
        }).state;
      }
      return state;
    };
    const atSixty = simulate(1 / 60, 120);
    const atPhysicsRate = simulate(1 / 180, 360);

    expect(Math.abs(atSixty.rpm - atPhysicsRate.rpm)).toBeLessThan(25);
    expect(Math.abs(atSixty.clutch - atPhysicsRate.clutch)).toBeLessThan(0.015);
    expect(Math.abs(atSixty.engineLoad - atPhysicsRate.engineLoad)).toBeLessThan(0.01);
  });

  it("couples engine RPM to driven-wheel speed during tire slip", () => {
    const style = CAR_ENGINE_STYLES.city;
    const state = {
      ...createCarDrivetrainState(style),
      clutch: 1,
      engineLoad: 0.7,
      lastLoad: 0.7,
      rpm: 2_000,
      shiftCooldownSeconds: 10,
    };
    const gripping = updateCarDrivetrain(state, style, {
      deltaSeconds: 1 / 180,
      drivenWheelSpeedRatio: 0.25,
      engagedDirection: 1,
      signedSpeedRatio: 0.25,
      steering: 0,
      throttle: 0.7,
    }).output;
    const spinning = updateCarDrivetrain(state, style, {
      deltaSeconds: 1 / 180,
      drivenWheelSpeedRatio: 0.48,
      engagedDirection: 1,
      signedSpeedRatio: 0.25,
      steering: 0,
      throttle: 0.7,
    }).output;

    expect(spinning.targetRpm).toBeGreaterThan(gripping.targetRpm);
    expect(spinning.roadSpeedKph).toBe(gripping.roadSpeedKph);
  });

  it("preserves simultaneous-pedal braking as an explicit drivetrain input", () => {
    const style = CAR_ENGINE_STYLES.city;
    const state = {
      ...createCarDrivetrainState(style),
      engineLoad: 0.9,
      lastLoad: 0.9,
      lastSpeedRatio: 0.02,
      rpm: style.rpm.idle + 500,
    };
    const braking = updateCarDrivetrain(state, style, {
      deltaSeconds: 1 / 60,
      serviceBrake: true,
      signedSpeedRatio: 0.015,
      steering: 0,
      throttle: 0,
    }).output;
    expect(braking.serviceBraking).toBe(true);
    expect(braking.rapidRpmRecovery).toBe(true);
    expect(braking.torqueFactor).toBe(0);
  });

  it("does not reinterpret an explicit chassis brake decision", () => {
    const style = CAR_ENGINE_STYLES.city;
    const output = updateCarDrivetrain(
      createCarDrivetrainState(style),
      style,
      {
        deltaSeconds: 1 / 60,
        engagedDirection: 1,
        serviceBrake: false,
        signedSpeedRatio: 0.1,
        steering: 0,
        throttle: -1,
      },
    ).output;
    expect(output.serviceBraking).toBe(false);
    expect(output.braking).toBe(false);
  });

  it("distinguishes a coast from hard braking and settles RPM with the stopped car", () => {
    const style = CAR_ENGINE_STYLES.city;
    let state = createCarDrivetrainState(style);
    for (let frame = 0; frame < 90; frame += 1) {
      state = step(state, Math.min(0.62, frame / 120), 1).state;
    }

    const coasting = step(state, 0.615, 0);
    expect(coasting.output.hardDeceleration).toBe(false);
    expect(coasting.output.rapidRpmRecovery).toBe(false);

    const braking = step(state, 0.52, -1);
    expect(braking.output.braking).toBe(true);
    expect(braking.output.hardDeceleration).toBe(true);
    expect(braking.output.decelerationRate).toBeGreaterThan(1.2);

    const stopped = step(braking.state, 0, 0);
    expect(stopped.output.abruptStop).toBe(true);
    expect(stopped.output.rapidRpmRecovery).toBe(true);
    state = stopped.state;
    for (let frame = 0; frame < 240; frame += 1) {
      state = step(state, 0, 0).state;
    }
    expect(state.rpm - style.rpm.idle).toBeLessThan(100);
  });

  it("uses a hysteretic combustion cut instead of a smooth redline clamp", () => {
    const style = CAR_ENGINE_STYLES.city;
    const initial = {
      ...createCarDrivetrainState(style),
      clutch: 1,
      engineLoad: 1,
      lastLoad: 1,
      lastSpeedRatio: 0.95,
      rpm: style.combustion.limiterStartRpm + 20,
    };
    const cutting = updateCarDrivetrain(initial, style, {
      deltaSeconds: 1 / 60,
      signedSpeedRatio: 0.95,
      steering: 0,
      throttle: 1,
    });
    expect(cutting.state.limiterActive).toBe(true);
    expect(cutting.output.limiterCut).toBe(1);
    expect(cutting.output.targetRpm).toBeLessThanOrEqual(
      style.combustion.limiterResumeRpm,
    );
    expect(cutting.output.torqueFactor).toBeLessThan(0.2);

    const recovered = updateCarDrivetrain({
      ...cutting.state,
      rpm: style.combustion.limiterResumeRpm - 10,
    }, style, {
      deltaSeconds: 1 / 60,
      signedSpeedRatio: 0.8,
      steering: 0,
      throttle: 0.2,
    });
    expect(recovered.state.limiterActive).toBe(false);
    expect(recovered.output.limiterCut).toBe(0);
  });
});
