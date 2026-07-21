import { CAR_PHYSICAL_GEOMETRY } from "./carGeometry";

export type CarEngineStyleId = "city" | "rally" | "taxi";

export type CarEngineGear = {
  downshiftSpeed: number;
  meshTeeth: number;
  ratio: number;
  upshiftSpeed: number | null;
};

export type CarEngineCoupling =
  | {
      kind: "manual";
      launchCoupling: number;
      shiftReleaseCoupling: number;
    }
  | {
      kind: "torque-converter";
      fluidCapacityBase: number;
      fluidCapacityGain: number;
      fluidCoupling: number;
      lockupEndSpeed: number;
      lockupReleaseLoad: number;
      lockupStartSpeed: number;
      shiftCoupling: number;
      stallCoupling: number;
      stallTorqueRatio: number;
      stallTorqueTransfer: number;
      slipTorqueBaseNmPerRpm: number;
      slipTorqueGainNmPerRpm: number;
      torqueRatioEndSpeedRatio: number;
      torqueRatioStartSpeedRatio: number;
    };

export type CarEngineSampleBand = {
  gain: number;
  referenceRpm: number;
  role?: "idle" | "drive";
  url: string;
};

export type CarEngineSampleProgram = {
  gain: number;
  referenceLoad: number;
  rpmBands: readonly CarEngineSampleBand[];
};

export type CarEngineLifecycleSamples = {
  shutdown: {
    crossfadeSeconds: number;
    url: string;
  };
  startup: {
    bankCrossfadeEndSeconds: number;
    bankCrossfadeStartSeconds: number;
    torqueStartSeconds: number;
    url: string;
  };
};

export type CarEngineTransient = "ignition" | "shift" | "shutdown" | "throttle";

export type CarEngineMixTargets = {
  driveLevel: number;
  dry: number;
  high: number;
  intake: number;
  low: number;
  mid: number;
  overrun: number;
  loadBlend: number;
};

export type CarTorquePoint = {
  rpmRatio: number;
  multiplier: number;
};

export type CarDifferentialCalibration = {
  coastPreloadNewtons: number;
  coastTorqueBiasRatio: number;
  couplingGainNewtonsPerMps: number;
  preloadNewtons: number;
  responseRate: number;
  torqueBiasRatio: number;
};

export type CarEngineCalibration = {
  evidenceUrl: string;
  maximumPowerKw: number;
  maximumPowerRpm: number;
  maximumTorqueNm: number;
  maximumTorqueRpm: number;
  scope: "engine-family-reference" | "recorded-vehicle";
};

export type CarEngineStyle = {
  calibration: CarEngineCalibration;
  id: CarEngineStyleId;
  label: string;
  combustion: {
    crankInertia: number;
    cylinderCount: number;
    cylinderGains: readonly number[];
    cylinderTimingMs: readonly number[];
    eventsPerRevolution: number;
    firingOrder: readonly number[];
    limiterCutRateHz: number;
    limiterResumeRpm: number;
    limiterStartRpm: number;
    overrunCutStrength: number;
  };
  samples: {
    lifecycle: CarEngineLifecycleSamples;
    /** Stable identity shared by every recording captured from this engine/perspective. */
    sourceId: string;
    rpmBands: readonly CarEngineSampleBand[];
    /** Optional steady-state load rows, ordered by normalized reference load. */
    loadPrograms?: readonly CarEngineSampleProgram[];
    /** Optional genuine recordings can replace synthesized loop excerpts independently. */
    transients?: Partial<Record<CarEngineTransient, string>>;
  };
  controls: {
    direction: {
      couplingBlendSeconds: number;
      residualBrakePressure: number;
      restEntrySpeedMps: number;
      restReleaseForceNewtons: number;
      restSettleSeconds: number;
      stopSpeedMps: number;
    };
    driverAids: {
      absActivationRangeMps: number;
      absActivationSpeedMps: number;
      absApplyRate: number;
      absDecelerationThreshold: number;
      absMaximumRelease: number;
      absPressureApplyRate: number;
      absPressureReleaseRate: number;
      absReleaseRate: number;
      absSlipRange: number;
      absSlipThreshold: number;
      ebdApplyRate: number;
      ebdDeadband: number;
      ebdReleaseRate: number;
      engineDragApplyRate: number;
      engineDragMaximumReduction: number;
      engineDragReleaseRate: number;
      engineDragSlipRange: number;
      engineDragSlipThreshold: number;
      stabilityActivationRangeMps: number;
      stabilityActivationSpeedMps: number;
      stabilityBrakeStrength: number;
      stabilityEngineReduction: number;
      stabilitySlipRange: number;
      stabilitySlipThreshold: number;
      tractionActivationRangeMps: number;
      tractionActivationSpeedMps: number;
      tractionApplyRate: number;
      tractionMaximumReduction: number;
      tractionReleaseRate: number;
      tractionSlipRange: number;
      tractionSlipThreshold: number;
    };
    pedals: {
      brakeApplyRate: number;
      brakeContactPressure: number;
      brakeContactRate: number;
      brakeReleaseRate: number;
      brakingLoadReleaseSeconds: number;
      engineLoadReleaseSeconds: number;
      engineLoadRiseSeconds: number;
      reverseEngineLoadRiseSeconds: number;
      torqueDemandExponent: number;
      throttleReleaseRate: number;
      throttleReversalRate: number;
      throttleRiseRate: number;
    };
    steering: {
      commandCurveExponent: number;
      commandReleaseRate: number;
      commandReversalRate: number;
      commandRiseRate: number;
      counterFrequencyBoost: number;
      heldAligningMomentScale: number;
      heldDamping: number;
      limitRateScale: number;
      rateSpeedReduction: number;
      releasedDamping: number;
      speedReductionExponent: number;
    };
  };
  differentials: {
    center: CarDifferentialCalibration;
    front: CarDifferentialCalibration;
    rear: CarDifferentialCalibration;
  };
  physics: {
    antiDiveRatio: number;
    antiSquatRatio: number;
    dragAreaM2: number;
    brakeBiasFront: number;
    /** Total service-brake torque available across all four wheels. */
    maximumServiceBrakeTorqueNm: number;
    maximumEngineBrakeWheelTorqueNm: number;
    centerOfGravityHeightM: number;
    corneringStiffness: number;
    drivetrainEfficiency: number;
    drivelineBacklashRadians: number;
    drivelineDampingRatio: number;
    drivelineResponseFrequency: number;
    contactReactionReleaseSeconds: number;
    contactReactionReversalSeconds: number;
    contactReactionRiseSeconds: number;
    differentialCoastEnterPowerWatts: number;
    differentialCoastExitPowerWatts: number;
    differentialCoastMinimumSpeedMps: number;
    driveBiasFront: number;
    finalDriveRatio: number;
    frontWeightBias: number;
    frontRollStiffnessBias: number;
    highSpeedSteeringReduction: number;
    lateralGrip: number;
    longitudinalGripRatio: number;
    lowSpeedTireBlendMps: number;
    lowSpeedTireReferenceMps: number;
    longitudinalSlidingGripRatio: number;
    massKg: number;
    maximumSteeringAngle: number;
    physicalWheelbaseM: number;
    rearCorneringStiffnessScale: number;
    reverseTorqueAuthority: number;
    rollingResistanceCoefficient: number;
    suspensionPitchDamping: number;
    suspensionPitchFrequency: number;
    suspensionRollDamping: number;
    suspensionRollFrequency: number;
    steeringCounterRate: number;
    steeringInputRate: number;
    steeringAssistHighSpeed: number;
    steeringAssistLoadSensitivity: number;
    steeringAssistLowSpeed: number;
    steeringCasterFrequency: number;
    steeringRackFrequency: number;
    steeringParkingScrubTorqueNm: number;
    steeringRackFrictionTorqueNm: number;
    steeringKineticFrictionRatio: number;
    steeringReturnRate: number;
    steeringReturnSpeedGain: number;
    steeringSystemInertiaKgM2: number;
    steeringScrubRadiusM: number;
    steeringTrailM: number;
    trackWidthM: number;
    tireLoadSensitivity: number;
    tireAdhesionBreakawayPower: number;
    tireAdhesionRecoverySeconds: number;
    tireAdhesionReleaseSeconds: number;
    tireAdhesionTransitionPower: number;
    tireBreakawaySharpness: number;
    tireHighSpeedPredictionBlend: number;
    tireHighSpeedPredictionRangeMps: number;
    tireHighSpeedPredictionStartMps: number;
    tireLateralSlidingGripRatio: number;
    tirePeakSlip: number;
    tireSlipAngleTelemetryRadians: number;
    tireSlipReferenceSpeedMps: number;
    tireRelaxationLoadSensitivity: number;
    tireLateralDeflectionLimitRatio: number;
    tireLateralRelaxationLengthM: number;
    tireLateralTransportDecayPerSecond: number;
    tireLongitudinalDeflectionLimitRatio: number;
    tireLongitudinalRelaxationLengthM: number;
    tireLongitudinalTransportDecayPerSecond: number;
    tireRecoveryRate: number;
    tireResponseScale: number;
    tireShoulderDemand: number;
    tirePeakDemand: number;
    tireSlidingTransitionWidth: number;
    torqueCurve: readonly CarTorquePoint[];
    worldPixelsPerMeter: number;
    wheelRadiusM: number;
    wheelInertiaKgM2: number;
    maximumYawRate: number;
  };
  handlingTargets: {
    maximumBrakeStopSeconds: number;
    maximumSlalomSideslipRatio: number;
    minimumForwardLaunchRatio: number;
    minimumReverseLaunchRatio: number;
    minimumTurnHeadingRadians: number;
    reverseToForwardLaunchRatioMax: number;
    telemetry: {
      accelerationReleaseMaximumJerkMps3: readonly [number, number];
      brakingDistancePixels: readonly [number, number];
      coastRetentionRatio: readonly [number, number];
      directionEngagementSeconds: readonly [number, number];
      forwardTenPercentSeconds: readonly [number, number];
      forwardThirtyFivePercentSeconds: readonly [number, number];
      forwardSeventyPercentSeconds: readonly [number, number];
      maximumWheelLoadConservationErrorNewtons: readonly [number, number];
      reverseLaunchRatio: readonly [number, number];
      reverseFifteenPercentSeconds: readonly [number, number];
      steeringResponseSeconds: readonly [number, number];
      suspensionSettleSecondsAfterImpact: readonly [number, number];
      wallMaximumInwardSpeedMps: readonly [number, number];
      wallReverseReleaseSeconds: readonly [number, number];
    };
  };
  transmission: {
    coupling: CarEngineCoupling;
    gears: readonly CarEngineGear[];
    reverseMeshTeeth: number;
    reverseRatio: number;
    minimumShiftInterval: number;
    brakingShiftInterval: number;
    shiftDwell: number;
    kickdownDwell: number;
    throttleShiftBias: number;
    corneringThreshold: number;
    kickdownLoad: number;
    torqueCutDuration: number;
    torqueCutLevel: number;
  };
  rpm: {
    idle: number;
    maximum: number;
    launchBoost: number;
    loadBoost: number;
    riseResponse: number;
    fallResponse: number;
    shiftResponse: number;
  };
  road: {
    maximumForwardKph: number;
    maximumReverseKph: number;
    noiseLevel: number;
    reverseWhineLevel: number;
    tireScrubLevel: number;
  };
  sound: {
    lifecyclePlaybackRate: number;
    playbackBase: number;
    playbackSpan: number;
    body: number;
    intake: number;
    lowBandBase: number;
    midBandBase: number;
    highBandBase: number;
    levelBase: number;
    levelSpeed: number;
    levelThrottle: number;
    idleDetune: number;
    idleFadeSpeed: number;
    overrunBase: number;
    overrunSpeed: number;
    shiftIntakeLevel: number;
    bankCrossfade: number;
    normalization: number;
    transientLevel: number;
    filters: {
      bodyFrequency: number;
      highFrequency: number;
      highQ: number;
      intakeFrequency: number;
      intakeQ: number;
      lowFrequency: number;
      lowQ: number;
      midFrequency: number;
      midQ: number;
      outputFrequency: number;
      overrunFrequency: number;
      overrunQ: number;
      presenceFrequency: number;
      presenceGain: number;
      presenceQ: number;
    };
    compressor: {
      attack: number;
      knee: number;
      ratio: number;
      release: number;
      threshold: number;
    };
  };
};

const MATCHED_DIESEL_LIFECYCLE: CarEngineLifecycleSamples = {
  startup: {
    url: "/audio/engine-startup.wav",
    torqueStartSeconds: 0.58,
    bankCrossfadeStartSeconds: 1.12,
    bankCrossfadeEndSeconds: 1.5,
  },
  shutdown: {
    url: "/audio/engine-shutdown.wav",
    crossfadeSeconds: 0.03,
  },
};

// Every current car uses the same exterior Peugeot recording. Keep the
// acoustic engine itself identical and let the vehicle mass, gearing, road
// noise, and coupling model create the behavioral differences. Divergent RPM
// limits, filters, or playback rates would imply source material we do not
// actually have.
const MATCHED_DIESEL_COMBUSTION = {
  crankInertia: 1,
  cylinderCount: 4,
  cylinderGains: [1, 0.986, 1.012, 0.994],
  cylinderTimingMs: [0, 0.055, -0.04, 0.018],
  eventsPerRevolution: 2,
  firingOrder: [0, 2, 3, 1],
  limiterCutRateHz: 14,
  limiterResumeRpm: 4440,
  limiterStartRpm: 4600,
  overrunCutStrength: 0.46,
} satisfies CarEngineStyle["combustion"];

const MATCHED_DIESEL_RPM_BANDS = [
  { url: "/audio/engine-natural-idle.wav", referenceRpm: 850, gain: 1, role: "idle" },
  { url: "/audio/engine-city-mid.wav", referenceRpm: 2700, gain: 1.01934 },
  { url: "/audio/engine-city-high.wav", referenceRpm: 4500, gain: 1.04491 },
] as const satisfies readonly CarEngineSampleBand[];

const MATCHED_DIESEL_RPM = {
  idle: 850,
  maximum: 4700,
  launchBoost: 700,
  loadBoost: 100,
  riseResponse: 0.1,
  fallResponse: 0.18,
  shiftResponse: 0.11,
} satisfies CarEngineStyle["rpm"];

// The page world has one spatial scale per chassis. Road speed, wheel
// rotation, geometry, collision impulses, and force integration all use it.
const CITY_WORLD_PIXELS_PER_METER = 1_300 * 3.6 / 82;
const RALLY_WORLD_PIXELS_PER_METER = 1_400 * 3.6 / 92;
const TAXI_WORLD_PIXELS_PER_METER = 1_200 * 3.6 / 76;

const MATCHED_DIESEL_CALIBRATION = {
  evidenceUrl: "https://www.media.stellantis.com/uploads/uk/model-pricelist/peugeot5008pricespecapr23-6455a67a8aa20.pdf",
  maximumPowerKw: 96,
  maximumPowerRpm: 3750,
  maximumTorqueNm: 300,
  maximumTorqueRpm: 1750,
  // The manufacturer document covers the same BlueHDi 130 engine family, but
  // the field recording does not identify its exact transmission or VIN.
  scope: "engine-family-reference",
} as const satisfies CarEngineCalibration;

function matchedDieselRpmRatio(rpm: number) {
  return (rpm - MATCHED_DIESEL_RPM.idle)
    / (MATCHED_DIESEL_RPM.maximum - MATCHED_DIESEL_RPM.idle);
}

const CITY_DIESEL_TORQUE_CURVE = [
  { rpmRatio: matchedDieselRpmRatio(850), multiplier: 0.58 },
  { rpmRatio: matchedDieselRpmRatio(1200), multiplier: 0.76 },
  { rpmRatio: matchedDieselRpmRatio(1500), multiplier: 0.92 },
  { rpmRatio: matchedDieselRpmRatio(1750), multiplier: 1 },
  { rpmRatio: matchedDieselRpmRatio(2500), multiplier: 0.96 },
  { rpmRatio: matchedDieselRpmRatio(3000), multiplier: 0.91 },
  // 96 kW at 3,750 rpm implies roughly 244 Nm, or 81.5% of the documented
  // 300 Nm peak. This anchors the falling diesel curve to the power peak.
  { rpmRatio: matchedDieselRpmRatio(3750), multiplier: 0.815 },
  { rpmRatio: matchedDieselRpmRatio(4500), multiplier: 0.59 },
  { rpmRatio: matchedDieselRpmRatio(4700), multiplier: 0.5 },
] as const satisfies readonly CarTorquePoint[];

// The cars share a recorded and documented engine family, but installation,
// intake/exhaust tuning, and intended gearing produce distinct delivered
// torque shapes. Peak torque remains evidence-aligned at 1,750 rpm.
const RALLY_DIESEL_TORQUE_CURVE = [
  { rpmRatio: matchedDieselRpmRatio(850), multiplier: 0.5 },
  { rpmRatio: matchedDieselRpmRatio(1200), multiplier: 0.7 },
  { rpmRatio: matchedDieselRpmRatio(1500), multiplier: 0.9 },
  { rpmRatio: matchedDieselRpmRatio(1750), multiplier: 1 },
  { rpmRatio: matchedDieselRpmRatio(2500), multiplier: 0.99 },
  { rpmRatio: matchedDieselRpmRatio(3000), multiplier: 0.96 },
  { rpmRatio: matchedDieselRpmRatio(3750), multiplier: 0.86 },
  { rpmRatio: matchedDieselRpmRatio(4500), multiplier: 0.66 },
  { rpmRatio: matchedDieselRpmRatio(4700), multiplier: 0.54 },
] as const satisfies readonly CarTorquePoint[];

const TAXI_DIESEL_TORQUE_CURVE = [
  { rpmRatio: matchedDieselRpmRatio(850), multiplier: 0.66 },
  { rpmRatio: matchedDieselRpmRatio(1200), multiplier: 0.84 },
  { rpmRatio: matchedDieselRpmRatio(1500), multiplier: 0.96 },
  { rpmRatio: matchedDieselRpmRatio(1750), multiplier: 1 },
  { rpmRatio: matchedDieselRpmRatio(2500), multiplier: 0.92 },
  { rpmRatio: matchedDieselRpmRatio(3000), multiplier: 0.84 },
  { rpmRatio: matchedDieselRpmRatio(3750), multiplier: 0.7 },
  { rpmRatio: matchedDieselRpmRatio(4500), multiplier: 0.48 },
  { rpmRatio: matchedDieselRpmRatio(4700), multiplier: 0.38 },
] as const satisfies readonly CarTorquePoint[];

const MATCHED_DIESEL_SOUND = {
  lifecyclePlaybackRate: 1,
  playbackBase: 0.76,
  playbackSpan: 0.58,
  body: 2.2,
  intake: 1,
  lowBandBase: 0.72,
  midBandBase: 0.32,
  highBandBase: 0.025,
  levelBase: 0.45,
  levelSpeed: 0.1,
  levelThrottle: 0.15,
  idleDetune: 1.45,
  idleFadeSpeed: 0.08,
  overrunBase: 0.045,
  overrunSpeed: 0.065,
  shiftIntakeLevel: 0.55,
  bankCrossfade: 0.2,
  normalization: 0.88,
  transientLevel: 0.065,
  filters: {
    bodyFrequency: 300,
    highFrequency: 1380,
    highQ: 0.4,
    intakeFrequency: 540,
    intakeQ: 0.72,
    lowFrequency: 760,
    lowQ: 0.42,
    midFrequency: 1080,
    midQ: 0.52,
    outputFrequency: 9000,
    overrunFrequency: 920,
    overrunQ: 0.62,
    presenceFrequency: 1550,
    presenceGain: -1.1,
    presenceQ: 0.9,
  },
  compressor: {
    threshold: -14,
    knee: 6,
    ratio: 1.8,
    attack: 0.025,
    release: 0.22,
  },
} satisfies CarEngineStyle["sound"];

export function getCarEngineBandWeights(
  bands: readonly CarEngineSampleBand[],
  rpm: number,
) {
  const weights = bands.map(() => 0);
  if (bands.length === 0) return weights;
  if (bands.length >= 3) {
    const idleSpan = bands[1].referenceRpm - bands[0].referenceRpm;
    const upperSpan = bands[2].referenceRpm - bands[1].referenceRpm;
    const idleBlendStart = bands[0].referenceRpm + idleSpan * 0.08;
    const idleBlendEnd = bands[0].referenceRpm + idleSpan * 0.34;
    const upperBlendStart = bands[1].referenceRpm + upperSpan * 0.35;
    const upperBlendEnd = bands[1].referenceRpm + upperSpan * 0.72;
    if (rpm <= idleBlendStart) {
      weights[0] = 1;
    } else if (rpm < idleBlendEnd) {
      const blend = (rpm - idleBlendStart) / (idleBlendEnd - idleBlendStart);
      // These banks are phase-related resamples of one continuous capture.
      // Keep their summed gain at unity; an equal-power curve raises two
      // correlated sources by roughly 3 dB at the midpoint.
      weights[0] = 1 - blend;
      weights[1] = blend;
    } else if (rpm <= upperBlendStart) {
      weights[1] = 1;
    } else if (rpm < upperBlendEnd) {
      const blend = (rpm - upperBlendStart) / (upperBlendEnd - upperBlendStart);
      weights[1] = 1 - blend;
      weights[2] = blend;
    } else {
      weights[2] = 1;
    }
    return weights;
  }
  if (rpm <= bands[0].referenceRpm || bands.length === 1) {
    weights[0] = 1;
    return weights;
  }
  if (rpm >= bands[bands.length - 1].referenceRpm) {
    weights[weights.length - 1] = 1;
    return weights;
  }
  const blend = (rpm - bands[0].referenceRpm)
    / (bands[1].referenceRpm - bands[0].referenceRpm);
  weights[0] = 1 - blend;
  weights[1] = blend;
  return weights;
}

export function getCarEngineLoadWeights(
  referenceLoads: readonly number[],
  load: number,
) {
  const weights = referenceLoads.map(() => 0);
  if (referenceLoads.length === 0) return weights;
  const boundedLoad = Math.max(0, Math.min(1, load));
  if (boundedLoad <= referenceLoads[0] || referenceLoads.length === 1) {
    weights[0] = 1;
    return weights;
  }
  const lastIndex = referenceLoads.length - 1;
  if (boundedLoad >= referenceLoads[lastIndex]) {
    weights[lastIndex] = 1;
    return weights;
  }
  for (let index = 0; index < lastIndex; index += 1) {
    const lower = referenceLoads[index];
    const upper = referenceLoads[index + 1];
    if (boundedLoad < lower || boundedLoad > upper) continue;
    const blend = (boundedLoad - lower) / Math.max(0.0001, upper - lower);
    // Load rows are independent recordings, so preserve acoustic power while
    // moving between them. RPM bands inside each row remain phase-related and
    // use unity-linear interpolation separately.
    weights[index] = Math.cos((blend * Math.PI) / 2);
    weights[index + 1] = Math.sin((blend * Math.PI) / 2);
    break;
  }
  return weights;
}

function smoothstep(start: number, end: number, value: number) {
  const ratio = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return ratio * ratio * (3 - 2 * ratio);
}

export function getCarEngineMixTargets(
  style: CarEngineStyle,
  input: {
    load: number;
    overrun: number;
    rpm: number;
    shiftProgress: number;
    speed: number;
  },
): CarEngineMixTargets {
  const load = Math.max(0, Math.min(1, input.load));
  const speed = Math.max(0, Math.min(1, input.speed));
  const rpmRatio = Math.max(0, Math.min(
    1,
    (input.rpm - style.rpm.idle) / Math.max(1, style.rpm.maximum - style.rpm.idle),
  ));
  // Do not switch recordings from the raw pedal edge. The combustion and
  // intake spectrum follows manifold/engine load, which is smoothed by the
  // controller before it reaches this mapping.
  const loadShape = smoothstep(0.22, 0.82, load);
  const loadBlend = style.samples.loadPrograms?.length ? loadShape : 0;
  const overrun = Math.max(0, Math.min(1, input.overrun));
  const shiftProgress = Math.max(0, Math.min(1, input.shiftProgress));
  const shiftCut = Math.sin(shiftProgress * Math.PI);
  const shiftLevel = 1 - shiftCut * (1 - style.sound.shiftIntakeLevel);

  return {
    driveLevel: style.sound.levelBase
      + speed * style.sound.levelSpeed
      + loadShape * style.sound.levelThrottle,
    // Retain an unfiltered recorded core at every load. Parallel bands add
    // physical emphasis without sweeping a filter across the complete engine.
    dry: 0.32 + loadShape * 0.04,
    high: style.sound.highBandBase
      * (0.58 + rpmRatio * 0.2 + loadShape * 0.22),
    intake: (0.0001 + loadShape * 0.105 * style.sound.intake) * shiftLevel,
    low: style.sound.lowBandBase * (0.84 + loadShape * 0.16),
    mid: style.sound.midBandBase * (0.76 + rpmRatio * 0.08 + loadShape * 0.16),
    overrun: 0.0001 + overrun
      * (style.sound.overrunBase + speed * style.sound.overrunSpeed),
    loadBlend,
  };
}

export const CAR_ENGINE_STYLES: Record<CarEngineStyleId, CarEngineStyle> = {
  city: {
    calibration: MATCHED_DIESEL_CALIBRATION,
    id: "city",
    label: "Compact five-speed",
    combustion: { ...MATCHED_DIESEL_COMBUSTION, crankInertia: 0.94 },
    samples: {
      lifecycle: MATCHED_DIESEL_LIFECYCLE,
      sourceId: "peugeot-3008-bluehdi-2022-exterior",
      rpmBands: MATCHED_DIESEL_RPM_BANDS,
    },
    controls: {
      direction: {
        couplingBlendSeconds: 0.036,
        residualBrakePressure: 0.02,
        restEntrySpeedMps: 3 / CITY_WORLD_PIXELS_PER_METER,
        restReleaseForceNewtons: 95,
        restSettleSeconds: 0.035,
        stopSpeedMps: 14 / CITY_WORLD_PIXELS_PER_METER,
      },
      driverAids: {
        absActivationRangeMps: 1.2,
        absActivationSpeedMps: 0.6,
        absApplyRate: 30,
        absDecelerationThreshold: 7.5,
        absMaximumRelease: 0.68,
        absPressureApplyRate: 30,
        absPressureReleaseRate: 42,
        absReleaseRate: 18,
        absSlipRange: 0.38,
        absSlipThreshold: 0.18,
        ebdApplyRate: 24,
        ebdDeadband: 0.008,
        ebdReleaseRate: 34,
        engineDragApplyRate: 14,
        engineDragMaximumReduction: 0.38,
        engineDragReleaseRate: 10,
        engineDragSlipRange: 0.28,
        engineDragSlipThreshold: 0.12,
        stabilityActivationRangeMps: 320 / CITY_WORLD_PIXELS_PER_METER,
        stabilityActivationSpeedMps: 60 / CITY_WORLD_PIXELS_PER_METER,
        stabilityBrakeStrength: 0.16,
        stabilityEngineReduction: 0.08,
        stabilitySlipRange: 0.42,
        stabilitySlipThreshold: 0.035,
        tractionActivationRangeMps: 2.8,
        tractionActivationSpeedMps: 0.5,
        tractionApplyRate: 18,
        tractionMaximumReduction: 0.28,
        tractionReleaseRate: 10,
        tractionSlipRange: 0.28,
        tractionSlipThreshold: 0.15,
      },
      pedals: {
        brakeApplyRate: 24,
        brakeContactPressure: 0.18,
        brakeContactRate: 52,
        brakeReleaseRate: 34,
        brakingLoadReleaseSeconds: 0.035,
        engineLoadReleaseSeconds: 0.09,
        engineLoadRiseSeconds: 0.01,
        reverseEngineLoadRiseSeconds: 0.014,
        torqueDemandExponent: 0.76,
        throttleReleaseRate: 26,
        throttleReversalRate: 60,
        throttleRiseRate: 56,
      },
      steering: {
        commandCurveExponent: 1.28,
        commandReleaseRate: 18,
        commandReversalRate: 24,
        commandRiseRate: 9,
        counterFrequencyBoost: 4,
        heldAligningMomentScale: 0.06,
        heldDamping: 1.08,
        limitRateScale: 0.66,
        rateSpeedReduction: 0.08,
        releasedDamping: 1.12,
        speedReductionExponent: 1.35,
      },
    },
    differentials: {
      center: {
        coastPreloadNewtons: 0,
        coastTorqueBiasRatio: 1,
        couplingGainNewtonsPerMps: 0,
        preloadNewtons: 0,
        responseRate: 8,
        torqueBiasRatio: 1,
      },
      front: {
        coastPreloadNewtons: 25,
        coastTorqueBiasRatio: 1.15,
        couplingGainNewtonsPerMps: 1_650,
        preloadNewtons: 60,
        responseRate: 9,
        torqueBiasRatio: 1.45,
      },
      rear: {
        coastPreloadNewtons: 0,
        coastTorqueBiasRatio: 1,
        couplingGainNewtonsPerMps: 0,
        preloadNewtons: 0,
        responseRate: 8,
        torqueBiasRatio: 1,
      },
    },
    physics: {
      antiDiveRatio: 0.32,
      antiSquatRatio: 0.26,
      dragAreaM2: 0.66,
      brakeBiasFront: 0.64,
      maximumServiceBrakeTorqueNm: 5_200,
      maximumEngineBrakeWheelTorqueNm: 815,
      centerOfGravityHeightM: CAR_PHYSICAL_GEOMETRY.city.centerOfGravityHeightM,
      corneringStiffness: 6.6,
      drivetrainEfficiency: 0.86,
      drivelineBacklashRadians: 0.006,
      drivelineDampingRatio: 1.05,
      drivelineResponseFrequency: 90,
      contactReactionReleaseSeconds: 0.052,
      contactReactionReversalSeconds: 0.038,
      contactReactionRiseSeconds: 0.065,
      differentialCoastEnterPowerWatts: -120,
      differentialCoastExitPowerWatts: 45,
      differentialCoastMinimumSpeedMps: 0.18,
      driveBiasFront: 1,
      finalDriveRatio: 4.06,
      frontWeightBias: CAR_PHYSICAL_GEOMETRY.city.frontWeightBias,
      frontRollStiffnessBias: CAR_PHYSICAL_GEOMETRY.city.frontRollStiffnessBias,
      highSpeedSteeringReduction: 0.35,
      lateralGrip: 26 * CITY_WORLD_PIXELS_PER_METER,
      longitudinalGripRatio: 1.28,
      lowSpeedTireBlendMps: 120 / CITY_WORLD_PIXELS_PER_METER,
      lowSpeedTireReferenceMps: 0.3,
      longitudinalSlidingGripRatio: 0.9,
      massKg: 1040,
      maximumSteeringAngle: 0.74,
      physicalWheelbaseM: CAR_PHYSICAL_GEOMETRY.city.wheelbaseM,
      rearCorneringStiffnessScale: 0.98,
      reverseTorqueAuthority: 0.5,
      rollingResistanceCoefficient: 0.0163,
      suspensionPitchDamping: 1.42,
      suspensionPitchFrequency: 26,
      suspensionRollDamping: 1.38,
      suspensionRollFrequency: 28,
      steeringCounterRate: 4.2,
      steeringInputRate: 2.6,
      steeringAssistHighSpeed: 1,
      steeringAssistLoadSensitivity: 0.16,
      steeringAssistLowSpeed: 1.06,
      steeringCasterFrequency: 12,
      steeringRackFrequency: 38,
      steeringParkingScrubTorqueNm: 3.2,
      steeringRackFrictionTorqueNm: 6.5,
      steeringKineticFrictionRatio: 0.72,
      steeringReturnRate: 3.2,
      steeringReturnSpeedGain: 1.4,
      steeringSystemInertiaKgM2: 21,
      steeringScrubRadiusM: 0.018,
      steeringTrailM: 0.055,
      trackWidthM: CAR_PHYSICAL_GEOMETRY.city.trackWidthM,
      tireLoadSensitivity: 0.09,
      tireAdhesionBreakawayPower: 0.46,
      tireAdhesionRecoverySeconds: 0.16,
      tireAdhesionReleaseSeconds: 0.055,
      tireAdhesionTransitionPower: 1.05,
      tireBreakawaySharpness: 1.55,
      tireHighSpeedPredictionBlend: 0.12,
      tireHighSpeedPredictionRangeMps: 4,
      tireHighSpeedPredictionStartMps: 4.4,
      tireLateralSlidingGripRatio: 0.86,
      tirePeakSlip: 0.09,
      tireSlipAngleTelemetryRadians: 0.4,
      tireSlipReferenceSpeedMps: 0.23,
      tireRelaxationLoadSensitivity: 0.12,
      tireLateralDeflectionLimitRatio: 0.4,
      tireLateralRelaxationLengthM: 0.25,
      tireLateralTransportDecayPerSecond: 1.1,
      tireLongitudinalDeflectionLimitRatio: 1.75,
      tireLongitudinalRelaxationLengthM: 0.23,
      tireLongitudinalTransportDecayPerSecond: 0.78,
      tireRecoveryRate: 0.84,
      tireResponseScale: 2,
      tireShoulderDemand: 0.82,
      tirePeakDemand: 1.13,
      tireSlidingTransitionWidth: 0.48,
      torqueCurve: CITY_DIESEL_TORQUE_CURVE,
      worldPixelsPerMeter: CITY_WORLD_PIXELS_PER_METER,
      wheelRadiusM: 0.285,
      wheelInertiaKgM2: 1.05,
      maximumYawRate: 2.55,
    },
    handlingTargets: {
      maximumBrakeStopSeconds: 0.95,
      maximumSlalomSideslipRatio: 0.245,
      minimumForwardLaunchRatio: 0.22,
      minimumReverseLaunchRatio: 0.12,
      minimumTurnHeadingRadians: 0.16,
      reverseToForwardLaunchRatioMax: 0.9,
      telemetry: {
        accelerationReleaseMaximumJerkMps3: [0, 120],
        brakingDistancePixels: [75, 238],
        coastRetentionRatio: [0.7, 0.97],
        directionEngagementSeconds: [0.04, 0.12],
        forwardTenPercentSeconds: [0.22, 0.7],
        forwardThirtyFivePercentSeconds: [1.2, 1.8],
        forwardSeventyPercentSeconds: [2.3, 7],
        maximumWheelLoadConservationErrorNewtons: [0, 0.5],
        reverseLaunchRatio: [0.27, 0.4],
        reverseFifteenPercentSeconds: [0.3, 0.68],
        steeringResponseSeconds: [0.2, 0.33],
        suspensionSettleSecondsAfterImpact: [0.18, 0.8],
        wallMaximumInwardSpeedMps: [0, 0.12],
        wallReverseReleaseSeconds: [0.2, 3],
      },
    },
    transmission: {
      coupling: {
        kind: "manual",
        launchCoupling: 0.76,
        shiftReleaseCoupling: 0.1,
      },
      gears: [
        { downshiftSpeed: 0, meshTeeth: 39, ratio: 4.55, upshiftSpeed: 0.2 },
        { downshiftSpeed: 0.11, meshTeeth: 35, ratio: 2.8, upshiftSpeed: 0.41 },
        { downshiftSpeed: 0.28, meshTeeth: 31, ratio: 1.85, upshiftSpeed: 0.64 },
        { downshiftSpeed: 0.48, meshTeeth: 28, ratio: 1.4, upshiftSpeed: 0.84 },
        { downshiftSpeed: 0.68, meshTeeth: 25, ratio: 1.25, upshiftSpeed: null },
      ],
      reverseMeshTeeth: 41,
      reverseRatio: 4,
      minimumShiftInterval: 0.48,
      brakingShiftInterval: 0.75,
      shiftDwell: 0.16,
      kickdownDwell: 0.09,
      throttleShiftBias: 0.075,
      corneringThreshold: 0.42,
      kickdownLoad: 0.78,
      torqueCutDuration: 0.11,
      torqueCutLevel: 0.82,
    },
    rpm: MATCHED_DIESEL_RPM,
    road: {
      maximumForwardKph: 82,
      maximumReverseKph: 600 * 3.6 / CITY_WORLD_PIXELS_PER_METER,
      noiseLevel: 1,
      reverseWhineLevel: 0.022,
      tireScrubLevel: 0.032,
    },
    sound: MATCHED_DIESEL_SOUND,
  },
  rally: {
    calibration: MATCHED_DIESEL_CALIBRATION,
    id: "rally",
    label: "Close-ratio six-speed",
    combustion: { ...MATCHED_DIESEL_COMBUSTION, crankInertia: 0.78 },
    samples: {
      lifecycle: MATCHED_DIESEL_LIFECYCLE,
      sourceId: "peugeot-3008-bluehdi-2022-exterior",
      rpmBands: MATCHED_DIESEL_RPM_BANDS,
    },
    controls: {
      direction: {
        couplingBlendSeconds: 0.03,
        residualBrakePressure: 0.015,
        restEntrySpeedMps: 2.7 / RALLY_WORLD_PIXELS_PER_METER,
        restReleaseForceNewtons: 85,
        restSettleSeconds: 0.03,
        stopSpeedMps: 12 / RALLY_WORLD_PIXELS_PER_METER,
      },
      driverAids: {
        absActivationRangeMps: 1.1,
        absActivationSpeedMps: 0.5,
        absApplyRate: 34,
        absDecelerationThreshold: 8.2,
        absMaximumRelease: 0.64,
        absPressureApplyRate: 34,
        absPressureReleaseRate: 46,
        absReleaseRate: 20,
        absSlipRange: 0.4,
        absSlipThreshold: 0.2,
        ebdApplyRate: 28,
        ebdDeadband: 0.008,
        ebdReleaseRate: 40,
        engineDragApplyRate: 12,
        engineDragMaximumReduction: 0.34,
        engineDragReleaseRate: 12,
        engineDragSlipRange: 0.32,
        engineDragSlipThreshold: 0.14,
        stabilityActivationRangeMps: 340 / RALLY_WORLD_PIXELS_PER_METER,
        stabilityActivationSpeedMps: 70 / RALLY_WORLD_PIXELS_PER_METER,
        stabilityBrakeStrength: 0.18,
        stabilityEngineReduction: 0.06,
        stabilitySlipRange: 0.46,
        stabilitySlipThreshold: 0.045,
        tractionActivationRangeMps: 3.2,
        tractionActivationSpeedMps: 0.65,
        tractionApplyRate: 16,
        tractionMaximumReduction: 0.24,
        tractionReleaseRate: 12,
        tractionSlipRange: 0.32,
        tractionSlipThreshold: 0.2,
      },
      pedals: {
        brakeApplyRate: 28,
        brakeContactPressure: 0.16,
        brakeContactRate: 60,
        brakeReleaseRate: 40,
        brakingLoadReleaseSeconds: 0.03,
        engineLoadReleaseSeconds: 0.078,
        engineLoadRiseSeconds: 0.009,
        reverseEngineLoadRiseSeconds: 0.013,
        torqueDemandExponent: 0.72,
        throttleReleaseRate: 30,
        throttleReversalRate: 68,
        throttleRiseRate: 64,
      },
      steering: {
        commandCurveExponent: 1.18,
        commandReleaseRate: 22,
        commandReversalRate: 28,
        commandRiseRate: 11,
        counterFrequencyBoost: 4.5,
        heldAligningMomentScale: 0.045,
        heldDamping: 1.06,
        limitRateScale: 0.68,
        rateSpeedReduction: 0.06,
        releasedDamping: 1.1,
        speedReductionExponent: 1.5,
      },
    },
    differentials: {
      center: {
        coastPreloadNewtons: 70,
        coastTorqueBiasRatio: 1.3,
        couplingGainNewtonsPerMps: 1_900,
        preloadNewtons: 120,
        responseRate: 10,
        torqueBiasRatio: 1.65,
      },
      front: {
        coastPreloadNewtons: 70,
        coastTorqueBiasRatio: 1.35,
        couplingGainNewtonsPerMps: 2_200,
        preloadNewtons: 100,
        responseRate: 10,
        torqueBiasRatio: 1.9,
      },
      rear: {
        coastPreloadNewtons: 70,
        coastTorqueBiasRatio: 1.35,
        couplingGainNewtonsPerMps: 2_200,
        preloadNewtons: 100,
        responseRate: 10,
        torqueBiasRatio: 1.9,
      },
    },
    physics: {
      antiDiveRatio: 0.28,
      antiSquatRatio: 0.22,
      dragAreaM2: 0.58,
      brakeBiasFront: 0.61,
      maximumServiceBrakeTorqueNm: 5_400,
      maximumEngineBrakeWheelTorqueNm: 892,
      centerOfGravityHeightM: CAR_PHYSICAL_GEOMETRY.rally.centerOfGravityHeightM,
      corneringStiffness: 7.4,
      drivetrainEfficiency: 0.9,
      drivelineBacklashRadians: 0.004,
      drivelineDampingRatio: 1.04,
      drivelineResponseFrequency: 108,
      contactReactionReleaseSeconds: 0.045,
      contactReactionReversalSeconds: 0.032,
      contactReactionRiseSeconds: 0.055,
      differentialCoastEnterPowerWatts: -95,
      differentialCoastExitPowerWatts: 60,
      differentialCoastMinimumSpeedMps: 0.22,
      driveBiasFront: 0.55,
      finalDriveRatio: 4.35,
      frontWeightBias: CAR_PHYSICAL_GEOMETRY.rally.frontWeightBias,
      frontRollStiffnessBias: CAR_PHYSICAL_GEOMETRY.rally.frontRollStiffnessBias,
      highSpeedSteeringReduction: 0.3,
      lateralGrip: 30 * RALLY_WORLD_PIXELS_PER_METER,
      longitudinalGripRatio: 1.3,
      lowSpeedTireBlendMps: 110 / RALLY_WORLD_PIXELS_PER_METER,
      lowSpeedTireReferenceMps: 0.27,
      longitudinalSlidingGripRatio: 0.92,
      massKg: 980,
      maximumSteeringAngle: 0.78,
      physicalWheelbaseM: CAR_PHYSICAL_GEOMETRY.rally.wheelbaseM,
      rearCorneringStiffnessScale: 1.18,
      reverseTorqueAuthority: 0.48,
      rollingResistanceCoefficient: 0.0143,
      suspensionPitchDamping: 1.36,
      suspensionPitchFrequency: 30,
      suspensionRollDamping: 1.32,
      suspensionRollFrequency: 32,
      steeringCounterRate: 4.8,
      steeringInputRate: 3,
      steeringAssistHighSpeed: 1.05,
      steeringAssistLoadSensitivity: 0.1,
      steeringAssistLowSpeed: 1.1,
      steeringCasterFrequency: 13.5,
      steeringRackFrequency: 42,
      steeringParkingScrubTorqueNm: 2.4,
      steeringRackFrictionTorqueNm: 5.2,
      steeringKineticFrictionRatio: 0.68,
      steeringReturnRate: 3.5,
      steeringReturnSpeedGain: 1.6,
      steeringSystemInertiaKgM2: 19,
      steeringScrubRadiusM: 0.012,
      steeringTrailM: 0.06,
      trackWidthM: CAR_PHYSICAL_GEOMETRY.rally.trackWidthM,
      tireLoadSensitivity: 0.075,
      tireAdhesionBreakawayPower: 0.5,
      tireAdhesionRecoverySeconds: 0.12,
      tireAdhesionReleaseSeconds: 0.048,
      tireAdhesionTransitionPower: 1.12,
      tireBreakawaySharpness: 1.35,
      tireHighSpeedPredictionBlend: 0.14,
      tireHighSpeedPredictionRangeMps: 4.5,
      tireHighSpeedPredictionStartMps: 4.8,
      tireLateralSlidingGripRatio: 0.9,
      tirePeakSlip: 0.085,
      tireSlipAngleTelemetryRadians: 0.44,
      tireSlipReferenceSpeedMps: 0.2,
      tireRelaxationLoadSensitivity: 0.1,
      tireLateralDeflectionLimitRatio: 0.46,
      tireLateralRelaxationLengthM: 0.17,
      tireLateralTransportDecayPerSecond: 0.9,
      tireLongitudinalDeflectionLimitRatio: 1.95,
      tireLongitudinalRelaxationLengthM: 0.14,
      tireLongitudinalTransportDecayPerSecond: 0.62,
      tireRecoveryRate: 0.95,
      tireResponseScale: 2.2,
      tireShoulderDemand: 0.84,
      tirePeakDemand: 1.16,
      tireSlidingTransitionWidth: 0.54,
      torqueCurve: RALLY_DIESEL_TORQUE_CURVE,
      worldPixelsPerMeter: RALLY_WORLD_PIXELS_PER_METER,
      wheelRadiusM: 0.28,
      wheelInertiaKgM2: 0.92,
      maximumYawRate: 2.8,
    },
    handlingTargets: {
      maximumBrakeStopSeconds: 0.95,
      maximumSlalomSideslipRatio: 0.23,
      minimumForwardLaunchRatio: 0.2,
      minimumReverseLaunchRatio: 0.13,
      minimumTurnHeadingRadians: 0.17,
      reverseToForwardLaunchRatioMax: 0.88,
      telemetry: {
        accelerationReleaseMaximumJerkMps3: [0, 140],
        brakingDistancePixels: [70, 305],
        coastRetentionRatio: [0.78, 0.97],
        directionEngagementSeconds: [0.03, 0.11],
        forwardTenPercentSeconds: [0.16, 0.6],
        forwardThirtyFivePercentSeconds: [0.75, 2],
        forwardSeventyPercentSeconds: [1.8, 6],
        maximumWheelLoadConservationErrorNewtons: [0, 0.5],
        reverseLaunchRatio: [0.22, 0.44],
        reverseFifteenPercentSeconds: [0.56, 0.72],
        steeringResponseSeconds: [0.18, 0.35],
        suspensionSettleSecondsAfterImpact: [0.14, 0.65],
        wallMaximumInwardSpeedMps: [0, 0.12],
        wallReverseReleaseSeconds: [0.2, 2.8],
      },
    },
    transmission: {
      coupling: {
        kind: "manual",
        launchCoupling: 0.8,
        shiftReleaseCoupling: 0.09,
      },
      gears: [
        { downshiftSpeed: 0, meshTeeth: 38, ratio: 4.35, upshiftSpeed: 0.2 },
        { downshiftSpeed: 0.1, meshTeeth: 35, ratio: 3.1, upshiftSpeed: 0.37 },
        { downshiftSpeed: 0.24, meshTeeth: 32, ratio: 2.3, upshiftSpeed: 0.54 },
        { downshiftSpeed: 0.4, meshTeeth: 29, ratio: 1.78, upshiftSpeed: 0.7 },
        { downshiftSpeed: 0.56, meshTeeth: 26, ratio: 1.4, upshiftSpeed: 0.86 },
        { downshiftSpeed: 0.72, meshTeeth: 24, ratio: 1.12, upshiftSpeed: null },
      ],
      reverseMeshTeeth: 40,
      reverseRatio: 4.15,
      minimumShiftInterval: 0.44,
      brakingShiftInterval: 0.7,
      shiftDwell: 0.14,
      kickdownDwell: 0.075,
      throttleShiftBias: 0.085,
      corneringThreshold: 0.5,
      kickdownLoad: 0.74,
      torqueCutDuration: 0.1,
      torqueCutLevel: 0.84,
    },
    rpm: MATCHED_DIESEL_RPM,
    road: {
      maximumForwardKph: 92,
      maximumReverseKph: 650 * 3.6 / RALLY_WORLD_PIXELS_PER_METER,
      noiseLevel: 1.08,
      reverseWhineLevel: 0.026,
      tireScrubLevel: 0.04,
    },
    sound: MATCHED_DIESEL_SOUND,
  },
  taxi: {
    calibration: MATCHED_DIESEL_CALIBRATION,
    id: "taxi",
    label: "Long-ratio four-speed",
    combustion: { ...MATCHED_DIESEL_COMBUSTION, crankInertia: 1.2 },
    samples: {
      lifecycle: MATCHED_DIESEL_LIFECYCLE,
      sourceId: "peugeot-3008-bluehdi-2022-exterior",
      rpmBands: MATCHED_DIESEL_RPM_BANDS,
    },
    controls: {
      direction: {
        couplingBlendSeconds: 0.042,
        residualBrakePressure: 0.025,
        restEntrySpeedMps: 3.4 / TAXI_WORLD_PIXELS_PER_METER,
        restReleaseForceNewtons: 120,
        restSettleSeconds: 0.045,
        stopSpeedMps: 16 / TAXI_WORLD_PIXELS_PER_METER,
      },
      driverAids: {
        absActivationRangeMps: 1.3,
        absActivationSpeedMps: 0.7,
        absApplyRate: 28,
        absDecelerationThreshold: 7,
        absMaximumRelease: 0.7,
        absPressureApplyRate: 27,
        absPressureReleaseRate: 39,
        absReleaseRate: 16,
        absSlipRange: 0.36,
        absSlipThreshold: 0.17,
        ebdApplyRate: 22,
        ebdDeadband: 0.008,
        ebdReleaseRate: 32,
        engineDragApplyRate: 10,
        engineDragMaximumReduction: 0.42,
        engineDragReleaseRate: 9,
        engineDragSlipRange: 0.25,
        engineDragSlipThreshold: 0.1,
        stabilityActivationRangeMps: 300 / TAXI_WORLD_PIXELS_PER_METER,
        stabilityActivationSpeedMps: 52 / TAXI_WORLD_PIXELS_PER_METER,
        stabilityBrakeStrength: 0.2,
        stabilityEngineReduction: 0.1,
        stabilitySlipRange: 0.38,
        stabilitySlipThreshold: 0.03,
        tractionActivationRangeMps: 2.6,
        tractionActivationSpeedMps: 0.45,
        tractionApplyRate: 20,
        tractionMaximumReduction: 0.32,
        tractionReleaseRate: 9,
        tractionSlipRange: 0.26,
        tractionSlipThreshold: 0.14,
      },
      pedals: {
        brakeApplyRate: 22,
        brakeContactPressure: 0.22,
        brakeContactRate: 48,
        brakeReleaseRate: 32,
        brakingLoadReleaseSeconds: 0.04,
        engineLoadReleaseSeconds: 0.11,
        engineLoadRiseSeconds: 0.012,
        reverseEngineLoadRiseSeconds: 0.016,
        torqueDemandExponent: 0.78,
        throttleReleaseRate: 24,
        throttleReversalRate: 54,
        throttleRiseRate: 52,
      },
      steering: {
        commandCurveExponent: 1.34,
        commandReleaseRate: 17,
        commandReversalRate: 22,
        commandRiseRate: 8,
        counterFrequencyBoost: 3.5,
        heldAligningMomentScale: 0.075,
        heldDamping: 1.1,
        limitRateScale: 0.64,
        rateSpeedReduction: 0.09,
        releasedDamping: 1.14,
        speedReductionExponent: 1.25,
      },
    },
    differentials: {
      center: {
        coastPreloadNewtons: 0,
        coastTorqueBiasRatio: 1,
        couplingGainNewtonsPerMps: 0,
        preloadNewtons: 0,
        responseRate: 7,
        torqueBiasRatio: 1,
      },
      front: {
        coastPreloadNewtons: 20,
        coastTorqueBiasRatio: 1.1,
        couplingGainNewtonsPerMps: 1_400,
        preloadNewtons: 45,
        responseRate: 8,
        torqueBiasRatio: 1.3,
      },
      rear: {
        coastPreloadNewtons: 0,
        coastTorqueBiasRatio: 1,
        couplingGainNewtonsPerMps: 0,
        preloadNewtons: 0,
        responseRate: 7,
        torqueBiasRatio: 1,
      },
    },
    physics: {
      antiDiveRatio: 0.38,
      antiSquatRatio: 0.3,
      dragAreaM2: 0.78,
      brakeBiasFront: 0.66,
      maximumServiceBrakeTorqueNm: 6_000,
      maximumEngineBrakeWheelTorqueNm: 853,
      centerOfGravityHeightM: CAR_PHYSICAL_GEOMETRY.taxi.centerOfGravityHeightM,
      corneringStiffness: 5.7,
      drivetrainEfficiency: 0.84,
      drivelineBacklashRadians: 0.008,
      drivelineDampingRatio: 1.08,
      drivelineResponseFrequency: 72,
      contactReactionReleaseSeconds: 0.062,
      contactReactionReversalSeconds: 0.045,
      contactReactionRiseSeconds: 0.075,
      differentialCoastEnterPowerWatts: -155,
      differentialCoastExitPowerWatts: 40,
      differentialCoastMinimumSpeedMps: 0.16,
      driveBiasFront: 1,
      finalDriveRatio: 3.72,
      frontWeightBias: CAR_PHYSICAL_GEOMETRY.taxi.frontWeightBias,
      frontRollStiffnessBias: CAR_PHYSICAL_GEOMETRY.taxi.frontRollStiffnessBias,
      highSpeedSteeringReduction: 0.38,
      lateralGrip: 24 * TAXI_WORLD_PIXELS_PER_METER,
      longitudinalGripRatio: 1.25,
      lowSpeedTireBlendMps: 135 / TAXI_WORLD_PIXELS_PER_METER,
      lowSpeedTireReferenceMps: 0.34,
      longitudinalSlidingGripRatio: 0.88,
      massKg: 1280,
      maximumSteeringAngle: 0.7,
      physicalWheelbaseM: CAR_PHYSICAL_GEOMETRY.taxi.wheelbaseM,
      rearCorneringStiffnessScale: 1.12,
      reverseTorqueAuthority: 0.52,
      rollingResistanceCoefficient: 0.0183,
      suspensionPitchDamping: 1.48,
      suspensionPitchFrequency: 23,
      suspensionRollDamping: 1.44,
      suspensionRollFrequency: 25,
      steeringCounterRate: 3.8,
      steeringInputRate: 2.4,
      steeringAssistHighSpeed: 0.95,
      steeringAssistLoadSensitivity: 0.2,
      steeringAssistLowSpeed: 0.96,
      steeringCasterFrequency: 11,
      steeringRackFrequency: 36,
      steeringParkingScrubTorqueNm: 4.1,
      steeringRackFrictionTorqueNm: 8.4,
      steeringKineticFrictionRatio: 0.76,
      steeringReturnRate: 2.8,
      steeringReturnSpeedGain: 1.2,
      steeringSystemInertiaKgM2: 23,
      steeringScrubRadiusM: 0.021,
      steeringTrailM: 0.05,
      trackWidthM: CAR_PHYSICAL_GEOMETRY.taxi.trackWidthM,
      tireLoadSensitivity: 0.105,
      tireAdhesionBreakawayPower: 0.43,
      tireAdhesionRecoverySeconds: 0.18,
      tireAdhesionReleaseSeconds: 0.06,
      tireAdhesionTransitionPower: 0.98,
      tireBreakawaySharpness: 1.7,
      tireHighSpeedPredictionBlend: 0.1,
      tireHighSpeedPredictionRangeMps: 3.8,
      tireHighSpeedPredictionStartMps: 4.2,
      tireLateralSlidingGripRatio: 0.88,
      tirePeakSlip: 0.1,
      tireSlipAngleTelemetryRadians: 0.38,
      tireSlipReferenceSpeedMps: 0.27,
      tireRelaxationLoadSensitivity: 0.14,
      tireLateralDeflectionLimitRatio: 0.38,
      tireLateralRelaxationLengthM: 0.28,
      tireLateralTransportDecayPerSecond: 1.15,
      tireLongitudinalDeflectionLimitRatio: 1.65,
      tireLongitudinalRelaxationLengthM: 0.26,
      tireLongitudinalTransportDecayPerSecond: 0.9,
      tireRecoveryRate: 0.9,
      tireResponseScale: 2.05,
      tireShoulderDemand: 0.8,
      tirePeakDemand: 1.11,
      tireSlidingTransitionWidth: 0.44,
      torqueCurve: TAXI_DIESEL_TORQUE_CURVE,
      worldPixelsPerMeter: TAXI_WORLD_PIXELS_PER_METER,
      wheelRadiusM: 0.31,
      wheelInertiaKgM2: 1.18,
      maximumYawRate: 2.35,
    },
    handlingTargets: {
      maximumBrakeStopSeconds: 1,
      maximumSlalomSideslipRatio: 0.31,
      minimumForwardLaunchRatio: 0.2,
      minimumReverseLaunchRatio: 0.1,
      minimumTurnHeadingRadians: 0.105,
      reverseToForwardLaunchRatioMax: 0.9,
      telemetry: {
        accelerationReleaseMaximumJerkMps3: [0, 110],
        brakingDistancePixels: [75, 231],
        coastRetentionRatio: [0.68, 0.97],
        directionEngagementSeconds: [0.05, 0.15],
        forwardTenPercentSeconds: [0.25, 0.8],
        forwardThirtyFivePercentSeconds: [1.2, 1.75],
        forwardSeventyPercentSeconds: [2.6, 8],
        maximumWheelLoadConservationErrorNewtons: [0, 0.5],
        reverseLaunchRatio: [0.28, 0.4],
        reverseFifteenPercentSeconds: [0.37, 0.5],
        steeringResponseSeconds: [0.24, 0.4],
        suspensionSettleSecondsAfterImpact: [0.2, 0.9],
        wallMaximumInwardSpeedMps: [0, 0.12],
        wallReverseReleaseSeconds: [0.25, 3],
      },
    },
    transmission: {
      coupling: {
        kind: "torque-converter",
        fluidCapacityBase: 0.3,
        fluidCapacityGain: 1.42,
        fluidCoupling: 0.86,
        lockupEndSpeed: 0.55,
        lockupReleaseLoad: 0.72,
        lockupStartSpeed: 0.32,
        shiftCoupling: 0.7,
        stallCoupling: 0.31,
        stallTorqueRatio: 2.05,
        stallTorqueTransfer: 0.82,
        slipTorqueBaseNmPerRpm: 0.14,
        slipTorqueGainNmPerRpm: 1.38,
        torqueRatioEndSpeedRatio: 0.88,
        torqueRatioStartSpeedRatio: 0.1,
      },
      gears: [
        { downshiftSpeed: 0, meshTeeth: 41, ratio: 4.45, upshiftSpeed: 0.18 },
        { downshiftSpeed: 0.1, meshTeeth: 36, ratio: 3, upshiftSpeed: 0.43 },
        { downshiftSpeed: 0.3, meshTeeth: 31, ratio: 2, upshiftSpeed: 0.73 },
        { downshiftSpeed: 0.57, meshTeeth: 27, ratio: 1.5, upshiftSpeed: null },
      ],
      reverseMeshTeeth: 43,
      reverseRatio: 4.2,
      minimumShiftInterval: 0.54,
      brakingShiftInterval: 0.82,
      shiftDwell: 0.18,
      kickdownDwell: 0.11,
      throttleShiftBias: 0.06,
      corneringThreshold: 0.38,
      kickdownLoad: 0.84,
      torqueCutDuration: 0.12,
      torqueCutLevel: 0.8,
    },
    rpm: MATCHED_DIESEL_RPM,
    road: {
      maximumForwardKph: 76,
      maximumReverseKph: 560 * 3.6 / TAXI_WORLD_PIXELS_PER_METER,
      noiseLevel: 0.92,
      reverseWhineLevel: 0.018,
      tireScrubLevel: 0.027,
    },
    sound: MATCHED_DIESEL_SOUND,
  },
};

export function getCarEngineStyle(id: CarEngineStyleId) {
  return CAR_ENGINE_STYLES[id];
}

const STANDARD_AIR_DENSITY_KG_PER_M3 = 1.225;

export function getCarRoadResistanceForceNewtons(
  style: CarEngineStyle,
  speedMps: number,
  rollingBlend = 1,
  rollingResistanceMultiplier = 1,
) {
  const rollingForce = style.physics.massKg * 9.81
    * style.physics.rollingResistanceCoefficient
    * Math.max(0, Math.min(1, rollingBlend))
    * Math.max(0.35, Math.min(2.5, rollingResistanceMultiplier));
  const aerodynamicForce = 0.5 * STANDARD_AIR_DENSITY_KG_PER_M3
    * style.physics.dragAreaM2 * speedMps * speedMps;
  return rollingForce + aerodynamicForce;
}

export function getCarMaximumBrakeForceNewtons(style: CarEngineStyle) {
  return style.physics.maximumServiceBrakeTorqueNm
    / Math.max(0.05, style.physics.wheelRadiusM);
}

export function getCarMaximumBrakeDecelerationPage(style: CarEngineStyle) {
  return getCarMaximumBrakeForceNewtons(style)
    / Math.max(1, style.physics.massKg)
    * style.physics.worldPixelsPerMeter;
}

export function getCarCalibrationReport(style: CarEngineStyle) {
  const driveBiasFront = style.physics.driveBiasFront;
  return {
    brakeDecelerationMps2: getCarMaximumBrakeForceNewtons(style)
      / Math.max(1, style.physics.massKg),
    dragAreaM2: style.physics.dragAreaM2,
    driveLayout: driveBiasFront >= 0.95
      ? "front"
      : driveBiasFront <= 0.05
        ? "rear"
        : "all",
    forwardMaximumKph: style.road.maximumForwardKph,
    id: style.id,
    massKg: style.physics.massKg,
    maximumBrakeTorqueNm: style.physics.maximumServiceBrakeTorqueNm,
    maximumEngineBrakeWheelTorqueNm:
      style.physics.maximumEngineBrakeWheelTorqueNm,
    maximumEngineTorqueNm: style.calibration.maximumTorqueNm,
    powerToWeightKwPerTonne: style.calibration.maximumPowerKw
      / (style.physics.massKg / 1_000),
    reverseMaximumKph: style.road.maximumReverseKph,
    rollingResistanceCoefficient: style.physics.rollingResistanceCoefficient,
    steeringLockDegrees: style.physics.maximumSteeringAngle * 180 / Math.PI,
    torqueCurve: style.physics.torqueCurve.map((point) => ({ ...point })),
  } as const;
}

export function getCarMaximumPageSpeed(
  style: CarEngineStyle,
  direction: -1 | 1,
) {
  const maximumKph = direction < 0
    ? style.road.maximumReverseKph
    : style.road.maximumForwardKph;
  return maximumKph / 3.6 * style.physics.worldPixelsPerMeter;
}

export function getCarPageSpeedRatio(
  style: CarEngineStyle,
  pageSpeedPixelsPerSecond: number,
) {
  const direction = pageSpeedPixelsPerSecond < 0 ? -1 : 1;
  return pageSpeedPixelsPerSecond / Math.max(
    1,
    getCarMaximumPageSpeed(style, direction),
  );
}

export function getCarEngineTargetRpm(
  style: CarEngineStyle,
  speedRatio: number,
  direction: -1 | 0 | 1,
  gear: number,
  load: number,
  forwardRatioOverride?: number,
) {
  const speed = Math.abs(speedRatio);
  const launchRpm = load * Math.max(0, 1 - speed / 0.14) * style.rpm.launchBoost;
  if (direction === 0 && speed < 0.01) return style.rpm.idle + launchRpm;
  const roadSpeedKph = Math.abs(getCarEngineRoadSpeedKph(style, speedRatio));
  const metresPerSecond = roadSpeedKph / 3.6;
  const wheelRpm = metresPerSecond
    / (2 * Math.PI * style.physics.wheelRadiusM) * 60;
  const transmissionRatio = direction < 0
    ? style.transmission.reverseRatio
    : forwardRatioOverride ?? style.transmission.gears[
        Math.max(0, Math.min(style.transmission.gears.length - 1, gear - 1))
      ].ratio;
  const coupledRpm = wheelRpm * transmissionRatio * style.physics.finalDriveRatio;
  return Math.max(
    style.rpm.idle,
    Math.min(
      style.rpm.maximum,
      coupledRpm + launchRpm + load * style.rpm.loadBoost,
    ),
  );
}

export function getCarEngineRoadSpeedKph(
  style: CarEngineStyle,
  speedRatio: number,
) {
  return speedRatio < 0
    ? speedRatio * style.road.maximumReverseKph
    : speedRatio * style.road.maximumForwardKph;
}

export function getCarTorqueMultiplier(style: CarEngineStyle, rpm: number) {
  const range = Math.max(1, style.rpm.maximum - style.rpm.idle);
  const rpmRatio = Math.max(0, Math.min(1, (rpm - style.rpm.idle) / range));
  const curve = style.physics.torqueCurve;
  if (rpmRatio <= curve[0].rpmRatio) return curve[0].multiplier;
  if (rpmRatio >= curve[curve.length - 1].rpmRatio) {
    return curve[curve.length - 1].multiplier;
  }
  for (let index = 0; index < curve.length - 1; index += 1) {
    const lower = curve[index];
    const upper = curve[index + 1];
    if (rpmRatio < lower.rpmRatio || rpmRatio > upper.rpmRatio) continue;
    const blend = (rpmRatio - lower.rpmRatio) / (upper.rpmRatio - lower.rpmRatio);
    return lower.multiplier + (upper.multiplier - lower.multiplier) * blend;
  }
  return 1;
}
