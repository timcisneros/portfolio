import type { CarVariant } from "../../lib/carContinuity";
import { getCarScreenAxes } from "../../lib/carChassis";
import {
  CAR_VISUAL_GEOMETRY,
  getCarCollisionHalfLengthFromCg,
  getCarGeometryFrame,
} from "../../lib/carGeometry";

export type Point = { x: number; y: number };

export type KeycapBarrier = {
  baseCenter: Point;
  element: HTMLElement;
  center: Point;
  halfWidth: number;
  halfHeight: number;
  rotation: number;
};

export type CarGripZone = {
  bottom: number;
  grip: number;
  rollingResistance: number;
  left: number;
  right: number;
  top: number;
};

export type BarrierCollision = {
  barrier: KeycapBarrier;
  contactOffset: Point;
  normal: Point;
  penetration: number;
};

export type PageBoundaryContact = {
  center: Point;
  contactOffset: Point;
  heading: number;
  key: "top" | "bottom";
  normal: Point;
  penetration: number;
  progress: number;
};

const TAU = Math.PI * 2;
export const CAR_COLLISION_HALF_LENGTH = Math.max(
  ...(["city", "rally", "taxi"] as const).map(getCarCollisionHalfLengthFromCg),
);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function wrapYaw(yaw: number) {
  return ((yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

function getCarHullRelativePoints(heading: number, variant: CarVariant) {
  const { forward, right } = getCarScreenAxes(heading);
  return getCarGeometryFrame(variant).collisionHullPagePx.map((point) => ({
    x: forward.x * point.x + right.x * point.y,
    y: forward.y * point.x + right.y * point.y,
  }));
}

function getCarHullContactPoint(
  center: Point,
  hull: Point[],
  outwardNormal: Point,
) {
  const projections = hull.map((point) => (
    point.x * outwardNormal.x + point.y * outwardNormal.y
  ));
  const minimum = Math.min(...projections);
  const support = hull.filter(
    (_point, index) => projections[index] <= minimum + 1.5,
  );
  const point = support.reduce((sum, candidate) => ({
    x: sum.x + candidate.x / support.length,
    y: sum.y + candidate.y / support.length,
  }), { x: 0, y: 0 });
  return { x: point.x - center.x, y: point.y - center.y };
}

function getPolygonAxes(points: Point[]) {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const edge = { x: next.x - point.x, y: next.y - point.y };
    const length = Math.hypot(edge.x, edge.y) || 1;
    return { x: -edge.y / length, y: edge.x / length };
  });
}

function getBarrierHull(barrier: KeycapBarrier) {
  const cosine = Math.cos(barrier.rotation);
  const sine = Math.sin(barrier.rotation);
  return [
    { x: -barrier.halfWidth, y: -barrier.halfHeight },
    { x: barrier.halfWidth, y: -barrier.halfHeight },
    { x: barrier.halfWidth, y: barrier.halfHeight },
    { x: -barrier.halfWidth, y: barrier.halfHeight },
  ].map((point) => ({
    x: barrier.center.x + point.x * cosine - point.y * sine,
    y: barrier.center.y + point.x * sine + point.y * cosine,
  }));
}

export function getCarVerticalSupports(
  heading: number,
  variant: CarVariant,
) {
  const points = getCarHullRelativePoints(heading, variant);
  return {
    bottom: Math.max(...points.map((point) => point.y)),
    top: -Math.min(...points.map((point) => point.y)),
  };
}

export function getCarWheelSurfaceMultipliers(
  center: Point,
  heading: number,
  variant: CarVariant,
  zones: CarGripZone[],
) {
  const { forward, right } = getCarScreenAxes(heading);
  const surfaceBlendDistance = Math.max(
    6,
    CAR_VISUAL_GEOMETRY.model.wheelWellRadius,
  );
  const materialAt = (longitudinalOffset: number, lateralOffset: number) => {
    const point = {
      x: center.x + forward.x * longitudinalOffset + right.x * lateralOffset,
      y: center.y + forward.y * longitudinalOffset + right.y * lateralOffset,
    };
    let material = { grip: 1, rollingResistance: 1 };
    zones.forEach((zone) => {
      if (
        point.x < zone.left
        || point.x > zone.right
        || point.y < zone.top
        || point.y > zone.bottom
      ) return;
      const edgeDistance = Math.min(
        point.x - zone.left,
        zone.right - point.x,
        point.y - zone.top,
        zone.bottom - point.y,
      );
      const linearBlend = clamp(edgeDistance / surfaceBlendDistance, 0, 1);
      const blend = linearBlend * linearBlend * (3 - 2 * linearBlend);
      material = {
        grip: material.grip + (zone.grip - material.grip) * blend,
        rollingResistance: material.rollingResistance
          + (zone.rollingResistance - material.rollingResistance) * blend,
      };
    });
    return material;
  };
  const wheelCenters = getCarGeometryFrame(variant).wheelCentersPagePx;
  const frontLeft = materialAt(wheelCenters.front, -wheelCenters.lateral);
  const frontRight = materialAt(wheelCenters.front, wheelCenters.lateral);
  const rearLeft = materialAt(wheelCenters.rear, -wheelCenters.lateral);
  const rearRight = materialAt(wheelCenters.rear, wheelCenters.lateral);
  return {
    grip: {
      frontLeft: frontLeft.grip,
      frontRight: frontRight.grip,
      rearLeft: rearLeft.grip,
      rearRight: rearRight.grip,
    },
    rollingResistance: {
      frontLeft: frontLeft.rollingResistance,
      frontRight: frontRight.rollingResistance,
      rearLeft: rearLeft.rollingResistance,
      rearRight: rearRight.rollingResistance,
    },
  };
}

export function findBarrierCollisions(
  center: Point,
  heading: number,
  variant: CarVariant,
  barriers: KeycapBarrier[],
): BarrierCollision[] {
  const carRelativeHull = getCarHullRelativePoints(heading, variant);
  const carHull = carRelativeHull.map((point) => ({
    x: center.x + point.x,
    y: center.y + point.y,
  }));
  const contacts: BarrierCollision[] = [];

  for (const barrier of barriers) {
    const barrierHull = getBarrierHull(barrier);
    const axes = [...getPolygonAxes(carHull), ...getPolygonAxes(barrierHull)];
    const delta = {
      x: center.x - barrier.center.x,
      y: center.y - barrier.center.y,
    };
    let minimumOverlap = Number.POSITIVE_INFINITY;
    let minimumAxis = axes[0];
    let separated = false;

    for (const axis of axes) {
      const carProjection = carHull.map(
        (point) => point.x * axis.x + point.y * axis.y,
      );
      const barrierProjection = barrierHull.map(
        (point) => point.x * axis.x + point.y * axis.y,
      );
      const overlap = Math.min(
        Math.max(...carProjection),
        Math.max(...barrierProjection),
      ) - Math.max(
        Math.min(...carProjection),
        Math.min(...barrierProjection),
      );
      if (overlap <= 0) {
        separated = true;
        break;
      }
      if (overlap < minimumOverlap) {
        minimumOverlap = overlap;
        const signedDistance = delta.x * axis.x + delta.y * axis.y;
        const sign = signedDistance < 0 ? -1 : 1;
        minimumAxis = { x: axis.x * sign, y: axis.y * sign };
      }
    }

    if (!separated) {
      contacts.push({
        barrier,
        contactOffset: getCarHullContactPoint(center, carHull, minimumAxis),
        normal: minimumAxis,
        penetration: minimumOverlap,
      });
    }
  }

  return contacts
    .sort((left, right) => right.penetration - left.penetration)
    .slice(0, 4);
}

export function findSweptBarrierCollisions(
  startCenter: Point,
  endCenter: Point,
  startHeading: number,
  endHeading: number,
  variant: CarVariant,
  barriers: KeycapBarrier[],
) {
  const headingDelta = wrapYaw(endHeading - startHeading);
  const sweptDistance = Math.hypot(
    endCenter.x - startCenter.x,
    endCenter.y - startCenter.y,
  ) + Math.abs(headingDelta) * CAR_COLLISION_HALF_LENGTH;
  const steps = Math.max(1, Math.min(16, Math.ceil(sweptDistance / 3)));
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    const center = {
      x: startCenter.x + (endCenter.x - startCenter.x) * progress,
      y: startCenter.y + (endCenter.y - startCenter.y) * progress,
    };
    const heading = wrapYaw(startHeading + headingDelta * progress);
    const collisions = findBarrierCollisions(center, heading, variant, barriers);
    if (collisions.length > 0) return { center, collisions, heading, progress };
  }
  return null;
}

export function findSweptPageBoundaryContact(
  startCenter: Point,
  endCenter: Point,
  startHeading: number,
  endHeading: number,
  variant: CarVariant,
  documentHeight: number,
  topClearance = 72,
): PageBoundaryContact | null {
  const headingDelta = wrapYaw(endHeading - startHeading);
  const sweptDistance = Math.hypot(
    endCenter.x - startCenter.x,
    endCenter.y - startCenter.y,
  ) + Math.abs(headingDelta) * CAR_COLLISION_HALF_LENGTH;
  const steps = Math.max(1, Math.min(16, Math.ceil(sweptDistance / 3)));
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    const center = {
      x: startCenter.x + (endCenter.x - startCenter.x) * progress,
      y: startCenter.y + (endCenter.y - startCenter.y) * progress,
    };
    const heading = wrapYaw(startHeading + headingDelta * progress);
    const hull = getCarHullRelativePoints(heading, variant);
    const minimumHullY = Math.min(...hull.map((point) => point.y));
    const maximumHullY = Math.max(...hull.map((point) => point.y));
    const topPenetration = topClearance - (center.y + minimumHullY);
    const bottomPenetration = center.y + maximumHullY - documentHeight;
    if (topPenetration <= 0 && bottomPenetration <= 0) continue;
    const key = topPenetration > 0 ? "top" : "bottom";
    const normal = key === "top" ? { x: 0, y: 1 } : { x: 0, y: -1 };
    const penetration = key === "top" ? topPenetration : bottomPenetration;
    const pageHull = hull.map((point) => ({
      x: center.x + point.x,
      y: center.y + point.y,
    }));
    return {
      center,
      contactOffset: getCarHullContactPoint(center, pageHull, normal),
      heading,
      key,
      normal,
      penetration,
      progress,
    };
  }
  return null;
}
