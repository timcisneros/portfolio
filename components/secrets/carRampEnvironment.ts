import { getCarScreenAxes } from "../../lib/carChassis";
import type { CarVariant } from "../../lib/carContinuity";
import { getCarGeometryFrame } from "../../lib/carGeometry";

export type CarRamp = {
  angle: number;
  axis: "horizontal" | "vertical";
  centerX: number;
  centerY: number;
  height: number;
  id: string;
  length: number;
  surfaceColor: string;
  width: number;
};

export type CarRampMotion = {
  active: boolean;
  grounded: boolean;
  heave: number;
  rampId: string | null;
  pitch: number;
  roll: number;
  verticalVelocity: number;
};

export type CarRampObstacle = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

const LAYOUTS = [
  [[0.18, 0.15, 0], [0.77, 0.25, 1], [0.27, 0.36, 2], [0.72, 0.48, 3], [0.2, 0.6, 1], [0.73, 0.71, 0], [0.3, 0.82, 3], [0.69, 0.92, 2]],
  [[0.76, 0.14, 2], [0.22, 0.26, 3], [0.71, 0.37, 0], [0.28, 0.49, 1], [0.75, 0.61, 3], [0.24, 0.72, 2], [0.68, 0.83, 1], [0.32, 0.93, 0]],
  [[0.3, 0.15, 1], [0.72, 0.26, 2], [0.2, 0.38, 0], [0.75, 0.5, 3], [0.31, 0.62, 2], [0.68, 0.73, 1], [0.22, 0.84, 0], [0.76, 0.93, 3]],
  [[0.72, 0.15, 3], [0.24, 0.27, 0], [0.76, 0.39, 1], [0.22, 0.51, 2], [0.69, 0.63, 0], [0.3, 0.74, 3], [0.75, 0.85, 2], [0.25, 0.94, 1]],
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function routeHash(routeKey: string) {
  let hash = 2166136261;
  for (let index = 0; index < routeKey.length; index += 1) {
    hash ^= routeKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createCarRampMotion(): CarRampMotion {
  return {
    active: false,
    grounded: true,
    heave: 0,
    pitch: 0,
    rampId: null,
    roll: 0,
    verticalVelocity: 0,
  };
}

export function resetCarRampMotion(motion: CarRampMotion) {
  Object.assign(motion, createCarRampMotion());
}

export function resolveCarRamps({
  drivableBottom,
  exclusionBottom,
  exclusionTop,
  obstacles,
  routeKey,
  surfaceColorAt,
  viewportWidth,
}: {
  drivableBottom: number;
  exclusionBottom: number;
  exclusionTop: number;
  obstacles: readonly CarRampObstacle[];
  routeKey: string;
  surfaceColorAt: (x: number, y: number) => string;
  viewportWidth: number;
}) {
  const hash = routeHash(routeKey || "/");
  const layout = LAYOUTS[hash % LAYOUTS.length];
  const availableHeight = Math.max(360, drivableBottom - 240);
  const length = clamp(viewportWidth * 0.28, 132, 168);
  const width = clamp(viewportWidth * 0.23, 84, 112);
  return layout
    .map(([x, y, direction], index) => {
      const angle = direction === 0
        ? 0
        : direction === 1
          ? Math.PI / 2
          : direction === 2
            ? Math.PI
            : -Math.PI / 2;
      const centerX = clamp(
        x * viewportWidth,
        (direction % 2 === 0 ? length : width) / 2 + 18,
        viewportWidth - (direction % 2 === 0 ? length : width) / 2 - 18,
      );
      const centerY = 120 + y * availableHeight;
      return {
        angle,
        axis: direction % 2 === 0 ? "horizontal" : "vertical",
        centerX,
        centerY,
        height: 14,
        id: `${hash.toString(36)}-${index}`,
        length,
        surfaceColor: surfaceColorAt(centerX, centerY),
        width,
      } satisfies CarRamp;
    })
    .filter((ramp) => {
      const halfWidth = (ramp.axis === "horizontal"
        ? ramp.length
        : ramp.width) / 2;
      const halfHeight = (ramp.axis === "vertical"
        ? ramp.length
        : ramp.width) / 2;
      const clearance = 28;
      const bounds = {
        bottom: ramp.centerY + halfHeight + clearance,
        left: ramp.centerX - halfWidth - clearance,
        right: ramp.centerX + halfWidth + clearance,
        top: ramp.centerY - halfHeight - clearance,
      };
      const outsideActivationViewport =
        bounds.bottom < exclusionTop || bounds.top > exclusionBottom;
      const clearOfContent = obstacles.every((obstacle) => (
        bounds.right < obstacle.left
        || bounds.left > obstacle.right
        || bounds.bottom < obstacle.top
        || bounds.top > obstacle.bottom
      ));
      const withinPage = bounds.top > 96
        && bounds.bottom < drivableBottom - 8;
      const surfaceInset = 4;
      const remainsOnOneSurface = [
        [bounds.left + clearance + surfaceInset, bounds.top + clearance + surfaceInset],
        [bounds.right - clearance - surfaceInset, bounds.top + clearance + surfaceInset],
        [bounds.left + clearance + surfaceInset, bounds.bottom - clearance - surfaceInset],
        [bounds.right - clearance - surfaceInset, bounds.bottom - clearance - surfaceInset],
      ].every(([x, y]) => surfaceColorAt(x, y) === ramp.surfaceColor);
      return outsideActivationViewport
        && clearOfContent
        && withinPage
        && remainsOnOneSurface;
    })
    .slice(0, 3);
}

function sampleHeight(point: { x: number; y: number }, ramp: CarRamp) {
  const cosine = Math.cos(ramp.angle);
  const sine = Math.sin(ramp.angle);
  const deltaX = point.x - ramp.centerX;
  const deltaY = point.y - ramp.centerY;
  const longitudinal = deltaX * cosine + deltaY * sine;
  const lateral = -deltaX * sine + deltaY * cosine;
  if (Math.abs(longitudinal) > ramp.length / 2 || Math.abs(lateral) > ramp.width / 2) {
    return { height: 0, supported: false };
  }
  const progress = (longitudinal + ramp.length / 2) / ramp.length;
  return {
    height: ramp.height * clamp(progress, 0, 1),
    supported: true,
  };
}

function samplePose(
  center: { x: number; y: number },
  heading: number,
  variant: CarVariant,
  ramps: readonly CarRamp[],
) {
  const { forward, right } = getCarScreenAxes(heading);
  const wheels = getCarGeometryFrame(variant).wheelCentersPagePx;
  const wheelPoint = (longitudinal: number, lateral: number) => ({
    x: center.x + forward.x * longitudinal + right.x * lateral,
    y: center.y + forward.y * longitudinal + right.y * lateral,
  });
  const sampleRamp = (ramp: CarRamp) => {
    const sampleWheel = (longitudinal: number, lateral: number) => (
      sampleHeight(wheelPoint(longitudinal, lateral), ramp)
    );
    const fl = sampleWheel(wheels.front, -wheels.lateral);
    const fr = sampleWheel(wheels.front, wheels.lateral);
    const rl = sampleWheel(wheels.rear, -wheels.lateral);
    const rr = sampleWheel(wheels.rear, wheels.lateral);
    const heights = [fl, fr, rl, rr];
    const front = (fl.height + fr.height) / 2;
    const rear = (rl.height + rr.height) / 2;
    const left = (fl.height + rl.height) / 2;
    const rightHeight = (fr.height + rr.height) / 2;
    return {
      heave: Math.max(...heights.map((wheel) => wheel.height)),
      pitch: Math.atan2(front - rear, wheels.front - wheels.rear),
      ramp,
      roll: Math.atan2(left - rightHeight, wheels.lateral * 2),
      score: heights.reduce(
        (score, wheel) => score + wheel.height
          + (wheel.supported ? ramp.height : 0),
        0,
      ),
      supported: heights.some((wheel) => wheel.supported),
    };
  };
  let result: ReturnType<typeof sampleRamp> | null = null;
  for (const ramp of ramps) {
    const candidate = sampleRamp(ramp);
    if (!result || candidate.score > result.score) {
      result = candidate;
    }
  }
  return result && result.supported
    ? result
    : {
      heave: 0,
      pitch: 0,
      ramp: null,
      roll: 0,
      score: 0,
      supported: false,
    };
}

export function updateCarRampMotion(
  motion: CarRampMotion,
  options: {
    center: { x: number; y: number };
    deltaSeconds: number;
    heading: number;
    ramps: readonly CarRamp[];
    speed: number;
    variant: CarVariant;
  },
) {
  const deltaSeconds = clamp(options.deltaSeconds, 1 / 240, 1 / 20);
  if (!motion.grounded) {
    motion.verticalVelocity -= 52 * deltaSeconds;
    motion.heave = Math.max(
      0,
      motion.heave + motion.verticalVelocity * deltaSeconds,
    );
    const flightPitch = clamp(
      -motion.verticalVelocity / Math.max(90, Math.abs(options.speed)) * 0.42,
      -0.12,
      0.12,
    );
    const angularResponse = 1 - Math.exp(-deltaSeconds * 4.2);
    motion.pitch += (flightPitch - motion.pitch) * angularResponse;
    motion.roll *= Math.exp(-deltaSeconds * 5);
    motion.active = true;
    if (motion.heave <= 0) resetCarRampMotion(motion);
    return motion;
  }
  const sample = samplePose(options.center, options.heading, options.variant, options.ramps);
  if (sample.supported && sample.ramp) {
    const carForward = getCarScreenAxes(options.heading).forward;
    const rampForward = {
      x: Math.cos(sample.ramp.angle),
      y: Math.sin(sample.ramp.angle),
    };
    const directionalAlignment =
      carForward.x * rampForward.x + carForward.y * rampForward.y;
    const approachSpeed = options.speed * directionalAlignment;
    const launchVelocity = approachSpeed > 42
      && Math.abs(directionalAlignment) > 0.78
      ? approachSpeed * (sample.ramp.height / sample.ramp.length) * 1.45
      : 0;
    motion.verticalVelocity = clamp(launchVelocity, 0, 42);
    motion.heave = sample.heave;
    motion.pitch = sample.pitch;
    motion.rampId = sample.ramp.id;
    motion.roll = sample.roll;
    motion.grounded = true;
    motion.active = true;
    return motion;
  }
  if (motion.rampId !== null && motion.heave > 1.5) {
    motion.grounded = false;
    motion.rampId = null;
    motion.verticalVelocity = Math.max(0, motion.verticalVelocity);
    motion.active = true;
    return motion;
  }
  resetCarRampMotion(motion);
  return motion;
}
