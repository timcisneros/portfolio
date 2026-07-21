import type { CarVariant } from "../../lib/carContinuity";
import {
  findBarrierCollisions,
  type BarrierCollision,
  type CarGripZone,
  type KeycapBarrier,
  type Point,
} from "./carPageEnvironment";

type KeycapBodyState = {
  angularVelocity: number;
  offset: Point;
  rotation: number;
  velocity: Point;
};

type BarrierLayoutSample = {
  baseCenter: Point;
  halfHeight: number;
  halfWidth: number;
  stablePasses: number;
};

export type KeycapEnvironmentRefreshInput = {
  carCenter: Point;
  heading: number;
  variant: CarVariant;
};

export type KeycapEnvironment = {
  active: boolean;
  barriers: KeycapBarrier[];
  gripZones: CarGripZone[];
  hitCount: number;
  refreshY: number;
  applyImpact: (
    collision: BarrierCollision,
    normalImpulse: number,
    reducedMotion: boolean,
  ) => boolean;
  refresh: (input: KeycapEnvironmentRefreshInput) => void;
  reset: () => void;
  step: (deltaSeconds: number, reducedMotion: boolean) => void;
};

const MAXIMUM_DISPLACEMENT = 4;
const MAXIMUM_ROTATION_DEGREES = 2;
const MAXIMUM_SPEED = 120;
const TAU = Math.PI * 2;

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

export function createKeycapEnvironment(): KeycapEnvironment {
  const layoutSamples = new WeakMap<HTMLElement, BarrierLayoutSample>();
  const bodies = new Map<HTMLElement, KeycapBodyState>();
  const lastImpactAt = new WeakMap<HTMLElement, number>();

  const environment: KeycapEnvironment = {
    active: false,
    barriers: [],
    gripZones: [],
    hitCount: 0,
    refreshY: Number.NaN,

    refresh({ carCenter, heading, variant }) {
      const pageX = window.scrollX;
      const pageY = window.scrollY;
      const liveElements = new Set<HTMLElement>();
      environment.gripZones = Array.from(
        document.querySelectorAll<HTMLElement>("[data-car-grip]"),
      ).flatMap((element) => {
        const grip = Number(element.dataset.carGrip);
        const authoredRollingResistance = Number(
          element.dataset.carRollingResistance,
        );
        const rollingResistance = Number.isFinite(authoredRollingResistance)
          ? clamp(authoredRollingResistance, 0.35, 2.5)
          : 1;
        const rect = element.getBoundingClientRect();
        if (!Number.isFinite(grip) || rect.width < 1 || rect.height < 1) {
          return [];
        }
        return [{
          bottom: rect.bottom + pageY,
          grip: clamp(grip, 0.45, 1.35),
          rollingResistance,
          left: rect.left + pageX,
          right: rect.right + pageX,
          top: rect.top + pageY,
        }];
      });

      const previousByElement = new Map(
        environment.barriers.map((barrier) => [barrier.element, barrier]),
      );
      environment.barriers = Array.from(
        document.querySelectorAll<HTMLElement>(".btn"),
      ).map((element): KeycapBarrier | null => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) return null;
        liveElements.add(element);
        let body = bodies.get(element);
        if (!body) {
          body = {
            angularVelocity: 0,
            offset: { x: 0, y: 0 },
            rotation: 0,
            velocity: { x: 0, y: 0 },
          };
          bodies.set(element, body);
        }
        const baseCenter = {
          x: rect.left + pageX + rect.width / 2 - body.offset.x,
          y: rect.top + pageY + rect.height / 2 - body.offset.y,
        };
        const halfWidth = Math.max(4, element.offsetWidth / 2);
        const halfHeight = Math.max(4, element.offsetHeight / 2);
        const previousSample = layoutSamples.get(element);
        const sampleStable = previousSample !== undefined
          && Math.hypot(
            baseCenter.x - previousSample.baseCenter.x,
            baseCenter.y - previousSample.baseCenter.y,
          ) < 0.75
          && Math.abs(halfWidth - previousSample.halfWidth) < 0.5
          && Math.abs(halfHeight - previousSample.halfHeight) < 0.5;
        const sample: BarrierLayoutSample = {
          baseCenter,
          halfHeight,
          halfWidth,
          stablePasses: sampleStable ? previousSample.stablePasses + 1 : 1,
        };
        layoutSamples.set(element, sample);
        const candidate: KeycapBarrier = {
          baseCenter,
          element,
          center: { ...baseCenter },
          halfWidth,
          halfHeight,
          rotation: 0,
        };
        const previousBarrier = previousByElement.get(element);
        if (!previousBarrier) return candidate;
        const geometryShift = Math.hypot(
          candidate.baseCenter.x - previousBarrier.baseCenter.x,
          candidate.baseCenter.y - previousBarrier.baseCenter.y,
        ) + Math.abs(candidate.halfWidth - previousBarrier.halfWidth)
          + Math.abs(candidate.halfHeight - previousBarrier.halfHeight);
        if (geometryShift < 0.75) return candidate;
        if (sample.stablePasses < 2) return previousBarrier;
        const newlyOverlapsCar = findBarrierCollisions(
          carCenter,
          heading,
          variant,
          [candidate],
        ).length > 0 && findBarrierCollisions(
          carCenter,
          heading,
          variant,
          [previousBarrier],
        ).length === 0;
        return newlyOverlapsCar ? previousBarrier : candidate;
      }).filter((barrier): barrier is KeycapBarrier => barrier !== null);

      bodies.forEach((_body, element) => {
        if (liveElements.has(element)) return;
        element.style.removeProperty("translate");
        element.style.removeProperty("rotate");
        delete element.dataset.carImpact;
        bodies.delete(element);
      });
      environment.refreshY = carCenter.y;
    },

    step(deltaSeconds, reducedMotion) {
      let active = false;
      bodies.forEach((body, element) => {
        if (reducedMotion) {
          body.offset.x = 0;
          body.offset.y = 0;
          body.velocity.x = 0;
          body.velocity.y = 0;
          body.rotation = 0;
          body.angularVelocity = 0;
        } else {
          const horizontal = stepDampedSpring(
            body.offset.x, body.velocity.x, 0, 2.8, 1.2, deltaSeconds,
          );
          const vertical = stepDampedSpring(
            body.offset.y, body.velocity.y, 0, 2.8, 1.2, deltaSeconds,
          );
          const rotation = stepDampedSpring(
            body.rotation, body.angularVelocity, 0, 3.2, 1.25, deltaSeconds,
          );
          body.offset.x = horizontal.value;
          body.offset.y = vertical.value;
          body.velocity.x = horizontal.velocity;
          body.velocity.y = vertical.velocity;
          body.rotation = clamp(
            rotation.value,
            -MAXIMUM_ROTATION_DEGREES,
            MAXIMUM_ROTATION_DEGREES,
          );
          body.angularVelocity = rotation.velocity;
          const displacement = Math.hypot(body.offset.x, body.offset.y);
          if (displacement > MAXIMUM_DISPLACEMENT) {
            const scale = MAXIMUM_DISPLACEMENT / displacement;
            body.offset.x *= scale;
            body.offset.y *= scale;
          }
          if (
            Math.hypot(body.offset.x, body.offset.y) < 0.015
            && Math.hypot(body.velocity.x, body.velocity.y) < 0.8
            && Math.abs(body.rotation) < 0.015
            && Math.abs(body.angularVelocity) < 0.8
          ) {
            body.offset.x = 0;
            body.offset.y = 0;
            body.velocity.x = 0;
            body.velocity.y = 0;
            body.rotation = 0;
            body.angularVelocity = 0;
          } else {
            active = true;
          }
        }
        if (
          body.offset.x === 0
          && body.offset.y === 0
          && body.rotation === 0
        ) {
          element.style.removeProperty("translate");
          element.style.removeProperty("rotate");
          delete element.dataset.carImpact;
        } else {
          element.style.translate = `${body.offset.x}px ${body.offset.y}px`;
          element.style.rotate = `${body.rotation}deg`;
          element.dataset.carImpact = "true";
        }
      });
      environment.barriers.forEach((barrier) => {
        barrier.center.x = barrier.baseCenter.x;
        barrier.center.y = barrier.baseCenter.y;
        barrier.rotation = 0;
      });
      environment.active = active;
    },

    applyImpact(collision, normalImpulse, reducedMotion) {
      if (normalImpulse <= 0.5) return false;
      const element = collision.barrier.element;
      const now = performance.now();
      const previousImpactAt = lastImpactAt.get(element) ?? -Infinity;
      if (now - previousImpactAt < 110) return false;
      environment.hitCount += 1;
      lastImpactAt.set(element, now);
      const body = bodies.get(element);
      if (!body || reducedMotion) return true;
      const impactSpeed = clamp(normalImpulse * 0.1, 55, MAXIMUM_SPEED);
      body.velocity.x = clamp(
        body.velocity.x - collision.normal.x * impactSpeed,
        -MAXIMUM_SPEED,
        MAXIMUM_SPEED,
      );
      body.velocity.y = clamp(
        body.velocity.y - collision.normal.y * impactSpeed,
        -MAXIMUM_SPEED,
        MAXIMUM_SPEED,
      );
      const impactLever = collision.contactOffset.x * collision.normal.y
        - collision.contactOffset.y * collision.normal.x;
      body.angularVelocity = clamp(
        body.angularVelocity - impactLever * 0.16,
        -18,
        18,
      );
      environment.active = true;
      element.dataset.carImpact = "true";
      return true;
    },

    reset() {
      bodies.forEach((_body, element) => {
        element.style.removeProperty("translate");
        element.style.removeProperty("rotate");
        delete element.dataset.carImpact;
      });
      bodies.clear();
      environment.active = false;
      environment.hitCount = 0;
      environment.barriers = [];
      environment.gripZones = [];
      environment.refreshY = Number.NaN;
    },
  };

  return environment;
}
