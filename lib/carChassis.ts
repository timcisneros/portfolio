import type {
  CarDifferentialCalibration,
  CarEngineStyle,
} from "./carEngineStyles";
import { analyzeCarImpact } from "./carCollision";
import type { CarImpactContact } from "./carCollision";
import {
  getCarMaximumBrakeForceNewtons,
  getCarMaximumPageSpeed,
  getCarRoadResistanceForceNewtons,
} from "./carEngineStyles";
import {
  getCarGeometryFrame,
  getCarYawInertiaKgM2,
} from "./carGeometry";

export type CarChassisState = {
  absActivity: number;
  brakePressure: number;
  brakeLossJ?: number;
  centerDifferentialCouplingForce: number;
  directionChangeSeconds: number;
  differentialCoastBlend?: number;
  differentialCoastEngaged?: boolean;
  differentialCouplingLossJ?: number;
  dynamicsCorrectionActive?: boolean;
  longitudinalContactReactionForceNewtons: number;
  longitudinalPhase?: CarLongitudinalPhase;
  driveDirection: -1 | 0 | 1;
  engineDragControlActivity: number;
  frontLeftEngineDragControlActivity: number;
  frontRightEngineDragControlActivity: number;
  rearLeftEngineDragControlActivity: number;
  rearRightEngineDragControlActivity: number;
  frontLateralAcceleration: number;
  frontDifferentialCouplingForce: number;
  frontDrivelineForce: number;
  frontLeftBrakePressure: number;
  frontLeftEbdPressure: number;
  frontLeftAbsPhase: CarAbsPhase;
  frontLeftAdhesion: number;
  frontLeftLateralAdhesion: number;
  frontLeftLongitudinalAdhesion: number;
  frontLeftTireDemand: number;
  frontLeftLateralForce: number;
  frontLeftAligningMomentNm?: number;
  frontLeftLateralDeflectionM: number;
  frontLeftGripMultiplier: number;
  frontLeftLoadNewtons: number;
  frontLeftSuspensionCompression: number;
  frontLeftSuspensionVelocity: number;
  frontLeftLongitudinalDeflectionM: number;
  frontLeftLongitudinalForce: number;
  frontLeftLongitudinalSlip: number;
  frontLeftSlipAngle: number;
  frontLeftWheelSpeed: number;
  frontLeftWheelAcceleration: number;
  frontLongitudinalAcceleration: number;
  frontLongitudinalSlip: number;
  frontLongitudinalSlipPeak: number;
  frontLongitudinalSlipRms: number;
  frontSlipAngle: number;
  frontWheelSpeed: number;
  frontRightLateralForce: number;
  frontRightAligningMomentNm?: number;
  frontRightLateralDeflectionM: number;
  frontRightAdhesion: number;
  frontRightLateralAdhesion: number;
  frontRightLongitudinalAdhesion: number;
  frontRightTireDemand: number;
  frontRightGripMultiplier: number;
  frontRightBrakePressure: number;
  frontRightEbdPressure: number;
  frontRightAbsPhase: CarAbsPhase;
  frontRightLoadNewtons: number;
  frontRightSuspensionCompression: number;
  frontRightSuspensionVelocity: number;
  frontRightLongitudinalDeflectionM: number;
  frontRightLongitudinalForce: number;
  frontRightLongitudinalSlip: number;
  frontRightSlipAngle: number;
  frontRightWheelSpeed: number;
  frontRightWheelAcceleration: number;
  heading: number;
  lateralAcceleration: number;
  lateralTireSlip: number;
  lateralLoadTransfer: number;
  lateralLoadTransferVelocity: number;
  longitudinalAcceleration: number;
  longitudinalTireSlip: number;
  longitudinalLoadTransfer: number;
  longitudinalLoadTransferVelocity: number;
  aerodynamicDragLossJ?: number;
  rollingResistanceLossJ?: number;
  rollingResistanceMultiplier?: number;
  rearLateralAcceleration: number;
  rearDifferentialCouplingForce: number;
  rearDrivelineForce: number;
  rearLeftBrakePressure: number;
  rearLeftEbdPressure: number;
  rearLeftAbsPhase: CarAbsPhase;
  rearLeftAdhesion: number;
  rearLeftLateralAdhesion: number;
  rearLeftLongitudinalAdhesion: number;
  rearLeftTireDemand: number;
  rearLeftLateralForce: number;
  rearLeftLateralDeflectionM: number;
  rearLeftGripMultiplier: number;
  rearLeftLoadNewtons: number;
  rearLeftSuspensionCompression: number;
  rearLeftSuspensionVelocity: number;
  rearLeftLongitudinalDeflectionM: number;
  rearLeftLongitudinalForce: number;
  rearLeftLongitudinalSlip: number;
  rearLeftSlipAngle: number;
  rearLeftWheelSpeed: number;
  rearLeftWheelAcceleration: number;
  rearLongitudinalAcceleration: number;
  rearLongitudinalSlip: number;
  rearLongitudinalSlipPeak: number;
  rearLongitudinalSlipRms: number;
  rearSlipAngle: number;
  rearWheelSpeed: number;
  rearRightLateralForce: number;
  rearRightLateralDeflectionM: number;
  rearRightAdhesion: number;
  rearRightLateralAdhesion: number;
  rearRightLongitudinalAdhesion: number;
  rearRightTireDemand: number;
  rearRightGripMultiplier: number;
  rearRightBrakePressure: number;
  rearRightEbdPressure: number;
  rearRightAbsPhase: CarAbsPhase;
  rearRightLoadNewtons: number;
  rearRightSuspensionCompression: number;
  rearRightSuspensionVelocity: number;
  rearRightLongitudinalDeflectionM: number;
  rearRightLongitudinalForce: number;
  rearRightLongitudinalSlip: number;
  rearRightSlipAngle: number;
  rearRightWheelSpeed: number;
  rearRightWheelAcceleration: number;
  restSeconds: number;
  restState: "held" | "rolling" | "settling";
  steeringAngle: number;
  steeringCommand: number;
  steeringVelocity: number;
  tireSlip: number;
  throttlePedal: number;
  tractionControlActivity: number;
  frontLeftTractionControlActivity: number;
  frontRightTractionControlActivity: number;
  rearLeftTractionControlActivity: number;
  rearRightTractionControlActivity: number;
  velocityX: number;
  velocityY: number;
  yawLimiterActivity: number;
  yawRate: number;
};

export type CarAbsPhase = "apply" | "hold" | "release";

export type CarContactConstraint = {
  surfaceAngularVelocity?: number;
  surfaceContactOffset?: { x: number; y: number };
  surfaceMassKg?: number;
  surfaceVelocity?: { x: number; y: number };
  surfaceYawInertiaKgM2?: number;
  contactOffset?: { x: number; y: number };
  dynamicFriction?: number;
  friction?: number;
  staticFriction?: number;
  normal: { x: number; y: number };
};

export type CarChassisInput = {
  driverThrottle?: number;
  longitudinalTransition?: CarLongitudinalTransition;
  contactConstraints?: readonly CarContactConstraint[];
  deltaSeconds: number;
  opposingPedals?: boolean;
  parking?: boolean;
  reducedMotion?: boolean;
  steering: number;
  /** Predicted same-step contact state used only by steering-rack feedback. */
  steeringForcePreview?: CarChassisState;
  throttle: number;
  wheelGripMultipliers?: Partial<Record<
    "frontLeft" | "frontRight" | "rearLeft" | "rearRight",
    number
  >>;
  wheelRollingResistanceMultipliers?: Partial<Record<
    "frontLeft" | "frontRight" | "rearLeft" | "rearRight",
    number
  >>;
  wheelForceNewtons: number;
};

export type CarChassisOutput = {
  contactConstraintResponses: Array<{
    normalImpulse: number;
    surfaceAngularVelocity: number;
    surfaceVelocity: { x: number; y: number };
    tangentImpulse: number;
  }>;
  contactConstraintLossJ: number;
  displacementX: number;
  displacementY: number;
  lateralSpeed: number;
  serviceBraking: boolean;
  signedSpeed: number;
  state: CarChassisState;
};

export type CarLongitudinalIntent = {
  changingDirection: boolean;
  demandedDirection: -1 | 0 | 1;
  directionOpposesMotion: boolean;
  directionStillDisengaged: boolean;
  movingDirection: -1 | 0 | 1;
  serviceBraking: boolean;
};

export type CarLongitudinalPhase =
  | "neutral"
  | "coasting-forward"
  | "coasting-reverse"
  | "driving-forward"
  | "driving-reverse"
  | "braking-to-forward"
  | "braking-to-reverse"
  | "engaging-forward"
  | "engaging-reverse"
  | "service-braking";

export type CarLongitudinalTransition = CarLongitudinalIntent & {
  directionChangeSeconds: number;
  engagedDirection: -1 | 0 | 1;
  phase: CarLongitudinalPhase;
  releaseBrakePressure: boolean;
};

export type CarCombinedTireResponse = {
  availableGrip: number;
  normalizedDemand: number;
  scale: number;
  slidingGripRatio: number;
};

export type CarSurfaceCollisionOptions = {
  accumulatedNormalImpulse?: number;
  accumulatedTangentImpulse?: number;
  contactOffset?: { x: number; y: number };
  dynamicFriction?: number;
  friction?: number;
  massKg?: number;
  pixelsPerMeter?: number;
  restitution?: number;
  staticFriction?: number;
  surfaceAngularVelocity?: number;
  surfaceContactOffset?: { x: number; y: number };
  surfaceMassKg?: number;
  surfaceVelocity?: { x: number; y: number };
  surfaceYawInertiaKgM2?: number;
  warmStartScale?: number;
  yawInertiaKgM2?: number;
};

export type CarSurfaceContactResult = {
  normalImpulse: number;
  state: CarChassisState;
  surfaceAngularVelocity: number;
  surfaceVelocity: { x: number; y: number };
  tangentImpulse: number;
};

export type CarContactManifoldContact = {
  normal: { x: number; y: number };
  options?: CarSurfaceCollisionOptions;
};

export type CarContactManifoldResult = {
  contacts: Array<{
    normalImpulse: number;
    surfaceAngularVelocity: number;
    surfaceVelocity: { x: number; y: number };
    tangentImpulse: number;
  }>;
  state: CarChassisState;
};

export type CarPhysicsPose = {
  heading: number;
  x: number;
  y: number;
};

const TAU = Math.PI * 2;
const DEPTH_SCREEN_SCALE = Math.sin(TAU / 8);
const MAX_COLLISION_YAW_RATE = 1.45;
const MAX_CHASSIS_YAW_RATE = 5;
export const DEFAULT_CAR_WORLD_PIXELS_PER_METER = 58;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}


function softClampMagnitude(
  value: number,
  softLimit: number,
  hardLimit: number,
) {
  const magnitude = Math.abs(value);
  if (magnitude <= softLimit) return value;
  const span = Math.max(0.0001, hardLimit - softLimit);
  const softenedMagnitude = softLimit
    + span * (1 - Math.exp(-(magnitude - softLimit) / span));
  return Math.sign(value) * Math.min(hardLimit, softenedMagnitude);
}
function smooth01(value: number) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function approach(current: number, target: number, amount: number) {
  if (current < target) return Math.min(target, current + amount);
  if (current > target) return Math.max(target, current - amount);
  return target;
}

export function advanceCarPedalInput(
  previousPedal: number,
  rawTarget: number,
  pedals: CarEngineStyle["controls"]["pedals"],
  deltaSeconds: number,
) {
  const current = clamp(previousPedal, -1, 1);
  const target = clamp(rawTarget, -1, 1);
  const reversing = current !== 0 && target !== 0
    && Math.sign(current) !== Math.sign(target);
  const rate = target === 0
    ? pedals.throttleReleaseRate
    : reversing
      ? pedals.throttleReversalRate
      : pedals.throttleRiseRate;
  return approach(current, target, Math.max(0, rate) * deltaSeconds);
}

export function getCarLongitudinalIntent(
  state: Pick<CarChassisState, "driveDirection" | "velocityX" | "velocityY" | "heading">,
  rawThrottle: number,
  options: {
    controls: CarEngineStyle["controls"];
    opposingPedals?: boolean;
    parking?: boolean;
    pixelsPerMeter?: number;
  },
): CarLongitudinalIntent {
  const throttle = clamp(rawThrottle, -1, 1);
  const { forward } = getCarWorldAxes(state.heading);
  const longitudinalSpeed = state.velocityX * forward.x + state.velocityY * forward.y;
  const demandedDirection: -1 | 0 | 1 = throttle < -0.02
    ? -1
    : throttle > 0.02 ? 1 : 0;
  const stopSpeed = options.controls.direction.stopSpeedMps
    * (options.pixelsPerMeter ?? DEFAULT_CAR_WORLD_PIXELS_PER_METER);
  const movingDirection: -1 | 0 | 1 = longitudinalSpeed < -stopSpeed
    ? -1
    : longitudinalSpeed > stopSpeed ? 1 : 0;
  const directionOpposesMotion = demandedDirection !== 0
    && movingDirection !== 0
    && demandedDirection !== movingDirection;
  const changingDirection = demandedDirection !== 0
    && state.driveDirection !== 0
    && demandedDirection !== state.driveDirection;
  const directionStillDisengaged = changingDirection;
  return {
    changingDirection,
    demandedDirection,
    directionOpposesMotion,
    directionStillDisengaged,
    movingDirection,
    serviceBraking: options.parking === true
      || options.opposingPedals === true
      || directionOpposesMotion
      || directionStillDisengaged,
  };
}

export function advanceCarLongitudinalControl(
  state: CarChassisState,
  rawThrottle: number,
  _deltaSeconds: number,
  options: {
    controls: CarEngineStyle["controls"];
    opposingPedals?: boolean;
    parking?: boolean;
    pixelsPerMeter?: number;
  },
): CarLongitudinalTransition {
  const initial = getCarLongitudinalIntent(state, rawThrottle, options);
  const { demandedDirection, movingDirection } = initial;
  const directionCaptureReady = initial.changingDirection
    && state.restState === "held";
  let engagedDirection = state.driveDirection;
  let directionChangeSeconds = 0;
  let releaseBrakePressure = false;
  let phase: CarLongitudinalPhase;

  if (options.parking || options.opposingPedals) {
    phase = "service-braking";
  } else if (demandedDirection === 0) {
    phase = movingDirection > 0
      ? "coasting-forward"
      : movingDirection < 0 ? "coasting-reverse" : "neutral";
  } else if (demandedDirection === engagedDirection) {
    phase = demandedDirection > 0 ? "driving-forward" : "driving-reverse";
  } else if (directionCaptureReady || engagedDirection === 0) {
    engagedDirection = demandedDirection;
    phase = demandedDirection > 0 ? "driving-forward" : "driving-reverse";
    releaseBrakePressure = true;
  } else {
    phase = demandedDirection > 0 ? "braking-to-forward" : "braking-to-reverse";
  }

  const nextState = { ...state, driveDirection: engagedDirection };
  const nextIntent = getCarLongitudinalIntent(nextState, rawThrottle, options);
  const serviceBraking = phase === "service-braking"
    || phase === "braking-to-forward"
    || phase === "braking-to-reverse";
  return {
    ...nextIntent,
    directionChangeSeconds,
    engagedDirection,
    phase,
    releaseBrakePressure,
    serviceBraking,
  };
}

/**
 * Resolve both tire axes through one friction envelope. Keeping the response
 * vector-based prevents steering and drive/brake demand from independently
 * claiming the same contact-patch grip.
 */
export function getCarCombinedTireResponse(
  normalizedLongitudinal: number,
  normalizedLateral: number,
  longitudinalSlidingGripRatio: number,
  lateralSlidingGripRatio: number,
  longitudinalAdhesion: number,
  lateralAdhesion: number,
  breakawaySharpness: number,
  shoulderDemand = 0.82,
  peakDemand = 1.14,
  slidingTransitionWidth = 0.46,
): CarCombinedTireResponse {
  const longitudinalDemand = Math.abs(normalizedLongitudinal);
  const lateralDemand = Math.abs(normalizedLateral);
  const normalizedDemand = Math.hypot(longitudinalDemand, lateralDemand);
  const effectiveLongitudinalSlidingGrip = longitudinalSlidingGripRatio
    + (1 - longitudinalSlidingGripRatio)
      * clamp(longitudinalAdhesion, 0, 1);
  const effectiveLateralSlidingGrip = lateralSlidingGripRatio
    + (1 - lateralSlidingGripRatio) * clamp(lateralAdhesion, 0, 1);
  const longitudinalShare = normalizedDemand > 0.0001
    ? longitudinalDemand / normalizedDemand
    : 0;
  const lateralShare = normalizedDemand > 0.0001
    ? lateralDemand / normalizedDemand
    : 0;
  const slidingEllipseRadius = Math.hypot(
    longitudinalShare / Math.max(0.05, effectiveLongitudinalSlidingGrip),
    lateralShare / Math.max(0.05, effectiveLateralSlidingGrip),
  );
  const effectiveSlidingGripRatio = slidingEllipseRadius > 0.0001
    ? 1 / slidingEllipseRadius
    : 1;
  // The linear carcass region rolls into a rounded peak instead of meeting the
  // sliding branch at a sharp corner. A cubic Hermite shoulder preserves unit
  // slope at normal demand and reaches zero slope at peak grip.
  const boundedShoulderDemand = clamp(shoulderDemand, 0.45, 0.98);
  const boundedPeakDemand = Math.max(
    boundedShoulderDemand + 0.04,
    peakDemand,
  );
  const boundedTransitionWidth = Math.max(0.08, slidingTransitionWidth);
  let availableGrip: number;
  if (normalizedDemand <= boundedShoulderDemand) {
    availableGrip = normalizedDemand;
  } else if (normalizedDemand < boundedPeakDemand) {
    const span = boundedPeakDemand - boundedShoulderDemand;
    const t = (normalizedDemand - boundedShoulderDemand) / span;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    availableGrip = h00 * boundedShoulderDemand
      + h10 * span
      + h01;
  } else {
    // Squaring excess demand gives the peak and sliding branch matching first
    // derivatives, removing the force step that felt like sudden breakaway.
    const slidingProgress = (normalizedDemand - boundedPeakDemand)
      / boundedTransitionWidth;
    availableGrip = effectiveSlidingGripRatio
      + (1 - effectiveSlidingGripRatio) * Math.exp(
          -breakawaySharpness * slidingProgress * slidingProgress,
        );
  }
  return {
    availableGrip,
    normalizedDemand,
    scale: normalizedDemand > 0.0001
      ? availableGrip / normalizedDemand
      : 1,
    slidingGripRatio: effectiveSlidingGripRatio,
  };
}

function stepDampedAxis(
  value: number,
  velocity: number,
  target: number,
  angularFrequency: number,
  dampingRatio: number,
  deltaSeconds: number,
) {
  // Backward-Euler spring integration is unconditionally stable at the fixed
  // step and cannot add bounce when a collision or hard pedal edge moves the
  // target abruptly.
  const stiffness = angularFrequency * angularFrequency;
  const damping = 2 * dampingRatio * angularFrequency;
  const denominator = 1 + damping * deltaSeconds
    + stiffness * deltaSeconds * deltaSeconds;
  const nextVelocity = (
    velocity + stiffness * deltaSeconds * (target - value)
  ) / denominator;
  return {
    value: value + nextVelocity * deltaSeconds,
    velocity: nextVelocity,
  };
}

export function wrapCarHeading(heading: number) {
  return ((heading + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

export function interpolateCarPhysicsPose(
  previous: CarPhysicsPose,
  current: CarPhysicsPose,
  alpha: number,
): CarPhysicsPose {
  const amount = clamp(alpha, 0, 1);
  const headingDelta = wrapCarHeading(current.heading - previous.heading);
  return {
    heading: wrapCarHeading(previous.heading + headingDelta * amount),
    x: previous.x + (current.x - previous.x) * amount,
    y: previous.y + (current.y - previous.y) * amount,
  };
}

export function getCarScreenAxes(heading: number) {
  const unscaledX = Math.cos(heading);
  const unscaledY = Math.sin(heading) * DEPTH_SCREEN_SCALE;
  const length = Math.hypot(unscaledX, unscaledY) || 1;
  const forward = { x: unscaledX / length, y: unscaledY / length };
  return {
    forward,
    right: { x: -forward.y, y: forward.x },
  };
}

export function getCarWorldAxes(heading: number) {
  const forward = { x: Math.cos(heading), y: Math.sin(heading) };
  return {
    forward,
    right: { x: -forward.y, y: forward.x },
  };
}

export function projectCarWorldVector(vector: { x: number; y: number }) {
  return { x: vector.x, y: vector.y * DEPTH_SCREEN_SCALE };
}

function unprojectCarScreenNormal(normal: { x: number; y: number }) {
  // A screen-space collision boundary is the level set n·Sx = c, where S
  // is the isometric projection. Its world-space normal is therefore Sᵀn.
  const x = normal.x;
  const y = normal.y * DEPTH_SCREEN_SCALE;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function unprojectCarScreenVector(vector: { x: number; y: number }) {
  return { x: vector.x, y: vector.y / DEPTH_SCREEN_SCALE };
}

/**
 * Split-impulse position correction using the same world metric as the
 * velocity manifold. Contacts remain screen-authored at the DOM boundary, but
 * their normals, offsets and penetration depths are converted together before
 * solving so page projection cannot skew wheelbase or yaw leverage.
 */
export function projectCarContactPositionManifold(
  center: { x: number; y: number },
  heading: number,
  contacts: readonly {
    contactOffset: { x: number; y: number };
    normal: { x: number; y: number };
    penetration: number;
    surfaceContactOffset?: { x: number; y: number };
    surfaceMassKg?: number;
    surfaceMaximumDisplacement?: number;
    surfaceMaximumRotation?: number;
    surfaceOffset?: { x: number; y: number };
    surfaceRotation?: number;
    surfaceYawInertiaKgM2?: number;
  }[],
  options: {
    massKg?: number;
    pixelsPerMeter?: number;
    yawInertiaKgM2?: number;
    maximumAngularCorrectionRadians?: number;
  } = {},
) {
  if (contacts.length === 0) {
    return { center, heading, surfaceCorrections: [] };
  }
  const pixelsPerMeter = Math.max(1, options.pixelsPerMeter ?? 1);
  const massKg = Math.max(1, options.massKg ?? 1);
  const inverseMass = 1 / massKg;
  const mapped = contacts.map((contact, index) => {
    const rawNormal = {
      x: contact.normal.x,
      y: contact.normal.y * DEPTH_SCREEN_SCALE,
    };
    const normalScale = Math.hypot(rawNormal.x, rawNormal.y) || 1;
    const surfaceMassKg = Math.max(0, contact.surfaceMassKg ?? 0);
    const surfaceYawInertiaKgM2 = Math.max(
      0,
      contact.surfaceYawInertiaKgM2 ?? 0,
    );
    return {
      index,
      contactOffset: unprojectCarScreenVector(contact.contactOffset),
      normal: {
        x: rawNormal.x / normalScale,
        y: rawNormal.y / normalScale,
      },
      penetration: contact.penetration / normalScale,
      surfaceContactOffset: unprojectCarScreenVector(
        contact.surfaceContactOffset ?? { x: 0, y: 0 },
      ),
      surfaceInverseMass: surfaceMassKg > 0 ? 1 / surfaceMassKg : 0,
      surfaceMaximumDisplacement: Math.max(
        0,
        contact.surfaceMaximumDisplacement ?? Number.POSITIVE_INFINITY,
      ),
      surfaceOffset: contact.surfaceOffset ?? { x: 0, y: 0 },
      surfaceMaximumRotation: Math.max(
        0,
        contact.surfaceMaximumRotation ?? Number.POSITIVE_INFINITY,
      ),
      surfaceRotation: contact.surfaceRotation ?? 0,
      surfaceInverseYawInertia: surfaceYawInertiaKgM2 > 0
        ? 1 / (surfaceYawInertiaKgM2 * pixelsPerMeter * pixelsPerMeter)
        : 0,
    };
  });
  const contactRadiusSq = Math.max(
    900,
    ...mapped.map((contact) =>
      contact.contactOffset.x * contact.contactOffset.x
        + contact.contactOffset.y * contact.contactOffset.y
    ),
  );
  const inverseYawInertia = options.yawInertiaKgM2
    ? 1 / (
        Math.max(0.001, options.yawInertiaKgM2)
          * pixelsPerMeter * pixelsPerMeter
      )
    : inverseMass * 0.65 / contactRadiusSq;
  const maximumAngularCorrectionRadians = clamp(
    options.maximumAngularCorrectionRadians ?? 0.055,
    0,
    0.055,
  );
  const ordered = [...mapped].sort((left, right) =>
    Math.atan2(left.normal.y, left.normal.x)
      - Math.atan2(right.normal.y, right.normal.x)
      || right.penetration - left.penetration
  );
  const worldCorrection = { x: 0, y: 0 };
  let angularCorrection = 0;
  const surfaceWorldCorrections = contacts.map(() => ({
    rotation: 0,
    x: 0,
    y: 0,
  }));
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const pass = iteration % 2 === 0 ? ordered : [...ordered].reverse();
    for (const contact of pass) {
      const surfaceCorrection = surfaceWorldCorrections[contact.index];
      const angularLever = contact.contactOffset.x * contact.normal.y
        - contact.contactOffset.y * contact.normal.x;
      const surfaceAngularLever = contact.surfaceContactOffset.x * contact.normal.y
        - contact.surfaceContactOffset.y * contact.normal.x;
      const resolvedDistance = worldCorrection.x * contact.normal.x
        + worldCorrection.y * contact.normal.y
        + angularCorrection * angularLever
        - surfaceCorrection.x * contact.normal.x
        - surfaceCorrection.y * contact.normal.y
        - surfaceCorrection.rotation * surfaceAngularLever;
      const penetrationBeyondSlop = Math.max(0, contact.penetration - 0.2);
      const unresolvedPenetration = penetrationBeyondSlop - resolvedDistance;
      if (unresolvedPenetration <= 0) continue;
      const currentSurfaceCorrection = projectCarWorldVector(
        surfaceCorrection,
      );
      const currentSurfacePosition = {
        x: contact.surfaceOffset.x + currentSurfaceCorrection.x,
        y: contact.surfaceOffset.y + currentSurfaceCorrection.y,
      };
      const outwardSurfaceDirection = projectCarWorldVector({
        x: -contact.normal.x,
        y: -contact.normal.y,
      });
      const surfaceAtTravelLimit = Number.isFinite(
        contact.surfaceMaximumDisplacement,
      )
        && Math.hypot(
          currentSurfacePosition.x,
          currentSurfacePosition.y,
        ) >= contact.surfaceMaximumDisplacement - 0.001
        && currentSurfacePosition.x * outwardSurfaceDirection.x
          + currentSurfacePosition.y * outwardSurfaceDirection.y > 0;
      const effectiveSurfaceInverseMass = surfaceAtTravelLimit
        ? 0
        : contact.surfaceInverseMass;
      const effectiveInverseMass = inverseMass
        + angularLever * angularLever * inverseYawInertia
        + effectiveSurfaceInverseMass
        + surfaceAngularLever * surfaceAngularLever
          * contact.surfaceInverseYawInertia;
      const positionImpulse = unresolvedPenetration
        / Math.max(0.000001, effectiveInverseMass);
      worldCorrection.x += contact.normal.x * positionImpulse * inverseMass;
      worldCorrection.y += contact.normal.y * positionImpulse * inverseMass;
      angularCorrection = clamp(
        angularCorrection
          + angularLever * positionImpulse * inverseYawInertia,
        -maximumAngularCorrectionRadians,
        maximumAngularCorrectionRadians,
      );
      const proposedSurfaceCorrection = {
        x: surfaceCorrection.x
          - contact.normal.x * positionImpulse * effectiveSurfaceInverseMass,
        y: surfaceCorrection.y
          - contact.normal.y * positionImpulse * effectiveSurfaceInverseMass,
      };
      if (Number.isFinite(contact.surfaceMaximumDisplacement)) {
        const proposedScreenCorrection = projectCarWorldVector(
          proposedSurfaceCorrection,
        );
        const proposedSurfacePosition = {
          x: contact.surfaceOffset.x + proposedScreenCorrection.x,
          y: contact.surfaceOffset.y + proposedScreenCorrection.y,
        };
        const proposedDisplacement = Math.hypot(
          proposedSurfacePosition.x,
          proposedSurfacePosition.y,
        );
        if (proposedDisplacement > contact.surfaceMaximumDisplacement) {
          const scale = contact.surfaceMaximumDisplacement
            / Math.max(0.000001, proposedDisplacement);
          const constrainedCorrection = unprojectCarScreenVector({
            x: proposedSurfacePosition.x * scale - contact.surfaceOffset.x,
            y: proposedSurfacePosition.y * scale - contact.surfaceOffset.y,
          });
          surfaceCorrection.x = constrainedCorrection.x;
          surfaceCorrection.y = constrainedCorrection.y;
        } else {
          surfaceCorrection.x = proposedSurfaceCorrection.x;
          surfaceCorrection.y = proposedSurfaceCorrection.y;
        }
      } else {
        surfaceCorrection.x = proposedSurfaceCorrection.x;
        surfaceCorrection.y = proposedSurfaceCorrection.y;
      }
      const proposedSurfaceRotation = surfaceCorrection.rotation
        - surfaceAngularLever * positionImpulse
          * contact.surfaceInverseYawInertia;
      surfaceCorrection.rotation = Number.isFinite(
        contact.surfaceMaximumRotation,
      )
        ? clamp(
            contact.surfaceRotation + proposedSurfaceRotation,
            -contact.surfaceMaximumRotation,
            contact.surfaceMaximumRotation,
          ) - contact.surfaceRotation
        : proposedSurfaceRotation;
    }
  }
  const screenCorrection = projectCarWorldVector(worldCorrection);
  return {
    center: {
      x: center.x + screenCorrection.x,
      y: center.y + screenCorrection.y,
    },
    heading: wrapCarHeading(heading + angularCorrection),
    surfaceCorrections: surfaceWorldCorrections.map((correction) => ({
      rotation: correction.rotation,
      ...projectCarWorldVector(correction),
    })),
  };
}

export function getCarSignedSpeed(state: CarChassisState) {
  const { forward } = getCarWorldAxes(state.heading);
  return state.velocityX * forward.x + state.velocityY * forward.y;
}

export function getCarWheelRotationDelta(
  wheelSurfaceSpeed: number,
  wheelRadiusM: number,
  deltaSeconds: number,
  pixelsPerMeter = DEFAULT_CAR_WORLD_PIXELS_PER_METER,
) {
  // The mesh points forward along +X and its shader's positive Z rotation is
  // counter-clockwise. A wheel rolling forward along +X must rotate clockwise,
  // so render angle is the negative of signed surface travel. Reverse travel
  // consequently spins the visible wheel in the opposite direction.
  return -wheelSurfaceSpeed / Math.max(1, pixelsPerMeter)
    / Math.max(0.05, wheelRadiusM)
    * Math.max(0, deltaSeconds);
}

export function getCarAckermannSteeringAngles(
  steeringAngle: number,
  wheelbase: number,
  trackWidth: number,
) {
  if (Math.abs(steeringAngle) < 0.00001) return { left: 0, right: 0 };
  const direction = Math.sign(steeringAngle);
  const radius = Math.abs(wheelbase / Math.tan(steeringAngle));
  const halfTrack = Math.max(0, trackWidth / 2);
  const inner = Math.atan(wheelbase / Math.max(wheelbase * 0.35, radius - halfTrack));
  const outer = Math.atan(wheelbase / (radius + halfTrack));
  return direction > 0
    ? { left: outer, right: inner }
    : { left: -inner, right: -outer };
}

export function getCarDrivenWheelSpeed(
  state: CarChassisState,
  style: CarEngineStyle,
) {
  const frontSpeed = (state.frontLeftWheelSpeed + state.frontRightWheelSpeed) / 2;
  const rearSpeed = (state.rearLeftWheelSpeed + state.rearRightWheelSpeed) / 2;
  return frontSpeed * style.physics.driveBiasFront
    + rearSpeed * (1 - style.physics.driveBiasFront);
}

export function createCarChassisState(
  heading: number,
  signedSpeed = 0,
): CarChassisState {
  const normalizedHeading = wrapCarHeading(heading);
  const { forward } = getCarWorldAxes(normalizedHeading);
  return {
    absActivity: 0,
    brakePressure: 0,
    brakeLossJ: 0,
    centerDifferentialCouplingForce: 0,
    directionChangeSeconds: 0,
    differentialCoastBlend: 0,
    differentialCoastEngaged: false,
    differentialCouplingLossJ: 0,
    dynamicsCorrectionActive: false,
    longitudinalContactReactionForceNewtons: 0,
    longitudinalPhase: signedSpeed < -1
      ? "coasting-reverse"
      : signedSpeed > 1 ? "coasting-forward" : "neutral",
    driveDirection: signedSpeed < -1 ? -1 : signedSpeed > 1 ? 1 : 0,
    engineDragControlActivity: 0,
    frontLeftEngineDragControlActivity: 0,
    frontRightEngineDragControlActivity: 0,
    rearLeftEngineDragControlActivity: 0,
    rearRightEngineDragControlActivity: 0,
    frontLateralAcceleration: 0,
    frontDifferentialCouplingForce: 0,
    frontDrivelineForce: 0,
    frontLeftBrakePressure: 0,
    frontLeftEbdPressure: 0,
    frontLeftAbsPhase: "apply",
    frontLeftAdhesion: 1,
    frontLeftLateralAdhesion: 1,
    frontLeftLongitudinalAdhesion: 1,
    frontLeftTireDemand: 0,
    frontLeftLateralForce: 0,
    frontLeftAligningMomentNm: 0,
    frontLeftLateralDeflectionM: 0,
    frontLeftGripMultiplier: 1,
    frontLeftLoadNewtons: 0,
    frontLeftSuspensionCompression: 0,
    frontLeftSuspensionVelocity: 0,
    frontLeftLongitudinalDeflectionM: 0,
    frontLeftLongitudinalForce: 0,
    frontLeftLongitudinalSlip: 0,
    frontLeftSlipAngle: 0,
    frontLeftWheelSpeed: signedSpeed,
    frontLeftWheelAcceleration: 0,
    frontLongitudinalAcceleration: 0,
    frontLongitudinalSlip: 0,
    frontLongitudinalSlipPeak: 0,
    frontLongitudinalSlipRms: 0,
    frontSlipAngle: 0,
    frontWheelSpeed: signedSpeed,
    frontRightLateralForce: 0,
    frontRightAligningMomentNm: 0,
    frontRightLateralDeflectionM: 0,
    frontRightAdhesion: 1,
    frontRightLateralAdhesion: 1,
    frontRightLongitudinalAdhesion: 1,
    frontRightTireDemand: 0,
    frontRightGripMultiplier: 1,
    frontRightBrakePressure: 0,
    frontRightEbdPressure: 0,
    frontRightAbsPhase: "apply",
    frontRightLoadNewtons: 0,
    frontRightSuspensionCompression: 0,
    frontRightSuspensionVelocity: 0,
    frontRightLongitudinalDeflectionM: 0,
    frontRightLongitudinalForce: 0,
    frontRightLongitudinalSlip: 0,
    frontRightSlipAngle: 0,
    frontRightWheelSpeed: signedSpeed,
    frontRightWheelAcceleration: 0,
    heading: normalizedHeading,
    lateralAcceleration: 0,
    lateralTireSlip: 0,
    lateralLoadTransfer: 0,
    lateralLoadTransferVelocity: 0,
    longitudinalAcceleration: 0,
    longitudinalTireSlip: 0,
    longitudinalLoadTransfer: 0,
    longitudinalLoadTransferVelocity: 0,
    aerodynamicDragLossJ: 0,
    rollingResistanceLossJ: 0,
    rollingResistanceMultiplier: 1,
    rearLateralAcceleration: 0,
    rearDifferentialCouplingForce: 0,
    rearDrivelineForce: 0,
    rearLeftBrakePressure: 0,
    rearLeftEbdPressure: 0,
    rearLeftAbsPhase: "apply",
    rearLeftAdhesion: 1,
    rearLeftLateralAdhesion: 1,
    rearLeftLongitudinalAdhesion: 1,
    rearLeftTireDemand: 0,
    rearLeftLateralForce: 0,
    rearLeftLateralDeflectionM: 0,
    rearLeftGripMultiplier: 1,
    rearLeftLoadNewtons: 0,
    rearLeftSuspensionCompression: 0,
    rearLeftSuspensionVelocity: 0,
    rearLeftLongitudinalDeflectionM: 0,
    rearLeftLongitudinalForce: 0,
    rearLeftLongitudinalSlip: 0,
    rearLeftSlipAngle: 0,
    rearLeftWheelSpeed: signedSpeed,
    rearLeftWheelAcceleration: 0,
    rearLongitudinalAcceleration: 0,
    rearLongitudinalSlip: 0,
    rearLongitudinalSlipPeak: 0,
    rearLongitudinalSlipRms: 0,
    rearSlipAngle: 0,
    rearWheelSpeed: signedSpeed,
    rearRightLateralForce: 0,
    rearRightLateralDeflectionM: 0,
    rearRightAdhesion: 1,
    rearRightLateralAdhesion: 1,
    rearRightLongitudinalAdhesion: 1,
    rearRightTireDemand: 0,
    rearRightGripMultiplier: 1,
    rearRightBrakePressure: 0,
    rearRightEbdPressure: 0,
    rearRightAbsPhase: "apply",
    rearRightLoadNewtons: 0,
    rearRightSuspensionCompression: 0,
    rearRightSuspensionVelocity: 0,
    rearRightLongitudinalDeflectionM: 0,
    rearRightLongitudinalForce: 0,
    rearRightLongitudinalSlip: 0,
    rearRightSlipAngle: 0,
    rearRightWheelSpeed: signedSpeed,
    rearRightWheelAcceleration: 0,
    restSeconds: 0,
    restState: Math.abs(signedSpeed) < 1 ? "held" : "rolling",
    steeringAngle: 0,
    steeringCommand: 0,
    steeringVelocity: 0,
    tireSlip: 0,
    throttlePedal: 0,
    tractionControlActivity: 0,
    frontLeftTractionControlActivity: 0,
    frontRightTractionControlActivity: 0,
    rearLeftTractionControlActivity: 0,
    rearRightTractionControlActivity: 0,
    velocityX: forward.x * signedSpeed,
    velocityY: forward.y * signedSpeed,
    yawLimiterActivity: 0,
    yawRate: 0,
  };
}

/**
 * Resolve the zero-speed longitudinal constraint in one place. A stopped
 * contact patch has no residual wheel rotation, relaxed drive/brake force, or
 * longitudinal slip to replay on the next step. Lateral motion remains free
 * during a service-brake zero crossing; a settled rest constraint holds the
 * complete body.
 */
function applyCarLongitudinalStopConstraint(
  state: CarChassisState,
  forward: { x: number; y: number },
  options: {
    holdBody?: boolean;
    massKg?: number;
    maximumImpulseNs?: number;
    maximumYawImpulseNms?: number;
    pixelsPerMeter?: number;
    yawInertiaKgM2?: number;
  } = {},
) {
  if (options.holdBody) {
    const massKg = Math.max(1, options.massKg ?? 1);
    const pixelsPerMeter = Math.max(1, options.pixelsPerMeter ?? 1);
    const requiredBodyImpulseNs = Math.hypot(
      state.velocityX,
      state.velocityY,
    ) / pixelsPerMeter * massKg;
    const requiredYawImpulseNms = Math.abs(state.yawRate)
      * Math.max(1, options.yawInertiaKgM2 ?? 1);
    if (
      requiredBodyImpulseNs
        > Math.max(0, options.maximumImpulseNs ?? Number.POSITIVE_INFINITY)
      || requiredYawImpulseNms
        > Math.max(0, options.maximumYawImpulseNms ?? Number.POSITIVE_INFINITY)
    ) {
      return false;
    }
    state.velocityX = 0;
    state.velocityY = 0;
    state.yawRate = 0;
    state.frontLeftTractionControlActivity = 0;
    state.frontRightTractionControlActivity = 0;
    state.rearLeftTractionControlActivity = 0;
    state.rearRightTractionControlActivity = 0;
    state.frontLeftEngineDragControlActivity = 0;
    state.frontRightEngineDragControlActivity = 0;
    state.rearLeftEngineDragControlActivity = 0;
    state.rearRightEngineDragControlActivity = 0;
    state.tractionControlActivity = 0;
    state.engineDragControlActivity = 0;
  } else {
    const longitudinalSpeed = state.velocityX * forward.x
      + state.velocityY * forward.y;
    const massKg = Math.max(1, options.massKg ?? 1);
    const pixelsPerMeter = Math.max(1, options.pixelsPerMeter ?? 1);
    const requiredImpulseNs = Math.abs(longitudinalSpeed)
      / pixelsPerMeter * massKg;
    const appliedImpulseNs = Math.min(
      requiredImpulseNs,
      Math.max(0, options.maximumImpulseNs ?? Number.POSITIVE_INFINITY),
    );
    const velocityCorrection = Math.sign(longitudinalSpeed)
      * appliedImpulseNs / massKg * pixelsPerMeter;
    state.velocityX -= forward.x * velocityCorrection;
    state.velocityY -= forward.y * velocityCorrection;
    if (appliedImpulseNs + 0.0001 < requiredImpulseNs) return false;
  }
  state.frontLeftWheelSpeed = 0;
  state.frontRightWheelSpeed = 0;
  state.rearLeftWheelSpeed = 0;
  state.rearRightWheelSpeed = 0;
  state.frontWheelSpeed = 0;
  state.rearWheelSpeed = 0;
  state.frontLeftWheelAcceleration = 0;
  state.frontRightWheelAcceleration = 0;
  state.rearLeftWheelAcceleration = 0;
  state.rearRightWheelAcceleration = 0;
  state.frontLeftLongitudinalForce = 0;
  state.frontRightLongitudinalForce = 0;
  state.rearLeftLongitudinalForce = 0;
  state.rearRightLongitudinalForce = 0;
  state.frontLeftLateralForce = 0;
  state.frontRightLateralForce = 0;
  state.rearLeftLateralForce = 0;
  state.rearRightLateralForce = 0;
  state.frontLeftAligningMomentNm = 0;
  state.frontRightAligningMomentNm = 0;
  state.frontLeftSlipAngle = 0;
  state.frontRightSlipAngle = 0;
  state.rearLeftSlipAngle = 0;
  state.rearRightSlipAngle = 0;
  state.frontSlipAngle = 0;
  state.rearSlipAngle = 0;
  state.frontLeftLongitudinalSlip = 0;
  state.frontRightLongitudinalSlip = 0;
  state.rearLeftLongitudinalSlip = 0;
  state.rearRightLongitudinalSlip = 0;
  state.frontLeftTireDemand = 0;
  state.frontRightTireDemand = 0;
  state.rearLeftTireDemand = 0;
  state.rearRightTireDemand = 0;
  state.frontLeftLateralDeflectionM = 0;
  state.frontRightLateralDeflectionM = 0;
  state.rearLeftLateralDeflectionM = 0;
  state.rearRightLateralDeflectionM = 0;
  state.frontLeftLongitudinalDeflectionM = 0;
  state.frontRightLongitudinalDeflectionM = 0;
  state.rearLeftLongitudinalDeflectionM = 0;
  state.rearRightLongitudinalDeflectionM = 0;
  state.frontLeftAdhesion = 1;
  state.frontRightAdhesion = 1;
  state.rearLeftAdhesion = 1;
  state.rearRightAdhesion = 1;
  state.frontLeftLateralAdhesion = 1;
  state.frontRightLateralAdhesion = 1;
  state.rearLeftLateralAdhesion = 1;
  state.rearRightLateralAdhesion = 1;
  state.frontLeftLongitudinalAdhesion = 1;
  state.frontRightLongitudinalAdhesion = 1;
  state.rearLeftLongitudinalAdhesion = 1;
  state.rearRightLongitudinalAdhesion = 1;
  state.frontLongitudinalSlip = 0;
  state.frontLongitudinalSlipPeak = 0;
  state.frontLongitudinalSlipRms = 0;
  state.rearLongitudinalSlip = 0;
  state.rearLongitudinalSlipPeak = 0;
  state.rearLongitudinalSlipRms = 0;
  state.longitudinalTireSlip = 0;
  return true;
}

export function stepCarChassis(
  previous: CarChassisState,
  style: CarEngineStyle,
  input: CarChassisInput,
): CarChassisOutput {
  const deltaSeconds = clamp(input.deltaSeconds, 1 / 2000, 1 / 30);
  const throttle = clamp(input.throttle, -1, 1);
  const steeringInput = clamp(input.steering, -1, 1);
  const parking = input.parking === true;
  const opposingPedals = input.opposingPedals === true;
  const pixelsPerMeter = Math.max(1, style.physics.worldPixelsPerMeter);
  const wheelbase = style.physics.physicalWheelbaseM * pixelsPerMeter;
  const geometryFrame = getCarGeometryFrame(style.id);
  const previousAdhesion = {
    frontLeft: Number.isFinite(previous.frontLeftAdhesion)
      ? clamp(previous.frontLeftAdhesion, 0, 1) : 1,
    frontRight: Number.isFinite(previous.frontRightAdhesion)
      ? clamp(previous.frontRightAdhesion, 0, 1) : 1,
    rearLeft: Number.isFinite(previous.rearLeftAdhesion)
      ? clamp(previous.rearLeftAdhesion, 0, 1) : 1,
    rearRight: Number.isFinite(previous.rearRightAdhesion)
      ? clamp(previous.rearRightAdhesion, 0, 1) : 1,
  };
  const axisAdhesion = {
    frontLeft: {
      lateral: Number.isFinite(previous.frontLeftLateralAdhesion)
        ? clamp(previous.frontLeftLateralAdhesion, 0, 1)
        : previousAdhesion.frontLeft,
      longitudinal: Number.isFinite(previous.frontLeftLongitudinalAdhesion)
        ? clamp(previous.frontLeftLongitudinalAdhesion, 0, 1)
        : previousAdhesion.frontLeft,
    },
    frontRight: {
      lateral: Number.isFinite(previous.frontRightLateralAdhesion)
        ? clamp(previous.frontRightLateralAdhesion, 0, 1)
        : previousAdhesion.frontRight,
      longitudinal: Number.isFinite(previous.frontRightLongitudinalAdhesion)
        ? clamp(previous.frontRightLongitudinalAdhesion, 0, 1)
        : previousAdhesion.frontRight,
    },
    rearLeft: {
      lateral: Number.isFinite(previous.rearLeftLateralAdhesion)
        ? clamp(previous.rearLeftLateralAdhesion, 0, 1)
        : previousAdhesion.rearLeft,
      longitudinal: Number.isFinite(previous.rearLeftLongitudinalAdhesion)
        ? clamp(previous.rearLeftLongitudinalAdhesion, 0, 1)
        : previousAdhesion.rearLeft,
    },
    rearRight: {
      lateral: Number.isFinite(previous.rearRightLateralAdhesion)
        ? clamp(previous.rearRightLateralAdhesion, 0, 1)
        : previousAdhesion.rearRight,
      longitudinal: Number.isFinite(previous.rearRightLongitudinalAdhesion)
        ? clamp(previous.rearRightLongitudinalAdhesion, 0, 1)
        : previousAdhesion.rearRight,
    },
  };
  let state = { ...previous };
  state.longitudinalContactReactionForceNewtons = 0;
  state.aerodynamicDragLossJ = 0;
  state.brakeLossJ = 0;
  state.rollingResistanceLossJ = 0;
  const rollingResistanceMultipliers = input.wheelRollingResistanceMultipliers;
  const rollingResistanceLoads = [
    Math.max(0, previous.frontLeftLoadNewtons),
    Math.max(0, previous.frontRightLoadNewtons),
    Math.max(0, previous.rearLeftLoadNewtons),
    Math.max(0, previous.rearRightLoadNewtons),
  ];
  const rollingResistanceValues = [
    rollingResistanceMultipliers?.frontLeft ?? 1,
    rollingResistanceMultipliers?.frontRight ?? 1,
    rollingResistanceMultipliers?.rearLeft ?? 1,
    rollingResistanceMultipliers?.rearRight ?? 1,
  ];
  const rollingResistanceLoadTotal = rollingResistanceLoads.reduce(
    (sum, load) => sum + load,
    0,
  );
  const loadWeightedRollingResistance = rollingResistanceLoadTotal > 1
    ? rollingResistanceValues.reduce((sum, multiplier, index) => (
        sum + clamp(multiplier, 0.35, 2.5) * rollingResistanceLoads[index]
      ), 0) / rollingResistanceLoadTotal
    : rollingResistanceValues.reduce(
        (sum, multiplier) => sum + clamp(multiplier, 0.35, 2.5),
        0,
      ) / rollingResistanceValues.length;
  state.rollingResistanceMultiplier = clamp(
    loadWeightedRollingResistance,
    0.35,
    2.5,
  );
  state.steeringCommand = Number.isFinite(previous.steeringCommand)
    ? clamp(previous.steeringCommand, -1, 1)
    : 0;
  let { forward, right } = getCarWorldAxes(state.heading);
  let longitudinalSpeed = state.velocityX * forward.x + state.velocityY * forward.y;
  let lateralSpeed = state.velocityX * right.x + state.velocityY * right.y;
  const heldBodySpeed = Math.hypot(state.velocityX, state.velocityY);
  const heldYawEdgeSpeed = Math.abs(state.yawRate)
    * style.physics.physicalWheelbaseM * pixelsPerMeter * 0.5;
  const heldWakeSpeed = Math.hypot(heldBodySpeed, heldYawEdgeSpeed);
  const heldWakeThreshold = Math.max(
    1,
    style.controls.direction.restEntrySpeedMps * pixelsPerMeter * 1.5,
  );
  if (
    state.restState === "held"
    && heldWakeSpeed > heldWakeThreshold
  ) {
    // A collision or positional correction has imparted real body energy.
    // Release static holding instead of swallowing that impulse on this step.
    state.restState = "rolling";
    state.restSeconds = 0;
  }
  // Driver pedal travel and engine-load response are separate states. Direction
  // intent remains immediate, while delivered torque follows this short travel.
  state.throttlePedal = input.driverThrottle ?? throttle;
  const longitudinalTransition = input.longitudinalTransition
    ?? advanceCarLongitudinalControl(
      state,
      throttle,
      deltaSeconds,
      {
        controls: style.controls,
        opposingPedals,
        parking,
        pixelsPerMeter,
      },
    );
  const {
    demandedDirection,
    serviceBraking,
  } = longitudinalTransition;
  state.driveDirection = longitudinalTransition.engagedDirection;
  state.directionChangeSeconds = longitudinalTransition.directionChangeSeconds;
  state.longitudinalPhase = longitudinalTransition.phase;
  if (longitudinalTransition.releaseBrakePressure) {
    // The service brake has already brought the wheels through zero. Do not
    // make the new direction fight pressure left over from the old one; retain
    // only enough pressure for a continuous, non-snapping handoff.
    const residualPressure = style.controls.direction.residualBrakePressure;
    state.brakePressure = Math.min(state.brakePressure, residualPressure);
    state.frontLeftEbdPressure = Math.min(
      state.frontLeftEbdPressure, residualPressure,
    );
    state.frontRightEbdPressure = Math.min(
      state.frontRightEbdPressure, residualPressure,
    );
    state.rearLeftEbdPressure = Math.min(
      state.rearLeftEbdPressure, residualPressure,
    );
    state.rearRightEbdPressure = Math.min(
      state.rearRightEbdPressure, residualPressure,
    );
    state.frontLeftBrakePressure = Math.min(
      state.frontLeftBrakePressure, residualPressure,
    );
    state.frontRightBrakePressure = Math.min(
      state.frontRightBrakePressure, residualPressure,
    );
    state.rearLeftBrakePressure = Math.min(
      state.rearLeftBrakePressure, residualPressure,
    );
    state.rearRightBrakePressure = Math.min(
      state.rearRightBrakePressure, residualPressure,
    );
    state.frontLeftAbsPhase = "apply";
    state.frontRightAbsPhase = "apply";
    state.rearLeftAbsPhase = "apply";
    state.rearRightAbsPhase = "apply";
    state.absActivity = Math.min(state.absActivity, residualPressure);
    state.frontDrivelineForce = 0;
    state.rearDrivelineForce = 0;
    state.frontDifferentialCouplingForce = 0;
    state.rearDifferentialCouplingForce = 0;
    state.centerDifferentialCouplingForce = 0;
  }
  const brakeRate = serviceBraking
    ? state.brakePressure < style.controls.pedals.brakeContactPressure
      ? style.controls.pedals.brakeContactRate
      : style.controls.pedals.brakeApplyRate
    : style.controls.pedals.brakeReleaseRate;
  const brakeTarget = serviceBraking
    ? state.brakePressure < style.controls.pedals.brakeContactPressure
      ? style.controls.pedals.brakeContactPressure
      : 1
    : 0;
  state.brakePressure = approach(
    state.brakePressure,
    brakeTarget,
    brakeRate * deltaSeconds,
  );

  const maximumSpeed = state.driveDirection < 0
    ? getCarMaximumPageSpeed(style, -1)
    : getCarMaximumPageSpeed(style, 1);
  const powerSpeedRatio = Math.max(
    0,
    Math.abs(longitudinalSpeed) / Math.max(1, maximumSpeed),
  );
  // Rack geometry depends on road speed, not the selected gear's lower speed
  // ceiling. Equal forward/reverse road speeds must retain equal wheel lock.
  const speedRatio = clamp(
    Math.abs(longitudinalSpeed) / Math.max(1, getCarMaximumPageSpeed(style, 1)),
    0,
    1,
  );
  const steeringSpeedRatio = Math.pow(
    speedRatio,
    style.controls.steering.speedReductionExponent,
  );
  const steeringFeedback = input.steeringForcePreview ?? previous;
  // Keyboard input represents driver effort at the steering rack. The rack and
  // contact patches, rather than an authored wheel-angle target, own its motion.
  const steeringLimit = style.physics.maximumSteeringAngle;
  const steeringCommandTarget = parking ? 0 : steeringInput;
  // The key represents driver effort. Rack inertia and tire feedback own the
  // position transient, so filtering another position command here would add
  // a second, artificial steering lag.
  const reversingSteeringCommand = state.steeringCommand !== 0
    && steeringCommandTarget !== 0
    && Math.sign(state.steeringCommand) !== Math.sign(steeringCommandTarget);
  const steeringCommandRate = steeringCommandTarget === 0
    ? style.controls.steering.commandReleaseRate
    : reversingSteeringCommand
      ? style.controls.steering.commandReversalRate
      : style.controls.steering.commandRiseRate;
  state.steeringCommand = approach(
    state.steeringCommand,
    steeringCommandTarget,
    steeringCommandRate * deltaSeconds,
  );
  const steeringCommandMagnitude = 1 - Math.pow(
    1 - Math.abs(state.steeringCommand),
    style.controls.steering.commandCurveExponent,
  );
  const longitudinalSpeedMps = Math.abs(longitudinalSpeed) / pixelsPerMeter;
  const counterSteering = steeringInput !== 0
    && state.steeringAngle !== 0
    && Math.sign(steeringInput) !== Math.sign(state.steeringAngle);
  const signedSteeringEffort = Math.sign(state.steeringCommand)
    * steeringCommandMagnitude;
  // Steering assistance retains a modest road-speed response. It changes how
  // quickly driver torque moves the rack, never the angle the rack must reach.
  const physicalRackRateScale = 1 - steeringSpeedRatio * Math.min(
    0.18,
    Math.max(
      style.controls.steering.rateSpeedReduction,
      style.physics.highSpeedSteeringReduction,
    ) * 0.35,
  );
  const steeringRate = steeringInput === 0
    ? style.physics.steeringReturnRate
      + speedRatio * style.physics.steeringReturnSpeedGain
    : counterSteering
      ? style.physics.steeringCounterRate
      : (Math.abs(state.steeringAngle) < steeringLimit * 0.34
          ? style.physics.steeringInputRate
          : style.physics.steeringInputRate
            * style.controls.steering.limitRateScale)
        * physicalRackRateScale;
  const aligningAuthority = clamp((longitudinalSpeedMps - 0.21) / 2.63, 0, 1);
  const staticFrontContactLoad = style.physics.massKg * 9.81
    * style.physics.frontWeightBias / 2;
  // A keyboard command represents the driver holding the rack. Apply caster
  // return after release, not against a held command. Signed contact-patch
  // forces preserve split-grip asymmetry; multiplying by travel direction
  // keeps pneumatic trail self-centering in reverse as well as forward.
  const frontContactAligningMomentNm = (
    Number.isFinite(steeringFeedback.frontLeftAligningMomentNm)
      ? steeringFeedback.frontLeftAligningMomentNm ?? 0
      : 0
  ) + (
    Number.isFinite(steeringFeedback.frontRightAligningMomentNm)
      ? steeringFeedback.frontRightAligningMomentNm ?? 0
      : 0
  );
  const selfAligningMomentNm = frontContactAligningMomentNm * aligningAuthority
    * (steeringInput === 0 ? 1 : style.controls.steering.heldAligningMomentScale);
  const rackFrequency = steeringInput === 0
    ? style.physics.steeringRackFrequency + speedRatio * 2
    : counterSteering
      ? style.physics.steeringRackFrequency
        + style.controls.steering.counterFrequencyBoost
      : style.physics.steeringRackFrequency;
  const rackDamping = steeringInput === 0
    ? style.controls.steering.releasedDamping
    : style.controls.steering.heldDamping;
  const steeringSystemInertia = style.physics.steeringSystemInertiaKgM2;
  const frontSteeringLoadRatio = (
    Math.max(0, steeringFeedback.frontLeftLoadNewtons)
      + Math.max(0, steeringFeedback.frontRightLoadNewtons)
  ) / Math.max(1, staticFrontContactLoad * 2);
  const steeringAssistSpeedBlend = smooth01(speedRatio);
  const speedAwareSteeringAssist = style.physics.steeringAssistLowSpeed
    + (
      style.physics.steeringAssistHighSpeed
        - style.physics.steeringAssistLowSpeed
    ) * steeringAssistSpeedBlend;
  const steeringLoadAssist = 1 / (
    1 + Math.max(0, frontSteeringLoadRatio - 1)
      * style.physics.steeringAssistLoadSensitivity
  );
  const effectiveSteeringAssist = Math.max(0.2,
    speedAwareSteeringAssist * steeringLoadAssist);
  // Assistance multiplies driver torque; it does not change rack stiffness or
  // request an angle. At full effort, torque balances viscous rack resistance
  // near the calibrated handwheel rate while trail and tire load remain free to
  // slow, return, or kick the rack through the same physical force path.
  const physicalRackFrequency = rackFrequency;
  const maximumDriverRackTorqueNm = 2 * rackDamping * physicalRackFrequency
    * steeringSystemInertia * steeringRate * effectiveSteeringAssist;
  const driverRackTorqueNm = signedSteeringEffort * maximumDriverRackTorqueNm;
  const rackDampingTorqueNm = 2 * rackDamping * physicalRackFrequency
    * steeringSystemInertia * state.steeringVelocity;
  // The calibrated rate is a soft rack resistance, not a hard kinematic
  // ceiling. Keyboard input still remains simple, while inertia, trail and
  // opposing tire forces determine the actual transient.
  const excessRackVelocity = Math.max(
    0,
    Math.abs(state.steeringVelocity) - steeringRate,
  );
  const softRateResistanceTorqueNm = Math.sign(state.steeringVelocity)
    * excessRackVelocity * steeringSystemInertia * physicalRackFrequency * 2.4;
  const rackEndStopStart = steeringLimit * 0.86;
  const rackEndStopCompression = Math.max(
    0,
    Math.abs(state.steeringAngle) - rackEndStopStart,
  );
  const rackEndStopStiffnessNmPerRadian = steeringSystemInertia
    * physicalRackFrequency * physicalRackFrequency * 2.4;
  const outwardRackVelocity = Math.max(
    0,
    Math.sign(state.steeringAngle) * state.steeringVelocity,
  );
  const rackEndStopDampingNmPerRadianPerSecond = 1.7 * Math.sqrt(
    rackEndStopStiffnessNmPerRadian * steeringSystemInertia,
  );
  const rackEndStopTorqueNm = rackEndStopCompression > 0
    ? -Math.sign(state.steeringAngle) * (
        rackEndStopCompression * rackEndStopStiffnessNmPerRadian
          + outwardRackVelocity * rackEndStopDampingNmPerRadianPerSecond
      )
    : 0;
  // Positive caster and steering-axis inclination create a genuine mechanical
  // centering moment. This exists at parking speed and grows modestly with road
  // speed; it returns a released rack without prescribing its position.
  const casterFrequency = style.physics.steeringCasterFrequency
    + speedRatio * 4;
  const casterLoadScale = clamp(
    Math.sqrt(Math.max(0.2, frontSteeringLoadRatio)),
    0.65,
    1.3,
  );
  const casterCenteringTorqueNm = -state.steeringAngle
    * steeringSystemInertia * casterFrequency * casterFrequency
    * casterLoadScale;
  const unresistedSteeringAcceleration = (
    driverRackTorqueNm
      + casterCenteringTorqueNm
      + selfAligningMomentNm
      + rackEndStopTorqueNm
      - rackDampingTorqueNm
      - softRateResistanceTorqueNm
  ) / steeringSystemInertia;
  const parkingScrubAuthority = 1 - smooth01(
    Math.abs(longitudinalSpeedMps) / 1.2,
  );
  const frontTireScrubTorqueNm = style.physics.steeringParkingScrubTorqueNm
    * clamp(Math.sqrt(Math.max(0.2, frontSteeringLoadRatio)), 0.6, 1.3)
    * parkingScrubAuthority;
  const staticRackFrictionAcceleration = (
    style.physics.steeringRackFrictionTorqueNm + frontTireScrubTorqueNm
  ) / style.physics.steeringSystemInertiaKgM2;
  const kineticRackFrictionAcceleration = staticRackFrictionAcceleration
    * style.physics.steeringKineticFrictionRatio;
  const requestedRackDirection = Math.abs(state.steeringVelocity) > 0.003
    ? Math.sign(state.steeringVelocity)
    : Math.sign(unresistedSteeringAcceleration);
  const staticRackHold = Math.abs(state.steeringVelocity) <= 0.003
    && Math.abs(unresistedSteeringAcceleration) <= staticRackFrictionAcceleration;
  // Coulomb rack friction supplies the small hysteresis a real steering system
  // gets from seals, joints, and tire scrub. Near rest it holds position;
  // in motion it opposes travel without delaying a deliberate counter-steer.
  const steeringAcceleration = staticRackHold
    ? 0
    : unresistedSteeringAcceleration
      - requestedRackDirection * kineticRackFrictionAcceleration;
  if (staticRackHold) state.steeringVelocity = 0;
  const numericalRackVelocityLimit = Math.max(
    steeringRate * 3,
    steeringLimit * 8,
  );
  state.steeringVelocity = clamp(
    state.steeringVelocity + steeringAcceleration * deltaSeconds,
    -numericalRackVelocityLimit,
    numericalRackVelocityLimit,
  );
  state.steeringAngle = clamp(
    state.steeringAngle + state.steeringVelocity * deltaSeconds,
    -steeringLimit,
    steeringLimit,
  );
  if (
    (state.steeringAngle <= -steeringLimit && state.steeringVelocity < 0)
    || (state.steeringAngle >= steeringLimit && state.steeringVelocity > 0)
  ) state.steeringVelocity = 0;

  const stabilitySpeedMps = Math.abs(longitudinalSpeed) / pixelsPerMeter;
  const bodySlipAngle = Math.atan2(
    lateralSpeed,
    Math.max(1.4 * pixelsPerMeter, Math.abs(longitudinalSpeed)),
  );
  // Stability protection observes actual body slip only. Steering angle never
  // becomes a demanded yaw target for the chassis.
  const stabilityAuthority = smooth01(
    (stabilitySpeedMps
      - style.controls.driverAids.stabilityActivationSpeedMps)
      / style.controls.driverAids.stabilityActivationRangeMps,
  ) * smooth01(
    (Math.abs(bodySlipAngle)
      - style.controls.driverAids.stabilitySlipThreshold)
      / style.controls.driverAids.stabilitySlipRange,
  );
  const drivetrainConnected = state.driveDirection !== 0
    && !parking
    && !opposingPedals;
  const resistingDrivelineForce = drivetrainConnected
    && Math.abs(longitudinalSpeed) > 0.5
    && input.wheelForceNewtons * longitudinalSpeed < 0;
  let driveForceNewtons = 0;
  if (drivetrainConnected) {
    // Residual engine torque and engine braking continue through a service-brake
    // or direction-change transition. The wheel brakes oppose that real torque
    // instead of receiving a discontinuous drivetrain cut.
    // Engine speed, gearing, and road resistance own normal top speed. This
    // guard begins well outside the authored envelope and exists only to keep
    // the page vehicle bounded if collision or continuity state is corrupted.
    const overspeedGuard = input.wheelForceNewtons * longitudinalSpeed > 0
      ? 1 - smooth01((powerSpeedRatio - 1.18) / 0.1)
      : 1;
    const stabilityTorqueRetention = 1 - stabilityAuthority
      * style.controls.driverAids.stabilityEngineReduction;
    driveForceNewtons = input.wheelForceNewtons * overspeedGuard
      * stabilityTorqueRetention;
  }
  const restRequested = parking || serviceBraking || demandedDirection === 0;
  const longitudinalGripCoefficient = style.physics.lateralGrip
    / (pixelsPerMeter * 9.81) * style.physics.longitudinalGripRatio;
  const wheelHoldingCapacity = (loadNewtons: number, gripMultiplier: number) => (
    Math.max(0, loadNewtons)
      * longitudinalGripCoefficient
      * clamp(gripMultiplier, 0.15, 1.5)
  );
  const frontLeftHoldingCapacity = wheelHoldingCapacity(
    previous.frontLeftLoadNewtons,
    previous.frontLeftGripMultiplier,
  );
  const frontRightHoldingCapacity = wheelHoldingCapacity(
    previous.frontRightLoadNewtons,
    previous.frontRightGripMultiplier,
  );
  const rearLeftHoldingCapacity = wheelHoldingCapacity(
    previous.rearLeftLoadNewtons,
    previous.rearLeftGripMultiplier,
  );
  const rearRightHoldingCapacity = wheelHoldingCapacity(
    previous.rearRightLoadNewtons,
    previous.rearRightGripMultiplier,
  );
  const frontHoldingCapacity = frontLeftHoldingCapacity
    + frontRightHoldingCapacity;
  const rearHoldingCapacity = rearLeftHoldingCapacity
    + rearRightHoldingCapacity;
  const frontHoldingLeverM = Math.hypot(
    geometryFrame.frontAxleFromCgM,
    style.physics.trackWidthM * 0.5,
  );
  const rearHoldingLeverM = Math.hypot(
    geometryFrame.rearAxleFromCgM,
    style.physics.trackWidthM * 0.5,
  );
  const maximumYawHoldingMomentNm = (
    frontLeftHoldingCapacity + frontRightHoldingCapacity
  ) * frontHoldingLeverM + (
    rearLeftHoldingCapacity + rearRightHoldingCapacity
  ) * rearHoldingLeverM;
  // A digital direction command is authoritative wake intent. Waiting for
  // the newly coupled drivetrain to exceed a force threshold created a circular
  // latch after reverse-to-forward handoffs, especially with steering held.
  if (state.restState === "held" && !restRequested) {
    state.restState = "rolling";
    state.restSeconds = 0;
  }
  if (state.restState === "held") driveForceNewtons = 0;

  const longitudinalDirection = longitudinalSpeed < -0.5
    ? -1
    : longitudinalSpeed > 0.5
      ? 1
      : serviceBraking
        ? 0
        : state.driveDirection;
  const massKg = Math.max(1, style.physics.massKg);
  const crawlEntrySpeedMps = Math.max(0.01, style.controls.direction.restEntrySpeedMps);
  const crawlEntrySpeedPixels = crawlEntrySpeedMps * pixelsPerMeter;
  const maximumBrakeForceNewtons = longitudinalDirection === 0
    ? 0
    : getCarMaximumBrakeForceNewtons(style);
  const measuredLongitudinalAccelerationMps = previous.longitudinalAcceleration
    / pixelsPerMeter;
  const predictedContact = input.steeringForcePreview;
  // Normal-load transfer follows resolved tire force. The corrected dynamics
  // pass supplies the same-step force result; the predictor retains the last
  // resolved result instead of anticipating load from requested pedal force.
  const estimatedLongitudinalAccelerationMps = predictedContact
    && Number.isFinite(predictedContact.longitudinalAcceleration)
    ? predictedContact.longitudinalAcceleration / pixelsPerMeter
    : measuredLongitudinalAccelerationMps;
  const minimumWheelLoadShare = 0.025;
  const minimumAxleLoadShare = minimumWheelLoadShare * 2;
  const accelerationAlongTravelMps2 = estimatedLongitudinalAccelerationMps
    * Math.sign(longitudinalSpeed || state.driveDirection || 1);
  const suspensionGeometryRatio = accelerationAlongTravelMps2 < 0
    ? style.physics.antiDiveRatio
    : style.physics.antiSquatRatio;
  const rawLongitudinalTransfer = estimatedLongitudinalAccelerationMps
    * (1 - clamp(suspensionGeometryRatio, 0, 0.85))
    * style.physics.centerOfGravityHeightM
    / (9.81 * style.physics.physicalWheelbaseM);
  const minimumLongitudinalTransfer = style.physics.frontWeightBias
    - (1 - minimumAxleLoadShare);
  const maximumLongitudinalTransfer = style.physics.frontWeightBias
    - minimumAxleLoadShare;
  const longitudinalTransferTarget = clamp(
    rawLongitudinalTransfer,
    minimumLongitudinalTransfer,
    maximumLongitudinalTransfer,
  );
  const longitudinalTransfer = stepDampedAxis(
    state.longitudinalLoadTransfer,
    state.longitudinalLoadTransferVelocity,
    longitudinalTransferTarget,
    style.physics.suspensionPitchFrequency,
    style.physics.suspensionPitchDamping,
    deltaSeconds,
  );
  state.longitudinalLoadTransfer = clamp(
    longitudinalTransfer.value,
    minimumLongitudinalTransfer,
    maximumLongitudinalTransfer,
  );
  state.longitudinalLoadTransferVelocity = longitudinalTransfer.velocity;
  // Tire normal load follows the force balance for this step. The damped
  // transfer state above represents sprung-body motion only; feeding that
  // delayed motion back into contact-patch grip made acceleration alter grip,
  // which altered acceleration again and produced a repeated driveline tug.
  const effectiveLongitudinalLoadTransfer = longitudinalTransferTarget;
  const frontLoadShare = clamp(
    style.physics.frontWeightBias - effectiveLongitudinalLoadTransfer,
    minimumAxleLoadShare,
    1 - minimumAxleLoadShare,
  );
  const rearLoadShare = 1 - frontLoadShare;
  const estimatedLateralAccelerationMps = predictedContact
    && Number.isFinite(predictedContact.lateralAcceleration)
    ? predictedContact.lateralAcceleration / pixelsPerMeter
    : previous.lateralAcceleration / pixelsPerMeter;
  const rawLateralTransfer = estimatedLateralAccelerationMps
    * style.physics.centerOfGravityHeightM
    / (9.81 * style.physics.trackWidthM);
  const frontRollShare = clamp(style.physics.frontRollStiffnessBias, 0.05, 0.95);
  const rearRollShare = 1 - frontRollShare;
  const maximumLateralTransfer = Math.max(
    0,
    Math.min(
      (frontLoadShare * 0.5 - minimumWheelLoadShare) / frontRollShare,
      (rearLoadShare * 0.5 - minimumWheelLoadShare) / rearRollShare,
    ),
  );
  const lateralTransferTarget = clamp(
    rawLateralTransfer,
    -maximumLateralTransfer,
    maximumLateralTransfer,
  );
  const lateralTransfer = stepDampedAxis(
    state.lateralLoadTransfer,
    state.lateralLoadTransferVelocity,
    lateralTransferTarget,
    style.physics.suspensionRollFrequency,
    style.physics.suspensionRollDamping,
    deltaSeconds,
  );
  state.lateralLoadTransfer = clamp(
    lateralTransfer.value,
    -maximumLateralTransfer,
    maximumLateralTransfer,
  );
  state.lateralLoadTransferVelocity = lateralTransfer.velocity;
  // Keep lateral contact load authoritative as well. Body roll is allowed to
  // settle at suspension speed without becoming a delayed steering-force loop.
  const effectiveLateralLoadTransfer = lateralTransferTarget;
  const totalWeightNewtons = massKg * 9.81;
  const frontWeightNewtons = totalWeightNewtons * frontLoadShare;
  const rearWeightNewtons = totalWeightNewtons - frontWeightNewtons;
  const frontLateralLoadDelta = totalWeightNewtons
    * effectiveLateralLoadTransfer
    * style.physics.frontRollStiffnessBias;
  const rearLateralLoadDelta = totalWeightNewtons
    * effectiveLateralLoadTransfer
    * (1 - style.physics.frontRollStiffnessBias);
  const minimumWheelLoad = totalWeightNewtons * minimumWheelLoadShare;
  const distributeAxleLoad = (axleLoad: number, requestedDelta: number) => {
    // Clamp transfer itself rather than flooring each wheel independently.
    // This guarantees that the four normal loads always sum to vehicle weight.
    const maximumDelta = Math.max(0, axleLoad / 2 - minimumWheelLoad);
    const delta = clamp(requestedDelta, -maximumDelta, maximumDelta);
    return {
      left: axleLoad / 2 + delta,
      right: axleLoad / 2 - delta,
    };
  };
  const frontLoads = distributeAxleLoad(frontWeightNewtons, frontLateralLoadDelta);
  const rearLoads = distributeAxleLoad(rearWeightNewtons, rearLateralLoadDelta);
  const staticFrontLoad = totalWeightNewtons * style.physics.frontWeightBias / 2;
  const staticRearLoad = totalWeightNewtons
    * (1 - style.physics.frontWeightBias) / 2;
  const cornerFrequency = (
    style.physics.suspensionPitchFrequency
      + style.physics.suspensionRollFrequency
  ) / 2;
  const cornerDamping = (
    style.physics.suspensionPitchDamping
      + style.physics.suspensionRollDamping
  ) / 2;
  const stepCornerSuspension = (
    previousCompression: number,
    previousVelocity: number,
    idealLoad: number,
    staticLoad: number,
  ) => {
    const targetCompression = clamp(
      idealLoad / Math.max(1, staticLoad) - 1,
      -0.62,
      0.82,
    );
    const suspension = stepDampedAxis(
      Number.isFinite(previousCompression) ? previousCompression : 0,
      Number.isFinite(previousVelocity) ? previousVelocity : 0,
      targetCompression,
      cornerFrequency,
      cornerDamping,
      deltaSeconds,
    );
    return {
      compression: clamp(suspension.value, -0.68, 0.9),
      velocity: clamp(suspension.velocity, -6, 6),
    };
  };
  const cornerSuspension = {
    frontLeft: stepCornerSuspension(
      previous.frontLeftSuspensionCompression,
      previous.frontLeftSuspensionVelocity,
      frontLoads.left,
      staticFrontLoad,
    ),
    frontRight: stepCornerSuspension(
      previous.frontRightSuspensionCompression,
      previous.frontRightSuspensionVelocity,
      frontLoads.right,
      staticFrontLoad,
    ),
    rearLeft: stepCornerSuspension(
      previous.rearLeftSuspensionCompression,
      previous.rearLeftSuspensionVelocity,
      rearLoads.left,
      staticRearLoad,
    ),
    rearRight: stepCornerSuspension(
      previous.rearRightSuspensionCompression,
      previous.rearRightSuspensionVelocity,
      rearLoads.right,
      staticRearLoad,
    ),
  };
  state.frontLeftSuspensionCompression = cornerSuspension.frontLeft.compression;
  state.frontLeftSuspensionVelocity = cornerSuspension.frontLeft.velocity;
  state.frontRightSuspensionCompression = cornerSuspension.frontRight.compression;
  state.frontRightSuspensionVelocity = cornerSuspension.frontRight.velocity;
  state.rearLeftSuspensionCompression = cornerSuspension.rearLeft.compression;
  state.rearLeftSuspensionVelocity = cornerSuspension.rearLeft.velocity;
  state.rearRightSuspensionCompression = cornerSuspension.rearRight.compression;
  state.rearRightSuspensionVelocity = cornerSuspension.rearRight.velocity;
  // The pitch/roll force balance is authoritative for normal load. Suspension
  // travel follows that force target for body motion and impact response; it
  // must not be converted back into tire load or the animation state becomes
  // a delayed feedback loop in the handling model.
  state.frontLeftLoadNewtons = frontLoads.left;
  state.frontRightLoadNewtons = frontLoads.right;
  state.rearLeftLoadNewtons = rearLoads.left;
  state.rearRightLoadNewtons = rearLoads.right;
  const tireFriction = style.physics.lateralGrip
    / (pixelsPerMeter * 9.81);
  // Surface coefficient belongs to the road under each contact patch and
  // changes at the boundary. Tire relaxation and adhesion memory own the
  // resulting force transient; filtering the coefficient duplicated both.
  const surfaceGrip = (target = 1) => clamp(target, 0.15, 1.5);
  state.frontLeftGripMultiplier = surfaceGrip(
    input.wheelGripMultipliers?.frontLeft,
  );
  state.frontRightGripMultiplier = surfaceGrip(
    input.wheelGripMultipliers?.frontRight,
  );
  state.rearLeftGripMultiplier = surfaceGrip(
    input.wheelGripMultipliers?.rearLeft,
  );
  state.rearRightGripMultiplier = surfaceGrip(
    input.wheelGripMultipliers?.rearRight,
  );
  const getWheelCapacity = (
    loadNewtons: number,
    referenceLoadNewtons: number,
    surfaceGrip = 1,
  ) => {
    const loadSensitivity = clamp(
      Math.pow(
        Math.max(0.1, referenceLoadNewtons) / Math.max(0.1, loadNewtons),
        style.physics.tireLoadSensitivity,
      ),
      0.82,
      1.18,
    );
    const lateral = loadNewtons * tireFriction * loadSensitivity
      * clamp(surfaceGrip, 0.15, 1.5);
    return {
      lateral,
      longitudinal: lateral * style.physics.longitudinalGripRatio,
    };
  };
  const frontLeftCapacity = getWheelCapacity(
    state.frontLeftLoadNewtons,
    staticFrontLoad,
    state.frontLeftGripMultiplier,
  );
  const frontRightCapacity = getWheelCapacity(
    state.frontRightLoadNewtons,
    staticFrontLoad,
    state.frontRightGripMultiplier,
  );
  const rearLeftCapacity = getWheelCapacity(
    state.rearLeftLoadNewtons,
    staticRearLoad,
    state.rearLeftGripMultiplier,
  );
  const rearRightCapacity = getWheelCapacity(
    state.rearRightLoadNewtons,
    staticRearLoad,
    state.rearRightGripMultiplier,
  );

  // Build each contact patch in its own steered coordinate frame. This makes
  // braking and drive force turn with the front wheels instead of remaining
  // invisibly locked to the chassis axis at high steering angles.
  const frontAxleDistanceM = geometryFrame.frontAxleFromCgM;
  const rearAxleDistanceM = geometryFrame.rearAxleFromCgM;
  const frontAxleDistance = frontAxleDistanceM * pixelsPerMeter;
  const rearAxleDistance = rearAxleDistanceM * pixelsPerMeter;
  const trackWidth = style.physics.trackWidthM * pixelsPerMeter;
  const halfTrack = trackWidth / 2;
  const halfTrackM = style.physics.trackWidthM / 2;
  const ackermann = getCarAckermannSteeringAngles(
    state.steeringAngle,
    wheelbase,
    trackWidth,
  );
  const frontContactLateralSpeed = lateralSpeed
    + state.yawRate * frontAxleDistance;
  const rearContactLateralSpeed = lateralSpeed
    - state.yawRate * rearAxleDistance;
  const getWheelKinematics = (
    sideOffset: number,
    contactLateralSpeed: number,
    steeringAngle: number,
  ) => {
    const bodyLongitudinalSpeed = longitudinalSpeed
      - state.yawRate * sideOffset;
    const steeringCosine = Math.cos(steeringAngle);
    const steeringSine = Math.sin(steeringAngle);
    const wheelLongitudinalSpeed = bodyLongitudinalSpeed * steeringCosine
      + contactLateralSpeed * steeringSine;
    const wheelLateralSpeed = -bodyLongitudinalSpeed * steeringSine
      + contactLateralSpeed * steeringCosine;
    return {
      bodyLongitudinalSpeed,
      steeringAngle,
      wheelLateralSpeed,
      wheelLongitudinalSpeed,
    };
  };
  const wheelKinematics = {
    frontLeft: getWheelKinematics(-halfTrack, frontContactLateralSpeed, ackermann.left),
    frontRight: getWheelKinematics(halfTrack, frontContactLateralSpeed, ackermann.right),
    rearLeft: getWheelKinematics(-halfTrack, rearContactLateralSpeed, 0),
    rearRight: getWheelKinematics(halfTrack, rearContactLateralSpeed, 0),
  };
  const getSlipAngle = (kinematics: typeof wheelKinematics.frontLeft) => Math.atan2(
    kinematics.wheelLateralSpeed,
    Math.max(0.74 * pixelsPerMeter, Math.abs(kinematics.wheelLongitudinalSpeed)),
  );
  state.frontLeftSlipAngle = getSlipAngle(wheelKinematics.frontLeft);
  state.frontRightSlipAngle = getSlipAngle(wheelKinematics.frontRight);
  state.rearLeftSlipAngle = getSlipAngle(wheelKinematics.rearLeft);
  state.rearRightSlipAngle = getSlipAngle(wheelKinematics.rearRight);
  state.frontSlipAngle = (
    state.frontLeftSlipAngle + state.frontRightSlipAngle
  ) / 2;
  state.rearSlipAngle = (
    state.rearLeftSlipAngle + state.rearRightSlipAngle
  ) / 2;
  const lateralRelaxationLengthM = Math.max(
    0.05,
    style.physics.tireLateralRelaxationLengthM,
  );
  const getTireRelaxationLoadScale = (
    loadNewtons: number,
    referenceLoadNewtons: number,
  ) => clamp(
    Math.pow(
      Math.max(0.05, loadNewtons / Math.max(1, referenceLoadNewtons)),
      style.physics.tireRelaxationLoadSensitivity,
    ),
    0.84,
    1.16,
  );
  const stepLateralContactPatch = (
    previousDeflectionM: number,
    kinematics: typeof wheelKinematics.frontLeft,
    loadNewtons: number,
    referenceLoadNewtons: number,
  ) => {
    const boundedPrevious = Number.isFinite(previousDeflectionM)
      ? previousDeflectionM
      : 0;
    const lateralSlipVelocityMps = kinematics.wheelLateralSpeed / pixelsPerMeter;
    const effectiveRelaxationLengthM = lateralRelaxationLengthM
      * getTireRelaxationLoadScale(loadNewtons, referenceLoadNewtons);
    const transportRate = Math.abs(kinematics.wheelLongitudinalSpeed)
      / pixelsPerMeter / effectiveRelaxationLengthM;
    const nextDeflection = (boundedPrevious
      + lateralSlipVelocityMps * deltaSeconds)
      / (1 + (transportRate
        + style.physics.tireLateralTransportDecayPerSecond) * deltaSeconds);
    return clamp(
      nextDeflection,
      -effectiveRelaxationLengthM
        * style.physics.tireLateralDeflectionLimitRatio,
      effectiveRelaxationLengthM
        * style.physics.tireLateralDeflectionLimitRatio,
    );
  };
  state.frontLeftLateralDeflectionM = stepLateralContactPatch(
    previous.frontLeftLateralDeflectionM,
    wheelKinematics.frontLeft,
    state.frontLeftLoadNewtons,
    staticFrontLoad,
  );
  state.frontRightLateralDeflectionM = stepLateralContactPatch(
    previous.frontRightLateralDeflectionM,
    wheelKinematics.frontRight,
    state.frontRightLoadNewtons,
    staticFrontLoad,
  );
  state.rearLeftLateralDeflectionM = stepLateralContactPatch(
    previous.rearLeftLateralDeflectionM,
    wheelKinematics.rearLeft,
    state.rearLeftLoadNewtons,
    staticRearLoad,
  );
  state.rearRightLateralDeflectionM = stepLateralContactPatch(
    previous.rearRightLateralDeflectionM,
    wheelKinematics.rearRight,
    state.rearRightLoadNewtons,
    staticRearLoad,
  );
  const wheelRadiusM = Math.max(0.05, style.physics.wheelRadiusM);
  const wheelInertiaKgM2 = Math.max(0.05, style.physics.wheelInertiaKgM2);

  // Clutch/converter slip is the compliant driveline state. Do not filter the
  // same torque again after the gearbox; doing so delayed reversals and shifts
  // and allowed the crank and contact patches to disagree about stored energy.
  const frontAxleSpeed = (
    previous.frontLeftWheelSpeed + previous.frontRightWheelSpeed
  ) / 2;
  const rearAxleSpeed = (
    previous.rearLeftWheelSpeed + previous.rearRightWheelSpeed
  ) / 2;
  const longitudinalSpeedMpsForDifferential = longitudinalSpeed / pixelsPerMeter;
  const signedWheelPowerWatts = driveForceNewtons
    * longitudinalSpeedMpsForDifferential;
  const differentialMoving = Math.abs(longitudinalSpeedMpsForDifferential)
    >= style.physics.differentialCoastMinimumSpeedMps;
  const previousCoastEngaged = previous.differentialCoastEngaged
    ?? (previous.differentialCoastBlend ?? 0) >= 0.5;
  const coastSideActive = differentialMoving && (previousCoastEngaged
    ? signedWheelPowerWatts < style.physics.differentialCoastExitPowerWatts
    : signedWheelPowerWatts <= style.physics.differentialCoastEnterPowerWatts);
  state.differentialCoastEngaged = coastSideActive;
  const previousDifferentialCoastBlend = Number.isFinite(
    previous.differentialCoastBlend,
  ) ? clamp(previous.differentialCoastBlend ?? 0, 0, 1) : 0;
  const targetDifferentialCoastBlend = coastSideActive ? 1 : 0;
  state.differentialCoastBlend = previousDifferentialCoastBlend
    + (targetDifferentialCoastBlend - previousDifferentialCoastBlend)
      * (1 - Math.exp(-deltaSeconds / (
        targetDifferentialCoastBlend > previousDifferentialCoastBlend
          ? 0.045
          : 0.065
      )));
  const stepPassiveDifferentialCoupling = (
    previousCoupling: number,
    targetCoupling: number,
    speedDifferenceMps: number,
    maximumChange: number,
  ) => {
    const slipSign = Math.abs(speedDifferenceMps) < 0.025
      ? 0
      : Math.sign(speedDifferenceMps);
    if (slipSign === 0) return approach(previousCoupling, 0, maximumChange);
    if (previousCoupling * slipSign < 0) {
      return approach(previousCoupling, 0, maximumChange);
    }
    const nextCoupling = approach(previousCoupling, targetCoupling, maximumChange);
    return nextCoupling * slipSign < 0 ? 0 : nextCoupling;
  };
  const getDifferentialBias = (differential: CarDifferentialCalibration) => ({
    preloadNewtons: differential.preloadNewtons
      + (differential.coastPreloadNewtons - differential.preloadNewtons)
        * (state.differentialCoastBlend ?? 0),
    torqueBiasRatio: differential.torqueBiasRatio
      + (differential.coastTorqueBiasRatio - differential.torqueBiasRatio)
        * (state.differentialCoastBlend ?? 0),
  });
  const centerDifferential = style.differentials.center;
  const centerDifferentialBias = getDifferentialBias(centerDifferential);
  const centerBiasFraction = (
    centerDifferentialBias.torqueBiasRatio - 1
  ) / Math.max(1, centerDifferentialBias.torqueBiasRatio + 1);
  const centerCouplingCapacity = Math.min(
    frontLeftCapacity.longitudinal + frontRightCapacity.longitudinal,
    rearLeftCapacity.longitudinal + rearRightCapacity.longitudinal,
  );
  const centerCouplingLimit = Math.min(
    centerCouplingCapacity,
    centerDifferentialBias.preloadNewtons
      + Math.abs(driveForceNewtons) * 0.5 * centerBiasFraction,
  );
  const centerSpeedDifferenceMps = (frontAxleSpeed - rearAxleSpeed)
    / pixelsPerMeter;
  const centerCouplingTarget = clamp(
    centerSpeedDifferenceMps * centerDifferential.couplingGainNewtonsPerMps,
    -centerCouplingLimit,
    centerCouplingLimit,
  );
  state.centerDifferentialCouplingForce = stepPassiveDifferentialCoupling(
    previous.centerDifferentialCouplingForce,
    centerCouplingTarget,
    centerSpeedDifferenceMps,
    Math.max(40, centerCouplingLimit * centerDifferential.responseRate)
      * deltaSeconds,
  );
  const frontDrivelineTarget = driveForceNewtons * style.physics.driveBiasFront
    - state.centerDifferentialCouplingForce;
  const rearDrivelineTarget = driveForceNewtons * (1 - style.physics.driveBiasFront)
    + state.centerDifferentialCouplingForce;
  state.frontDrivelineForce = frontDrivelineTarget;
  state.rearDrivelineForce = rearDrivelineTarget;
  const splitDifferentialForce = (
    totalForce: number,
    leftWheelSpeed: number,
    rightWheelSpeed: number,
    leftCapacity: number,
    rightCapacity: number,
    previousCoupling: number,
    differential: CarDifferentialCalibration,
  ) => {
    const differentialBias = getDifferentialBias(differential);
    const weakerCapacity = Math.min(leftCapacity, rightCapacity);
    const strongerCapacity = Math.max(leftCapacity, rightCapacity);
    const biasedAxleLimit = weakerCapacity + Math.min(
      strongerCapacity,
      weakerCapacity * differentialBias.torqueBiasRatio
        + differentialBias.preloadNewtons,
    );
    const boundedForce = clamp(totalForce, -biasedAxleLimit, biasedAxleLimit);
    const speedDifferenceMps = (leftWheelSpeed - rightWheelSpeed)
      / pixelsPerMeter;
    const biasFraction = (differentialBias.torqueBiasRatio - 1)
      / Math.max(1, differentialBias.torqueBiasRatio + 1);
    const couplingLimit = Math.min(
      weakerCapacity,
      differentialBias.preloadNewtons
        + Math.abs(boundedForce) * 0.5 * biasFraction,
    );
    const couplingTarget = clamp(
      speedDifferenceMps * differential.couplingGainNewtonsPerMps,
      -couplingLimit,
      couplingLimit,
    );
    const coupling = stepPassiveDifferentialCoupling(
      previousCoupling,
      couplingTarget,
      speedDifferenceMps,
      Math.max(40, couplingLimit * differential.responseRate) * deltaSeconds,
    );
    return {
      coupling,
      couplingLossJ: Math.max(0, coupling * speedDifferenceMps) * deltaSeconds,
      left: boundedForce / 2 - coupling,
      right: boundedForce / 2 + coupling,
    };
  };
  let frontDrive = splitDifferentialForce(
    state.frontDrivelineForce,
    previous.frontLeftWheelSpeed,
    previous.frontRightWheelSpeed,
    frontLeftCapacity.longitudinal,
    frontRightCapacity.longitudinal,
    previous.frontDifferentialCouplingForce,
    style.differentials.front,
  );
  let rearDrive = splitDifferentialForce(
    state.rearDrivelineForce,
    previous.rearLeftWheelSpeed,
    previous.rearRightWheelSpeed,
    rearLeftCapacity.longitudinal,
    rearRightCapacity.longitudinal,
    previous.rearDifferentialCouplingForce,
    style.differentials.rear,
  );
  state.frontDifferentialCouplingForce = frontDrive.coupling;
  state.rearDifferentialCouplingForce = rearDrive.coupling;
  const centerDifferentialCouplingLossJ = Math.max(
    0,
    state.centerDifferentialCouplingForce * centerSpeedDifferenceMps,
  ) * deltaSeconds;
  state.differentialCouplingLossJ = centerDifferentialCouplingLossJ
    + frontDrive.couplingLossJ + rearDrive.couplingLossJ;

  const wheelRoadSpeeds = {
    frontLeft: wheelKinematics.frontLeft.wheelLongitudinalSpeed
      / pixelsPerMeter,
    frontRight: wheelKinematics.frontRight.wheelLongitudinalSpeed
      / pixelsPerMeter,
    rearLeft: wheelKinematics.rearLeft.wheelLongitudinalSpeed
      / pixelsPerMeter,
    rearRight: wheelKinematics.rearRight.wheelLongitudinalSpeed
      / pixelsPerMeter,
  };
  const getWheelRollingResistanceTorqueNm = (
    wheelSurfaceSpeed: number,
    roadSpeedMps: number,
    loadNewtons: number,
    multiplier: number,
  ) => {
    const wheelSpeedMps = wheelSurfaceSpeed / pixelsPerMeter;
    const referenceSpeedMps = Math.abs(wheelSpeedMps) > 0.02
      ? wheelSpeedMps
      : roadSpeedMps;
    const motionSign = Math.sign(referenceSpeedMps);
    const rollingBlend = smooth01(
      Math.max(Math.abs(wheelSpeedMps), Math.abs(roadSpeedMps)) / 0.38,
    );
    return motionSign * Math.max(0, loadNewtons)
      * style.physics.rollingResistanceCoefficient
      * clamp(multiplier, 0.35, 2.5) * wheelRadiusM * rollingBlend;
  };
  const wheelRollingResistanceTorquesNm = {
    frontLeft: getWheelRollingResistanceTorqueNm(
      previous.frontLeftWheelSpeed, wheelRoadSpeeds.frontLeft,
      state.frontLeftLoadNewtons, rollingResistanceValues[0],
    ),
    frontRight: getWheelRollingResistanceTorqueNm(
      previous.frontRightWheelSpeed, wheelRoadSpeeds.frontRight,
      state.frontRightLoadNewtons, rollingResistanceValues[1],
    ),
    rearLeft: getWheelRollingResistanceTorqueNm(
      previous.rearLeftWheelSpeed, wheelRoadSpeeds.rearLeft,
      state.rearLeftLoadNewtons, rollingResistanceValues[2],
    ),
    rearRight: getWheelRollingResistanceTorqueNm(
      previous.rearRightWheelSpeed, wheelRoadSpeeds.rearRight,
      state.rearRightLoadNewtons, rollingResistanceValues[3],
    ),
  };
  state.rollingResistanceLossJ = [
    [wheelRollingResistanceTorquesNm.frontLeft, previous.frontLeftWheelSpeed],
    [wheelRollingResistanceTorquesNm.frontRight, previous.frontRightWheelSpeed],
    [wheelRollingResistanceTorquesNm.rearLeft, previous.rearLeftWheelSpeed],
    [wheelRollingResistanceTorquesNm.rearRight, previous.rearRightWheelSpeed],
  ].reduce((loss, [torqueNm, wheelSpeed]) => (
    loss + Math.abs(torqueNm * wheelSpeed / pixelsPerMeter / wheelRadiusM)
      * deltaSeconds
  ), 0);
  const getTireReferenceSpeed = (roadSpeedMps: number) => {
    const absoluteRoadSpeed = Math.abs(roadSpeedMps);
    const blend = smooth01(
      Math.abs(longitudinalSpeed) / pixelsPerMeter
        / style.physics.lowSpeedTireBlendMps,
    );
    return style.physics.lowSpeedTireReferenceMps
      + (Math.max(style.physics.lowSpeedTireReferenceMps, absoluteRoadSpeed)
        - style.physics.lowSpeedTireReferenceMps) * blend;
  };
  const solveWheelBrakeConstraint = (
    angularSpeed: number,
    brakeTorqueCapacityNm: number,
  ) => {
    const nextAngularSpeed = approach(
      angularSpeed,
      0,
      Math.max(0, brakeTorqueCapacityNm)
        / wheelInertiaKgM2 * deltaSeconds,
    );
    const appliedTorqueNm = Math.abs(angularSpeed - nextAngularSpeed)
      * wheelInertiaKgM2 / Math.max(0.0001, deltaSeconds);
    return {
      appliedTorqueNm,
      lossJ: Math.max(
        0,
        0.5 * wheelInertiaKgM2
          * (angularSpeed * angularSpeed
            - nextAngularSpeed * nextAngularSpeed),
      ),
      nextAngularSpeed,
    };
  };
  const applyWheelBrakeConstraint = (
    angularSpeed: number,
    brakeTorqueCapacityNm: number,
  ) => solveWheelBrakeConstraint(
    angularSpeed,
    brakeTorqueCapacityNm,
  ).nextAngularSpeed;
  const predictWheelState = (
    wheelSurfaceSpeed: number,
    roadSpeedMps: number,
    driveTorqueNm: number,
    brakeTorqueCapacityNm: number,
    contactPatchForceNewtons = 0,
  ) => {
    const wheelAngularSpeed = wheelSurfaceSpeed
      / pixelsPerMeter / wheelRadiusM;
    const drivenAngularSpeed = wheelAngularSpeed
      + (driveTorqueNm - contactPatchForceNewtons * wheelRadiusM)
        / wheelInertiaKgM2 * deltaSeconds;
    const predictedWheelSpeedMps = applyWheelBrakeConstraint(
      drivenAngularSpeed,
      brakeTorqueCapacityNm,
    ) * wheelRadiusM;
    return {
      accelerationMps2: (
        predictedWheelSpeedMps - wheelSurfaceSpeed / pixelsPerMeter
      ) / deltaSeconds,
      slip: (predictedWheelSpeedMps - roadSpeedMps)
        / getTireReferenceSpeed(roadSpeedMps),
    };
  };
  const predictSlip = (
    wheelSurfaceSpeed: number,
    roadSpeedMps: number,
    driveTorqueNm: number,
    brakeTorqueCapacityNm: number,
    contactPatchForceNewtons: number,
  ) => predictWheelState(
    wheelSurfaceSpeed,
    roadSpeedMps,
    driveTorqueNm,
    brakeTorqueCapacityNm,
    contactPatchForceNewtons,
  ).slip;
  const driveSign = Math.sign(driveForceNewtons);
  const travelSign = Math.sign(longitudinalSpeed || state.driveDirection);
  const tractionControlAuthority = clamp(
    (Math.abs(longitudinalSpeed) / pixelsPerMeter
      - style.controls.driverAids.tractionActivationSpeedMps)
      / style.controls.driverAids.tractionActivationRangeMps,
    0,
    1,
  );
  const getTractionReduction = (
    force: number,
    previousSlip: number,
    predictedSlip: number,
  ) => force === 0 || resistingDrivelineForce
    ? 0
    : clamp(
        (Math.max(
          driveSign * previousSlip,
          driveSign * (
            previousSlip + (predictedSlip - previousSlip) * 0.25
          ),
        ) - style.controls.driverAids.tractionSlipThreshold)
          / style.controls.driverAids.tractionSlipRange,
        0,
        style.controls.driverAids.tractionMaximumReduction,
      ) * tractionControlAuthority;
  const engineDragAuthority = resistingDrivelineForce
    ? smooth01((Math.abs(longitudinalSpeed) / pixelsPerMeter - 0.35) / 2.45)
    : 0;
  const getEngineDragReduction = (
    force: number,
    previousSlip: number,
    predictedSlip: number,
  ) => force === 0 || !resistingDrivelineForce || travelSign === 0
    ? 0
    : clamp(
        (Math.max(
          -travelSign * previousSlip,
          -travelSign * (
            previousSlip + (predictedSlip - previousSlip) * 0.3
          ),
        ) - style.controls.driverAids.engineDragSlipThreshold)
          / style.controls.driverAids.engineDragSlipRange,
        0,
        style.controls.driverAids.engineDragMaximumReduction,
      ) * engineDragAuthority;
  const frontLeftPredictedDriveSlip = predictSlip(
    previous.frontLeftWheelSpeed,
    wheelRoadSpeeds.frontLeft,
    frontDrive.left * wheelRadiusM
      - wheelRollingResistanceTorquesNm.frontLeft,
    0,
    previous.frontLeftLongitudinalForce,
  );
  const frontRightPredictedDriveSlip = predictSlip(
    previous.frontRightWheelSpeed,
    wheelRoadSpeeds.frontRight,
    frontDrive.right * wheelRadiusM
      - wheelRollingResistanceTorquesNm.frontRight,
    0,
    previous.frontRightLongitudinalForce,
  );
  const rearLeftPredictedDriveSlip = predictSlip(
    previous.rearLeftWheelSpeed,
    wheelRoadSpeeds.rearLeft,
    rearDrive.left * wheelRadiusM
      - wheelRollingResistanceTorquesNm.rearLeft,
    0,
    previous.rearLeftLongitudinalForce,
  );
  const rearRightPredictedDriveSlip = predictSlip(
    previous.rearRightWheelSpeed,
    wheelRoadSpeeds.rearRight,
    rearDrive.right * wheelRadiusM
      - wheelRollingResistanceTorquesNm.rearRight,
    0,
    previous.rearRightLongitudinalForce,
  );
  const frontLeftTraction = getTractionReduction(
    frontDrive.left,
    previous.frontLeftLongitudinalSlip,
    frontLeftPredictedDriveSlip,
  );
  const frontRightTraction = getTractionReduction(
    frontDrive.right,
    previous.frontRightLongitudinalSlip,
    frontRightPredictedDriveSlip,
  );
  const rearLeftTraction = getTractionReduction(
    rearDrive.left,
    previous.rearLeftLongitudinalSlip,
    rearLeftPredictedDriveSlip,
  );
  const rearRightTraction = getTractionReduction(
    rearDrive.right,
    previous.rearRightLongitudinalSlip,
    rearRightPredictedDriveSlip,
  );
  const frontLeftEngineDrag = getEngineDragReduction(
    frontDrive.left,
    previous.frontLeftLongitudinalSlip,
    frontLeftPredictedDriveSlip,
  );
  const frontRightEngineDrag = getEngineDragReduction(
    frontDrive.right,
    previous.frontRightLongitudinalSlip,
    frontRightPredictedDriveSlip,
  );
  const rearLeftEngineDrag = getEngineDragReduction(
    rearDrive.left,
    previous.rearLeftLongitudinalSlip,
    rearLeftPredictedDriveSlip,
  );
  const rearRightEngineDrag = getEngineDragReduction(
    rearDrive.right,
    previous.rearRightLongitudinalSlip,
    rearRightPredictedDriveSlip,
  );
  const loadAwareBrakeBiasFront = clamp(
    style.physics.brakeBiasFront * 0.58 + frontLoadShare * 0.42,
    0.5,
    0.76,
  );
  const effectiveBrakeBiasFront = parking
    ? style.physics.brakeBiasFront
    : loadAwareBrakeBiasFront;
  const frontMaximumBrakeTorquePerWheel = maximumBrakeForceNewtons
    * effectiveBrakeBiasFront / 2 * wheelRadiusM;
  const rearMaximumBrakeTorquePerWheel = maximumBrakeForceNewtons
    * (1 - effectiveBrakeBiasFront) / 2 * wheelRadiusM;
  const wheelBrakeLoadScale = (
    loadNewtons: number,
    axleLoadNewtons: number,
  ) => {
    if (parking) return 1;
    const loadScale = loadNewtons / Math.max(1, axleLoadNewtons * 0.5);
    return clamp(loadScale, 0.68, 1.18);
  };
  const ebdPressureTargets = {
    frontLeft: state.brakePressure * wheelBrakeLoadScale(
      state.frontLeftLoadNewtons,
      frontWeightNewtons,
    ),
    frontRight: state.brakePressure * wheelBrakeLoadScale(
      state.frontRightLoadNewtons,
      frontWeightNewtons,
    ),
    rearLeft: state.brakePressure * wheelBrakeLoadScale(
      state.rearLeftLoadNewtons,
      rearWeightNewtons,
    ),
    rearRight: state.brakePressure * wheelBrakeLoadScale(
      state.rearRightLoadNewtons,
      rearWeightNewtons,
    ),
  };
  const stepEbdPressure = (previousPressure: number, targetPressure: number) => {
    const boundedPrevious = Number.isFinite(previousPressure)
      ? clamp(previousPressure, 0, 1)
      : 0;
    const boundedTarget = clamp(targetPressure, 0, 1);
    if (parking) return boundedTarget;
    if (Math.abs(boundedTarget - boundedPrevious)
      <= style.controls.driverAids.ebdDeadband) {
      return boundedPrevious;
    }
    const rate = boundedTarget < boundedPrevious
      ? style.controls.driverAids.ebdReleaseRate
      : style.controls.driverAids.ebdApplyRate;
    return approach(boundedPrevious, boundedTarget, rate * deltaSeconds);
  };
  state.frontLeftEbdPressure = stepEbdPressure(
    previous.frontLeftEbdPressure,
    ebdPressureTargets.frontLeft,
  );
  state.frontRightEbdPressure = stepEbdPressure(
    previous.frontRightEbdPressure,
    ebdPressureTargets.frontRight,
  );
  state.rearLeftEbdPressure = stepEbdPressure(
    previous.rearLeftEbdPressure,
    ebdPressureTargets.rearLeft,
  );
  state.rearRightEbdPressure = stepEbdPressure(
    previous.rearRightEbdPressure,
    ebdPressureTargets.rearRight,
  );
  const serviceBrakePressures = {
    frontLeft: state.frontLeftEbdPressure,
    frontRight: state.frontRightEbdPressure,
    rearLeft: state.rearLeftEbdPressure,
    rearRight: state.rearRightEbdPressure,
  };
  // Steering input never adds brake pressure. Only the service-brake/EBD path
  // can request wheel braking; Ackermann geometry and tire forces own turn-in.
  const requestedBrakePressures = { ...serviceBrakePressures };
  const getWheelMotionSign = (wheelSurfaceSpeed: number, roadSpeedMps: number) => (
    Math.sign(
      Math.abs(wheelSurfaceSpeed) > 1
        ? wheelSurfaceSpeed
        : Math.abs(roadSpeedMps) > 0.004
          ? roadSpeedMps
          : longitudinalDirection,
    )
  );
  const updateWheelBrakePressure = (
    previousPressure: number,
    previousPhase: CarAbsPhase,
    previousSlip: number,
    predictedSlip: number,
    predictedWheelAcceleration: number,
    predictedRoadAccelerationMps2: number,
    requestedPressure: number,
    wheelMotionSign: number,
    roadSpeedMps: number,
    gripMultiplier: number,
    loadNewtons: number,
    referenceLoadNewtons: number,
  ) => {
    const surfaceGrip = clamp(gripMultiplier, 0.15, 1.5);
    const surfaceGripScale = Math.sqrt(surfaceGrip);
    const surfaceAbsSlipThreshold = Math.max(
      style.physics.tirePeakSlip * (0.82 + surfaceGripScale * 0.18),
      style.controls.driverAids.absSlipThreshold
        * (0.7 + surfaceGripScale * 0.3),
    );
    const surfaceAbsSlipRange = style.controls.driverAids.absSlipRange
      * (0.76 + surfaceGripScale * 0.24);
    const loadScale = clamp(
      Math.sqrt(Math.max(0.05, loadNewtons / Math.max(1, referenceLoadNewtons))),
      0.75,
      1.2,
    );
    const surfaceDecelerationThreshold =
      style.controls.driverAids.absDecelerationThreshold
        * (0.58 + surfaceGripScale * 0.42) * loadScale;
    const anticipatedSlip = previousSlip
      + (predictedSlip - previousSlip) * 0.18;
    const absAuthority = smooth01(
      (Math.abs(roadSpeedMps)
        - style.controls.driverAids.absActivationSpeedMps)
        / style.controls.driverAids.absActivationRangeMps,
    );
    const slipLockDemand = requestedPressure > 0 && wheelMotionSign !== 0
      ? clamp(
          (Math.max(
            -wheelMotionSign * previousSlip,
            -wheelMotionSign * anticipatedSlip,
          ) - surfaceAbsSlipThreshold)
            / surfaceAbsSlipRange,
          0,
          style.controls.driverAids.absMaximumRelease,
        )
      : 0;
    const relativeWheelAcceleration = predictedWheelAcceleration
      - predictedRoadAccelerationMps2;
    const wheelDeceleration = -wheelMotionSign * relativeWheelAcceleration;
    const decelerationLockDemand = requestedPressure > 0 && wheelMotionSign !== 0
      ? clamp(
          (wheelDeceleration
            - surfaceDecelerationThreshold)
            / Math.max(6, 12 * surfaceGripScale * loadScale),
          0,
          0.22,
        )
      : 0;
    const lockDemand = Math.max(slipLockDemand, decelerationLockDemand)
      * absAuthority;
    const signedAnticipatedSlip = -wheelMotionSign * anticipatedSlip;
    const releaseRecovered = signedAnticipatedSlip
      < surfaceAbsSlipThreshold * 0.58
      && wheelDeceleration
        < surfaceDecelerationThreshold * 0.72;
    const nearThreshold = signedAnticipatedSlip
      >= surfaceAbsSlipThreshold * 0.82;
    const phase: CarAbsPhase = requestedPressure <= 0
      ? "apply"
      : lockDemand > 0.015
        ? "release"
        : previousPhase === "release" && !releaseRecovered
          ? "hold"
          : nearThreshold && previousPressure > 0
            ? "hold"
            : "apply";
    const targetPressure = phase === "release"
      ? requestedPressure * (1 - lockDemand)
      : phase === "hold"
        ? Math.min(previousPressure, requestedPressure)
        : requestedPressure;
    return {
      lockDemand,
      phase,
      pressure: approach(
        previousPressure,
        targetPressure,
        (phase === "release" || targetPressure < previousPressure
          ? style.controls.driverAids.absPressureReleaseRate
          : phase === "hold"
            ? 0
            : style.controls.driverAids.absPressureApplyRate) * deltaSeconds,
      ),
    };
  };
  const frontLeftBrakeSign = -getWheelMotionSign(
    previous.frontLeftWheelSpeed,
    wheelRoadSpeeds.frontLeft,
  );
  const frontRightBrakeSign = -getWheelMotionSign(
    previous.frontRightWheelSpeed,
    wheelRoadSpeeds.frontRight,
  );
  const rearLeftBrakeSign = -getWheelMotionSign(
    previous.rearLeftWheelSpeed,
    wheelRoadSpeeds.rearLeft,
  );
  const rearRightBrakeSign = -getWheelMotionSign(
    previous.rearRightWheelSpeed,
    wheelRoadSpeeds.rearRight,
  );
  const stepWheelIntervention = (
    previousActivity: number,
    target: number,
    applyRate: number,
    releaseRate: number,
  ) => {
    const current = Number.isFinite(previousActivity)
      ? clamp(previousActivity, 0, 0.95)
      : 0;
    return approach(
      current,
      target,
      (target > current ? applyRate : releaseRate) * deltaSeconds,
    );
  };
  state.frontLeftTractionControlActivity = stepWheelIntervention(
    previous.frontLeftTractionControlActivity,
    frontLeftTraction,
    style.controls.driverAids.tractionApplyRate,
    style.controls.driverAids.tractionReleaseRate,
  );
  state.frontRightTractionControlActivity = stepWheelIntervention(
    previous.frontRightTractionControlActivity,
    frontRightTraction,
    style.controls.driverAids.tractionApplyRate,
    style.controls.driverAids.tractionReleaseRate,
  );
  state.rearLeftTractionControlActivity = stepWheelIntervention(
    previous.rearLeftTractionControlActivity,
    rearLeftTraction,
    style.controls.driverAids.tractionApplyRate,
    style.controls.driverAids.tractionReleaseRate,
  );
  state.rearRightTractionControlActivity = stepWheelIntervention(
    previous.rearRightTractionControlActivity,
    rearRightTraction,
    style.controls.driverAids.tractionApplyRate,
    style.controls.driverAids.tractionReleaseRate,
  );
  state.frontLeftEngineDragControlActivity = stepWheelIntervention(
    previous.frontLeftEngineDragControlActivity,
    frontLeftEngineDrag,
    style.controls.driverAids.engineDragApplyRate,
    style.controls.driverAids.engineDragReleaseRate,
  );
  state.frontRightEngineDragControlActivity = stepWheelIntervention(
    previous.frontRightEngineDragControlActivity,
    frontRightEngineDrag,
    style.controls.driverAids.engineDragApplyRate,
    style.controls.driverAids.engineDragReleaseRate,
  );
  state.rearLeftEngineDragControlActivity = stepWheelIntervention(
    previous.rearLeftEngineDragControlActivity,
    rearLeftEngineDrag,
    style.controls.driverAids.engineDragApplyRate,
    style.controls.driverAids.engineDragReleaseRate,
  );
  state.rearRightEngineDragControlActivity = stepWheelIntervention(
    previous.rearRightEngineDragControlActivity,
    rearRightEngineDrag,
    style.controls.driverAids.engineDragApplyRate,
    style.controls.driverAids.engineDragReleaseRate,
  );
  // A differential may redistribute axle torque, but traction intervention must
  // not trim the left and right wheels independently during a held turn. That
  // asymmetric trim was another alternating yaw input under acceleration.
  const frontAxleTractionActivity = Math.max(
    state.frontLeftTractionControlActivity,
    state.frontRightTractionControlActivity,
  );
  const rearAxleTractionActivity = Math.max(
    state.rearLeftTractionControlActivity,
    state.rearRightTractionControlActivity,
  );
  const effectiveTraction = {
    frontLeft: frontAxleTractionActivity,
    frontRight: frontAxleTractionActivity,
    rearLeft: rearAxleTractionActivity,
    rearRight: rearAxleTractionActivity,
  };
  const effectiveEngineDrag = {
    frontLeft: state.frontLeftEngineDragControlActivity,
    frontRight: state.frontRightEngineDragControlActivity,
    rearLeft: state.rearLeftEngineDragControlActivity,
    rearRight: state.rearRightEngineDragControlActivity,
  };
  state.tractionControlActivity = Math.max(...Object.values(effectiveTraction));
  state.engineDragControlActivity = Math.max(...Object.values(effectiveEngineDrag));
  let frontLeftDriveTorque = frontDrive.left * wheelRadiusM
    * (1 - effectiveTraction.frontLeft) * (1 - effectiveEngineDrag.frontLeft)
    - wheelRollingResistanceTorquesNm.frontLeft;
  let frontRightDriveTorque = frontDrive.right * wheelRadiusM
    * (1 - effectiveTraction.frontRight) * (1 - effectiveEngineDrag.frontRight)
    - wheelRollingResistanceTorquesNm.frontRight;
  let rearLeftDriveTorque = rearDrive.left * wheelRadiusM
    * (1 - effectiveTraction.rearLeft) * (1 - effectiveEngineDrag.rearLeft)
    - wheelRollingResistanceTorquesNm.rearLeft;
  let rearRightDriveTorque = rearDrive.right * wheelRadiusM
    * (1 - effectiveTraction.rearRight) * (1 - effectiveEngineDrag.rearRight)
    - wheelRollingResistanceTorquesNm.rearRight;
  const candidateBrakePressure = (
    previousPressure: number,
    requestedPressure: number,
  ) => approach(
    clamp(previousPressure, 0, 1),
    clamp(requestedPressure, 0, 1),
    (requestedPressure < previousPressure
      ? style.controls.driverAids.absPressureReleaseRate
      : style.controls.driverAids.absPressureApplyRate) * deltaSeconds,
  );
  const candidateBrakePressures = {
    frontLeft: candidateBrakePressure(
      previous.frontLeftBrakePressure,
      requestedBrakePressures.frontLeft,
    ),
    frontRight: candidateBrakePressure(
      previous.frontRightBrakePressure,
      requestedBrakePressures.frontRight,
    ),
    rearLeft: candidateBrakePressure(
      previous.rearLeftBrakePressure,
      requestedBrakePressures.rearLeft,
    ),
    rearRight: candidateBrakePressure(
      previous.rearRightBrakePressure,
      requestedBrakePressures.rearRight,
    ),
  };
  const wheelRoadAccelerationsMps2 = {
    frontLeft: estimatedLongitudinalAccelerationMps * Math.cos(ackermann.left)
      + estimatedLateralAccelerationMps * Math.sin(ackermann.left),
    frontRight: estimatedLongitudinalAccelerationMps * Math.cos(ackermann.right)
      + estimatedLateralAccelerationMps * Math.sin(ackermann.right),
    rearLeft: estimatedLongitudinalAccelerationMps,
    rearRight: estimatedLongitudinalAccelerationMps,
  };
  const getBrakeStates = (contactPatchForces: {
    frontLeft: number;
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  }) => {
    const frontLeftPrediction = predictWheelState(
      previous.frontLeftWheelSpeed,
      wheelRoadSpeeds.frontLeft,
      frontLeftDriveTorque,
      frontMaximumBrakeTorquePerWheel * candidateBrakePressures.frontLeft,
      contactPatchForces.frontLeft,
    );
    const frontRightPrediction = predictWheelState(
      previous.frontRightWheelSpeed,
      wheelRoadSpeeds.frontRight,
      frontRightDriveTorque,
      frontMaximumBrakeTorquePerWheel * candidateBrakePressures.frontRight,
      contactPatchForces.frontRight,
    );
    const rearLeftPrediction = predictWheelState(
      previous.rearLeftWheelSpeed,
      wheelRoadSpeeds.rearLeft,
      rearLeftDriveTorque,
      rearMaximumBrakeTorquePerWheel * candidateBrakePressures.rearLeft,
      contactPatchForces.rearLeft,
    );
    const rearRightPrediction = predictWheelState(
      previous.rearRightWheelSpeed,
      wheelRoadSpeeds.rearRight,
      rearRightDriveTorque,
      rearMaximumBrakeTorquePerWheel * candidateBrakePressures.rearRight,
      contactPatchForces.rearRight,
    );
    return {
      frontLeft: updateWheelBrakePressure(
        previous.frontLeftBrakePressure,
        previous.frontLeftAbsPhase,
        previous.frontLeftLongitudinalSlip,
        frontLeftPrediction.slip,
        frontLeftPrediction.accelerationMps2,
        wheelRoadAccelerationsMps2.frontLeft,
        requestedBrakePressures.frontLeft,
        -frontLeftBrakeSign,
        wheelRoadSpeeds.frontLeft,
        state.frontLeftGripMultiplier,
        state.frontLeftLoadNewtons,
        staticFrontLoad,
      ),
      frontRight: updateWheelBrakePressure(
        previous.frontRightBrakePressure,
        previous.frontRightAbsPhase,
        previous.frontRightLongitudinalSlip,
        frontRightPrediction.slip,
        frontRightPrediction.accelerationMps2,
        wheelRoadAccelerationsMps2.frontRight,
        requestedBrakePressures.frontRight,
        -frontRightBrakeSign,
        wheelRoadSpeeds.frontRight,
        state.frontRightGripMultiplier,
        state.frontRightLoadNewtons,
        staticFrontLoad,
      ),
      rearLeft: updateWheelBrakePressure(
        previous.rearLeftBrakePressure,
        previous.rearLeftAbsPhase,
        previous.rearLeftLongitudinalSlip,
        rearLeftPrediction.slip,
        rearLeftPrediction.accelerationMps2,
        wheelRoadAccelerationsMps2.rearLeft,
        requestedBrakePressures.rearLeft,
        -rearLeftBrakeSign,
        wheelRoadSpeeds.rearLeft,
        state.rearLeftGripMultiplier,
        state.rearLeftLoadNewtons,
        staticRearLoad,
      ),
      rearRight: updateWheelBrakePressure(
        previous.rearRightBrakePressure,
        previous.rearRightAbsPhase,
        previous.rearRightLongitudinalSlip,
        rearRightPrediction.slip,
        rearRightPrediction.accelerationMps2,
        wheelRoadAccelerationsMps2.rearRight,
        requestedBrakePressures.rearRight,
        -rearRightBrakeSign,
        wheelRoadSpeeds.rearRight,
        state.rearRightGripMultiplier,
        state.rearRightLoadNewtons,
        staticRearLoad,
      ),
    };
  };
  let brakeStates = getBrakeStates({
    frontLeft: previous.frontLeftLongitudinalForce,
    frontRight: previous.frontRightLongitudinalForce,
    rearLeft: previous.rearLeftLongitudinalForce,
    rearRight: previous.rearRightLongitudinalForce,
  });
  let wheelBrakeTorqueCapacitiesNm = {
    frontLeft: frontMaximumBrakeTorquePerWheel * brakeStates.frontLeft.pressure,
    frontRight: frontMaximumBrakeTorquePerWheel * brakeStates.frontRight.pressure,
    rearLeft: rearMaximumBrakeTorquePerWheel * brakeStates.rearLeft.pressure,
    rearRight: rearMaximumBrakeTorquePerWheel * brakeStates.rearRight.pressure,
  };

  // The carcass-deflection state owns tire relaxation continuously from a
  // stationary scrub through normal rolling speed. Force follows that physical
  // state directly instead of switching between separate crawl and slip-angle
  // approximations.
  const wheelStiffnessNewtons = style.physics.corneringStiffness
    * massKg * style.physics.tireResponseScale;
  const getLateralForceDemand = (
    contactPatchDeflectionM: number,
    capacity: number,
    loadNewtons: number,
    referenceLoadNewtons: number,
    stiffnessScale = 1,
  ) => {
    const loadScale = Math.sqrt(loadNewtons / Math.max(1, referenceLoadNewtons));
    const deflectionAngle = contactPatchDeflectionM / (
      lateralRelaxationLengthM
        * getTireRelaxationLoadScale(loadNewtons, referenceLoadNewtons)
    );
    const demand = -deflectionAngle * wheelStiffnessNewtons
      * stiffnessScale * loadScale;
    // Preserve demand beyond peak so the shared vector tire response can
    // determine breakaway. Capping this axis first made combined slip behave
    // like two independent tires sharing only a final limiter.
    return clamp(demand, -capacity * 2.5, capacity * 2.5);
  };
  state.frontLeftLateralForce = getLateralForceDemand(
    state.frontLeftLateralDeflectionM,
    frontLeftCapacity.lateral,
    state.frontLeftLoadNewtons,
    staticFrontLoad,
  );
  state.frontRightLateralForce = getLateralForceDemand(
    state.frontRightLateralDeflectionM,
    frontRightCapacity.lateral,
    state.frontRightLoadNewtons,
    staticFrontLoad,
  );
  state.rearLeftLateralForce = getLateralForceDemand(
    state.rearLeftLateralDeflectionM,
    rearLeftCapacity.lateral,
    state.rearLeftLoadNewtons,
    staticRearLoad,
    style.physics.rearCorneringStiffnessScale,
  );
  state.rearRightLateralForce = getLateralForceDemand(
    state.rearRightLateralDeflectionM,
    rearRightCapacity.lateral,
    state.rearRightLoadNewtons,
    staticRearLoad,
    style.physics.rearCorneringStiffnessScale,
  );
  const solveWheel = (
    wheelSurfaceSpeed: number,
    wheelDriveTorqueNm: number,
    brakeTorqueCapacityNm: number,
    lateralDemand: number,
    lateralCapacity: number,
    longitudinalCapacity: number,
    roadSpeedMps: number,
    previousLongitudinalDeflectionM: number,
    longitudinalAdhesion: number,
    lateralAdhesion: number,
    relaxationLoadScale: number,
  ) => {
    const wheelAngularSpeed = wheelSurfaceSpeed
      / pixelsPerMeter / wheelRadiusM;
    const longitudinalRelaxationLengthM = Math.max(
      0.04,
      style.physics.tireLongitudinalRelaxationLengthM
        * relaxationLoadScale,
    );
    const boundedPreviousDeflectionM = Number.isFinite(
      previousLongitudinalDeflectionM,
    ) ? previousLongitudinalDeflectionM : 0;
    const drivenWheelAngularSpeed = wheelAngularSpeed
      + wheelDriveTorqueNm / wheelInertiaKgM2 * deltaSeconds;
    const freeWheelSurfaceSpeedMps = applyWheelBrakeConstraint(
      drivenWheelAngularSpeed,
      brakeTorqueCapacityNm,
    ) * wheelRadiusM;
    const longitudinalCarcassStiffness = longitudinalCapacity / Math.max(
      0.001,
      style.physics.tirePeakSlip * longitudinalRelaxationLengthM,
    );
    const transportRate = Math.abs(roadSpeedMps)
      / longitudinalRelaxationLengthM
      + style.physics.tireLongitudinalTransportDecayPerSecond;
    const forceFeedback = longitudinalCarcassStiffness
      * wheelRadiusM * wheelRadiusM / wheelInertiaKgM2
      * deltaSeconds * deltaSeconds;
    const longitudinalDeflectionM = clamp(
      (boundedPreviousDeflectionM
        + (freeWheelSurfaceSpeedMps - roadSpeedMps) * deltaSeconds)
        / (1 + transportRate * deltaSeconds + forceFeedback),
      -longitudinalRelaxationLengthM * style.physics.tirePeakSlip
        * style.physics.tireLongitudinalDeflectionLimitRatio,
      longitudinalRelaxationLengthM * style.physics.tirePeakSlip
        * style.physics.tireLongitudinalDeflectionLimitRatio,
    );
    const longitudinalDemand = longitudinalDeflectionM
      * longitudinalCarcassStiffness;
    const normalizedLongitudinalDemand = longitudinalDemand
      / Math.max(1, longitudinalCapacity);
    const normalizedLateralDemand = lateralDemand
      / Math.max(1, lateralCapacity);
    const tireResponse = getCarCombinedTireResponse(
      normalizedLongitudinalDemand,
      normalizedLateralDemand,
      style.physics.longitudinalSlidingGripRatio,
      style.physics.tireLateralSlidingGripRatio,
      longitudinalAdhesion,
      lateralAdhesion,
      style.physics.tireBreakawaySharpness,
      style.physics.tireShoulderDemand,
      style.physics.tirePeakDemand,
      style.physics.tireSlidingTransitionWidth,
    );
    const longitudinalForce = longitudinalDemand * tireResponse.scale;
    const lateralForce = lateralDemand * tireResponse.scale;
    const predictedWheelAngularSpeed = applyWheelBrakeConstraint(
      wheelAngularSpeed + (
        wheelDriveTorqueNm - longitudinalForce * wheelRadiusM
      ) / wheelInertiaKgM2 * deltaSeconds,
      brakeTorqueCapacityNm,
    );
    return {
      lateralForce,
      longitudinalDeflectionM,
      longitudinalForce,
      normalizedDemand: tireResponse.normalizedDemand,
      normalizedLateralDemand,
      normalizedLongitudinalDemand,
      predictedWheelSurfaceSpeed: predictedWheelAngularSpeed
        * wheelRadiusM * pixelsPerMeter,
    };
  };
  const integrateWheel = (
    wheelSurfaceSpeed: number,
    wheelDriveTorqueNm: number,
    brakeTorqueCapacityNm: number,
    previousLongitudinalDeflectionM: number,
    previousAdhesion: number,
    previousLongitudinalAdhesion: number,
    previousLateralAdhesion: number,
    lateralDemand: number,
    lateralCapacity: number,
    longitudinalCapacity: number,
    roadSpeedMps: number,
    lateralSlipVelocityMps: number,
    relaxationLoadScale: number,
    predictedFrom?: { lateralForce: number; longitudinalForce: number },
    aligning?: {
      contactPatchDeflectionM: number;
      loadNewtons: number;
      referenceLoadNewtons: number;
      sideSign: -1 | 1;
      travelDirection: number;
      wheelSteeringAngle: number;
    },
  ) => {
    const adhesionProbe = solveWheel(
      wheelSurfaceSpeed,
      wheelDriveTorqueNm,
      brakeTorqueCapacityNm,
      lateralDemand,
      lateralCapacity,
      longitudinalCapacity,
      roadSpeedMps,
      previousLongitudinalDeflectionM,
      previousLongitudinalAdhesion,
      previousLateralAdhesion,
      relaxationLoadScale,
    );
    // Breakaway follows measured contact-patch motion, not requested force.
    // Force demand only weights genuine slip, so a heavily loaded but still
    // static tire does not suddenly enter a synthetic sliding state.
    const preContactWheelAngularSpeed = wheelSurfaceSpeed
      / pixelsPerMeter / wheelRadiusM;
    const provisionalWheelAngularSpeed = applyWheelBrakeConstraint(
      preContactWheelAngularSpeed + (
        wheelDriveTorqueNm - adhesionProbe.longitudinalForce * wheelRadiusM
      ) / wheelInertiaKgM2 * deltaSeconds,
      brakeTorqueCapacityNm,
    );
    const postForceLongitudinalSlipMps = provisionalWheelAngularSpeed
      * wheelRadiusM - roadSpeedMps;
    const referenceSlipSpeedMps = Math.max(
      style.physics.tireSlipReferenceSpeedMps,
      Math.abs(roadSpeedMps) * style.physics.tirePeakSlip,
    );
    const normalizedLongitudinalSlipSpeed = Math.abs(
      postForceLongitudinalSlipMps,
    ) / referenceSlipSpeedMps;
    const normalizedLateralSlipSpeed = Math.abs(lateralSlipVelocityMps)
      / referenceSlipSpeedMps;
    const normalizedLongitudinalSlipPower = normalizedLongitudinalSlipSpeed
      * clamp(Math.abs(adhesionProbe.normalizedLongitudinalDemand), 0, 1.4);
    const normalizedLateralSlipPower = normalizedLateralSlipSpeed
      * clamp(Math.abs(adhesionProbe.normalizedLateralDemand), 0, 1.4);
    const advanceAxisAdhesion = (
      previousAxisAdhesion: number,
      normalizedSlipPower: number,
    ) => {
      const boundedPrevious = Number.isFinite(previousAxisAdhesion)
        ? clamp(previousAxisAdhesion, 0, 1)
        : clamp(previousAdhesion, 0, 1);
      const target = 1 - smooth01(
        (normalizedSlipPower - style.physics.tireAdhesionBreakawayPower)
          / Math.max(0.05, style.physics.tireAdhesionTransitionPower),
      );
      const responseSeconds = target < boundedPrevious
        ? style.physics.tireAdhesionReleaseSeconds
        : style.physics.tireAdhesionRecoverySeconds
          / Math.max(0.35, style.physics.tireRecoveryRate);
      return boundedPrevious + (target - boundedPrevious)
        * (1 - Math.exp(-deltaSeconds / responseSeconds));
    };
    const longitudinalAdhesion = advanceAxisAdhesion(
      previousLongitudinalAdhesion,
      Math.hypot(
        normalizedLongitudinalSlipPower,
        normalizedLateralSlipPower * 0.35,
      ),
    );
    const lateralAdhesion = advanceAxisAdhesion(
      previousLateralAdhesion,
      Math.hypot(
        normalizedLateralSlipPower,
        normalizedLongitudinalSlipPower * 0.35,
      ),
    );
    const adhesion = Math.min(longitudinalAdhesion, lateralAdhesion);
    const solved = solveWheel(
      wheelSurfaceSpeed,
      wheelDriveTorqueNm,
      brakeTorqueCapacityNm,
      lateralDemand,
      lateralCapacity,
      longitudinalCapacity,
      roadSpeedMps,
      previousLongitudinalDeflectionM,
      longitudinalAdhesion,
      lateralAdhesion,
      relaxationLoadScale,
    );
    const targetLongitudinalForce = predictedFrom
      ? (predictedFrom.longitudinalForce + solved.longitudinalForce) * 0.5
      : solved.longitudinalForce;
    const targetLateralForce = predictedFrom
      ? (predictedFrom.lateralForce + solved.lateralForce) * 0.5
      : solved.lateralForce;
    // Contact-patch deflection is the physical force transient on both axes.
    // Applying another time-domain filter here made pedal, brake, and steering
    // response pass through the same lag twice. The provisional/final average
    // is a same-step corrector, not stored smoothing.
    let longitudinalForce = targetLongitudinalForce;
    let lateralForce = targetLateralForce;
    const relaxedDemand = Math.hypot(
      longitudinalForce / Math.max(1, longitudinalCapacity),
      lateralForce / Math.max(1, lateralCapacity),
    );
    if (relaxedDemand > 1) {
      longitudinalForce /= relaxedDemand;
      lateralForce /= relaxedDemand;
    }
    const wheelAngularSpeed = wheelSurfaceSpeed
      / pixelsPerMeter / wheelRadiusM;
    const unbrakedWheelAngularSpeed = wheelAngularSpeed
      + (wheelDriveTorqueNm - longitudinalForce * wheelRadiusM)
        / wheelInertiaKgM2 * deltaSeconds;
    const brakeConstraint = solveWheelBrakeConstraint(
      unbrakedWheelAngularSpeed,
      brakeTorqueCapacityNm,
    );
    const nextWheelAngularSpeed = brakeConstraint.nextAngularSpeed;
    const nextWheelSpeedMps = nextWheelAngularSpeed * wheelRadiusM;
    const referenceSpeedMps = getTireReferenceSpeed(roadSpeedMps);
    const slip = (nextWheelSpeedMps - roadSpeedMps) / referenceSpeedMps;
    let aligningMomentNm = 0;
    if (aligning) {
      const loadScale = clamp(
        Math.sqrt(
          Math.max(0, aligning.loadNewtons)
            / Math.max(1, aligning.referenceLoadNewtons),
        ),
        0.6,
        1.25,
      );
      const saturation = Math.max(0, solved.normalizedDemand);
      const aligningPeak = 1 + smooth01(saturation / 0.58) * 0.16;
      const saturationFalloff = 1
        - smooth01((saturation - 0.62) / 0.62) * 0.88;
      const normalizedPatchDeflection = Math.abs(
        aligning.contactPatchDeflectionM,
      ) / Math.max(
        0.01,
        style.physics.tireLateralRelaxationLengthM
          * style.physics.tireLateralDeflectionLimitRatio * loadScale,
      );
      const brushCentroidTrail = 1
        - smooth01((normalizedPatchDeflection - 0.18) / 0.82) * 0.82;
      const effectiveTrailM = style.physics.steeringTrailM * loadScale
        * aligningPeak * saturationFalloff * brushCentroidTrail
        * (0.32 + clamp(adhesion, 0, 1) * 0.68)
        * Math.cos(aligning.wheelSteeringAngle);
      aligningMomentNm = -lateralForce * effectiveTrailM
        * aligning.travelDirection
        + longitudinalForce * style.physics.steeringScrubRadiusM
          * aligning.sideSign;
    }
    return {
      adhesion,
      brakeLossJ: brakeConstraint.lossJ,
      aligningMomentNm,
      lateralAdhesion,
      longitudinalAdhesion,
      longitudinalDeflectionM: solved.longitudinalDeflectionM,
      normalizedDemand: solved.normalizedDemand,
      lateralForce,
      longitudinalForce,
      slip,
      wheelSurfaceSpeed: nextWheelSpeedMps * pixelsPerMeter,
    };
  };
  const solveProvisionalTires = () => ({
    frontLeft: solveWheel(
      state.frontLeftWheelSpeed,
      frontLeftDriveTorque,
      wheelBrakeTorqueCapacitiesNm.frontLeft,
      state.frontLeftLateralForce,
      frontLeftCapacity.lateral,
      frontLeftCapacity.longitudinal,
      wheelRoadSpeeds.frontLeft,
      previous.frontLeftLongitudinalDeflectionM,
      axisAdhesion.frontLeft.longitudinal,
      axisAdhesion.frontLeft.lateral,
      getTireRelaxationLoadScale(state.frontLeftLoadNewtons, staticFrontLoad),
    ),
    frontRight: solveWheel(
      state.frontRightWheelSpeed,
      frontRightDriveTorque,
      wheelBrakeTorqueCapacitiesNm.frontRight,
      state.frontRightLateralForce,
      frontRightCapacity.lateral,
      frontRightCapacity.longitudinal,
      wheelRoadSpeeds.frontRight,
      previous.frontRightLongitudinalDeflectionM,
      axisAdhesion.frontRight.longitudinal,
      axisAdhesion.frontRight.lateral,
      getTireRelaxationLoadScale(state.frontRightLoadNewtons, staticFrontLoad),
    ),
    rearLeft: solveWheel(
      state.rearLeftWheelSpeed,
      rearLeftDriveTorque,
      wheelBrakeTorqueCapacitiesNm.rearLeft,
      state.rearLeftLateralForce,
      rearLeftCapacity.lateral,
      rearLeftCapacity.longitudinal,
      wheelRoadSpeeds.rearLeft,
      previous.rearLeftLongitudinalDeflectionM,
      axisAdhesion.rearLeft.longitudinal,
      axisAdhesion.rearLeft.lateral,
      getTireRelaxationLoadScale(state.rearLeftLoadNewtons, staticRearLoad),
    ),
    rearRight: solveWheel(
      state.rearRightWheelSpeed,
      rearRightDriveTorque,
      wheelBrakeTorqueCapacitiesNm.rearRight,
      state.rearRightLateralForce,
      rearRightCapacity.lateral,
      rearRightCapacity.longitudinal,
      wheelRoadSpeeds.rearRight,
      previous.rearRightLongitudinalDeflectionM,
      axisAdhesion.rearRight.longitudinal,
      axisAdhesion.rearRight.lateral,
      getTireRelaxationLoadScale(state.rearRightLoadNewtons, staticRearLoad),
    ),
  });
  let provisionalTires = solveProvisionalTires();
  let {
    frontLeft: firstFrontLeft,
    frontRight: firstFrontRight,
    rearLeft: firstRearLeft,
    rearRight: firstRearRight,
  } = provisionalTires;
  // Re-evaluate the passive differentials from the provisional same-step wheel
  // response. This bounded corrector couples torque bias to the wheel/tire
  // solve without introducing an open-ended iteration.
  const correctedFrontAxleSpeed = (
    firstFrontLeft.predictedWheelSurfaceSpeed
      + firstFrontRight.predictedWheelSurfaceSpeed
  ) * 0.5;
  const correctedRearAxleSpeed = (
    firstRearLeft.predictedWheelSurfaceSpeed
      + firstRearRight.predictedWheelSurfaceSpeed
  ) * 0.5;
  const correctedCenterSpeedDifferenceMps = (
    correctedFrontAxleSpeed - correctedRearAxleSpeed
  ) / pixelsPerMeter;
  const correctedCenterCouplingTarget = clamp(
    correctedCenterSpeedDifferenceMps
      * centerDifferential.couplingGainNewtonsPerMps,
    -centerCouplingLimit,
    centerCouplingLimit,
  );
  state.centerDifferentialCouplingForce = stepPassiveDifferentialCoupling(
    previous.centerDifferentialCouplingForce,
    correctedCenterCouplingTarget,
    correctedCenterSpeedDifferenceMps,
    Math.max(40, centerCouplingLimit * centerDifferential.responseRate)
      * deltaSeconds,
  );
  state.frontDrivelineForce = driveForceNewtons * style.physics.driveBiasFront
    - state.centerDifferentialCouplingForce;
  state.rearDrivelineForce = driveForceNewtons
    * (1 - style.physics.driveBiasFront)
    + state.centerDifferentialCouplingForce;
  frontDrive = splitDifferentialForce(
    state.frontDrivelineForce,
    firstFrontLeft.predictedWheelSurfaceSpeed,
    firstFrontRight.predictedWheelSurfaceSpeed,
    frontLeftCapacity.longitudinal,
    frontRightCapacity.longitudinal,
    previous.frontDifferentialCouplingForce,
    style.differentials.front,
  );
  rearDrive = splitDifferentialForce(
    state.rearDrivelineForce,
    firstRearLeft.predictedWheelSurfaceSpeed,
    firstRearRight.predictedWheelSurfaceSpeed,
    rearLeftCapacity.longitudinal,
    rearRightCapacity.longitudinal,
    previous.rearDifferentialCouplingForce,
    style.differentials.rear,
  );
  state.frontDifferentialCouplingForce = frontDrive.coupling;
  state.rearDifferentialCouplingForce = rearDrive.coupling;
  state.differentialCouplingLossJ = Math.max(
    0,
    state.centerDifferentialCouplingForce
      * correctedCenterSpeedDifferenceMps,
  ) * deltaSeconds + frontDrive.couplingLossJ + rearDrive.couplingLossJ;
  frontLeftDriveTorque = frontDrive.left * wheelRadiusM
    * (1 - effectiveTraction.frontLeft) * (1 - effectiveEngineDrag.frontLeft)
    - wheelRollingResistanceTorquesNm.frontLeft;
  frontRightDriveTorque = frontDrive.right * wheelRadiusM
    * (1 - effectiveTraction.frontRight) * (1 - effectiveEngineDrag.frontRight)
    - wheelRollingResistanceTorquesNm.frontRight;
  rearLeftDriveTorque = rearDrive.left * wheelRadiusM
    * (1 - effectiveTraction.rearLeft) * (1 - effectiveEngineDrag.rearLeft)
    - wheelRollingResistanceTorquesNm.rearLeft;
  rearRightDriveTorque = rearDrive.right * wheelRadiusM
    * (1 - effectiveTraction.rearRight) * (1 - effectiveEngineDrag.rearRight)
    - wheelRollingResistanceTorquesNm.rearRight;
  provisionalTires = solveProvisionalTires();
  ({
    frontLeft: firstFrontLeft,
    frontRight: firstFrontRight,
    rearLeft: firstRearLeft,
    rearRight: firstRearRight,
  } = provisionalTires);

  // Close the ABS/contact-patch loop once with the provisional tire forces.
  // This keeps tire reaction in the same-step wheel deceleration estimate
  // without adding an open-ended or expensive iterative solve.
  brakeStates = getBrakeStates({
    frontLeft: firstFrontLeft.longitudinalForce,
    frontRight: firstFrontRight.longitudinalForce,
    rearLeft: firstRearLeft.longitudinalForce,
    rearRight: firstRearRight.longitudinalForce,
  });
  state.frontLeftBrakePressure = brakeStates.frontLeft.pressure;
  state.frontLeftAbsPhase = brakeStates.frontLeft.phase;
  state.frontRightBrakePressure = brakeStates.frontRight.pressure;
  state.frontRightAbsPhase = brakeStates.frontRight.phase;
  state.rearLeftBrakePressure = brakeStates.rearLeft.pressure;
  state.rearLeftAbsPhase = brakeStates.rearLeft.phase;
  state.rearRightBrakePressure = brakeStates.rearRight.pressure;
  state.rearRightAbsPhase = brakeStates.rearRight.phase;
  const absTarget = Math.max(
    brakeStates.frontLeft.lockDemand,
    brakeStates.frontRight.lockDemand,
    brakeStates.rearLeft.lockDemand,
    brakeStates.rearRight.lockDemand,
  );
  state.absActivity = approach(
    state.absActivity,
    absTarget,
    (absTarget > state.absActivity
      ? style.controls.driverAids.absApplyRate
      : style.controls.driverAids.absReleaseRate) * deltaSeconds,
  );
  wheelBrakeTorqueCapacitiesNm = {
    frontLeft: frontMaximumBrakeTorquePerWheel * brakeStates.frontLeft.pressure,
    frontRight: frontMaximumBrakeTorquePerWheel * brakeStates.frontRight.pressure,
    rearLeft: rearMaximumBrakeTorquePerWheel * brakeStates.rearLeft.pressure,
    rearRight: rearMaximumBrakeTorquePerWheel * brakeStates.rearRight.pressure,
  };

  // Pressure modulation changes wheel acceleration and carcass demand. Refresh
  // the provisional contact forces before the final relaxed tire integration.
  provisionalTires = solveProvisionalTires();
  ({
    frontLeft: firstFrontLeft,
    frontRight: firstFrontRight,
    rearLeft: firstRearLeft,
    rearRight: firstRearRight,
  } = provisionalTires);

  // ABS pressure changes the provisional wheel acceleration. Perform one final
  // bounded differential correction from that updated same-step response.
  const absCorrectedFrontAxleSpeed = (
    firstFrontLeft.predictedWheelSurfaceSpeed
      + firstFrontRight.predictedWheelSurfaceSpeed
  ) * 0.5;
  const absCorrectedRearAxleSpeed = (
    firstRearLeft.predictedWheelSurfaceSpeed
      + firstRearRight.predictedWheelSurfaceSpeed
  ) * 0.5;
  const absCorrectedCenterDifferenceMps = (
    absCorrectedFrontAxleSpeed - absCorrectedRearAxleSpeed
  ) / pixelsPerMeter;
  state.centerDifferentialCouplingForce = stepPassiveDifferentialCoupling(
    previous.centerDifferentialCouplingForce,
    clamp(
      absCorrectedCenterDifferenceMps
        * centerDifferential.couplingGainNewtonsPerMps,
      -centerCouplingLimit,
      centerCouplingLimit,
    ),
    absCorrectedCenterDifferenceMps,
    Math.max(40, centerCouplingLimit * centerDifferential.responseRate)
      * deltaSeconds,
  );
  state.frontDrivelineForce = driveForceNewtons * style.physics.driveBiasFront
    - state.centerDifferentialCouplingForce;
  state.rearDrivelineForce = driveForceNewtons
    * (1 - style.physics.driveBiasFront)
    + state.centerDifferentialCouplingForce;
  frontDrive = splitDifferentialForce(
    state.frontDrivelineForce,
    firstFrontLeft.predictedWheelSurfaceSpeed,
    firstFrontRight.predictedWheelSurfaceSpeed,
    frontLeftCapacity.longitudinal,
    frontRightCapacity.longitudinal,
    previous.frontDifferentialCouplingForce,
    style.differentials.front,
  );
  rearDrive = splitDifferentialForce(
    state.rearDrivelineForce,
    firstRearLeft.predictedWheelSurfaceSpeed,
    firstRearRight.predictedWheelSurfaceSpeed,
    rearLeftCapacity.longitudinal,
    rearRightCapacity.longitudinal,
    previous.rearDifferentialCouplingForce,
    style.differentials.rear,
  );
  state.frontDifferentialCouplingForce = frontDrive.coupling;
  state.rearDifferentialCouplingForce = rearDrive.coupling;
  state.differentialCouplingLossJ = Math.max(
    0,
    state.centerDifferentialCouplingForce * absCorrectedCenterDifferenceMps,
  ) * deltaSeconds + frontDrive.couplingLossJ + rearDrive.couplingLossJ;
  frontLeftDriveTorque = frontDrive.left * wheelRadiusM
    * (1 - effectiveTraction.frontLeft) * (1 - effectiveEngineDrag.frontLeft)
    - wheelRollingResistanceTorquesNm.frontLeft;
  frontRightDriveTorque = frontDrive.right * wheelRadiusM
    * (1 - effectiveTraction.frontRight) * (1 - effectiveEngineDrag.frontRight)
    - wheelRollingResistanceTorquesNm.frontRight;
  rearLeftDriveTorque = rearDrive.left * wheelRadiusM
    * (1 - effectiveTraction.rearLeft) * (1 - effectiveEngineDrag.rearLeft)
    - wheelRollingResistanceTorquesNm.rearLeft;
  rearRightDriveTorque = rearDrive.right * wheelRadiusM
    * (1 - effectiveTraction.rearRight) * (1 - effectiveEngineDrag.rearRight)
    - wheelRollingResistanceTorquesNm.rearRight;
  provisionalTires = solveProvisionalTires();
  ({
    frontLeft: firstFrontLeft,
    frontRight: firstFrontRight,
    rearLeft: firstRearLeft,
    rearRight: firstRearRight,
  } = provisionalTires);

  // Predict the velocity at each contact patch, not one shared road-speed
  // delta. Yaw and steering make all four wheel paths different in a turn.
  const predictionBlend = style.physics.tireHighSpeedPredictionBlend * clamp(
    (Math.abs(longitudinalSpeed) / pixelsPerMeter
      - style.physics.tireHighSpeedPredictionStartMps)
      / Math.max(0.1, style.physics.tireHighSpeedPredictionRangeMps),
    0,
    1,
  );
  const provisionalBodyForce = (
    tire: typeof firstFrontLeft,
    kinematics: typeof wheelKinematics.frontLeft,
  ) => ({
    longitudinal: tire.longitudinalForce * Math.cos(kinematics.steeringAngle)
      - tire.lateralForce * Math.sin(kinematics.steeringAngle),
    lateral: tire.longitudinalForce * Math.sin(kinematics.steeringAngle)
      + tire.lateralForce * Math.cos(kinematics.steeringAngle),
  });
  const predictedForces = {
    frontLeft: provisionalBodyForce(firstFrontLeft, wheelKinematics.frontLeft),
    frontRight: provisionalBodyForce(firstFrontRight, wheelKinematics.frontRight),
    rearLeft: provisionalBodyForce(firstRearLeft, wheelKinematics.rearLeft),
    rearRight: provisionalBodyForce(firstRearRight, wheelKinematics.rearRight),
  };
  const predictedLongitudinalForce = Object.values(predictedForces)
    .reduce((sum, force) => sum + force.longitudinal, 0);
  const predictedLateralForce = Object.values(predictedForces)
    .reduce((sum, force) => sum + force.lateral, 0);
  const predictedYawMoment =
    frontAxleDistanceM * (predictedForces.frontLeft.lateral
      + predictedForces.frontRight.lateral)
    - rearAxleDistanceM * (predictedForces.rearLeft.lateral
      + predictedForces.rearRight.lateral)
    + halfTrackM * (predictedForces.frontLeft.longitudinal
      + predictedForces.rearLeft.longitudinal
      - predictedForces.frontRight.longitudinal
      - predictedForces.rearRight.longitudinal);
  const predictionYawInertiaKgM2 = getCarYawInertiaKgM2(style.id, massKg);
  const predictedLongitudinalSpeedMps = longitudinalSpeed / pixelsPerMeter
    + predictedLongitudinalForce / massKg * deltaSeconds * predictionBlend;
  const predictedLateralSpeedMps = lateralSpeed / pixelsPerMeter
    + predictedLateralForce / massKg * deltaSeconds * predictionBlend;
  const predictedYawRate = state.yawRate
    + predictedYawMoment / predictionYawInertiaKgM2
      * deltaSeconds * predictionBlend;
  const getPredictedRoadDelta = (
    currentRoadSpeedMps: number,
    steeringAngle: number,
    axleOffsetM: number,
    sideOffsetM: number,
  ) => {
    const bodyLongitudinalMps = predictedLongitudinalSpeedMps
      - predictedYawRate * sideOffsetM;
    const contactLateralMps = predictedLateralSpeedMps
      + predictedYawRate * axleOffsetM;
    return bodyLongitudinalMps * Math.cos(steeringAngle)
      + contactLateralMps * Math.sin(steeringAngle)
      - currentRoadSpeedMps;
  };
  const predictedRoadDelta = {
    frontLeft: getPredictedRoadDelta(wheelRoadSpeeds.frontLeft, ackermann.left,
      frontAxleDistanceM, -halfTrackM),
    frontRight: getPredictedRoadDelta(wheelRoadSpeeds.frontRight, ackermann.right,
      frontAxleDistanceM, halfTrackM),
    rearLeft: getPredictedRoadDelta(wheelRoadSpeeds.rearLeft, 0,
      -rearAxleDistanceM, -halfTrackM),
    rearRight: getPredictedRoadDelta(wheelRoadSpeeds.rearRight, 0,
      -rearAxleDistanceM, halfTrackM),
  };
  const frontLeftTire = integrateWheel(
    state.frontLeftWheelSpeed,
    frontLeftDriveTorque,
    wheelBrakeTorqueCapacitiesNm.frontLeft,
    previous.frontLeftLongitudinalDeflectionM,
    previousAdhesion.frontLeft,
    axisAdhesion.frontLeft.longitudinal,
    axisAdhesion.frontLeft.lateral,
    state.frontLeftLateralForce,
    frontLeftCapacity.lateral,
    frontLeftCapacity.longitudinal,
    wheelRoadSpeeds.frontLeft + predictedRoadDelta.frontLeft,
    wheelKinematics.frontLeft.wheelLateralSpeed / pixelsPerMeter,
    getTireRelaxationLoadScale(state.frontLeftLoadNewtons, staticFrontLoad),
    firstFrontLeft,
    {
      contactPatchDeflectionM: state.frontLeftLateralDeflectionM,
      loadNewtons: state.frontLeftLoadNewtons,
      referenceLoadNewtons: staticFrontLoad,
      sideSign: -1,
      travelDirection: Math.sign(longitudinalSpeed || state.driveDirection),
      wheelSteeringAngle: ackermann.left,
    },
  );
  const frontRightTire = integrateWheel(
    state.frontRightWheelSpeed,
    frontRightDriveTorque,
    wheelBrakeTorqueCapacitiesNm.frontRight,
    previous.frontRightLongitudinalDeflectionM,
    previousAdhesion.frontRight,
    axisAdhesion.frontRight.longitudinal,
    axisAdhesion.frontRight.lateral,
    state.frontRightLateralForce,
    frontRightCapacity.lateral,
    frontRightCapacity.longitudinal,
    wheelRoadSpeeds.frontRight + predictedRoadDelta.frontRight,
    wheelKinematics.frontRight.wheelLateralSpeed / pixelsPerMeter,
    getTireRelaxationLoadScale(state.frontRightLoadNewtons, staticFrontLoad),
    firstFrontRight,
    {
      contactPatchDeflectionM: state.frontRightLateralDeflectionM,
      loadNewtons: state.frontRightLoadNewtons,
      referenceLoadNewtons: staticFrontLoad,
      sideSign: 1,
      travelDirection: Math.sign(longitudinalSpeed || state.driveDirection),
      wheelSteeringAngle: ackermann.right,
    },
  );
  const rearLeftTire = integrateWheel(
    state.rearLeftWheelSpeed,
    rearLeftDriveTorque,
    wheelBrakeTorqueCapacitiesNm.rearLeft,
    previous.rearLeftLongitudinalDeflectionM,
    previousAdhesion.rearLeft,
    axisAdhesion.rearLeft.longitudinal,
    axisAdhesion.rearLeft.lateral,
    state.rearLeftLateralForce,
    rearLeftCapacity.lateral,
    rearLeftCapacity.longitudinal,
    wheelRoadSpeeds.rearLeft + predictedRoadDelta.rearLeft,
    wheelKinematics.rearLeft.wheelLateralSpeed / pixelsPerMeter,
    getTireRelaxationLoadScale(state.rearLeftLoadNewtons, staticRearLoad),
    firstRearLeft,
  );
  const rearRightTire = integrateWheel(
    state.rearRightWheelSpeed,
    rearRightDriveTorque,
    wheelBrakeTorqueCapacitiesNm.rearRight,
    previous.rearRightLongitudinalDeflectionM,
    previousAdhesion.rearRight,
    axisAdhesion.rearRight.longitudinal,
    axisAdhesion.rearRight.lateral,
    state.rearRightLateralForce,
    rearRightCapacity.lateral,
    rearRightCapacity.longitudinal,
    wheelRoadSpeeds.rearRight + predictedRoadDelta.rearRight,
    wheelKinematics.rearRight.wheelLateralSpeed / pixelsPerMeter,
    getTireRelaxationLoadScale(state.rearRightLoadNewtons, staticRearLoad),
    firstRearRight,
  );
  state.frontLeftLateralForce = frontLeftTire.lateralForce;
  state.frontLeftAligningMomentNm = frontLeftTire.aligningMomentNm;
  state.frontLeftAdhesion = frontLeftTire.adhesion;
  state.frontLeftLateralAdhesion = frontLeftTire.lateralAdhesion;
  state.frontLeftLongitudinalAdhesion = frontLeftTire.longitudinalAdhesion;
  state.frontLeftLongitudinalDeflectionM = frontLeftTire.longitudinalDeflectionM;
  state.frontLeftTireDemand = frontLeftTire.normalizedDemand;
  state.frontRightLateralForce = frontRightTire.lateralForce;
  state.frontRightAligningMomentNm = frontRightTire.aligningMomentNm;
  state.frontRightAdhesion = frontRightTire.adhesion;
  state.frontRightLateralAdhesion = frontRightTire.lateralAdhesion;
  state.frontRightLongitudinalAdhesion = frontRightTire.longitudinalAdhesion;
  state.frontRightLongitudinalDeflectionM = frontRightTire.longitudinalDeflectionM;
  state.frontRightTireDemand = frontRightTire.normalizedDemand;
  state.rearLeftLateralForce = rearLeftTire.lateralForce;
  state.rearLeftAdhesion = rearLeftTire.adhesion;
  state.rearLeftLateralAdhesion = rearLeftTire.lateralAdhesion;
  state.rearLeftLongitudinalAdhesion = rearLeftTire.longitudinalAdhesion;
  state.rearLeftLongitudinalDeflectionM = rearLeftTire.longitudinalDeflectionM;
  state.rearLeftTireDemand = rearLeftTire.normalizedDemand;
  state.rearRightLateralForce = rearRightTire.lateralForce;
  state.rearRightAdhesion = rearRightTire.adhesion;
  state.rearRightLateralAdhesion = rearRightTire.lateralAdhesion;
  state.rearRightLongitudinalAdhesion = rearRightTire.longitudinalAdhesion;
  state.rearRightLongitudinalDeflectionM = rearRightTire.longitudinalDeflectionM;
  state.rearRightTireDemand = rearRightTire.normalizedDemand;
  state.frontLeftLongitudinalForce = frontLeftTire.longitudinalForce;
  state.frontRightLongitudinalForce = frontRightTire.longitudinalForce;
  state.rearLeftLongitudinalForce = rearLeftTire.longitudinalForce;
  state.rearRightLongitudinalForce = rearRightTire.longitudinalForce;
  state.brakeLossJ = frontLeftTire.brakeLossJ + frontRightTire.brakeLossJ
    + rearLeftTire.brakeLossJ + rearRightTire.brakeLossJ;
  const transformTireForce = (
    tire: typeof frontLeftTire,
    kinematics: typeof wheelKinematics.frontLeft,
  ) => {
    const cosine = Math.cos(kinematics.steeringAngle);
    const sine = Math.sin(kinematics.steeringAngle);
    return {
      lateral: tire.longitudinalForce * sine + tire.lateralForce * cosine,
      longitudinal: tire.longitudinalForce * cosine - tire.lateralForce * sine,
    };
  };
  const bodyTireForces = {
    frontLeft: transformTireForce(frontLeftTire, wheelKinematics.frontLeft),
    frontRight: transformTireForce(frontRightTire, wheelKinematics.frontRight),
    rearLeft: transformTireForce(rearLeftTire, wheelKinematics.rearLeft),
    rearRight: transformTireForce(rearRightTire, wheelKinematics.rearRight),
  };
  const frontLongitudinalForce = bodyTireForces.frontLeft.longitudinal
    + bodyTireForces.frontRight.longitudinal;
  const rearLongitudinalForce = bodyTireForces.rearLeft.longitudinal
    + bodyTireForces.rearRight.longitudinal;
  const frontLateralForce = bodyTireForces.frontLeft.lateral
    + bodyTireForces.frontRight.lateral;
  const rearLateralForce = bodyTireForces.rearLeft.lateral
    + bodyTireForces.rearRight.lateral;
  const longitudinalAcceleration = (
    frontLongitudinalForce + rearLongitudinalForce
  ) / massKg * pixelsPerMeter;
  const lateralAcceleration = (
    frontLateralForce + rearLateralForce
  ) / massKg * pixelsPerMeter;
  state.frontLateralAcceleration = frontLateralForce
    / massKg * pixelsPerMeter;
  state.rearLateralAcceleration = rearLateralForce
    / massKg * pixelsPerMeter;
  state.frontLongitudinalAcceleration = frontLongitudinalForce
    / massKg * pixelsPerMeter;
  state.rearLongitudinalAcceleration = rearLongitudinalForce
    / massKg * pixelsPerMeter;
  state.velocityX += (
    forward.x * longitudinalAcceleration + right.x * lateralAcceleration
  ) * deltaSeconds;
  state.velocityY += (
    forward.y * longitudinalAcceleration + right.y * lateralAcceleration
  ) * deltaSeconds;

  let serviceBrakeStopped = false;
  if (serviceBraking) {
    const postForceLongitudinalSpeed = state.velocityX * forward.x
      + state.velocityY * forward.y;
    const crossedThroughZero = longitudinalSpeed !== 0
      && Math.sign(postForceLongitudinalSpeed) !== Math.sign(longitudinalSpeed);
    const reboundedPastEngagedDirection = state.driveDirection !== 0
      && postForceLongitudinalSpeed * state.driveDirection < 0;
    const staticCaptureSpeedPixels = Math.max(
      style.controls.direction.restEntrySpeedMps * pixelsPerMeter,
      pixelsPerMeter * 0.12,
    );
    const withinStaticCapture = Math.abs(postForceLongitudinalSpeed)
      <= staticCaptureSpeedPixels
      && state.brakePressure
        >= style.controls.pedals.brakeContactPressure * 0.75;
    if (
      crossedThroughZero
      || reboundedPastEngagedDirection
      || withinStaticCapture
    ) {
      serviceBrakeStopped = applyCarLongitudinalStopConstraint(
        state,
        forward,
        {
          massKg,
          maximumImpulseNs: Math.abs(
            frontLongitudinalForce + rearLongitudinalForce,
          ) * deltaSeconds,
          pixelsPerMeter,
        },
      );
    }
  }

  // Apply aerodynamic drag at front and rear pressure centres. Their local
  // lateral velocities include yaw, so the equal-area forces produce a real
  // stabilizing moment instead of an authored sign-based yaw damper.
  const aerodynamicBodyLongitudinalMps = (
    state.velocityX * forward.x + state.velocityY * forward.y
  ) / pixelsPerMeter;
  const aerodynamicBodyLateralMps = (
    state.velocityX * right.x + state.velocityY * right.y
  ) / pixelsPerMeter;
  const aerodynamicApplicationOffsetM = style.physics.physicalWheelbaseM * 0.36;
  const getAerodynamicPointForce = (offsetM: number) => {
    const localLongitudinalMps = aerodynamicBodyLongitudinalMps;
    const localLateralMps = aerodynamicBodyLateralMps + state.yawRate * offsetM;
    const localSpeedMps = Math.hypot(localLongitudinalMps, localLateralMps);
    if (localSpeedMps <= 0.001) {
      return { lateral: 0, longitudinal: 0, lossJ: 0, momentNm: 0 };
    }
    const forceMagnitudeNewtons = getCarRoadResistanceForceNewtons(
      style,
      localSpeedMps,
      0,
      1,
    ) * 0.5;
    const longitudinalForceNewtons = -forceMagnitudeNewtons
      * localLongitudinalMps / localSpeedMps;
    const lateralForceNewtons = -forceMagnitudeNewtons
      * localLateralMps / localSpeedMps;
    return {
      lateral: lateralForceNewtons,
      longitudinal: longitudinalForceNewtons,
      lossJ: forceMagnitudeNewtons * localSpeedMps * deltaSeconds,
      momentNm: offsetM * lateralForceNewtons,
    };
  };
  const frontAerodynamicForce = getAerodynamicPointForce(
    aerodynamicApplicationOffsetM,
  );
  const rearAerodynamicForce = getAerodynamicPointForce(
    -aerodynamicApplicationOffsetM,
  );
  const aerodynamicLongitudinalForceNewtons =
    frontAerodynamicForce.longitudinal + rearAerodynamicForce.longitudinal;
  const aerodynamicLateralForceNewtons =
    frontAerodynamicForce.lateral + rearAerodynamicForce.lateral;
  state.velocityX += (
    forward.x * aerodynamicLongitudinalForceNewtons
      + right.x * aerodynamicLateralForceNewtons
  ) / massKg * pixelsPerMeter * deltaSeconds;
  state.velocityY += (
    forward.y * aerodynamicLongitudinalForceNewtons
      + right.y * aerodynamicLateralForceNewtons
  ) / massKg * pixelsPerMeter * deltaSeconds;
  state.aerodynamicDragLossJ = frontAerodynamicForce.lossJ
    + rearAerodynamicForce.lossJ;
  const aerodynamicYawMomentNm = frontAerodynamicForce.momentNm
    + rearAerodynamicForce.momentNm;

  state.frontLeftLongitudinalSlip = frontLeftTire.slip;
  state.frontRightLongitudinalSlip = frontRightTire.slip;
  state.rearLeftLongitudinalSlip = rearLeftTire.slip;
  state.rearRightLongitudinalSlip = rearRightTire.slip;
  state.frontLongitudinalSlip = (
    frontLeftTire.slip + frontRightTire.slip
  ) / 2;
  state.frontLongitudinalSlipPeak = Math.max(
    Math.abs(frontLeftTire.slip),
    Math.abs(frontRightTire.slip),
  );
  state.frontLongitudinalSlipRms = Math.hypot(
    frontLeftTire.slip,
    frontRightTire.slip,
  ) / Math.SQRT2;
  state.rearLongitudinalSlip = (
    rearLeftTire.slip + rearRightTire.slip
  ) / 2;
  state.rearLongitudinalSlipPeak = Math.max(
    Math.abs(rearLeftTire.slip),
    Math.abs(rearRightTire.slip),
  );
  state.rearLongitudinalSlipRms = Math.hypot(
    rearLeftTire.slip,
    rearRightTire.slip,
  ) / Math.SQRT2;
  state.frontLeftWheelAcceleration = (
    frontLeftTire.wheelSurfaceSpeed - previous.frontLeftWheelSpeed
  ) / pixelsPerMeter / deltaSeconds;
  state.frontRightWheelAcceleration = (
    frontRightTire.wheelSurfaceSpeed - previous.frontRightWheelSpeed
  ) / pixelsPerMeter / deltaSeconds;
  state.rearLeftWheelAcceleration = (
    rearLeftTire.wheelSurfaceSpeed - previous.rearLeftWheelSpeed
  ) / pixelsPerMeter / deltaSeconds;
  state.rearRightWheelAcceleration = (
    rearRightTire.wheelSurfaceSpeed - previous.rearRightWheelSpeed
  ) / pixelsPerMeter / deltaSeconds;
  state.frontLeftWheelSpeed = frontLeftTire.wheelSurfaceSpeed;
  state.frontRightWheelSpeed = frontRightTire.wheelSurfaceSpeed;
  state.rearLeftWheelSpeed = rearLeftTire.wheelSurfaceSpeed;
  state.rearRightWheelSpeed = rearRightTire.wheelSurfaceSpeed;
  state.frontWheelSpeed = (
    state.frontLeftWheelSpeed + state.frontRightWheelSpeed
  ) / 2;
  state.rearWheelSpeed = (
    state.rearLeftWheelSpeed + state.rearRightWheelSpeed
  ) / 2;
  if (serviceBrakeStopped) {
    applyCarLongitudinalStopConstraint(state, forward);
  }
  longitudinalSpeed = state.velocityX * forward.x + state.velocityY * forward.y;
  lateralSpeed = state.velocityX * right.x + state.velocityY * right.y;
  // Tire force remains the authoritative acceleration at road speed. Inside
  // the crawl envelope, a static brake or zero-speed constraint can apply only
  // the impulse required to stop; reporting the tire's larger unconstrained
  // force created a false deceleration spike followed by a false release.
  const resolvedLongitudinalAcceleration = (
    longitudinalSpeed - (previous.velocityX * forward.x + previous.velocityY * forward.y)
  ) / deltaSeconds;
  const crawlAccelerationMeasurement = serviceBraking
    ? 1 - smooth01(
        Math.abs(longitudinalSpeed)
          / Math.max(1, crawlEntrySpeedPixels * 1.8),
      )
    : 0;
  state.longitudinalAcceleration = longitudinalAcceleration
    + (resolvedLongitudinalAcceleration - longitudinalAcceleration)
      * crawlAccelerationMeasurement;
  state.lateralAcceleration = lateralAcceleration;

  const wheelForceYawMoment = (
    frontAxleDistanceM * bodyTireForces.frontLeft.lateral
      + halfTrackM * bodyTireForces.frontLeft.longitudinal
      + frontAxleDistanceM * bodyTireForces.frontRight.lateral
      - halfTrackM * bodyTireForces.frontRight.longitudinal
      - rearAxleDistanceM * bodyTireForces.rearLeft.lateral
      + halfTrackM * bodyTireForces.rearLeft.longitudinal
      - rearAxleDistanceM * bodyTireForces.rearRight.lateral
      - halfTrackM * bodyTireForces.rearRight.longitudinal
  );
  const yawInertiaKgM2 = getCarYawInertiaKgM2(style.id, massKg);
  const yawMomentAcceleration = (
    wheelForceYawMoment + aerodynamicYawMomentNm
  ) / yawInertiaKgM2;
  // Contact-patch forces own normal handling. This guard begins above the
  // authored envelope and exists only to contain numerical tire-force spikes.
  const yawGuardStart = Math.max(
    0.85,
    style.physics.maximumYawRate * 1.32,
  );
  const numericalYawLimit = Math.min(
    MAX_CHASSIS_YAW_RATE,
    Math.max(
      yawGuardStart + 0.5,
      style.physics.maximumYawRate * 1.8,
    ),
  );
  const yawRateBeforeContact = state.yawRate;
  const rawYawRate = yawRateBeforeContact + yawMomentAcceleration * deltaSeconds;
  const previousYawLimiterActivity = Number.isFinite(previous.yawLimiterActivity)
    ? previous.yawLimiterActivity
    : 0;
  state.yawRate = softClampMagnitude(
    rawYawRate,
    yawGuardStart,
    numericalYawLimit,
  );
  const yawLimiterTarget = clamp(
    Math.abs(rawYawRate - state.yawRate) / Math.max(0.1, Math.abs(rawYawRate)),
    0,
    1,
  );
  state.yawLimiterActivity = approach(
    previousYawLimiterActivity,
    yawLimiterTarget,
    (yawLimiterTarget > previousYawLimiterActivity ? 20 : 7) * deltaSeconds,
  );
  // Per-wheel tire forces, ESC brake moments, and the static contact solver own
  // yaw all the way to rest. Avoid a chassis-level sign clamp or crawl damper,
  // both of which create a visible snap during slow braking and reversing.
  // Heading and angular velocity remain entirely in the physical world plane.
  // Projection belongs only to the returned screen displacement and renderer.
  state.heading = wrapCarHeading(state.heading + state.yawRate * deltaSeconds);

  // Recalculate slip against the new body angle so the value includes the
  // transient created by yaw, not only the pre-turn velocity decomposition.
  ({ forward, right } = getCarWorldAxes(state.heading));
  longitudinalSpeed = state.velocityX * forward.x + state.velocityY * forward.y;
  lateralSpeed = state.velocityX * right.x + state.velocityY * right.y;
  state.lateralTireSlip = clamp(Math.max(
    Math.abs(state.frontLeftSlipAngle) / style.physics.tireSlipAngleTelemetryRadians,
    Math.abs(state.frontRightSlipAngle) / style.physics.tireSlipAngleTelemetryRadians,
    Math.abs(state.rearLeftSlipAngle) / style.physics.tireSlipAngleTelemetryRadians,
    Math.abs(state.rearRightSlipAngle) / style.physics.tireSlipAngleTelemetryRadians,
  ), 0, 1);
  state.longitudinalTireSlip = clamp(Math.max(
    Math.abs(state.frontLeftLongitudinalSlip),
    Math.abs(state.frontRightLongitudinalSlip),
    Math.abs(state.rearLeftLongitudinalSlip),
    Math.abs(state.rearRightLongitudinalSlip),
  ), 0, 1);
  state.tireSlip = clamp(Math.hypot(
    state.longitudinalTireSlip,
    state.lateralTireSlip * 0.85,
  ) / 1.2, 0, 1);

  const restSettleSpeedPixels = crawlEntrySpeedPixels * (
    state.restState === "settling" ? 1.45 : 1
  );
  let restSpeed = Math.hypot(state.velocityX, state.velocityY);
  const chassisEdgeRadiusM = Math.hypot(
    Math.max(frontAxleDistanceM, rearAxleDistanceM),
    halfTrackM,
  );
  const rotationalRestSpeed = Math.abs(state.yawRate)
    * chassisEdgeRadiusM * pixelsPerMeter;
  const wheelRestEnergySpeed = Math.hypot(
    state.frontLeftWheelSpeed,
    state.frontRightWheelSpeed,
    state.rearLeftWheelSpeed,
    state.rearRightWheelSpeed,
  ) / 2;
  // A rest constraint may resolve only genuinely negligible kinetic energy.
  // Including body rotation and aggregate wheel motion prevents the final hold
  // from visibly snapping a still-turning or lightly spinning car to zero.
  let restEnergySpeed = Math.hypot(
    restSpeed,
    rotationalRestSpeed,
    wheelRestEnergySpeed * 0.35,
  );
  if (
    (parking || serviceBraking || demandedDirection === 0)
    && state.restState !== "held"
    && restEnergySpeed > 0
    && restEnergySpeed < restSettleSpeedPixels * 1.8
  ) {
    const stictionBlend = 1 - smooth01(
      restEnergySpeed / Math.max(1, restSettleSpeedPixels * 1.8),
    );
    const contactPatches = [
      {
        brakePressure: state.frontLeftBrakePressure,
        brakeTorqueCapacityNm: wheelBrakeTorqueCapacitiesNm.frontLeft,
        wheelSurfaceSpeed: state.frontLeftWheelSpeed,
        demand: state.frontLeftTireDemand,
        grip: state.frontLeftGripMultiplier,
        lateralAdhesion: state.frontLeftLateralAdhesion,
        longitudinalAdhesion: state.frontLeftLongitudinalAdhesion,
        loadNewtons: state.frontLeftLoadNewtons,
        x: frontAxleDistanceM,
        y: -halfTrackM,
      },
      {
        brakePressure: state.frontRightBrakePressure,
        brakeTorqueCapacityNm: wheelBrakeTorqueCapacitiesNm.frontRight,
        wheelSurfaceSpeed: state.frontRightWheelSpeed,
        demand: state.frontRightTireDemand,
        grip: state.frontRightGripMultiplier,
        lateralAdhesion: state.frontRightLateralAdhesion,
        longitudinalAdhesion: state.frontRightLongitudinalAdhesion,
        loadNewtons: state.frontRightLoadNewtons,
        x: frontAxleDistanceM,
        y: halfTrackM,
      },
      {
        brakePressure: state.rearLeftBrakePressure,
        brakeTorqueCapacityNm: wheelBrakeTorqueCapacitiesNm.rearLeft,
        wheelSurfaceSpeed: state.rearLeftWheelSpeed,
        demand: state.rearLeftTireDemand,
        grip: state.rearLeftGripMultiplier,
        lateralAdhesion: state.rearLeftLateralAdhesion,
        longitudinalAdhesion: state.rearLeftLongitudinalAdhesion,
        loadNewtons: state.rearLeftLoadNewtons,
        x: -rearAxleDistanceM,
        y: -halfTrackM,
      },
      {
        brakePressure: state.rearRightBrakePressure,
        brakeTorqueCapacityNm: wheelBrakeTorqueCapacitiesNm.rearRight,
        wheelSurfaceSpeed: state.rearRightWheelSpeed,
        demand: state.rearRightTireDemand,
        grip: state.rearRightGripMultiplier,
        lateralAdhesion: state.rearRightLateralAdhesion,
        longitudinalAdhesion: state.rearRightLongitudinalAdhesion,
        loadNewtons: state.rearRightLoadNewtons,
        x: -rearAxleDistanceM,
        y: halfTrackM,
      },
    ];
    const inverseMass = 1 / massKg;
    const inverseYawInertia = 1 / yawInertiaKgM2;
    let velocityMpsX = state.velocityX / pixelsPerMeter;
    let velocityMpsY = state.velocityY / pixelsPerMeter;
    let constrainedYawRate = state.yawRate;
    const stictionIterations = 3;
    for (let iteration = 0; iteration < stictionIterations; iteration += 1) {
      const iterationVelocityX = velocityMpsX;
      const iterationVelocityY = velocityMpsY;
      const iterationYawRate = constrainedYawRate;
      let velocityDeltaX = 0;
      let velocityDeltaY = 0;
      let yawRateDelta = 0;
      for (const contact of contactPatches) {
        const contactVelocityX = iterationVelocityX - iterationYawRate * contact.y;
        const contactVelocityY = iterationVelocityY + iterationYawRate * contact.x;
        const contactSpeed = Math.hypot(contactVelocityX, contactVelocityY);
        if (contactSpeed <= 0.0001) continue;
        const impulseDirectionX = -contactVelocityX / contactSpeed;
        const impulseDirectionY = -contactVelocityY / contactSpeed;
        const momentArm = contact.x * impulseDirectionY
          - contact.y * impulseDirectionX;
        const effectiveInverseMass = inverseMass
          + momentArm * momentArm * inverseYawInertia;
        const requiredImpulseNs = contactSpeed
          / Math.max(0.000001, effectiveInverseMass)
          / contactPatches.length;
        const remainingGrip = Math.sqrt(Math.max(
          0.0064,
          1 - Math.pow(clamp(contact.demand, 0, 1), 2),
        ));
        const wheelAngularSpeed = Math.abs(contact.wheelSurfaceSpeed)
          / pixelsPerMeter / wheelRadiusM;
        const requiredWheelStopTorqueNm = wheelAngularSpeed
          * wheelInertiaKgM2 / Math.max(0.0001, deltaSeconds);
        const wheelLockAuthority = requiredWheelStopTorqueNm <= 0.001
          ? 1
          : clamp(
              contact.brakeTorqueCapacityNm / requiredWheelStopTorqueNm,
              0,
              1,
            );
        const longitudinalImpulseShare = Math.abs(
          impulseDirectionX * forward.x + impulseDirectionY * forward.y,
        );
        const lateralImpulseShare = Math.abs(
          impulseDirectionX * right.x + impulseDirectionY * right.y,
        );
        const contactAdhesion = Math.hypot(
          longitudinalImpulseShare * clamp(contact.longitudinalAdhesion, 0, 1),
          lateralImpulseShare * clamp(contact.lateralAdhesion, 0, 1),
        );
        // Neutral settling gets only rolling-resistance-scale authority. The
        // service brake can still use the remaining contact-patch capacity.
        // This removes the former fixed fraction of total tire grip that pulled
        // an unbraked car magnetically into its final stop.
        const surfaceGrip = clamp(contact.grip, 0.15, 1.5);
        const neutralHoldingAuthority = clamp(
          style.physics.rollingResistanceCoefficient / Math.max(
            0.001,
            tireFriction * surfaceGrip * Math.max(0.12, contactAdhesion)
              * Math.max(0.08, remainingGrip),
          ),
          0,
          0.06,
        );
        const brakeHoldingAuthority = neutralHoldingAuthority
          + wheelLockAuthority * clamp(contact.brakePressure, 0, 1)
            * (1 - neutralHoldingAuthority);
        const maximumImpulseNs = contact.loadNewtons
          * tireFriction
          * surfaceGrip
          * contactAdhesion
          * remainingGrip
          * brakeHoldingAuthority
          * stictionBlend
          * deltaSeconds / stictionIterations;
        const impulseNs = Math.min(requiredImpulseNs, maximumImpulseNs);
        velocityDeltaX += impulseDirectionX * impulseNs * inverseMass;
        velocityDeltaY += impulseDirectionY * impulseNs * inverseMass;
        yawRateDelta += momentArm * impulseNs * inverseYawInertia;
      }
      velocityMpsX += velocityDeltaX;
      velocityMpsY += velocityDeltaY;
      constrainedYawRate += yawRateDelta;
    }
    state.velocityX = velocityMpsX * pixelsPerMeter;
    state.velocityY = velocityMpsY * pixelsPerMeter;
    state.yawRate = constrainedYawRate;
    restSpeed = Math.hypot(state.velocityX, state.velocityY);
    restEnergySpeed = Math.hypot(
      restSpeed,
      Math.abs(state.yawRate) * chassisEdgeRadiusM * pixelsPerMeter,
      wheelRestEnergySpeed * 0.35,
    );
  }
  if (
    state.restState !== "held"
    && restRequested
    && restEnergySpeed < restSettleSpeedPixels
  ) {
    state.restState = "settling";
    state.restSeconds += deltaSeconds;
    if (state.restSeconds >= style.controls.direction.restSettleSeconds) {
      state.restState = "held";
    }
  } else if (state.restState !== "held") {
    state.restState = "rolling";
    state.restSeconds = 0;
  }
  if (state.restState === "held") {
    const totalHoldingCapacity = frontHoldingCapacity + rearHoldingCapacity;
    const brakeHoldingAuthority = parking ? 1 : clamp(state.brakePressure, 0, 1);
    const rollingHoldingForceNewtons = massKg * 9.81
      * style.physics.rollingResistanceCoefficient;
    const maximumHoldingForceNewtons = Math.min(
      totalHoldingCapacity,
      rollingHoldingForceNewtons
        + totalHoldingCapacity * brakeHoldingAuthority,
    );
    const passiveHoldingRatio = clamp(
      rollingHoldingForceNewtons / Math.max(1, totalHoldingCapacity),
      0,
      1,
    );
    const yawHoldingAuthority = clamp(
      brakeHoldingAuthority + passiveHoldingRatio,
      0,
      1,
    );
    const heldByContactPatches = applyCarLongitudinalStopConstraint(
      state,
      forward,
      {
        holdBody: true,
        massKg,
        maximumImpulseNs: maximumHoldingForceNewtons * deltaSeconds,
        maximumYawImpulseNms: maximumYawHoldingMomentNm
          * yawHoldingAuthority * deltaSeconds,
        pixelsPerMeter,
        yawInertiaKgM2,
      },
    );
    if (heldByContactPatches) {
      longitudinalSpeed = 0;
      lateralSpeed = 0;
      state.longitudinalAcceleration = 0;
      state.lateralAcceleration = 0;
      state.frontLateralAcceleration = 0;
      state.rearLateralAcceleration = 0;
      state.frontLongitudinalAcceleration = 0;
      state.rearLongitudinalAcceleration = 0;
      state.longitudinalLoadTransferVelocity = 0;
      state.lateralLoadTransferVelocity = 0;
      state.frontLeftSuspensionVelocity = 0;
      state.frontRightSuspensionVelocity = 0;
      state.rearLeftSuspensionVelocity = 0;
      state.rearRightSuspensionVelocity = 0;
    } else {
      state.restState = "rolling";
      state.restSeconds = 0;
    }
  }

  let contactConstraintLossJ = 0;
  let contactConstraintResponses: CarChassisOutput["contactConstraintResponses"] = [];
  if (!input.reducedMotion && input.contactConstraints?.length) {
    const constraintKineticEnergyJ = (candidate: CarChassisState) => {
      const speedMps = Math.hypot(
        candidate.velocityX,
        candidate.velocityY,
      ) / pixelsPerMeter;
      const translationalEnergyJ = 0.5 * massKg * speedMps * speedMps;
      const yawEnergyJ = 0.5 * yawInertiaKgM2
        * candidate.yawRate * candidate.yawRate;
      const wheelEnergyJ = [
        candidate.frontLeftWheelSpeed,
        candidate.frontRightWheelSpeed,
        candidate.rearLeftWheelSpeed,
        candidate.rearRightWheelSpeed,
      ].reduce((energy, wheelSpeed) => {
        const angularSpeed = wheelSpeed / pixelsPerMeter / wheelRadiusM;
        return energy + 0.5 * wheelInertiaKgM2
          * angularSpeed * angularSpeed;
      }, 0);
      return translationalEnergyJ + yawEnergyJ + wheelEnergyJ;
    };
    const orderedContactConstraints = [...input.contactConstraints].sort(
      (left, right) => {
        const normalOrder = Math.atan2(left.normal.y, left.normal.x)
          - Math.atan2(right.normal.y, right.normal.x);
        if (Math.abs(normalOrder) > 0.000001) return normalOrder;
        const leftOffset = left.contactOffset ?? { x: 0, y: 0 };
        const rightOffset = right.contactOffset ?? { x: 0, y: 0 };
        return leftOffset.x - rightOffset.x || leftOffset.y - rightOffset.y;
      },
    );
    const energyBeforeManifoldJ = constraintKineticEnergyJ(state);
    const manifold = resolveCarContactManifold(
      state,
      orderedContactConstraints.map((constraint) => ({
        normal: constraint.normal,
        options: {
          contactOffset: constraint.contactOffset,
          dynamicFriction: constraint.dynamicFriction
            ?? constraint.friction ?? 0,
          friction: constraint.friction ?? 0,
          massKg,
          pixelsPerMeter,
          restitution: 0,
          staticFriction: constraint.staticFriction
            ?? constraint.friction ?? 0,
          surfaceAngularVelocity: constraint.surfaceAngularVelocity,
          surfaceContactOffset: constraint.surfaceContactOffset,
          surfaceMassKg: constraint.surfaceMassKg,
          surfaceVelocity: constraint.surfaceVelocity,
          surfaceYawInertiaKgM2: constraint.surfaceYawInertiaKgM2,
          yawInertiaKgM2: getCarYawInertiaKgM2(style.id, massKg),
        },
      })),
    );
    state = manifold.state;
    contactConstraintResponses = manifold.contacts;
    const targetLongitudinalContactReactionForceNewtons = manifold.contacts.reduce(
      (total, contact, index) => {
        const worldNormal = unprojectCarScreenNormal(
          orderedContactConstraints[index].normal,
        );
        const longitudinalShare = Math.abs(
          worldNormal.x * forward.x + worldNormal.y * forward.y,
        );
        return total + contact.normalImpulse * longitudinalShare / deltaSeconds;
      },
      0,
    );
    const previousLongitudinalContactReactionForceNewtons = Number.isFinite(
      previous.longitudinalContactReactionForceNewtons,
    ) ? previous.longitudinalContactReactionForceNewtons : 0;
    const contactReactionResponseSeconds =
      targetLongitudinalContactReactionForceNewtons
          > previousLongitudinalContactReactionForceNewtons
        ? 0.018
        : 0.055;
    state.longitudinalContactReactionForceNewtons =
      previousLongitudinalContactReactionForceNewtons + (
        targetLongitudinalContactReactionForceNewtons
          - previousLongitudinalContactReactionForceNewtons
      ) * (1 - Math.exp(-deltaSeconds / contactReactionResponseSeconds));
    const manifoldImpacts = manifold.contacts.flatMap((contact, index) => (
      contact.normalImpulse > 0
        ? [{
            contactOffset: orderedContactConstraints[index].contactOffset,
            normalImpulse: contact.normalImpulse,
          }]
        : []
    ));
    if (manifoldImpacts.length > 0) {
      state = reconcileCarWheelStateAfterCollision(state, style, {
        contacts: manifoldImpacts,
      });
    }
    contactConstraintLossJ += Math.max(
      0,
      energyBeforeManifoldJ - constraintKineticEnergyJ(state),
    );
    longitudinalSpeed = state.velocityX * forward.x + state.velocityY * forward.y;
    lateralSpeed = state.velocityX * right.x + state.velocityY * right.y;
  }

  // Contact persistence is solved after the ordinary rest constraint. A static
  // manifold must not wake a chassis that is already held; otherwise tiny
  // warm-start and projection corrections accumulate into visible scooting.
  if (state.restState === "held" && restRequested) {
    applyCarLongitudinalStopConstraint(state, forward, { holdBody: true });
    longitudinalSpeed = 0;
    lateralSpeed = 0;
    state.longitudinalContactReactionForceNewtons = 0;
  }

  if (input.reducedMotion) {
    const snappedSpeed = parking
      ? 0
      : demandedDirection < 0
        ? -getCarMaximumPageSpeed(style, -1)
        : demandedDirection > 0
          ? getCarMaximumPageSpeed(style, 1)
          : 0;
    state.velocityX = forward.x * snappedSpeed;
    state.velocityY = forward.y * snappedSpeed;
    state.frontLeftWheelSpeed = snappedSpeed;
    state.frontRightWheelSpeed = snappedSpeed;
    state.rearLeftWheelSpeed = snappedSpeed;
    state.rearRightWheelSpeed = snappedSpeed;
    state.frontWheelSpeed = snappedSpeed;
    state.rearWheelSpeed = snappedSpeed;
    state.frontLeftWheelAcceleration = 0;
    state.frontRightWheelAcceleration = 0;
    state.rearLeftWheelAcceleration = 0;
    state.rearRightWheelAcceleration = 0;
    state.frontLongitudinalSlip = 0;
    state.frontLongitudinalSlipPeak = 0;
    state.frontLongitudinalSlipRms = 0;
    state.rearLongitudinalSlip = 0;
    state.rearLongitudinalSlipPeak = 0;
    state.rearLongitudinalSlipRms = 0;
    state.frontLeftLongitudinalSlip = 0;
    state.frontRightLongitudinalSlip = 0;
    state.rearLeftLongitudinalSlip = 0;
    state.rearRightLongitudinalSlip = 0;
    state.frontLeftLongitudinalForce = 0;
    state.frontRightLongitudinalForce = 0;
    state.rearLeftLongitudinalForce = 0;
    state.rearRightLongitudinalForce = 0;
    state.frontLeftLateralDeflectionM = 0;
    state.frontRightLateralDeflectionM = 0;
    state.rearLeftLateralDeflectionM = 0;
    state.rearRightLateralDeflectionM = 0;
    state.frontLeftLongitudinalDeflectionM = 0;
    state.frontRightLongitudinalDeflectionM = 0;
    state.rearLeftLongitudinalDeflectionM = 0;
    state.rearRightLongitudinalDeflectionM = 0;
    state.frontLeftAdhesion = 1;
    state.frontRightAdhesion = 1;
    state.rearLeftAdhesion = 1;
    state.rearRightAdhesion = 1;
    state.frontLeftLateralAdhesion = 1;
    state.frontRightLateralAdhesion = 1;
    state.rearLeftLateralAdhesion = 1;
    state.rearRightLateralAdhesion = 1;
    state.frontLeftLongitudinalAdhesion = 1;
    state.frontRightLongitudinalAdhesion = 1;
    state.rearLeftLongitudinalAdhesion = 1;
    state.rearRightLongitudinalAdhesion = 1;
    state.longitudinalAcceleration = 0;
    state.lateralAcceleration = 0;
    state.frontLongitudinalAcceleration = 0;
    state.rearLongitudinalAcceleration = 0;
    state.lateralTireSlip = 0;
    state.longitudinalTireSlip = 0;
    state.tireSlip = 0;
    state.yawRate = 0;
    state.restState = snappedSpeed === 0 ? "held" : "rolling";
    state.restSeconds = 0;
    longitudinalSpeed = snappedSpeed;
    lateralSpeed = 0;
  }

  return {
    contactConstraintLossJ,
    contactConstraintResponses,
    displacementX: state.velocityX * deltaSeconds,
    displacementY: state.velocityY * DEPTH_SCREEN_SCALE * deltaSeconds,
    lateralSpeed,
    serviceBraking,
    signedSpeed: longitudinalSpeed,
    state,
  };
}

export function resolveCarSurfaceContact(
  previous: CarChassisState,
  normal: { x: number; y: number },
  options: CarSurfaceCollisionOptions = {},
): CarSurfaceContactResult {
  const worldNormal = unprojectCarScreenNormal(normal);
  const normalX = worldNormal.x;
  const normalY = worldNormal.y;
  const restitution = clamp(options.restitution ?? 0.06, 0, 0.5);
  const dynamicFriction = clamp(
    options.dynamicFriction ?? options.friction ?? 0.72,
    0,
    1,
  );
  const staticFriction = clamp(
    Math.max(dynamicFriction, options.staticFriction ?? dynamicFriction),
    0,
    1.25,
  );
  const tangentX = -normalY;
  const tangentY = normalX;
  const massKg = Math.max(1, options.massKg ?? 1_040);
  const inverseMass = 1 / massKg;
  const yawInertiaKgM2 = Math.max(1, options.yawInertiaKgM2 ?? 1_650);
  const pixelsPerMeter = Math.max(
    1,
    options.pixelsPerMeter ?? DEFAULT_CAR_WORLD_PIXELS_PER_METER,
  );
  const inverseYawInertia = 1 / yawInertiaKgM2;
  const screenContact = options.contactOffset ?? { x: 0, y: 0 };
  const worldContactPixels = unprojectCarScreenVector(screenContact);
  const contactX = worldContactPixels.x / pixelsPerMeter;
  const contactY = worldContactPixels.y / pixelsPerMeter;
  const surfaceMassKg = Math.max(0, options.surfaceMassKg ?? 0);
  const surfaceInverseMass = surfaceMassKg > 0 ? 1 / surfaceMassKg : 0;
  const surfaceYawInertiaKgM2 = Math.max(
    0,
    options.surfaceYawInertiaKgM2 ?? 0,
  );
  const surfaceInverseYawInertia = surfaceYawInertiaKgM2 > 0
    ? 1 / surfaceYawInertiaKgM2
    : 0;
  const surfaceWorldContactPixels = unprojectCarScreenVector(
    options.surfaceContactOffset ?? { x: 0, y: 0 },
  );
  const surfaceContactX = surfaceWorldContactPixels.x / pixelsPerMeter;
  const surfaceContactY = surfaceWorldContactPixels.y / pixelsPerMeter;
  const initialSurfaceWorldVelocity = unprojectCarScreenVector(
    options.surfaceVelocity ?? { x: 0, y: 0 },
  );
  let surfaceVelocityX = initialSurfaceWorldVelocity.x / pixelsPerMeter;
  let surfaceVelocityY = initialSurfaceWorldVelocity.y / pixelsPerMeter;
  let surfaceYawRate = options.surfaceAngularVelocity ?? 0;
  let velocityX = previous.velocityX / pixelsPerMeter;
  let velocityY = previous.velocityY / pixelsPerMeter;
  let yawRate = previous.yawRate;
  const getContactVelocity = () => ({
    x: velocityX - yawRate * contactY
      - (surfaceVelocityX - surfaceYawRate * surfaceContactY),
    y: velocityY + yawRate * contactX
      - (surfaceVelocityY + surfaceYawRate * surfaceContactX),
  });
  const getSurfaceVelocity = () => {
    const projected = projectCarWorldVector({
      x: surfaceVelocityX * pixelsPerMeter,
      y: surfaceVelocityY * pixelsPerMeter,
    });
    return { x: projected.x, y: projected.y };
  };
  const initialContactVelocity = getContactVelocity();
  const initialNormalVelocity = initialContactVelocity.x * normalX
    + initialContactVelocity.y * normalY;
  const normalLever = contactX * normalY - contactY * normalX;
  const surfaceNormalLever = surfaceContactX * normalY
    - surfaceContactY * normalX;
  const normalEffectiveMass = inverseMass + surfaceInverseMass
    + normalLever * normalLever * inverseYawInertia
    + surfaceNormalLever * surfaceNormalLever * surfaceInverseYawInertia;
  const tangentLever = contactX * tangentY - contactY * tangentX;
  const surfaceTangentLever = surfaceContactX * tangentY
    - surfaceContactY * tangentX;
  const tangentEffectiveMass = inverseMass + surfaceInverseMass
    + tangentLever * tangentLever * inverseYawInertia
    + surfaceTangentLever * surfaceTangentLever * surfaceInverseYawInertia;
  const applyImpulse = (normalImpulse: number, tangentImpulse: number) => {
    const impulseX = normalX * normalImpulse + tangentX * tangentImpulse;
    const impulseY = normalY * normalImpulse + tangentY * tangentImpulse;
    velocityX += impulseX * inverseMass;
    velocityY += impulseY * inverseMass;
    yawRate += (contactX * impulseY - contactY * impulseX) * inverseYawInertia;
    surfaceVelocityX -= impulseX * surfaceInverseMass;
    surfaceVelocityY -= impulseY * surfaceInverseMass;
    surfaceYawRate -= (surfaceContactX * impulseY - surfaceContactY * impulseX)
      * surfaceInverseYawInertia;
  };
  const warmStartScale = clamp(options.warmStartScale ?? 0, 0, 0.9);
  let normalImpulse = Math.max(0, options.accumulatedNormalImpulse ?? 0)
    * warmStartScale;
  let tangentImpulse = clamp(
    (options.accumulatedTangentImpulse ?? 0) * warmStartScale,
    -staticFriction * normalImpulse,
    staticFriction * normalImpulse,
  );
  if (normalImpulse > 0 || tangentImpulse !== 0) {
    applyImpulse(normalImpulse, tangentImpulse);
  }
  let contactVelocity = getContactVelocity();
  const normalVelocity = contactVelocity.x * normalX + contactVelocity.y * normalY;
  const restitutionScale = normalImpulse > 0 ? 1 : 1 + restitution;
  const nextNormalImpulse = Math.max(
    0,
    normalImpulse - restitutionScale * normalVelocity
      / Math.max(0.0001, normalEffectiveMass),
  );
  applyImpulse(nextNormalImpulse - normalImpulse, 0);
  normalImpulse = nextNormalImpulse;
  contactVelocity = getContactVelocity();
  const tangentVelocity = contactVelocity.x * tangentX + contactVelocity.y * tangentY;
  const unconstrainedTangentImpulse = tangentImpulse
    - tangentVelocity / Math.max(0.0001, tangentEffectiveMass);
  const staticFrictionLimit = staticFriction * normalImpulse;
  const nextTangentImpulse = Math.abs(unconstrainedTangentImpulse)
      <= staticFrictionLimit
    ? unconstrainedTangentImpulse
    : clamp(
        unconstrainedTangentImpulse,
        -dynamicFriction * normalImpulse,
        dynamicFriction * normalImpulse,
      );
  applyImpulse(0, nextTangentImpulse - tangentImpulse);
  tangentImpulse = nextTangentImpulse;
  const initialTangentVelocity = initialContactVelocity.x * tangentX
    + initialContactVelocity.y * tangentY;
  const impactSpeed = Math.hypot(initialNormalVelocity, initialTangentVelocity) || 1;
  const contactWasActive = normalImpulse > 0.0001;
  const normalShare = contactWasActive
    ? Math.max(0, -initialNormalVelocity) / impactSpeed
    : 0;
  const collisionYawDelta = clamp(
    yawRate - previous.yawRate,
    -0.38,
    0.38,
  );
  const boundedYawRate = clamp(
    previous.yawRate + collisionYawDelta,
    -MAX_COLLISION_YAW_RATE,
    MAX_COLLISION_YAW_RATE,
  );
  const residualNormalVelocity = (
    velocityX - boundedYawRate * contactY
  ) * normalX + (
    velocityY + boundedYawRate * contactX
  ) * normalY;
  if (residualNormalVelocity < 0) {
    // Limiting collision spin must not reintroduce inward velocity at the
    // contact. Move only the remaining normal component into translation.
    velocityX -= normalX * residualNormalVelocity;
    velocityY -= normalY * residualNormalVelocity;
  }
  const state = {
    ...previous,
    tireSlip: Math.max(
      previous.tireSlip,
      clamp(
        normalShare + (contactWasActive ? Math.abs(initialTangentVelocity) / 3.5 : 0),
        0,
        1,
      ),
    ),
    velocityX: velocityX * pixelsPerMeter,
    velocityY: velocityY * pixelsPerMeter,
    yawRate: boundedYawRate,
  };
  return {
    normalImpulse,
    state,
    surfaceAngularVelocity: surfaceYawRate,
    surfaceVelocity: getSurfaceVelocity(),
    tangentImpulse,
  };
}

export function resolveCarContactManifold(
  previous: CarChassisState,
  contacts: readonly CarContactManifoldContact[],
  iterations = 6,
): CarContactManifoldResult {
  if (contacts.length === 0) return { contacts: [], state: previous };
  let state = previous;
  const impulses = contacts.map((contact) => ({
    normalImpulse: 0,
    surfaceAngularVelocity: contact.options?.surfaceAngularVelocity ?? 0,
    surfaceVelocity: contact.options?.surfaceVelocity ?? { x: 0, y: 0 },
    tangentImpulse: 0,
  }));
  const boundedIterations = Math.max(1, Math.min(10, Math.round(iterations)));
  for (let iteration = 0; iteration < boundedIterations; iteration += 1) {
    const indices = contacts.map((_, index) => index);
    if (iteration % 2 === 1) indices.reverse();
    for (const index of indices) {
      const contact = contacts[index];
      const result = resolveCarSurfaceContact(state, contact.normal, {
        ...contact.options,
        surfaceAngularVelocity: impulses[index].surfaceAngularVelocity,
        surfaceVelocity: impulses[index].surfaceVelocity,
        accumulatedNormalImpulse: iteration === 0
          ? contact.options?.accumulatedNormalImpulse
          : 0,
        accumulatedTangentImpulse: iteration === 0
          ? contact.options?.accumulatedTangentImpulse
          : 0,
        restitution: iteration === 0
          ? contact.options?.restitution
          : 0,
        warmStartScale: iteration === 0
          ? contact.options?.warmStartScale
          : 0,
      });
      state = result.state;
      impulses[index].normalImpulse += result.normalImpulse;
      impulses[index].tangentImpulse += result.tangentImpulse;
      impulses[index].surfaceAngularVelocity = result.surfaceAngularVelocity;
      impulses[index].surfaceVelocity = result.surfaceVelocity;
    }
  }
  return { contacts: impulses, state };
}

export function resolveCarSurfaceCollision(
  previous: CarChassisState,
  normal: { x: number; y: number },
  options: CarSurfaceCollisionOptions = {},
) {
  return resolveCarSurfaceContact(previous, normal, options).state;
}

/**
 * An external body impulse changes road speed immediately, while the wheel and
 * relaxed tire-force states still describe the pre-impact chassis. Rebase the
 * four contact patches onto the new body motion so the next fixed step cannot
 * replay that stale force as a visible kick or wheel-speed spike.
 */
export function reconcileCarWheelStateAfterCollision(
  previous: CarChassisState,
  style: CarEngineStyle,
  options: {
    contactOffset?: { x: number; y: number };
    contacts?: readonly CarImpactContact[];
    normalImpulse?: number;
    previousYawRate?: number;
  } = {},
) {
  const contacts = options.contacts?.length
    ? options.contacts
    : [{
        contactOffset: options.contactOffset,
        normalImpulse: options.normalImpulse ?? style.physics.massKg * 1.4,
      }];
  const impulseForFullAuthority = Math.max(1, style.physics.massKg * 0.55);
  const contactAuthorities = contacts.map((contact) => ({
    contactOffset: contact.contactOffset,
    normal: contact.normal,
    impactAuthority: clamp(
      contact.normalImpulse / impulseForFullAuthority,
      0,
      1,
    ),
  }));
  const combinedImpactAuthority = 1 - contactAuthorities.reduce(
    (retained, contact) => retained * (1 - contact.impactAuthority),
    1,
  );
  if (combinedImpactAuthority <= 0) return previous;
  const { forward, right } = getCarWorldAxes(previous.heading);
  const longitudinalSpeed = previous.velocityX * forward.x
    + previous.velocityY * forward.y;
  const lateralSpeed = previous.velocityX * right.x
    + previous.velocityY * right.y;
  const pixelsPerMeter = Math.max(1, style.physics.worldPixelsPerMeter);
  const wheelbase = style.physics.physicalWheelbaseM * pixelsPerMeter;
  const frontAxleDistance = wheelbase * (1 - style.physics.frontWeightBias);
  const rearAxleDistance = wheelbase - frontAxleDistance;
  const trackWidth = style.physics.trackWidthM * pixelsPerMeter;
  const halfTrack = trackWidth / 2;
  const ackermann = getCarAckermannSteeringAngles(
    previous.steeringAngle,
    wheelbase,
    trackWidth,
  );
  const wheelRoadSpeed = (
    sideOffset: number,
    axleDistance: number,
    steeringAngle: number,
  ) => {
    const bodyLongitudinalSpeed = longitudinalSpeed
      - previous.yawRate * sideOffset;
    const contactLateralSpeed = lateralSpeed
      + previous.yawRate * axleDistance;
    return bodyLongitudinalSpeed * Math.cos(steeringAngle)
      + contactLateralSpeed * Math.sin(steeringAngle);
  };
  const frontLeftWheelSpeed = wheelRoadSpeed(
    -halfTrack,
    frontAxleDistance,
    ackermann.left,
  );
  const frontRightWheelSpeed = wheelRoadSpeed(
    halfTrack,
    frontAxleDistance,
    ackermann.right,
  );
  const rearLeftWheelSpeed = wheelRoadSpeed(-halfTrack, -rearAxleDistance, 0);
  const rearRightWheelSpeed = wheelRoadSpeed(halfTrack, -rearAxleDistance, 0);
  const wheelImpactResponse = (() => {
    const authorities = {
      frontLeft: 0,
      frontRight: 0,
      rearLeft: 0,
      rearRight: 0,
    };
    const combine = (
      wheel: keyof typeof authorities,
      localAuthority: number,
    ) => {
      authorities[wheel] = 1
        - (1 - authorities[wheel]) * (1 - localAuthority);
    };
    contactAuthorities.forEach(({
      contactOffset,
      impactAuthority,
    }) => {
      if (!contactOffset) {
        (Object.keys(authorities) as Array<keyof typeof authorities>).forEach(
          (wheel) => combine(wheel, impactAuthority),
        );
        return;
      }
      const contactLongitudinal = contactOffset.x * forward.x
        + contactOffset.y * forward.y;
      const contactLateral = contactOffset.x * right.x
        + contactOffset.y * right.y;
      const distances = {
        frontLeft: Math.hypot(
          contactLongitudinal - frontAxleDistance,
          contactLateral + halfTrack,
        ),
        frontRight: Math.hypot(
          contactLongitudinal - frontAxleDistance,
          contactLateral - halfTrack,
        ),
        rearLeft: Math.hypot(
          contactLongitudinal + rearAxleDistance,
          contactLateral + halfTrack,
        ),
        rearRight: Math.hypot(
          contactLongitudinal + rearAxleDistance,
          contactLateral - halfTrack,
        ),
      };
      const minimumDistance = Math.min(...Object.values(distances));
      const maximumDistance = Math.max(...Object.values(distances));
      const distanceRange = Math.max(1, maximumDistance - minimumDistance);
      (Object.keys(distances) as Array<keyof typeof distances>).forEach(
        (wheel) => {
          const proximity = 1 - clamp(
            (distances[wheel] - minimumDistance) / distanceRange,
            0,
            1,
          );
          // A rigid body shares every impact, but the nearest contact patch
          // sheds the largest share of stale contact-patch state.
          const responseShare = 0.2 + proximity * 0.8;
          combine(wheel, impactAuthority * responseShare);
        },
      );
    });
    return { authorities };
  })();
  const wheelImpactAuthorities = wheelImpactResponse.authorities;
  const retain = {
    frontLeft: 1 - wheelImpactAuthorities.frontLeft,
    frontRight: 1 - wheelImpactAuthorities.frontRight,
    rearLeft: 1 - wheelImpactAuthorities.rearLeft,
    rearRight: 1 - wheelImpactAuthorities.rearRight,
  };
  const reconciledWheelSpeeds = {
    frontLeft: previous.frontLeftWheelSpeed
      + (frontLeftWheelSpeed - previous.frontLeftWheelSpeed)
        * wheelImpactAuthorities.frontLeft,
    frontRight: previous.frontRightWheelSpeed
      + (frontRightWheelSpeed - previous.frontRightWheelSpeed)
        * wheelImpactAuthorities.frontRight,
    rearLeft: previous.rearLeftWheelSpeed
      + (rearLeftWheelSpeed - previous.rearLeftWheelSpeed)
        * wheelImpactAuthorities.rearLeft,
    rearRight: previous.rearRightWheelSpeed
      + (rearRightWheelSpeed - previous.rearRightWheelSpeed)
        * wheelImpactAuthorities.rearRight,
  };
  const impact = analyzeCarImpact(contacts, {
    forward,
    massKg: style.physics.massKg,
    pixelsPerMeter,
    right,
    trackWidthM: style.physics.trackWidthM,
  });
  const impactContacts = impact.contacts;
  const impactLongitudinalMps = impact.longitudinalMps;
  const impactLateralMps = impact.lateralMps;
  const longitudinalDominantImpact = impact.longitudinalDominant;
  const effectiveImpactLateralMps = longitudinalDominantImpact
    ? 0
    : impactLateralMps;
  const centeredBumperImpact = impact.centeredBumperImpact;
  const impactLongitudinalTransfer = clamp(
    previous.longitudinalLoadTransfer * 0.15 + impactLongitudinalMps * 0.014,
    -0.075,
    0.075,
  );
  const impactLateralTransfer = clamp(
    previous.lateralLoadTransfer * 0.15 + effectiveImpactLateralMps * 0.012,
    -0.065,
    0.065,
  );
  const frontImpactCompression = -impactLongitudinalTransfer * 4.4;
  const rearImpactCompression = impactLongitudinalTransfer * 3.8;
  const lateralImpactCompression = impactLateralTransfer * 3;
  const settleCompression = (previousCompression: number, target: number) => clamp(
    previousCompression * 0.15 + target,
    -0.35,
    0.45,
  );
  const chassisImpactAbsorption = impactContacts.length > 0 ? {
    // Apply one heavy-body compression when contact begins. Persistent wall
    // pressure remains a velocity constraint and cannot restart this motion.
    frontLeftSuspensionCompression: settleCompression(
      previous.frontLeftSuspensionCompression,
      frontImpactCompression + lateralImpactCompression,
    ),
    frontLeftSuspensionVelocity: 0,
    frontRightSuspensionCompression: settleCompression(
      previous.frontRightSuspensionCompression,
      frontImpactCompression - lateralImpactCompression,
    ),
    frontRightSuspensionVelocity: 0,
    rearLeftSuspensionCompression: settleCompression(
      previous.rearLeftSuspensionCompression,
      rearImpactCompression + lateralImpactCompression,
    ),
    rearLeftSuspensionVelocity: 0,
    rearRightSuspensionCompression: settleCompression(
      previous.rearRightSuspensionCompression,
      rearImpactCompression - lateralImpactCompression,
    ),
    rearRightSuspensionVelocity: 0,
    longitudinalLoadTransfer: impactLongitudinalTransfer,
    longitudinalLoadTransferVelocity: 0,
    lateralLoadTransfer: impactLateralTransfer,
    lateralLoadTransferVelocity: 0,
    longitudinalAcceleration: 0,
    lateralAcceleration: 0,
    frontLongitudinalAcceleration: 0,
    rearLongitudinalAcceleration: 0,
    frontLateralAcceleration: 0,
    rearLateralAcceleration: 0,
    velocityX: longitudinalDominantImpact
      ? previous.velocityX - right.x * impactLateralMps * pixelsPerMeter
      : previous.velocityX,
    velocityY: longitudinalDominantImpact
      ? previous.velocityY - right.y * impactLateralMps * pixelsPerMeter
      : previous.velocityY,
    yawRate: centeredBumperImpact
      ? options.previousYawRate ?? previous.yawRate
      : previous.yawRate,
  } : {};
  return {
    ...previous,
    ...chassisImpactAbsorption,
    frontLeftLateralForce: previous.frontLeftLateralForce * retain.frontLeft,
    frontLeftAligningMomentNm: (previous.frontLeftAligningMomentNm ?? 0)
      * retain.frontLeft,
    frontLeftLateralDeflectionM: (
      Number.isFinite(previous.frontLeftLateralDeflectionM)
        ? previous.frontLeftLateralDeflectionM : 0
    ) * retain.frontLeft,
    frontRightLateralForce: previous.frontRightLateralForce * retain.frontRight,
    frontRightAligningMomentNm: (previous.frontRightAligningMomentNm ?? 0)
      * retain.frontRight,
    frontRightLateralDeflectionM: (
      Number.isFinite(previous.frontRightLateralDeflectionM)
        ? previous.frontRightLateralDeflectionM : 0
    ) * retain.frontRight,
    rearLeftLateralForce: previous.rearLeftLateralForce * retain.rearLeft,
    rearLeftLateralDeflectionM: (
      Number.isFinite(previous.rearLeftLateralDeflectionM)
        ? previous.rearLeftLateralDeflectionM : 0
    ) * retain.rearLeft,
    rearRightLateralForce: previous.rearRightLateralForce * retain.rearRight,
    rearRightLateralDeflectionM: (
      Number.isFinite(previous.rearRightLateralDeflectionM)
        ? previous.rearRightLateralDeflectionM : 0
    ) * retain.rearRight,
    frontLeftLongitudinalDeflectionM: (
      Number.isFinite(previous.frontLeftLongitudinalDeflectionM)
        ? previous.frontLeftLongitudinalDeflectionM : 0
    ) * retain.frontLeft,
    frontLeftLongitudinalForce:
      previous.frontLeftLongitudinalForce * retain.frontLeft,
    frontRightLongitudinalDeflectionM: (
      Number.isFinite(previous.frontRightLongitudinalDeflectionM)
        ? previous.frontRightLongitudinalDeflectionM : 0
    ) * retain.frontRight,
    frontRightLongitudinalForce:
      previous.frontRightLongitudinalForce * retain.frontRight,
    rearLeftLongitudinalDeflectionM: (
      Number.isFinite(previous.rearLeftLongitudinalDeflectionM)
        ? previous.rearLeftLongitudinalDeflectionM : 0
    ) * retain.rearLeft,
    rearLeftLongitudinalForce:
      previous.rearLeftLongitudinalForce * retain.rearLeft,
    rearRightLongitudinalDeflectionM: (
      Number.isFinite(previous.rearRightLongitudinalDeflectionM)
        ? previous.rearRightLongitudinalDeflectionM : 0
    ) * retain.rearRight,
    rearRightLongitudinalForce:
      previous.rearRightLongitudinalForce * retain.rearRight,
    frontLeftTireDemand: (Number.isFinite(previous.frontLeftTireDemand)
      ? previous.frontLeftTireDemand : 0) * retain.frontLeft,
    frontRightTireDemand: (Number.isFinite(previous.frontRightTireDemand)
      ? previous.frontRightTireDemand : 0) * retain.frontRight,
    rearLeftTireDemand: (Number.isFinite(previous.rearLeftTireDemand)
      ? previous.rearLeftTireDemand : 0) * retain.rearLeft,
    rearRightTireDemand: (Number.isFinite(previous.rearRightTireDemand)
      ? previous.rearRightTireDemand : 0) * retain.rearRight,
    frontLeftLongitudinalSlip:
      previous.frontLeftLongitudinalSlip * retain.frontLeft,
    frontRightLongitudinalSlip:
      previous.frontRightLongitudinalSlip * retain.frontRight,
    rearLeftLongitudinalSlip:
      previous.rearLeftLongitudinalSlip * retain.rearLeft,
    rearRightLongitudinalSlip:
      previous.rearRightLongitudinalSlip * retain.rearRight,
    frontLongitudinalSlip: (
      previous.frontLeftLongitudinalSlip * retain.frontLeft
        + previous.frontRightLongitudinalSlip * retain.frontRight
    ) / 2,
    frontLongitudinalSlipPeak: Math.max(
      Math.abs(previous.frontLeftLongitudinalSlip * retain.frontLeft),
      Math.abs(previous.frontRightLongitudinalSlip * retain.frontRight),
    ),
    frontLongitudinalSlipRms: Math.hypot(
      previous.frontLeftLongitudinalSlip * retain.frontLeft,
      previous.frontRightLongitudinalSlip * retain.frontRight,
    ) / Math.SQRT2,
    rearLongitudinalSlip: (
      previous.rearLeftLongitudinalSlip * retain.rearLeft
        + previous.rearRightLongitudinalSlip * retain.rearRight
    ) / 2,
    rearLongitudinalSlipPeak: Math.max(
      Math.abs(previous.rearLeftLongitudinalSlip * retain.rearLeft),
      Math.abs(previous.rearRightLongitudinalSlip * retain.rearRight),
    ),
    rearLongitudinalSlipRms: Math.hypot(
      previous.rearLeftLongitudinalSlip * retain.rearLeft,
      previous.rearRightLongitudinalSlip * retain.rearRight,
    ) / Math.SQRT2,
    longitudinalTireSlip: Math.max(
      Math.abs(previous.frontLeftLongitudinalSlip * retain.frontLeft),
      Math.abs(previous.frontRightLongitudinalSlip * retain.frontRight),
      Math.abs(previous.rearLeftLongitudinalSlip * retain.rearLeft),
      Math.abs(previous.rearRightLongitudinalSlip * retain.rearRight),
    ),
    frontLeftWheelAcceleration:
      previous.frontLeftWheelAcceleration * retain.frontLeft,
    frontRightWheelAcceleration:
      previous.frontRightWheelAcceleration * retain.frontRight,
    rearLeftWheelAcceleration:
      previous.rearLeftWheelAcceleration * retain.rearLeft,
    rearRightWheelAcceleration:
      previous.rearRightWheelAcceleration * retain.rearRight,
    frontLeftWheelSpeed: reconciledWheelSpeeds.frontLeft,
    frontRightWheelSpeed: reconciledWheelSpeeds.frontRight,
    rearLeftWheelSpeed: reconciledWheelSpeeds.rearLeft,
    rearRightWheelSpeed: reconciledWheelSpeeds.rearRight,
    frontWheelSpeed: (
      reconciledWheelSpeeds.frontLeft + reconciledWheelSpeeds.frontRight
    ) / 2,
    rearWheelSpeed: (
      reconciledWheelSpeeds.rearLeft + reconciledWheelSpeeds.rearRight
    ) / 2,
  };
}
