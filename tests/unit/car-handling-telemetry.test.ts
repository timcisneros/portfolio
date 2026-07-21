import { describe, expect, it } from "vitest";
import {
  createCarChassisState,
  getCarSignedSpeed,
} from "../../lib/carChassis";
import { stepCarDynamics } from "../../lib/carDynamics";
import {
  CAR_ENGINE_STYLES,
  getCarMaximumPageSpeed,
  type CarEngineStyle,
} from "../../lib/carEngineStyles";
import { createCarDrivetrainState } from "../../lib/carDrivetrain";

const STEP = 1 / 180;

function runHandlingTrace(style: CarEngineStyle) {
  let chassis = createCarChassisState(0);
  let drivetrain = createCarDrivetrainState(style);
  let distance = 0;
  const samples: Array<{
    abs: number;
    brakePressure: number;
    heading: number;
    speed: number;
    time: number;
  }> = [];
  let forwardThirtyFivePercentSeconds = Number.POSITIVE_INFINITY;
  let reverseFifteenPercentSeconds = Number.POSITIVE_INFINITY;

  const step = (throttle: number, steering: number) => {
    const dynamics = stepCarDynamics({ chassis, drivetrain }, style, {
      deltaSeconds: STEP,
      steering,
      throttle,
    });
    drivetrain = dynamics.state.drivetrain;
    chassis = dynamics.state.chassis;
    distance += Math.hypot(
      dynamics.chassis.displacementX,
      dynamics.chassis.displacementY,
    );
  };

  for (let frame = 0; frame < 270; frame += 1) {
    step(1, 0);
    if (
      forwardThirtyFivePercentSeconds === Number.POSITIVE_INFINITY
      && getCarSignedSpeed(chassis) >= getCarMaximumPageSpeed(style, 1) * 0.35
    ) forwardThirtyFivePercentSeconds = (frame + 1) * STEP;
    if (frame % 45 === 0) {
      samples.push({
        abs: chassis.absActivity,
        brakePressure: chassis.brakePressure,
        heading: chassis.heading,
        speed: getCarSignedSpeed(chassis),
        time: frame * STEP,
      });
    }
  }
  const launchSpeed = getCarSignedSpeed(chassis);
  let steeringResponseSeconds = Number.POSITIVE_INFINITY;
  for (let frame = 0; frame < 72; frame += 1) {
    step(0.45, 1);
    if (steeringResponseSeconds === Number.POSITIVE_INFINITY
      && Math.abs(chassis.heading) >= 0.08) {
      steeringResponseSeconds = (frame + 1) * STEP;
    }
  }
  const cornerHeading = Math.abs(chassis.heading);
  const cornerExitSpeed = getCarSignedSpeed(chassis);
  for (let frame = 0; frame < 90; frame += 1) step(0, 0);
  const coastSpeed = getCarSignedSpeed(chassis);
  const brakingStartDistance = distance;
  let stopSeconds = 0;
  for (let frame = 0; frame < 180; frame += 1) {
    step(-1, 0);
    stopSeconds += STEP;
    if (getCarSignedSpeed(chassis) <= 1) break;
  }
  const brakingDistance = distance - brakingStartDistance;
  for (let frame = 0; frame < 180; frame += 1) {
    step(-1, 0);
    if (
      reverseFifteenPercentSeconds === Number.POSITIVE_INFINITY
      && Math.abs(getCarSignedSpeed(chassis))
        >= getCarMaximumPageSpeed(style, -1) * 0.15
    ) reverseFifteenPercentSeconds = (frame + 1) * STEP;
  }
  const reverseSpeed = getCarSignedSpeed(chassis);

  return {
    brakingDistance,
    coastRetention: coastSpeed / Math.max(1, cornerExitSpeed),
    cornerHeading,
    forwardThirtyFivePercentSeconds,
    launchSpeed,
    reverseLaunchRatio: Math.abs(reverseSpeed)
      / getCarMaximumPageSpeed(style, -1),
    reverseFifteenPercentSeconds,
    samples,
    steeringResponseSeconds,
    stopSeconds,
  };
}

describe("car handling telemetry", () => {
  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label produces a bounded, measurable keyboard handling trace",
    (style) => {
      const trace = runHandlingTrace(style);
      const maximumSpeed = getCarMaximumPageSpeed(style, 1);
      const envelope = style.handlingTargets.telemetry;

      expect(trace.samples).toHaveLength(6);
      expect(trace.samples.every((sample) => Number.isFinite(sample.speed))).toBe(true);
      trace.samples.slice(1).forEach((sample, index) => {
        expect(sample.speed, `${style.label} launch sample ${index + 1}`)
          .toBeGreaterThan(trace.samples[index].speed * 0.92);
      });
      expect(trace.launchSpeed, style.label).toBeGreaterThan(maximumSpeed * 0.35);
      expect(trace.launchSpeed, style.label).toBeLessThan(maximumSpeed);
      expect(trace.forwardThirtyFivePercentSeconds, style.label)
        .toBeGreaterThanOrEqual(envelope.forwardThirtyFivePercentSeconds[0]);
      expect(trace.forwardThirtyFivePercentSeconds, style.label)
        .toBeLessThanOrEqual(envelope.forwardThirtyFivePercentSeconds[1]);
      expect(trace.cornerHeading, style.label).toBeGreaterThan(0.08);
      expect(trace.steeringResponseSeconds, style.label)
        .toBeGreaterThanOrEqual(envelope.steeringResponseSeconds[0]);
      expect(trace.steeringResponseSeconds, style.label)
        .toBeLessThanOrEqual(envelope.steeringResponseSeconds[1]);
      expect(trace.coastRetention, style.label)
        .toBeGreaterThanOrEqual(envelope.coastRetentionRatio[0]);
      expect(trace.coastRetention, style.label)
        .toBeLessThanOrEqual(envelope.coastRetentionRatio[1]);
      expect(trace.stopSeconds, style.label)
        .toBeLessThan(style.handlingTargets.maximumBrakeStopSeconds + 0.35);
      expect(trace.stopSeconds, style.label).toBeGreaterThan(0.05);
      expect(trace.brakingDistance, style.label)
        .toBeGreaterThanOrEqual(envelope.brakingDistancePixels[0]);
      expect(trace.brakingDistance, style.label)
        .toBeLessThanOrEqual(envelope.brakingDistancePixels[1]);
      expect(trace.reverseLaunchRatio, style.label)
        .toBeGreaterThanOrEqual(envelope.reverseLaunchRatio[0]);
      expect(trace.reverseLaunchRatio, style.label)
        .toBeLessThanOrEqual(envelope.reverseLaunchRatio[1]);
      expect(trace.reverseFifteenPercentSeconds, style.label)
        .toBeGreaterThanOrEqual(envelope.reverseFifteenPercentSeconds[0]);
      expect(trace.reverseFifteenPercentSeconds, style.label)
        .toBeLessThanOrEqual(envelope.reverseFifteenPercentSeconds[1]);
    },
  );
  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label remains stable across fixed-entry acceleration, lift-off, braking, and split grip",
    (style) => {
      const reachSpeedRatio = (ratio: number) => {
        let state = {
          chassis: createCarChassisState(0),
          drivetrain: createCarDrivetrainState(style),
        };
        for (let frame = 0; frame < 720; frame += 1) {
          state = stepCarDynamics(state, style, {
            deltaSeconds: STEP,
            steering: 0,
            throttle: 1,
          }).state;
          if (getCarSignedSpeed(state.chassis)
            >= getCarMaximumPageSpeed(style, 1) * ratio) break;
        }
        return state;
      };
      const run = (
        initial: ReturnType<typeof reachSpeedRatio>,
        frames: number,
        input: Parameters<typeof stepCarDynamics>[2],
      ) => {
        let state = initial;
        let distance = 0;
        let maximumYawRate = 0;
        for (let frame = 0; frame < frames; frame += 1) {
          const result = stepCarDynamics(state, style, input);
          state = result.state;
          distance += Math.hypot(
            result.chassis.displacementX,
            result.chassis.displacementY,
          );
          maximumYawRate = Math.max(
            maximumYawRate,
            Math.abs(state.chassis.yawRate),
          );
        }
        return { distance, maximumYawRate, state };
      };

      const accelerationStart = reachSpeedRatio(0.25);
      const accelerationEntry = getCarSignedSpeed(accelerationStart.chassis);
      const accelerated = run(accelerationStart, 90, {
        deltaSeconds: STEP,
        steering: 0,
        throttle: 1,
      });
      expect(getCarSignedSpeed(accelerated.state.chassis), style.label)
        .toBeGreaterThan(accelerationEntry);

      const liftOffStart = reachSpeedRatio(0.45);
      const liftOffEntry = getCarSignedSpeed(liftOffStart.chassis);
      const lifted = run(liftOffStart, 135, {
        deltaSeconds: STEP,
        steering: 0,
        throttle: 0,
      });
      const liftOffRetention = getCarSignedSpeed(lifted.state.chassis)
        / liftOffEntry;
      expect(liftOffRetention, style.label).toBeGreaterThan(0.6);
      expect(liftOffRetention, style.label).toBeLessThan(1);

      let brakingState = reachSpeedRatio(0.45);
      const brakingEntry = getCarSignedSpeed(brakingState.chassis);
      let brakingDistance = 0;
      let brakingSeconds = 0;
      for (let frame = 0; frame < 360; frame += 1) {
        const result = stepCarDynamics(brakingState, style, {
          deltaSeconds: STEP,
          steering: 0,
          throttle: -1,
        });
        brakingState = result.state;
        brakingDistance += Math.hypot(
          result.chassis.displacementX,
          result.chassis.displacementY,
        );
        brakingSeconds += STEP;
        if (Math.abs(getCarSignedSpeed(brakingState.chassis)) <= 1) break;
      }
      expect(Math.abs(getCarSignedSpeed(brakingState.chassis)), style.label)
        .toBeLessThanOrEqual(1);
      expect(brakingSeconds, style.label).toBeLessThan(2);
      expect(brakingDistance, style.label).toBeGreaterThan(0);
      expect(brakingDistance, style.label).toBeLessThan(brakingEntry * 1.6);

      const splitGripStart = reachSpeedRatio(0.35);
      const splitGripEntry = getCarSignedSpeed(splitGripStart.chassis);
      const splitGrip = run(splitGripStart, 90, {
        deltaSeconds: STEP,
        steering: 0.55,
        throttle: -1,
        wheelGripMultipliers: {
          frontLeft: 0.48,
          frontRight: 1,
          rearLeft: 0.48,
          rearRight: 1,
        },
      });
      expect(getCarSignedSpeed(splitGrip.state.chassis), style.label)
        .toBeLessThan(splitGripEntry);
      expect(splitGrip.maximumYawRate, style.label)
        .toBeLessThanOrEqual(style.physics.maximumYawRate * 1.15);
      expect(Number.isFinite(splitGrip.state.chassis.heading), style.label)
        .toBe(true);
    },
  );
});
