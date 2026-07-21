import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import {
  clearHeldCarControls,
  clearCarRouteTransfer,
  consumeCarRouteTransfer,
  createCarRouteTransferId,
  hasCarRouteTransfer,
  readHeldCarControls,
  readSelectedCarVariant,
  storeCarRouteTransfer,
  storeSelectedCarVariant,
  subscribeHeldCarControls,
  suppressHeldCarControlsUntilRelease,
  type CarCalibrationRouteTransfer,
  type CarControl,
  type CarRouteTransfer,
  type CarVariant,
} from "../../lib/carContinuity";
import {
  cameraSettleComplete,
  createCarCameraState,
  resetCarCameraState,
  type CarCameraMode,
} from "../../lib/carCamera";
import type { CarImpactContact } from "../../lib/carCollision";
import {
  getCarCalibrationReport,
  getCarEngineStyle,
  getCarMaximumPageSpeed,
  getCarPageSpeedRatio,
} from "../../lib/carEngineStyles";
import {
  runAllCarDeterministicManeuverReports,
  runCarDeterministicManeuverReport,
  type CarDeterministicManeuverReport,
} from "../../lib/carManeuverAudit";
import {
  createCarChassisState,
  getCarDrivenWheelSpeed,
  interpolateCarPhysicsPose,
  projectCarContactPositionManifold,
  getCarSignedSpeed,
  getCarWorldAxes,
  getCarWheelRotationDelta,
  resolveCarSurfaceCollision,
  type CarPhysicsPose,
} from "../../lib/carChassis";
import {
  createCarDrivetrainState,
} from "../../lib/carDrivetrain";
import { getCarMechanicalKineticEnergyJ } from "../../lib/carDynamics";
import {
  accumulateCarSimulationTime,
  beginCarSimulationFixedStep,
  captureCarSimulationCheckpoint,
  commitCarSimulationStep,
  constrainCarSimulationPassiveMotion,
  createCarSimulationRuntime,
  getCarSimulationMotionEnergyJ,
  getCarSimulationPresentation,
  getCarSimulationSpeed,
  holdCarSimulationPose,
  hydrateCarSimulationRuntime,
  reconcileCarSimulationAfterCollision,
  resolveCarSimulationContactManifold,
  replaceCarSimulationDrivetrain,
  restoreCarSimulationCheckpoint,
  setCarSimulationWorldPose,
  resetCarSimulationRuntime,
  setCarSimulationAccumulator,
  setCarSimulationRenderedPose,
  completeCarSimulationFixedStep,
  translateCarSimulationWorld,
  solveCarSimulationStep,
  synchronizeCarSimulationPoses,
} from "../../lib/carSimulation";
import {
  CAR_VISUAL_GEOMETRY,
  getCarYawInertiaKgM2,
} from "../../lib/carGeometry";
import {
  getSecretAudioDiagnostics,
  getSecretEngineTelemetry,
  playCarImpactSound,
  resumeSecretAudio,
  setCarAudioSpatialPosition,
  shutdownActiveSecretEngine,
  startCarHorn,
  startSecretEngine,
  stopCarHorn,
  type SecretEngineController,
  type SecretEngineTelemetry,
} from "../../lib/secretAudio";
import { createCarMeshRenderer } from "./CarWebGL";
import {
  beginCarRouteArrival,
  beginCarRouteDeparture,
  completeCarRouteArrival,
  createCarRouteLifecycle,
  getCarRouteEngine,
  invalidateCarRouteLifecycle,
  isCarRouteArrivalReady,
  isCarRouteDeparting,
  isCarRouteSequenceCurrent,
  releaseCarRouteEngine,
  retainCarRouteEngine,
} from "./carRouteLifecycle";
import {
  clearCarRuntimeInput,
  createCarRuntimeController,
  getCarRuntimeDelta,
  readCarRuntimeInput,
  resetCarRuntimeClock,
} from "./carRuntimeController";
import {
  CAR_COLLISION_HALF_LENGTH,
  findBarrierCollisions,
  findSweptBarrierCollisions,
  findSweptPageBoundaryContact,
  getCarVerticalSupports,
  getCarWheelSurfaceMultipliers,
  type BarrierCollision,
  type PageBoundaryContact,
  type Point,
} from "./carPageEnvironment";
import { createKeycapEnvironment } from "./keycapEnvironment";
import { getCarTireAudioInput } from "./carAudioFeedback";
import {
  createCarRampMotion,
  resetCarRampMotion,
  resolveCarRamps,
  updateCarRampMotion,
  type CarRamp,
  type CarRampObstacle,
} from "./carRampEnvironment";
import {
  createCarCalibrationRouteTransfer,
  createCarManeuverAudit,
  getCarCalibrationAssessment,
  readCarManeuverAudit,
  updateCarManeuverAudit,
  type CarAuditCalibrationReport,
  type CarManeuverAudit,
  type CarManeuverAuditAccumulator,
} from "./carRuntimeAudit";
import styles from "./SecretToys.module.css";
import type { SecretPalette } from "./useSecretScene";
import { useSecretActivity, useSecretScene } from "./useSecretScene";

type CarScene = {
  illustration: { updateRenderGraph: () => void };
  setDynamics: (dynamics: {
    brake?: number;
    heave?: number;
    reverse?: number;
    frontLeftSuspensionTravel?: number;
    frontRightSuspensionTravel?: number;
    frontLeftWheelRotation?: number;
    frontRightWheelRotation?: number;
    frontWheelRotation?: number;
    pitch: number;
    rearLeftWheelRotation?: number;
    rearLeftSuspensionTravel?: number;
    rearRightWheelRotation?: number;
    rearRightSuspensionTravel?: number;
    rearWheelRotation?: number;
    roll: number;
    steering: number;
    wheelRotation: number;
  }) => void;
  setPose: (pose: {
    brake?: number;
    heave?: number;
    reverse?: number;
    frontLeftSuspensionTravel?: number;
    frontRightSuspensionTravel?: number;
    frontLeftWheelRotation?: number;
    frontRightWheelRotation?: number;
    frontWheelRotation?: number;
    pitch: number;
    rearLeftWheelRotation?: number;
    rearLeftSuspensionTravel?: number;
    rearRightWheelRotation?: number;
    rearRightSuspensionTravel?: number;
    rearWheelRotation?: number;
    roll: number;
    steering: number;
    wheelRotation: number;
    yaw: number;
  }) => void;
  setYaw: (yaw: number) => void;
  dispose?: () => void;
};

type CarAuditCanvas = HTMLCanvasElement & {
  failNextCarAuditNavigation?: () => void;
  stopCarAuditEngine?: () => void;
  stallNextCarAuditNavigation?: () => void;
  setCarAuditEngineVariant?: (variant: CarVariant) => void;
  getCarAuditEngineReady?: () => boolean;
  getCarAuditCalibration?: () => CarAuditCalibrationReport;
  getCarAuditAudioDiagnostics?: typeof getSecretAudioDiagnostics;
  getCarAuditManeuver?: () => CarManeuverAudit;
  getCarAuditDeterministicReport?: () => CarDeterministicManeuverReport;
  getCarAuditAllDeterministicReports?: () => CarDeterministicManeuverReport[];
  resetCarAuditManeuver?: () => void;
  setCarAuditYaw?: (yaw: number) => void;
  setCarAuditPose?: (centerPageX: number, centerPageY: number, heading: number) => void;
  setCarAuditPosition?: (centerPageX: number, centerPageY: number) => void;
  setCarAuditBarriersEnabled?: (enabled: boolean) => void;
  setCarAuditRoutesEnabled?: (enabled: boolean) => void;
  getCarAuditYaw?: () => number;
  getCarAuditSpeed?: () => number;
  getCarAuditYawRate?: () => number;
  getCarAuditSteeringAngle?: () => number;
  getCarAuditControls?: () => CarControl[];
  getCarAuditTravelHeading?: () => number;
  getCarAuditCameraMode?: () => CarCameraMode;
  getCarAuditCameraSuppressed?: () => boolean;
  getCarAuditBarrierHits?: () => number;
  getCarAuditRouteState?: () => {
    centerScreenX: number;
    failNext: boolean;
    navigating: boolean;
    phase: RouteEdgePhase;
    routeEnabled: boolean;
    speed: number;
  };
  /** Test-only visual angles in mesh rotation convention. */
  getCarAuditWheelRotations?: () => [number, number, number, number];
  getCarAuditChassis?: () => {
    absActivity: number;
    brakePressures: [number, number, number, number];
    brakePressure: number;
    differentialCoupling: [number, number];
    drivelineForces: [number, number];
    engineDragControlActivity: number;
    gripMultipliers: [number, number, number, number];
    lateralForces: [number, number, number, number];
    lateralSpeed: number;
    loads: [number, number, number, number];
    signedSpeed: number;
    slipAngles: [number, number, number, number];
    tireDemands: [number, number, number, number];
    tireSlip: number;
    tractionControlActivity: number;
    velocityX: number;
    velocityY: number;
    wheelSlips: [number, number, number, number];
    wheelSpeeds: [number, number, number, number];
  };
  getCarAuditDrivetrain?: () => SecretEngineTelemetry;
  getCarAuditCameraState?: () => {
    mode: CarCameraMode;
    velocity: number;
    integratedScrollY: number;
    targetScreenY: number | null;
    carCenterScreenY: number;
    carCenterPageY: number;
    actualScrollY: number;
    documentHeight: number;
    verticalVelocity: number;
    intentTime: number;
  };
};

type RouteArrivalGuard = {
  entryEdge: "left" | "right";
  minimumSecondsRemaining: number;
  outwardIntentSeconds: number;
};

type RouteEdgePhase = "inside" | "crossing-left" | "crossing-right";

const TAU = Math.PI * 2;
const CAR_CAMERA_TILT = TAU / 8;
const CAR_CAMERA_YAW = TAU / 10;
const CAR_DEPTH_SCREEN_SCALE = Math.sin(CAR_CAMERA_TILT);
const CAR_CANVAS_WIDTH = CAR_VISUAL_GEOMETRY.canvasWidthPx;
const CAR_CANVAS_HEIGHT = CAR_VISUAL_GEOMETRY.canvasHeightPx;
const CAR_PHYSICS_STEP = 1 / 120;
const CAR_MAX_CATCH_UP_STEPS = 12;
const CAR_MAX_FRAME_DELTA_SECONDS = 0.1;
const CAR_MAX_PHYSICS_DEBT_SECONDS = CAR_PHYSICS_STEP
  * CAR_MAX_CATCH_UP_STEPS;
const CAMERA_MAX_SPEED = 1350;
const CAMERA_NORMAL_ACCELERATION = 1500;
const CAMERA_ACQUIRE_ACCELERATION = 2400;
const CAMERA_SAFETY_ACCELERATION = 3600;
const CAMERA_RELEASE_ACCELERATION = 2800;
const CAMERA_SETTLE_MAX_SPEED = 300;
const CAMERA_SETTLE_ACCELERATION = 620;
const CAMERA_SETTLE_SPRING = 1.15;
const CAMERA_TARGET_SHIFT_SPEED = 220;
const CAMERA_ACQUIRE_SPEED = 220;
const CAMERA_RELEASE_SPEED = 120;
const CAMERA_LOOK_AHEAD_SECONDS = 0.42;
const CAMERA_COMMIT_SECONDS = 0.2;
const CONTACT_TOI_TOLERANCE = 0.04;
const PAGE_CONTACT_DYNAMIC_FRICTION = 0.32;
const PAGE_CONTACT_STATIC_FRICTION = 0.62;
const KEYCAP_CONTACT_DYNAMIC_FRICTION = 0.28;
const KEYCAP_CONTACT_STATIC_FRICTION = 0.52;
const BARRIER_REFRESH_DISTANCE = 320;
const CAR_EXIT_MARGIN = CAR_COLLISION_HALF_LENGTH + 8;
const CAR_TOP_CLEARANCE = 72;
const CAR_CENTER_TOP = CAR_TOP_CLEARANCE + CAR_CANVAS_HEIGHT / 2;
const ROUTE_NAVIGATION_TIMEOUT = 4_000;
const ROUTE_AUDIT_NAVIGATION_TIMEOUT = 180;
const ROUTE_RECOVERY_INSET = 120;
const ROUTE_REARM_INSET = 84;
const ROUTE_OUTWARD_INTENT_SECONDS = 0.12;
const ROUTE_MINIMUM_ARRIVAL_GUARD_SECONDS = 0.24;
const ROUTE_MINIMUM_PAGE_DWELL_SECONDS = 0.7;
const ROUTE_EXIT_MIN_SPEED = 48;
const CAR_MINIMUM_VERTICAL_HULL_SUPPORT = 16;
const CAR_RAMPS_ENABLED = false;

function getCarDrivableBottomPageY() {
  const footer = document.querySelector<HTMLElement>(".footer");
  const layoutBottom = footer
    ? footer.getBoundingClientRect().top + window.scrollY
    : document.documentElement.scrollHeight;
  // Keep the complete transparent canvas above the boundary as well as the
  // collision hull, so an absolutely positioned car cannot enlarge the page.
  return layoutBottom - (CAR_CANVAS_HEIGHT / 2 - CAR_MINIMUM_VERTICAL_HULL_SUPPORT);
}

type CarRampColor = {
  alpha: number;
  blue: number;
  green: number;
  red: number;
};

function parseCarRampColor(value: string): CarRampColor | null {
  if (!value.startsWith("rgb")) return null;
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) return null;
  return {
    alpha: channels[3] ?? 1,
    blue: channels[2],
    green: channels[1],
    red: channels[0],
  };
}

function compositeCarRampColor(
  foreground: CarRampColor,
  background: CarRampColor,
): CarRampColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha <= 0) return { alpha: 0, blue: 0, green: 0, red: 0 };
  const channel = (front: number, back: number) => (
    (front * foreground.alpha
      + back * background.alpha * (1 - foreground.alpha)) / alpha
  );
  return {
    alpha,
    blue: channel(foreground.blue, background.blue),
    green: channel(foreground.green, background.green),
    red: channel(foreground.red, background.red),
  };
}

function getCarRampSurfaceColor(x: number, pageY: number) {
  let surface: HTMLElement | null = document.querySelector("main");
  let surfaceArea = Number.POSITIVE_INFINITY;
  document.querySelectorAll<HTMLElement>("main, main *").forEach((element) => {
    if (element.closest('[aria-label="A hidden drivable car"]')) return;
    const style = getComputedStyle(element);
    if (
      style.display === "none"
      || style.visibility === "hidden"
      || Number(style.opacity) <= 0
      || style.position === "fixed"
    ) return;
    const rect = element.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const bottom = rect.bottom + window.scrollY;
    if (x < rect.left || x > rect.right || pageY < top || pageY > bottom) return;
    const area = rect.width * rect.height;
    if (
      surface === null
      || surface.contains(element)
      || area < surfaceArea
    ) {
      surface = element;
      surfaceArea = area;
    }
  });

  const layers: HTMLElement[] = [];
  let layer: HTMLElement | null = surface ?? document.body;
  while (layer) {
    layers.push(layer);
    layer = layer.parentElement;
  }
  let color: CarRampColor = { alpha: 1, blue: 255, green: 255, red: 255 };
  layers.reverse().forEach((element) => {
    const layerColor = parseCarRampColor(getComputedStyle(element).backgroundColor);
    if (layerColor && layerColor.alpha > 0) {
      color = compositeCarRampColor(layerColor, color);
    }
  });
  return `rgb(${Math.round(color.red)}, ${Math.round(color.green)}, ${
    Math.round(color.blue)
  })`;
}

function getCarRampObstacles(): CarRampObstacle[] {
  const semanticTags = new Set([
    "A", "BUTTON", "CANVAS", "FORM", "IMG", "INPUT", "PICTURE", "PRE",
    "SVG", "TABLE", "TEXTAREA", "VIDEO",
  ]);
  return Array.from(document.querySelectorAll<HTMLElement>("main *"))
    .filter((element) => {
      if (element.closest('[aria-label="A hidden drivable car"]')) return false;
      const style = getComputedStyle(element);
      if (
        style.display === "none"
        || style.visibility === "hidden"
        || Number(style.opacity) <= 0
        || style.position === "fixed"
      ) return false;
      const hasDirectText = Array.from(element.childNodes).some((node) => (
        node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
      ));
      const background = parseCarRampColor(style.backgroundColor);
      const hasBorder = [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ].some((width) => Number.parseFloat(width) > 0.5);
      const paintsBox = (
        (background?.alpha ?? 0) > 0.01
        || style.backgroundImage !== "none"
        || style.boxShadow !== "none"
        || hasBorder
      );
      const isSectionSurface = element.tagName === "SECTION";
      return semanticTags.has(element.tagName)
        || hasDirectText
        || (paintsBox && !isSectionSurface);
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const clearance = 18;
      return {
        bottom: rect.bottom + window.scrollY + clearance,
        left: rect.left - clearance,
        right: rect.right + clearance,
        top: rect.top + window.scrollY - clearance,
      };
    })
    .filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
}

const CAR_VARIANTS: Array<{
  id: CarVariant;
  label: string;
  color: string;
}> = [
  { id: "city", label: "Red city car", color: "#f04449" },
  { id: "rally", label: "Blue rally car", color: "#2a74e8" },
  { id: "taxi", label: "Yellow taxi", color: "#fabb1a" },
];

export type CarToyProps = {
  leftExitHref?: string;
  rightExitHref?: string;
};

function approach(current: number, target: number, amount: number) {
  if (current < target) return Math.min(target, current + amount);
  if (current > target) return Math.max(target, current - amount);
  return target;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function stepDampedSpring(
  current: number,
  velocity: number,
  target: number,
  frequencyHz: number,
  dampingRatio: number,
  deltaSeconds: number,
) {
  const angularFrequency = TAU * frequencyHz;
  const stiffness = angularFrequency * angularFrequency;
  const damping = 2 * dampingRatio * angularFrequency;
  const denominator = 1 + damping * deltaSeconds
    + stiffness * deltaSeconds * deltaSeconds;
  const nextVelocity = (
    velocity + stiffness * deltaSeconds * (target - current)
  ) / denominator;
  return {
    value: current + nextVelocity * deltaSeconds,
    velocity: nextVelocity,
  };
}

function wrapYaw(yaw: number) {
  return ((yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

function scrollInstantly(top: number) {
  const rootStyle = document.documentElement.style;
  const previousScrollBehavior = rootStyle.scrollBehavior;
  rootStyle.scrollBehavior = "auto";
  window.scrollTo({ left: 0, top, behavior: "instant" });
  rootStyle.scrollBehavior = previousScrollBehavior;
}

export default function CarToy({ leftExitHref, rightExitHref }: CarToyProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehicleRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef(
    createCarSimulationRuntime(
      getCarEngineStyle("city"),
      CAR_CAMERA_YAW,
      { x: 28, y: 110 },
    ),
  );
  const auditModeRef = useRef(false);
  const maneuverAuditRef = useRef<CarManeuverAuditAccumulator>(createCarManeuverAudit());
  const wheelRotationRef = useRef(0);
  const frontWheelRotationRef = useRef(0);
  const rearWheelRotationRef = useRef(0);
  const frontLeftWheelRotationRef = useRef(0);
  const frontRightWheelRotationRef = useRef(0);
  const rearLeftWheelRotationRef = useRef(0);
  const rearRightWheelRotationRef = useRef(0);
  const renderedYawRef = useRef(CAR_CAMERA_YAW);
  const engineRef = useRef<SecretEngineController | null>(null);
  const routeLifecycleRef = useRef(createCarRouteLifecycle());
  const engineRequestedRef = useRef(false);
  const engineRequestIdRef = useRef(0);
  const engineRequestPendingRef = useRef(false);
  const engineRetryAtRef = useRef(0);
  const mechanicalEngineReadyAtRef = useRef(Number.POSITIVE_INFINITY);
  const mechanicalEngineRunningRef = useRef(false);
  const parkingRef = useRef(false);
  const parkingSettleTimerRef = useRef<number | null>(null);
  const parkingShutdownEndsAtRef = useRef(0);
  const finishParkingRef = useRef<() => void>(() => {});
  const cameraRef = useRef(createCarCameraState());
  const worldOriginRef = useRef({ x: 0, y: 0 });
  const routeArrivalGuardRef = useRef<RouteArrivalGuard | null>(null);
  const routeEdgePhaseRef = useRef<RouteEdgePhase>("inside");
  const routeExitUnlockAtRef = useRef(0);
  const routePageDwellSecondsRef = useRef(0);
  const keycapEnvironmentRef = useRef(createKeycapEnvironment());
  const wheelGripMultipliersRef = useRef({
    frontLeft: 1,
    frontRight: 1,
    rearLeft: 1,
    rearRight: 1,
  });
  const wheelRollingResistanceMultipliersRef = useRef({
    frontLeft: 1,
    frontRight: 1,
    rearLeft: 1,
    rearRight: 1,
  });
  const barrierContactsRef = useRef(new WeakMap<HTMLElement, {
    at: number;
    contactOffset: Point;
    normal: Point;
    normalImpulse: number;
    tangentImpulse: number;
  }>());
  const pageContactImpulsesRef = useRef({
    bottom: { normal: 0, tangent: 0 },
    top: { normal: 0, tangent: 0 },
  });
  const barrierCollisionEnabledRef = useRef(true);
  const routeNavigationEnabledRef = useRef(true);
  const routeRecoveryTimerRef = useRef<number | null>(null);
  const arrivalTaskRef = useRef<number | null>(null);
  const failNextNavigationRef = useRef(false);
  const stallNextNavigationRef = useRef(false);
  const lastVerticalVelocityRef = useRef(0);
  const runtimeRef = useRef(createCarRuntimeController());
  const rampsRef = useRef<CarRamp[]>([]);
  const rampMotionRef = useRef(createCarRampMotion());
  const synchronizePhysicsPose = useCallback((
    heading = simulationRef.current.dynamics.chassis.heading,
  ) => {
    synchronizeCarSimulationPoses(simulationRef.current, heading);
  }, []);
  // This component is client-only. Read the retained choice in the state
  // initializer so a remount never constructs and paints the default red mesh
  // before a layout effect can restore the actual selection.
  const [variant, setVariant] = useState<CarVariant>(readSelectedCarVariant);
  const variantRef = useRef(variant);
  const [honking, setHonking] = useState(false);
  const [carFocused, setCarFocused] = useState(false);
  const [parking, setParking] = useState(false);
  const [ramps, setRamps] = useState<CarRamp[]>([]);
  const [driving, setDriving] = useState(() => (
    typeof window !== "undefined" && hasCarRouteTransfer()
  ));
  const { reducedMotion } = useSecretActivity(rootRef);

  const selectVariant = useCallback((nextVariant: CarVariant) => {
    variantRef.current = nextVariant;
    replaceCarSimulationDrivetrain(
      simulationRef.current,
      createCarDrivetrainState(getCarEngineStyle(nextVariant)),
    );
    storeSelectedCarVariant(nextVariant);
    setVariant(nextVariant);
    engineRef.current?.setVariant(nextVariant);
  }, []);

  const requestDriveEngine = useCallback((coldStart = false) => {
    if (
      !engineRequestedRef.current
      || parkingRef.current
      || isCarRouteDeparting(routeLifecycleRef.current)
      || engineRequestPendingRef.current
      || performance.now() < engineRetryAtRef.current
    ) return;
    const diagnostics = getSecretAudioDiagnostics();
    const currentEngine = engineRef.current;
    if (
      currentEngine?.isActive()
      && diagnostics.engineActive
      && diagnostics.engineState !== "off"
      && diagnostics.engineState !== "stopping"
    ) return;

    currentEngine?.stop();
    engineRef.current = null;
    engineRequestPendingRef.current = true;
    const requestId = engineRequestIdRef.current + 1;
    engineRequestIdRef.current = requestId;
    const requestedVariant = variantRef.current;
    void startSecretEngine(requestedVariant, { coldStart })
      .then((engine) => {
        if (
          requestId !== engineRequestIdRef.current
          || !engineRequestedRef.current
          || parkingRef.current
          || isCarRouteDeparting(routeLifecycleRef.current)
        ) {
          engine.stop();
          return;
        }
        engineRequestPendingRef.current = false;
        engineRetryAtRef.current = 0;
        engineRef.current = engine;
        const selectedStyle = getCarEngineStyle(variantRef.current);
        const steering = Number(runtimeRef.current.appliedControls.has("right"))
          - Number(runtimeRef.current.appliedControls.has("left"));
        engine.setDrive(
          getCarPageSpeedRatio(selectedStyle, getCarSimulationSpeed(simulationRef.current)),
          simulationRef.current.drivetrainOutput?.load
            ?? simulationRef.current.dynamics.drivetrain.engineLoad,
          steering,
          simulationRef.current.dynamics.chassis.brakePressure > 0.08,
          simulationRef.current.dynamics.chassis.tireSlip,
          simulationRef.current.dynamics.chassis.driveDirection,
          simulationRef.current.drivetrainOutput ?? undefined,
          getCarTireAudioInput(simulationRef.current.dynamics.chassis),
        );
        runtimeRef.current.wake();
      })
      .catch(() => {
        if (requestId !== engineRequestIdRef.current) return;
        engineRequestPendingRef.current = false;
        engineRef.current = null;
        // A held accelerator keeps the animation awake and retries after this
        // short backoff instead of leaving the car permanently torque-locked.
        engineRetryAtRef.current = performance.now() + 250;
        runtimeRef.current.wake();
      });
  }, []);

  const createScene = useCallback((canvas: HTMLCanvasElement, palette: SecretPalette): CarScene => {
    const renderer = createCarMeshRenderer(canvas, palette.yellow, variant);
    const illustration = { updateRenderGraph: renderer.render };
    const setYaw = (yaw: number) => renderer.setYaw(yaw);
    const setDynamics = renderer.setDynamics;
    const setPose = renderer.setPose;
    // Meshes are recreated when the selected car or theme changes. Reuse the
    // authoritative visual yaw so a new mesh cannot snap back to its parked
    // preview angle while the driving physics continue in another direction.
    setYaw(renderedYawRef.current);
    const presentation = getCarSimulationPresentation(simulationRef.current);
    setDynamics({
      ...presentation,
      heave: rampMotionRef.current.heave,
      pitch: presentation.pitch + rampMotionRef.current.pitch,
      roll: presentation.roll + rampMotionRef.current.roll,
      frontLeftWheelRotation: frontLeftWheelRotationRef.current,
      frontRightWheelRotation: frontRightWheelRotationRef.current,
      frontWheelRotation: frontWheelRotationRef.current,
      rearLeftWheelRotation: rearLeftWheelRotationRef.current,
      rearRightWheelRotation: rearRightWheelRotationRef.current,
      rearWheelRotation: rearWheelRotationRef.current,
      wheelRotation: wheelRotationRef.current,
    });

    const auditCanvas = canvas as CarAuditCanvas;
    const auditMode = new URLSearchParams(window.location.search)
      .get("car-audit") === "1";
    auditModeRef.current = auditMode;
    if (auditMode) {
      auditCanvas.failNextCarAuditNavigation = () => {
        failNextNavigationRef.current = true;
      };
      auditCanvas.stopCarAuditEngine = () => {
        engineRef.current?.stop();
        engineRef.current = null;
        engineRequestPendingRef.current = false;
        engineRetryAtRef.current = 0;
        runtimeRef.current.wake();
      };
      auditCanvas.stallNextCarAuditNavigation = () => {
        stallNextNavigationRef.current = true;
      };
      auditCanvas.setCarAuditEngineVariant = (nextVariant) => {
        selectVariant(nextVariant);
      };
      auditCanvas.getCarAuditEngineReady = () => engineRef.current !== null;
      auditCanvas.getCarAuditAudioDiagnostics = getSecretAudioDiagnostics;
      auditCanvas.setCarAuditYaw = (yaw) => setYaw(yaw);
      auditCanvas.setCarAuditPose = (centerPageX, centerPageY, heading) => {
        maneuverAuditRef.current = createCarManeuverAudit();
        routeEdgePhaseRef.current = "inside";
        const auditHeading = wrapYaw(heading);
        resetCarSimulationRuntime(
          simulationRef.current,
          getCarEngineStyle(variantRef.current),
          auditHeading,
          {
            x: centerPageX - worldOriginRef.current.x - CAR_CANVAS_WIDTH / 2,
            y: centerPageY - worldOriginRef.current.y - CAR_CANVAS_HEIGHT / 2,
          },
        );
        renderedYawRef.current = auditHeading;
        setDynamics({
          brake: 0,
          heave: 0,
          pitch: 0,
          roll: 0,
          steering: 0,
          frontLeftWheelRotation: frontLeftWheelRotationRef.current,
          frontRightWheelRotation: frontRightWheelRotationRef.current,
          frontWheelRotation: frontWheelRotationRef.current,
          rearLeftWheelRotation: rearLeftWheelRotationRef.current,
          rearRightWheelRotation: rearRightWheelRotationRef.current,
          rearWheelRotation: rearWheelRotationRef.current,
          wheelRotation: wheelRotationRef.current,
        });
        setYaw(simulationRef.current.dynamics.chassis.heading);
        if (vehicleRef.current) {
          vehicleRef.current.style.transform = `translate3d(${
            simulationRef.current.position.x
          }px, ${
            simulationRef.current.position.y
          }px, 0)`;
        }
      };
      auditCanvas.setCarAuditPosition = (centerPageX, centerPageY) => {
        routeEdgePhaseRef.current = "inside";
        setCarSimulationWorldPose(
          simulationRef.current,
          {
            x: centerPageX - worldOriginRef.current.x - CAR_CANVAS_WIDTH / 2,
            y: centerPageY - worldOriginRef.current.y - CAR_CANVAS_HEIGHT / 2,
          },
          simulationRef.current.dynamics.chassis.heading,
          true,
        );
        if (vehicleRef.current) {
          vehicleRef.current.style.transform = `translate3d(${
            simulationRef.current.position.x
          }px, ${simulationRef.current.position.y}px, 0)`;
        }
      };
      auditCanvas.setCarAuditBarriersEnabled = (enabled) => {
        barrierCollisionEnabledRef.current = enabled;
      };
      auditCanvas.setCarAuditRoutesEnabled = (enabled) => {
        routeNavigationEnabledRef.current = enabled;
      };
      auditCanvas.getCarAuditCalibration = () => {
        const measured = readCarManeuverAudit(maneuverAuditRef.current);
        const style = getCarEngineStyle(variantRef.current);
        return {
          ...getCarCalibrationReport(style),
          assessment: getCarCalibrationAssessment(style, measured),
          measured,
          measurementState: measured.elapsedSeconds > 0 ? "measured" : "not-run",
        };
      };
      auditCanvas.getCarAuditManeuver = () => readCarManeuverAudit(
        maneuverAuditRef.current,
      );
      auditCanvas.getCarAuditDeterministicReport = () => (
        runCarDeterministicManeuverReport(variantRef.current)
      );
      auditCanvas.getCarAuditAllDeterministicReports = (
        runAllCarDeterministicManeuverReports
      );
      auditCanvas.resetCarAuditManeuver = () => {
        maneuverAuditRef.current = createCarManeuverAudit();
      };
      auditCanvas.getCarAuditYaw = renderer.getYaw;
      auditCanvas.getCarAuditSpeed = () => (
        isCarRouteArrivalReady(routeLifecycleRef.current) ? getCarSimulationSpeed(simulationRef.current) : 0
      );
      auditCanvas.getCarAuditYawRate = () => simulationRef.current.dynamics.chassis.yawRate;
      auditCanvas.getCarAuditSteeringAngle = () => simulationRef.current.dynamics.chassis.steeringAngle;
      auditCanvas.getCarAuditControls = () => Array.from(runtimeRef.current.appliedControls);
      auditCanvas.getCarAuditTravelHeading = () => simulationRef.current.dynamics.chassis.heading;
      auditCanvas.getCarAuditCameraMode = () => cameraRef.current.mode;
      auditCanvas.getCarAuditCameraSuppressed = () => cameraRef.current.suppressed;
      auditCanvas.getCarAuditBarrierHits = () => keycapEnvironmentRef.current.hitCount;
      auditCanvas.getCarAuditRouteState = () => ({
        centerScreenX: worldOriginRef.current.x + simulationRef.current.position.x
          + CAR_CANVAS_WIDTH / 2 - window.scrollX,
        failNext: failNextNavigationRef.current,
        navigating: isCarRouteDeparting(routeLifecycleRef.current),
        phase: routeEdgePhaseRef.current,
        routeEnabled: routeNavigationEnabledRef.current,
        speed: getCarSimulationSpeed(simulationRef.current),
      });
      auditCanvas.getCarAuditWheelRotations = () => [
        frontLeftWheelRotationRef.current,
        frontRightWheelRotationRef.current,
        rearLeftWheelRotationRef.current,
        rearRightWheelRotationRef.current,
      ];
      auditCanvas.getCarAuditChassis = () => {
        const chassis = simulationRef.current.dynamics.chassis;
        const { right } = getCarWorldAxes(chassis.heading);
        return {
          absActivity: chassis.absActivity,
          brakePressures: [
            chassis.frontLeftBrakePressure,
            chassis.frontRightBrakePressure,
            chassis.rearLeftBrakePressure,
            chassis.rearRightBrakePressure,
          ],
          brakePressure: chassis.brakePressure,
          differentialCoupling: [
            chassis.frontDifferentialCouplingForce,
            chassis.rearDifferentialCouplingForce,
          ],
          drivelineForces: [
            chassis.frontDrivelineForce,
            chassis.rearDrivelineForce,
          ],
          engineDragControlActivity: chassis.engineDragControlActivity,
          gripMultipliers: [
            chassis.frontLeftGripMultiplier,
            chassis.frontRightGripMultiplier,
            chassis.rearLeftGripMultiplier,
            chassis.rearRightGripMultiplier,
          ],
          lateralForces: [
            chassis.frontLeftLateralForce,
            chassis.frontRightLateralForce,
            chassis.rearLeftLateralForce,
            chassis.rearRightLateralForce,
          ],
          lateralSpeed: chassis.velocityX * right.x + chassis.velocityY * right.y,
          loads: [
            chassis.frontLeftLoadNewtons,
            chassis.frontRightLoadNewtons,
            chassis.rearLeftLoadNewtons,
            chassis.rearRightLoadNewtons,
          ],
          signedSpeed: getCarSignedSpeed(chassis),
          slipAngles: [
            chassis.frontLeftSlipAngle,
            chassis.frontRightSlipAngle,
            chassis.rearLeftSlipAngle,
            chassis.rearRightSlipAngle,
          ],
          tireDemands: [
            chassis.frontLeftTireDemand,
            chassis.frontRightTireDemand,
            chassis.rearLeftTireDemand,
            chassis.rearRightTireDemand,
          ],
          tireSlip: chassis.tireSlip,
          tractionControlActivity: chassis.tractionControlActivity,
          velocityX: chassis.velocityX,
          velocityY: chassis.velocityY,
          wheelSlips: [
            chassis.frontLeftLongitudinalSlip,
            chassis.frontRightLongitudinalSlip,
            chassis.rearLeftLongitudinalSlip,
            chassis.rearRightLongitudinalSlip,
          ],
          wheelSpeeds: [
            chassis.frontLeftWheelSpeed,
            chassis.frontRightWheelSpeed,
            chassis.rearLeftWheelSpeed,
            chassis.rearRightWheelSpeed,
          ],
        };
      };
      auditCanvas.getCarAuditDrivetrain = getSecretEngineTelemetry;
      auditCanvas.getCarAuditCameraState = () => ({
        mode: cameraRef.current.mode,
        velocity: cameraRef.current.velocity,
        integratedScrollY: cameraRef.current.scrollY,
        targetScreenY: cameraRef.current.targetScreenY,
        carCenterScreenY: worldOriginRef.current.y
          + simulationRef.current.position.y
          + CAR_CANVAS_HEIGHT / 2
          - window.scrollY,
        carCenterPageY: worldOriginRef.current.y
          + simulationRef.current.position.y
          + CAR_CANVAS_HEIGHT / 2,
        actualScrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        verticalVelocity: lastVerticalVelocityRef.current,
        intentTime: cameraRef.current.intentSeconds,
      });
    }

    return {
      illustration,
      setDynamics,
      setPose,
      setYaw,
      dispose: () => {
        delete auditCanvas.failNextCarAuditNavigation;
        delete auditCanvas.stopCarAuditEngine;
        delete auditCanvas.stallNextCarAuditNavigation;
        delete auditCanvas.setCarAuditEngineVariant;
        delete auditCanvas.getCarAuditEngineReady;
        delete auditCanvas.getCarAuditCalibration;
        delete auditCanvas.getCarAuditAudioDiagnostics;
        delete auditCanvas.getCarAuditManeuver;
        delete auditCanvas.getCarAuditDeterministicReport;
        delete auditCanvas.getCarAuditAllDeterministicReports;
        delete auditCanvas.resetCarAuditManeuver;
        delete auditCanvas.setCarAuditYaw;
        delete auditCanvas.setCarAuditPose;
        delete auditCanvas.setCarAuditPosition;
        delete auditCanvas.setCarAuditBarriersEnabled;
        delete auditCanvas.setCarAuditRoutesEnabled;
        delete auditCanvas.getCarAuditYaw;
        delete auditCanvas.getCarAuditSpeed;
        delete auditCanvas.getCarAuditYawRate;
        delete auditCanvas.getCarAuditSteeringAngle;
        delete auditCanvas.getCarAuditControls;
        delete auditCanvas.getCarAuditTravelHeading;
        delete auditCanvas.getCarAuditCameraMode;
        delete auditCanvas.getCarAuditCameraSuppressed;
        delete auditCanvas.getCarAuditBarrierHits;
        delete auditCanvas.getCarAuditRouteState;
        delete auditCanvas.getCarAuditWheelRotations;
        delete auditCanvas.getCarAuditDrivetrain;
        delete auditCanvas.getCarAuditCameraState;
        renderer.dispose();
      },
    };
  }, [selectVariant, variant]);

  const sceneRef = useSecretScene<CarScene>(canvasRef, createScene);

  const navigateToExit = useCallback((href: string, exitEdge: "left" | "right") => {
    if (isCarRouteDeparting(routeLifecycleRef.current)) return;
    if (arrivalTaskRef.current !== null) {
      window.clearTimeout(arrivalTaskRef.current);
      arrivalTaskRef.current = null;
    }
    const navigationId = beginCarRouteDeparture(routeLifecycleRef.current);
    let recoveryTimer: number | null = null;
    const departureHeading = simulationRef.current.dynamics.chassis.heading;
    const departureControls = new Set(runtimeRef.current.appliedControls);
    const departureMechanicalEngineRunning = mechanicalEngineRunningRef.current;
    const transitioningEngine = engineRef.current;
    const transferId = createCarRouteTransferId();
    routeArrivalGuardRef.current = null;
    routeEdgePhaseRef.current = "inside";
    routeExitUnlockAtRef.current = Number.POSITIVE_INFINITY;
    const destination = new URL(href, window.location.href);
    if (new URLSearchParams(window.location.search).get("car-audit") === "1") {
      destination.searchParams.set("car-audit", "1");
    }
    const navigationHref = `${destination.pathname}${destination.search}${destination.hash}`;
    const carCenterPageY = worldOriginRef.current.y
      + simulationRef.current.position.y
      + CAR_CANVAS_HEIGHT / 2;
    const progressStart = CAR_CENTER_TOP;
    const progressEnd = Math.max(
      progressStart,
      getCarDrivableBottomPageY() - CAR_MINIMUM_VERTICAL_HULL_SUPPORT,
    );
    const verticalProgress = progressEnd === progressStart
      ? 0
      : Math.max(0, Math.min(1,
        (carCenterPageY - progressStart) / (progressEnd - progressStart),
      ));
    const departureSpeed = Math.abs(getCarSimulationSpeed(simulationRef.current)) >= 2
      ? getCarSimulationSpeed(simulationRef.current)
      : departureControls.has("up")
        ? 6
        : departureControls.has("down")
          ? -6
          : getCarSimulationSpeed(simulationRef.current);
    storeCarRouteTransfer(navigationHref, {
      id: transferId,
      entryEdge: exitEdge === "right" ? "left" : "right",
      screenY: worldOriginRef.current.y
        + simulationRef.current.position.y
        + CAR_CANVAS_HEIGHT / 2
        - window.scrollY,
      verticalProgress,
      heading: simulationRef.current.dynamics.chassis.heading,
      speed: departureSpeed,
      calibration: auditModeRef.current
        ? createCarCalibrationRouteTransfer(maneuverAuditRef.current)
        : undefined,
      chassis: { ...simulationRef.current.dynamics.chassis },
      drivetrain: { ...simulationRef.current.dynamics.drivetrain },
      drivetrainOutput: simulationRef.current.drivetrainOutput
        ? { ...simulationRef.current.drivetrainOutput }
        : undefined,
      visual: {
        frontLeftWheelRotation: frontLeftWheelRotationRef.current,
        frontRightWheelRotation: frontRightWheelRotationRef.current,
        frontWheelRotation: frontWheelRotationRef.current,
        rearLeftWheelRotation: rearLeftWheelRotationRef.current,
        rearRightWheelRotation: rearRightWheelRotationRef.current,
        rearWheelRotation: rearWheelRotationRef.current,
        wheelRotation: wheelRotationRef.current,
      },
      variant: variantRef.current,
    });
    // Navigation is requested once the car has committed past an edge. Finish
    // the small remaining off-screen distance in the same direction, then
    // hold that world position while the route resolves. This prevents a
    // partially visible car from stopping or clipping back into the viewport.
    setCarSimulationWorldPose(
      simulationRef.current,
      {
        x: exitEdge === "right"
          ? Math.max(
              simulationRef.current.position.x,
              document.documentElement.clientWidth - worldOriginRef.current.x,
            )
          : Math.min(
              simulationRef.current.position.x,
              -worldOriginRef.current.x - CAR_CANVAS_WIDTH,
            ),
        y: simulationRef.current.position.y,
      },
      departureHeading,
      true,
    );
    if (vehicleRef.current) {
      vehicleRef.current.style.transform = `translate3d(${simulationRef.current.position.x}px, ${
        simulationRef.current.position.y
      }px, 0)`;
    }
    runtimeRef.current.appliedControls.clear();
    resetCarSimulationRuntime(
      simulationRef.current,
      getCarEngineStyle(variantRef.current),
      departureHeading,
    );
    mechanicalEngineRunningRef.current = false;
    mechanicalEngineReadyAtRef.current = Number.POSITIVE_INFINITY;
    engineRequestedRef.current = false;
    engineRequestIdRef.current += 1;
    engineRequestPendingRef.current = false;
    engineRetryAtRef.current = 0;
    retainCarRouteEngine(routeLifecycleRef.current, transitioningEngine);
    transitioningEngine?.handoff();
    engineRef.current = null;
    stopCarHorn();
    setHonking(false);

    const clearRecoveryTimer = () => {
      if (recoveryTimer !== null) {
        window.clearTimeout(recoveryTimer);
        if (routeRecoveryTimerRef.current === recoveryTimer) {
          routeRecoveryTimerRef.current = null;
        }
        recoveryTimer = null;
      }
    };

    const recoverCurrentPage = () => {
      clearRecoveryTimer();
      // A completion from a previous page must never unlock, reposition, or
      // stop the engine belonging to a newer back-and-forth transition.
      if (!isCarRouteSequenceCurrent(routeLifecycleRef.current, navigationId)) return;
      if (!isCarRouteDeparting(routeLifecycleRef.current)) return;
      if (routeRecoveryTimerRef.current !== null) {
        window.clearTimeout(routeRecoveryTimerRef.current);
        routeRecoveryTimerRef.current = null;
      }
      clearCarRouteTransfer(transferId);
      completeCarRouteArrival(routeLifecycleRef.current);
      routeExitUnlockAtRef.current = performance.now() + 500;
      // A failed navigation is effectively a road boundary. Restart from rest
      // inside the viewport and require a fresh key press before retrying so a
      // still-held crossing input cannot immediately strand it past the edge.
      resetCarSimulationRuntime(
        simulationRef.current,
        getCarEngineStyle(variantRef.current),
        departureHeading,
      );
      mechanicalEngineRunningRef.current = departureMechanicalEngineRunning;
      mechanicalEngineReadyAtRef.current = departureMechanicalEngineRunning
        ? 0
        : performance.now() + 1_120;
      const safeInset = Math.min(
        ROUTE_RECOVERY_INSET,
        Math.max(0, document.documentElement.clientWidth - CAR_CANVAS_WIDTH),
      );
      const safePageLeft = window.scrollX + (
        exitEdge === "right"
          ? document.documentElement.clientWidth - CAR_CANVAS_WIDTH - safeInset
          : safeInset
      );
      setCarSimulationWorldPose(
        simulationRef.current,
        {
          x: safePageLeft - worldOriginRef.current.x,
          y: simulationRef.current.position.y,
        },
        departureHeading,
        true,
      );
      const vehicle = vehicleRef.current;
      if (vehicle) {
        vehicle.style.transform = `translate3d(${simulationRef.current.position.x}px, ${
          simulationRef.current.position.y
        }px, 0)`;
      }
      suppressHeldCarControlsUntilRelease();
      clearCarRuntimeInput(runtimeRef.current);
      cameraRef.current.mode = "idle";
      cameraRef.current.velocity = 0;
      cameraRef.current.scrollY = window.scrollY;
      cameraRef.current.targetScreenY = null;
      routeArrivalGuardRef.current = null;
      routeEdgePhaseRef.current = "inside";
      engineRequestedRef.current = true;

      const restoreEngine = (engine: SecretEngineController) => {
        if (!engineRequestedRef.current || isCarRouteDeparting(routeLifecycleRef.current)) {
          engine.stop();
          return;
        }
        engineRequestPendingRef.current = false;
        engineRetryAtRef.current = 0;
        engineRef.current = engine;
        releaseCarRouteEngine(routeLifecycleRef.current);
        const selectedStyle = getCarEngineStyle(variant);
        const steering = Number(runtimeRef.current.appliedControls.has("right"))
          - Number(runtimeRef.current.appliedControls.has("left"));
        engine.setDrive(
          getCarPageSpeedRatio(selectedStyle, getCarSimulationSpeed(simulationRef.current)),
          simulationRef.current.drivetrainOutput?.load
            ?? simulationRef.current.dynamics.drivetrain.engineLoad,
          steering,
          simulationRef.current.dynamics.chassis.brakePressure > 0.08,
          simulationRef.current.dynamics.chassis.tireSlip,
          simulationRef.current.dynamics.chassis.driveDirection,
          simulationRef.current.drivetrainOutput ?? undefined,
        );
      };
      if (transitioningEngine?.isActive()) {
        transitioningEngine.cancelHandoff();
        restoreEngine(transitioningEngine);
      } else {
        requestDriveEngine(false);
      }
      runtimeRef.current.wake();
    };

    const forceFailure = failNextNavigationRef.current;
    failNextNavigationRef.current = false;
    const forceStall = stallNextNavigationRef.current;
    stallNextNavigationRef.current = false;
    let hardFallbackStarted = false;
    const navigation = forceFailure
      ? Promise.resolve(false)
      : forceStall
        ? new Promise<boolean>(() => {})
        : router.push(navigationHref, undefined, { scroll: false });
    recoveryTimer = window.setTimeout(
      () => {
        clearRecoveryTimer();
        if (!isCarRouteSequenceCurrent(routeLifecycleRef.current, navigationId)) return;
        if (!isCarRouteDeparting(routeLifecycleRef.current)) return;
        // If the client router never settles, preserve the transfer record and
        // finish the same route with a document navigation. A pending client
        // promise may resolve later, so mark the fallback before assigning.
        hardFallbackStarted = true;
        try {
          window.location.assign(navigationHref);
        } catch {
          hardFallbackStarted = false;
          recoverCurrentPage();
        }
      },
      forceStall ? ROUTE_AUDIT_NAVIGATION_TIMEOUT : ROUTE_NAVIGATION_TIMEOUT,
    );
    routeRecoveryTimerRef.current = recoveryTimer;
    void navigation
      .then((changed) => {
        clearRecoveryTimer();
        if (hardFallbackStarted) return;
        if (!isCarRouteSequenceCurrent(routeLifecycleRef.current, navigationId)) return;
        if (changed) return;
        recoverCurrentPage();
      })
      .catch(() => {
        if (!hardFallbackStarted) recoverCurrentPage();
      });
  }, [requestDriveEngine, router, variant]);

  const refreshKeycapBarriers = useCallback(() => {
    const carCenter = {
      x: worldOriginRef.current.x + simulationRef.current.position.x
        + CAR_CANVAS_WIDTH / 2,
      y: worldOriginRef.current.y + simulationRef.current.position.y
        + CAR_CANVAS_HEIGHT / 2,
    };
    keycapEnvironmentRef.current.refresh({
      carCenter,
      heading: simulationRef.current.dynamics.chassis.heading,
      variant: variantRef.current,
    });
  }, []);

  const stepKeycapBodies = useCallback((deltaSeconds: number) => {
    keycapEnvironmentRef.current.step(deltaSeconds, reducedMotion);
  }, [reducedMotion]);

  const animateBarrierImpact = useCallback((
    collision: BarrierCollision,
    normalImpulse: number,
  ) => {
    keycapEnvironmentRef.current.applyImpact(
      collision,
      normalImpulse,
      reducedMotion,
    );
  }, [reducedMotion]);

  const renderVehicleScreenPosition = useCallback((pose?: Pick<CarPhysicsPose, "x" | "y">) => {
    const vehicle = vehicleRef.current;
    if (!vehicle) return;
    const renderedPose = pose ?? simulationRef.current.position;
    vehicle.style.transform = `translate3d(${
      renderedPose.x
    }px, ${
      renderedPose.y
    }px, 0)`;
  }, []);

  const syncCarAudioPosition = useCallback(() => {
    const renderedPose = simulationRef.current.poses.rendered;
    setCarAudioSpatialPosition(
      worldOriginRef.current.x + renderedPose.x + CAR_CANVAS_WIDTH / 2 - window.scrollX,
      worldOriginRef.current.y + renderedPose.y + CAR_CANVAS_HEIGHT / 2 - window.scrollY,
      window.innerWidth,
      window.innerHeight,
      simulationRef.current.dynamics.chassis.heading,
    );
  }, []);

  const placeVehicle = useCallback((
    deltaSeconds = 1 / 60,
    verticalVelocity = 0,
    horizontalVelocity = 0,
    interpolationAlpha = 1,
  ) => {
    const vehicle = vehicleRef.current;
    const root = rootRef.current;
    if (!vehicle || !root) return;
    routePageDwellSecondsRef.current = Math.max(
      0,
      routePageDwellSecondsRef.current - Math.max(0, deltaSeconds),
    );
    const rootRect = root.getBoundingClientRect();
    const rootPageX = rootRect.left + window.scrollX;
    const rootPageY = rootRect.top + window.scrollY;
    const previousOrigin = worldOriginRef.current;
    // The fixed driving layer must retain world coordinates when content
    // above its otherwise-static DOM anchor lays out during a route change.
    // Counter-shift the anchor movement before adopting its new origin.
    const originShiftX = previousOrigin.x - rootPageX;
    const originShiftY = previousOrigin.y - rootPageY;
    translateCarSimulationWorld(
      simulationRef.current,
      originShiftX,
      originShiftY,
    );
    worldOriginRef.current = { x: rootPageX, y: rootPageY };
    const retryBoundaryLocked = routeArrivalGuardRef.current === null
      && performance.now() < routeExitUnlockAtRef.current;
    const routeBoundaryOpen = isCarRouteDeparting(routeLifecycleRef.current) || !retryBoundaryLocked;
    const routeDriveIntentActive = runtimeRef.current.appliedControls.has("up")
      || runtimeRef.current.appliedControls.has("down");
    const unclampedCenterScreenX = rootPageX
      + simulationRef.current.position.x
      + CAR_CANVAS_WIDTH / 2
      - window.scrollX;
    const alreadyCrossingLeft = unclampedCenterScreenX < 0
      && horizontalVelocity < -4;
    const alreadyCrossingRight = unclampedCenterScreenX
        > document.documentElement.clientWidth
      && horizontalVelocity > 4;
    // Keep the car visibly contained until it has committed to crossing an
    // edge. Once its center is already beyond the viewport, continuing outward
    // is also a commitment: snapping it fully back on-screen while speed ramps
    // would visibly break the crossing and can strand short inputs at an edge.
    const committedLeftExit = horizontalVelocity <= -ROUTE_EXIT_MIN_SPEED
      || alreadyCrossingLeft;
    const committedRightExit = horizontalVelocity >= ROUTE_EXIT_MIN_SPEED
      || alreadyCrossingRight;
    const unclampedLeftScreenX = unclampedCenterScreenX - CAR_CANVAS_WIDTH / 2;
    const unclampedRightScreenX = unclampedCenterScreenX + CAR_CANVAS_WIDTH / 2;
    if (
      routeEdgePhaseRef.current === "crossing-left"
      && unclampedLeftScreenX >= 0
    ) routeEdgePhaseRef.current = "inside";
    if (
      routeEdgePhaseRef.current === "crossing-right"
      && unclampedRightScreenX <= document.documentElement.clientWidth
    ) routeEdgePhaseRef.current = "inside";
    if (
      leftExitHref
      && routeBoundaryOpen
      && routeDriveIntentActive
      && committedLeftExit
      && unclampedLeftScreenX < 0
    ) routeEdgePhaseRef.current = "crossing-left";
    if (
      rightExitHref
      && routeBoundaryOpen
      && routeDriveIntentActive
      && committedRightExit
      && unclampedRightScreenX > document.documentElement.clientWidth
    ) routeEdgePhaseRef.current = "crossing-right";
    const leftBoundaryOpen = isCarRouteDeparting(routeLifecycleRef.current)
      || (routeBoundaryOpen && (
        (routeDriveIntentActive && committedLeftExit)
          || routeEdgePhaseRef.current === "crossing-left"
      ));
    const rightBoundaryOpen = isCarRouteDeparting(routeLifecycleRef.current)
      || (routeBoundaryOpen && (
        (routeDriveIntentActive && committedRightExit)
          || routeEdgePhaseRef.current === "crossing-right"
      ));
    const minX = leftExitHref && leftBoundaryOpen
      ? -rootPageX - CAR_CANVAS_WIDTH
      : -rootPageX;
    const maxX = rightExitHref && rightBoundaryOpen
      ? document.documentElement.clientWidth - rootPageX
      : document.documentElement.clientWidth - rootPageX - CAR_CANVAS_WIDTH;
    const verticalSupport = getCarVerticalSupports(
      simulationRef.current.dynamics.chassis.heading,
      variantRef.current,
    );
    const minY = CAR_TOP_CLEARANCE + verticalSupport.top
      - rootPageY
      - CAR_CANVAS_HEIGHT / 2;
    const maxY = getCarDrivableBottomPageY()
      - verticalSupport.bottom
      - rootPageY
      - CAR_CANVAS_HEIGHT / 2;
    const unclampedX = simulationRef.current.position.x;
    const unclampedY = simulationRef.current.position.y;
    const clampShiftX = Math.min(maxX, Math.max(minX, unclampedX)) - unclampedX;
    const clampShiftY = Math.min(maxY, Math.max(minY, unclampedY)) - unclampedY;
    // This clamp is a layout-recovery guard only. Physical page contact is
    // resolved once, at the hull contact point, by the swept manifold below.
    // Applying another center-of-mass impulse here removed the contact lever
    // arm and made the car skate along the top and bottom boundaries.
    if (clampShiftX !== 0 || clampShiftY !== 0) {
      translateCarSimulationWorld(
        simulationRef.current,
        clampShiftX,
        clampShiftY,
      );
    }
    const renderedPose = interpolateCarPhysicsPose(
      simulationRef.current.poses.previous,
      simulationRef.current.poses.current,
      interpolationAlpha,
    );
    setCarSimulationRenderedPose(simulationRef.current, renderedPose);
    renderVehicleScreenPosition(renderedPose);
    syncCarAudioPosition();

    const vehicleCenterScreenX = rootPageX
      + simulationRef.current.position.x
      + CAR_CANVAS_WIDTH / 2
      - window.scrollX;
    const now = performance.now();
    const arrivalGuard = routeArrivalGuardRef.current;
    if (arrivalGuard) {
      arrivalGuard.minimumSecondsRemaining = Math.max(
        0,
        arrivalGuard.minimumSecondsRemaining - Math.max(0, deltaSeconds),
      );
    }
    if (arrivalGuard) {
      const viewportWidth = document.documentElement.clientWidth;
      const safelyInside = arrivalGuard.entryEdge === "left"
        ? vehicleCenterScreenX >= ROUTE_REARM_INSET
        : vehicleCenterScreenX <= viewportWidth - ROUTE_REARM_INSET;
      const movingOutward = Math.abs(horizontalVelocity) > 20 && (
        arrivalGuard.entryEdge === "left"
          ? horizontalVelocity < 0
          : horizontalVelocity > 0
      );
      if (safelyInside && arrivalGuard.minimumSecondsRemaining <= 0) {
        routeArrivalGuardRef.current = null;
      } else if (arrivalGuard.minimumSecondsRemaining <= 0 && movingOutward) {
        arrivalGuard.outwardIntentSeconds += deltaSeconds;
        if (arrivalGuard.outwardIntentSeconds >= ROUTE_OUTWARD_INTENT_SECONDS) {
          routeArrivalGuardRef.current = null;
        }
      } else {
        arrivalGuard.outwardIntentSeconds = 0;
      }
    }
    const routeExitUnlocked = routeArrivalGuardRef.current === null
      && routePageDwellSecondsRef.current <= 0
      && now >= routeExitUnlockAtRef.current;
    if (
      routeNavigationEnabledRef.current
      && routeExitUnlocked
      && leftExitHref
      && committedLeftExit
      && vehicleCenterScreenX < -CAR_EXIT_MARGIN
    ) {
      navigateToExit(leftExitHref, "left");
      return;
    }
    if (
      routeExitUnlocked
      && routeNavigationEnabledRef.current
      && rightExitHref
      && committedRightExit
      && vehicleCenterScreenX > document.documentElement.clientWidth + CAR_EXIT_MARGIN
    ) {
      navigateToExit(rightExitHref, "right");
      return;
    }

    if (cameraRef.current.following) {
      if (cameraRef.current.mode === "idle") cameraRef.current.scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const vehicleCenterPageY = rootPageY + simulationRef.current.position.y + CAR_CANVAS_HEIGHT / 2;
      const vehicleCenterScreenY = vehicleCenterPageY - window.scrollY;
      const verticalDirection = Math.sign(verticalVelocity);
      const sustainedVerticalMotion = Math.abs(verticalVelocity) >= CAMERA_ACQUIRE_SPEED;
      const projectedCenterScreenY = vehicleCenterScreenY
        + verticalVelocity * CAMERA_LOOK_AHEAD_SECONDS;
      const visibilityInset = CAR_CANVAS_HEIGHT * 0.42;
      const visibilityAtRisk = vehicleCenterScreenY < visibilityInset
        || vehicleCenterScreenY > viewportHeight - visibilityInset;
      const projectedExitRisk = projectedCenterScreenY < visibilityInset
        || projectedCenterScreenY > viewportHeight - visibilityInset;
      const intentDirection = sustainedVerticalMotion && projectedExitRisk
        ? verticalDirection
        : 0;
      if (intentDirection !== 0 && intentDirection === cameraRef.current.intentDirection) {
        cameraRef.current.intentSeconds += deltaSeconds;
      } else {
        cameraRef.current.intentDirection = intentDirection;
        cameraRef.current.intentSeconds = intentDirection === 0 ? 0 : deltaSeconds;
      }
      const committedToExit = visibilityAtRisk
        || cameraRef.current.intentSeconds >= CAMERA_COMMIT_SECONDS;
      if (Math.abs(getCarSimulationSpeed(simulationRef.current)) > 50) cameraRef.current.journeyStarted = true;
      const centerScrollError = vehicleCenterPageY - viewportHeight / 2 - window.scrollY;
      if (
        cameraRef.current.mode === "idle"
        && cameraRef.current.journeyStarted
        && Math.abs(getCarSimulationSpeed(simulationRef.current)) < 1
        && Math.abs(centerScrollError) > 6
      ) {
        cameraRef.current.mode = "settle";
        cameraRef.current.targetScreenY = viewportHeight / 2;
      }
      if (
        cameraRef.current.mode === "idle"
        && Math.abs(verticalVelocity) > 1
        && committedToExit
      ) {
        cameraRef.current.mode = "acquire";
        cameraRef.current.direction = verticalDirection
          || (vehicleCenterScreenY > viewportHeight / 2 ? 1 : -1);
        cameraRef.current.targetScreenY = vehicleCenterScreenY;
      }

      if (cameraRef.current.mode !== "idle") {
        const following = cameraRef.current.mode === "acquire"
          || cameraRef.current.mode === "track";
        const directionReversed = following
          && Math.abs(verticalVelocity) >= CAMERA_RELEASE_SPEED
          && verticalDirection !== 0
          && verticalDirection !== cameraRef.current.direction
          && committedToExit;
        const motionResumed = cameraRef.current.mode === "release"
          && committedToExit
          && (
            Math.abs(verticalVelocity) >= CAMERA_ACQUIRE_SPEED
            || (visibilityAtRisk && Math.abs(verticalVelocity) > 1)
          );
        if (directionReversed || motionResumed) {
          cameraRef.current.mode = "acquire";
          cameraRef.current.direction = verticalDirection;
          cameraRef.current.targetScreenY = vehicleCenterScreenY;
        }
        const continuingDirection = (
          Math.abs(verticalVelocity) >= CAMERA_RELEASE_SPEED
          || visibilityAtRisk
        )
          && verticalDirection === cameraRef.current.direction;
        if (
          (cameraRef.current.mode === "acquire" || cameraRef.current.mode === "track")
          && !directionReversed
          && !continuingDirection
        ) {
          cameraRef.current.mode = "release";
        }

        let desiredVelocity = 0;
        let maxAcceleration = CAMERA_NORMAL_ACCELERATION;
        let settleError = Number.POSITIVE_INFINITY;
        if (cameraRef.current.mode === "acquire" || cameraRef.current.mode === "track") {
          const maximumLead = Math.min(72, viewportHeight * 0.09);
          const speedLead = Math.max(
            -maximumLead,
            Math.min(
              maximumLead,
              verticalVelocity
                / getCarMaximumPageSpeed(
                  getCarEngineStyle(getSecretEngineTelemetry().variant),
                  1,
                )
                * maximumLead,
            ),
          );
          // Like a top-down racing camera, the vehicle runs slightly ahead of
          // center while the camera trails its direction of travel.
          const desiredTargetScreenY = viewportHeight / 2 + speedLead;
          const minimumRacingTarget = viewportHeight / 2 - maximumLead;
          const maximumRacingTarget = viewportHeight / 2 + maximumLead;
          const safeCurrentTarget = Math.max(
            minimumRacingTarget,
            Math.min(
              maximumRacingTarget,
              cameraRef.current.targetScreenY ?? vehicleCenterScreenY,
            ),
          );
          cameraRef.current.targetScreenY = approach(
            safeCurrentTarget,
            desiredTargetScreenY,
            CAMERA_TARGET_SHIFT_SPEED * deltaSeconds,
          );
          const targetScrollY = vehicleCenterPageY - cameraRef.current.targetScreenY;
          const scrollError = targetScrollY - window.scrollY;
          const acquiring = cameraRef.current.mode === "acquire";
          const velocityMatch = acquiring && !visibilityAtRisk ? 0.78 : 1;
          const correctionLimit = visibilityAtRisk ? 400 : acquiring ? 340 : 120;
          const positionCorrection = Math.max(
            -correctionLimit,
            Math.min(correctionLimit, scrollError * (acquiring ? 1.35 : 0.75)),
          );
          desiredVelocity = Math.max(
            -CAMERA_MAX_SPEED,
            Math.min(CAMERA_MAX_SPEED, verticalVelocity * velocityMatch + positionCorrection),
          );
          if (acquiring) maxAcceleration = CAMERA_ACQUIRE_ACCELERATION;
          if (visibilityAtRisk) maxAcceleration = CAMERA_SAFETY_ACCELERATION;
          if (
            acquiring
            && (
              visibilityAtRisk
              || (
                Math.abs(scrollError) < 56
                && Math.abs(cameraRef.current.velocity - verticalVelocity) < 360
              )
            )
          ) {
            cameraRef.current.mode = "track";
          }
        } else if (cameraRef.current.mode === "settle") {
          const targetScrollY = vehicleCenterPageY - viewportHeight / 2;
          settleError = targetScrollY - window.scrollY;
          desiredVelocity = Math.max(
            -CAMERA_SETTLE_MAX_SPEED,
            Math.min(CAMERA_SETTLE_MAX_SPEED, settleError * CAMERA_SETTLE_SPRING),
          );
          maxAcceleration = CAMERA_SETTLE_ACCELERATION;
        } else {
          maxAcceleration = CAMERA_RELEASE_ACCELERATION;
        }
        cameraRef.current.velocity = approach(
          cameraRef.current.velocity,
          desiredVelocity,
          maxAcceleration * deltaSeconds,
        );
        const maxScrollY = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
        cameraRef.current.scrollY = Math.max(
          0,
          Math.min(
            maxScrollY,
            cameraRef.current.scrollY + cameraRef.current.velocity * deltaSeconds,
          ),
        );
        let nextScrollY = cameraRef.current.scrollY;
        const minimumFramingScrollY = vehicleCenterPageY
          - (viewportHeight - visibilityInset);
        const maximumFramingScrollY = vehicleCenterPageY - visibilityInset;
        nextScrollY = Math.max(
          0,
          Math.min(
            maxScrollY,
            Math.max(
              minimumFramingScrollY,
              Math.min(maximumFramingScrollY, nextScrollY),
            ),
          ),
        );
        cameraRef.current.scrollY = nextScrollY;
        if (cameraRef.current.mode === "release" && Math.abs(cameraRef.current.velocity) < 5) {
          cameraRef.current.velocity = 0;
          cameraRef.current.direction = 0;
          if (
            cameraRef.current.journeyStarted
            && Math.abs(getCarSimulationSpeed(simulationRef.current)) < 1
            && Math.abs(centerScrollError) > 6
          ) {
            cameraRef.current.mode = "settle";
            cameraRef.current.targetScreenY = viewportHeight / 2;
          } else {
            cameraRef.current.mode = "idle";
            cameraRef.current.targetScreenY = null;
          }
        }
        if (
          cameraRef.current.mode === "settle"
          && cameraSettleComplete(settleError, cameraRef.current.velocity)
        ) {
          // Do not snap the remaining error on the final frame. The integrated
          // camera position is already sub-pixel close and becomes the resting
          // position, preserving velocity continuity when the car stops.
          cameraRef.current.mode = "idle";
          cameraRef.current.velocity = 0;
          cameraRef.current.scrollY = nextScrollY;
          cameraRef.current.targetScreenY = null;
          cameraRef.current.journeyStarted = false;
          cameraRef.current.intentDirection = 0;
          cameraRef.current.intentSeconds = 0;
        }
        if (nextScrollY === 0 || nextScrollY === maxScrollY) {
          cameraRef.current.mode = "idle";
          cameraRef.current.velocity = 0;
          cameraRef.current.direction = 0;
          cameraRef.current.targetScreenY = null;
          cameraRef.current.journeyStarted = false;
          cameraRef.current.intentDirection = 0;
          cameraRef.current.intentSeconds = 0;
        }
        if (Math.abs(nextScrollY - window.scrollY) > 0.01) {
          window.scrollTo({ left: 0, top: nextScrollY, behavior: "instant" });
        }
      }
    }
  }, [
    leftExitHref,
    navigateToExit,
    renderVehicleScreenPosition,
    rightExitHref,
    syncCarAudioPosition,
  ]);

  const animate = useCallback((time: number) => {
    runtimeRef.current.frame = null;
    if (!driving || !isCarRouteArrivalReady(routeLifecycleRef.current)) return;
    const { deltaSeconds, stalled: frameStalled } = getCarRuntimeDelta(
      runtimeRef.current,
      time,
      CAR_MAX_FRAME_DELTA_SECONDS,
    );
    const parking = parkingRef.current;
    const { opposingPedals, pressed, steering, throttle } = readCarRuntimeInput(
      runtimeRef.current,
      parking,
    );
    const engineStyle = getCarEngineStyle(variant);
    const physics = engineStyle.physics;
    // The drivetrain now owns clutch engagement and shift torque interruption.
    // It modulates longitudinal force without changing steering or coasting,
    // so an audible gear change has the same brief torque break in motion.
    const engineTelemetry = getSecretEngineTelemetry();
    const audioEngineRunning = engineRef.current?.isActive() === true
      && (
        engineTelemetry.engineState === "running"
        || (
          engineTelemetry.engineState === "starting"
          && engineTelemetry.torqueFactor > 0
        )
      );
    if (
      !mechanicalEngineRunningRef.current
      && time >= mechanicalEngineReadyAtRef.current
      && !parking
    ) {
      mechanicalEngineRunningRef.current = true;
    }
    const mechanicalEngineRunning = mechanicalEngineRunningRef.current && !parking;
    if (
      !parking
      && throttle !== 0
      && !audioEngineRunning
      && engineTelemetry.engineState !== "starting"
    ) {
      requestDriveEngine(false);
    }
    const initialX = simulationRef.current.position.x;
    const initialY = simulationRef.current.position.y;
    const carCenterPageY = worldOriginRef.current.y
      + simulationRef.current.position.y
      + CAR_CANVAS_HEIGHT / 2;
    if (
      !Number.isFinite(keycapEnvironmentRef.current.refreshY)
      || Math.abs(carCenterPageY - keycapEnvironmentRef.current.refreshY) >= BARRIER_REFRESH_DISTANCE
    ) {
      refreshKeycapBarriers();
    }

    // A fixed chassis step makes steering, tire grip, braking, and collision
    // impulses independent of display refresh rate. At the maximum road speed
    // each step is shorter than the smallest keycap collision feature.
    if (frameStalled) {
      setCarSimulationAccumulator(simulationRef.current, 0);
      beginCarSimulationFixedStep(simulationRef.current);
    }
    accumulateCarSimulationTime(
      simulationRef.current,
      deltaSeconds,
      CAR_MAX_PHYSICS_DEBT_SECONDS,
    );
    let catchUpSteps = 0;
    while (
      simulationRef.current.accumulatorSeconds >= CAR_PHYSICS_STEP
      && catchUpSteps < CAR_MAX_CATCH_UP_STEPS
    ) {
      catchUpSteps += 1;
      beginCarSimulationFixedStep(simulationRef.current);
      stepKeycapBodies(CAR_PHYSICS_STEP);
      const wheelSurfaceMultipliers = getCarWheelSurfaceMultipliers({
        x: worldOriginRef.current.x + simulationRef.current.position.x + CAR_CANVAS_WIDTH / 2,
        y: worldOriginRef.current.y + simulationRef.current.position.y + CAR_CANVAS_HEIGHT / 2,
      },
      simulationRef.current.dynamics.chassis.heading,
      variantRef.current,
      keycapEnvironmentRef.current.gripZones,
      );
      wheelGripMultipliersRef.current = wheelSurfaceMultipliers.grip;
      wheelRollingResistanceMultipliersRef.current
        = wheelSurfaceMultipliers.rollingResistance;
      const stepCheckpoint = captureCarSimulationCheckpoint(simulationRef.current);
      const stepInitialDynamicsState = stepCheckpoint.dynamics;
      const stepStartPosition = stepCheckpoint.position;
      const passiveMotionEnergyLimitJ = throttle === 0
        ? getCarSimulationMotionEnergyJ(simulationRef.current, engineStyle)
        : null;
      const dynamicsInput = {
        deltaSeconds: CAR_PHYSICS_STEP,
        detailedDiagnostics: auditModeRef.current,
        engineRunning: mechanicalEngineRunning,
        opposingPedals,
        parking,
        reducedMotion,
        steering,
        throttle,
        wheelGripMultipliers: wheelGripMultipliersRef.current,
        wheelRollingResistanceMultipliers:
          wheelRollingResistanceMultipliersRef.current,
      };
      let dynamics = solveCarSimulationStep(
        simulationRef.current,
        engineStyle,
        dynamicsInput,
        stepInitialDynamicsState,
      );
      const stepStartCenter = {
        x: worldOriginRef.current.x + simulationRef.current.position.x + CAR_CANVAS_WIDTH / 2,
        y: worldOriginRef.current.y + simulationRef.current.position.y + CAR_CANVAS_HEIGHT / 2,
      };
      const stepStartHeading = simulationRef.current.dynamics.chassis.heading;
      let chassisOutput = dynamics.chassis;
      commitCarSimulationStep(simulationRef.current, dynamics);

      const stepEndCenter = {
          x: worldOriginRef.current.x + simulationRef.current.position.x + CAR_CANVAS_WIDTH / 2,
          y: worldOriginRef.current.y + simulationRef.current.position.y + CAR_CANVAS_HEIGHT / 2,
      };
      const sweptBarrierContact = barrierCollisionEnabledRef.current
        && rampMotionRef.current.grounded
        ? findSweptBarrierCollisions(
            stepStartCenter,
            stepEndCenter,
            stepStartHeading,
            simulationRef.current.dynamics.chassis.heading,
            variantRef.current,
            keycapEnvironmentRef.current.barriers,
          )
        : null;
      const sweptPageContact = findSweptPageBoundaryContact(
        stepStartCenter,
        stepEndCenter,
        stepStartHeading,
        simulationRef.current.dynamics.chassis.heading,
        variantRef.current,
        getCarDrivableBottomPageY(),
      );
      const earliestContactProgress = Math.min(
        sweptPageContact?.progress ?? Number.POSITIVE_INFINITY,
        sweptBarrierContact?.progress ?? Number.POSITIVE_INFINITY,
      );
      const pageContactIsFirst = sweptPageContact !== null
        && sweptPageContact.progress <= (sweptBarrierContact?.progress
          ?? Number.POSITIVE_INFINITY);
      const sweptContact = pageContactIsFirst ? sweptPageContact : sweptBarrierContact;
      let remainingCollisionStepSeconds = 0;
      if (sweptContact) {
        const impactProgress = Math.max(0, Math.min(1, sweptContact.progress));
        const impactSeconds = CAR_PHYSICS_STEP * impactProgress;
        remainingCollisionStepSeconds = CAR_PHYSICS_STEP - impactSeconds;
        if (impactSeconds >= 1 / 2000 && impactProgress < 0.99999) {
          dynamics = solveCarSimulationStep(
            simulationRef.current,
            engineStyle,
            { ...dynamicsInput, deltaSeconds: impactSeconds },
            stepInitialDynamicsState,
          );
          chassisOutput = dynamics.chassis;
          commitCarSimulationStep(simulationRef.current, dynamics, false);
        } else if (impactProgress < 0.99999) {
          restoreCarSimulationCheckpoint(simulationRef.current, stepCheckpoint);
          chassisOutput = {
            ...chassisOutput,
            displacementX: 0,
            displacementY: 0,
            state: simulationRef.current.dynamics.chassis,
          };
        }
        setCarSimulationWorldPose(
          simulationRef.current,
          {
            x: sweptContact.center.x
              - worldOriginRef.current.x - CAR_CANVAS_WIDTH / 2,
            y: sweptContact.center.y
              - worldOriginRef.current.y - CAR_CANVAS_HEIGHT / 2,
          },
          sweptContact.heading,
        );
      }
      const preContactYawRate = simulationRef.current.dynamics.chassis.yawRate;
      const preContactDrivenWheelSpeedRatio = getCarPageSpeedRatio(
        engineStyle,
        getCarDrivenWheelSpeed(simulationRef.current.dynamics.chassis, engineStyle),
      );
      const collisionEnergyBeforeJ = auditModeRef.current
        ? getCarMechanicalKineticEnergyJ(
            {
              chassis: simulationRef.current.dynamics.chassis,
              drivetrain: simulationRef.current.dynamics.drivetrain,
            },
            engineStyle,
          )
        : 0;
      const collisionMomentumBeforeKgMps = physics.massKg * Math.hypot(
        simulationRef.current.dynamics.chassis.velocityX,
        simulationRef.current.dynamics.chassis.velocityY,
      ) / physics.worldPixelsPerMeter;
      const activePageContact = sweptPageContact !== null
        && sweptPageContact.progress
          <= earliestContactProgress + CONTACT_TOI_TOLERANCE
        ? sweptPageContact
        : null;
      const collisions = sweptBarrierContact !== null
        && sweptBarrierContact.progress
          <= earliestContactProgress + CONTACT_TOI_TOLERANCE
        ? sweptBarrierContact.collisions
        : [];
      const resolvedContacts: Array<{
        contactOffset: Point;
        dynamicFriction: number;
        friction: number;
        staticFriction: number;
        normal: Point;
        collision?: BarrierCollision;
        surfaceAngularVelocity?: number;
        surfaceContactOffset?: Point;
        surfaceMassKg?: number;
        surfaceVelocity?: Point;
        surfaceYawInertiaKgM2?: number;
      }> = [];
      const contactImpulses: CarImpactContact[] = [];
      let strongestImpact: {
        material: "keycap" | "page";
        normalImpulse: number;
      } | null = null;
      const queueImpactSound = (
        material: "keycap" | "page",
        normalImpulse: number,
      ) => {
        if (
          normalImpulse >= 2
          && (strongestImpact === null
            || normalImpulse > strongestImpact.normalImpulse)
        ) {
          strongestImpact = { material, normalImpulse };
        }
      };
      const contactNow = performance.now();
      const activeContacts: Array<{
        accumulatedNormalImpulse: number;
        accumulatedTangentImpulse: number;
        collision?: BarrierCollision;
        contactOffset: Point;
        dynamicFriction?: number;
        friction: number;
        freshImpact?: boolean;
        normal: Point;
        pageKey?: "top" | "bottom";
        penetration: number;
        restitution: number;
        staticFriction?: number;
        surfaceAngularVelocity?: number;
        surfaceContactOffset?: Point;
        surfaceMassKg?: number;
        surfaceMaximumDisplacement?: number;
        surfaceMaximumRotation?: number;
        surfaceOffset?: Point;
        surfaceRotation?: number;
        surfaceVelocity?: Point;
        surfaceYawInertiaKgM2?: number;
        warmStartScale: number;
      }> = [];
      if (activePageContact) {
        activeContacts.push({
          accumulatedNormalImpulse: 0,
          accumulatedTangentImpulse: 0,
          contactOffset: activePageContact.contactOffset,
          dynamicFriction: PAGE_CONTACT_DYNAMIC_FRICTION,
          friction: PAGE_CONTACT_DYNAMIC_FRICTION,
          normal: activePageContact.normal,
          pageKey: activePageContact.key,
          penetration: activePageContact.penetration,
          restitution: 0,
          staticFriction: PAGE_CONTACT_STATIC_FRICTION,
          warmStartScale: 0,
        });
        const oppositeKey = activePageContact.key === "top" ? "bottom" : "top";
        pageContactImpulsesRef.current[oppositeKey] = { normal: 0, tangent: 0 };
      } else {
        pageContactImpulsesRef.current.top = { normal: 0, tangent: 0 };
        pageContactImpulsesRef.current.bottom = { normal: 0, tangent: 0 };
      }
      const orderedCollisions = [...collisions].sort((left, right) => {
        const normalOrder = Math.atan2(left.normal.y, left.normal.x)
          - Math.atan2(right.normal.y, right.normal.x);
        if (Math.abs(normalOrder) > 0.0001) return normalOrder;
        return left.contactOffset.x - right.contactOffset.x
          || left.contactOffset.y - right.contactOffset.y;
      });
      orderedCollisions.forEach((collision) => {
        const previousContact = barrierContactsRef.current.get(
          collision.barrier.element,
        );
        const persistentContact = previousContact !== undefined
          && contactNow - previousContact.at < 120;
        let contactNormal = collision.normal;
        let contactOffset = collision.contactOffset;
        let warmStartScale = 0;
        if (persistentContact && previousContact) {
          const normalAgreement = previousContact.normal.x * collision.normal.x
            + previousContact.normal.y * collision.normal.y;
          if (normalAgreement > 0.35) {
            // Resolve fixed keycaps from current relative velocity only. Reusing
            // the last normal impulse makes the wall kick the car outward,
            // then propulsion drives it back in as a visible oscillation.
            warmStartScale = 0;
            const blendedNormal = {
              x: previousContact.normal.x * 0.62 + collision.normal.x * 0.38,
              y: previousContact.normal.y * 0.62 + collision.normal.y * 0.38,
            };
            const normalLength = Math.hypot(blendedNormal.x, blendedNormal.y) || 1;
            contactNormal = {
              x: blendedNormal.x / normalLength,
              y: blendedNormal.y / normalLength,
            };
            contactOffset = {
              x: previousContact.contactOffset.x * 0.55
                + collision.contactOffset.x * 0.45,
              y: previousContact.contactOffset.y * 0.55
                + collision.contactOffset.y * 0.45,
            };
          }
        }
        activeContacts.push({
          accumulatedNormalImpulse: previousContact?.normalImpulse ?? 0,
          accumulatedTangentImpulse: previousContact?.tangentImpulse ?? 0,
          collision,
          contactOffset,
          dynamicFriction: KEYCAP_CONTACT_DYNAMIC_FRICTION,
          friction: KEYCAP_CONTACT_DYNAMIC_FRICTION,
          freshImpact: !persistentContact,
          normal: contactNormal,
          penetration: collision.penetration,
          restitution: 0,
          staticFriction: KEYCAP_CONTACT_STATIC_FRICTION,
          warmStartScale,
        });
      });
      activeContacts.sort((left, right) => {
        const normalOrder = Math.atan2(left.normal.y, left.normal.x)
          - Math.atan2(right.normal.y, right.normal.x);
        if (Math.abs(normalOrder) > 0.0001) return normalOrder;
        return left.contactOffset.x - right.contactOffset.x
          || left.contactOffset.y - right.contactOffset.y;
      });
      if (activeContacts.length > 0) {
        const currentCenter = {
          x: worldOriginRef.current.x + simulationRef.current.position.x
            + CAR_CANVAS_WIDTH / 2,
          y: worldOriginRef.current.y + simulationRef.current.position.y
            + CAR_CANVAS_HEIGHT / 2,
        };
        const projectedPose = projectCarContactPositionManifold(
          currentCenter,
          simulationRef.current.dynamics.chassis.heading,
          activeContacts,
          {
            massKg: physics.massKg,
            pixelsPerMeter: physics.worldPixelsPerMeter,
            yawInertiaKgM2: getCarYawInertiaKgM2(
              variantRef.current,
              physics.massKg,
            ),
            maximumAngularCorrectionRadians: activeContacts.some(
              (contact) => contact.collision !== undefined,
            ) ? 0 : undefined,
          },
        );
        setCarSimulationWorldPose(
          simulationRef.current,
          {
            x: projectedPose.center.x
              - worldOriginRef.current.x - CAR_CANVAS_WIDTH / 2,
            y: projectedPose.center.y
              - worldOriginRef.current.y - CAR_CANVAS_HEIGHT / 2,
          },
          projectedPose.heading,
        );
        const manifold = resolveCarSimulationContactManifold(
          simulationRef.current,
          activeContacts.map((contact) => ({
            normal: contact.normal,
            options: {
              accumulatedNormalImpulse: contact.accumulatedNormalImpulse,
              accumulatedTangentImpulse: contact.accumulatedTangentImpulse,
              contactOffset: contact.contactOffset,
              dynamicFriction: contact.dynamicFriction,
              friction: contact.friction,
              massKg: physics.massKg,
              pixelsPerMeter: physics.worldPixelsPerMeter,
              restitution: contact.restitution,
              staticFriction: contact.staticFriction,
              surfaceAngularVelocity: contact.surfaceAngularVelocity,
              surfaceContactOffset: contact.surfaceContactOffset,
              surfaceMassKg: contact.surfaceMassKg,
              surfaceVelocity: contact.surfaceVelocity,
              surfaceYawInertiaKgM2: contact.surfaceYawInertiaKgM2,
              warmStartScale: contact.warmStartScale,
              yawInertiaKgM2: getCarYawInertiaKgM2(
                variantRef.current,
                physics.massKg,
              ),
            },
          })),
          8,
        );
        manifold.contacts.forEach((result, index) => {
          const contact = activeContacts[index];
          const warmStartedImpulse = contact.accumulatedNormalImpulse
            * contact.warmStartScale;
          const newImpulse = Math.max(
            0,
            result.normalImpulse - warmStartedImpulse,
          );
          if (newImpulse > 0) {
            contactImpulses.push({
              contactOffset: contact.contactOffset,
              freshImpact: contact.collision
                ? contact.freshImpact
                : contact.pageKey
                  ? pageContactImpulsesRef.current[contact.pageKey].normal <= 0.0001
                  : true,
              normal: contact.normal,
              normalImpulse: newImpulse,
            });
            const freshImpact = contact.collision
              ? contact.freshImpact
              : contact.pageKey
                ? pageContactImpulsesRef.current[contact.pageKey].normal <= 0.0001
                : true;
            if (freshImpact) {
              queueImpactSound(contact.collision ? "keycap" : "page", newImpulse);
            }
          }
          if (contact.pageKey) {
            pageContactImpulsesRef.current[contact.pageKey] = {
              normal: result.normalImpulse,
              tangent: result.tangentImpulse,
            };
            resolvedContacts.push({
              contactOffset: contact.contactOffset,
              dynamicFriction: PAGE_CONTACT_DYNAMIC_FRICTION,
              friction: PAGE_CONTACT_DYNAMIC_FRICTION,
              normal: contact.normal,
              staticFriction: PAGE_CONTACT_STATIC_FRICTION,
            });
          }
          if (contact.collision) {
            barrierContactsRef.current.set(contact.collision.barrier.element, {
              at: contactNow,
              contactOffset: contact.contactOffset,
              normal: contact.normal,
              normalImpulse: result.normalImpulse,
              tangentImpulse: result.tangentImpulse,
            });
            resolvedContacts.push({
              collision: contact.collision,
              contactOffset: contact.contactOffset,
              dynamicFriction: KEYCAP_CONTACT_DYNAMIC_FRICTION,
              friction: KEYCAP_CONTACT_DYNAMIC_FRICTION,
              normal: contact.normal,
              staticFriction: KEYCAP_CONTACT_STATIC_FRICTION,
              surfaceAngularVelocity: result.surfaceAngularVelocity,
              surfaceContactOffset: contact.surfaceContactOffset,
              surfaceMassKg: contact.surfaceMassKg,
              surfaceVelocity: result.surfaceVelocity,
              surfaceYawInertiaKgM2: contact.surfaceYawInertiaKgM2,
            });
            if (newImpulse > 0 && contact.freshImpact) {
              animateBarrierImpact(contact.collision, newImpulse);
            }
          }
        });
      }

      const remainderContactConstraints = resolvedContacts.map(
        (contact) => ({ ...contact }),
      );

      if (contactImpulses.length > 0) {
        reconcileCarSimulationAfterCollision(
          simulationRef.current,
          engineStyle,
          {
            contacts: contactImpulses,
            previousDrivenWheelSpeedRatio: preContactDrivenWheelSpeedRatio,
            previousYawRate: preContactYawRate,
          },
        );
      }

      if (remainingCollisionStepSeconds >= 1 / 2000 && sweptContact) {
        const contactLossAtImpact = chassisOutput.contactConstraintLossJ;
        const remainderStartCenter = {
          x: worldOriginRef.current.x + simulationRef.current.position.x
            + CAR_CANVAS_WIDTH / 2,
          y: worldOriginRef.current.y + simulationRef.current.position.y
            + CAR_CANVAS_HEIGHT / 2,
        };
        const remainderStartHeading = simulationRef.current.dynamics.chassis.heading;
        dynamics = solveCarSimulationStep(
          simulationRef.current,
          engineStyle,
          {
            ...dynamicsInput,
            contactConstraints: remainderContactConstraints,
            deltaSeconds: remainingCollisionStepSeconds,
          },
        );
        commitCarSimulationStep(simulationRef.current, dynamics);
        const remainderEndCenter = {
          x: worldOriginRef.current.x + simulationRef.current.position.x
            + CAR_CANVAS_WIDTH / 2,
          y: worldOriginRef.current.y + simulationRef.current.position.y
            + CAR_CANVAS_HEIGHT / 2,
        };
        const firstBarrierElements = new Set(
          collisions.map((collision) => collision.barrier.element),
        );
        const secondaryBarrierContact = barrierCollisionEnabledRef.current
          && rampMotionRef.current.grounded
          ? findSweptBarrierCollisions(
              remainderStartCenter,
              remainderEndCenter,
              remainderStartHeading,
              simulationRef.current.dynamics.chassis.heading,
              variantRef.current,
              keycapEnvironmentRef.current.barriers.filter(
                (barrier) => !firstBarrierElements.has(barrier.element),
              ),
            )
          : null;
        const sweptSecondaryPageContact = findSweptPageBoundaryContact(
          remainderStartCenter,
          remainderEndCenter,
          remainderStartHeading,
          simulationRef.current.dynamics.chassis.heading,
          variantRef.current,
          getCarDrivableBottomPageY(),
        );
        const secondaryPageContact = sweptSecondaryPageContact?.key
            === activePageContact?.key
          ? null
          : sweptSecondaryPageContact;
        const secondaryPageIsFirst = secondaryPageContact !== null
          && secondaryPageContact.progress <= (
            secondaryBarrierContact?.progress ?? Number.POSITIVE_INFINITY
          );
        const secondaryContact = secondaryPageIsFirst
          ? secondaryPageContact
          : secondaryBarrierContact;
        if (secondaryContact) {
          setCarSimulationWorldPose(
            simulationRef.current,
            {
              x: secondaryContact.center.x
                - worldOriginRef.current.x - CAR_CANVAS_WIDTH / 2,
              y: secondaryContact.center.y
                - worldOriginRef.current.y - CAR_CANVAS_HEIGHT / 2,
            },
            secondaryContact.heading,
          );
          const secondaryContacts = secondaryPageIsFirst
            ? [{
                normal: (secondaryPageContact as PageBoundaryContact).normal,
                options: {
                  contactOffset: (secondaryPageContact as PageBoundaryContact)
                    .contactOffset,
                  dynamicFriction: PAGE_CONTACT_DYNAMIC_FRICTION,
                  friction: PAGE_CONTACT_DYNAMIC_FRICTION,
                  massKg: physics.massKg,
                  pixelsPerMeter: physics.worldPixelsPerMeter,
                  restitution: 0,
                  staticFriction: PAGE_CONTACT_STATIC_FRICTION,
                  yawInertiaKgM2: getCarYawInertiaKgM2(
                    variantRef.current,
                    physics.massKg,
                  ),
                },
              }]
            : (secondaryBarrierContact?.collisions ?? []).map((collision) => ({
                normal: collision.normal,
                options: {
                  contactOffset: collision.contactOffset,
                  dynamicFriction: KEYCAP_CONTACT_DYNAMIC_FRICTION,
                  friction: KEYCAP_CONTACT_DYNAMIC_FRICTION,
                  massKg: physics.massKg,
                  pixelsPerMeter: physics.worldPixelsPerMeter,
                  restitution: 0,
                  staticFriction: KEYCAP_CONTACT_STATIC_FRICTION,
                  yawInertiaKgM2: getCarYawInertiaKgM2(
                    variantRef.current,
                    physics.massKg,
                  ),
                },
              }));
          const secondaryManifold = resolveCarSimulationContactManifold(
            simulationRef.current,
            secondaryContacts,
            6,
          );
          const secondaryImpacts = secondaryManifold.contacts.flatMap(
            (contact, index) => contact.normalImpulse > 0
              ? [{
                  contactOffset: secondaryContacts[index].options.contactOffset,
                  freshImpact: true,
                  normal: secondaryContacts[index].normal,
                  normalImpulse: contact.normalImpulse,
                }]
              : [],
          );
          contactImpulses.push(...secondaryImpacts);
          secondaryImpacts.forEach((impact) => {
            queueImpactSound(secondaryPageIsFirst ? "page" : "keycap", impact.normalImpulse);
          });
          if (secondaryImpacts.length > 0) {
            reconcileCarSimulationAfterCollision(
              simulationRef.current,
              engineStyle,
              {
                contacts: secondaryImpacts,
                previousDrivenWheelSpeedRatio: getCarPageSpeedRatio(
                  engineStyle,
                  getCarDrivenWheelSpeed(dynamics.chassis.state, engineStyle),
                ),
                previousYawRate: dynamics.chassis.state.yawRate,
              },
            );
          }
        }
        chassisOutput = {
          ...dynamics.chassis,
          contactConstraintLossJ: contactLossAtImpact
            + dynamics.chassis.contactConstraintLossJ,
          displacementX: simulationRef.current.position.x - stepStartPosition.x,
          displacementY: simulationRef.current.position.y - stepStartPosition.y,
        };
      }

      if (passiveMotionEnergyLimitJ !== null) {
        constrainCarSimulationPassiveMotion(
          simulationRef.current,
          engineStyle,
          passiveMotionEnergyLimitJ,
        );
      }

      if (auditModeRef.current) {
        const collisionEnergyAfterJ = getCarMechanicalKineticEnergyJ(
          {
            chassis: simulationRef.current.dynamics.chassis,
            drivetrain: simulationRef.current.dynamics.drivetrain,
          },
          engineStyle,
        );
        const collisionMomentumAfterKgMps = physics.massKg * Math.hypot(
          simulationRef.current.dynamics.chassis.velocityX,
          simulationRef.current.dynamics.chassis.velocityY,
        ) / physics.worldPixelsPerMeter;
        updateCarManeuverAudit(
          maneuverAuditRef.current,
          engineStyle,
          {
            chassis: simulationRef.current.dynamics.chassis,
            collisionEnergyGainJ: Math.max(
              0,
              collisionEnergyAfterJ - collisionEnergyBeforeJ,
            ),
            collisionEnergyLossJ: Math.max(
              0,
              collisionEnergyBeforeJ - collisionEnergyAfterJ,
            ),
            collisionImpulseNewtonsSeconds: contactImpulses.reduce(
              (total, contact) => total + contact.normalImpulse,
              0,
            ),
            collisionMomentumBeforeKgMps,
            collisionMomentumAfterKgMps,
            deltaSeconds: CAR_PHYSICS_STEP,
            displacementX: chassisOutput.displacementX,
            displacementY: chassisOutput.displacementY,
            drivetrain: simulationRef.current.drivetrainOutput,
            serviceBraking: chassisOutput.serviceBraking,
            steering,
            throttle,
          },
        );
      }
      if (strongestImpact) playCarImpactSound(strongestImpact);
      completeCarSimulationFixedStep(
        simulationRef.current,
        CAR_PHYSICS_STEP,
      );
    }
    const heldAtRest = simulationRef.current.dynamics.chassis.restState === "held"
      && throttle === 0;
    if (heldAtRest) {
      holdCarSimulationPose(simulationRef.current);
    }
    const verticalVelocity = heldAtRest
      ? 0
      : (simulationRef.current.position.y - initialY) / deltaSeconds;
    const horizontalVelocity = heldAtRest
      ? 0
      : (simulationRef.current.position.x - initialX) / deltaSeconds;
    lastVerticalVelocityRef.current = verticalVelocity;
    placeVehicle(
      deltaSeconds,
      verticalVelocity,
      horizontalVelocity,
      heldAtRest
        ? 1
        : Math.min(1, simulationRef.current.accumulatorSeconds / CAR_PHYSICS_STEP),
    );

    // Synchronize the sound to the speed produced by this physics frame. The
    // former pre-physics update made an abrupt brake or collision audible one
    // frame late, then compounded that delay with the engine's RPM smoothing.
    const synchronizedSpeed = getCarSimulationSpeed(simulationRef.current);
    const rampMotion = CAR_RAMPS_ENABLED
      ? updateCarRampMotion(rampMotionRef.current, {
        center: {
          x: worldOriginRef.current.x + simulationRef.current.position.x
            + CAR_CANVAS_WIDTH / 2,
          y: worldOriginRef.current.y + simulationRef.current.position.y
            + CAR_CANVAS_HEIGHT / 2,
        },
        deltaSeconds,
        heading: simulationRef.current.dynamics.chassis.heading,
        ramps: rampsRef.current,
        speed: synchronizedSpeed,
        variant: variantRef.current,
      })
      : rampMotionRef.current;
    engineRef.current?.setDrive(
      getCarPageSpeedRatio(engineStyle, synchronizedSpeed),
      simulationRef.current.drivetrainOutput?.load ?? simulationRef.current.dynamics.drivetrain.engineLoad,
      simulationRef.current.dynamics.chassis.steeringAngle / physics.maximumSteeringAngle,
      opposingPedals,
      simulationRef.current.dynamics.chassis.tireSlip,
      simulationRef.current.dynamics.chassis.driveDirection,
      simulationRef.current.drivetrainOutput ?? undefined,
      getCarTireAudioInput(simulationRef.current.dynamics.chassis),
    );

    const scene = sceneRef.current;
    const visualBrakeIntensity = clamp(
      simulationRef.current.dynamics.chassis.brakePressure * (
        0.91 + Math.sin(time * 0.075)
          * simulationRef.current.dynamics.chassis.absActivity * 0.09
      ),
      0,
      1,
    );
    const visualReverseIntensity = simulationRef.current.dynamics.chassis.driveDirection < 0
      && simulationRef.current.dynamics.chassis.brakePressure < 0.08 ? 1 : 0;
    if (vehicleRef.current) {
      vehicleRef.current.dataset.brakeIntensity = visualBrakeIntensity.toFixed(3);
      vehicleRef.current.dataset.absActive = simulationRef.current.dynamics.chassis.absActivity > 0.02
        ? "true"
        : "false";
      vehicleRef.current.dataset.engineDragActive =
        simulationRef.current.dynamics.chassis.engineDragControlActivity > 0.02 ? "true" : "false";
      vehicleRef.current.dataset.reverseActive = visualReverseIntensity > 0
        ? "true"
        : "false";
    }
    if (scene) {
      const presentation = getCarSimulationPresentation(simulationRef.current);
      const wheelSuspension = {
        frontLeft: presentation.frontLeftSuspensionTravel,
        frontRight: presentation.frontRightSuspensionTravel,
        rearLeft: presentation.rearLeftSuspensionTravel,
        rearRight: presentation.rearRightSuspensionTravel,
      };
      if (vehicleRef.current) {
        vehicleRef.current.dataset.suspensionTravel = [
          wheelSuspension.frontLeft,
          wheelSuspension.frontRight,
          wheelSuspension.rearLeft,
          wheelSuspension.rearRight,
        ].map((travel) => travel.toFixed(3)).join(",");
      }
      const visualHeading = simulationRef.current.poses.rendered.heading;
      const yawDifference = wrapYaw(visualHeading - renderedYawRef.current);
      if (Math.abs(yawDifference) > 0.0005) {
        renderedYawRef.current = visualHeading;
      }
      frontLeftWheelRotationRef.current += getCarWheelRotationDelta(
        simulationRef.current.dynamics.chassis.frontLeftWheelSpeed,
        physics.wheelRadiusM,
        deltaSeconds,
        physics.worldPixelsPerMeter,
      );
      frontRightWheelRotationRef.current += getCarWheelRotationDelta(
        simulationRef.current.dynamics.chassis.frontRightWheelSpeed,
        physics.wheelRadiusM,
        deltaSeconds,
        physics.worldPixelsPerMeter,
      );
      rearLeftWheelRotationRef.current += getCarWheelRotationDelta(
        simulationRef.current.dynamics.chassis.rearLeftWheelSpeed,
        physics.wheelRadiusM,
        deltaSeconds,
        physics.worldPixelsPerMeter,
      );
      rearRightWheelRotationRef.current += getCarWheelRotationDelta(
        simulationRef.current.dynamics.chassis.rearRightWheelSpeed,
        physics.wheelRadiusM,
        deltaSeconds,
        physics.worldPixelsPerMeter,
      );
      frontWheelRotationRef.current = (
        frontLeftWheelRotationRef.current + frontRightWheelRotationRef.current
      ) / 2;
      rearWheelRotationRef.current = (
        rearLeftWheelRotationRef.current + rearRightWheelRotationRef.current
      ) / 2;
      wheelRotationRef.current = (
        frontWheelRotationRef.current + rearWheelRotationRef.current
      ) / 2;
      scene.setPose({
        brake: visualBrakeIntensity,
        reverse: visualReverseIntensity,
        frontLeftSuspensionTravel: wheelSuspension.frontLeft,
        frontRightSuspensionTravel: wheelSuspension.frontRight,
        heave: rampMotion.heave,
        pitch: presentation.pitch + rampMotion.pitch,
        frontLeftWheelRotation: frontLeftWheelRotationRef.current,
        frontRightWheelRotation: frontRightWheelRotationRef.current,
        frontWheelRotation: frontWheelRotationRef.current,
        rearLeftWheelRotation: rearLeftWheelRotationRef.current,
        rearLeftSuspensionTravel: wheelSuspension.rearLeft,
        rearRightWheelRotation: rearRightWheelRotationRef.current,
        rearRightSuspensionTravel: wheelSuspension.rearRight,
        rearWheelRotation: rearWheelRotationRef.current,
        roll: presentation.roll + rampMotion.roll,
        steering: presentation.steering,
        wheelRotation: wheelRotationRef.current,
        yaw: renderedYawRef.current,
      });
    }
    const nextSpeed = getCarSimulationSpeed(simulationRef.current);

    if (
      parking
      && Math.abs(nextSpeed) <= 1
      && parkingSettleTimerRef.current === null
    ) {
      resetCarSimulationRuntime(
        simulationRef.current,
        getCarEngineStyle(variantRef.current),
        simulationRef.current.dynamics.chassis.heading,
      );
      engineRef.current?.setDrive(0, 0, 0);
      // The drivetrain is already at rest here. Begin fuel cut immediately;
      // the shutdown recording owns the remaining mechanical rundown.
      finishParkingRef.current();
    }

    if (
      parking
      ||
      pressed.size
      || Math.abs(nextSpeed) > 1
      || Math.abs(simulationRef.current.dynamics.chassis.steeringAngle) > 0.002
      || Math.abs(simulationRef.current.dynamics.chassis.yawRate) > 0.002
      || Math.abs(cameraRef.current.velocity) > 1
      || cameraRef.current.mode !== "idle"
      || keycapEnvironmentRef.current.active
      || rampMotionRef.current.active
    ) {
      runtimeRef.current.frame = requestAnimationFrame(animate);
    }
  }, [
    animateBarrierImpact,
    driving,
    placeVehicle,
    reducedMotion,
    refreshKeycapBarriers,
    requestDriveEngine,
    sceneRef,
    stepKeycapBodies,
    variant,
  ]);

  const wake = useCallback(() => {
    if (runtimeRef.current.frame !== null) return;
    resetCarRuntimeClock(runtimeRef.current);
    runtimeRef.current.frame = requestAnimationFrame(animate);
  }, [animate]);
  runtimeRef.current.wake = wake;

  const focusCar = useCallback(() => {
    clearCarRuntimeInput(runtimeRef.current);
    suppressHeldCarControlsUntilRelease();
    setCarFocused(true);
    // Focusing arms the controls but must not move the viewport. The first
    // actual direction input resumes the racing camera.
    resetCarCameraState(cameraRef.current, {
      following: false,
      journeyStarted: Math.abs(getCarSimulationSpeed(simulationRef.current)) > 50,
      scrollY: window.scrollY,
      suppressed: true,
    });
    void resumeSecretAudio();
    wake();
  }, [wake]);

  const releaseCarFocus = useCallback(() => {
    setCarFocused(false);
    resetCarCameraState(cameraRef.current, {
      following: false,
      scrollY: window.scrollY,
      suppressed: true,
    });
    clearCarRuntimeInput(runtimeRef.current);
    clearHeldCarControls();
    stopCarHorn();
    setHonking(false);
    const selectedStyle = getCarEngineStyle(variant);
    engineRef.current?.setDrive(
      getCarPageSpeedRatio(selectedStyle, getCarSimulationSpeed(simulationRef.current)),
      0,
      0,
    );
    wake();
  }, [variant, wake]);

  const resumeCameraFollow = useCallback(() => {
    if (!cameraRef.current.suppressed) return;
    resetCarCameraState(cameraRef.current, {
      following: true,
      journeyStarted: Math.abs(getCarSimulationSpeed(simulationRef.current)) > 50,
      scrollY: window.scrollY,
      suppressed: false,
    });
  }, []);

  const yieldCameraToUser = useCallback(() => {
    resetCarCameraState(cameraRef.current, {
      following: false,
      scrollY: window.scrollY,
      suppressed: true,
    });
  }, []);

  useEffect(() => {
    if (!driving || !carFocused) return;
    return subscribeHeldCarControls((held) => {
      const hadKeyboardInput = runtimeRef.current.keyboardControls.size > 0;
      const nextKeyboardInput = new Set(held);
      runtimeRef.current.keyboardControls = nextKeyboardInput;
      if (
        cameraRef.current.suppressed
        && !hadKeyboardInput
        && nextKeyboardInput.size > 0
      ) {
        resumeCameraFollow();
      }
      runtimeRef.current.appliedControls = new Set(held);
      if (held.size > 0) void resumeSecretAudio();
      wake();
    });
  }, [carFocused, driving, resumeCameraFollow, wake]);

  useEffect(() => {
    if (!driving) return;
    const isCarTarget = (target: EventTarget | null) => {
      const node = target instanceof Node ? target : null;
      return Boolean(node && vehicleRef.current?.contains(node));
    };
    const handlePointerFocus = (event: PointerEvent) => {
      if (isCarTarget(event.target)) focusCar();
      else releaseCarFocus();
    };
    document.addEventListener("pointerdown", handlePointerFocus, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerFocus, true);
    };
  }, [driving, focusCar, releaseCarFocus]);

  useEffect(() => {
    if (!driving) return;
    const handleUserScrollIntent = () => yieldCameraToUser();
    let spatialFrame: number | null = null;
    const handleSpatialScroll = () => {
      if (spatialFrame !== null) return;
      spatialFrame = requestAnimationFrame(() => {
        spatialFrame = null;
        // Native scroll anchoring can materialize a content-visibility section
        // above the parked/stopped car and move this component's DOM anchor.
        // While the camera has yielded to the user, reconcile that anchor
        // shift even if the physics RAF is asleep so the car keeps its world
        // position and moves through the viewport exactly with native scroll.
        if (!cameraRef.current.following) placeVehicle();
        else syncCarAudioPosition();
      });
    };
    const handleScrollKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("button, input, select, textarea")) return;
      if (["PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
        yieldCameraToUser();
      }
    };
    const handleScrollbarPointer = (event: PointerEvent) => {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0 && event.clientX >= document.documentElement.clientWidth) {
        yieldCameraToUser();
      }
    };
    window.addEventListener("wheel", handleUserScrollIntent, { passive: true });
    window.addEventListener("touchmove", handleUserScrollIntent, { passive: true });
    window.addEventListener("keydown", handleScrollKey);
    window.addEventListener("pointerdown", handleScrollbarPointer, { passive: true });
    window.addEventListener("scroll", handleSpatialScroll, { passive: true });
    return () => {
      if (spatialFrame !== null) cancelAnimationFrame(spatialFrame);
      window.removeEventListener("wheel", handleUserScrollIntent);
      window.removeEventListener("touchmove", handleUserScrollIntent);
      window.removeEventListener("keydown", handleScrollKey);
      window.removeEventListener("pointerdown", handleScrollbarPointer);
      window.removeEventListener("scroll", handleSpatialScroll);
    };
  }, [driving, placeVehicle, syncCarAudioPosition, yieldCameraToUser]);

  useEffect(() => () => {
    if (runtimeRef.current.frame !== null) cancelAnimationFrame(runtimeRef.current.frame);
    if (arrivalTaskRef.current !== null) {
      window.clearTimeout(arrivalTaskRef.current);
      arrivalTaskRef.current = null;
    }
    if (routeRecoveryTimerRef.current !== null) {
      window.clearTimeout(routeRecoveryTimerRef.current);
      routeRecoveryTimerRef.current = null;
    }
    if (parkingSettleTimerRef.current !== null) {
      window.clearTimeout(parkingSettleTimerRef.current);
      parkingSettleTimerRef.current = null;
    }
    engineRequestedRef.current = false;
    engineRequestIdRef.current += 1;
    engineRequestPendingRef.current = false;
    engineRetryAtRef.current = 0;
    engineRef.current?.stop();
    engineRef.current = null;
    // If no destination adopted a route-held engine, teardown must retire it.
    // A destination that already acquired a new lease makes this stale stop
    // a no-op, preserving seamless audio on successful handoffs.
    getCarRouteEngine(routeLifecycleRef.current)?.stop();
    invalidateCarRouteLifecycle(routeLifecycleRef.current);
    stopCarHorn();
    keycapEnvironmentRef.current.reset();
  }, []);

  useEffect(() => {
    if (leftExitHref) void router.prefetch(leftExitHref);
    if (rightExitHref) void router.prefetch(rightExitHref);
  }, [leftExitHref, rightExitHref, router]);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (!document.hidden) {
        if (engineRef.current) void resumeSecretAudio();
        return;
      }
      clearCarRuntimeInput(runtimeRef.current);
      clearHeldCarControls();
      resetCarSimulationRuntime(
        simulationRef.current,
        getCarEngineStyle(variantRef.current),
        simulationRef.current.dynamics.chassis.heading,
      );
      cameraRef.current.mode = "idle";
      cameraRef.current.velocity = 0;
      cameraRef.current.scrollY = window.scrollY;
      cameraRef.current.direction = 0;
      cameraRef.current.targetScreenY = null;
      cameraRef.current.journeyStarted = false;
      cameraRef.current.intentDirection = 0;
      cameraRef.current.intentSeconds = 0;
      engineRef.current?.setDrive(0, 0);
      stopCarHorn();
      setHonking(false);
      if (runtimeRef.current.frame !== null) cancelAnimationFrame(runtimeRef.current.frame);
      runtimeRef.current.frame = null;
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => document.removeEventListener("visibilitychange", stopWhenHidden);
  }, []);

  useEffect(() => {
    if (!driving) return;
    let layoutTrackingActive = true;
    let firstLayoutFrame: number | null = null;
    let secondLayoutFrame: number | null = null;
    const refreshAfterLayout = () => {
      if (!layoutTrackingActive) return;
      if (firstLayoutFrame !== null) cancelAnimationFrame(firstLayoutFrame);
      if (secondLayoutFrame !== null) cancelAnimationFrame(secondLayoutFrame);
      firstLayoutFrame = requestAnimationFrame(() => {
        firstLayoutFrame = null;
        refreshKeycapBarriers();
        secondLayoutFrame = requestAnimationFrame(() => {
          secondLayoutFrame = null;
          refreshKeycapBarriers();
        });
      });
    };
    const onResize = () => {
      placeVehicle();
      refreshAfterLayout();
    };
    const layoutObserver = typeof PerformanceObserver === "undefined"
      ? null
      : new PerformanceObserver((entries) => {
        if (entries.getEntries().some((entry) => entry.entryType === "layout-shift")) {
          refreshAfterLayout();
        }
      });
    try {
      layoutObserver?.observe({ type: "layout-shift", buffered: false });
    } catch {
      layoutObserver?.disconnect();
    }
    void document.fonts?.ready.then(refreshAfterLayout);
    window.addEventListener("resize", onResize);
    return () => {
      layoutTrackingActive = false;
      if (firstLayoutFrame !== null) cancelAnimationFrame(firstLayoutFrame);
      if (secondLayoutFrame !== null) cancelAnimationFrame(secondLayoutFrame);
      layoutObserver?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [driving, placeVehicle, refreshKeycapBarriers]);

  const startDriving = useCallback((transfer?: CarRouteTransfer) => {
    const vehicle = vehicleRef.current;
    const root = rootRef.current;
    if (!vehicle || !root) return;
    parkingRef.current = false;
    resetCarRampMotion(rampMotionRef.current);
    routeEdgePhaseRef.current = "inside";
    barrierContactsRef.current = new WeakMap();
    pageContactImpulsesRef.current = {
      bottom: { normal: 0, tangent: 0 },
      top: { normal: 0, tangent: 0 },
    };
    parkingShutdownEndsAtRef.current = 0;
    if (parkingSettleTimerRef.current !== null) {
      window.clearTimeout(parkingSettleTimerRef.current);
      parkingSettleTimerRef.current = null;
    }
    setParking(false);
    if (routeRecoveryTimerRef.current !== null) {
      window.clearTimeout(routeRecoveryTimerRef.current);
      routeRecoveryTimerRef.current = null;
    }
    if (arrivalTaskRef.current !== null) {
      window.clearTimeout(arrivalTaskRef.current);
      arrivalTaskRef.current = null;
    }
    // A dynamic project route may retain this component while replacing the
    // page around it. Retire the departing page's animation handle explicitly;
    // otherwise a no-longer-deliverable RAF id can make `wake` believe the
    // transferred car is still advancing even though its position is frozen.
    if (runtimeRef.current.frame !== null) {
      cancelAnimationFrame(runtimeRef.current.frame);
      runtimeRef.current.frame = null;
    }
    resetCarRuntimeClock(runtimeRef.current);
    const arrivalId = beginCarRouteArrival(
      routeLifecycleRef.current,
      Boolean(transfer),
    );
    if (transfer?.calibration) {
      maneuverAuditRef.current = {
        ...createCarManeuverAudit(),
        ...transfer.calibration,
        maximumSuspensionCompression:
          [...transfer.calibration.maximumSuspensionCompression],
        maximumWheelLoadNewtons: [...transfer.calibration.maximumWheelLoadNewtons],
        minimumSuspensionCompression:
          [...transfer.calibration.minimumSuspensionCompression],
        minimumWheelLoadNewtons: [...transfer.calibration.minimumWheelLoadNewtons],
        peakEngineDragControlActivityByWheel:
          [...transfer.calibration.peakEngineDragControlActivityByWheel],
        peakSuspensionVelocity: [...transfer.calibration.peakSuspensionVelocity],
        peakTractionControlActivityByWheel:
          [...transfer.calibration.peakTractionControlActivityByWheel],
      };
    }
    // `beginCarRouteArrival` invalidated callbacks from the departing page.
    // Dynamic case-study routes can retain this component across the swap.
    const vehicleRect = vehicle.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const retainedRouteEngine = transfer
      ? getCarRouteEngine(routeLifecycleRef.current)
      : null;
    worldOriginRef.current = {
      x: rootRect.left + window.scrollX,
      y: rootRect.top + window.scrollY,
    };
    if (transfer) selectVariant(transfer.variant);
    let startPosition = { ...simulationRef.current.position };
    if (transfer) {
      const entryCenterScreenX = transfer.entryEdge === "left"
        ? -CAR_EXIT_MARGIN + 2
        : document.documentElement.clientWidth + CAR_EXIT_MARGIN - 2;
      const entryCenterScreenY = Math.max(
        CAR_CENTER_TOP,
        Math.min(window.innerHeight - CAR_CANVAS_HEIGHT / 2, transfer.screenY),
      );
      const progressStart = CAR_CENTER_TOP;
      const verticalProgress = Math.max(0, Math.min(1, transfer.verticalProgress));
      let destinationCenterPageY = progressStart;
      let previousDocumentHeight = -1;
      // Scrolling can materialize content-visibility sections and replace
      // their intrinsic estimates. Resolve that layout synchronously before
      // exposing the arriving car instead of chasing the changing height for
      // several visible frames afterward.
      for (let pass = 0; pass < 5; pass += 1) {
        const documentHeight = document.documentElement.scrollHeight;
        const progressEnd = Math.max(
          progressStart,
          getCarDrivableBottomPageY() - CAR_MINIMUM_VERTICAL_HULL_SUPPORT,
        );
        destinationCenterPageY = progressStart
          + verticalProgress * (progressEnd - progressStart);
        const maximumScrollY = Math.max(0, documentHeight - window.innerHeight);
        scrollInstantly(Math.max(0, Math.min(
          maximumScrollY,
          destinationCenterPageY - entryCenterScreenY,
        )));
        document.documentElement.getBoundingClientRect();
        if (Math.abs(documentHeight - previousDocumentHeight) < 1) break;
        previousDocumentHeight = documentHeight;
      }
      startPosition = {
        x: window.scrollX + entryCenterScreenX
          - worldOriginRef.current.x
          - CAR_CANVAS_WIDTH / 2,
        y: destinationCenterPageY - worldOriginRef.current.y - CAR_CANVAS_HEIGHT / 2,
      };
      // The synchronous layout passes establish the destination once. From
      // this point the car owns its world position; late document-height
      // changes must not repeatedly remap it by percentage and tug it around.
      // Rearm spatially once the car has genuinely entered this page. A quick
      // deliberate turnaround can also rearm after sustained outward travel,
      // which supports natural forward/reverse backtracking without loops.
      routeArrivalGuardRef.current = {
        entryEdge: transfer.entryEdge,
        minimumSecondsRemaining: ROUTE_MINIMUM_ARRIVAL_GUARD_SECONDS,
        outwardIntentSeconds: 0,
      };
      routeExitUnlockAtRef.current = 0;
    } else {
      routeArrivalGuardRef.current = null;
      routeExitUnlockAtRef.current = 0;
      startPosition = {
        x: vehicleRect.left - rootRect.left,
        y: vehicleRect.top - rootRect.top,
      };
    }
    // Apply the world-positioning mode before writing its local transform.
    // React will reconcile the same class from state, but this prevents an
    // intermediate frame from interpreting driving coordinates against the
    // parked right-aligned positioning rule.
    vehicle.classList.add(styles.carDriving);
    // The parked illustration already has an intentional three-quarter yaw.
    // Adopt that exact rendered orientation as the physical heading instead
    // of snapping the model to an unrelated straight-ahead default.
    const transferredStyle = getCarEngineStyle(transfer?.variant ?? variant);
    const transferredHeading = wrapYaw(transfer?.heading ?? renderedYawRef.current);
    const boundedTransferredSpeed = Math.max(
      -getCarMaximumPageSpeed(transferredStyle, -1),
      Math.min(getCarMaximumPageSpeed(transferredStyle, 1), transfer?.speed ?? 0),
    );
    const transferredChassis = transfer?.chassis
      ? {
          ...createCarChassisState(transferredHeading, boundedTransferredSpeed),
          ...transfer.chassis,
          heading: transferredHeading,
        }
      : createCarChassisState(transferredHeading, boundedTransferredSpeed);
    hydrateCarSimulationRuntime(
      simulationRef.current,
      {
        chassis: transferredChassis,
        drivetrain: transfer?.drivetrain
          ? { ...transfer.drivetrain }
          : createCarDrivetrainState(transferredStyle),
        drivetrainOutput: transfer?.drivetrainOutput ?? null,
        position: startPosition,
      },
    );
    wheelRotationRef.current = transfer?.visual?.wheelRotation ?? 0;
    frontWheelRotationRef.current = transfer?.visual?.frontWheelRotation
      ?? wheelRotationRef.current;
    rearWheelRotationRef.current = transfer?.visual?.rearWheelRotation
      ?? wheelRotationRef.current;
    frontLeftWheelRotationRef.current = transfer?.visual?.frontLeftWheelRotation
      ?? frontWheelRotationRef.current;
    frontRightWheelRotationRef.current = transfer?.visual?.frontRightWheelRotation
      ?? frontWheelRotationRef.current;
    rearLeftWheelRotationRef.current = transfer?.visual?.rearLeftWheelRotation
      ?? rearWheelRotationRef.current;
    rearRightWheelRotationRef.current = transfer?.visual?.rearRightWheelRotation
      ?? rearWheelRotationRef.current;
    renderVehicleScreenPosition(simulationRef.current.poses.rendered);
    syncCarAudioPosition();
    if (transfer) {
      const heldControls = new Set(readHeldCarControls());
      runtimeRef.current.keyboardControls = heldControls;
      runtimeRef.current.appliedControls = new Set(heldControls);
    } else {
      clearHeldCarControls();
      clearCarRuntimeInput(runtimeRef.current);
    }
    const scene = sceneRef.current;
    const arrivalPresentation = getCarSimulationPresentation(simulationRef.current);
    scene?.setYaw(simulationRef.current.dynamics.chassis.heading);
    scene?.setDynamics({
      ...arrivalPresentation,
      frontLeftWheelRotation: frontLeftWheelRotationRef.current,
      frontRightWheelRotation: frontRightWheelRotationRef.current,
      frontWheelRotation: frontWheelRotationRef.current,
      rearLeftWheelRotation: rearLeftWheelRotationRef.current,
      rearRightWheelRotation: rearRightWheelRotationRef.current,
      rearWheelRotation: rearWheelRotationRef.current,
      wheelRotation: wheelRotationRef.current,
    });
    renderedYawRef.current = simulationRef.current.dynamics.chassis.heading;
    resetCarCameraState(cameraRef.current, {
      following: Boolean(transfer),
      journeyStarted: Math.abs(getCarSimulationSpeed(simulationRef.current)) > 50,
      scrollY: window.scrollY,
      suppressed: !transfer,
    });
    keycapEnvironmentRef.current.reset();
    barrierCollisionEnabledRef.current = true;
    routeNavigationEnabledRef.current = true;
    engineRequestedRef.current = true;
    engineRequestPendingRef.current = false;
    engineRetryAtRef.current = 0;
    mechanicalEngineRunningRef.current = Boolean(transfer);
    mechanicalEngineReadyAtRef.current = transfer
      ? 0
      : performance.now() + 1_120;
    if (retainedRouteEngine?.isActive()) {
      retainedRouteEngine.cancelHandoff();
      releaseCarRouteEngine(routeLifecycleRef.current);
      engineRef.current = retainedRouteEngine;
      const steering = Number(runtimeRef.current.appliedControls.has("right"))
        - Number(runtimeRef.current.appliedControls.has("left"));
      retainedRouteEngine.setDrive(
          getCarPageSpeedRatio(transferredStyle, getCarSimulationSpeed(simulationRef.current)),
        simulationRef.current.drivetrainOutput?.load
          ?? simulationRef.current.dynamics.drivetrain.engineLoad,
        steering,
        simulationRef.current.dynamics.chassis.brakePressure > 0.08,
        simulationRef.current.dynamics.chassis.tireSlip,
        simulationRef.current.dynamics.chassis.driveDirection,
        simulationRef.current.drivetrainOutput ?? undefined,
        getCarTireAudioInput(simulationRef.current.dynamics.chassis),
      );
    } else {
      releaseCarRouteEngine(routeLifecycleRef.current);
      requestDriveEngine(!transfer);
    }
    setCarFocused(true);
    setDriving(true);
    const finishArrival = () => {
      arrivalTaskRef.current = null;
      if (!isCarRouteSequenceCurrent(routeLifecycleRef.current, arrivalId)) return;
      placeVehicle();
      refreshKeycapBarriers();
      // Route layout is not elapsed simulation time. The complete drivetrain
      // state remains suspended until arrival is ready, then resumes coherently.
      if (transfer) {
        routePageDwellSecondsRef.current = ROUTE_MINIMUM_PAGE_DWELL_SECONDS;
        if (routeArrivalGuardRef.current) {
          routeArrivalGuardRef.current.minimumSecondsRemaining
            = ROUTE_MINIMUM_ARRIVAL_GUARD_SECONDS;
        }
      } else {
        routePageDwellSecondsRef.current = 0;
      }
      // Position and page-height reconciliation are complete. Only now expose
      // the transferred speed and allow the fixed-step loop to advance it.
      completeCarRouteArrival(routeLifecycleRef.current);
      // A retained project-page car is already in the `driving` state. Wake
      // it explicitly because no state transition is guaranteed to rerun the
      // normal driving effect after a rapid route reversal.
      runtimeRef.current.wake();
    };
    if (transfer) {
      let previousHeight = -1;
      let stablePasses = 0;
      let pass = 0;
      const settleTransferredLayout = () => {
        arrivalTaskRef.current = null;
        if (!isCarRouteSequenceCurrent(routeLifecycleRef.current, arrivalId)) return;
        const documentHeight = document.documentElement.scrollHeight;
        const progressStart = CAR_CENTER_TOP;
        const progressEnd = Math.max(
          progressStart,
          getCarDrivableBottomPageY() - CAR_MINIMUM_VERTICAL_HULL_SUPPORT,
        );
        const destinationCenterPageY = progressStart
          + Math.max(0, Math.min(1, transfer.verticalProgress))
            * (progressEnd - progressStart);
        const entryCenterScreenY = Math.max(
          CAR_CENTER_TOP,
          Math.min(window.innerHeight - CAR_CANVAS_HEIGHT / 2, transfer.screenY),
        );
        const maximumScrollY = Math.max(0, documentHeight - window.innerHeight);
        scrollInstantly(Math.max(0, Math.min(
          maximumScrollY,
          destinationCenterPageY - entryCenterScreenY,
        )));
        const settledRootRect = root.getBoundingClientRect();
        worldOriginRef.current = {
          x: settledRootRect.left + window.scrollX,
          y: settledRootRect.top + window.scrollY,
        };
        const entryCenterScreenX = transfer.entryEdge === "left"
          ? -CAR_EXIT_MARGIN + 2
          : document.documentElement.clientWidth + CAR_EXIT_MARGIN - 2;
        setCarSimulationWorldPose(
          simulationRef.current,
          {
            x: window.scrollX + entryCenterScreenX
              - worldOriginRef.current.x - CAR_CANVAS_WIDTH / 2,
            y: destinationCenterPageY
              - worldOriginRef.current.y - CAR_CANVAS_HEIGHT / 2,
          },
          simulationRef.current.dynamics.chassis.heading,
          true,
        );
        renderVehicleScreenPosition(simulationRef.current.poses.rendered);
        syncCarAudioPosition();
        stablePasses = Math.abs(documentHeight - previousHeight) < 1
          ? stablePasses + 1
          : 0;
        previousHeight = documentHeight;
        pass += 1;
        if (stablePasses >= 2 || pass >= 10) {
          finishArrival();
          return;
        }
        arrivalTaskRef.current = window.setTimeout(settleTransferredLayout, 16);
      };
      arrivalTaskRef.current = window.setTimeout(settleTransferredLayout, 0);
    } else {
      arrivalTaskRef.current = window.setTimeout(finishArrival, 0);
    }
  }, [
    placeVehicle,
    refreshKeycapBarriers,
    renderVehicleScreenPosition,
    requestDriveEngine,
    sceneRef,
    selectVariant,
    syncCarAudioPosition,
    synchronizePhysicsPose,
    variant,
  ]);

  useLayoutEffect(() => {
    const transfer = consumeCarRouteTransfer();
    if (!transfer) return;
    startDriving(transfer);
  }, [router.asPath, startDriving]);

  useLayoutEffect(() => {
    if (!CAR_RAMPS_ENABLED || !driving || parking) {
      rampsRef.current = [];
      setRamps([]);
      resetCarRampMotion(rampMotionRef.current);
      return;
    }
    let cancelled = false;
    let frame = 0;
    const placeRamps = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const routeKey = router.asPath.split("?")[0].split("#")[0] || "/";
        const nextRamps = resolveCarRamps({
          drivableBottom: getCarDrivableBottomPageY(),
          exclusionBottom: window.scrollY + window.innerHeight + 120,
          exclusionTop: window.scrollY - 120,
          obstacles: getCarRampObstacles(),
          routeKey,
          surfaceColorAt: getCarRampSurfaceColor,
          viewportWidth: document.documentElement.clientWidth,
        });
        rampsRef.current = nextRamps;
        setRamps(nextRamps);
      });
    };
    placeRamps();
    window.addEventListener("resize", placeRamps, { passive: true });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", placeRamps);
    };
  }, [driving, parking, router.asPath]);

  useEffect(() => {
    if (driving) wake();
  }, [driving, wake]);

  const completePark = () => {
    parkingRef.current = false;
    parkingShutdownEndsAtRef.current = 0;
    if (parkingSettleTimerRef.current !== null) {
      window.clearTimeout(parkingSettleTimerRef.current);
      parkingSettleTimerRef.current = null;
    }
    clearCarRuntimeInput(runtimeRef.current);
    clearHeldCarControls();
    barrierContactsRef.current = new WeakMap();
    pageContactImpulsesRef.current = {
      bottom: { normal: 0, tangent: 0 },
      top: { normal: 0, tangent: 0 },
    };
    resetCarSimulationRuntime(
      simulationRef.current,
      getCarEngineStyle(variantRef.current),
      CAR_CAMERA_YAW,
    );
    mechanicalEngineRunningRef.current = false;
    mechanicalEngineReadyAtRef.current = Number.POSITIVE_INFINITY;
    wheelRotationRef.current = 0;
    frontWheelRotationRef.current = 0;
    rearWheelRotationRef.current = 0;
    frontLeftWheelRotationRef.current = 0;
    frontRightWheelRotationRef.current = 0;
    rearLeftWheelRotationRef.current = 0;
    rearRightWheelRotationRef.current = 0;
    resetCarRampMotion(rampMotionRef.current);
    sceneRef.current?.setDynamics({
      brake: 0,
      heave: 0,
      pitch: 0,
      frontLeftWheelRotation: 0,
      frontRightWheelRotation: 0,
      frontWheelRotation: 0,
      rearLeftWheelRotation: 0,
      rearRightWheelRotation: 0,
      rearWheelRotation: 0,
      roll: 0,
      steering: 0,
      wheelRotation: 0,
    });
    sceneRef.current?.setYaw(CAR_CAMERA_YAW);
    renderedYawRef.current = CAR_CAMERA_YAW;
    resetCarCameraState(cameraRef.current, {
      following: false,
      scrollY: window.scrollY,
      suppressed: false,
    });
    routeArrivalGuardRef.current = null;
    routeEdgePhaseRef.current = "inside";
    if (routeRecoveryTimerRef.current !== null) {
      window.clearTimeout(routeRecoveryTimerRef.current);
      routeRecoveryTimerRef.current = null;
    }
    if (arrivalTaskRef.current !== null) {
      window.clearTimeout(arrivalTaskRef.current);
      arrivalTaskRef.current = null;
    }
    routeExitUnlockAtRef.current = 0;
    invalidateCarRouteLifecycle(routeLifecycleRef.current);
    keycapEnvironmentRef.current.reset();
    engineRequestedRef.current = false;
    engineRequestIdRef.current += 1;
    engineRequestPendingRef.current = false;
    engineRetryAtRef.current = 0;
    stopCarHorn();
    setHonking(false);
    setCarFocused(false);
    if (runtimeRef.current.frame !== null) cancelAnimationFrame(runtimeRef.current.frame);
    runtimeRef.current.frame = null;
    vehicleRef.current?.classList.remove(styles.carDriving);
    vehicleRef.current?.style.removeProperty("transform");
    setParking(false);
    setDriving(false);
  };

  const finishParking = () => {
    if (!parkingRef.current) return;
    parkingRef.current = false;
    const remainingShutdown = Math.max(
      0,
      parkingShutdownEndsAtRef.current - performance.now(),
    );
    // If the short mechanical rundown outlasts the braking motion, keep the
    // stopped car in place until it finishes. Fuel cut itself began on Park.
    parkingSettleTimerRef.current = window.setTimeout(() => {
      parkingSettleTimerRef.current = null;
      completePark();
    }, Math.ceil(remainingShutdown));
  };
  finishParkingRef.current = finishParking;

  const park = () => {
    if (parkingRef.current || parking) return;
    clearCarRuntimeInput(runtimeRef.current);
    clearHeldCarControls();
    routeNavigationEnabledRef.current = false;
    parkingRef.current = true;
    engineRequestedRef.current = false;
    engineRequestIdRef.current += 1;
    engineRequestPendingRef.current = false;
    engineRetryAtRef.current = 0;
    // Park owns the whole vehicle, so stop the authoritative audio core rather
    // than relying on a component lease that may have been superseded during
    // recovery or a rapid route handoff.
    const shutdownDuration = shutdownActiveSecretEngine();
    engineRef.current = null;
    parkingShutdownEndsAtRef.current = performance.now() + shutdownDuration * 1000;
    stopCarHorn();
    setHonking(false);
    setParking(true);
    wake();
  };

  const beginHonk = () => {
    if (honking) return;
    setHonking(true);
    void startCarHorn();
  };

  const endHonk = () => {
    setHonking(false);
    stopCarHorn();
  };

  useEffect(() => {
    if (!driving || !carFocused) return;

    const isEditableTarget = (target: EventTarget | null) => (
      target instanceof HTMLElement
      && Boolean(target.closest("input, textarea, select, [contenteditable=\"true\"]"))
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey
        || event.ctrlKey
        || event.metaKey
        || isEditableTarget(event.target)
      ) return;
      const key = event.key.toLowerCase();
      if (key === "q") {
        event.preventDefault();
        if (!event.repeat && !parkingRef.current) park();
        return;
      }
      if (key === "e") {
        event.preventDefault();
        if (!event.repeat) beginHonk();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "e") return;
      event.preventDefault();
      endHonk();
    };
    const handleWindowBlur = () => endHonk();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [carFocused, driving]);

  return (
    <>
      {CAR_RAMPS_ENABLED
        && driving
        && !parking
        && ramps.length > 0
        && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.carRampLayer} aria-hidden="true">
              {ramps.map((ramp) => (
                <div
                  key={ramp.id}
                  className={styles.carRamp}
                  data-axis={ramp.axis}
                  style={{
                    "--ramp-rise": `${ramp.height}px`,
                    "--ramp-slope": `${-Math.atan2(ramp.height, ramp.length)}rad`,
                    "--ramp-surface": ramp.surfaceColor,
                    height: ramp.width,
                    left: ramp.centerX,
                    top: ramp.centerY,
                    transform: "translate(-50%, -50%) rotate(" + ramp.angle + "rad)",
                    width: ramp.length,
                  } as CSSProperties}
                >
                  <span className={styles.carRampSurface} />
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
      <section
        ref={rootRef}
        className={styles.secret + " " + styles.carSecret}
        aria-label="A hidden drivable car"
      >
      <div
        ref={vehicleRef}
        className={`${styles.carVehicle}${driving ? ` ${styles.carDriving}` : ""}`}
        data-car-variant={variant}
      >
        <canvas
          ref={canvasRef}
          className={styles.carCanvas}
          width={CAR_CANVAS_WIDTH}
          height={CAR_CANVAS_HEIGHT}
          aria-hidden="true"
        />
        {driving && (
          <button
            type="button"
            className={styles.carFocusButton}
            aria-label={carFocused ? "Car controls focused" : "Focus car controls"}
            aria-pressed={carFocused}
            onClick={focusCar}
          />
        )}
        {!driving && (
          <>
            <button type="button" className={styles.objectButton} onClick={() => startDriving()}>
              <span className={styles.visuallyHidden}>Take the little car for a drive</span>
            </button>
            <div className={styles.carPicker} role="group" aria-label="Choose a car">
              {CAR_VARIANTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.carChoice}
                  style={{ "--car-choice": option.color } as CSSProperties}
                  aria-label={option.label}
                  aria-pressed={variant === option.id}
                  title={option.label}
                  onClick={() => selectVariant(option.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      </section>
    </>
  );
}
