import { describe, expect, it } from "vitest";
import {
  createCarChassisState,
  stepCarChassis,
} from "../../lib/carChassis";
import { stepCarDynamics, type CarDynamicsState } from "../../lib/carDynamics";
import {
  CAR_ENGINE_STYLES,
  getCarMaximumBrakeDecelerationPage,
  getCarMaximumPageSpeed,
  type CarEngineStyle,
} from "../../lib/carEngineStyles";
import {
  CAR_PHYSICAL_GEOMETRY,
  CAR_VISUAL_GEOMETRY,
  getCarCollisionHalfLength,
  getCarGeometryFrame,
  getCarYawInertiaKgM2,
} from "../../lib/carGeometry";
import {
  createCarDrivetrainState,
  updateCarDrivetrain,
} from "../../lib/carDrivetrain";

const STEP = 1 / 180;

function createDynamics(style: CarEngineStyle): CarDynamicsState {
  return {
    chassis: createCarChassisState(0),
    drivetrain: createCarDrivetrainState(style),
  };
}

function advance(
  state: CarDynamicsState,
  style: CarEngineStyle,
  frames: number,
  input: { steering: number; throttle: number },
) {
  let next = state;
  for (let frame = 0; frame < frames; frame += 1) {
    next = stepCarDynamics(next, style, {
      deltaSeconds: STEP,
      ...input,
    }).state;
  }
  return next;
}

describe("authoritative car dynamics", () => {
  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label conserves vehicle weight through a combined-limit maneuver",
    (style) => {
      let state = createDynamics(style);
      let minimumObservedLoad = Number.POSITIVE_INFINITY;
      for (let frame = 0; frame < 420; frame += 1) {
        const input = frame < 180
          ? { steering: 0.82, throttle: 1 }
          : frame < 300
            ? { steering: -0.72, throttle: 0.55 }
            : { steering: 0.58, throttle: -1 };
        state = stepCarDynamics(state, style, {
          deltaSeconds: STEP,
          ...input,
        }).state;
        const loads = [
          state.chassis.frontLeftLoadNewtons,
          state.chassis.frontRightLoadNewtons,
          state.chassis.rearLeftLoadNewtons,
          state.chassis.rearRightLoadNewtons,
        ];
        minimumObservedLoad = Math.min(minimumObservedLoad, ...loads);
        expect(loads.reduce((sum, load) => sum + load, 0), style.label)
          .toBeCloseTo(style.physics.massKg * 9.81, 6);
      }
      expect(minimumObservedLoad, style.label)
        .toBeGreaterThanOrEqual(style.physics.massKg * 9.81 * 0.025 - 0.001);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label settles its rack after a released keyboard steering command",
    (style) => {
      let state = advance(createDynamics(style), style, 150, {
        steering: 0,
        throttle: 1,
      });
      state = advance(state, style, 70, { steering: 0.75, throttle: 0.55 });
      const releasedAngle = Math.abs(state.chassis.steeringAngle);
      let signChanges = 0;
      let previousSign = Math.sign(state.chassis.steeringAngle);
      for (let frame = 0; frame < 210; frame += 1) {
        state = stepCarDynamics(state, style, {
          deltaSeconds: STEP,
          steering: 0,
          throttle: 0.25,
        }).state;
        const sign = Math.abs(state.chassis.steeringAngle) < 0.002
          ? 0
          : Math.sign(state.chassis.steeringAngle);
        if (sign !== 0 && previousSign !== 0 && sign !== previousSign) signChanges += 1;
        if (sign !== 0) previousSign = sign;
      }
      expect(Math.abs(state.chassis.steeringAngle), style.label)
        .toBeLessThan(releasedAngle * 0.16);
      expect(signChanges, style.label).toBeLessThanOrEqual(1);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label does not gain artificial speed from sustained cornering",
    (style) => {
      const launched = advance(createDynamics(style), style, 170, {
        steering: 0,
        throttle: 1,
      });
      const straight = advance(launched, style, 180, { steering: 0, throttle: 0.7 });
      const corner = advance(launched, style, 180, { steering: 0.72, throttle: 0.7 });
      const straightSpeed = Math.hypot(
        straight.chassis.velocityX,
        straight.chassis.velocityY,
      );
      const cornerSpeed = Math.hypot(
        corner.chassis.velocityX,
        corner.chassis.velocityY,
      );
      expect(cornerSpeed, style.label).toBeLessThanOrEqual(straightSpeed * 1.015);
      expect(cornerSpeed, style.label)
        .toBeLessThan(getCarMaximumPageSpeed(style, 1));
    },
  );

  it("uses the configured driven axle when carrier speeds diverge", () => {
    const style = CAR_ENGINE_STYLES.city;
    const previous = {
      ...createCarDrivetrainState(style),
      clutch: 1,
      directionCoupling: 1,
      engineLoad: 0.45,
      lastDirection: 1 as const,
    };
    const input = {
      deltaSeconds: STEP,
      engagedDirection: 1 as const,
      serviceBrake: false,
      signedSpeedRatio: 0.35,
      steering: 0,
      throttle: 0.5,
    };
    const frontFast = updateCarDrivetrain(previous, style, {
      ...input,
      drivenAxleSpeedRatios: { front: 0.55, rear: 0.1 },
    });
    const rearFast = updateCarDrivetrain(previous, style, {
      ...input,
      drivenAxleSpeedRatios: { front: 0.1, rear: 0.55 },
    });
    expect(frontFast.output.targetRpm).toBeGreaterThan(rearFast.output.targetRpm);
  });
  it("reflects only driven contact-patch load into the crankshaft", () => {
    const style = CAR_ENGINE_STYLES.city;
    const previous = {
      ...createCarDrivetrainState(style),
      clutch: 1,
      directionCoupling: 1,
      engineLoad: 0.65,
      lastDirection: 1 as const,
      lastSpeedRatio: 0.32,
      rpm: 2_400,
    };
    const input = {
      deltaSeconds: 1 / 60,
      drivenAxleSpeedRatios: { front: 0.32, rear: 0.32 },
      engagedDirection: 1 as const,
      serviceBrake: false,
      signedSpeedRatio: 0.32,
      steering: 0,
      throttle: 0.65,
    };
    const unloaded = updateCarDrivetrain(previous, style, input);
    const frontLoaded = updateCarDrivetrain(previous, style, {
      ...input,
      drivenContactForcesNewtons: { front: 3_200, rear: 0 },
    });
    const rearLoaded = updateCarDrivetrain(previous, style, {
      ...input,
      drivenContactForcesNewtons: { front: 0, rear: 3_200 },
    });

    expect(frontLoaded.output.drivenReactionTorqueNm).toBeGreaterThan(0);
    expect(frontLoaded.output.drivenContactReactionTorqueNm)
      .toBe(frontLoaded.output.drivenReactionTorqueNm);
    expect(frontLoaded.state.reactionTorqueNm)
      .toBe(frontLoaded.output.drivenContactReactionTorqueNm);
    expect(rearLoaded.output.drivenReactionTorqueNm).toBe(0);
  });

  it("reflects driven-wheel rotational inertia into crankshaft load", () => {
    const style = CAR_ENGINE_STYLES.city;
    const previous = {
      ...createCarDrivetrainState(style),
      clutch: 1,
      directionCoupling: 1,
      engineLoad: 0.65,
      lastDirection: 1 as const,
      lastSpeedRatio: 0.32,
      rpm: 2_400,
    };
    const input = {
      deltaSeconds: 1 / 60,
      drivenAxleSpeedRatios: { front: 0.32, rear: 0.32 },
      engagedDirection: 1 as const,
      serviceBrake: false,
      signedSpeedRatio: 0.32,
      steering: 0,
      throttle: 0.65,
    };
    const unloaded = updateCarDrivetrain(previous, style, input);
    const frontAccelerating = updateCarDrivetrain(previous, style, {
      ...input,
      drivenAxleAccelerationsMps2: { front: 12, rear: 0 },
    });
    const rearAccelerating = updateCarDrivetrain(previous, style, {
      ...input,
      drivenAxleAccelerationsMps2: { front: 0, rear: 12 },
    });

    expect(frontAccelerating.output.drivenRotationalReactionTorqueNm)
      .toBeGreaterThan(0);
    expect(frontAccelerating.output.drivenContactReactionTorqueNm).toBe(0);
    expect(frontAccelerating.output.drivenReactionTorqueNm).toBeCloseTo(
      frontAccelerating.output.drivenRotationalReactionTorqueNm,
      8,
    );
    expect(frontAccelerating.output.drivenReactionTorqueNm)
      .toBeGreaterThan(unloaded.output.drivenReactionTorqueNm);
    expect(rearAccelerating.output.drivenRotationalReactionTorqueNm).toBe(0);
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label ramps braking without accelerating through its direction handoff",
    (style) => {
      let state = advance(createDynamics(style), style, 210, {
        steering: 0,
        throttle: 1,
      });
      const entrySpeed = Math.hypot(
        state.chassis.velocityX,
        state.chassis.velocityY,
      );
      let maximumAccelerationStep = 0;
      let previousAcceleration = state.chassis.longitudinalAcceleration;
      let sawReverse = false;
      for (let frame = 0; frame < 300; frame += 1) {
        state = stepCarDynamics(state, style, {
          deltaSeconds: STEP,
          steering: 0.22,
          throttle: -1,
        }).state;
        maximumAccelerationStep = Math.max(
          maximumAccelerationStep,
          Math.abs(state.chassis.longitudinalAcceleration - previousAcceleration),
        );
        previousAcceleration = state.chassis.longitudinalAcceleration;
        const speed = Math.hypot(state.chassis.velocityX, state.chassis.velocityY);
        expect(speed, style.label).toBeLessThanOrEqual(
          Math.max(entrySpeed * 1.01, getCarMaximumPageSpeed(style, -1)),
        );
        if (state.chassis.driveDirection < 0) {
          sawReverse = true;
          expect(state.chassis.brakePressure, style.label).toBeLessThan(0.5);
        }
      }
      expect(sawReverse, style.label).toBe(true);
      expect(maximumAccelerationStep, style.label)
        .toBeLessThan(getCarMaximumBrakeDecelerationPage(style) * 1.15);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label preserves physical yaw while crossing the crawl-speed envelope",
    (style) => {
      const chassis = {
        ...createCarChassisState(0, 0.8),
        driveDirection: 1 as const,
        restState: "rolling" as const,
        yawRate: 0.16,
      };
      const result = stepCarDynamics(
        { chassis, drivetrain: createCarDrivetrainState(style) },
        style,
        {
          deltaSeconds: STEP,
          engineRunning: false,
          steering: 0,
          throttle: 1,
        },
      ).state.chassis;

      expect(Math.abs(result.yawRate), style.label).toBeGreaterThan(0.05);
      expect(result.yawLimiterActivity, style.label).toBe(0);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label keeps its numerical yaw guard inactive in an ordinary slalom",
    (style) => {
      let state = createDynamics(style);
      let maximumLimiterActivity = 0;
      for (let frame = 0; frame < 540; frame += 1) {
        const steering = frame < 150
          ? 0
          : Math.floor((frame - 150) / 78) % 2 === 0 ? 0.72 : -0.72;
        state = stepCarDynamics(state, style, {
          deltaSeconds: STEP,
          steering,
          throttle: frame < 150 ? 1 : 0.62,
        }).state;
        maximumLimiterActivity = Math.max(
          maximumLimiterActivity,
          state.chassis.yawLimiterActivity,
        );
      }

      expect(maximumLimiterActivity, style.label).toBeLessThan(0.01);
      expect(Number.isFinite(state.chassis.heading), style.label).toBe(true);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label applies predicted tire force to same-step pitch and roll transfer",
    (style) => {
      const base = {
        ...createCarChassisState(0, 120),
        driveDirection: 1 as const,
        restState: "rolling" as const,
      };
      const input = {
        deltaSeconds: STEP,
        steering: 0.45,
        throttle: 0.65,
        wheelForceNewtons: style.physics.massKg * 4,
      };
      let measuredOnly: CarDynamicsState["chassis"] = base;
      let predicted: CarDynamicsState["chassis"] = base;
      for (let frame = 0; frame < 6; frame += 1) {
        measuredOnly = stepCarChassis(measuredOnly, style, input).state;
        predicted = stepCarChassis(predicted, style, {
          ...input,
          steeringForcePreview: {
            ...predicted,
            lateralAcceleration: 20 * style.physics.worldPixelsPerMeter,
            longitudinalAcceleration: 7 * style.physics.worldPixelsPerMeter,
          },
        }).state;
      }

      expect(Math.abs(predicted.longitudinalLoadTransfer), style.label)
        .toBeGreaterThan(Math.abs(measuredOnly.longitudinalLoadTransfer));
      expect(Math.abs(predicted.lateralLoadTransfer), style.label)
        .toBeGreaterThan(Math.abs(measuredOnly.lateralLoadTransfer));
    },
  );

  it("gates the named mechanical energy ledger behind explicit audit mode", () => {
    const initial = createDynamics(CAR_ENGINE_STYLES.city);
    const production = stepCarDynamics(initial, CAR_ENGINE_STYLES.city, {
      deltaSeconds: STEP,
      steering: 0,
      throttle: 1,
    });
    const audited = stepCarDynamics(initial, CAR_ENGINE_STYLES.city, {
      deltaSeconds: STEP,
      detailedDiagnostics: true,
      steering: 0,
      throttle: 1,
    });

    expect(production.diagnostics.energy).toBeNull();
    expect(audited.diagnostics.energy).not.toBeNull();
    const energy = audited.diagnostics.energy!;
    expect(Object.keys(energy).sort()).toEqual([
      "balanceResidualJ",
      "brakeLossJ",
      "clutchSlipLossJ",
      "combustionWorkJ",
      "contactConstraintLossJ",
      "differentialCouplingLossJ",
      "drivelineWorkJ",
      "idleGovernorWorkJ",
      "inputShaftEnergyJ",
      "pumpingLossJ",
      "resistanceLossJ",
      "shaftDampingLossJ",
      "shaftPotentialEnergyJ",
      "shiftOverlapLossJ",
      "storedEnergyDeltaJ",
      "storedEnergyJ",
      "synchronizerLossJ",
      "tireSlipLossJ",
    ]);
    [
      energy.brakeLossJ,
      energy.clutchSlipLossJ,
      energy.combustionWorkJ,
      energy.contactConstraintLossJ,
      energy.differentialCouplingLossJ,
      energy.idleGovernorWorkJ,
      energy.inputShaftEnergyJ,
      energy.pumpingLossJ,
      energy.resistanceLossJ,
      energy.shaftDampingLossJ,
      energy.shaftPotentialEnergyJ,
      energy.shiftOverlapLossJ,
      energy.storedEnergyJ,
      energy.synchronizerLossJ,
      energy.tireSlipLossJ,
    ].forEach((value) => expect(value).toBeGreaterThanOrEqual(0));
    expect(Number.isFinite(energy.balanceResidualJ)).toBe(true);
    expect(Number.isFinite(energy.drivelineWorkJ)).toBe(true);
    expect(Number.isFinite(energy.storedEnergyDeltaJ)).toBe(true);
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label keeps applied force, retained state, and bounded correction aligned",
    (style) => {
      let state = createDynamics(style);
      let secondCorrections = 0;
      let maximumResidualRatio = 0;
      for (let frame = 0; frame < 720; frame += 1) {
        const input = frame < 180
          ? { steering: 0, throttle: 1 }
          : frame < 360
            ? {
                steering: Math.floor((frame - 180) / 45) % 2 === 0
                  ? 0.68
                  : -0.68,
                throttle: 0.62,
              }
            : frame < 500
              ? { steering: 0, throttle: 0 }
              : { steering: 0.28, throttle: -1 };
        const result = stepCarDynamics(state, style, {
          deltaSeconds: STEP,
          detailedDiagnostics: true,
          ...input,
        });
        expect(result.state.drivetrain.lastWheelForceNewtons, style.label)
          .toBe(result.drivetrain.wheelForceNewtons);
        expect(result.diagnostics.appliedWheelForceNewtons, style.label)
          .toBeCloseTo(
            result.state.chassis.frontDrivelineForce
              + result.state.chassis.rearDrivelineForce,
            8,
          );
        expect(result.diagnostics.correctionIterations, style.label)
          .toBeLessThanOrEqual(2);
        expect(result.diagnostics.energy, style.label).not.toBeNull();
        [
          result.diagnostics.forceResidualNewtons,
          result.diagnostics.forceResidualRatio,
          ...Object.values(result.diagnostics.energy ?? {}),
        ].forEach((value) => expect(Number.isFinite(value), style.label).toBe(true));
        secondCorrections += result.diagnostics.correctionIterations === 2 ? 1 : 0;
        maximumResidualRatio = Math.max(
          maximumResidualRatio,
          result.diagnostics.forceResidualRatio,
        );
        state = result.state;
      }

      // A difficult trace may request the final bounded pass, but it cannot
      // become the normal 180 Hz cost or leave an unbounded coupling residual.
      expect(secondCorrections, style.label).toBeLessThan(72);
      expect(maximumResidualRatio, style.label).toBeLessThanOrEqual(1);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label loses mechanical energy during an unpowered straight coast",
    (style) => {
      let state = advance(createDynamics(style), style, 240, {
        steering: 0,
        throttle: 1,
      });
      const initial = stepCarDynamics(state, style, {
        deltaSeconds: STEP,
        detailedDiagnostics: true,
        engineRunning: false,
        steering: 0,
        throttle: 0,
      });
      state = initial.state;
      for (let frame = 0; frame < 240; frame += 1) {
        state = stepCarDynamics(state, style, {
          deltaSeconds: STEP,
          engineRunning: false,
          steering: 0,
          throttle: 0,
        }).state;
      }
      const final = stepCarDynamics(state, style, {
        deltaSeconds: STEP,
        detailedDiagnostics: true,
        engineRunning: false,
        steering: 0,
        throttle: 0,
      });
      expect(final.diagnostics.energy!.storedEnergyJ, style.label)
        .toBeLessThan(initial.diagnostics.energy!.storedEnergyJ);
      expect(Math.hypot(state.chassis.velocityX, state.chassis.velocityY), style.label)
        .toBeLessThan(Math.hypot(
          initial.state.chassis.velocityX,
          initial.state.chassis.velocityY,
        ));
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label brakes through a split-grip turn without numerical yaw intervention",
    (style) => {
      let state = advance(createDynamics(style), style, 210, {
        steering: 0,
        throttle: 1,
      });
      const entrySpeed = Math.hypot(state.chassis.velocityX, state.chassis.velocityY);
      let maximumYawLimiterActivity = 0;
      for (let frame = 0; frame < 84; frame += 1) {
        const result = stepCarDynamics(state, style, {
          deltaSeconds: STEP,
          steering: 0.55,
          throttle: -1,
          wheelGripMultipliers: {
            frontLeft: 0.48,
            rearLeft: 0.48,
            frontRight: 1,
            rearRight: 1,
          },
        });
        state = result.state;
        maximumYawLimiterActivity = Math.max(
          maximumYawLimiterActivity,
          state.chassis.yawLimiterActivity,
        );
      }
      expect(Math.hypot(state.chassis.velocityX, state.chassis.velocityY), style.label)
        .toBeLessThan(entrySpeed);
      expect(maximumYawLimiterActivity, style.label).toBeLessThan(0.01);
      expect(Number.isFinite(state.chassis.heading), style.label).toBe(true);
    },
  );

});
describe("shared car geometry", () => {
  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label sources physical dimensions from the geometry contract",
    (style) => {
      const geometry = CAR_PHYSICAL_GEOMETRY[style.id];
      expect(style.physics.physicalWheelbaseM).toBe(geometry.wheelbaseM);
      expect(style.physics.trackWidthM).toBe(geometry.trackWidthM);
      expect(style.physics.frontWeightBias).toBe(geometry.frontWeightBias);
      expect(style.physics.centerOfGravityHeightM).toBe(geometry.centerOfGravityHeightM);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label keeps its visual axles and physical CG in one frame",
    (style) => {
      const frame = getCarGeometryFrame(style.id);
      const visualWheelbase = CAR_VISUAL_GEOMETRY.pageWheelCentersPx.longitudinal * 2;
      expect(frame.wheelCentersPagePx.front - frame.wheelCentersPagePx.rear)
        .toBeCloseTo(visualWheelbase, 8);
      expect(
        style.physics.frontWeightBias * frame.frontAxleFromCgM
          - (1 - style.physics.frontWeightBias) * frame.rearAxleFromCgM,
      ).toBeCloseTo(0, 8);
      expect(getCarYawInertiaKgM2(style.id, style.physics.massKg))
        .toBeGreaterThan(style.physics.massKg);
      frame.collisionHullPagePx.forEach((point, index) => {
        expect(point.x).toBeCloseTo(
          CAR_VISUAL_GEOMETRY.collisionHullPagePx[index].x
            - frame.cgFromAxleMidpointPagePx,
          8,
        );
      });
    },
  );

  it("keeps every rendered contact patch inside the collision body", () => {
    const wheel = CAR_VISUAL_GEOMETRY.pageWheelCentersPx;
    const maximumLateral = Math.max(
      ...CAR_VISUAL_GEOMETRY.collisionHullPagePx.map(({ y }) => Math.abs(y)),
    );
    expect(wheel.longitudinal).toBeLessThan(getCarCollisionHalfLength());
    expect(wheel.lateral).toBeLessThan(maximumLateral);
    expect(CAR_VISUAL_GEOMETRY.model.wheelCenterLongitudinal)
      .toBe(wheel.longitudinal);
  });
});
