import { describe, expect, it } from "vitest";
import {
  advanceCarLongitudinalControl,
  createCarChassisState,
  getCarAckermannSteeringAngles,
  getCarDrivenWheelSpeed,
  getCarLongitudinalIntent,
  getCarSignedSpeed,
  getCarWorldAxes,
  getCarWheelRotationDelta,
  interpolateCarPhysicsPose,
  reconcileCarWheelStateAfterCollision,
  resolveCarSurfaceContact,
  resolveCarSurfaceCollision,
  stepCarChassis,
  type CarChassisInput,
  type CarChassisState,
} from "../../lib/carChassis";
import { getCarYawInertiaKgM2 } from "../../lib/carGeometry";
import {
  CAR_ENGINE_STYLES,
  getCarMaximumPageSpeed,
} from "../../lib/carEngineStyles";
import {
  createCarDrivetrainState,
  getCarWheelForceNewtons,
  updateCarDrivetrain,
} from "../../lib/carDrivetrain";

const style = CAR_ENGINE_STYLES.city;
const reverseWheelForce = getCarWheelForceNewtons(style, 1_750, -1, -1, 1);
const baseInput: CarChassisInput = {
  deltaSeconds: 1 / 180,
  steering: 0,
  throttle: 0,
  wheelForceNewtons: getCarWheelForceNewtons(
    CAR_ENGINE_STYLES.city,
    1_750,
    1,
    1,
    1,
  ),
};

function advance(
  initial: CarChassisState,
  seconds: number,
  input: Partial<CarChassisInput>,
) {
  let state = initial;
  let output = stepCarChassis(state, style, { ...baseInput, ...input });
  const count = Math.max(1, Math.round(seconds / baseInput.deltaSeconds));
  for (let index = 0; index < count; index += 1) {
    output = stepCarChassis(state, style, { ...baseInput, ...input });
    state = output.state;
  }
  return output;
}

function advanceStyle(
  selectedStyle: typeof style,
  initial: CarChassisState,
  seconds: number,
  input: Partial<CarChassisInput>,
) {
  const deltaSeconds = 1 / 180;
  const count = Math.max(1, Math.round(seconds / deltaSeconds));
  let state = initial;
  let output = stepCarChassis(state, selectedStyle, {
    deltaSeconds,
    steering: 0,
    throttle: 0,
    wheelForceNewtons: 0,
    ...input,
  });
  for (let index = 0; index < count; index += 1) {
    output = stepCarChassis(state, selectedStyle, {
      deltaSeconds,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: 0,
      ...input,
    });
    state = output.state;
  }
  return output;
}

describe("car chassis", () => {
  it("interpolates fixed-step poses across the shortest heading arc", () => {
    const pose = interpolateCarPhysicsPose(
      { heading: Math.PI - 0.08, x: 10, y: 20 },
      { heading: -Math.PI + 0.08, x: 30, y: 60 },
      0.5,
    );

    expect(pose.x).toBe(20);
    expect(pose.y).toBe(40);
    expect(Math.abs(Math.abs(pose.heading) - Math.PI)).toBeLessThan(0.0001);
  });

  it("engages the opposite direction only after physical rest holds", () => {
    const moving = createCarChassisState(0, 180);
    const braking = advanceCarLongitudinalControl(moving, -1, 1 / 60, {
      controls: style.controls,
    });
    expect(braking).toMatchObject({
      engagedDirection: 1,
      phase: "braking-to-reverse",
      serviceBraking: true,
    });

    const settling = {
      ...moving,
      restState: "settling" as const,
      velocityX: 0,
      velocityY: 0,
    };
    expect(advanceCarLongitudinalControl(settling, -1, 1 / 60, {
      controls: style.controls,
    })).toMatchObject({
      engagedDirection: 1,
      phase: "braking-to-reverse",
      serviceBraking: true,
    });

    const held = { ...settling, restState: "held" as const };
    expect(advanceCarLongitudinalControl(held, -1, 1 / 60, {
      controls: style.controls,
    })).toMatchObject({
      engagedDirection: -1,
      phase: "driving-reverse",
      releaseBrakePressure: true,
      serviceBraking: false,
    });
  });

  it("owns forward, braking, and reverse intent in one control decision", () => {
    const forwardMotion = createCarChassisState(0, 240);
    expect(getCarLongitudinalIntent(forwardMotion, -1, {
      controls: style.controls,
    })).toMatchObject({
      demandedDirection: -1,
      directionOpposesMotion: true,
      movingDirection: 1,
      serviceBraking: true,
    });
    const stoppedForward = createCarChassisState(0);
    stoppedForward.driveDirection = 1;
    expect(getCarLongitudinalIntent(stoppedForward, -1, {
      controls: style.controls,
    })).toMatchObject({
      changingDirection: true,
      directionStillDisengaged: true,
      serviceBraking: true,
    });
    const reverse = createCarChassisState(0, -80);
    expect(getCarLongitudinalIntent(reverse, -1, {
      controls: style.controls,
    })).toMatchObject({
      demandedDirection: -1,
      movingDirection: -1,
      serviceBraking: false,
    });
  });

  it("converts signed wheel travel to the mesh's rolling rotation", () => {
    const radius = style.physics.wheelRadiusM;
    const pixelsPerMeter = style.physics.worldPixelsPerMeter;
    const oneRevolutionSpeed = 2 * Math.PI * radius * pixelsPerMeter;

    expect(getCarWheelRotationDelta(oneRevolutionSpeed, radius, 1, pixelsPerMeter))
      .toBeCloseTo(-2 * Math.PI, 8);
    expect(getCarWheelRotationDelta(
      -oneRevolutionSpeed,
      radius,
      1,
      pixelsPerMeter,
    )).toBeCloseTo(2 * Math.PI, 8);
  });

  it("uses distinct inner and outer front-wheel steering angles", () => {
    const rightTurn = getCarAckermannSteeringAngles(0.5, 145, 88);
    const leftTurn = getCarAckermannSteeringAngles(-0.5, 145, 88);

    expect(rightTurn.right).toBeGreaterThan(rightTurn.left);
    expect(rightTurn.left).toBeGreaterThan(0);
    expect(Math.abs(leftTurn.left)).toBeGreaterThan(Math.abs(leftTurn.right));
    expect(leftTurn.right).toBeLessThan(0);
  });

  it("tracks four contact patches and transfers load across a sustained turn", () => {
    const cornering = advance(createCarChassisState(0, 480), 0.4, {
      steering: 1,
      throttle: 0.45,
    });
    const state = cornering.state;
    const totalLoad = state.frontLeftLoadNewtons + state.frontRightLoadNewtons
      + state.rearLeftLoadNewtons + state.rearRightLoadNewtons;

    expect(totalLoad).toBeCloseTo(style.physics.massKg * 9.81, 4);
    expect(Math.abs(state.frontLeftLoadNewtons - state.frontRightLoadNewtons))
      .toBeGreaterThan(5);
    expect(state.frontLeftWheelSpeed).not.toBeCloseTo(state.frontRightWheelSpeed, 3);
    expect(getCarDrivenWheelSpeed(state, style)).toBeCloseTo(
      (state.frontLeftWheelSpeed + state.frontRightWheelSpeed) / 2,
      8,
    );
  });

  it("builds driveline force compliantly without losing sustained torque", () => {
    const initial = createCarChassisState(0);
    const first = stepCarChassis(initial, style, {
      ...baseInput,
      throttle: 1,
    });
    const settled = advance(first.state, 0.12, { throttle: 1 });

    expect(first.state.frontDrivelineForce).toBeGreaterThan(0);
    expect(first.state.frontDrivelineForce).toBeLessThan(baseInput.wheelForceNewtons);
    expect(settled.state.frontDrivelineForce)
      .toBeGreaterThan(first.state.frontDrivelineForce);
  });

  it("builds longitudinal contact force continuously instead of stepping instantly", () => {
    const force = getCarWheelForceNewtons(style, 1_750, 1, 1, 1);
    const first = stepCarChassis(createCarChassisState(0), style, {
      ...baseInput,
      throttle: 1,
      wheelForceNewtons: force,
    });
    const second = stepCarChassis(first.state, style, {
      ...baseInput,
      throttle: 1,
      wheelForceNewtons: force,
    });

    expect(first.state.frontLeftLongitudinalForce).toBeGreaterThan(0);
    expect(second.state.frontLeftLongitudinalForce)
      .toBeGreaterThan(first.state.frontLeftLongitudinalForce);
    expect(second.state.frontLeftLongitudinalForce).toBeLessThan(force);
  });

  it("couples unequal driven-wheel speeds through the configured differential", () => {
    const rallyStyle = CAR_ENGINE_STYLES.rally;
    const initial = {
      ...createCarChassisState(0, 420),
      driveDirection: 1 as const,
      frontLeftWheelSpeed: 610,
      frontRightWheelSpeed: 330,
      rearLeftWheelSpeed: 520,
      rearRightWheelSpeed: 370,
    };
    const update = stepCarChassis(initial, rallyStyle, {
      ...baseInput,
      throttle: 1,
      wheelForceNewtons: getCarWheelForceNewtons(rallyStyle, 2_800, 2, 1, 1),
    });

    expect(update.state.frontDifferentialCouplingForce).toBeGreaterThan(0);
    expect(update.state.rearDifferentialCouplingForce).toBeGreaterThan(0);
    expect(update.state.centerDifferentialCouplingForce).toBeGreaterThan(0);
    expect(update.state.frontLeftWheelSpeed - update.state.frontRightWheelSpeed)
      .toBeLessThan(initial.frontLeftWheelSpeed - initial.frontRightWheelSpeed);
  });

  it("releases pressure only at the wheel predicted to lock", () => {
    const state = {
      ...createCarChassisState(0, 440),
      brakePressure: 0.45,
      frontLeftBrakePressure: 0.45,
      frontRightBrakePressure: 0.45,
      rearLeftBrakePressure: 0.45,
      rearRightBrakePressure: 0.45,
      frontLeftLongitudinalSlip: -0.8,
    };
    const update = stepCarChassis(state, {
      ...style,
      physics: {
        ...style.physics,
        maximumServiceBrakeTorqueNm: 1_200
          / style.physics.worldPixelsPerMeter
          * style.physics.massKg
          * style.physics.wheelRadiusM,
      },
    }, {
        ...baseInput,
        throttle: -1,
        wheelForceNewtons: reverseWheelForce,
      });

    expect(update.state.frontLeftBrakePressure)
      .toBeLessThan(update.state.frontRightBrakePressure);
    expect(update.state.absActivity).toBeGreaterThan(0);
  });

  it("advances each ABS channel through release, hold, and apply phases", () => {
    const locking = {
      ...createCarChassisState(0, 440),
      brakePressure: 0.55,
      frontLeftAbsPhase: "apply" as const,
      frontLeftBrakePressure: 0.55,
      frontLeftLongitudinalSlip: -0.8,
    };
    const released = stepCarChassis(locking, style, {
      ...baseInput,
      throttle: -1,
      wheelForceNewtons: 0,
    }).state;
    expect(released.frontLeftAbsPhase).toBe("release");

    const holding = stepCarChassis({
      ...locking,
      frontLeftAbsPhase: "release",
      frontLeftBrakePressure: 0.28,
      frontLeftLongitudinalSlip: -style.controls.driverAids.absSlipThreshold * 0.72,
      frontLeftWheelAcceleration: 0,
    }, style, {
      ...baseInput,
      throttle: -1,
      wheelForceNewtons: 0,
    }).state;
    expect(["hold", "release"]).toContain(holding.frontLeftAbsPhase);

    const applyStyle = {
      ...style,
      controls: {
        ...style.controls,
        driverAids: {
          ...style.controls.driverAids,
          absDecelerationThreshold: 100,
          absSlipThreshold: 0.9,
        },
      },
    };
    const applying = stepCarChassis({
      ...locking,
      frontLeftAbsPhase: "hold",
      frontLeftBrakePressure: 0.1,
      frontLeftLongitudinalSlip: 0,
      frontLeftWheelAcceleration: 0,
    }, applyStyle, {
      ...baseInput,
      throttle: -1,
      wheelForceNewtons: 0,
    }).state;
    expect(applying.frontLeftAbsPhase).toBe("apply");
    expect(applying.frontLeftBrakePressure).toBeGreaterThan(0.1);
  });

  it("applies braking against each reversing wheel rather than global forward motion", () => {
    const initial = {
      ...createCarChassisState(0, -360),
      driveDirection: -1 as const,
      frontLeftWheelSpeed: -410,
      frontRightWheelSpeed: -330,
      rearLeftWheelSpeed: -390,
      rearRightWheelSpeed: -350,
    };
    const braked = stepCarChassis(initial, style, {
      ...baseInput,
      throttle: 1,
      wheelForceNewtons: 0,
    }).state;
    const rolling = stepCarChassis(initial, style, {
      ...baseInput,
      throttle: 0,
      wheelForceNewtons: 0,
    }).state;

    expect(braked.frontLeftBrakePressure).toBeGreaterThan(0);
    expect(braked.frontRightBrakePressure).toBeGreaterThan(0);
    expect(braked.frontLeftWheelSpeed).toBeGreaterThan(rolling.frontLeftWheelSpeed);
    expect(braked.frontRightWheelSpeed).toBeGreaterThan(rolling.frontRightWheelSpeed);
  });

  it("shapes binary throttle without delaying raw direction intent", () => {
    const first = stepCarChassis(createCarChassisState(0), style, {
      ...baseInput,
      throttle: 1,
    });
    const reverseRequest = stepCarChassis(first.state, style, {
      ...baseInput,
      throttle: -1,
      wheelForceNewtons: reverseWheelForce,
    });

    expect(first.state.throttlePedal).toBeGreaterThan(0);
    expect(first.state.throttlePedal).toBeLessThan(1);
    expect(reverseRequest.serviceBraking).toBe(true);
    expect(reverseRequest.state.throttlePedal).toBeLessThan(first.state.throttlePedal);
  });

  it("modulates driven-wheel spin and brake lock without binary force cuts", () => {
    const spinning = {
      ...createCarChassisState(0, 360),
      driveDirection: 1 as const,
      frontLongitudinalSlip: 0.7,
      frontLeftLongitudinalSlip: 0.7,
      frontRightLongitudinalSlip: 0.7,
      frontWheelSpeed: 310,
    };
    const tractionUpdate = stepCarChassis(spinning, style, {
      ...baseInput,
      throttle: 1,
    });
    const locking = {
      ...createCarChassisState(0, 420),
      frontLongitudinalSlip: -0.7,
      frontLeftLongitudinalSlip: -0.7,
      frontRightLongitudinalSlip: -0.7,
      rearLongitudinalSlip: -0.55,
      rearLeftLongitudinalSlip: -0.55,
      rearRightLongitudinalSlip: -0.55,
    };
    const absUpdate = stepCarChassis(locking, style, {
      ...baseInput,
      throttle: -1,
      wheelForceNewtons: reverseWheelForce,
    });

    expect(tractionUpdate.state.tractionControlActivity).toBeGreaterThan(0);
    expect(tractionUpdate.state.tractionControlActivity).toBeLessThan(1);
    expect(absUpdate.state.absActivity).toBeGreaterThan(0);
    expect(absUpdate.state.absActivity).toBeLessThan(1);
  });

  it("retains and recovers per-wheel adhesion across tire breakaway", () => {
    let state: CarChassisState = {
      ...createCarChassisState(0, 320),
      driveDirection: 1,
      frontLeftWheelSpeed: 760,
      frontRightWheelSpeed: 760,
      frontWheelSpeed: 760,
    };
    for (let frame = 0; frame < 45; frame += 1) {
      state = stepCarChassis(state, style, {
        ...baseInput,
        throttle: 1,
        wheelForceNewtons: 18_000,
      }).state;
    }
    const brokenAway = Math.min(
      state.frontLeftAdhesion,
      state.frontRightAdhesion,
    );
    expect(brokenAway).toBeLessThan(0.8);

    for (let frame = 0; frame < 180; frame += 1) {
      state = stepCarChassis(state, style, {
        ...baseInput,
        throttle: 0,
        wheelForceNewtons: 0,
      }).state;
    }
    expect(state.frontLeftAdhesion).toBeGreaterThan(brokenAway);
    expect(state.frontRightAdhesion).toBeGreaterThan(brokenAway);
  });

  it("hydrates tire adhesion safely from an older route snapshot", () => {
    const legacy = {
      ...createCarChassisState(0, 240),
      frontLeftAdhesion: undefined,
      frontRightAdhesion: undefined,
      rearLeftAdhesion: undefined,
      rearRightAdhesion: undefined,
      steeringCommand: undefined,
    } as unknown as CarChassisState;
    const state = stepCarChassis(legacy, style, {
      ...baseInput,
      throttle: 0.4,
    }).state;

    expect([
      state.frontLeftAdhesion,
      state.frontRightAdhesion,
      state.rearLeftAdhesion,
      state.rearRightAdhesion,
    ].every(Number.isFinite)).toBe(true);
    expect(state.steeringCommand).toBe(0);
  });

  it("accelerates straight without manufacturing lateral velocity", () => {
    const output = advance(createCarChassisState(0), 0.5, { throttle: 1 });

    expect(output.signedSpeed).toBeGreaterThan(getCarMaximumPageSpeed(style, 1) * 0.15);
    expect(Math.abs(output.state.velocityY)).toBeLessThan(0.001);
    expect(output.state.heading).toBeCloseTo(0, 6);
  });

  it("uses the selected gear ratio to reduce wheel acceleration in a high gear", () => {
    const initial = createCarChassisState(0, 120);
    const first = stepCarChassis(initial, style, {
      ...baseInput,
      throttle: 1,
      wheelForceNewtons: getCarWheelForceNewtons(style, 1_750, 1, 1, 1),
    });
    const fifth = stepCarChassis(initial, style, {
      ...baseInput,
      throttle: 1,
      wheelForceNewtons: getCarWheelForceNewtons(style, 1_750, 5, 1, 1),
    });

    expect(first.signedSpeed - 120).toBeGreaterThan(fifth.signedSpeed - 120);
    expect(fifth.signedSpeed - 120).toBeGreaterThan(-1);
  });

  it("retains useful pull after an upshift on the page-sized driving surface", () => {
    const initialSpeed = getCarMaximumPageSpeed(style, 1) * 0.55;
    const output = advance(createCarChassisState(0, initialSpeed), 0.25, {
      throttle: 1,
      wheelForceNewtons: getCarWheelForceNewtons(style, 1_750, 4, 1, 1),
    });

    expect(output.signedSpeed).toBeGreaterThan(initialSpeed * 0.96);
  });

  it("responds promptly from rest in both forward and reverse", () => {
    const forward = advance(createCarChassisState(0), 0.18, { throttle: 1 });
    const reverse = advance(createCarChassisState(0), 0.18, {
      throttle: -1,
      wheelForceNewtons: reverseWheelForce,
    });

    expect(forward.signedSpeed).toBeGreaterThan(getCarMaximumPageSpeed(style, 1) * 0.05);
    expect(reverse.signedSpeed).toBeLessThan(-getCarMaximumPageSpeed(style, -1) * 0.05);
    expect(forward.signedSpeed).toBeGreaterThan(Math.abs(reverse.signedSpeed));
  });

  it("keeps reverse slower than forward through the complete powertrain", () => {
    const launch = (selectedStyle: typeof style, direction: -1 | 1) => {
      let chassis = createCarChassisState(0);
      let drivetrain = createCarDrivetrainState(selectedStyle);
      for (let frame = 0; frame < 144; frame += 1) {
        const signedSpeed = getCarSignedSpeed(chassis);
        const speedLimit = signedSpeed < 0
          ? getCarMaximumPageSpeed(selectedStyle, -1)
          : getCarMaximumPageSpeed(selectedStyle, 1);
        const mechanical = updateCarDrivetrain(drivetrain, selectedStyle, {
          deltaSeconds: 1 / 180,
          drivenWheelSpeedRatio: getCarDrivenWheelSpeed(chassis, selectedStyle)
            / speedLimit,
          engagedDirection: chassis.driveDirection,
          signedSpeedRatio: signedSpeed / speedLimit,
          steering: 0,
          throttle: direction,
        });
        drivetrain = mechanical.state;
        chassis = stepCarChassis(chassis, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering: 0,
          throttle: direction,
          wheelForceNewtons: mechanical.output.wheelForceNewtons,
        }).state;
      }
      return Math.abs(getCarSignedSpeed(chassis));
    };

    Object.values(CAR_ENGINE_STYLES).forEach((selectedStyle) => {
      const forwardSpeed = launch(selectedStyle, 1);
      const reverseSpeed = launch(selectedStyle, -1);
      expect(
        forwardSpeed / getCarMaximumPageSpeed(selectedStyle, 1),
        selectedStyle.label,
      ).toBeGreaterThan(selectedStyle.handlingTargets.minimumForwardLaunchRatio);
      expect(
        reverseSpeed / getCarMaximumPageSpeed(selectedStyle, -1),
        selectedStyle.label,
      ).toBeGreaterThan(selectedStyle.handlingTargets.minimumReverseLaunchRatio);
      expect(reverseSpeed / forwardSpeed, selectedStyle.label)
        .toBeLessThan(selectedStyle.handlingTargets.reverseToForwardLaunchRatioMax);
      expect(reverseSpeed, selectedStyle.label)
        .toBeLessThan(getCarMaximumPageSpeed(selectedStyle, -1));
    });
  });

  it("meets each car's authored braking and steering targets", () => {
    Object.values(CAR_ENGINE_STYLES).forEach((selectedStyle) => {
      const turnSpeed = Math.min(520, getCarMaximumPageSpeed(selectedStyle, 1) * 0.42);
      const turn = advanceStyle(
        selectedStyle,
        createCarChassisState(0, turnSpeed),
        0.35,
        { steering: 1 },
      );
      expect(turn.state.heading, selectedStyle.label)
        .toBeGreaterThan(selectedStyle.handlingTargets.minimumTurnHeadingRadians);

      let brakingState = createCarChassisState(0, 520);
      let stopSeconds = Number.POSITIVE_INFINITY;
      const reverseForce = getCarWheelForceNewtons(
        selectedStyle,
        1_750,
        -1,
        -1,
        1,
      );
      for (let frame = 0; frame < 360; frame += 1) {
        const braking = stepCarChassis(brakingState, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering: 0,
          throttle: -1,
          wheelForceNewtons: reverseForce,
        });
        brakingState = braking.state;
        if (Math.abs(braking.signedSpeed) < 1) {
          stopSeconds = (frame + 1) / 180;
          break;
        }
      }
      expect(stopSeconds, selectedStyle.label)
        .toBeLessThan(selectedStyle.handlingTargets.maximumBrakeStopSeconds);
    });
  });

  it("applies rolling and aerodynamic resistance even while power is applied", () => {
    const initial = createCarChassisState(0, 700);
    const powered = stepCarChassis(initial, style, { ...baseInput, throttle: 1 });
    const lossless = stepCarChassis(initial, {
      ...style,
      physics: {
        ...style.physics,
        dragAreaM2: 0,
        rollingResistanceCoefficient: 0,
      },
    }, { ...baseInput, throttle: 1 });

    expect(powered.signedSpeed).toBeLessThan(lossless.signedSpeed);
  });

  it("cannot yaw in place and develops bounded slip while cornering", () => {
    const stationary = advance(createCarChassisState(0), 0.5, { steering: 1 });
    expect(stationary.state.yawRate).toBe(0);
    expect(stationary.state.heading).toBe(0);

    const cornering = advance(createCarChassisState(0, 420), 0.8, { steering: 1 });
    expect(cornering.state.heading).toBeGreaterThan(0.1);
    expect(cornering.state.yawRate).toBeGreaterThan(0);
    expect(cornering.state.tireSlip).toBeGreaterThan(0);
    expect(cornering.state.tireSlip).toBeLessThanOrEqual(1);
    expect(Math.abs(cornering.state.frontSlipAngle)).toBeGreaterThan(0);
    expect(Math.abs(cornering.state.rearSlipAngle)).toBeGreaterThan(0);

    const responsiveTurn = advance(createCarChassisState(0, 520), 0.35, { steering: 1 });
    expect(responsiveTurn.state.heading).toBeGreaterThan(0.16);
  });

  it("steers at parking speed through tire force without kinematic yaw assistance", () => {
    const parkingTurn = advanceStyle(
      style,
      createCarChassisState(0, 32),
      0.45,
      { steering: 1, throttle: 0, wheelForceNewtons: 0 },
    );

    expect(parkingTurn.state.heading).toBeGreaterThan(0.002);
    expect(Math.abs(parkingTurn.state.yawRate)).toBeLessThan(0.35);
    expect(parkingTurn.state.tireSlip).toBeLessThanOrEqual(1);
  });

  it("keeps physical turn response invariant across projected directions", () => {
    const horizontalStart = createCarChassisState(0, 520);
    const verticalStart = createCarChassisState(Math.PI / 2, 520);
    const horizontal = advance(horizontalStart, 0.35, { steering: 1 });
    const vertical = advance(verticalStart, 0.35, { steering: 1 });
    const horizontalTurn = horizontal.state.heading - horizontalStart.heading;
    const verticalTurn = vertical.state.heading - verticalStart.heading;

    expect(Math.abs(horizontalTurn - verticalTurn)).toBeLessThan(0.025);
  });

  it("projects world travel only at the display boundary", () => {
    const horizontal = stepCarChassis(createCarChassisState(0, 500), style, {
      ...baseInput,
      wheelForceNewtons: 0,
    });
    const depth = stepCarChassis(
      createCarChassisState(Math.PI / 2, 500),
      style,
      { ...baseInput, wheelForceNewtons: 0 },
    );

    expect(horizontal.signedSpeed).toBeCloseTo(depth.signedSpeed, 8);
    expect(Math.abs(depth.displacementY / horizontal.displacementX))
      .toBeCloseTo(Math.SQRT1_2, 5);
  });

  it("softens excess yaw instead of clipping normal handling at the envelope", () => {
    const initial = {
      ...createCarChassisState(
        0,
        getCarMaximumPageSpeed(style, 1) * 0.12,
      ),
      yawRate: 0.58,
    };
    const output = stepCarChassis(initial, style, {
      ...baseInput,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: 0,
    });

    expect(output.state.yawRate).toBeGreaterThan(0.45);
    expect(output.state.yawRate).toBeLessThan(0.7);
  });

  it("keeps equal and opposite steady turns symmetric", () => {

    const right = advance(createCarChassisState(0, 480), 0.7, {
      steering: 0.7,
      throttle: 0.35,
    });
    const left = advance(createCarChassisState(0, 480), 0.7, {
      steering: -0.7,
      throttle: 0.35,
    });

    expect(right.state.heading).toBeCloseTo(-left.state.heading, 5);
    expect(right.signedSpeed).toBeCloseTo(left.signedSpeed, 5);
    expect(right.state.tireSlip).toBeCloseTo(left.state.tireSlip, 5);
  });

  it("keeps sustained steering controllable and settles body sideslip", () => {
    const sideslipRatio = (state: CarChassisState) => {
      const { forward, right } = getCarWorldAxes(state.heading);
      const longitudinal = state.velocityX * forward.x + state.velocityY * forward.y;
      const lateral = state.velocityX * right.x + state.velocityY * right.y;
      return Math.abs(lateral) / Math.max(80, Math.abs(longitudinal));
    };
    const cornering = advance(createCarChassisState(0, 900), 0.9, {
      steering: 1,
      throttle: 0.35,
      wheelForceNewtons: baseInput.wheelForceNewtons * 0.35,
    });
    const settled = advance(cornering.state, 0.7, {
      steering: 0,
      throttle: 0,
      wheelForceNewtons: 0,
    });

    expect(sideslipRatio(cornering.state)).toBeLessThan(0.42);
    expect(sideslipRatio(settled.state), JSON.stringify({
      ratio: sideslipRatio(settled.state),
      speed: getCarSignedSpeed(settled.state),
      yawRate: settled.state.yawRate,
      frontSlip: settled.state.frontSlipAngle,
      rearSlip: settled.state.rearSlipAngle,
      heading: settled.state.heading,
      velocityX: settled.state.velocityX,
      velocityY: settled.state.velocityY,
    })).toBeLessThan(0.16);
    expect(Math.abs(settled.state.yawRate)).toBeLessThan(0.25);
  });

  it("retains the commanded yaw sign after accelerating through a shift", () => {
    let chassis = createCarChassisState(-Math.PI / 2);
    let drivetrain = createCarDrivetrainState(style);
    let shifted = false;
    let steeringReady = false;
    let steeringFrames = 0;
    for (let frame = 0; frame < 540; frame += 1) {
      const signedSpeed = getCarSignedSpeed(chassis);
      const steering = steeringReady ? 1 : 0;
      const mechanical = updateCarDrivetrain(drivetrain, style, {
        deltaSeconds: 1 / 180,
        drivenWheelSpeedRatio: getCarDrivenWheelSpeed(chassis, style)
          / getCarMaximumPageSpeed(style, 1),
        engagedDirection: chassis.driveDirection,
        signedSpeedRatio: signedSpeed / getCarMaximumPageSpeed(style, 1),
        steering,
        throttle: 1,
      });
      drivetrain = mechanical.state;
      if (drivetrain.forwardGear >= 2) shifted = true;
      if (
        shifted
        && signedSpeed >= getCarMaximumPageSpeed(style, 1) * 0.42
      ) steeringReady = true;
      if (steeringReady) steeringFrames += 1;
      chassis = stepCarChassis(chassis, style, {
        deltaSeconds: 1 / 180,
        steering,
        throttle: 1,
        wheelForceNewtons: mechanical.output.wheelForceNewtons,
      }).state;
      if (steeringFrames >= 44) break;
    }

    expect(shifted).toBe(true);
    expect(chassis.steeringAngle).toBeGreaterThan(0.2);
    expect(chassis.yawRate).toBeGreaterThan(0);

    for (let frame = 0; frame < 58; frame += 1) {
      const signedSpeed = getCarSignedSpeed(chassis);
      const mechanical = updateCarDrivetrain(drivetrain, style, {
        deltaSeconds: 1 / 180,
        drivenWheelSpeedRatio: getCarDrivenWheelSpeed(chassis, style)
          / getCarMaximumPageSpeed(style, 1),
        engagedDirection: chassis.driveDirection,
        signedSpeedRatio: signedSpeed / getCarMaximumPageSpeed(style, 1),
        steering: -1,
        throttle: 1,
      });
      drivetrain = mechanical.state;
      chassis = stepCarChassis(chassis, style, {
        deltaSeconds: 1 / 180,
        steering: -1,
        throttle: 1,
        wheelForceNewtons: mechanical.output.wheelForceNewtons,
      }).state;
    }
    expect(chassis.steeringAngle).toBeLessThan(-0.2);
    expect(chassis.yawRate, JSON.stringify({
      speed: getCarSignedSpeed(chassis),
      steering: chassis.steeringAngle,
      frontSlip: chassis.frontSlipAngle,
      rearSlip: chassis.rearSlipAngle,
      frontForce: chassis.frontLateralAcceleration,
      rearForce: chassis.rearLateralAcceleration,
      lateralSpeed: chassis.velocityX * Math.cos(chassis.heading + Math.PI / 2)
        + chassis.velocityY * Math.sin(chassis.heading + Math.PI / 2),
    })).toBeLessThan(0);
  });

  it("remains controllable through an extended full-throttle slalom", () => {
    const sideslipRatio = (state: CarChassisState) => {
      const { forward, right } = getCarWorldAxes(state.heading);
      const longitudinal = state.velocityX * forward.x + state.velocityY * forward.y;
      const lateral = state.velocityX * right.x + state.velocityY * right.y;
      return Math.abs(lateral) / Math.max(100, Math.abs(longitudinal));
    };

    Object.values(CAR_ENGINE_STYLES).forEach((selectedStyle) => {
      let chassis = createCarChassisState(0);
      let drivetrain = createCarDrivetrainState(selectedStyle);
      let maximumSideslipRatio = 0;
      for (let frame = 0; frame < 1_080; frame += 1) {
        const signedSpeed = getCarSignedSpeed(chassis);
        const steering = frame < 180
          ? 0
          : Math.floor((frame - 180) / 72) % 2 === 0 ? 1 : -1;
        const mechanical = updateCarDrivetrain(drivetrain, selectedStyle, {
          deltaSeconds: 1 / 180,
          drivenWheelSpeedRatio: getCarDrivenWheelSpeed(chassis, selectedStyle)
            / getCarMaximumPageSpeed(selectedStyle, 1),
          engagedDirection: chassis.driveDirection,
          signedSpeedRatio: signedSpeed / getCarMaximumPageSpeed(selectedStyle, 1),
          steering,
          throttle: 1,
        });
        drivetrain = mechanical.state;
        chassis = stepCarChassis(chassis, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering,
          throttle: 1,
          wheelForceNewtons: mechanical.output.wheelForceNewtons,
        }).state;
        maximumSideslipRatio = Math.max(maximumSideslipRatio, sideslipRatio(chassis));
      }
      for (let frame = 0; frame < 180; frame += 1) {
        chassis = stepCarChassis(chassis, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering: 0,
          throttle: 0,
          wheelForceNewtons: 0,
        }).state;
      }

      expect(maximumSideslipRatio, selectedStyle.label)
        .toBeLessThan(selectedStyle.handlingTargets.maximumSlalomSideslipRatio);
      expect(sideslipRatio(chassis), selectedStyle.label).toBeLessThan(0.16);
      expect(Math.abs(chassis.yawRate), selectedStyle.label).toBeLessThan(0.2);
      expect(getCarSignedSpeed(chassis), selectedStyle.label).toBeGreaterThan(0);
    });
  });

  it("coasts down without reversing or applying a hidden brake", () => {
    const initial = createCarChassisState(0, 760);
    const coasted = advance(initial, 1.2, {
      throttle: 0,
      wheelForceNewtons: 0,
    });

    expect(coasted.signedSpeed).toBeGreaterThan(0);
    expect(coasted.signedSpeed).toBeLessThan(760);
    expect(coasted.state.brakePressure).toBe(0);
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label settles into static rest and breaks away only under drive force",
    (selectedStyle) => {
      let state = createCarChassisState(0, 2.5);
      let sawSettling = false;
      for (let frame = 0; frame < 180; frame += 1) {
        state = stepCarChassis(state, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering: 0,
          throttle: 0,
          wheelForceNewtons: 0,
        }).state;
        sawSettling ||= state.restState === "settling";
        if (state.restState === "held") break;
      }
      expect(sawSettling, selectedStyle.label).toBe(true);
      expect(state.restState, selectedStyle.label).toBe("held");
      expect(getCarSignedSpeed(state), selectedStyle.label).toBe(0);

      const released = stepCarChassis(state, selectedStyle, {
        deltaSeconds: 1 / 180,
        steering: 0,
        throttle: 1,
        wheelForceNewtons: getCarWheelForceNewtons(selectedStyle, 1_750, 1, 1, 1),
      });
      expect(released.state.restState, selectedStyle.label).toBe("rolling");
      expect(released.signedSpeed, selectedStyle.label).toBeGreaterThan(0);
    },
  );

  it("routes stability intervention through asymmetric wheel force", () => {
    const initial = {
      ...createCarChassisState(0, 700),
      velocityY: 220,
      yawRate: 0.9,
    };
    const controlled = stepCarChassis(initial, style, {
      ...baseInput,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: 0,
    });
    const unassistedStyle = {
      ...style,
      controls: {
        ...style.controls,
        driverAids: {
          ...style.controls.driverAids,
          stabilityBrakeStrength: 0,
        },
      },
    };
    const unassisted = stepCarChassis(initial, unassistedStyle, {
      ...baseInput,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: 0,
    });

    expect(controlled.state.yawRate).toBeLessThan(unassisted.state.yawRate);
    expect(Math.abs(
      controlled.state.frontLeftLongitudinalSlip
        - controlled.state.frontRightLongitudinalSlip,
    )).toBeGreaterThan(Math.abs(
      unassisted.state.frontLeftLongitudinalSlip
        - unassisted.state.frontRightLongitudinalSlip,
    ));
    expect(controlled.state.frontLeftBrakePressure)
      .toBeGreaterThan(controlled.state.rearLeftBrakePressure);
  });

  it("uses the inside rear contact to correct an understeer yaw deficit", () => {
    const initial = {
      ...createCarChassisState(0, 650),
      steeringAngle: 0.34,
      yawRate: 0,
    };
    const corrected = stepCarChassis(initial, style, {
      ...baseInput,
      steering: 1,
      throttle: 0,
      wheelForceNewtons: 0,
    }).state;

    expect(corrected.rearRightBrakePressure)
      .toBeGreaterThan(corrected.frontRightBrakePressure);
  });

  it("derives steering return from signed front contact forces", () => {
    const loaded = {
      ...createCarChassisState(0, 420),
      frontLeftLateralForce: 1_500,
      frontRightLateralForce: 1_500,
      steeringAngle: 0.35,
    };
    const splitGrip = {
      ...loaded,
      frontLeftLateralForce: 150,
    };
    const fullReturn = stepCarChassis(loaded, style, {
      ...baseInput,
      steering: 0,
      wheelForceNewtons: 0,
    });
    const splitReturn = stepCarChassis(splitGrip, style, {
      ...baseInput,
      steering: 0,
      wheelForceNewtons: 0,
    });

    expect(fullReturn.state.steeringAngle)
      .toBeLessThan(splitReturn.state.steeringAngle);

    const saturatedReturn = stepCarChassis({
      ...loaded,
      frontLeftLongitudinalSlip: 0.9,
      frontRightLongitudinalSlip: 0.9,
    }, style, {
      ...baseInput,
      steering: 0,
      wheelForceNewtons: 0,
    });
    expect(saturatedReturn.state.steeringAngle)
      .toBeGreaterThan(fullReturn.state.steeringAngle);

    const leftBraking = stepCarChassis({
      ...loaded,
      frontLeftLateralForce: 0,
      frontRightLateralForce: 0,
      frontLeftLongitudinalForce: -3_000,
      frontRightLongitudinalForce: 0,
    }, style, {
      ...baseInput,
      steering: 0,
      wheelForceNewtons: 0,
    });
    const rightBraking = stepCarChassis({
      ...loaded,
      frontLeftLateralForce: 0,
      frontRightLateralForce: 0,
      frontLeftLongitudinalForce: 0,
      frontRightLongitudinalForce: -3_000,
    }, style, {
      ...baseInput,
      steering: 0,
      wheelForceNewtons: 0,
    });
    expect(leftBraking.state.steeringVelocity)
      .toBeGreaterThan(rightBraking.state.steeringVelocity);
  });

  it("uses differential torque bias to retain pull on split grip", () => {
    const selectedStyle = CAR_ENGINE_STYLES.city;
    const openStyle = {
      ...selectedStyle,
      differentials: {
        ...selectedStyle.differentials,
        front: {
          coastPreloadNewtons: 0,
          coastTorqueBiasRatio: 1,
          couplingGainNewtonsPerMps: 0,
          preloadNewtons: 0,
          responseRate: 8,
          torqueBiasRatio: 1,
        },
      },
    };
    const input = {
      throttle: 1,
      wheelForceNewtons: getCarWheelForceNewtons(selectedStyle, 1_750, 1, 1, 1),
      wheelGripMultipliers: { frontLeft: 0.18, frontRight: 1 },
    };
    const biased = advanceStyle(selectedStyle, createCarChassisState(0), 0.3, input);
    const open = advanceStyle(openStyle, createCarChassisState(0), 0.3, input);

    expect(biased.signedSpeed).toBeGreaterThan(open.signedSpeed);
    expect(Math.abs(biased.state.frontDifferentialCouplingForce)).toBeGreaterThan(0);
    expect(open.state.frontDifferentialCouplingForce).toBe(0);
  });

  it("uses a milder differential bias during coast-side engine braking", () => {
    const selectedStyle = CAR_ENGINE_STYLES.rally;
    const initial = {
      ...createCarChassisState(0, 480),
      driveDirection: 1 as const,
      frontLeftWheelSpeed: 620,
      frontRightWheelSpeed: 340,
      rearLeftWheelSpeed: 570,
      rearRightWheelSpeed: 370,
    };
    const power = stepCarChassis(initial, selectedStyle, {
      deltaSeconds: 1 / 180,
      steering: 0,
      throttle: 1,
      wheelForceNewtons: 4_000,
    }).state;
    const coast = stepCarChassis(initial, selectedStyle, {
      deltaSeconds: 1 / 180,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: -4_000,
    }).state;

    expect(Math.abs(power.frontDifferentialCouplingForce))
      .toBeGreaterThan(Math.abs(coast.frontDifferentialCouplingForce));
    expect(Math.abs(power.centerDifferentialCouplingForce))
      .toBeGreaterThan(Math.abs(coast.centerDifferentialCouplingForce));
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label transmits closed-throttle overrun without applying the service brake",
    (selectedStyle) => {
      const initialSpeed = getCarMaximumPageSpeed(selectedStyle, 1) * 0.46;
      let engineBraked: CarChassisState = {
        ...createCarChassisState(0, initialSpeed),
        driveDirection: 1 as const,
      };
      let freeRolling: CarChassisState = { ...engineBraked };
      let drivetrain = {
        ...createCarDrivetrainState(selectedStyle),
        clutch: 1,
        engineLoad: 0.7,
        lastLoad: 0.7,
        lastSpeedRatio: 0.46,
        rpm: 2_900,
      };
      let sawOverrunForce = false;
      for (let frame = 0; frame < 90; frame += 1) {
        const signedSpeed = getCarSignedSpeed(engineBraked);
        const mechanical = updateCarDrivetrain(drivetrain, selectedStyle, {
          deltaSeconds: 1 / 180,
          drivenWheelSpeedRatio: getCarDrivenWheelSpeed(engineBraked, selectedStyle)
            / getCarMaximumPageSpeed(selectedStyle, 1),
          engagedDirection: engineBraked.driveDirection,
          serviceBrake: false,
          signedSpeedRatio: signedSpeed / getCarMaximumPageSpeed(selectedStyle, 1),
          steering: 0,
          throttle: 0,
        });
        drivetrain = mechanical.state;
        sawOverrunForce ||= mechanical.output.wheelForceNewtons < -1;
        engineBraked = stepCarChassis(engineBraked, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering: 0,
          throttle: 0,
          wheelForceNewtons: mechanical.output.wheelForceNewtons,
        }).state;
        freeRolling = stepCarChassis(freeRolling, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering: 0,
          throttle: 0,
          wheelForceNewtons: 0,
        }).state;
      }

      expect(sawOverrunForce, selectedStyle.label).toBe(true);
      expect(engineBraked.brakePressure, selectedStyle.label).toBe(0);
      expect(getCarSignedSpeed(engineBraked), selectedStyle.label)
        .toBeLessThan(getCarSignedSpeed(freeRolling) - 1);
      expect(getCarSignedSpeed(engineBraked), selectedStyle.label).toBeGreaterThan(0);
    },
  );

  it("uses engine drag control instead of acceleration TCS during driven-wheel overrun slip", () => {
    const initial: CarChassisState = {
      ...createCarChassisState(0, 560),
      driveDirection: 1,
      frontLeftLongitudinalSlip: -0.72,
      frontLeftWheelSpeed: 230,
      frontRightWheelSpeed: 560,
    };
    const controlled = stepCarChassis(initial, style, {
      deltaSeconds: 1 / 180,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: -4_500,
    }).state;

    expect(controlled.engineDragControlActivity).toBeGreaterThan(0);
    expect(controlled.tractionControlActivity).toBe(0);
    expect(controlled.frontLeftLongitudinalSlip).toBeGreaterThan(-1);
  });

  it("retains overrun torque through the initial service-brake ramp", () => {
    const initial: CarChassisState = {
      ...createCarChassisState(0, 580),
      driveDirection: 1,
    };
    const coasting = stepCarChassis(initial, style, {
      deltaSeconds: 1 / 180,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: -2_400,
    }).state;
    const braking = stepCarChassis(coasting, style, {
      deltaSeconds: 1 / 180,
      steering: 0,
      throttle: -1,
      wheelForceNewtons: -2_400,
    }).state;

    expect(coasting.frontDrivelineForce).toBeLessThan(0);
    expect(braking.frontDrivelineForce).toBeLessThan(0);
    expect(braking.brakePressure).toBeGreaterThan(0);
    expect(braking.frontLongitudinalAcceleration + braking.rearLongitudinalAcceleration)
      .toBeLessThanOrEqual(
        coasting.frontLongitudinalAcceleration + coasting.rearLongitudinalAcceleration,
      );
  });

  it("lets stability control reduce destabilizing negative driveline torque", () => {
    const unstable: CarChassisState = {
      ...createCarChassisState(0, 700),
      driveDirection: 1,
      velocityY: 240,
      yawRate: 0.95,
    };
    const unassistedStyle = {
      ...style,
      controls: {
        ...style.controls,
        driverAids: {
          ...style.controls.driverAids,
          stabilityEngineReduction: 0,
        },
      },
    };
    const controlled = stepCarChassis(unstable, style, {
      deltaSeconds: 1 / 180,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: -4_000,
    }).state;
    const unassisted = stepCarChassis(unstable, unassistedStyle, {
      deltaSeconds: 1 / 180,
      steering: 0,
      throttle: 0,
      wheelForceNewtons: -4_000,
    }).state;

    expect(Math.abs(controlled.frontDrivelineForce))
      .toBeLessThan(Math.abs(unassisted.frontDrivelineForce));
  });

  it("stops under sustained braking without overshooting into reverse", () => {
    let state = createCarChassisState(0, 620);
    let distance = 0;
    for (let frame = 0; frame < 240; frame += 1) {
      const output = stepCarChassis(state, style, {
        ...baseInput,
        throttle: -1,
        wheelForceNewtons: reverseWheelForce,
      });
      distance += output.displacementX;
      state = output.state;
      if (Math.abs(output.signedSpeed) < 1) break;
    }

    expect(distance).toBeGreaterThan(20);
      expect(distance).toBeLessThan(300);
    expect(getCarSignedSpeed(state)).toBeGreaterThanOrEqual(0);
  });

  it("clears wheel force and slip through the shared zero-speed constraint", () => {
    let state = createCarChassisState(0, 18);
    for (let frame = 0; frame < 120; frame += 1) {
      const output = stepCarChassis(state, style, {
        ...baseInput,
        throttle: -1,
        wheelForceNewtons: reverseWheelForce,
      });
      state = output.state;
      if (output.signedSpeed === 0) break;
    }

    expect(getCarSignedSpeed(state)).toBe(0);
    expect([
      state.frontLeftWheelSpeed,
      state.frontRightWheelSpeed,
      state.rearLeftWheelSpeed,
      state.rearRightWheelSpeed,
      state.frontLeftLongitudinalForce,
      state.frontRightLongitudinalForce,
      state.rearLeftLongitudinalForce,
      state.rearRightLongitudinalForce,
      state.frontLeftLongitudinalSlip,
      state.frontRightLongitudinalSlip,
      state.rearLeftLongitudinalSlip,
      state.rearRightLongitudinalSlip,
    ]).toEqual(Array(12).fill(0));
  });

  it("responds per wheel on a split-grip launch", () => {
    const output = advance(createCarChassisState(0, 260), 0.18, {
      throttle: 1,
      wheelGripMultipliers: {
        frontLeft: 0.32,
        frontRight: 1,
      },
    });

    expect(output.state.frontLeftLongitudinalSlip)
      .not.toBeCloseTo(output.state.frontRightLongitudinalSlip, 3);
    expect(output.state.frontDifferentialCouplingForce).not.toBe(0);
  });

  it("retains steering authority under braking without exceeding combined grip", () => {
    const initial = createCarChassisState(0, 520);
    const brakingTurn = advance(initial, 0.06, {
      steering: 1,
      throttle: -1,
      wheelForceNewtons: reverseWheelForce,
    });

    expect(brakingTurn.state.brakePressure).toBeGreaterThan(0.7);
    expect(brakingTurn.state.tireSlip).toBeGreaterThan(0);
    expect(Math.abs(brakingTurn.state.yawRate)).toBeLessThanOrEqual(2);
    expect(brakingTurn.signedSpeed).toBeLessThan(520);
    const gripDemand = Math.hypot(
      brakingTurn.state.longitudinalAcceleration / (style.physics.lateralGrip * 2),
      brakingTurn.state.lateralAcceleration / style.physics.lateralGrip,
    );
    expect(gripDemand).toBeLessThanOrEqual(1.001);
    expect(Math.abs(brakingTurn.state.frontLongitudinalSlip)).toBeGreaterThan(0);
  });

  it("keeps combined contact-patch force continuous through a brake-turn transition", () => {
    let state = createCarChassisState(0, 520);
    let previousForces = [
      state.frontLeftLongitudinalForce,
      state.frontLeftLateralForce,
      state.frontRightLongitudinalForce,
      state.frontRightLateralForce,
      state.rearLeftLongitudinalForce,
      state.rearLeftLateralForce,
      state.rearRightLongitudinalForce,
      state.rearRightLateralForce,
    ];
    let maximumNormalizedForceStep = 0;
    for (let frame = 0; frame < 90; frame += 1) {
      state = stepCarChassis(state, style, {
        ...baseInput,
        steering: 0.7,
        throttle: frame < 45 ? 0.4 : -1,
        wheelForceNewtons: frame < 45 ? 4_000 : reverseWheelForce,
      }).state;
      const forces = [
        state.frontLeftLongitudinalForce,
        state.frontLeftLateralForce,
        state.frontRightLongitudinalForce,
        state.frontRightLateralForce,
        state.rearLeftLongitudinalForce,
        state.rearLeftLateralForce,
        state.rearRightLongitudinalForce,
        state.rearRightLateralForce,
      ];
      const forceStep = Math.hypot(
        ...forces.map((force, index) => force - previousForces[index]),
      ) / (style.physics.massKg * 9.81);
      maximumNormalizedForceStep = Math.max(
        maximumNormalizedForceStep,
        forceStep,
      );
      previousForces = forces;
    }
    expect(maximumNormalizedForceStep).toBeLessThan(0.45);
  });

  it("tracks wheel speed separately from road speed when the tires saturate", () => {
    const output = advance(createCarChassisState(0, 500), 0.08, {
      steering: 1,
      throttle: -1,
      wheelForceNewtons: reverseWheelForce,
    });

    expect(output.state.frontWheelSpeed).not.toBeCloseTo(output.signedSpeed, 3);
    expect(Math.abs(output.state.frontLongitudinalSlip)).toBeGreaterThan(0);
  });

  it("routes launch torque through the configured driven axle", () => {
    const output = advance(createCarChassisState(0), 0.08, { throttle: 1 });

    expect(style.physics.driveBiasFront).toBe(1);
    expect(Math.abs(output.state.frontLongitudinalSlip))
      .toBeGreaterThan(Math.abs(output.state.rearLongitudinalSlip));
    expect(output.state.frontDrivelineForce).toBeGreaterThan(0);
    expect(output.state.rearDrivelineForce).toBe(0);
  });

  it("applies front-biased braking through separate axle forces", () => {
    const output = advance(createCarChassisState(0, 520), 0.035, {
      throttle: -1,
      wheelForceNewtons: reverseWheelForce,
    });

    expect(style.physics.brakeBiasFront).toBeGreaterThan(0.5);
    expect(Math.abs(output.state.frontLongitudinalAcceleration))
      .toBeGreaterThan(Math.abs(output.state.rearLongitudinalAcceleration));
  });

  it("builds keyboard steering intent progressively and reverses it decisively", () => {
    const initial = createCarChassisState(0, 360);
    const tap = stepCarChassis(initial, style, {
      ...baseInput,
      steering: 1,
    });
    const held = advance(initial, 0.12, { steering: 1 });
    const released = advance(held.state, 0.02, { steering: 0 });
    const reversed = advance(held.state, 0.02, { steering: -1 });

    expect(tap.state.steeringCommand).toBeGreaterThan(0);
    expect(tap.state.steeringCommand).toBeLessThan(held.state.steeringCommand);
    expect(held.state.steeringCommand).toBeCloseTo(1, 6);
    expect(reversed.state.steeringCommand).toBeLessThan(
      released.state.steeringCommand,
    );
  });

  it("countersteers faster while preserving geometric lock in reverse", () => {
    const forward = advance(createCarChassisState(0, 360), 0.16, { steering: 1 });
    const reverse = advance(createCarChassisState(0, -360), 0.16, { steering: 1 });
    const counter = stepCarChassis(forward.state, style, {
      ...baseInput,
      steering: -1,
      wheelForceNewtons: 0,
    });
    const release = stepCarChassis(forward.state, style, {
      ...baseInput,
      steering: 0,
      wheelForceNewtons: 0,
    });

    expect(Math.abs(reverse.state.steeringAngle))
      .toBeCloseTo(Math.abs(forward.state.steeringAngle), 1);
    expect(forward.state.steeringAngle - counter.state.steeringAngle)
      .toBeGreaterThan(forward.state.steeringAngle - release.state.steeringAngle);
  });

  it("returns the steering rack toward center after release", () => {
    const held = advance(createCarChassisState(0, 420), 0.22, { steering: 1 });
    const released = advance(held.state, 0.32, {
      steering: 0,
      throttle: 0,
      wheelForceNewtons: 0,
    });

    expect(Math.abs(released.state.steeringAngle))
      .toBeLessThan(Math.abs(held.state.steeringAngle) * 0.35);
  });

  it("ramps service braking and stops before engaging reverse", () => {
    let state = createCarChassisState(0, 360);
    const firstBrake = stepCarChassis(state, style, {
      ...baseInput,
      throttle: -1,
      wheelForceNewtons: reverseWheelForce,
    });
    expect(firstBrake.serviceBraking).toBe(true);
    expect(firstBrake.state.brakePressure).toBeGreaterThan(0);
    expect(firstBrake.state.brakePressure).toBeLessThan(1);
    expect(firstBrake.signedSpeed).toBeLessThan(360);
    state = firstBrake.state;

    let firstReverseFrame = -1;
    for (let frame = 1; frame < 240; frame += 1) {
      const update = stepCarChassis(state, style, {
        ...baseInput,
        throttle: -1,
        wheelForceNewtons: reverseWheelForce,
      });
      state = update.state;
      if (update.signedSpeed < -1) {
        firstReverseFrame = frame;
        break;
      }
    }

    expect(firstReverseFrame).toBeGreaterThan(8);
    expect(firstReverseFrame).toBeLessThan(120);
    expect(state.driveDirection).toBe(-1);
  });

  it("uses the same short, stop-first handoff when returning to forward", () => {
    let state = createCarChassisState(0, -180);
    let firstForwardFrame = -1;
    for (let frame = 0; frame < 120; frame += 1) {
      const update = stepCarChassis(state, style, { ...baseInput, throttle: 1 });
      state = update.state;
      if (update.signedSpeed > 1) {
        firstForwardFrame = frame;
        break;
      }
    }

    expect(firstForwardFrame).toBeGreaterThan(8);
    expect(firstForwardFrame).toBeLessThan(80);
    expect(state.driveDirection).toBe(1);
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label takes up brake contact before progressively building full pressure",
    (selectedStyle) => {
      const reverseForce = getCarWheelForceNewtons(selectedStyle, 1_750, -1, -1, 1);
      let state = createCarChassisState(0, 360);
      const contact = stepCarChassis(state, selectedStyle, {
        deltaSeconds: 1 / 180,
        steering: 0,
        throttle: -1,
        wheelForceNewtons: reverseForce,
      });
      state = contact.state;
      expect(state.brakePressure, selectedStyle.label).toBeGreaterThan(0);
      expect(state.brakePressure, selectedStyle.label)
        .toBeLessThanOrEqual(selectedStyle.controls.pedals.brakeContactPressure);
      for (let frame = 0; frame < 12; frame += 1) {
        state = stepCarChassis(state, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering: 0,
          throttle: -1,
          wheelForceNewtons: reverseForce,
        }).state;
      }
      expect(state.brakePressure, selectedStyle.label)
        .toBeGreaterThan(selectedStyle.controls.pedals.brakeContactPressure);
      const appliedPressure = state.brakePressure;
      state = stepCarChassis(state, selectedStyle, {
        deltaSeconds: 1 / 180,
        steering: 0,
        throttle: 0,
        wheelForceNewtons: 0,
      }).state;
      expect(state.brakePressure, selectedStyle.label).toBeLessThan(appliedPressure);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label changes direction under held steering without a heading snap",
    (selectedStyle) => {
      let state = createCarChassisState(0, 300);
      let priorHeading = state.heading;
      let maximumHeadingStep = 0;
      let sawReverse = false;
      for (let frame = 0; frame < 180; frame += 1) {
        const output = stepCarChassis(state, selectedStyle, {
          deltaSeconds: 1 / 180,
          steering: 0.55,
          throttle: -1,
          wheelForceNewtons: getCarWheelForceNewtons(
            selectedStyle,
            1_750,
            -1,
            -1,
            1,
          ),
        });
        state = output.state;
        maximumHeadingStep = Math.max(
          maximumHeadingStep,
          Math.abs(state.heading - priorHeading),
        );
        priorHeading = state.heading;
        sawReverse ||= output.signedSpeed < -20;
      }
      expect(sawReverse, selectedStyle.label).toBe(true);
      expect(maximumHeadingStep, selectedStyle.label).toBeLessThan(0.012);
      expect(Number.isFinite(state.yawRate), selectedStyle.label).toBe(true);
    },
  );

  it("resolves only the inward component of a glancing surface impact", () => {
    const pixelsPerMeter = style.physics.worldPixelsPerMeter;
    const state = {
      ...createCarChassisState(0),
      velocityX: 260,
      velocityY: -180,
      yawRate: 0.8,
    };
    const resolved = resolveCarSurfaceCollision(state, { x: 0, y: 1 }, {
      contactOffset: { x: 60, y: -35 },
      massKg: style.physics.massKg,
      pixelsPerMeter,
      yawInertiaKgM2: getCarYawInertiaKgM2(style.id, style.physics.massKg),
    });

    const contactXMetres = 60 / pixelsPerMeter;
    const resolvedContactNormalSpeed = resolved.velocityY / pixelsPerMeter
      + resolved.yawRate * contactXMetres;
    expect(resolvedContactNormalSpeed).toBeGreaterThanOrEqual(-0.0001);
    expect(resolved.velocityX).toBeGreaterThan(0);
    expect(resolved.velocityX).toBeLessThan(state.velocityX);
    expect(resolved.yawRate).not.toBeCloseTo(state.yawRate, 5);
  });

  it("does not reverse a car that is already separating from a surface", () => {
    const state = {
      ...createCarChassisState(0),
      velocityX: 80,
      velocityY: 20,
    };

    expect(resolveCarSurfaceCollision(state, { x: 0, y: 1 })).toBe(state);
    expect(getCarSignedSpeed(state)).toBe(80);
  });

  it("does not add kinetic energy during a barrier impulse", () => {
    const pixelsPerMeter = style.physics.worldPixelsPerMeter;
    const state = {
      ...createCarChassisState(0),
      velocityX: 420,
      velocityY: -210,
      yawRate: 0.55,
    };
    const resolved = resolveCarSurfaceCollision(state, { x: 0, y: 1 }, {
      contactOffset: { x: -55, y: -28 },
      friction: 0.75,
      massKg: style.physics.massKg,
      pixelsPerMeter,
      restitution: 0.05,
      yawInertiaKgM2: getCarYawInertiaKgM2(style.id, style.physics.massKg),
    });
    const inertia = getCarYawInertiaKgM2(style.id, style.physics.massKg);
    const energy = (candidate: CarChassisState) => 0.5 * style.physics.massKg
        * Math.hypot(
          candidate.velocityX / pixelsPerMeter,
          candidate.velocityY / pixelsPerMeter,
        ) ** 2
      + 0.5 * inertia * candidate.yawRate * candidate.yawRate;

    expect(energy(resolved)).toBeLessThanOrEqual(energy(state));
  });

  it("rebases stale wheel and tire states after an external body impulse", () => {
    const beforeImpact = {
      ...createCarChassisState(0.35, 280),
      frontLeftLongitudinalForce: 2_400,
      frontRightLongitudinalForce: 2_100,
      rearLeftLongitudinalForce: 1_700,
      rearRightLongitudinalForce: 1_500,
      frontLeftWheelSpeed: 520,
      frontRightWheelSpeed: 500,
      rearLeftWheelSpeed: 480,
      rearRightWheelSpeed: 470,
      yawRate: 0.45,
    };
    const impacted = resolveCarSurfaceCollision(beforeImpact, { x: -1, y: 0 }, {
      contactOffset: { x: 38, y: -18 },
      massKg: style.physics.massKg,
      pixelsPerMeter: style.physics.worldPixelsPerMeter,
      restitution: 0,
    });
    const reconciled = reconcileCarWheelStateAfterCollision(impacted, style);
    const mildReconciliation = reconcileCarWheelStateAfterCollision(
      impacted,
      style,
      { normalImpulse: style.physics.massKg * 0.35 },
    );

    const { forward, right } = getCarWorldAxes(impacted.heading);
    const localizedReconciliation = reconcileCarWheelStateAfterCollision(
      impacted,
      style,
      {
        contactOffset: {
          x: forward.x * 70 + right.x * 35,
          y: forward.y * 70 + right.y * 35,
        },
        normalImpulse: style.physics.massKg * 1.4,
      },
    );
    const rightSideReconciliation = reconcileCarWheelStateAfterCollision(
      impacted,
      style,
      {
        contacts: [
          {
            contactOffset: {
              x: forward.x * 70 + right.x * 35,
              y: forward.y * 70 + right.y * 35,
            },
            normalImpulse: style.physics.massKg * 0.7,
          },
          {
            contactOffset: {
              x: forward.x * -70 + right.x * 35,
              y: forward.y * -70 + right.y * 35,
            },
            normalImpulse: style.physics.massKg * 0.7,
          },
        ],
      },
    );
    expect([
      reconciled.frontLeftLongitudinalForce,
      reconciled.frontRightLongitudinalForce,
      reconciled.rearLeftLongitudinalForce,
      reconciled.rearRightLongitudinalForce,
    ]).toEqual([0, 0, 0, 0]);
    expect([
      reconciled.frontLeftLongitudinalSlip,
      reconciled.frontRightLongitudinalSlip,
      reconciled.rearLeftLongitudinalSlip,
      reconciled.rearRightLongitudinalSlip,
    ]).toEqual([0, 0, 0, 0]);
    expect([
      reconciled.frontLeftWheelSpeed,
      reconciled.frontRightWheelSpeed,
      reconciled.rearLeftWheelSpeed,
      reconciled.rearRightWheelSpeed,
    ].every(Number.isFinite)).toBe(true);
    expect(reconciled.frontLeftWheelSpeed)
      .not.toBeCloseTo(reconciled.frontRightWheelSpeed, 4);
    expect(Math.abs(mildReconciliation.frontLeftLongitudinalForce))
      .toBeGreaterThan(0);
    expect(Math.abs(mildReconciliation.frontLeftLongitudinalForce))
      .toBeLessThan(Math.abs(impacted.frontLeftLongitudinalForce));
    expect(Math.abs(
      mildReconciliation.frontLeftWheelSpeed - reconciled.frontLeftWheelSpeed,
    )).toBeLessThan(Math.abs(
      impacted.frontLeftWheelSpeed - reconciled.frontLeftWheelSpeed,
    ));
    const frontRightRetention = Math.abs(
      localizedReconciliation.frontRightLongitudinalForce
        / impacted.frontRightLongitudinalForce,
    );
    const rearLeftRetention = Math.abs(
      localizedReconciliation.rearLeftLongitudinalForce
        / impacted.rearLeftLongitudinalForce,
    );
    expect(frontRightRetention).toBeLessThan(rearLeftRetention * 0.35);

    const leftRetention = (
      Math.abs(
        rightSideReconciliation.frontLeftLongitudinalForce
          / impacted.frontLeftLongitudinalForce,
      )
      + Math.abs(
        rightSideReconciliation.rearLeftLongitudinalForce
          / impacted.rearLeftLongitudinalForce,
      )
    ) / 2;
    const rightRetention = (
      Math.abs(
        rightSideReconciliation.frontRightLongitudinalForce
          / impacted.frontRightLongitudinalForce,
      )
      + Math.abs(
        rightSideReconciliation.rearRightLongitudinalForce
          / impacted.rearRightLongitudinalForce,
      )
    ) / 2;
    expect(rightRetention).toBeLessThan(leftRetention * 0.7);
  });

  it("keeps planar body impacts out of the steering rack", () => {
    const movingSideways = {
      ...createCarChassisState(0, 180),
      steeringVelocity: 0.2,
      velocityY: -220,
    };
    const impact = resolveCarSurfaceCollision(movingSideways, { x: 0, y: 1 }, {
      contactOffset: { x: 36, y: 16 },
      massKg: style.physics.massKg,
      pixelsPerMeter: style.physics.worldPixelsPerMeter,
      restitution: 0,
    });

    expect(impact.steeringVelocity).toBe(movingSideways.steeringVelocity);
  });

  it("relaxes abrupt surface changes through each contact patch", () => {
    let state = createCarChassisState(0, 260);
    const input = {
      ...baseInput,
      throttle: 0,
      wheelForceNewtons: 0,
      wheelGripMultipliers: {
        frontLeft: 0.45,
        frontRight: 1.08,
        rearLeft: 0.45,
        rearRight: 1.08,
      },
    };
    state = stepCarChassis(state, style, input).state;
    expect(state.frontLeftGripMultiplier).toBeGreaterThan(0.45);
    expect(state.frontLeftGripMultiplier).toBeLessThan(1);
    expect(state.frontRightGripMultiplier).toBeGreaterThan(1);
    for (let frame = 0; frame < 180; frame += 1) {
      state = stepCarChassis(state, style, input).state;
    }
    expect(state.frontLeftGripMultiplier).toBeCloseTo(0.45, 2);
    expect(state.frontRightGripMultiplier).toBeCloseTo(1.08, 2);
  });

  it("holds individual wheels at crawl speed under sustained service braking", () => {
    let state = createCarChassisState(0, 9);
    for (let frame = 0; frame < 90; frame += 1) {
      state = stepCarChassis(state, style, {
        ...baseInput,
        parking: true,
        throttle: 0,
        wheelForceNewtons: 0,
        wheelGripMultipliers: {
          frontLeft: 0.55,
          frontRight: 1,
          rearLeft: 0.55,
          rearRight: 1,
        },
      }).state;
      if (state.restState === "held") break;
    }
    expect(Math.abs(state.frontLeftWheelSpeed)).toBeLessThan(1);
    expect(Math.abs(state.frontRightWheelSpeed)).toBeLessThan(1);
    expect(Math.abs(state.rearLeftWheelSpeed)).toBeLessThan(1);
    expect(Math.abs(state.rearRightWheelSpeed)).toBeLessThan(1);
    expect(Math.hypot(state.velocityX, state.velocityY)).toBeLessThan(1);
  });

  it("warm-starts a persistent contact without leaving inward velocity", () => {
    const normal = { x: 0, y: 1 };
    const first = resolveCarSurfaceContact({
      ...createCarChassisState(0),
      velocityX: 70,
      velocityY: -180,
    }, normal, {
      friction: 0.8,
      pixelsPerMeter: style.physics.worldPixelsPerMeter,
      restitution: 0,
    });
    const persistent = resolveCarSurfaceContact({
      ...first.state,
      velocityY: -24,
    }, normal, {
      accumulatedNormalImpulse: first.normalImpulse,
      accumulatedTangentImpulse: first.tangentImpulse,
      friction: 0.8,
      pixelsPerMeter: style.physics.worldPixelsPerMeter,
      restitution: 0,
      warmStartScale: 0.72,
    });

    expect(first.normalImpulse).toBeGreaterThan(0);
    expect(persistent.normalImpulse).toBeGreaterThan(0);
    expect(persistent.state.velocityY).toBeGreaterThanOrEqual(-0.001);
    expect(Math.abs(persistent.state.yawRate)).toBeLessThanOrEqual(1.45);
  });

  it("settles simultaneous corner contacts without restoring inward velocity", () => {
    const options = {
      friction: 0,
      massKg: style.physics.massKg,
      pixelsPerMeter: style.physics.worldPixelsPerMeter,
      restitution: 0,
      yawInertiaKgM2: getCarYawInertiaKgM2(style.id, style.physics.massKg),
    };
    const contacts = [
      { normal: { x: 1, y: 0 }, contactOffset: { x: -48, y: 28 } },
      { normal: { x: 0, y: 1 }, contactOffset: { x: 54, y: -30 } },
    ];
    let resolved = {
      ...createCarChassisState(0),
      velocityX: -260,
      velocityY: -190,
      yawRate: 0.7,
    };
    for (let pass = 0; pass < 3; pass += 1) {
      contacts.forEach((contact) => {
        resolved = resolveCarSurfaceCollision(resolved, contact.normal, {
          ...options,
          contactOffset: contact.contactOffset,
        });
      });
    }
    contacts.forEach(({ contactOffset, normal }) => {
      const pixelsPerMeter = style.physics.worldPixelsPerMeter;
      const offsetX = contactOffset.x / pixelsPerMeter;
      const offsetY = contactOffset.y / pixelsPerMeter;
      const contactVelocityX = resolved.velocityX / pixelsPerMeter
        - resolved.yawRate * offsetY;
      const contactVelocityY = resolved.velocityY / pixelsPerMeter
        + resolved.yawRate * offsetX;
      expect(contactVelocityX * normal.x + contactVelocityY * normal.y)
        .toBeGreaterThanOrEqual(-0.0001);
    });
  });

  it("keeps a repeatedly driven corner contact bounded over time", () => {
    const contacts = [
      { normal: { x: 1, y: 0 }, contactOffset: { x: -48, y: 28 } },
      { normal: { x: 0, y: 1 }, contactOffset: { x: 54, y: -30 } },
    ];
    let state = createCarChassisState(0);
    let maximumYawRate = 0;
    for (let frame = 0; frame < 180; frame += 1) {
      state = {
        ...state,
        velocityX: state.velocityX - 8,
        velocityY: state.velocityY - 6,
      };
      for (let pass = 0; pass < 3; pass += 1) {
        contacts.forEach(({ contactOffset, normal }) => {
          state = resolveCarSurfaceCollision(state, normal, {
            contactOffset,
            friction: pass === 0 ? 0.82 : 0,
            massKg: style.physics.massKg,
            pixelsPerMeter: style.physics.worldPixelsPerMeter,
            restitution: 0,
            yawInertiaKgM2: getCarYawInertiaKgM2(style.id, style.physics.massKg),
          });
        });
      }
      maximumYawRate = Math.max(maximumYawRate, Math.abs(state.yawRate));
    }
    contacts.forEach(({ contactOffset, normal }) => {
      const pixelsPerMeter = style.physics.worldPixelsPerMeter;
      const offsetX = contactOffset.x / pixelsPerMeter;
      const offsetY = contactOffset.y / pixelsPerMeter;
      const contactVelocityX = state.velocityX / pixelsPerMeter
        - state.yawRate * offsetY;
      const contactVelocityY = state.velocityY / pixelsPerMeter
        + state.yawRate * offsetX;
      expect(contactVelocityX * normal.x + contactVelocityY * normal.y)
        .toBeGreaterThanOrEqual(-0.0001);
    });
    expect(maximumYawRate).toBeLessThan(1.45);
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label preserves progressive steering response across the speed range",
    (selectedStyle) => {
      const steeringLocks = [0.1, 0.25, 0.45, 0.65, 0.85].map((speedRatio) => {
        const result = advanceStyle(
          selectedStyle,
          createCarChassisState(
            0,
            getCarMaximumPageSpeed(selectedStyle, 1) * speedRatio,
          ),
          0.2,
          { steering: 0.7 },
        );
        expect(Number.isFinite(result.state.heading), selectedStyle.label).toBe(true);
        expect(Number.isFinite(result.state.yawRate), selectedStyle.label).toBe(true);
        expect(result.state.heading, `${selectedStyle.label} at ${speedRatio}`)
          .toBeGreaterThan(0);
        expect(result.state.yawRate, `${selectedStyle.label} at ${speedRatio}`)
          .toBeGreaterThan(0);
        return Math.abs(result.state.steeringAngle);
      });
      for (let index = 1; index < steeringLocks.length; index += 1) {
        expect(steeringLocks[index], selectedStyle.label)
          .toBeLessThanOrEqual(steeringLocks[index - 1] + 0.006);
      }
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label completes a deterministic forward, slalom, reverse, and recovery trace",
    (selectedStyle) => {
      const trace = [
        { frames: 120, steering: 0, throttle: 1 },
        { frames: 65, steering: 0.7, throttle: 1 },
        { frames: 65, steering: -0.7, throttle: 0.65 },
        { frames: 180, steering: 0, throttle: -1 },
        { frames: 120, steering: -0.45, throttle: -1 },
        { frames: 180, steering: 0, throttle: 1 },
        { frames: 120, steering: 0.35, throttle: 1 },
      ] as const;
      let chassis = createCarChassisState(0);
      let drivetrain = createCarDrivetrainState(selectedStyle);
      let sawForward = false;
      let sawReverse = false;
      let maximumSideslip = 0;
      trace.forEach((segment) => {
        for (let frame = 0; frame < segment.frames; frame += 1) {
          const signedSpeed = getCarSignedSpeed(chassis);
          const speedLimit = signedSpeed < 0
            ? getCarMaximumPageSpeed(selectedStyle, -1)
            : getCarMaximumPageSpeed(selectedStyle, 1);
          const intent = getCarLongitudinalIntent(chassis, segment.throttle, {
            controls: selectedStyle.controls,
          });
          const mechanical = updateCarDrivetrain(drivetrain, selectedStyle, {
            deltaSeconds: 1 / 180,
            drivenWheelSpeedRatio: getCarDrivenWheelSpeed(chassis, selectedStyle)
              / Math.max(1, speedLimit),
            engagedDirection: chassis.driveDirection,
            serviceBrake: intent.serviceBraking,
            signedSpeedRatio: signedSpeed / Math.max(1, speedLimit),
            steering: segment.steering,
            throttle: segment.throttle,
          });
          drivetrain = mechanical.state;
          chassis = stepCarChassis(chassis, selectedStyle, {
            deltaSeconds: 1 / 180,
            steering: segment.steering,
            throttle: segment.throttle,
            wheelForceNewtons: mechanical.output.wheelForceNewtons,
          }).state;
          const { forward, right } = getCarWorldAxes(chassis.heading);
          const longitudinal = chassis.velocityX * forward.x
            + chassis.velocityY * forward.y;
          const lateral = chassis.velocityX * right.x + chassis.velocityY * right.y;
          maximumSideslip = Math.max(
            maximumSideslip,
            Math.abs(lateral) / Math.max(100, Math.abs(longitudinal)),
          );
          sawForward ||= signedSpeed > 30;
          sawReverse ||= signedSpeed < -30;
          expect(Number.isFinite(chassis.heading), selectedStyle.label).toBe(true);
          expect(Number.isFinite(chassis.velocityX), selectedStyle.label).toBe(true);
          expect(Number.isFinite(chassis.velocityY), selectedStyle.label).toBe(true);
        }
      });
      expect(sawForward, selectedStyle.label).toBe(true);
      expect(sawReverse, selectedStyle.label).toBe(true);
      expect(chassis.driveDirection, selectedStyle.label).toBe(1);
      expect(getCarSignedSpeed(chassis), selectedStyle.label).toBeGreaterThan(30);
      expect(maximumSideslip, selectedStyle.label).toBeLessThan(0.45);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label remains deterministic across render cadence and a recoverable hitch",
    (selectedStyle) => {
      const run = (renderDeltas: number[]) => {
        const physicsStep = 1 / 180;
        let accumulator = 0;
        let physicsFrame = 0;
        let chassis = createCarChassisState(0);
        let drivetrain = createCarDrivetrainState(selectedStyle);
        renderDeltas.forEach((renderDelta) => {
          accumulator = Math.min(0.05, accumulator + renderDelta);
          while (accumulator + 1e-9 >= physicsStep) {
            const steering = physicsFrame < 72 ? 0 : physicsFrame < 144 ? 0.65 : -0.4;
            const signedSpeed = getCarSignedSpeed(chassis);
            const intent = getCarLongitudinalIntent(chassis, 1, {
              controls: selectedStyle.controls,
            });
            const mechanical = updateCarDrivetrain(drivetrain, selectedStyle, {
              deltaSeconds: physicsStep,
              drivenWheelSpeedRatio: getCarDrivenWheelSpeed(chassis, selectedStyle)
                / getCarMaximumPageSpeed(selectedStyle, 1),
              engagedDirection: chassis.driveDirection,
              serviceBrake: intent.serviceBraking,
              signedSpeedRatio: signedSpeed
                / getCarMaximumPageSpeed(selectedStyle, 1),
              steering,
              throttle: 1,
            });
            drivetrain = mechanical.state;
            chassis = stepCarChassis(chassis, selectedStyle, {
              deltaSeconds: physicsStep,
              steering,
              throttle: 1,
              wheelForceNewtons: mechanical.output.wheelForceNewtons,
            }).state;
            accumulator -= physicsStep;
            physicsFrame += 1;
          }
        });
        return chassis;
      };
      const seconds = 1.2;
      const cadence = (hz: number) => Array.from(
        { length: Math.round(seconds * hz) },
        () => 1 / hz,
      );
      const thirty = run(cadence(30));
      const sixty = run(cadence(60));
      const oneTwenty = run(cadence(120));
      const hitch = run([
        ...Array.from({ length: 30 }, () => 1 / 60),
        0.05,
        ...Array.from({ length: 39 }, () => 1 / 60),
      ]);

      [sixty, oneTwenty, hitch].forEach((candidate) => {
        expect(getCarSignedSpeed(candidate), selectedStyle.label)
          .toBeCloseTo(getCarSignedSpeed(thirty), 6);
        expect(candidate.heading, selectedStyle.label).toBeCloseTo(thirty.heading, 6);
        expect(candidate.yawRate, selectedStyle.label).toBeCloseTo(thirty.yawRate, 6);
      });
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label stays settled through lift-off and trail braking",
    (selectedStyle) => {
      const speed = getCarMaximumPageSpeed(selectedStyle, 1) * 0.5;
      const poweredForce = getCarWheelForceNewtons(selectedStyle, 1_900, 2, 1, 0.55);
      const corner = advanceStyle(selectedStyle, createCarChassisState(0, speed), 0.32, {
        steering: 0.55,
        throttle: 0.55,
        wheelForceNewtons: poweredForce,
      });
      const lifted = advanceStyle(selectedStyle, corner.state, 0.28, {
        steering: 0.55,
        throttle: 0,
        wheelForceNewtons: 0,
      });
      const trailBraked = advanceStyle(selectedStyle, corner.state, 0.14, {
        steering: 0.55,
        throttle: -1,
        wheelForceNewtons: getCarWheelForceNewtons(selectedStyle, 1_750, -1, -1, 1),
      });

      expect(Math.sign(lifted.state.yawRate), selectedStyle.label)
        .toBe(Math.sign(corner.state.yawRate));
      expect(Math.abs(lifted.state.yawRate), selectedStyle.label).toBeLessThan(1.45);
      expect(lifted.signedSpeed, selectedStyle.label).toBeLessThan(corner.signedSpeed);
      expect(trailBraked.signedSpeed, selectedStyle.label).toBeLessThan(lifted.signedSpeed);
      expect(
        trailBraked.state.yawRate * corner.state.yawRate,
        selectedStyle.label,
      ).toBeGreaterThanOrEqual(0);
      expect(trailBraked.state.tireSlip, selectedStyle.label).toBeLessThanOrEqual(1);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label remains controllable during split-grip emergency braking",
    (selectedStyle) => {
      const initialSpeed = getCarMaximumPageSpeed(selectedStyle, 1) * 0.48;
      const braked = advanceStyle(
        selectedStyle,
        createCarChassisState(0, initialSpeed),
        0.22,
        {
          steering: 0.18,
          throttle: -1,
          wheelForceNewtons: getCarWheelForceNewtons(selectedStyle, 1_750, -1, -1, 1),
          wheelGripMultipliers: {
            frontLeft: 0.35,
            rearLeft: 0.35,
          },
        },
      );

      expect(braked.signedSpeed, selectedStyle.label).toBeLessThan(initialSpeed * 0.85);
      expect(braked.state.absActivity, selectedStyle.label).toBeGreaterThan(0);
      expect(Math.abs(braked.state.yawRate), selectedStyle.label).toBeLessThan(0.95);
      expect(Math.abs(braked.state.heading), selectedStyle.label).toBeLessThan(0.18);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label reverses through a figure eight without steering inversion or runaway yaw",
    (selectedStyle) => {
      const reverseForce = getCarWheelForceNewtons(selectedStyle, 1_750, -1, -1, 0.5);
      const firstArc = advanceStyle(
        selectedStyle,
        createCarChassisState(0, -getCarMaximumPageSpeed(selectedStyle, -1) * 0.45),
        0.42,
        { steering: 0.7, throttle: -0.5, wheelForceNewtons: reverseForce },
      );
      const secondArc = advanceStyle(selectedStyle, firstArc.state, 0.62, {
        steering: -0.7,
        throttle: -0.5,
        wheelForceNewtons: reverseForce,
      });

      expect(firstArc.state.yawRate, selectedStyle.label).toBeLessThan(0);
      expect(secondArc.state.yawRate, selectedStyle.label).toBeGreaterThan(0);
      expect(firstArc.signedSpeed, selectedStyle.label).toBeLessThan(0);
      expect(secondArc.signedSpeed, selectedStyle.label).toBeLessThan(0);
      expect(Math.abs(secondArc.state.yawRate), selectedStyle.label).toBeLessThan(1.45);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label lets tire forces own road-speed yaw",
    (selectedStyle) => {
      const speed = getCarMaximumPageSpeed(selectedStyle, 1) * 0.72;
      const assisted = advanceStyle(
        selectedStyle,
        createCarChassisState(0, speed),
        0.3,
        { steering: 0.55 },
      );
      const tireOnly = advanceStyle(
        selectedStyle,
        createCarChassisState(0, speed),
        0.3,
        { steering: 0.55 },
      );

      expect(tireOnly.state.heading, selectedStyle.label).toBeGreaterThan(0.03);
      expect(Math.abs(assisted.state.heading - tireOnly.state.heading), selectedStyle.label)
        .toBeLessThan(Math.abs(assisted.state.heading) * 0.25);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label remains responsive, stable, and brakeable in a complete maneuver",
    (selectedStyle) => {
      const launchForce = getCarWheelForceNewtons(
        selectedStyle,
        1_750,
        1,
        1,
        1,
      );
      const launched = advanceStyle(
        selectedStyle,
        createCarChassisState(0),
        0.75,
        { throttle: 1, wheelForceNewtons: launchForce },
      );
      const cornered = advanceStyle(selectedStyle, launched.state, 0.45, {
        steering: 0.7,
        throttle: 0.35,
        wheelForceNewtons: launchForce * 0.35,
      });
      const reverseForce = getCarWheelForceNewtons(
        selectedStyle,
        1_750,
        -1,
        -1,
        1,
      );
      const braked = advanceStyle(selectedStyle, cornered.state, 0.45, {
        steering: 0,
        throttle: -1,
        wheelForceNewtons: reverseForce,
      });

      expect(launched.signedSpeed)
        .toBeGreaterThan(
          getCarMaximumPageSpeed(selectedStyle, 1)
            * selectedStyle.handlingTargets.minimumForwardLaunchRatio,
        );
      expect(Math.abs(cornered.state.heading)).toBeGreaterThan(0.08);
      expect(Number.isFinite(cornered.state.yawRate)).toBe(true);
      expect(cornered.state.tireSlip).toBeLessThanOrEqual(1);
      expect(braked.signedSpeed).toBeLessThan(cornered.signedSpeed);
    },
  );
});
