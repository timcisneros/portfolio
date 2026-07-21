import type { CarCalibrationRouteTransfer } from "../../lib/carContinuity";
import { getCarSignedSpeed, type CarChassisState } from "../../lib/carChassis";
import {
  getCarCalibrationReport,
  getCarEngineStyle,
  getCarMaximumPageSpeed,
} from "../../lib/carEngineStyles";
import type { CarDrivetrainOutput } from "../../lib/carDrivetrain";

type CarWheelAuditValues = [number, number, number, number];

export type CarManeuverAudit = {
  brakingDistanceMeters: number | null;
  brakingStopSeconds: number | null;
  coastRetentionRatio: number | null;
  collisionEnergyGainJ: number;
  collisionEnergyLossJ: number;
  postImpactMomentumRatio: number | null;
  directionChanges: number;
  directionEngagementSeconds: number | null;
  distanceMeters: number;
  elapsedSeconds: number;
  forwardThirtyFivePercentSeconds: number | null;
  maximumCombinedTireDemand: number;
  maximumSuspensionCompression: CarWheelAuditValues;
  maximumWheelLoadConservationErrorNewtons: number;
  maximumWheelLoadNewtons: CarWheelAuditValues;
  minimumSuspensionCompression: CarWheelAuditValues;
  minimumTireAdhesion: number;
  minimumWheelLoadNewtons: CarWheelAuditValues;
  peakAbsActivity: number;
  peakEngineDragControlActivity: number;
  peakEngineDragControlActivityByWheel: CarWheelAuditValues;
  peakForwardSpeedMps: number;
  peakLateralAccelerationMps2: number;
  peakLongitudinalAccelerationMps2: number;
  peakShiftShockMps3: number;
  peakReverseSpeedMps: number;
  peakSuspensionVelocity: CarWheelAuditValues;
  peakTireSlip: number;
  peakTractionControlActivity: number;
  peakTractionControlActivityByWheel: CarWheelAuditValues;
  peakYawLimiterActivity: number;
  peakYawRateRadiansPerSecond: number;
  reverseFifteenPercentSeconds: number | null;
  steeringResponseSeconds: number | null;
  steeringOvershootRatio: number;
  shiftDurationSeconds: number | null;
  suspensionSampleCount: number;
  suspensionSettleSecondsAfterImpact: number | null;
};

export type CarManeuverAuditAccumulator = CarManeuverAudit & {
  brakingDistanceActiveMeters: number;
  brakingSecondsActive: number | null;
  coastSecondsActive: number | null;
  coastStartSpeedMps: number;
  directionEngagementSecondsActive: number | null;
  directionEngagementTarget: -1 | 0 | 1;
  forwardLaunchSecondsActive: number | null;
  lastDriveDirection: -1 | 0 | 1;
  lastLongitudinalAccelerationMps2: number;
  lastSteeringInput: number;
  reverseLaunchSecondsActive: number | null;
  shiftSecondsActive: number | null;
  steeringSecondsActive: number | null;
  steeringReleaseSeconds: number | null;
  steeringReleaseSign: -1 | 0 | 1;
  suspensionQuietSeconds: number;
  suspensionSettleSecondsActive: number | null;
};

export function createCarManeuverAudit(): CarManeuverAuditAccumulator {
  return {
    brakingDistanceActiveMeters: 0,
    brakingDistanceMeters: null,
    brakingSecondsActive: null,
    brakingStopSeconds: null,
    coastRetentionRatio: null,
    collisionEnergyGainJ: 0,
    collisionEnergyLossJ: 0,
    postImpactMomentumRatio: null,
    coastSecondsActive: null,
    coastStartSpeedMps: 0,
    directionChanges: 0,
    directionEngagementSeconds: null,
    directionEngagementSecondsActive: null,
    directionEngagementTarget: 0,
    distanceMeters: 0,
    elapsedSeconds: 0,
    forwardLaunchSecondsActive: null,
    forwardThirtyFivePercentSeconds: null,
    lastDriveDirection: 0,
    lastLongitudinalAccelerationMps2: 0,
    lastSteeringInput: 0,
    maximumCombinedTireDemand: 0,
    maximumSuspensionCompression: [0, 0, 0, 0],
    maximumWheelLoadConservationErrorNewtons: 0,
    maximumWheelLoadNewtons: [0, 0, 0, 0],
    minimumSuspensionCompression: [0, 0, 0, 0],
    minimumWheelLoadNewtons: [0, 0, 0, 0],
    minimumTireAdhesion: 1,
    peakAbsActivity: 0,
    peakEngineDragControlActivity: 0,
    peakEngineDragControlActivityByWheel: [0, 0, 0, 0],
    peakForwardSpeedMps: 0,
    peakLateralAccelerationMps2: 0,
    peakLongitudinalAccelerationMps2: 0,
    peakShiftShockMps3: 0,
    peakReverseSpeedMps: 0,
    peakSuspensionVelocity: [0, 0, 0, 0],
    peakTireSlip: 0,
    peakTractionControlActivity: 0,
    peakTractionControlActivityByWheel: [0, 0, 0, 0],
    peakYawLimiterActivity: 0,
    peakYawRateRadiansPerSecond: 0,
    reverseFifteenPercentSeconds: null,
    reverseLaunchSecondsActive: null,
    shiftDurationSeconds: null,
    shiftSecondsActive: null,
    steeringResponseSeconds: null,
    steeringOvershootRatio: 0,
    steeringSecondsActive: null,
    steeringReleaseSeconds: null,
    steeringReleaseSign: 0,
    suspensionQuietSeconds: 0,
    suspensionSampleCount: 0,
    suspensionSettleSecondsActive: null,
    suspensionSettleSecondsAfterImpact: null,
  };
}

export function readCarManeuverAudit(
  audit: CarManeuverAuditAccumulator,
): CarManeuverAudit {
  return {
    brakingDistanceMeters: audit.brakingDistanceMeters,
    brakingStopSeconds: audit.brakingStopSeconds,
    coastRetentionRatio: audit.coastRetentionRatio,
    collisionEnergyGainJ: audit.collisionEnergyGainJ,
    collisionEnergyLossJ: audit.collisionEnergyLossJ,
    postImpactMomentumRatio: audit.postImpactMomentumRatio,
    directionChanges: audit.directionChanges,
    directionEngagementSeconds: audit.directionEngagementSeconds,
    distanceMeters: audit.distanceMeters,
    elapsedSeconds: audit.elapsedSeconds,
    forwardThirtyFivePercentSeconds: audit.forwardThirtyFivePercentSeconds,
    maximumCombinedTireDemand: audit.maximumCombinedTireDemand,
    maximumSuspensionCompression: [...audit.maximumSuspensionCompression],
    maximumWheelLoadConservationErrorNewtons:
      audit.maximumWheelLoadConservationErrorNewtons,
    maximumWheelLoadNewtons: [...audit.maximumWheelLoadNewtons],
    minimumSuspensionCompression: [...audit.minimumSuspensionCompression],
    minimumWheelLoadNewtons: [...audit.minimumWheelLoadNewtons],
    minimumTireAdhesion: audit.minimumTireAdhesion,
    peakAbsActivity: audit.peakAbsActivity,
    peakEngineDragControlActivity: audit.peakEngineDragControlActivity,
    peakEngineDragControlActivityByWheel:
      [...audit.peakEngineDragControlActivityByWheel],
    peakForwardSpeedMps: audit.peakForwardSpeedMps,
    peakLateralAccelerationMps2: audit.peakLateralAccelerationMps2,
    peakLongitudinalAccelerationMps2: audit.peakLongitudinalAccelerationMps2,
    peakShiftShockMps3: audit.peakShiftShockMps3,
    peakReverseSpeedMps: audit.peakReverseSpeedMps,
    peakSuspensionVelocity: [...audit.peakSuspensionVelocity],
    peakTireSlip: audit.peakTireSlip,
    peakTractionControlActivity: audit.peakTractionControlActivity,
    peakTractionControlActivityByWheel:
      [...audit.peakTractionControlActivityByWheel],
    peakYawLimiterActivity: audit.peakYawLimiterActivity,
    peakYawRateRadiansPerSecond: audit.peakYawRateRadiansPerSecond,
    reverseFifteenPercentSeconds: audit.reverseFifteenPercentSeconds,
    steeringResponseSeconds: audit.steeringResponseSeconds,
    steeringOvershootRatio: audit.steeringOvershootRatio,
    shiftDurationSeconds: audit.shiftDurationSeconds,
    suspensionSampleCount: audit.suspensionSampleCount,
    suspensionSettleSecondsAfterImpact: audit.suspensionSettleSecondsAfterImpact,
  };
}

export function createCarCalibrationRouteTransfer(
  audit: CarManeuverAuditAccumulator,
): CarCalibrationRouteTransfer {
  return {
    ...audit,
    maximumSuspensionCompression: [...audit.maximumSuspensionCompression],
    maximumWheelLoadNewtons: [...audit.maximumWheelLoadNewtons],
    minimumSuspensionCompression: [...audit.minimumSuspensionCompression],
    minimumWheelLoadNewtons: [...audit.minimumWheelLoadNewtons],
    peakEngineDragControlActivityByWheel:
      [...audit.peakEngineDragControlActivityByWheel],
    peakSuspensionVelocity: [...audit.peakSuspensionVelocity],
    peakTractionControlActivityByWheel:
      [...audit.peakTractionControlActivityByWheel],
  };
}

type CarCalibrationMetricAssessment = {
  expected: readonly [number, number];
  status: "not-measured" | "out-of-range" | "within-target";
  value: number | null;
};

function assessCarCalibrationMetric(
  value: number | null,
  expected: readonly [number, number],
): CarCalibrationMetricAssessment {
  return {
    expected,
    status: value === null
      ? "not-measured"
      : value >= expected[0] && value <= expected[1]
        ? "within-target"
        : "out-of-range",
    value,
  };
}

export function getCarCalibrationAssessment(
  style: ReturnType<typeof getCarEngineStyle>,
  measured: CarManeuverAudit,
) {
  const telemetry = style.handlingTargets.telemetry;
  const requiredMetrics = {
    brakingDistanceMeters: assessCarCalibrationMetric(
      measured.brakingDistanceMeters,
      [
        telemetry.brakingDistancePixels[0] / style.physics.worldPixelsPerMeter,
        telemetry.brakingDistancePixels[1] / style.physics.worldPixelsPerMeter,
      ],
    ),
    brakingStopSeconds: assessCarCalibrationMetric(
      measured.brakingStopSeconds,
      [0, style.handlingTargets.maximumBrakeStopSeconds],
    ),
    coastRetentionRatio: assessCarCalibrationMetric(
      measured.coastRetentionRatio,
      telemetry.coastRetentionRatio,
    ),
    directionEngagementSeconds: assessCarCalibrationMetric(
      measured.directionEngagementSeconds,
      telemetry.directionEngagementSeconds,
    ),
    forwardThirtyFivePercentSeconds: assessCarCalibrationMetric(
      measured.forwardThirtyFivePercentSeconds,
      telemetry.forwardThirtyFivePercentSeconds,
    ),
    reverseFifteenPercentSeconds: assessCarCalibrationMetric(
      measured.reverseFifteenPercentSeconds,
      telemetry.reverseFifteenPercentSeconds,
    ),
    steeringResponseSeconds: assessCarCalibrationMetric(
      measured.steeringResponseSeconds,
      telemetry.steeringResponseSeconds,
    ),
  };
  const diagnosticMetrics = {
    collisionEnergyGainJ: assessCarCalibrationMetric(
      measured.collisionEnergyGainJ,
      [0, 2],
    ),
    collisionEnergyLossJ: assessCarCalibrationMetric(
      measured.collisionEnergyLossJ,
      [0, Number.MAX_SAFE_INTEGER],
    ),
    maximumWheelLoadConservationErrorNewtons: assessCarCalibrationMetric(
      measured.suspensionSampleCount > 0
        ? measured.maximumWheelLoadConservationErrorNewtons
        : null,
      telemetry.maximumWheelLoadConservationErrorNewtons,
    ),
    suspensionSettleSecondsAfterImpact: assessCarCalibrationMetric(
      measured.suspensionSettleSecondsAfterImpact,
      telemetry.suspensionSettleSecondsAfterImpact,
    ),
  };
  const metrics = { ...requiredMetrics, ...diagnosticMetrics };
  const statuses = Object.values(requiredMetrics)
    .map((metric) => metric.status);
  return {
    metrics,
    status: statuses.includes("not-measured")
      ? "incomplete"
      : statuses.includes("out-of-range")
        ? "out-of-range"
        : "within-targets",
  } as const;
}

export function updateCarManeuverAudit(
  audit: CarManeuverAuditAccumulator,
  style: ReturnType<typeof getCarEngineStyle>,
  input: {
    chassis: CarChassisState;
    collisionEnergyGainJ: number;
    collisionEnergyLossJ: number;
    collisionImpulseNewtonsSeconds: number;
    collisionMomentumBeforeKgMps: number;
    collisionMomentumAfterKgMps: number;
    deltaSeconds: number;
    displacementX: number;
    displacementY: number;
    drivetrain: CarDrivetrainOutput | null;
    serviceBraking: boolean;
    steering: number;
    throttle: number;
  },
) {
  const pixelsPerMeter = style.physics.worldPixelsPerMeter;
  const signedSpeedPixels = getCarSignedSpeed(input.chassis);
  const signedSpeedMps = signedSpeedPixels / pixelsPerMeter;
  const forwardRatio = Math.max(0, signedSpeedPixels)
    / getCarMaximumPageSpeed(style, 1);
  const reverseRatio = Math.max(0, -signedSpeedPixels)
    / getCarMaximumPageSpeed(style, -1);
  const absoluteSpeedRatio = signedSpeedPixels < 0 ? reverseRatio : forwardRatio;
  const stepDistanceMeters = Math.hypot(
    input.displacementX,
    input.displacementY,
  ) / pixelsPerMeter;

  audit.elapsedSeconds += input.deltaSeconds;
  audit.collisionEnergyGainJ += Math.max(0, input.collisionEnergyGainJ);
  audit.collisionEnergyLossJ += Math.max(0, input.collisionEnergyLossJ);
  audit.distanceMeters += stepDistanceMeters;
  audit.peakForwardSpeedMps = Math.max(audit.peakForwardSpeedMps, signedSpeedMps);
  audit.peakReverseSpeedMps = Math.max(audit.peakReverseSpeedMps, -signedSpeedMps);
  audit.peakLongitudinalAccelerationMps2 = Math.max(
    audit.peakLongitudinalAccelerationMps2,
    Math.abs(input.chassis.longitudinalAcceleration) / pixelsPerMeter,
  );
  const longitudinalAccelerationMps2 =
    input.chassis.longitudinalAcceleration / pixelsPerMeter;
  const shiftActive = input.drivetrain?.shiftState === "shifting";
  if (shiftActive) {
    audit.shiftSecondsActive = (audit.shiftSecondsActive ?? 0)
      + input.deltaSeconds;
    audit.peakShiftShockMps3 = Math.max(
      audit.peakShiftShockMps3,
      Math.abs(
        longitudinalAccelerationMps2
          - audit.lastLongitudinalAccelerationMps2,
      ) / Math.max(0.001, input.deltaSeconds),
    );
  } else if (audit.shiftSecondsActive !== null) {
    audit.shiftDurationSeconds = audit.shiftSecondsActive;
    audit.shiftSecondsActive = null;
  }
  audit.lastLongitudinalAccelerationMps2 = longitudinalAccelerationMps2;
  audit.peakLateralAccelerationMps2 = Math.max(
    audit.peakLateralAccelerationMps2,
    Math.abs(input.chassis.lateralAcceleration) / pixelsPerMeter,
  );
  audit.peakYawRateRadiansPerSecond = Math.max(
    audit.peakYawRateRadiansPerSecond,
    Math.abs(input.chassis.yawRate),
  );
  audit.peakTireSlip = Math.max(audit.peakTireSlip, input.chassis.tireSlip);
  audit.peakAbsActivity = Math.max(
    audit.peakAbsActivity,
    input.chassis.absActivity,
  );
  audit.peakEngineDragControlActivity = Math.max(
    audit.peakEngineDragControlActivity,
    input.chassis.engineDragControlActivity,
  );
  audit.peakEngineDragControlActivityByWheel = [
    Math.max(
      audit.peakEngineDragControlActivityByWheel[0],
      input.chassis.frontLeftEngineDragControlActivity,
    ),
    Math.max(
      audit.peakEngineDragControlActivityByWheel[1],
      input.chassis.frontRightEngineDragControlActivity,
    ),
    Math.max(
      audit.peakEngineDragControlActivityByWheel[2],
      input.chassis.rearLeftEngineDragControlActivity,
    ),
    Math.max(
      audit.peakEngineDragControlActivityByWheel[3],
      input.chassis.rearRightEngineDragControlActivity,
    ),
  ];
  audit.peakTractionControlActivity = Math.max(
    audit.peakTractionControlActivity,
    input.chassis.tractionControlActivity,
  );
  audit.peakTractionControlActivityByWheel = [
    Math.max(
      audit.peakTractionControlActivityByWheel[0],
      input.chassis.frontLeftTractionControlActivity,
    ),
    Math.max(
      audit.peakTractionControlActivityByWheel[1],
      input.chassis.frontRightTractionControlActivity,
    ),
    Math.max(
      audit.peakTractionControlActivityByWheel[2],
      input.chassis.rearLeftTractionControlActivity,
    ),
    Math.max(
      audit.peakTractionControlActivityByWheel[3],
      input.chassis.rearRightTractionControlActivity,
    ),
  ];
  audit.peakYawLimiterActivity = Math.max(
    audit.peakYawLimiterActivity,
    input.chassis.yawLimiterActivity,
  );
  audit.minimumTireAdhesion = Math.min(
    audit.minimumTireAdhesion,
    input.chassis.frontLeftAdhesion,
    input.chassis.frontRightAdhesion,
    input.chassis.rearLeftAdhesion,
    input.chassis.rearRightAdhesion,
  );
  const finiteTireDemands = [
    input.chassis.frontLeftTireDemand,
    input.chassis.frontRightTireDemand,
    input.chassis.rearLeftTireDemand,
    input.chassis.rearRightTireDemand,
  ].filter(Number.isFinite);
  audit.maximumCombinedTireDemand = Math.max(
    audit.maximumCombinedTireDemand,
    ...finiteTireDemands,
  );

  const suspensionCompressions: CarWheelAuditValues = [
    input.chassis.frontLeftSuspensionCompression,
    input.chassis.frontRightSuspensionCompression,
    input.chassis.rearLeftSuspensionCompression,
    input.chassis.rearRightSuspensionCompression,
  ];
  const suspensionVelocities: CarWheelAuditValues = [
    input.chassis.frontLeftSuspensionVelocity,
    input.chassis.frontRightSuspensionVelocity,
    input.chassis.rearLeftSuspensionVelocity,
    input.chassis.rearRightSuspensionVelocity,
  ];
  const wheelLoads: CarWheelAuditValues = [
    input.chassis.frontLeftLoadNewtons,
    input.chassis.frontRightLoadNewtons,
    input.chassis.rearLeftLoadNewtons,
    input.chassis.rearRightLoadNewtons,
  ];
  if (audit.suspensionSampleCount === 0) {
    audit.maximumSuspensionCompression = [...suspensionCompressions];
    audit.minimumSuspensionCompression = [...suspensionCompressions];
    audit.maximumWheelLoadNewtons = [...wheelLoads];
    audit.minimumWheelLoadNewtons = [...wheelLoads];
  } else {
    audit.maximumSuspensionCompression = [
      Math.max(audit.maximumSuspensionCompression[0], suspensionCompressions[0]),
      Math.max(audit.maximumSuspensionCompression[1], suspensionCompressions[1]),
      Math.max(audit.maximumSuspensionCompression[2], suspensionCompressions[2]),
      Math.max(audit.maximumSuspensionCompression[3], suspensionCompressions[3]),
    ];
    audit.minimumSuspensionCompression = [
      Math.min(audit.minimumSuspensionCompression[0], suspensionCompressions[0]),
      Math.min(audit.minimumSuspensionCompression[1], suspensionCompressions[1]),
      Math.min(audit.minimumSuspensionCompression[2], suspensionCompressions[2]),
      Math.min(audit.minimumSuspensionCompression[3], suspensionCompressions[3]),
    ];
    audit.maximumWheelLoadNewtons = [
      Math.max(audit.maximumWheelLoadNewtons[0], wheelLoads[0]),
      Math.max(audit.maximumWheelLoadNewtons[1], wheelLoads[1]),
      Math.max(audit.maximumWheelLoadNewtons[2], wheelLoads[2]),
      Math.max(audit.maximumWheelLoadNewtons[3], wheelLoads[3]),
    ];
    audit.minimumWheelLoadNewtons = [
      Math.min(audit.minimumWheelLoadNewtons[0], wheelLoads[0]),
      Math.min(audit.minimumWheelLoadNewtons[1], wheelLoads[1]),
      Math.min(audit.minimumWheelLoadNewtons[2], wheelLoads[2]),
      Math.min(audit.minimumWheelLoadNewtons[3], wheelLoads[3]),
    ];
  }
  audit.suspensionSampleCount += 1;
  audit.peakSuspensionVelocity = [
    Math.max(audit.peakSuspensionVelocity[0], Math.abs(suspensionVelocities[0])),
    Math.max(audit.peakSuspensionVelocity[1], Math.abs(suspensionVelocities[1])),
    Math.max(audit.peakSuspensionVelocity[2], Math.abs(suspensionVelocities[2])),
    Math.max(audit.peakSuspensionVelocity[3], Math.abs(suspensionVelocities[3])),
  ];
  const totalWheelLoadNewtons = wheelLoads.reduce(
    (total, load) => total + load,
    0,
  );
  audit.maximumWheelLoadConservationErrorNewtons = Math.max(
    audit.maximumWheelLoadConservationErrorNewtons,
    Math.abs(totalWheelLoadNewtons - style.physics.massKg * 9.81),
  );

  if (
    input.collisionImpulseNewtonsSeconds
      >= Math.max(5, style.physics.massKg * 0.04)
  ) {
    audit.postImpactMomentumRatio = input.collisionMomentumBeforeKgMps > 0.01
      ? input.collisionMomentumAfterKgMps
        / input.collisionMomentumBeforeKgMps
      : 0;
    audit.suspensionSettleSecondsActive = 0;
    audit.suspensionQuietSeconds = 0;
  } else if (audit.suspensionSettleSecondsActive !== null) {
    audit.suspensionSettleSecondsActive += input.deltaSeconds;
    const peakSuspensionSpeed = Math.max(...suspensionVelocities.map(Math.abs));
    if (peakSuspensionSpeed <= 0.06) {
      audit.suspensionQuietSeconds += input.deltaSeconds;
      if (audit.suspensionQuietSeconds >= 0.18) {
        audit.suspensionSettleSecondsAfterImpact =
          audit.suspensionSettleSecondsActive;
        audit.suspensionSettleSecondsActive = null;
        audit.suspensionQuietSeconds = 0;
      }
    } else {
      audit.suspensionQuietSeconds = 0;
    }
  }

  if (audit.forwardThirtyFivePercentSeconds === null) {
    if (input.throttle > 0.5) {
      if (
        audit.forwardLaunchSecondsActive === null
        && forwardRatio <= 0.025
        && reverseRatio <= 0.025
      ) audit.forwardLaunchSecondsActive = 0;
      if (audit.forwardLaunchSecondsActive !== null) {
        audit.forwardLaunchSecondsActive += input.deltaSeconds;
        if (forwardRatio >= 0.35) {
          audit.forwardThirtyFivePercentSeconds = audit.forwardLaunchSecondsActive;
          audit.forwardLaunchSecondsActive = null;
        }
      }
    } else {
      audit.forwardLaunchSecondsActive = null;
    }
  }

  if (audit.reverseFifteenPercentSeconds === null) {
    if (input.throttle < -0.5) {
      if (
        audit.reverseLaunchSecondsActive === null
        && reverseRatio <= 0.025
        && forwardRatio <= 0.025
      ) audit.reverseLaunchSecondsActive = 0;
      if (audit.reverseLaunchSecondsActive !== null) {
        audit.reverseLaunchSecondsActive += input.deltaSeconds;
        if (reverseRatio >= 0.15) {
          audit.reverseFifteenPercentSeconds = audit.reverseLaunchSecondsActive;
          audit.reverseLaunchSecondsActive = null;
        }
      }
    } else {
      audit.reverseLaunchSecondsActive = null;
    }
  }

  if (
    audit.brakingStopSeconds === null
    && audit.brakingSecondsActive === null
    && input.serviceBraking
    && absoluteSpeedRatio >= 0.32
  ) {
    audit.brakingSecondsActive = 0;
    audit.brakingDistanceActiveMeters = 0;
  }
  if (audit.brakingSecondsActive !== null) {
    audit.brakingSecondsActive += input.deltaSeconds;
    audit.brakingDistanceActiveMeters += stepDistanceMeters;
    if (
      Math.abs(signedSpeedMps)
        <= style.controls.direction.stopSpeedMps * 1.2
    ) {
      audit.brakingStopSeconds = audit.brakingSecondsActive;
      audit.brakingDistanceMeters = audit.brakingDistanceActiveMeters;
      audit.brakingSecondsActive = null;
    } else if (!input.serviceBraking) {
      audit.brakingSecondsActive = null;
      audit.brakingDistanceActiveMeters = 0;
    }
  }

  const cleanCoast = Math.abs(input.throttle) < 0.02
    && Math.abs(input.steering) < 0.05
    && !input.serviceBraking;
  if (audit.coastRetentionRatio === null) {
    if (
      audit.coastSecondsActive === null
      && cleanCoast
      && absoluteSpeedRatio >= 0.35
    ) {
      audit.coastSecondsActive = 0;
      audit.coastStartSpeedMps = Math.abs(signedSpeedMps);
    } else if (audit.coastSecondsActive !== null) {
      if (!cleanCoast) {
        audit.coastSecondsActive = null;
      } else {
        audit.coastSecondsActive += input.deltaSeconds;
        if (audit.coastSecondsActive >= 1) {
          audit.coastRetentionRatio = Math.abs(signedSpeedMps)
            / Math.max(0.01, audit.coastStartSpeedMps);
          audit.coastSecondsActive = null;
        }
      }
    }
  }

  if (audit.steeringResponseSeconds === null) {
    const steeringHeld = Math.abs(input.steering) > 0.5;
    if (
      audit.steeringSecondsActive === null
      && steeringHeld
      && absoluteSpeedRatio >= 0.08
      && absoluteSpeedRatio <= 0.45
      && Math.abs(input.chassis.steeringAngle)
        <= style.physics.maximumSteeringAngle * 0.08
    ) audit.steeringSecondsActive = 0;
    if (audit.steeringSecondsActive !== null) {
      if (!steeringHeld) {
        audit.steeringSecondsActive = null;
      } else {
        audit.steeringSecondsActive += input.deltaSeconds;
        if (
          Math.abs(input.chassis.steeringAngle)
            >= style.physics.maximumSteeringAngle * 0.6
        ) {
          audit.steeringResponseSeconds = audit.steeringSecondsActive;
          audit.steeringSecondsActive = null;
        }
      }
    }
  }

  const releasedSteering = Math.abs(audit.lastSteeringInput) > 0.5
    && Math.abs(input.steering) < 0.05;
  if (releasedSteering && Math.abs(input.chassis.steeringAngle) > 0.001) {
    audit.steeringReleaseSign = Math.sign(
      input.chassis.steeringAngle,
    ) as -1 | 1;
    audit.steeringReleaseSeconds = 0;
  }
  if (Math.abs(input.steering) > 0.05) {
    audit.steeringReleaseSign = 0;
    audit.steeringReleaseSeconds = null;
  } else if (audit.steeringReleaseSeconds !== null) {
    audit.steeringReleaseSeconds += input.deltaSeconds;
    if (
      Math.sign(input.chassis.steeringAngle)
        === -audit.steeringReleaseSign
    ) {
      audit.steeringOvershootRatio = Math.max(
        audit.steeringOvershootRatio,
        Math.abs(input.chassis.steeringAngle)
          / Math.max(0.001, style.physics.maximumSteeringAngle),
      );
    }
    if (audit.steeringReleaseSeconds >= 1.5) {
      audit.steeringReleaseSeconds = null;
      audit.steeringReleaseSign = 0;
    }
  }
  audit.lastSteeringInput = input.steering;

  const demandedDirection: -1 | 0 | 1 = input.throttle < -0.02
    ? -1
    : input.throttle > 0.02 ? 1 : 0;
  if (audit.directionEngagementSeconds === null) {
    if (
      audit.directionEngagementSecondsActive === null
      && demandedDirection !== 0
      && demandedDirection !== input.chassis.driveDirection
      && absoluteSpeedRatio <= 0.08
    ) {
      audit.directionEngagementTarget = demandedDirection;
      audit.directionEngagementSecondsActive = 0;
    }
    if (audit.directionEngagementSecondsActive !== null) {
      if (demandedDirection !== audit.directionEngagementTarget) {
        audit.directionEngagementSecondsActive = null;
        audit.directionEngagementTarget = 0;
      } else {
        audit.directionEngagementSecondsActive += input.deltaSeconds;
        if (input.chassis.driveDirection === audit.directionEngagementTarget) {
          audit.directionEngagementSeconds = audit.directionEngagementSecondsActive;
          audit.directionEngagementSecondsActive = null;
        }
      }
    }
  }

  const driveDirection = input.chassis.driveDirection;
  if (driveDirection !== 0) {
    if (
      audit.lastDriveDirection !== 0
      && driveDirection !== audit.lastDriveDirection
    ) audit.directionChanges += 1;
    audit.lastDriveDirection = driveDirection;
  }
}

export type CarAuditCalibrationReport = ReturnType<typeof getCarCalibrationReport> & {
  assessment: ReturnType<typeof getCarCalibrationAssessment>;
  measured: CarManeuverAudit;
  measurementState: "measured" | "not-run";
};
