import {
  getCarEngineRoadSpeedKph,
  getCarEngineTargetRpm,
  getCarTorqueMultiplier,
  type CarEngineStyle,
} from "./carEngineStyles";
import type { CarLongitudinalPhase } from "./carChassis";

export type CarDrivetrainState = {
  clutch: number;
  /** Mechanically separate converter lockup-clutch engagement. */
  lockup?: number;
  lockupEngaged?: boolean;
  shaftTorqueNm?: number;
  /** Direction used by legacy relative shaft state; current twist is world-signed. */
  shaftDirection?: -1 | 0 | 1;
  shaftTwistRadians?: number;
  shaftMechanicalReduction?: number;
  lastShaftDampingLossJ?: number;
  lastSynchronizerLossJ?: number;
  lastShiftOverlapLossJ?: number;
  lastCollisionDrivetrainLossJ?: number;
  converterTargetRpm?: number;
  coupledTargetRpm?: number;
  converterTurbineRpm?: number;
  converterTurbineRpmVelocity?: number;
  directionCoupling: number;
  engineLoad: number;
  forwardGear: number;
  lastLoad: number;
  lastDirection: -1 | 0 | 1;
  lastSpeedRatio: number;
  /** Last authoritative force emitted by this exact drivetrain state. */
  lastWheelForceNewtons: number;
  limiterActive: boolean;
  limiterPhase: number;
  overrun: number;
  reactionTorqueNm: number;
  rpmVelocity: number;
  rapidRpmRecoverySeconds: number;
  rpm: number;
  shiftCandidateGear: number | null;
  shiftCandidateSeconds: number;
  shiftCooldownSeconds: number;
  shiftSecondsRemaining: number;
  shiftSynchronizationHoldSeconds?: number;
  shiftSourceGear?: number | null;
  shiftTargetGear: number | null;
  transmittedCrankTorqueNm?: number;
};

export type CarDrivetrainInput = {
  corneringDemand?: number;
  deltaSeconds: number;
  /** Actual front/rear differential carrier speeds, normalized to road speed. */
  drivenAxleSpeedRatios?: {
    front: number;
    rear: number;
  };
  /** Average driven-wheel surface acceleration at each axle in m/s². */
  drivenAxleAccelerationsMps2?: {
    front: number;
    rear: number;
  };
  drivenWheelSpeedRatio?: number;
  engagedDirection?: -1 | 0 | 1;
  longitudinalContactReactionForceNewtons?: number;
  longitudinalPhase?: CarLongitudinalPhase;
  /** Raw driver intent; decaying pedal/load state cannot authorize propulsion. */
  propulsionRequested?: boolean;
  /** Longitudinal forces actually transmitted at each axle's contact patches. */
  drivenContactForcesNewtons?: {
    front: number;
    rear: number;
  };
  serviceBrake?: boolean;
  signedSpeedRatio: number;
  steering: number;
  throttle: number;
};

export type CarDrivetrainOutput = {
  abruptStop: boolean;
  braking: boolean;
  clutch: number;
  clutchSlipRpm: number;
  clutchReactionTorqueNm: number;
  combustionTorqueNm: number;
  crankNetTorqueNm: number;
  decelerationRate: number;
  direction: -1 | 0 | 1;
  gear: number;
  load: number;
  limiterCut: number;
  idleGovernorTorqueNm: number;
  pumpingTorqueNm: number;
  drivenContactReactionTorqueNm: number;
  drivenRotationalReactionTorqueNm: number;
  hardDeceleration: boolean;
  rapidRpmRecovery: boolean;
  roadSpeedKph: number;
  drivenReactionTorqueNm: number;
  rpm: number;
  rpmVelocity: number;
  serviceBraking: boolean;
  shaftDampingLossJ: number;
  shaftTorqueNm: number;
  shaftTwistRadians: number;
  shiftProgress: number;
  shiftState: "pending" | "shifting" | "steady";
  shifted: boolean;
  speedRatio: number;
  steering: number;
  synchronizationErrorRpm: number;
  synchronizerLossJ: number;
  shiftOverlapLossJ: number;
  targetRpm: number;
  throttle: number;
  torqueFactor: number;
  transmittedCrankTorqueNm: number;
  lockup: number;
  wheelForceNewtons: number;
  overrun: number;
};

export type CarIgnitionPhase =
  | "cranking"
  | "catching"
  | "flaring"
  | "settling"
  | "running";

export type CarIgnitionState = {
  phase: CarIgnitionPhase;
  progress: number;
  rpm: number;
  rpmVelocity: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(start: number, end: number, value: number) {
  const ratio = clamp01((value - start) / Math.max(0.0001, end - start));
  return ratio * ratio * (3 - 2 * ratio);
}

export type CarPowertrainMechanics = {
  complianceInertiaKgM2: number;
  crankInertiaKgM2: number;
  inputShaftInertiaKgM2: number;
  reflectedRoadInertiaKgM2: number;
  shaftDampingNmPerRadianPerSecond: number;
  shaftStiffnessNmPerRadian: number;
};

export function getCarPowertrainMechanics(
  style: CarEngineStyle,
  totalReduction: number,
): CarPowertrainMechanics {
  const crankInertiaKgM2 = Math.max(0.55, style.combustion.crankInertia);
  const inputShaftInertiaKgM2 = style.transmission.coupling.kind
    === "torque-converter"
    ? Math.max(0.28, crankInertiaKgM2 * 0.5)
    : Math.max(0.16, crankInertiaKgM2 * 0.26);
  const reflectedRoadInertiaKgM2 = (
    style.physics.massKg * style.physics.wheelRadiusM ** 2
      + style.physics.wheelInertiaKgM2 * 4
  ) / Math.max(0.01, totalReduction * totalReduction);
  const complianceInertiaKgM2 = inputShaftInertiaKgM2
    * reflectedRoadInertiaKgM2
    / Math.max(0.01, inputShaftInertiaKgM2 + reflectedRoadInertiaKgM2);
  const shaftNaturalFrequency = Math.max(
    20,
    style.physics.drivelineResponseFrequency,
  );
  const shaftStiffnessNmPerRadian = complianceInertiaKgM2
    * shaftNaturalFrequency * shaftNaturalFrequency;
  return {
    complianceInertiaKgM2,
    crankInertiaKgM2,
    inputShaftInertiaKgM2,
    reflectedRoadInertiaKgM2,
    shaftDampingNmPerRadianPerSecond: 2
      * style.physics.drivelineDampingRatio
      * Math.sqrt(shaftStiffnessNmPerRadian * complianceInertiaKgM2),
    shaftStiffnessNmPerRadian,
  };
}

export function getCarDrivetrainMechanicalReduction(
  style: CarEngineStyle,
  state: Pick<CarDrivetrainState, "forwardGear" | "lastDirection">,
) {
  const ratio = state.lastDirection < 0
    ? style.transmission.reverseRatio
    : style.transmission.gears[Math.max(0, state.forwardGear - 1)]?.ratio
      ?? style.transmission.gears[0].ratio;
  return Math.max(0.1, ratio * style.physics.finalDriveRatio);
}

function ignitionRpmAt(
  style: CarEngineStyle,
  elapsedSeconds: number,
  durationSeconds: number,
) {
  const progress = clamp01(elapsedSeconds / Math.max(0.2, durationSeconds));
  const crankRpm = Math.max(170, style.rpm.idle * 0.25);
  const catchRpm = style.rpm.idle * 1.42;
  const flareRpm = style.rpm.idle * 1.54;
  if (progress < 0.24) {
    return crankRpm * (0.88 + smoothstep(0, 0.24, progress) * 0.12);
  }
  if (progress < 0.52) {
    const blend = smoothstep(0.24, 0.52, progress);
    return crankRpm + (catchRpm - crankRpm) * blend;
  }
  if (progress < 0.66) {
    const blend = smoothstep(0.52, 0.66, progress);
    return catchRpm + (flareRpm - catchRpm) * blend;
  }
  const blend = smoothstep(0.66, 1, progress);
  return flareRpm + (style.rpm.idle * 1.03 - flareRpm) * blend;
}

export function getCarIgnitionState(
  style: CarEngineStyle,
  elapsedSeconds: number,
  durationSeconds = 1.12,
): CarIgnitionState {
  const boundedElapsed = Math.max(0, elapsedSeconds);
  const progress = clamp01(boundedElapsed / Math.max(0.2, durationSeconds));
  if (progress >= 1) {
    return {
      phase: "running",
      progress: 1,
      rpm: style.rpm.idle,
      rpmVelocity: 0,
    };
  }
  const rpm = ignitionRpmAt(style, boundedElapsed, durationSeconds);
  const derivativeStep = Math.min(0.006, Math.max(0.001, boundedElapsed));
  const previousRpm = ignitionRpmAt(
    style,
    Math.max(0, boundedElapsed - derivativeStep),
    durationSeconds,
  );
  const phase: CarIgnitionPhase = progress < 0.24
    ? "cranking"
    : progress < 0.52
      ? "catching"
      : progress < 0.66
        ? "flaring"
        : "settling";
  return {
    phase,
    progress,
    rpm,
    rpmVelocity: (rpm - previousRpm) / derivativeStep,
  };
}

export function getCarIgnitionThrottleAuthority(
  elapsedSeconds: number,
  torqueStartSeconds: number,
  settledSeconds: number,
) {
  return smoothstep(torqueStartSeconds, settledSeconds, elapsedSeconds);
}

function integratePowertrainTorque(
  currentRpm: number,
  style: CarEngineStyle,
  currentInputShaftRpm: number,
  targetInputShaftRpm: number,
  currentShaftTwistRadians: number,
  direction: -1 | 0 | 1,
  totalReduction: number,
  gearEngaged: boolean,
  clutch: number,
  lockup: number,
  combustionLoad: number,
  limiterCut: number,
  synchronizerTorqueCapacityNm: number,
  maximumOverrunCrankTorqueNm: number,
  deltaSeconds: number,
) {
  const stepCount = Math.max(1, Math.ceil(deltaSeconds / (1 / 360)));
  const stepSeconds = deltaSeconds / stepCount;
  const maximumTorqueNm = style.calibration.maximumTorqueNm;
  const rpmSpan = Math.max(1, style.rpm.maximum - style.rpm.idle);
  const {
    crankInertiaKgM2,
    inputShaftInertiaKgM2,
    shaftDampingNmPerRadianPerSecond,
    shaftStiffnessNmPerRadian,
  } = getCarPowertrainMechanics(style, totalReduction);
  const crankRpmRatePerTorque = 60 / (Math.PI * 2) / crankInertiaKgM2;
  const converter = style.transmission.coupling.kind === "torque-converter";
  const inputShaftRpmRatePerTorque = 60 / (Math.PI * 2)
    / inputShaftInertiaKgM2;
  const shaftBacklashRadians = Math.max(
    0,
    style.physics.drivelineBacklashRadians,
  );
  const converterShaftCapacityRatio = style.transmission.coupling.kind
    === "torque-converter"
    ? Math.max(2, style.transmission.coupling.stallTorqueRatio * 1.35)
    : 2.15;
  const shaftCapacityNm = maximumTorqueNm * converterShaftCapacityRatio;
  let rpm = currentRpm;
  let inputShaftRpm = Math.max(0, currentInputShaftRpm);
  let shaftTwistRadians = Number.isFinite(currentShaftTwistRadians)
    ? currentShaftTwistRadians
    : 0;
  let clutchReactionTotalNm = 0;
  let combustionTotalNm = 0;
  let crankNetTotalNm = 0;
  let idleGovernorTotalNm = 0;
  let pumpingTotalNm = 0;
  let transmittedTotalNm = 0;
  let shaftDampingLossJ = 0;
  let synchronizerFrictionLossJ = 0;

  for (let step = 0; step < stepCount; step += 1) {
    const rpmRatio = clamp01((rpm - style.rpm.idle) / rpmSpan);
    const combustionTorqueNm = maximumTorqueNm
      * combustionLoad
      * (1 - limiterCut * 0.96)
      * getCarTorqueMultiplier(style, rpm);
    const pumpingTorqueNm = maximumTorqueNm
      * (0.045 + Math.sqrt(rpmRatio) * 0.92)
      * (1 - combustionLoad * 0.68);
    const idleGovernorTorqueNm = maximumTorqueNm * 0.5 * clamp01(
      (style.rpm.idle - rpm) / Math.max(1, style.rpm.idle * 0.16),
    );
    const freeCrankTorqueNm = combustionTorqueNm
      + idleGovernorTorqueNm - pumpingTorqueNm;
    const storedCrankDriveTorqueNm = Math.max(0, rpm - style.rpm.idle)
      / Math.max(0.0001, crankRpmRatePerTorque * stepSeconds);
    const maximumCrankDriveReactionNm = Math.max(
      0,
      freeCrankTorqueNm + storedCrankDriveTorqueNm,
    );
    // Twist lives in the page/world drive direction. The input shaft still
    // spins in a positive local coordinate, so convert only at the gearset.
    // Direction handoffs dissipate old-world twist before this solver runs;
    // within one engaged direction, twist remains world-signed across lash.
    const relativeShaftSpeedRadiansPerSecond = direction * (
      inputShaftRpm - targetInputShaftRpm
    ) * Math.PI * 2 / 60;
    let shaftInputTorqueNm = 0;
    if (gearEngaged) {
      shaftTwistRadians += relativeShaftSpeedRadiansPerSecond * stepSeconds;
      const twistMagnitude = Math.abs(shaftTwistRadians);
      const effectiveTwistRadians = Math.sign(shaftTwistRadians) * Math.max(
        0,
        twistMagnitude - shaftBacklashRadians,
      );
      const lashEngagement = shaftBacklashRadians <= 0
        ? 1
        : smoothstep(
            shaftBacklashRadians,
            shaftBacklashRadians * 1.22 + 0.0005,
            twistMagnitude,
          );
      const shaftDampingTorqueNm = relativeShaftSpeedRadiansPerSecond
        * shaftDampingNmPerRadianPerSecond * lashEngagement;
      shaftDampingLossJ += Math.abs(
        shaftDampingTorqueNm * relativeShaftSpeedRadiansPerSecond,
      ) * stepSeconds;
      const rawShaftTorqueNm = effectiveTwistRadians
        * shaftStiffnessNmPerRadian + shaftDampingTorqueNm;
      const rawShaftInputTorqueNm = rawShaftTorqueNm * direction;
      // Shaft energy may continue through a direction handoff at full shaft
      // capacity. Clutch, converter, and crank reaction limits are enforced
      // separately below; using the overrun ceiling here clipped stored twist.
      shaftInputTorqueNm = Math.max(
        -shaftCapacityNm,
        Math.min(shaftCapacityNm, rawShaftInputTorqueNm),
      );
      const maximumTwistMagnitude = shaftBacklashRadians
        + shaftCapacityNm / Math.max(1, shaftStiffnessNmPerRadian);
      shaftTwistRadians = Math.max(
        -maximumTwistMagnitude,
        Math.min(maximumTwistMagnitude, shaftTwistRadians),
      );
    } else {
      const previousEffectiveTwistRadians = Math.sign(shaftTwistRadians)
        * Math.max(0, Math.abs(shaftTwistRadians) - shaftBacklashRadians);
      const previousShaftPotentialJ = 0.5 * shaftStiffnessNmPerRadian
        * previousEffectiveTwistRadians * previousEffectiveTwistRadians;
      shaftTwistRadians *= Math.exp(-stepSeconds * 24);
      const nextEffectiveTwistRadians = Math.sign(shaftTwistRadians)
        * Math.max(0, Math.abs(shaftTwistRadians) - shaftBacklashRadians);
      const nextShaftPotentialJ = 0.5 * shaftStiffnessNmPerRadian
        * nextEffectiveTwistRadians * nextEffectiveTwistRadians;
      shaftDampingLossJ += Math.max(
        0,
        previousShaftPotentialJ - nextShaftPotentialJ,
      );
    }

    let clutchReactionTorqueNm = 0;
    let inputShaftDriveTorqueNm = 0;
    if (style.transmission.coupling.kind === "torque-converter") {
      const coupling = style.transmission.coupling;
      const converterSpeedRatio = clamp01(
        inputShaftRpm / Math.max(style.rpm.idle * 0.55, rpm),
      );
      const fluidCapacityNm = maximumTorqueNm * clutch
        * (coupling.fluidCapacityBase + clutch * coupling.fluidCapacityGain);
      const fluidSlipTorqueNmPerRpm = coupling.slipTorqueBaseNmPerRpm
        + clutch * clutch * coupling.slipTorqueGainNmPerRpm;
      let fluidReactionOnCrankNm = Math.max(
        -fluidCapacityNm,
        Math.min(
          Math.min(fluidCapacityNm, maximumOverrunCrankTorqueNm),
          (inputShaftRpm - rpm) * fluidSlipTorqueNmPerRpm,
        ),
      );
      fluidReactionOnCrankNm = Math.max(
        -maximumCrankDriveReactionNm,
        fluidReactionOnCrankNm,
      );
      const converterTorqueRatio = 1
        + (coupling.stallTorqueRatio - 1)
          * (1 - smoothstep(
            coupling.torqueRatioStartSpeedRatio,
            coupling.torqueRatioEndSpeedRatio,
            converterSpeedRatio,
          ));
      const fluidInputTorqueNm = -fluidReactionOnCrankNm >= 0
        ? -fluidReactionOnCrankNm * converterTorqueRatio
        : -fluidReactionOnCrankNm;
      const lockupCapacityNm = maximumTorqueNm * 1.8 * lockup * lockup;
      const crankTorqueBeforeLockNm = freeCrankTorqueNm
        + fluidReactionOnCrankNm;
      const inputTorqueBeforeLockNm = fluidInputTorqueNm - shaftInputTorqueNm;
      const requiredLockReactionOnCrankNm = (
        inputShaftRpm - rpm
          + inputTorqueBeforeLockNm * inputShaftRpmRatePerTorque * stepSeconds
          - crankTorqueBeforeLockNm * crankRpmRatePerTorque * stepSeconds
      ) / Math.max(
        0.0001,
        (crankRpmRatePerTorque + inputShaftRpmRatePerTorque) * stepSeconds,
      );
      const minimumLockReactionNm = -Math.max(
        0,
        maximumCrankDriveReactionNm + fluidReactionOnCrankNm,
      );
      const lockReactionOnCrankNm = Math.max(
        Math.max(-lockupCapacityNm, minimumLockReactionNm),
        Math.min(
          Math.min(lockupCapacityNm, maximumOverrunCrankTorqueNm),
          requiredLockReactionOnCrankNm,
        ),
      );
      clutchReactionTorqueNm = fluidReactionOnCrankNm
        + lockReactionOnCrankNm;
      inputShaftDriveTorqueNm = fluidInputTorqueNm
        - lockReactionOnCrankNm;
    } else {
      const clutchCapacityNm = maximumTorqueNm * 1.65 * clutch * clutch;
      const inputTorqueBeforeClutchNm = -shaftInputTorqueNm;
      const requiredClutchReactionNm = (
        inputShaftRpm - rpm
          + inputTorqueBeforeClutchNm
            * inputShaftRpmRatePerTorque * stepSeconds
          - freeCrankTorqueNm * crankRpmRatePerTorque * stepSeconds
      ) / Math.max(
        0.0001,
        (crankRpmRatePerTorque + inputShaftRpmRatePerTorque) * stepSeconds,
      );
      clutchReactionTorqueNm = Math.max(
        Math.max(-clutchCapacityNm, -maximumCrankDriveReactionNm),
        Math.min(
          Math.min(clutchCapacityNm, maximumOverrunCrankTorqueNm),
          requiredClutchReactionNm,
        ),
      );
      inputShaftDriveTorqueNm = -clutchReactionTorqueNm;
    }

    const synchronizerErrorRadiansPerSecond = (
      targetInputShaftRpm - inputShaftRpm
    ) * Math.PI * 2 / 60;
    const requiredSynchronizerTorqueNm = synchronizerErrorRadiansPerSecond
      / Math.max(0.0001, inputShaftRpmRatePerTorque
        * Math.PI * 2 / 60 * stepSeconds);
    const synchronizerTorqueNm = Math.max(
      -synchronizerTorqueCapacityNm,
      Math.min(synchronizerTorqueCapacityNm, requiredSynchronizerTorqueNm),
    );
    synchronizerFrictionLossJ += Math.abs(
      synchronizerTorqueNm * synchronizerErrorRadiansPerSecond,
    ) * stepSeconds;
    const crankNetTorqueNm = freeCrankTorqueNm + clutchReactionTorqueNm;
    const inputShaftNetTorqueNm = inputShaftDriveTorqueNm - shaftInputTorqueNm
      + synchronizerTorqueNm;
    rpm = Math.max(
      style.rpm.idle,
      Math.min(
        style.rpm.maximum,
        rpm + crankNetTorqueNm * crankRpmRatePerTorque * stepSeconds,
      ),
    );
    inputShaftRpm = Math.max(
      0,
      Math.min(
        style.rpm.maximum * 1.25,
        inputShaftRpm + inputShaftNetTorqueNm
          * inputShaftRpmRatePerTorque * stepSeconds,
      ),
    );

    clutchReactionTotalNm += clutchReactionTorqueNm;
    combustionTotalNm += combustionTorqueNm;
    crankNetTotalNm += crankNetTorqueNm;
    idleGovernorTotalNm += idleGovernorTorqueNm;
    pumpingTotalNm += pumpingTorqueNm;
    transmittedTotalNm += gearEngaged
      ? shaftInputTorqueNm - synchronizerTorqueNm
      : 0;
  }

  const derivativeSeconds = Math.max(0.0001, deltaSeconds);
  const maximumCrankRate = Math.max(9000, rpmSpan / 0.12);
  const rpmVelocity = Math.max(
    -maximumCrankRate,
    Math.min(maximumCrankRate, (rpm - currentRpm) / derivativeSeconds),
  );
  const inputShaftRpmVelocity = Math.max(
    -12000,
    Math.min(
      12000,
      (inputShaftRpm - currentInputShaftRpm) / derivativeSeconds,
    ),
  );
  return {
    clutchReactionTorqueNm: clutchReactionTotalNm / stepCount,
    combustionTorqueNm: combustionTotalNm / stepCount,
    crankNetTorqueNm: crankNetTotalNm / stepCount,
    idleGovernorTorqueNm: idleGovernorTotalNm / stepCount,
    pumpingTorqueNm: pumpingTotalNm / stepCount,
    rpm,
    rpmVelocity,
    shaftDampingLossJ,
    synchronizerFrictionLossJ,
    shaftTorqueNm: transmittedTotalNm / stepCount,
    shaftTwistRadians,
    transmittedTorqueNm: transmittedTotalNm / stepCount,
    turbineRpm: inputShaftRpm,
    turbineRpmVelocity: inputShaftRpmVelocity,
  };
}

export function createCarDrivetrainState(style: CarEngineStyle): CarDrivetrainState {
  return {
    clutch: 0,
    lockup: 0,
    lockupEngaged: false,
    shaftTorqueNm: 0,
    shaftDirection: 0,
    shaftTwistRadians: 0,
    shaftMechanicalReduction: getCarDrivetrainMechanicalReduction(style, {
      forwardGear: 1,
      lastDirection: 1,
    }),
    lastShaftDampingLossJ: 0,
    lastSynchronizerLossJ: 0,
    lastShiftOverlapLossJ: 0,
    lastCollisionDrivetrainLossJ: 0,
    converterTargetRpm: 0,
    coupledTargetRpm: style.rpm.idle,
    converterTurbineRpm: 0,
    converterTurbineRpmVelocity: 0,
    directionCoupling: 0,
    engineLoad: 0,
    forwardGear: 1,
    lastLoad: 0,
    lastDirection: 0,
    lastWheelForceNewtons: 0,
    reactionTorqueNm: 0,
    lastSpeedRatio: 0,
    limiterActive: false,
    limiterPhase: 0,
    overrun: 0,
    rapidRpmRecoverySeconds: 0,
    rpm: style.rpm.idle,
    rpmVelocity: 0,
    shiftCandidateGear: null,
    shiftCandidateSeconds: 0,
    shiftCooldownSeconds: 0,
    shiftSecondsRemaining: 0,
    shiftSynchronizationHoldSeconds: 0,
    shiftSourceGear: null,
    shiftTargetGear: null,
    transmittedCrankTorqueNm: 0,
  };
}

export function reconcileCarDrivetrainAfterCollision(
  previous: CarDrivetrainState,
  style: CarEngineStyle,
  options: {
    direction: -1 | 0 | 1;
    drivenWheelSpeedRatio: number;
    previousDrivenWheelSpeedRatio: number;
  },
): CarDrivetrainState {
  const previousDrivenRoadSpeedMps = getCarEngineRoadSpeedKph(
    style,
    options.previousDrivenWheelSpeedRatio,
  ) / 3.6;
  const drivenRoadSpeedMps = getCarEngineRoadSpeedKph(
    style,
    options.drivenWheelSpeedRatio,
  ) / 3.6;
  const longitudinalSpeedChangeMps = drivenRoadSpeedMps
    - previousDrivenRoadSpeedMps;
  const rebaseSpeedRangeMps = Math.max(
    0.7,
    Math.min(2.4, 0.7 + Math.abs(previousDrivenRoadSpeedMps) * 0.35),
  );
  const impactAuthority = clamp01(
    Math.abs(longitudinalSpeedChangeMps) / rebaseSpeedRangeMps,
  );
  if (impactAuthority <= 0) {
    return { ...previous, lastCollisionDrivetrainLossJ: 0 };
  }
  const direction = options.direction || previous.lastDirection;
  const gear = Math.max(1, Math.min(
    style.transmission.gears.length,
    previous.forwardGear,
  ));
  const roadSpeedMps = Math.abs(
    getCarEngineRoadSpeedKph(style, options.drivenWheelSpeedRatio),
  ) / 3.6;
  const wheelRpm = roadSpeedMps
    / (2 * Math.PI * Math.max(0.05, style.physics.wheelRadiusM)) * 60;
  const gearRatio = direction < 0
    ? style.transmission.reverseRatio
    : style.transmission.gears[gear - 1].ratio;
  const targetTurbineRpm = direction === 0
    ? 0
    : wheelRpm * gearRatio * style.physics.finalDriveRatio;
  const mechanicalReduction = previous.shaftMechanicalReduction
    ?? Math.max(0.1, gearRatio * style.physics.finalDriveRatio);
  const mechanics = getCarPowertrainMechanics(style, mechanicalReduction);
  const backlashRadians = Math.max(0, style.physics.drivelineBacklashRadians);
  const previousTwistRadians = previous.shaftTwistRadians ?? 0;
  const previousEffectiveTwistRadians = Math.sign(previousTwistRadians)
    * Math.max(0, Math.abs(previousTwistRadians) - backlashRadians);
  const retainedEnergy = 1 - impactAuthority;
  const nextEffectiveTwistRadians = previousEffectiveTwistRadians
    * Math.sqrt(retainedEnergy);
  const nextTwistRadians = nextEffectiveTwistRadians === 0
    ? 0
    : nextEffectiveTwistRadians
      + Math.sign(nextEffectiveTwistRadians) * backlashRadians;
  const previousPotentialJ = 0.5 * mechanics.shaftStiffnessNmPerRadian
    * previousEffectiveTwistRadians * previousEffectiveTwistRadians;
  const nextPotentialJ = 0.5 * mechanics.shaftStiffnessNmPerRadian
    * nextEffectiveTwistRadians * nextEffectiveTwistRadians;
  const torqueRetention = Math.sqrt(retainedEnergy);
  return {
    ...previous,
    converterTargetRpm: targetTurbineRpm,
    converterTurbineRpm: (previous.converterTurbineRpm ?? targetTurbineRpm)
      + (targetTurbineRpm - (previous.converterTurbineRpm ?? targetTurbineRpm))
        * impactAuthority,
    converterTurbineRpmVelocity: (previous.converterTurbineRpmVelocity ?? 0)
      * retainedEnergy,
    lastCollisionDrivetrainLossJ: Math.max(0, previousPotentialJ - nextPotentialJ),
    lastWheelForceNewtons: previous.lastWheelForceNewtons * torqueRetention,
    reactionTorqueNm: previous.reactionTorqueNm * torqueRetention,
    shaftTorqueNm: (previous.shaftTorqueNm ?? 0) * torqueRetention,
    shaftTwistRadians: nextTwistRadians,
    transmittedCrankTorqueNm: (previous.transmittedCrankTorqueNm ?? 0)
      * torqueRetention,
  };
}

export function getCarWheelForceNewtons(
  style: CarEngineStyle,
  rpm: number,
  gear: number,
  direction: -1 | 1,
  torqueFactor: number,
) {
  const transmissionRatio = direction < 0
    ? style.transmission.reverseRatio
    : style.transmission.gears[
        Math.max(0, Math.min(style.transmission.gears.length - 1, gear - 1))
      ].ratio;
  // Engine torque, the selected gear, final drive, efficiency, and tire grip
  // are the complete force path. Reverse has one deliberate maneuvering
  // authority here; the former second pedal-demand scale was removed.
  const directionAuthority = direction < 0
    ? style.physics.reverseTorqueAuthority
    : 1;
  const rawForce = direction
    * style.calibration.maximumTorqueNm
    * getCarTorqueMultiplier(style, rpm)
    * clamp01(torqueFactor)
    * transmissionRatio
    * style.physics.finalDriveRatio
    * style.physics.drivetrainEfficiency
    * directionAuthority
    / Math.max(0.1, style.physics.wheelRadiusM);
  // Gearing, efficiency, mass, drag, and available tire grip are now the sole
  // acceleration authorities. Keeping a second page-scale force ceiling here
  // made engine torque non-authoritative and flattened the lower gears.
  return rawForce;
}

export function updateCarDrivetrain(
  previous: CarDrivetrainState,
  style: CarEngineStyle,
  input: CarDrivetrainInput,
): { output: CarDrivetrainOutput; state: CarDrivetrainState } {
  const deltaSeconds = Math.max(1 / 2000, Math.min(0.1, input.deltaSeconds));
  const signedSpeed = Math.max(-1, Math.min(1, input.signedSpeedRatio));
  const axleFeedback = input.drivenAxleSpeedRatios;
  const feedbackSpeed = axleFeedback
    ? axleFeedback.front * style.physics.driveBiasFront
      + axleFeedback.rear * (1 - style.physics.driveBiasFront)
    : input.drivenWheelSpeedRatio;
  const drivenWheelSpeed = Math.max(-1.4, Math.min(
    1.4,
    feedbackSpeed ?? signedSpeed,
  ));
  const speed = Math.abs(signedSpeed);
  const previousSpeed = Math.abs(previous.lastSpeedRatio);
  const decelerationRate = Math.max(0, (previousSpeed - speed) / deltaSeconds);
  const abruptStop = previousSpeed > 0.035 && speed <= 0.01;
  const hardDeceleration = abruptStop || decelerationRate >= 1.2;
  const movementDirection: -1 | 0 | 1 = signedSpeed < -0.01 ? -1 : signedSpeed > 0.01 ? 1 : 0;
  const throttle = Math.max(-1, Math.min(1, input.throttle));
  const requestedDirection: -1 | 0 | 1 = throttle < -0.01
    ? -1
    : throttle > 0.01 ? 1 : 0;
  const direction = input.engagedDirection
    ?? (movementDirection !== 0 ? movementDirection : requestedDirection);
  const previousDirection = previous.lastDirection ?? movementDirection;
  const previousDirectionCoupling = Number.isFinite(previous.directionCoupling)
    ? previous.directionCoupling
    : direction === previousDirection ? 1 : 0;
  const directionChanged = direction !== 0
    && previousDirection !== 0
    && direction !== previousDirection;
  const directionCoupling = direction === 0
    ? 0
    : directionChanged
      ? 0
      : Math.min(
          1,
          previousDirectionCoupling
            + deltaSeconds / style.controls.direction.couplingBlendSeconds,
        );
  const steering = Math.max(-1, Math.min(1, input.steering));
  const driverPedalDemand = direction < 0
    ? Math.max(0, -throttle)
    : direction > 0
      ? Math.max(0, throttle)
      : Math.abs(throttle);
  const phaseRequiresBraking = input.longitudinalPhase === "service-braking"
    || input.longitudinalPhase === "braking-to-forward"
    || input.longitudinalPhase === "braking-to-reverse"
    || input.longitudinalPhase === "engaging-forward"
    || input.longitudinalPhase === "engaging-reverse";
  const serviceBraking = input.serviceBrake
    ?? (input.longitudinalPhase !== undefined
      ? phaseRequiresBraking
      : (direction > 0 && throttle < -0.05)
        || (direction < 0 && throttle > 0.05));
  // The page car deliberately holds at rest when no key is pressed. Keeping a
  // hidden converter-creep load here made the automatic drivetrain fight that
  // chassis contract without ever producing visible motion.
  const pedalDemand = driverPedalDemand;
  const propulsionRequested = input.propulsionRequested
    ?? pedalDemand > 0.025;
  // Measured deceleration is diagnostic only; only the commanded service brake
  // may alter load, shifts, coupling, or transmitted torque.
  const braking = serviceBraking;
  const loadResponse = pedalDemand > previous.engineLoad
    ? direction < 0
      ? style.controls.pedals.reverseEngineLoadRiseSeconds
      : style.controls.pedals.engineLoadRiseSeconds
    : braking || previous.rapidRpmRecoverySeconds > 0
      ? style.controls.pedals.brakingLoadReleaseSeconds
      : style.controls.pedals.engineLoadReleaseSeconds;
  const engineLoad = previous.engineLoad + (pedalDemand - previous.engineLoad)
    * (1 - Math.exp(-deltaSeconds / loadResponse));
  const load = clamp01(engineLoad);
  const transmission = style.transmission;
  let forwardGear = Math.max(1, Math.min(
    transmission.gears.length,
    previous.forwardGear,
  ));
  let shiftCandidateGear = previous.shiftCandidateGear;
  let shiftCandidateSeconds = previous.shiftCandidateSeconds;
  let shiftCooldownSeconds = Math.max(0, previous.shiftCooldownSeconds - deltaSeconds);
  let shiftSecondsRemaining = Math.max(0, previous.shiftSecondsRemaining - deltaSeconds);
  let shiftSynchronizationHoldSeconds = Math.max(
    0,
    previous.shiftSynchronizationHoldSeconds ?? 0,
  );
  let shiftTargetGear = previous.shiftTargetGear;
  let shiftSourceGear = previous.shiftSourceGear
    ?? (previous.shiftTargetGear !== null ? previous.forwardGear : null);
  let shifted = false;
  if (previous.shiftSecondsRemaining > 0 && shiftTargetGear !== null) {
    const currentShiftProgress = clamp01(
      1 - shiftSecondsRemaining / transmission.torqueCutDuration,
    );
    // Keep the old ratio while the clutch releases. Select the new gear only
    // near the fully released midpoint, before re-engagement begins.
    if (currentShiftProgress >= 0.5 && forwardGear !== shiftTargetGear) {
      forwardGear = shiftTargetGear;
      shifted = true;
    }
    if (shiftSecondsRemaining <= 0) {
      if (forwardGear !== shiftTargetGear) {
        forwardGear = shiftTargetGear;
        shifted = true;
      }
    }
  }
  let rapidRpmRecoverySeconds = Math.max(
    0,
    previous.rapidRpmRecoverySeconds - deltaSeconds,
  );
  if (serviceBraking) {
    rapidRpmRecoverySeconds = Math.max(
      rapidRpmRecoverySeconds,
      abruptStop ? 0.16 : 0.1,
    );
  }
  if (braking) {
    // Holding the service brake also establishes a post-brake settling window,
    // preventing a delayed chain of downshifts as soon as the pedal is released.
    shiftCooldownSeconds = Math.max(
      shiftCooldownSeconds,
      transmission.brakingShiftInterval,
    );
  }

  if (direction < 0) {
    shiftCandidateGear = null;
    shiftCandidateSeconds = 0;
    shiftSecondsRemaining = 0;
    shiftSynchronizationHoldSeconds = 0;
    shiftTargetGear = null;
    shiftSourceGear = null;
  } else {
    if (direction === 0 && speed < 0.01 && shiftTargetGear === null) {
      forwardGear = 1;
      shiftCandidateGear = null;
      shiftCandidateSeconds = 0;
    }
    const corneringDemand = clamp01(
      input.corneringDemand ?? Math.abs(steering),
    );
    const cornering = corneringDemand > transmission.corneringThreshold
      && speed > 0.14;
    const shiftReady = shiftCooldownSeconds <= 0;
    const currentGear = transmission.gears[forwardGear - 1];
    const upshiftThreshold = currentGear.upshiftSpeed === null
      ? Number.POSITIVE_INFINITY
      : currentGear.upshiftSpeed
        + (load - 0.35) * transmission.throttleShiftBias;
    const downshiftThreshold = forwardGear > 1
      ? currentGear.downshiftSpeed + load * 0.035
      : 0;
    const rpmRatioBeforeShift = clamp01(
      (previous.rpm - style.rpm.idle)
        / Math.max(1, style.rpm.maximum - style.rpm.idle),
    );
    const rpmUpshiftThreshold = 0.67 + load * 0.18;
    const rpmDownshiftThreshold = 0.14 + (1 - load) * 0.08;
    const rpmRequestsUpshift = rpmRatioBeforeShift >= rpmUpshiftThreshold
      && speed >= Math.max(0.08, currentGear.downshiftSpeed + 0.035);
    const rpmRequestsDownshift = rpmRatioBeforeShift <= rpmDownshiftThreshold
      && currentGear.upshiftSpeed !== null
      && speed < currentGear.upshiftSpeed * 0.9;
    const kickdownSafeSpeed = forwardGear > 1
      ? (transmission.gears[forwardGear - 2].upshiftSpeed ?? 1) * 1.06
      : 0;
    const kickdown = shiftReady
      && !braking
      && forwardGear > 1
      && load > transmission.kickdownLoad
      && load - previous.lastLoad > 0.18
      && speed < kickdownSafeSpeed;
    let requestedGear = forwardGear;
    if (speed < 0.01) {
      requestedGear = 1;
    } else if (kickdown) {
      requestedGear = forwardGear - 1;
    } else if (
      shiftReady
      && !braking
      && forwardGear < transmission.gears.length
      && (speed >= upshiftThreshold || rpmRequestsUpshift)
    ) {
      requestedGear = forwardGear + 1;
    } else if (
      shiftReady
      && !braking
      && forwardGear > 1
      && (speed < downshiftThreshold || rpmRequestsDownshift)
      && (!cornering || speed < downshiftThreshold * 0.72)
    ) {
      requestedGear = forwardGear - 1;
    }

    if (shiftTargetGear !== null) {
      shiftCandidateGear = null;
      shiftCandidateSeconds = 0;
    } else if (requestedGear === forwardGear || braking) {
      shiftCandidateGear = null;
      shiftCandidateSeconds = 0;
    } else if (shiftCandidateGear !== requestedGear) {
      shiftCandidateGear = requestedGear;
      shiftCandidateSeconds = 0;
    } else {
      shiftCandidateSeconds += deltaSeconds;
      const dwell = kickdown ? transmission.kickdownDwell : transmission.shiftDwell;
      if (shiftCandidateSeconds >= dwell) {
        shiftSourceGear = forwardGear;
        shiftTargetGear = requestedGear;
        shiftCandidateGear = null;
        shiftCandidateSeconds = 0;
        shiftCooldownSeconds = braking
          ? transmission.brakingShiftInterval
          : transmission.minimumShiftInterval;
        shiftSecondsRemaining = transmission.torqueCutDuration;
        shiftSynchronizationHoldSeconds = 0;
      }
    }
  }

  const shiftProgress = shiftTargetGear !== null
    ? clamp01(1 - shiftSecondsRemaining / transmission.torqueCutDuration)
    : 0;
  const currentForwardRatio = transmission.gears[
    Math.max(0, forwardGear - 1)
  ].ratio;
  const sourceForwardRatio = transmission.gears[
    Math.max(0, (shiftSourceGear ?? forwardGear) - 1)
  ].ratio;
  const targetForwardRatio = transmission.gears[
    Math.max(0, (shiftTargetGear ?? forwardGear) - 1)
  ].ratio;
  const effectiveForwardRatio = transmission.coupling.kind === "torque-converter"
      && shiftTargetGear !== null
      && shiftSourceGear !== null
    ? sourceForwardRatio + (targetForwardRatio - sourceForwardRatio)
      * smoothstep(0.18, 0.82, shiftProgress)
    : currentForwardRatio;

  const wheelCoupledRpm = getCarEngineTargetRpm(
    style,
    drivenWheelSpeed,
    direction,
    forwardGear,
    0,
    effectiveForwardRatio,
  );
  const turbineRoadSpeedMps = Math.abs(
    getCarEngineRoadSpeedKph(style, drivenWheelSpeed),
  ) / 3.6;
  const turbineWheelRpm = turbineRoadSpeedMps
    / (2 * Math.PI * style.physics.wheelRadiusM) * 60;
  const turbineRatio = direction < 0
    ? transmission.reverseRatio
    : effectiveForwardRatio;
  const targetTurbineRpm = direction === 0
    ? 0
    : turbineWheelRpm * turbineRatio * style.physics.finalDriveRatio;
  const previousTurbineRpm = Number.isFinite(previous.converterTurbineRpm)
    ? previous.converterTurbineRpm ?? targetTurbineRpm
    : targetTurbineRpm;
  const converterSpeedRatio = clamp01(
    previousTurbineRpm / Math.max(style.rpm.idle * 0.55, previous.rpm),
  );
  const launchCoupling = smoothstep(0.015, 0.14, speed);
  const couplingActive = direction !== 0 || pedalDemand > 0.01;
  let targetClutch = 0;
  let targetLockup = 0;
  let lockupEngaged = previous.lockupEngaged === true;
  if (couplingActive && transmission.coupling.kind === "manual") {
    targetClutch = transmission.coupling.launchCoupling
      + launchCoupling * (1 - transmission.coupling.launchCoupling);
  } else if (
    couplingActive
    && transmission.coupling.kind === "torque-converter"
  ) {
    const coupling = transmission.coupling;
    const fluidProgress = smoothstep(
      coupling.torqueRatioStartSpeedRatio,
      coupling.torqueRatioEndSpeedRatio,
      converterSpeedRatio,
    );
    targetClutch = coupling.stallCoupling
      + (coupling.fluidCoupling - coupling.stallCoupling) * fluidProgress;
    const lockupCanEngage = speed >= coupling.lockupEndSpeed
      && load <= coupling.lockupReleaseLoad * 0.78;
    const lockupCanRemainEngaged = speed >= coupling.lockupStartSpeed * 0.78
      && load <= coupling.lockupReleaseLoad;
    lockupEngaged = lockupEngaged
      ? lockupCanRemainEngaged
      : lockupCanEngage;
    const lockupSpeed = smoothstep(
      coupling.lockupStartSpeed,
      coupling.lockupEndSpeed,
      speed,
    );
    const lockupLoad = 1 - smoothstep(
      coupling.lockupReleaseLoad,
      1,
      load,
    );
    targetLockup = lockupEngaged ? lockupSpeed * lockupLoad : 0;
  }
  if (serviceBraking) {
    if (speed < 0.085) {
      targetClutch *= smoothstep(0.012, 0.085, speed);
    }
    targetLockup = 0;
    lockupEngaged = false;
  } else if (pedalDemand < 0.02 && speed < 0.035) {
    targetClutch *= smoothstep(0.008, 0.035, speed);
    targetLockup = 0;
    lockupEngaged = false;
  }
  if (transmission.coupling.kind !== "torque-converter") {
    lockupEngaged = false;
  }
  targetClutch *= directionCoupling;
  targetLockup *= directionCoupling;
  const shiftSynchronizationErrorRpm = Math.abs(
    previousTurbineRpm - targetTurbineRpm,
  );
  if (
    shiftTargetGear !== null
    && shiftSecondsRemaining <= 0
    && transmission.coupling.kind === "manual"
  ) {
    const synchronizationThresholdRpm = style.rpm.idle * 0.18;
    const maximumSynchronizationHoldSeconds = Math.max(
      0.12,
      transmission.torqueCutDuration * 0.75,
    );
    if (
      shiftSynchronizationErrorRpm > synchronizationThresholdRpm
      && shiftSynchronizationHoldSeconds < maximumSynchronizationHoldSeconds
    ) {
      shiftSynchronizationHoldSeconds += deltaSeconds;
      shiftSecondsRemaining = 0.0001;
    } else {
      shiftTargetGear = null;
      shiftSourceGear = null;
      shiftSynchronizationHoldSeconds = 0;
    }
  }
  if (
    shiftTargetGear !== null
    && shiftSecondsRemaining <= 0
    && transmission.coupling.kind === "torque-converter"
  ) {
    shiftTargetGear = null;
    shiftSourceGear = null;
    shiftSynchronizationHoldSeconds = 0;
  }
  const shiftSynchronization = 1 - smoothstep(
    style.rpm.idle * 0.18,
    style.rpm.idle * 1.1,
    shiftSynchronizationErrorRpm,
  );
  if (shiftSecondsRemaining > 0) {
    const engagedCoupling = targetClutch;
    const releasedCoupling = transmission.coupling.kind === "torque-converter"
      ? transmission.coupling.shiftCoupling
      : transmission.coupling.shiftReleaseCoupling;
    if (shiftProgress < 0.22) {
      targetClutch = engagedCoupling
        + (releasedCoupling - engagedCoupling)
          * smoothstep(0, 0.22, shiftProgress);
    } else if (shiftProgress < 0.68) {
      targetClutch = releasedCoupling;
    } else {
      const recoveryProgress = smoothstep(0.68, 1, shiftProgress);
      const couplingRecovery = transmission.coupling.kind
        === "torque-converter"
        ? recoveryProgress
        : recoveryProgress * (0.42 + shiftSynchronization * 0.58);
      targetClutch = releasedCoupling
        + (engagedCoupling - releasedCoupling) * couplingRecovery;
    }
    targetLockup = 0;
    lockupEngaged = false;
  }
  const directTipIn = pedalDemand > 0.02 && shiftSecondsRemaining <= 0;
  const clutchResponse = transmission.coupling.kind === "torque-converter"
    ? targetClutch < previous.clutch
      ? 0.028
      : directTipIn ? 0.022 : 0.06
    : targetClutch < previous.clutch
      ? 0.014
      : directTipIn ? 0.018 : 0.04;
  const clutch = clamp01(previous.clutch + (targetClutch - previous.clutch)
    * (1 - Math.exp(-deltaSeconds / clutchResponse)));
  const previousLockup = Number.isFinite(previous.lockup)
    ? previous.lockup ?? 0
    : 0;
  const lockupResponse = targetLockup < previousLockup ? 0.028 : 0.085;
  const lockup = clamp01(
    previousLockup + (targetLockup - previousLockup)
      * (1 - Math.exp(-deltaSeconds / lockupResponse)),
  );
  const shiftTorquePhase = smoothstep(0, 0.22, shiftProgress);
  const shiftRecoveryPhase = smoothstep(0.68, 1, shiftProgress);
  const shiftInterruption = shiftSecondsRemaining > 0
    ? shiftTorquePhase * (1 - shiftRecoveryPhase)
    : 0;
  // Keep the documented engine and recordings source-coherent while giving
  // each vehicle a distinct accelerator linkage inside that same envelope.
  const baseMappedLoad = Math.pow(
    load,
    style.controls.pedals.torqueDemandExponent,
  );
  const tipInProgress = smoothstep(0, 0.24, load);
  // A modest tip-in assist takes up driveline slack promptly, then fades before
  // mid-pedal so it cannot add torque or distort the full-load curve.
  const mappedLoad = clamp01(
    baseMappedLoad * (0.82 + tipInProgress * 0.18)
      + tipInProgress * (1 - tipInProgress) * 0.07,
  );
  const combustionLoad = mappedLoad * (
    1 - shiftInterruption * (1 - transmission.torqueCutLevel)
  );
  const freeRpm = style.rpm.idle
    + combustionLoad
      * (style.rpm.launchBoost + (style.rpm.maximum - style.rpm.idle) * 0.1);
  const unlimitedTargetRpm = Math.max(
    style.rpm.idle,
    Math.min(
      style.rpm.maximum,
      freeRpm * (1 - clutch)
        + wheelCoupledRpm * clutch
        + combustionLoad * style.rpm.loadBoost,
    ),
  );
  const limiterActive = previous.limiterActive
    ? previous.rpm > style.combustion.limiterResumeRpm && combustionLoad > 0.12
    : previous.rpm >= style.combustion.limiterStartRpm && combustionLoad > 0.45;
  const limiterPhase = limiterActive
    ? (previous.limiterPhase
        + deltaSeconds * style.combustion.limiterCutRateHz) % 1
    : 0;
  const limiterCut = limiterActive && limiterPhase < 0.56 ? 1 : 0;
  const targetRpm = limiterCut > 0
    ? Math.min(unlimitedTargetRpm, style.combustion.limiterResumeRpm)
    : unlimitedTargetRpm;
  const rapidRpmRecovery = rapidRpmRecoverySeconds > 0
    && previous.rpm > style.rpm.idle + 25;
  const effectiveClutch = rapidRpmRecovery
    ? Math.min(
        clutch,
        transmission.coupling.kind === "manual" ? 0.24 : 0.36,
      )
    : clutch;
  const effectiveLockup = rapidRpmRecovery ? 0 : lockup;
  const engagedRatio = direction < 0
    ? transmission.reverseRatio
    : effectiveForwardRatio;
  const contactForces = input.drivenContactForcesNewtons;
  const axleAccelerations = input.drivenAxleAccelerationsMps2;
  const reactionCoupling = smoothstep(0.7, 1, directionCoupling);
  const mechanicalReduction = Math.max(
    0.1,
    engagedRatio * style.physics.finalDriveRatio,
  );
  const totalReduction = mechanicalReduction
    * style.physics.drivetrainEfficiency;
  const drivenContactForceNewtons = !contactForces || braking
    ? 0
    : ((style.physics.driveBiasFront > 0.001 ? contactForces.front : 0)
      + (style.physics.driveBiasFront < 0.999 ? contactForces.rear : 0))
      * reactionCoupling;
  const drivenWheelRotationalTorqueNm = !axleAccelerations
      || braking
      || direction === 0
    ? 0
    : (
        (style.physics.driveBiasFront > 0.001 ? axleAccelerations.front : 0)
          + (style.physics.driveBiasFront < 0.999 ? axleAccelerations.rear : 0)
      )
      * 2
      * style.physics.wheelInertiaKgM2
      / Math.max(0.05, style.physics.wheelRadiusM)
      * direction
      * reactionCoupling;
  const drivenRotationalReactionTorqueNm = drivenWheelRotationalTorqueNm
    / totalReduction;
  // Road contact reaches the crank through compliant tires, shafts, clutch,
  // and mounts, so retain a short response here. Wheel rotational inertia is
  // already the same-step torque needed to accelerate the connected wheels;
  // filtering that term delayed a real load and let the crank briefly create
  // energy before the reaction arrived.
  const obstructionReactionForceNewtons = !braking && pedalDemand > 0.01
    ? Math.max(0, input.longitudinalContactReactionForceNewtons ?? 0)
      * reactionCoupling
    : 0;
  const effectiveContactReactionForceNewtons = Math.sign(
    drivenContactForceNewtons || direction,
  ) * Math.max(
    Math.abs(drivenContactForceNewtons),
    obstructionReactionForceNewtons,
  );
  const unclampedContactReactionTorqueNm = direction === 0
    ? 0
    : effectiveContactReactionForceNewtons * direction
      * style.physics.wheelRadiusM / totalReduction;
  const targetContactReactionTorqueNm = Math.max(
    -style.calibration.maximumTorqueNm * 1.5,
    Math.min(
      style.calibration.maximumTorqueNm * 1.5,
      unclampedContactReactionTorqueNm,
    ),
  );
  const previousContactReactionTorqueNm = Number.isFinite(previous.reactionTorqueNm)
    ? previous.reactionTorqueNm
    : 0;
  const reversingContactReaction = targetContactReactionTorqueNm !== 0
    && previousContactReactionTorqueNm !== 0
    && Math.sign(targetContactReactionTorqueNm)
      !== Math.sign(previousContactReactionTorqueNm);
  const reactionResponseSeconds = reversingContactReaction
    ? style.physics.contactReactionReversalSeconds
    : Math.abs(targetContactReactionTorqueNm)
        > Math.abs(previousContactReactionTorqueNm)
      ? style.physics.contactReactionRiseSeconds
      : style.physics.contactReactionReleaseSeconds;
  const drivenContactReactionTorqueNm = previousContactReactionTorqueNm
    + (targetContactReactionTorqueNm - previousContactReactionTorqueNm)
      * (1 - Math.exp(-deltaSeconds / reactionResponseSeconds));
  const drivenReactionTorqueNm = Math.max(
    -style.calibration.maximumTorqueNm * 1.5,
    Math.min(
      style.calibration.maximumTorqueNm * 1.5,
      drivenContactReactionTorqueNm + drivenRotationalReactionTorqueNm,
    ),
  );
  const overrunTarget = pedalDemand < 0.04
    && speed > 0.025
    ? smoothstep(0.025, 0.18, speed)
      * clutch
      * (1 - smoothstep(0.08, 0.35, load))
    : 0;
  const overrun = previous.overrun + (overrunTarget - previous.overrun)
    * (1 - Math.exp(-deltaSeconds / (
      overrunTarget > previous.overrun ? 0.055 : 0.08
    )));
  // The values above are reaction telemetry only. The joint coupling solve below
  // is the sole mechanical torque authority for crank, turbine, and wheels.
  const mechanicalTorqueCoupling = transmission.coupling.kind === "torque-converter"
    ? Math.max(
        effectiveLockup,
        clamp01(
          clutch + (1 - clutch)
            * combustionLoad
            * (1 - smoothstep(
              transmission.coupling.torqueRatioStartSpeedRatio,
              transmission.coupling.torqueRatioEndSpeedRatio,
              converterSpeedRatio,
            ))
            * transmission.coupling.stallTorqueTransfer,
        ),
      )
    : clutch;
  const torqueCoupling = mechanicalTorqueCoupling * directionCoupling;
  const torqueFactor = braking
    ? 0
    : torqueCoupling * combustionLoad * (1 - limiterCut * 0.88);
  const storedShaftTwistRadians = Number.isFinite(
    previous.shaftTwistRadians,
  ) ? previous.shaftTwistRadians ?? 0 : 0;
  // State written before world-signed twist was introduced was relative to the
  // selected gear direction. Convert it once during hydration/upgrade.
  const previousShaftTwistRadians = previous.shaftDirection === undefined
    ? storedShaftTwistRadians * (previous.lastDirection || direction || 1)
    : storedShaftTwistRadians;
  const previousMechanicalReduction = Number.isFinite(
    previous.shaftMechanicalReduction,
  )
    ? Math.max(0.1, previous.shaftMechanicalReduction ?? mechanicalReduction)
    : getCarDrivetrainMechanicalReduction(style, previous);
  let synchronizedShaftTwistRadians = previousShaftTwistRadians;
  let synchronizerLossJ = 0;
  let shiftOverlapLossJ = 0;
  if (Math.abs(previousMechanicalReduction - mechanicalReduction) > 0.0001) {
    const previousMechanics = getCarPowertrainMechanics(
      style,
      previousMechanicalReduction,
    );
    const nextMechanics = getCarPowertrainMechanics(style, mechanicalReduction);
    const backlashRadians = Math.max(0, style.physics.drivelineBacklashRadians);
    const previousEffectiveTwistRadians = Math.sign(previousShaftTwistRadians)
      * Math.max(0, Math.abs(previousShaftTwistRadians) - backlashRadians);
    const previousPotentialJ = 0.5
      * previousMechanics.shaftStiffnessNmPerRadian
      * previousEffectiveTwistRadians * previousEffectiveTwistRadians;
    const torquePreservingTwistRadians = previousEffectiveTwistRadians
      * previousMechanics.shaftStiffnessNmPerRadian
      / Math.max(1, nextMechanics.shaftStiffnessNmPerRadian);
    const energyPreservingTwistRadians = previousEffectiveTwistRadians
      * Math.sqrt(
        previousMechanics.shaftStiffnessNmPerRadian
          / Math.max(1, nextMechanics.shaftStiffnessNmPerRadian),
      );
    const synchronizedEffectiveTwistRadians = Math.abs(
      torquePreservingTwistRadians,
    ) <= Math.abs(energyPreservingTwistRadians)
      ? torquePreservingTwistRadians
      : energyPreservingTwistRadians;
    synchronizedShaftTwistRadians = synchronizedEffectiveTwistRadians === 0
      ? 0
      : synchronizedEffectiveTwistRadians
        + Math.sign(synchronizedEffectiveTwistRadians) * backlashRadians;
    const synchronizedPotentialJ = 0.5
      * nextMechanics.shaftStiffnessNmPerRadian
      * synchronizedEffectiveTwistRadians * synchronizedEffectiveTwistRadians;
    const ratioTransferLossJ = Math.max(
      0,
      previousPotentialJ - synchronizedPotentialJ,
    );
    if (transmission.coupling.kind === "manual") {
      synchronizerLossJ = ratioTransferLossJ;
    } else {
      shiftOverlapLossJ = ratioTransferLossJ;
    }
  }
  if (directionChanged && Math.abs(synchronizedShaftTwistRadians) > 0) {
    const handoffMechanics = getCarPowertrainMechanics(
      style,
      mechanicalReduction,
    );
    const backlashRadians = Math.max(
      0,
      style.physics.drivelineBacklashRadians,
    );
    const effectiveHandoffTwistRadians = Math.sign(
      synchronizedShaftTwistRadians,
    ) * Math.max(
      0,
      Math.abs(synchronizedShaftTwistRadians) - backlashRadians,
    );
    shiftOverlapLossJ += 0.5
      * handoffMechanics.shaftStiffnessNmPerRadian
      * effectiveHandoffTwistRadians * effectiveHandoffTwistRadians;
    synchronizedShaftTwistRadians = 0;
  }
  const synchronizerMechanics = getCarPowertrainMechanics(
    style,
    mechanicalReduction,
  );
  const synchronizerErrorRadiansPerSecond = Math.abs(
    targetTurbineRpm - previousTurbineRpm,
  ) * Math.PI * 2 / 60;
  const synchronizerTorqueCapacityNm = shiftTargetGear !== null
    && transmission.coupling.kind === "manual"
    ? Math.min(
        style.calibration.maximumTorqueNm * 0.55,
        synchronizerMechanics.inputShaftInertiaKgM2
          * synchronizerErrorRadiansPerSecond
          / Math.max(0.06, transmission.torqueCutDuration * 0.6),
      )
    : 0;
  // Keep overrun mechanically continuous through the visible rolling range,
  // then decouple only inside the final crawl envelope. Leaving the shaft
  // engaged at zero allowed idle and stored twist to move an untouched car.
  const gearMechanicallyEngaged = direction !== 0
    && (propulsionRequested || speed >= 0.006);
  const powertrain = integratePowertrainTorque(
    previous.rpm,
    style,
    previousTurbineRpm,
    targetTurbineRpm,
    synchronizedShaftTwistRadians,
    direction,
    mechanicalReduction,
    gearMechanicallyEngaged,
    effectiveClutch,
    effectiveLockup,
    combustionLoad,
    limiterCut,
    synchronizerTorqueCapacityNm,
    style.physics.maximumEngineBrakeWheelTorqueNm
      / Math.max(0.1, engagedRatio * style.physics.finalDriveRatio),
    deltaSeconds,
  );
  synchronizerLossJ += powertrain.synchronizerFrictionLossJ;
  const rpm = powertrain.rpm;
  const rpmVelocity = powertrain.rpmVelocity;
  const converterTurbineRpm = powertrain.turbineRpm;
  const converterTurbineRpmVelocity = powertrain.turbineRpmVelocity;
  const clutchSlipRpm = transmission.coupling.kind === "torque-converter"
    ? Math.abs(rpm - converterTurbineRpm)
    : Math.abs(rpm - converterTurbineRpm) * clutch;
  const transmittedCrankTorqueNm = powertrain.transmittedTorqueNm;
  const gearboxInputTorqueNm = transmittedCrankTorqueNm;
  // With no accelerator demand the connected powertrain may absorb road energy,
  // but it may not use the idle governor or stored shaft motion to propel the
  // chassis. This keeps overrun physical without hidden creep.
  const deliveredGearboxInputTorqueNm = !braking
    && propulsionRequested
    && pedalDemand > 0.025
    ? Math.max(0, gearboxInputTorqueNm)
    : Math.min(0, gearboxInputTorqueNm);
  const reverseDriveAuthority = direction < 0 && deliveredGearboxInputTorqueNm > 0
    ? style.physics.reverseTorqueAuthority
    : 1;
  const preliminaryWheelForceNewtons = direction * deliveredGearboxInputTorqueNm
    * mechanicalReduction / Math.max(0.1, style.physics.wheelRadiusM);
  const shaftWorldTorqueSign = Math.sign(powertrain.shaftTwistRadians);
  const storedTwistDischarge = deliveredGearboxInputTorqueNm < 0
    && shaftWorldTorqueSign !== 0
    && shaftWorldTorqueSign !== direction;
  const propulsiveWheelPower = preliminaryWheelForceNewtons * signedSpeed > 0;
  const appliesDriveEfficiency = deliveredGearboxInputTorqueNm >= 0
    || propulsiveWheelPower
    || storedTwistDischarge;
  const transmittedWheelTorqueNm = deliveredGearboxInputTorqueNm
    * engagedRatio
    * style.physics.finalDriveRatio
    * (appliesDriveEfficiency ? style.physics.drivetrainEfficiency : 1)
    * reverseDriveAuthority;
  const requestedWheelForceNewtons = direction === 0
    ? 0
    : direction * transmittedWheelTorqueNm
      / Math.max(0.1, style.physics.wheelRadiusM);
  // With no key held the driveline is passive: it may absorb existing road
  // motion, but neither idle control nor stored shaft twist may launch the car.
  const resolvedWheelForceNewtons = propulsionRequested
    ? requestedWheelForceNewtons
    : Math.abs(signedSpeed) > 0.001
        && requestedWheelForceNewtons * signedSpeed < 0
      ? requestedWheelForceNewtons
      : 0;
  const wheelForceNewtons = resolvedWheelForceNewtons === 0
    ? 0
    : resolvedWheelForceNewtons;
  const state: CarDrivetrainState = {
    clutch,
    lockup,
    lockupEngaged,
    shaftTorqueNm: powertrain.shaftTorqueNm,
    shaftDirection: direction,
    shaftTwistRadians: powertrain.shaftTwistRadians,
    shaftMechanicalReduction: mechanicalReduction,
    lastShaftDampingLossJ: powertrain.shaftDampingLossJ,
    lastSynchronizerLossJ: synchronizerLossJ,
    lastShiftOverlapLossJ: shiftOverlapLossJ,
    converterTargetRpm: targetTurbineRpm,
    coupledTargetRpm: wheelCoupledRpm,
    converterTurbineRpm,
    converterTurbineRpmVelocity,
    directionCoupling,
    engineLoad: load,
    forwardGear,
    lastLoad: load,
    lastDirection: direction,
    lastSpeedRatio: signedSpeed,
    limiterActive,
    limiterPhase,
    overrun,
    rapidRpmRecoverySeconds,
    // Store only compliant road load. Immediate wheel inertia is derived
    // afresh from the current wheel acceleration on every dynamics solve.
    reactionTorqueNm: drivenContactReactionTorqueNm,
    lastWheelForceNewtons: wheelForceNewtons,
    rpm,
    rpmVelocity,
    shiftCandidateGear,
    shiftCandidateSeconds,
    shiftCooldownSeconds,
    shiftSecondsRemaining,
    shiftSynchronizationHoldSeconds,
    shiftSourceGear,
    shiftTargetGear,
    transmittedCrankTorqueNm,
  };
  return {
    state,
    output: {
      abruptStop,
      braking,
      clutch,
      clutchSlipRpm,
      clutchReactionTorqueNm: powertrain.clutchReactionTorqueNm,
      combustionTorqueNm: powertrain.combustionTorqueNm,
      crankNetTorqueNm: powertrain.crankNetTorqueNm,
      decelerationRate,
      drivenContactReactionTorqueNm,
      drivenReactionTorqueNm,
      drivenRotationalReactionTorqueNm,
      direction,
      gear: direction < 0
        ? -1
        : direction === 0 && speed < 0.01
          ? 0
          : forwardGear,
      load: combustionLoad,
      limiterCut,
      idleGovernorTorqueNm: powertrain.idleGovernorTorqueNm,
      pumpingTorqueNm: powertrain.pumpingTorqueNm,
      hardDeceleration,
      rapidRpmRecovery,
      roadSpeedKph: getCarEngineRoadSpeedKph(style, signedSpeed),
      rpm,
      rpmVelocity,
      serviceBraking,
      shaftDampingLossJ: powertrain.shaftDampingLossJ,
      shaftTorqueNm: powertrain.shaftTorqueNm,
      shaftTwistRadians: powertrain.shaftTwistRadians,
      shiftProgress,
      shiftState: shiftSecondsRemaining > 0
        ? "shifting"
        : shiftCandidateGear !== null
          ? "pending"
          : "steady",
      shifted,
      speedRatio: signedSpeed,
      steering,
      synchronizationErrorRpm: Math.abs(
        converterTurbineRpm - targetTurbineRpm,
      ),
      synchronizerLossJ,
      shiftOverlapLossJ,
      targetRpm,
      throttle,
      torqueFactor,
      transmittedCrankTorqueNm,
      lockup,
      wheelForceNewtons,
      overrun,
    },
  };
}
