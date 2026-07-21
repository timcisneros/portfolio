import type { CarChassisState } from "./carChassis";
import type {
  CarDrivetrainOutput,
  CarDrivetrainState,
} from "./carDrivetrain";

export type CarControl = "up" | "right" | "down" | "left";
export type CarVariant = "city" | "rally" | "taxi";

type CarInputHub = {
  held: Set<CarControl>;
  suppressedUntilRelease: Set<CarControl>;
  subscribers: Set<(held: ReadonlySet<CarControl>) => void>;
};

type CarInputWindow = Window & {
  __portfolioCarInputHub?: CarInputHub;
  __portfolioCarRouteTransfer?: string;
  __portfolioCarVariant?: CarVariant;
};

const controlForKey: Record<string, CarControl | undefined> = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
};

function getCarInputHub() {
  const inputWindow = window as CarInputWindow;
  if (inputWindow.__portfolioCarInputHub) return inputWindow.__portfolioCarInputHub;

  const hub: CarInputHub = {
    held: new Set<CarControl>(),
    suppressedUntilRelease: new Set<CarControl>(),
    subscribers: new Set(),
  };
  const notify = () => hub.subscribers.forEach((subscriber) => subscriber(hub.held));
  const releaseAll = () => {
    if (!hub.held.size) return;
    hub.held.clear();
    notify();
  };
  window.addEventListener("keydown", (event) => {
    const control = controlForKey[event.key];
    if (!control) return;
    if (!hub.subscribers.size) return;
    event.preventDefault();
    if (hub.suppressedUntilRelease.has(control)) return;
    if (hub.held.has(control)) return;
    hub.held.add(control);
    notify();
  });
  window.addEventListener("keyup", (event) => {
    const control = controlForKey[event.key];
    if (!control) return;
    if (hub.subscribers.size) event.preventDefault();
    hub.suppressedUntilRelease.delete(control);
    if (!hub.held.delete(control)) return;
    notify();
  });
  window.addEventListener("blur", releaseAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseAll();
  });
  inputWindow.__portfolioCarInputHub = hub;
  return hub;
}

export function readHeldCarControls() {
  return typeof window === "undefined" ? [] : Array.from(getCarInputHub().held);
}

export function clearHeldCarControls() {
  if (typeof window === "undefined") return;
  const hub = getCarInputHub();
  if (!hub.held.size) return;
  hub.held.clear();
  hub.subscribers.forEach((subscriber) => subscriber(hub.held));
}

export function suppressHeldCarControlsUntilRelease() {
  if (typeof window === "undefined") return;
  const hub = getCarInputHub();
  hub.held.forEach((control) => hub.suppressedUntilRelease.add(control));
  if (!hub.held.size) return;
  hub.held.clear();
  hub.subscribers.forEach((subscriber) => subscriber(hub.held));
}

export function subscribeHeldCarControls(
  subscriber: (held: ReadonlySet<CarControl>) => void,
) {
  const hub = getCarInputHub();
  hub.subscribers.add(subscriber);
  subscriber(hub.held);
  return () => {
    hub.subscribers.delete(subscriber);
  };
}

export type CarRouteTransfer = {
  id: string;
  targetRoute: string;
  entryEdge: "left" | "right";
  screenY: number;
  verticalProgress: number;
  heading: number;
  speed: number;
  calibration?: CarCalibrationRouteTransfer;
  chassis?: CarChassisState;
  drivetrain?: CarDrivetrainState;
  drivetrainOutput?: CarDrivetrainOutput;
  visual?: {
    frontLeftWheelRotation?: number;
    frontRightWheelRotation?: number;
    frontWheelRotation?: number;
    /** Legacy presentation fields; current rendering derives these from chassis. */
    pitch?: number;
    pitchVelocity?: number;
    previousSpeed?: number;
    rearLeftWheelRotation?: number;
    rearRightWheelRotation?: number;
    rearWheelRotation?: number;
    roll?: number;
    rollVelocity?: number;
    wheelRotation: number;
  };
  variant: CarVariant;
  createdAt: number;
};

export type CarCalibrationRouteTransfer = {
  brakingDistanceActiveMeters: number;
  brakingDistanceMeters: number | null;
  brakingSecondsActive: number | null;
  brakingStopSeconds: number | null;
  coastRetentionRatio: number | null;
  collisionEnergyGainJ: number;
  collisionEnergyLossJ: number;
  coastSecondsActive: number | null;
  coastStartSpeedMps: number;
  directionChanges: number;
  directionEngagementSeconds: number | null;
  directionEngagementSecondsActive: number | null;
  directionEngagementTarget: -1 | 0 | 1;
  distanceMeters: number;
  elapsedSeconds: number;
  forwardLaunchSecondsActive: number | null;
  forwardThirtyFivePercentSeconds: number | null;
  lastDriveDirection: -1 | 0 | 1;
  maximumCombinedTireDemand: number;
  maximumSuspensionCompression: [number, number, number, number];
  maximumWheelLoadConservationErrorNewtons: number;
  maximumWheelLoadNewtons: [number, number, number, number];
  minimumSuspensionCompression: [number, number, number, number];
  minimumWheelLoadNewtons: [number, number, number, number];
  minimumTireAdhesion: number;
  peakAbsActivity: number;
  peakEngineDragControlActivity: number;
  peakEngineDragControlActivityByWheel: [number, number, number, number];
  peakForwardSpeedMps: number;
  peakLateralAccelerationMps2: number;
  peakLongitudinalAccelerationMps2: number;
  peakReverseSpeedMps: number;
  peakSuspensionVelocity: [number, number, number, number];
  peakTireSlip: number;
  peakTractionControlActivity: number;
  peakTractionControlActivityByWheel: [number, number, number, number];
  peakYawLimiterActivity: number;
  peakYawRateRadiansPerSecond: number;
  reverseFifteenPercentSeconds: number | null;
  reverseLaunchSecondsActive: number | null;
  steeringResponseSeconds: number | null;
  steeringSecondsActive: number | null;
  suspensionQuietSeconds: number;
  suspensionSampleCount: number;
  suspensionSettleSecondsActive: number | null;
  suspensionSettleSecondsAfterImpact: number | null;
};

const STORAGE_KEY = "portfolio:car-route-transfer";
const VARIANT_STORAGE_KEY = "portfolio:selected-car";
const MAX_TRANSFER_AGE = 10_000;
let transferSequence = 0;

function hasFiniteFields(value: unknown, fields: readonly string[]) {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return fields.every((field) => Number.isFinite(record[field]));
}

function hasOptionalFiniteFields(value: unknown, fields: readonly string[]) {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return fields.every((field) => (
    record[field] === undefined || Number.isFinite(record[field])
  ));
}

function isFiniteOrNull(value: unknown) {
  return value === null || Number.isFinite(value);
}

function isFiniteWheelTuple(value: unknown) {
  return Array.isArray(value)
    && value.length === 4
    && value.every(Number.isFinite);
}

function isCalibrationTransfer(value: unknown): value is CarCalibrationRouteTransfer {
  if (!hasFiniteFields(value, [
    "brakingDistanceActiveMeters",
    "coastStartSpeedMps",
    "collisionEnergyGainJ",
    "collisionEnergyLossJ",
    "directionChanges",
    "distanceMeters",
    "elapsedSeconds",
    "maximumCombinedTireDemand",
    "maximumWheelLoadConservationErrorNewtons",
    "minimumTireAdhesion",
    "peakAbsActivity",
    "peakEngineDragControlActivity",
    "peakForwardSpeedMps",
    "peakLateralAccelerationMps2",
    "peakLongitudinalAccelerationMps2",
    "peakReverseSpeedMps",
    "peakTireSlip",
    "peakTractionControlActivity",
    "peakYawLimiterActivity",
    "peakYawRateRadiansPerSecond",
    "suspensionQuietSeconds",
    "suspensionSampleCount",
  ])) return false;
  const calibration = value as Record<string, unknown>;
  return [
    "brakingDistanceMeters",
    "brakingSecondsActive",
    "brakingStopSeconds",
    "coastRetentionRatio",
    "coastSecondsActive",
    "directionEngagementSeconds",
    "directionEngagementSecondsActive",
    "forwardLaunchSecondsActive",
    "forwardThirtyFivePercentSeconds",
    "reverseFifteenPercentSeconds",
    "reverseLaunchSecondsActive",
    "steeringResponseSeconds",
    "steeringSecondsActive",
    "suspensionSettleSecondsActive",
    "suspensionSettleSecondsAfterImpact",
  ].every((field) => isFiniteOrNull(calibration[field]))
    && ["directionEngagementTarget", "lastDriveDirection"].every((field) => (
      calibration[field] === -1
      || calibration[field] === 0
      || calibration[field] === 1
    ))
    && [
      "maximumSuspensionCompression",
      "maximumWheelLoadNewtons",
      "minimumSuspensionCompression",
      "minimumWheelLoadNewtons",
      "peakEngineDragControlActivityByWheel",
      "peakSuspensionVelocity",
      "peakTractionControlActivityByWheel",
    ].every((field) => isFiniteWheelTuple(calibration[field]));
}

function isChassisTransfer(value: unknown) {
  const phases = new Set(["apply", "hold", "release"]);
  return hasFiniteFields(value, [
    "absActivity",
    "brakePressure",
    "centerDifferentialCouplingForce",
    "directionChangeSeconds",
    "driveDirection",
    "engineDragControlActivity",
    "frontLateralAcceleration",
    "frontDifferentialCouplingForce",
    "frontDrivelineForce",
    "frontLeftBrakePressure",
  "frontLeftLateralForce",
  "frontLeftGripMultiplier",
    "frontLeftLoadNewtons",
    "frontLeftLongitudinalForce",
    "frontLeftLongitudinalSlip",
    "frontLeftSlipAngle",
    "frontLeftWheelSpeed",
    "frontLeftWheelAcceleration",
    "frontLongitudinalAcceleration",
    "frontLongitudinalSlip",
    "frontSlipAngle",
    "frontWheelSpeed",
  "frontRightLateralForce",
  "frontRightGripMultiplier",
    "frontRightBrakePressure",
    "frontRightLoadNewtons",
    "frontRightLongitudinalForce",
    "frontRightLongitudinalSlip",
    "frontRightSlipAngle",
    "frontRightWheelSpeed",
    "frontRightWheelAcceleration",
    "heading",
    "lateralAcceleration",
    "lateralTireSlip",
    "lateralLoadTransfer",
    "lateralLoadTransferVelocity",
    "longitudinalAcceleration",
    "longitudinalTireSlip",
    "longitudinalLoadTransfer",
    "longitudinalLoadTransferVelocity",
    "rearLateralAcceleration",
    "rearDifferentialCouplingForce",
    "rearDrivelineForce",
    "rearLeftBrakePressure",
  "rearLeftLateralForce",
  "rearLeftGripMultiplier",
    "rearLeftLoadNewtons",
    "rearLeftLongitudinalForce",
    "rearLeftLongitudinalSlip",
    "rearLeftSlipAngle",
    "rearLeftWheelSpeed",
    "rearLeftWheelAcceleration",
    "rearLongitudinalAcceleration",
    "rearLongitudinalSlip",
    "rearSlipAngle",
    "rearWheelSpeed",
  "rearRightLateralForce",
  "rearRightGripMultiplier",
    "rearRightBrakePressure",
    "rearRightLoadNewtons",
    "rearRightLongitudinalForce",
    "rearRightLongitudinalSlip",
    "rearRightSlipAngle",
    "rearRightWheelSpeed",
    "rearRightWheelAcceleration",
    "steeringAngle",
    "steeringCommand",
    "steeringVelocity",
    "tireSlip",
    "throttlePedal",
    "tractionControlActivity",
    "velocityX",
    "velocityY",
    "yawRate",
  ])
    && hasOptionalFiniteFields(value, [
      "aerodynamicDragLossJ",
      "brakeLossJ",
      "differentialCoastBlend",
      "differentialCouplingLossJ",
      "longitudinalContactReactionForceNewtons",
      "frontLeftAdhesion",
      "frontLeftAligningMomentNm",
      "frontLeftLateralAdhesion",
      "frontLeftLateralDeflectionM",
      "frontLeftLongitudinalAdhesion",
      "frontLeftLongitudinalDeflectionM",
      "frontLongitudinalSlipPeak",
      "frontLongitudinalSlipRms",
      "frontLeftEngineDragControlActivity",
      "frontLeftSuspensionCompression",
      "frontLeftTractionControlActivity",
      "frontLeftSuspensionVelocity",
      "frontLeftTireDemand",
      "frontRightAdhesion",
      "frontRightAligningMomentNm",
      "frontRightLateralAdhesion",
      "frontRightLateralDeflectionM",
      "frontRightLongitudinalAdhesion",
      "frontRightLongitudinalDeflectionM",
      "frontRightEngineDragControlActivity",
      "frontRightSuspensionCompression",
      "frontRightTractionControlActivity",
      "frontRightSuspensionVelocity",
      "frontRightTireDemand",
      "rearLeftAdhesion",
      "rearLeftLateralAdhesion",
      "rearLeftLateralDeflectionM",
      "rearLeftLongitudinalAdhesion",
      "rearLeftLongitudinalDeflectionM",
      "rearLongitudinalSlipPeak",
      "rearLongitudinalSlipRms",
      "rearLeftEngineDragControlActivity",
      "rearLeftSuspensionCompression",
      "rearLeftTractionControlActivity",
      "rearLeftSuspensionVelocity",
      "rearLeftTireDemand",
      "rearRightAdhesion",
      "rearRightLateralAdhesion",
      "rearRightLateralDeflectionM",
      "rearRightLongitudinalAdhesion",
      "rearRightLongitudinalDeflectionM",
      "rearRightEngineDragControlActivity",
      "rearRightSuspensionCompression",
      "rearRightTractionControlActivity",
      "rearRightSuspensionVelocity",
      "rearRightTireDemand",
      "restSeconds",
      "rollingResistanceLossJ",
      "rollingResistanceMultiplier",
      "yawLimiterActivity",
    ])
    && [-1, 0, 1].includes((value as CarChassisState).driveDirection)
    && ((value as Partial<CarChassisState>).longitudinalPhase === undefined
      || [
        "neutral", "coasting-forward", "coasting-reverse",
        "driving-forward", "driving-reverse",
        "braking-to-forward", "braking-to-reverse",
        "engaging-forward", "engaging-reverse", "service-braking",
      ].includes((value as CarChassisState).longitudinalPhase ?? "neutral"))
    && ((value as Partial<CarChassisState>).differentialCoastEngaged === undefined
      || typeof (value as Partial<CarChassisState>).differentialCoastEngaged === "boolean")
    && ((value as Partial<CarChassisState>).dynamicsCorrectionActive === undefined
      || typeof (value as Partial<CarChassisState>).dynamicsCorrectionActive === "boolean")
    && (
      (value as Partial<CarChassisState>).restState === undefined
      || ["held", "rolling", "settling"].includes(
        (value as CarChassisState).restState,
      )
    )
    && phases.has((value as CarChassisState).frontLeftAbsPhase)
    && phases.has((value as CarChassisState).frontRightAbsPhase)
    && phases.has((value as CarChassisState).rearLeftAbsPhase)
    && phases.has((value as CarChassisState).rearRightAbsPhase);
}

function isDrivetrainTransfer(value: unknown) {
  if (!hasFiniteFields(value, [
    "clutch",
    "engineLoad",
    "forwardGear",
    "lastLoad",
    "lastSpeedRatio",
    "limiterPhase",
    "overrun",
    "rpmVelocity",
    "rapidRpmRecoverySeconds",
    "rpm",
    "shiftCandidateSeconds",
    "shiftCooldownSeconds",
    "shiftSecondsRemaining",
  ])) return false;
  const drivetrain = value as CarDrivetrainState;
  return typeof drivetrain.limiterActive === "boolean"
    && hasOptionalFiniteFields(value, [
      "converterTargetRpm",
      "converterTurbineRpm",
      "coupledTargetRpm",
      "converterTurbineRpmVelocity",
      "directionCoupling",
      "lastWheelForceNewtons",
      "lockup",
      "reactionTorqueNm",
      "shaftTorqueNm",
      "shaftDirection",
      "shaftMechanicalReduction",
      "lastShaftDampingLossJ",
      "lastSynchronizerLossJ",
      "lastShiftOverlapLossJ",
      "lastCollisionDrivetrainLossJ",
      "shaftTwistRadians",
      "shiftSynchronizationHoldSeconds",
      "transmittedCrankTorqueNm",
    ])
    && (drivetrain.lockupEngaged === undefined
      || typeof drivetrain.lockupEngaged === "boolean")
    && (drivetrain.shaftDirection === undefined
      || [-1, 0, 1].includes(drivetrain.shaftDirection))
    && (drivetrain.shiftCandidateGear === null || Number.isFinite(drivetrain.shiftCandidateGear))
    && (drivetrain.shiftSourceGear === undefined
      || drivetrain.shiftSourceGear === null
      || Number.isFinite(drivetrain.shiftSourceGear))
    && (drivetrain.shiftTargetGear === null || Number.isFinite(drivetrain.shiftTargetGear));
}

function isDrivetrainOutputTransfer(value: unknown) {
  if (!hasFiniteFields(value, [
    "clutch",
    "clutchSlipRpm",
    "decelerationRate",
    "direction",
    "gear",
    "load",
    "limiterCut",
    "overrun",
    "roadSpeedKph",
    "rpm",
    "rpmVelocity",
    "shiftProgress",
    "speedRatio",
    "steering",
    "targetRpm",
    "throttle",
    "torqueFactor",
    "wheelForceNewtons",
  ])) return false;
  const output = value as CarDrivetrainOutput;
  return hasOptionalFiniteFields(value, [
    "transmittedCrankTorqueNm",
    "shaftDampingLossJ",
    "shaftTorqueNm",
    "shaftTwistRadians",
    "synchronizationErrorRpm",
    "synchronizerLossJ",
    "shiftOverlapLossJ",
    "lockup",
  ])
    && ["abruptStop", "braking", "hardDeceleration", "rapidRpmRecovery",
    "serviceBraking", "shifted"].every(
      (field) => typeof output[field as keyof CarDrivetrainOutput] === "boolean",
    )
    && [-1, 0, 1].includes(output.direction)
    && ["pending", "shifting", "steady"].includes(output.shiftState);
}

function isCarVariant(value: unknown): value is CarVariant {
  return value === "city" || value === "rally" || value === "taxi";
}

export function readSelectedCarVariant(): CarVariant {
  if (typeof window === "undefined") return "city";
  const inputWindow = window as CarInputWindow;
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(VARIANT_STORAGE_KEY);
  } catch {
    // In-memory selection still survives same-document routing.
  }
  if (isCarVariant(stored)) {
    inputWindow.__portfolioCarVariant = stored;
    return stored;
  }
  if (isCarVariant(inputWindow.__portfolioCarVariant)) {
    return inputWindow.__portfolioCarVariant;
  }
  return "city";
}

export function storeSelectedCarVariant(variant: CarVariant) {
  const inputWindow = window as CarInputWindow;
  inputWindow.__portfolioCarVariant = variant;
  try {
    window.sessionStorage.setItem(VARIANT_STORAGE_KEY, variant);
  } catch {
    // Same-document routing retains the in-memory selection.
  }
}

export function createCarRouteTransferId() {
  transferSequence += 1;
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${transferSequence.toString(36)}`;
}

export function getCarRouteTarget(href = window.location.href) {
  const target = new URL(href, window.location.href);
  return `${target.pathname}${target.search}${target.hash}`;
}

function removeTransfer() {
  const inputWindow = window as CarInputWindow;
  delete inputWindow.__portfolioCarRouteTransfer;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The in-memory copy remains authoritative when storage is unavailable.
  }
}

function readTransfer(): CarRouteTransfer | null {
  const inputWindow = window as CarInputWindow;
  try {
    let value: string | null = null;
    try {
      value = window.sessionStorage.getItem(STORAGE_KEY);
    } catch {
      // Hardened browsing modes can reject all storage access.
    }
    value ??= inputWindow.__portfolioCarRouteTransfer ?? null;
    if (!value) return null;
    const transfer = JSON.parse(value) as Partial<CarRouteTransfer>;
    const age = Date.now() - (transfer.createdAt ?? Number.NaN);
    if (
      typeof transfer.id !== "string"
      || !transfer.id
      || typeof transfer.targetRoute !== "string"
      || !transfer.targetRoute.startsWith("/")
      || (transfer.entryEdge !== "left" && transfer.entryEdge !== "right")
      || !Number.isFinite(transfer.screenY)
      || !Number.isFinite(transfer.verticalProgress)
      || !Number.isFinite(transfer.heading)
      || !Number.isFinite(transfer.speed)
      || (transfer.calibration !== undefined
        && !isCalibrationTransfer(transfer.calibration))
      || !["city", "rally", "taxi"].includes(transfer.variant ?? "")
      || !Number.isFinite(transfer.createdAt)
      || (transfer.chassis !== undefined && !isChassisTransfer(transfer.chassis))
      || (transfer.drivetrain !== undefined && !isDrivetrainTransfer(transfer.drivetrain))
      || (transfer.drivetrainOutput !== undefined
        && !isDrivetrainOutputTransfer(transfer.drivetrainOutput))
      || (transfer.visual !== undefined && !hasFiniteFields(transfer.visual, ["wheelRotation"]))
      || (transfer.visual?.pitch !== undefined
        && !Number.isFinite(transfer.visual.pitch))
      || (transfer.visual?.previousSpeed !== undefined
        && !Number.isFinite(transfer.visual.previousSpeed))
      || (transfer.visual?.roll !== undefined
        && !Number.isFinite(transfer.visual.roll))
      || (transfer.visual?.frontWheelRotation !== undefined
        && !Number.isFinite(transfer.visual.frontWheelRotation))
      || (transfer.visual?.frontLeftWheelRotation !== undefined
        && !Number.isFinite(transfer.visual.frontLeftWheelRotation))
      || (transfer.visual?.frontRightWheelRotation !== undefined
        && !Number.isFinite(transfer.visual.frontRightWheelRotation))
      || (transfer.visual?.rearWheelRotation !== undefined
        && !Number.isFinite(transfer.visual.rearWheelRotation))
      || (transfer.visual?.rearLeftWheelRotation !== undefined
        && !Number.isFinite(transfer.visual.rearLeftWheelRotation))
      || (transfer.visual?.rearRightWheelRotation !== undefined
        && !Number.isFinite(transfer.visual.rearRightWheelRotation))
      || (transfer.visual?.pitchVelocity !== undefined
        && !Number.isFinite(transfer.visual.pitchVelocity))
      || (transfer.visual?.rollVelocity !== undefined
        && !Number.isFinite(transfer.visual.rollVelocity))
      || age < -MAX_TRANSFER_AGE
      || age > MAX_TRANSFER_AGE
    ) {
      removeTransfer();
      return null;
    }
    return transfer as CarRouteTransfer;
  } catch {
    removeTransfer();
    return null;
  }
}

export function hasCarRouteTransfer(routeTarget = getCarRouteTarget()) {
  return readTransfer()?.targetRoute === routeTarget;
}

export function consumeCarRouteTransfer(routeTarget = getCarRouteTarget()) {
  const transfer = readTransfer();
  if (!transfer || transfer.targetRoute !== routeTarget) return null;
  removeTransfer();
  return transfer;
}

export function storeCarRouteTransfer(
  href: string,
  transfer: Omit<CarRouteTransfer, "targetRoute" | "createdAt">,
) {
  const inputWindow = window as CarInputWindow;
  storeSelectedCarVariant(transfer.variant);
  const value = JSON.stringify({
    ...transfer,
    targetRoute: getCarRouteTarget(href),
    createdAt: Date.now(),
  } satisfies CarRouteTransfer);
  inputWindow.__portfolioCarRouteTransfer = value;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Same-document routing can continue from the in-memory copy.
  }
}

export function clearCarRouteTransfer(expectedId?: string) {
  if (expectedId && readTransfer()?.id !== expectedId) return false;
  removeTransfer();
  return true;
}
