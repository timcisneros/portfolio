import {
  createCarChassisState,
  getCarSignedSpeed,
  getCarWorldAxes,
  type CarAbsPhase,
  type CarContactConstraint,
} from "./carChassis";
import { stepCarDynamics, type CarDynamicsState } from "./carDynamics";
import {
  CAR_ENGINE_STYLES,
  getCarMaximumPageSpeed,
  type CarEngineStyle,
  type CarEngineStyleId,
} from "./carEngineStyles";
import { createCarDrivetrainState } from "./carDrivetrain";

const MANEUVER_STEP_SECONDS = 1 / 180;
const TRACE_SAMPLE_STRIDE = 6;
const TRACE_SAMPLES_PER_PHASE = 28;

export type CarManeuverPhase =
  | "launch"
  | "steering"
  | "steering-release"
  | "coast"
  | "braking"
  | "reverse"
  | "split-grip"
  | "steady-left"
  | "steady-right"
  | "lift-off"
  | "brake-turn"
  | "direction-cycle"
  | "direction-settle"
  | "acceleration-response"
  | "wall-contact"
  | "wall-diagonal"
  | "corner-contact";

type WheelValues = [number, number, number, number];

export type CarManeuverTraceSample = {
  absActivity: number;
  absPhases: [CarAbsPhase, CarAbsPhase, CarAbsPhase, CarAbsPhase];
  brakePressures: WheelValues;
  engineDragActivity: WheelValues;
  lateralAccelerationMps2: number;
  longitudinalAccelerationMps2: number;
  longitudinalJerkMps3: number;
  phase: CarManeuverPhase;
  speedMps: number;
  steeringAngleRadians: number;
  suspensionCompression: WheelValues;
  timeSeconds: number;
  tireLoadsNewtons: WheelValues;
  tireSlip: number;
  tractionControlActivity: WheelValues;
  wheelSlips: WheelValues;
  yawRateRadiansPerSecond: number;
};

export type CarDeterministicManeuverReport = {
  assessment: {
    checks: {
      accelerationResponse: boolean;
      axleSlipSummariesValid: boolean;
      angledWallStable: boolean;
      contactOrderInvariant: boolean;
      contactPatchStateValid: boolean;
      contactReactionValid: boolean;
      parallelContactOrderInvariant: boolean;
      cornerContactStable: boolean;
      brakingDistance: boolean;
      brakingStop: boolean;
      brakeTurnStability: boolean;
      coastRetention: boolean;
      directionBrakeRelease: boolean;
      directionCycles: boolean;
      directionSettleGate: boolean;
      directionEngagement: boolean;
      forwardLaunch: boolean;
      interventionsBounded: boolean;
      lowSpeedAbsHandoff: boolean;
      leftRightSymmetry: boolean;
      liftOffStability: boolean;
      rawWheelSlipFinite: boolean;
      reverseLaunch: boolean;
      splitGripStability: boolean;
      steeringResponse: boolean;
      steeringReturn: boolean;
      steadyTurnStability: boolean;
      telemetryFinite: boolean;
      tireSlipBounded: boolean;
      traceBounded: boolean;
      wallContactStable: boolean;
      yawRateBounded: boolean;
    };
    status: "out-of-range" | "within-targets";
  };
  metrics: {
    accelerationReleaseMaximumJerkMps3: number;
    angledWallMaximumInwardSpeedMps: number;
    angledWallMaximumYawRateRadiansPerSecond: number;
    cornerMaximumInwardSpeedMps: number;
    cornerMaximumYawRateRadiansPerSecond: number;
    contactOrderResidual: number;
    maximumContactReactionForceNewtons: number;
    maximumLateralDeflectionRatio: number;
    maximumLongitudinalDeflectionRatio: number;
    parallelContactOrderResidual: number;
    brakingDistancePixels: number;
    brakingStopSeconds: number;
    brakingStopAbsActivity: number;
    brakeTurnMaximumYawRateRadiansPerSecond: number;
    circleYawSymmetryRatio: number;
    coastRetentionRatio: number;
    directionCycleCompletions: number;
    directionEngagementMaximumBrakePressure: number;
    directionSettleEngagementEnergyMps: number;
    directionEngagementSeconds: number;
    forwardTenPercentSeconds: number;
    forwardThirtyFivePercentSeconds: number;
    forwardSeventyPercentSeconds: number;
    maximumAbsActivity: number;
    maximumLateralAccelerationMps2: number;
    maximumLongitudinalJerkMps3: number;
    maximumRawWheelSlip: number;
    maximumTireSlip: number;
    maximumTractionControlActivity: number;
    maximumYawRateRadiansPerSecond: number;
    liftOffMaximumYawRateRadiansPerSecond: number;
    reverseFifteenPercentSeconds: number;
    splitGripMaximumYawRateRadiansPerSecond: number;
    steadyLeftMeanYawRateRadiansPerSecond: number;
    steadyRightMeanYawRateRadiansPerSecond: number;
    steadyTurnYawOscillationRadiansPerSecond: number;
    steeringResponseSeconds: number;
    steeringReturnSeconds: number;
    wallMaximumInwardSpeedMps: number;
    wallMaximumYawRateRadiansPerSecond: number;
    wallReverseReleaseSeconds: number;
  };
  trace: CarManeuverTraceSample[];
  variant: CarEngineStyleId;
};

function inRange(value: number, range: readonly [number, number]) {
  return Number.isFinite(value) && value >= range[0] && value <= range[1];
}

function createDynamicsState(style: CarEngineStyle): CarDynamicsState {
  return {
    chassis: createCarChassisState(0),
    drivetrain: createCarDrivetrainState(style),
  };
}

function wheelValues(
  frontLeft: number,
  frontRight: number,
  rearLeft: number,
  rearRight: number,
): WheelValues {
  return [frontLeft, frontRight, rearLeft, rearRight];
}

export function runCarDeterministicManeuverReport(
  styleOrId: CarEngineStyle | CarEngineStyleId,
): CarDeterministicManeuverReport {
  const style = typeof styleOrId === "string"
    ? CAR_ENGINE_STYLES[styleOrId]
    : styleOrId;
  const pixelsPerMeter = style.physics.worldPixelsPerMeter;
  let state = createDynamicsState(style);
  let frame = 0;
  let elapsedSeconds = 0;
  let distancePixels = 0;
  let previousAccelerationMps2 = 0;
  let maximumAbsActivity = 0;
  let maximumLateralAccelerationMps2 = 0;
  let maximumLongitudinalJerkMps3 = 0;
  let maximumRawWheelSlip = 0;
  let maximumContactReactionForceNewtons = 0;
  let maximumLateralDeflectionRatio = 0;
  let maximumLongitudinalDeflectionRatio = 0;
  let axleSlipSummariesValid = true;
  let maximumTireSlip = 0;
  let maximumTractionControlActivity = 0;
  let maximumYawRateRadiansPerSecond = 0;
  const trace: CarManeuverTraceSample[] = [];
  const traceSamplesByPhase = new Map<CarManeuverPhase, number>();

  const advance = (
    throttle: number,
    steering: number,
    phase: CarManeuverPhase,
    wheelGripMultipliers?: {
      frontLeft: number;
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    },
    contactConstraints?: readonly CarContactConstraint[],
  ) => {
    const result = stepCarDynamics(state, style, {
      contactConstraints,
      deltaSeconds: MANEUVER_STEP_SECONDS,
      steering,
      throttle,
      wheelGripMultipliers,
    });
    state = result.state;
    frame += 1;
    elapsedSeconds += MANEUVER_STEP_SECONDS;
    distancePixels += Math.hypot(
      result.chassis.displacementX,
      result.chassis.displacementY,
    );
    const chassis = state.chassis;
    const accelerationMps2 = chassis.longitudinalAcceleration / pixelsPerMeter;
    const jerkMps3 = (accelerationMps2 - previousAccelerationMps2)
      / MANEUVER_STEP_SECONDS;
    previousAccelerationMps2 = accelerationMps2;
    maximumAbsActivity = Math.max(maximumAbsActivity, chassis.absActivity);
    maximumLateralAccelerationMps2 = Math.max(
      maximumLateralAccelerationMps2,
      Math.abs(chassis.lateralAcceleration) / pixelsPerMeter,
    );
    maximumLongitudinalJerkMps3 = Math.max(
      maximumLongitudinalJerkMps3,
      Math.abs(jerkMps3),
    );
    maximumTireSlip = Math.max(maximumTireSlip, chassis.tireSlip);
    maximumContactReactionForceNewtons = Math.max(
      maximumContactReactionForceNewtons,
      chassis.longitudinalContactReactionForceNewtons,
    );
    maximumLateralDeflectionRatio = Math.max(
      maximumLateralDeflectionRatio,
      Math.abs(chassis.frontLeftLateralDeflectionM)
        / style.physics.tireLateralRelaxationLengthM,
      Math.abs(chassis.frontRightLateralDeflectionM)
        / style.physics.tireLateralRelaxationLengthM,
      Math.abs(chassis.rearLeftLateralDeflectionM)
        / style.physics.tireLateralRelaxationLengthM,
      Math.abs(chassis.rearRightLateralDeflectionM)
        / style.physics.tireLateralRelaxationLengthM,
    );
    maximumLongitudinalDeflectionRatio = Math.max(
      maximumLongitudinalDeflectionRatio,
      Math.abs(chassis.frontLeftLongitudinalDeflectionM)
        / style.physics.tireLongitudinalRelaxationLengthM,
      Math.abs(chassis.frontRightLongitudinalDeflectionM)
        / style.physics.tireLongitudinalRelaxationLengthM,
      Math.abs(chassis.rearLeftLongitudinalDeflectionM)
        / style.physics.tireLongitudinalRelaxationLengthM,
      Math.abs(chassis.rearRightLongitudinalDeflectionM)
        / style.physics.tireLongitudinalRelaxationLengthM,
    );
    maximumRawWheelSlip = Math.max(
      maximumRawWheelSlip,
      Math.abs(chassis.frontLeftLongitudinalSlip),
      Math.abs(chassis.frontRightLongitudinalSlip),
      Math.abs(chassis.rearLeftLongitudinalSlip),
      Math.abs(chassis.rearRightLongitudinalSlip),
    );
    axleSlipSummariesValid = axleSlipSummariesValid && [
      {
        mean: chassis.frontLongitudinalSlip,
        peak: chassis.frontLongitudinalSlipPeak,
        rms: chassis.frontLongitudinalSlipRms,
      },
      {
        mean: chassis.rearLongitudinalSlip,
        peak: chassis.rearLongitudinalSlipPeak,
        rms: chassis.rearLongitudinalSlipRms,
      },
    ].every((summary) => [summary.mean, summary.peak, summary.rms]
      .every(Number.isFinite)
      && summary.rms + 0.000001 >= Math.abs(summary.mean)
      && summary.peak + 0.000001 >= summary.rms);
    maximumTractionControlActivity = Math.max(
      maximumTractionControlActivity,
      chassis.tractionControlActivity,
    );
    maximumYawRateRadiansPerSecond = Math.max(
      maximumYawRateRadiansPerSecond,
      Math.abs(chassis.yawRate),
    );
    const phaseTraceSamples = traceSamplesByPhase.get(phase) ?? 0;
    if (
      frame % TRACE_SAMPLE_STRIDE === 0
      && phaseTraceSamples < TRACE_SAMPLES_PER_PHASE
    ) {
      trace.push({
        absActivity: chassis.absActivity,
        absPhases: [
          chassis.frontLeftAbsPhase,
          chassis.frontRightAbsPhase,
          chassis.rearLeftAbsPhase,
          chassis.rearRightAbsPhase,
        ],
        brakePressures: wheelValues(
          chassis.frontLeftBrakePressure,
          chassis.frontRightBrakePressure,
          chassis.rearLeftBrakePressure,
          chassis.rearRightBrakePressure,
        ),
        engineDragActivity: wheelValues(
          chassis.frontLeftEngineDragControlActivity,
          chassis.frontRightEngineDragControlActivity,
          chassis.rearLeftEngineDragControlActivity,
          chassis.rearRightEngineDragControlActivity,
        ),
        lateralAccelerationMps2: chassis.lateralAcceleration / pixelsPerMeter,
        longitudinalAccelerationMps2: accelerationMps2,
        longitudinalJerkMps3: jerkMps3,
        phase,
        speedMps: getCarSignedSpeed(chassis) / pixelsPerMeter,
        steeringAngleRadians: chassis.steeringAngle,
        suspensionCompression: wheelValues(
          chassis.frontLeftSuspensionCompression,
          chassis.frontRightSuspensionCompression,
          chassis.rearLeftSuspensionCompression,
          chassis.rearRightSuspensionCompression,
        ),
        timeSeconds: elapsedSeconds,
        tireLoadsNewtons: wheelValues(
          chassis.frontLeftLoadNewtons,
          chassis.frontRightLoadNewtons,
          chassis.rearLeftLoadNewtons,
          chassis.rearRightLoadNewtons,
        ),
        tireSlip: chassis.tireSlip,
        tractionControlActivity: wheelValues(
          chassis.frontLeftTractionControlActivity,
          chassis.frontRightTractionControlActivity,
          chassis.rearLeftTractionControlActivity,
          chassis.rearRightTractionControlActivity,
        ),
        wheelSlips: wheelValues(
          chassis.frontLeftLongitudinalSlip,
          chassis.frontRightLongitudinalSlip,
          chassis.rearLeftLongitudinalSlip,
          chassis.rearRightLongitudinalSlip,
        ),
        yawRateRadiansPerSecond: chassis.yawRate,
      });
      traceSamplesByPhase.set(phase, phaseTraceSamples + 1);
    }
    return chassis;
  };

  let forwardThirtyFivePercentSeconds = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 360; index += 1) {
    const chassis = advance(1, 0, "launch");
    if (
      !Number.isFinite(forwardThirtyFivePercentSeconds)
      && getCarSignedSpeed(chassis) >= getCarMaximumPageSpeed(style, 1) * 0.35
    ) {
      forwardThirtyFivePercentSeconds = (index + 1) * MANEUVER_STEP_SECONDS;
      break;
    }
  }

  let steeringResponseSeconds = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 90; index += 1) {
    const chassis = advance(0.45, 1, "steering");
    if (
      !Number.isFinite(steeringResponseSeconds)
      && Math.abs(chassis.steeringAngle)
        >= style.physics.maximumSteeringAngle * 0.6
    ) steeringResponseSeconds = (index + 1) * MANEUVER_STEP_SECONDS;
  }

  let steeringReturnSeconds = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 180; index += 1) {
    const chassis = advance(0.3, 0, "steering-release");
    if (
      !Number.isFinite(steeringReturnSeconds)
      && Math.abs(chassis.steeringAngle)
        <= style.physics.maximumSteeringAngle * 0.08
    ) steeringReturnSeconds = (index + 1) * MANEUVER_STEP_SECONDS;
  }

  const coastStartSpeed = Math.abs(getCarSignedSpeed(state.chassis));
  for (let index = 0; index < 180; index += 1) advance(0, 0, "coast");
  const coastRetentionRatio = Math.abs(getCarSignedSpeed(state.chassis))
    / Math.max(1, coastStartSpeed);

  const brakingStartDistance = distancePixels;
  let brakingStopSeconds = 0;
  for (let index = 0; index < 360; index += 1) {
    const chassis = advance(-1, 0, "braking");
    brakingStopSeconds += MANEUVER_STEP_SECONDS;
    if (Math.abs(getCarSignedSpeed(chassis)) <= 1) break;
  }
  const brakingDistancePixels = distancePixels - brakingStartDistance;
  const brakingStopAbsActivity = state.chassis.absActivity;

  let directionEngagementSeconds = Number.POSITIVE_INFINITY;
  let directionTimer: number | null = null;
  let reverseFifteenPercentSeconds = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 360; index += 1) {
    const chassis = advance(-1, 0, "reverse");
    const signedSpeed = getCarSignedSpeed(chassis);
    const speedRatio = Math.abs(signedSpeed) / getCarMaximumPageSpeed(
      style,
      signedSpeed < 0 ? -1 : 1,
    );
    if (directionTimer === null && chassis.driveDirection !== -1 && speedRatio <= 0.08) {
      directionTimer = 0;
    }
    if (directionTimer !== null) {
      directionTimer += MANEUVER_STEP_SECONDS;
      if (chassis.driveDirection === -1) {
        directionEngagementSeconds = directionTimer;
        directionTimer = null;
      }
    }
    if (!Number.isFinite(reverseFifteenPercentSeconds) && speedRatio >= 0.15) {
      reverseFifteenPercentSeconds = (index + 1) * MANEUVER_STEP_SECONDS;
      break;
    }
  }

  state = createDynamicsState(style);
  previousAccelerationMps2 = 0;
  for (let index = 0; index < 720; index += 1) {
    const chassis = advance(1, 0, "split-grip");
    if (getCarSignedSpeed(chassis) >= getCarMaximumPageSpeed(style, 1) * 0.35) break;
  }
  let splitGripMaximumYawRateRadiansPerSecond = 0;
  for (let index = 0; index < 120; index += 1) {
    const chassis = advance(-1, 0.55, "split-grip", {
      frontLeft: 0.48,
      frontRight: 1,
      rearLeft: 0.48,
      rearRight: 1,
    });
    splitGripMaximumYawRateRadiansPerSecond = Math.max(
      splitGripMaximumYawRateRadiansPerSecond,
      Math.abs(chassis.yawRate),
    );
  }

  const prepareManeuver = (
    phase: CarManeuverPhase,
    targetSpeedRatio = 0.32,
  ) => {
    state = createDynamicsState(style);
    previousAccelerationMps2 = 0;
    for (let index = 0; index < 720; index += 1) {
      const chassis = advance(1, 0, phase);
      if (
        getCarSignedSpeed(chassis)
          >= getCarMaximumPageSpeed(style, 1) * targetSpeedRatio
      ) break;
    }
  };
  const measureSteadyTurn = (
    steering: number,
    phase: "steady-left" | "steady-right",
  ) => {
    prepareManeuver(phase);
    const settledYawRates: number[] = [];
    for (let index = 0; index < 360; index += 1) {
      const chassis = advance(0.42, steering, phase);
      if (index >= 180) settledYawRates.push(chassis.yawRate);
    }
    const mean = settledYawRates.reduce((total, value) => total + value, 0)
      / Math.max(1, settledYawRates.length);
    const oscillation = settledYawRates.length > 0
      ? Math.max(...settledYawRates) - Math.min(...settledYawRates)
      : Number.POSITIVE_INFINITY;
    return { mean, oscillation };
  };
  const steadyLeft = measureSteadyTurn(-0.62, "steady-left");
  const steadyRight = measureSteadyTurn(0.62, "steady-right");
  const circleYawSymmetryRatio = Math.min(
    Math.abs(steadyLeft.mean),
    Math.abs(steadyRight.mean),
  ) / Math.max(
    0.001,
    Math.max(Math.abs(steadyLeft.mean), Math.abs(steadyRight.mean)),
  );
  const steadyTurnYawOscillationRadiansPerSecond = Math.max(
    steadyLeft.oscillation,
    steadyRight.oscillation,
  );

  prepareManeuver("lift-off", 0.36);
  for (let index = 0; index < 150; index += 1) {
    advance(0.42, 0.58, "lift-off");
  }
  let liftOffMaximumYawRateRadiansPerSecond = 0;
  for (let index = 0; index < 180; index += 1) {
    const chassis = advance(0, 0.58, "lift-off");
    liftOffMaximumYawRateRadiansPerSecond = Math.max(
      liftOffMaximumYawRateRadiansPerSecond,
      Math.abs(chassis.yawRate),
    );
  }

  prepareManeuver("brake-turn", 0.36);
  for (let index = 0; index < 150; index += 1) {
    advance(0.42, -0.58, "brake-turn");
  }
  let brakeTurnMaximumYawRateRadiansPerSecond = 0;
  for (let index = 0; index < 180; index += 1) {
    const chassis = advance(-1, -0.58, "brake-turn");
    brakeTurnMaximumYawRateRadiansPerSecond = Math.max(
      brakeTurnMaximumYawRateRadiansPerSecond,
      Math.abs(chassis.yawRate),
    );
  }

  state = createDynamicsState(style);
  previousAccelerationMps2 = 0;
  let directionCycleCompletions = 0;
  let directionEngagementMaximumBrakePressure = 0;
  let previousCycleDirection = state.chassis.driveDirection;
  for (const direction of [1, -1, 1, -1] as const) {
    for (let index = 0; index < 720; index += 1) {
      const chassis = advance(direction, 0, "direction-cycle");
      if (chassis.driveDirection !== previousCycleDirection) {
        directionEngagementMaximumBrakePressure = Math.max(
          directionEngagementMaximumBrakePressure,
          chassis.frontLeftBrakePressure,
          chassis.frontRightBrakePressure,
          chassis.rearLeftBrakePressure,
          chassis.rearRightBrakePressure,
        );
        previousCycleDirection = chassis.driveDirection;
      }
      const directionSpeed = getCarSignedSpeed(chassis) * direction;
      if (
        chassis.driveDirection === direction
        && directionSpeed >= getCarMaximumPageSpeed(style, direction) * 0.12
      ) {
        directionCycleCompletions += 1;
        break;
      }
    }
  }

  state = createDynamicsState(style);
  state.chassis.driveDirection = 1;
  state.chassis.velocityY = pixelsPerMeter * 1.2;
  state.chassis.yawRate = 0.55;
  previousAccelerationMps2 = 0;
  const directionSettleRadiusM = Math.hypot(
    style.physics.physicalWheelbaseM * 0.5,
    style.physics.trackWidthM * 0.5,
  );
  let directionSettleEngagementEnergyMps = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 720; index += 1) {
    const chassis = advance(-1, 0, "direction-settle");
    if (chassis.driveDirection === -1) {
      const { right } = getCarWorldAxes(chassis.heading);
      const lateralSpeedMps = Math.abs(
        chassis.velocityX * right.x + chassis.velocityY * right.y,
      ) / pixelsPerMeter;
      directionSettleEngagementEnergyMps = Math.hypot(
        lateralSpeedMps,
        Math.abs(chassis.yawRate) * directionSettleRadiusM,
      );
      break;
    }
  }

  state = createDynamicsState(style);
  previousAccelerationMps2 = 0;
  let forwardTenPercentSeconds = Number.POSITIVE_INFINITY;
  let forwardSeventyPercentSeconds = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 1440; index += 1) {
    const chassis = advance(1, 0, "acceleration-response");
    const speedRatio = getCarSignedSpeed(chassis)
      / getCarMaximumPageSpeed(style, 1);
    if (!Number.isFinite(forwardTenPercentSeconds) && speedRatio >= 0.1) {
      forwardTenPercentSeconds = (index + 1) * MANEUVER_STEP_SECONDS;
    }
    if (speedRatio >= 0.7) {
      forwardSeventyPercentSeconds = (index + 1) * MANEUVER_STEP_SECONDS;
      break;
    }
  }
  let accelerationReleaseMaximumJerkMps3 = 0;
  let releaseAccelerationMps2 = state.chassis.longitudinalAcceleration
    / pixelsPerMeter;
  for (let index = 0; index < 180; index += 1) {
    const chassis = advance(0, 0, "acceleration-response");
    const nextAccelerationMps2 = chassis.longitudinalAcceleration / pixelsPerMeter;
    accelerationReleaseMaximumJerkMps3 = Math.max(
      accelerationReleaseMaximumJerkMps3,
      Math.abs(
        (nextAccelerationMps2 - releaseAccelerationMps2)
          / MANEUVER_STEP_SECONDS,
      ),
    );
    releaseAccelerationMps2 = nextAccelerationMps2;
  }

  state = createDynamicsState(style);
  previousAccelerationMps2 = 0;
  const wallConstraint: CarContactConstraint = {
    contactOffset: {
      x: style.physics.physicalWheelbaseM * pixelsPerMeter * 0.5,
      y: 0,
    },
    friction: 0.9,
    normal: { x: -1, y: 0 },
  };
  let wallMaximumInwardSpeedMps = 0;
  let wallMaximumYawRateRadiansPerSecond = 0;
  for (let index = 0; index < 360; index += 1) {
    const chassis = advance(
      1,
      0,
      "wall-contact",
      undefined,
      [wallConstraint],
    );
    if (index >= 90) {
      wallMaximumInwardSpeedMps = Math.max(
        wallMaximumInwardSpeedMps,
        Math.max(0, getCarSignedSpeed(chassis) / pixelsPerMeter),
      );
    }
    wallMaximumYawRateRadiansPerSecond = Math.max(
      wallMaximumYawRateRadiansPerSecond,
      Math.abs(chassis.yawRate),
    );
  }
  let wallReverseReleaseSeconds = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 540; index += 1) {
    const chassis = advance(
      -1,
      0,
      "wall-contact",
      undefined,
      [wallConstraint],
    );
    if (
      getCarSignedSpeed(chassis)
        <= -getCarMaximumPageSpeed(style, -1) * 0.08
    ) {
      wallReverseReleaseSeconds = (index + 1) * MANEUVER_STEP_SECONDS;
      break;
    }
  }

  state = createDynamicsState(style);
  previousAccelerationMps2 = 0;
  const diagonalNormal = { x: -0.8660254038, y: -0.5 };
  const diagonalOffset = {
    x: style.physics.physicalWheelbaseM * pixelsPerMeter * 0.5,
    y: style.physics.trackWidthM * pixelsPerMeter * 0.34,
  };
  const diagonalWallConstraint: CarContactConstraint = {
    contactOffset: diagonalOffset,
    friction: 0.86,
    normal: diagonalNormal,
  };
  let angledWallMaximumInwardSpeedMps = 0;
  let angledWallMaximumYawRateRadiansPerSecond = 0;
  for (let index = 0; index < 360; index += 1) {
    const chassis = advance(
      1,
      0.22,
      "wall-diagonal",
      undefined,
      [diagonalWallConstraint],
    );
    if (index >= 90) {
      const contactVelocityX = chassis.velocityX
        - chassis.yawRate * diagonalOffset.y;
      const contactVelocityY = chassis.velocityY
        + chassis.yawRate * diagonalOffset.x;
      angledWallMaximumInwardSpeedMps = Math.max(
        angledWallMaximumInwardSpeedMps,
        Math.max(
          0,
          -(contactVelocityX * diagonalNormal.x
            + contactVelocityY * diagonalNormal.y) / pixelsPerMeter,
        ),
      );
    }
    angledWallMaximumYawRateRadiansPerSecond = Math.max(
      angledWallMaximumYawRateRadiansPerSecond,
      Math.abs(chassis.yawRate),
    );
  }

  state = createDynamicsState(style);
  previousAccelerationMps2 = 0;
  const frontCornerConstraint: CarContactConstraint = {
    contactOffset: {
      x: style.physics.physicalWheelbaseM * pixelsPerMeter * 0.5,
      y: 0,
    },
    friction: 0.86,
    normal: { x: -1, y: 0 },
  };
  const sideCornerConstraint: CarContactConstraint = {
    contactOffset: {
      x: style.physics.physicalWheelbaseM * pixelsPerMeter * 0.2,
      y: style.physics.trackWidthM * pixelsPerMeter * 0.5,
    },
    friction: 0.86,
    normal: { x: 0, y: -1 },
  };
  const cornerConstraints = [frontCornerConstraint, sideCornerConstraint];
  let cornerMaximumInwardSpeedMps = 0;
  let cornerMaximumYawRateRadiansPerSecond = 0;
  for (let index = 0; index < 360; index += 1) {
    const chassis = advance(
      1,
      0.4,
      "corner-contact",
      undefined,
      cornerConstraints,
    );
    if (index >= 90) {
      cornerMaximumInwardSpeedMps = Math.max(
        cornerMaximumInwardSpeedMps,
        Math.max(
          0,
          chassis.velocityX / pixelsPerMeter,
          chassis.velocityY / pixelsPerMeter,
        ),
      );
    }
    cornerMaximumYawRateRadiansPerSecond = Math.max(
      cornerMaximumYawRateRadiansPerSecond,
      Math.abs(chassis.yawRate),
    );
  }

  const forwardOrderCornerState = { ...state.chassis };
  state = createDynamicsState(style);
  previousAccelerationMps2 = 0;
  for (let index = 0; index < 360; index += 1) {
    advance(
      1,
      0.4,
      "corner-contact",
      undefined,
      [...cornerConstraints].reverse(),
    );
  }
  const contactOrderResidual = Math.hypot(
    (state.chassis.velocityX - forwardOrderCornerState.velocityX)
      / pixelsPerMeter,
    (state.chassis.velocityY - forwardOrderCornerState.velocityY)
      / pixelsPerMeter,
    (state.chassis.yawRate - forwardOrderCornerState.yawRate)
      * directionSettleRadiusM,
  );

  const halfParallelTrack = style.physics.trackWidthM * pixelsPerMeter * 0.5;
  const parallelContactConstraints: CarContactConstraint[] = [
    {
      contactOffset: { x: 0, y: -halfParallelTrack },
      friction: 0.86,
      normal: { x: -1, y: 0 },
    },
    {
      contactOffset: { x: 0, y: halfParallelTrack },
      friction: 0.86,
      normal: { x: -1, y: 0 },
    },
  ];
  const runParallelContacts = (constraints: readonly CarContactConstraint[]) => {
    let candidate = createDynamicsState(style);
    const impactSpeed = getCarMaximumPageSpeed(style, 1) * 0.45;
    candidate.chassis = {
      ...candidate.chassis,
      frontLeftWheelSpeed: impactSpeed,
      frontRightWheelSpeed: impactSpeed,
      frontWheelSpeed: impactSpeed,
      rearLeftWheelSpeed: impactSpeed,
      rearRightWheelSpeed: impactSpeed,
      rearWheelSpeed: impactSpeed,
      velocityX: impactSpeed,
      velocityY: pixelsPerMeter * 0.22,
      yawRate: 0.2,
    };
    for (let index = 0; index < 36; index += 1) {
      candidate = stepCarDynamics(candidate, style, {
        contactConstraints: constraints,
        deltaSeconds: MANEUVER_STEP_SECONDS,
        steering: 0,
        throttle: 0,
      }).state;
    }
    return candidate.chassis;
  };
  const forwardParallelState = runParallelContacts(parallelContactConstraints);
  const reverseParallelState = runParallelContacts(
    [...parallelContactConstraints].reverse(),
  );
  const parallelContactOrderResidual = Math.hypot(
    (forwardParallelState.velocityX - reverseParallelState.velocityX)
      / pixelsPerMeter,
    (forwardParallelState.velocityY - reverseParallelState.velocityY)
      / pixelsPerMeter,
    (forwardParallelState.yawRate - reverseParallelState.yawRate)
      * directionSettleRadiusM,
  );

  const telemetry = style.handlingTargets.telemetry;
  const boundedTrace = trace.slice(-480);
  const checks = {
    axleSlipSummariesValid,
    accelerationResponse: inRange(
      forwardTenPercentSeconds,
      telemetry.forwardTenPercentSeconds,
    ) && forwardTenPercentSeconds < forwardThirtyFivePercentSeconds
      && inRange(
        forwardSeventyPercentSeconds,
        telemetry.forwardSeventyPercentSeconds,
      ) && forwardThirtyFivePercentSeconds < forwardSeventyPercentSeconds
      && inRange(
        accelerationReleaseMaximumJerkMps3,
        telemetry.accelerationReleaseMaximumJerkMps3,
      ),
    angledWallStable: inRange(
      angledWallMaximumInwardSpeedMps,
      telemetry.wallMaximumInwardSpeedMps,
    ) && angledWallMaximumYawRateRadiansPerSecond
        <= style.physics.maximumYawRate * 0.75,
    contactOrderInvariant: contactOrderResidual <= 0.0001,
    contactPatchStateValid: Number.isFinite(maximumLateralDeflectionRatio)
      && maximumLateralDeflectionRatio <= 0.421
      && Number.isFinite(maximumLongitudinalDeflectionRatio)
      && maximumLongitudinalDeflectionRatio
        <= style.physics.tirePeakSlip * 1.851,
    contactReactionValid: Number.isFinite(maximumContactReactionForceNewtons)
      && maximumContactReactionForceNewtons > 1
      && maximumContactReactionForceNewtons < style.physics.massKg * 35,
    parallelContactOrderInvariant: parallelContactOrderResidual <= 0.0001,
    cornerContactStable: inRange(
      cornerMaximumInwardSpeedMps,
      telemetry.wallMaximumInwardSpeedMps,
    ) && cornerMaximumYawRateRadiansPerSecond
        <= style.physics.maximumYawRate * 0.35,
    brakingDistance: inRange(brakingDistancePixels, telemetry.brakingDistancePixels),
    brakingStop: brakingStopSeconds <= style.handlingTargets.maximumBrakeStopSeconds,
    brakeTurnStability: brakeTurnMaximumYawRateRadiansPerSecond
      <= style.physics.maximumYawRate * 1.5,
    coastRetention: inRange(coastRetentionRatio, telemetry.coastRetentionRatio),
    directionBrakeRelease: directionEngagementMaximumBrakePressure
      <= style.controls.direction.residualBrakePressure + 0.02,
    directionCycles: directionCycleCompletions === 4,
    directionSettleGate: Number.isFinite(directionSettleEngagementEnergyMps)
      && directionSettleEngagementEnergyMps
        <= style.controls.direction.stopSpeedMps * 1.35 + 0.01,
    directionEngagement: inRange(
      directionEngagementSeconds,
      telemetry.directionEngagementSeconds,
    ),
    forwardLaunch: inRange(
      forwardThirtyFivePercentSeconds,
      telemetry.forwardThirtyFivePercentSeconds,
    ),
    interventionsBounded: maximumAbsActivity <= 0.951
      && maximumTractionControlActivity <= 0.951,
    lowSpeedAbsHandoff: brakingStopAbsActivity <= 0.18,
    leftRightSymmetry: circleYawSymmetryRatio >= 0.72
      && Math.sign(steadyLeft.mean) !== Math.sign(steadyRight.mean),
    liftOffStability: liftOffMaximumYawRateRadiansPerSecond
      <= style.physics.maximumYawRate * 1.5,
    rawWheelSlipFinite: Number.isFinite(maximumRawWheelSlip),
    reverseLaunch: inRange(
      reverseFifteenPercentSeconds,
      telemetry.reverseFifteenPercentSeconds,
    ),
    splitGripStability: splitGripMaximumYawRateRadiansPerSecond
      <= style.physics.maximumYawRate * 1.35,
    steeringResponse: inRange(
      steeringResponseSeconds,
      telemetry.steeringResponseSeconds,
    ),
    steeringReturn: Number.isFinite(steeringReturnSeconds)
      && steeringReturnSeconds <= 1,
    steadyTurnStability: steadyTurnYawOscillationRadiansPerSecond
      <= style.physics.maximumYawRate * 0.35,
    telemetryFinite: [
      maximumLateralAccelerationMps2,
      maximumLongitudinalJerkMps3,
      maximumYawRateRadiansPerSecond,
      state.drivetrain.converterTurbineRpm ?? 0,
      state.drivetrain.converterTurbineRpmVelocity ?? 0,
      state.drivetrain.transmittedCrankTorqueNm ?? 0,
    ].every(Number.isFinite),
    tireSlipBounded: maximumTireSlip <= 1.001,
    traceBounded: boundedTrace.length <= 480,
    wallContactStable: inRange(
      wallMaximumInwardSpeedMps,
      telemetry.wallMaximumInwardSpeedMps,
    ) && wallMaximumYawRateRadiansPerSecond
        <= style.physics.maximumYawRate * 0.15
      && inRange(
        wallReverseReleaseSeconds,
        telemetry.wallReverseReleaseSeconds,
      ),
    yawRateBounded: maximumYawRateRadiansPerSecond
      <= style.physics.maximumYawRate * 1.8,
  };
  return {
    assessment: {
      checks,
      status: Object.values(checks).every(Boolean)
        ? "within-targets"
        : "out-of-range",
    },
    metrics: {
      accelerationReleaseMaximumJerkMps3,
      angledWallMaximumInwardSpeedMps,
      angledWallMaximumYawRateRadiansPerSecond,
      cornerMaximumInwardSpeedMps,
      cornerMaximumYawRateRadiansPerSecond,
      contactOrderResidual,
      maximumContactReactionForceNewtons,
      maximumLateralDeflectionRatio,
      maximumLongitudinalDeflectionRatio,
      parallelContactOrderResidual,
      brakingDistancePixels,
      brakingStopSeconds,
      brakingStopAbsActivity,
      brakeTurnMaximumYawRateRadiansPerSecond,
      circleYawSymmetryRatio,
      coastRetentionRatio,
      directionCycleCompletions,
      directionEngagementMaximumBrakePressure,
      directionSettleEngagementEnergyMps,
      directionEngagementSeconds,
      forwardTenPercentSeconds,
      forwardThirtyFivePercentSeconds,
      forwardSeventyPercentSeconds,
      maximumAbsActivity,
      maximumLateralAccelerationMps2,
      maximumLongitudinalJerkMps3,
      maximumRawWheelSlip,
      maximumTireSlip,
      maximumTractionControlActivity,
      maximumYawRateRadiansPerSecond,
      liftOffMaximumYawRateRadiansPerSecond,
      reverseFifteenPercentSeconds,
      splitGripMaximumYawRateRadiansPerSecond,
      steadyLeftMeanYawRateRadiansPerSecond: steadyLeft.mean,
      steadyRightMeanYawRateRadiansPerSecond: steadyRight.mean,
      steadyTurnYawOscillationRadiansPerSecond,
      steeringResponseSeconds,
      steeringReturnSeconds,
      wallMaximumInwardSpeedMps,
      wallMaximumYawRateRadiansPerSecond,
      wallReverseReleaseSeconds,
    },
    trace: boundedTrace,
    variant: style.id,
  };
}

export function runAllCarDeterministicManeuverReports() {
  return (Object.keys(CAR_ENGINE_STYLES) as CarEngineStyleId[])
    .map((id) => runCarDeterministicManeuverReport(id));
}
