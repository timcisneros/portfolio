export type CarGeometryId = "city" | "rally" | "taxi";

export type CarPoint = Readonly<{ x: number; y: number }>;

/**
 * One geometry contract shared by rendering, surface sampling, collision, and
 * physical calibration. Model-space dimensions are intentionally kept apart
 * from page-space dimensions so every conversion is explicit.
 */
export const CAR_VISUAL_GEOMETRY = {
  canvasHeightPx: 132,
  canvasWidthPx: 180,
  collisionHullPagePx: [
    { x: -42, y: -17 },
    { x: -34, y: -23 },
    { x: 25, y: -23 },
    { x: 42, y: -18 },
    { x: 42, y: 18 },
    { x: 25, y: 23 },
    { x: -34, y: 23 },
    { x: -42, y: 17 },
  ] satisfies readonly CarPoint[],
  model: {
    bodyCenterHalfWidth: 24,
    bodyEndHalfWidth: 20.5,
    cabinBaseHalfWidth: 19.5,
    cabinRoofHalfWidth: 15.2,
    wheelCenterLateral: 19,
    wheelCenterLongitudinal: 25.5,
    wheelCenterVertical: -15.5,
    wheelWellRadius: 10.4,
  },
  pageWheelCentersPx: {
    lateral: 18,
    longitudinal: 25.5,
  },
  renderScale: {
    x: 1.28,
    y: 1.12,
  },
} as const;

export const CAR_PHYSICAL_GEOMETRY: Record<CarGeometryId, {
  bodyLengthM: number;
  bodyWidthM: number;
  centerOfGravityHeightM: number;
  frontRollStiffnessBias: number;
  frontWeightBias: number;
  trackWidthM: number;
  wheelbaseM: number;
}> = {
  city: {
    bodyLengthM: 3.86,
    bodyWidthM: 1.69,
    centerOfGravityHeightM: 0.52,
    frontRollStiffnessBias: 0.57,
    frontWeightBias: 0.59,
    trackWidthM: 1.5,
    wheelbaseM: 2.48,
  },
  rally: {
    bodyLengthM: 3.55,
    bodyWidthM: 1.73,
    centerOfGravityHeightM: 0.48,
    frontRollStiffnessBias: 0.54,
    frontWeightBias: 0.55,
    trackWidthM: 1.54,
    wheelbaseM: 2.42,
  },
  taxi: {
    bodyLengthM: 4.46,
    bodyWidthM: 1.79,
    centerOfGravityHeightM: 0.56,
    frontRollStiffnessBias: 0.61,
    frontWeightBias: 0.61,
    trackWidthM: 1.52,
    wheelbaseM: 2.62,
  },
};

export function getCarCollisionHalfLength() {
  return Math.max(...CAR_VISUAL_GEOMETRY.collisionHullPagePx.map(({ x }) => Math.abs(x)));
}

/**
 * Geometry expressed about the physical centre of gravity. The mesh is
 * authored about the axle midpoint, so this conversion is shared by
 * rendering, surface sampling, collision and the chassis solver.
 */
export function getCarGeometryFrame(id: CarGeometryId) {
  const physical = CAR_PHYSICAL_GEOMETRY[id];
  const axleSpanPagePx = CAR_VISUAL_GEOMETRY.pageWheelCentersPx.longitudinal * 2;
  const pagePixelsPerMeter = axleSpanPagePx / physical.wheelbaseM;
  const cgFromAxleMidpointM = (
    physical.frontWeightBias - 0.5
  ) * physical.wheelbaseM;
  const cgFromAxleMidpointPagePx = cgFromAxleMidpointM * pagePixelsPerMeter;
  const frontAxleFromCgM = physical.wheelbaseM * (1 - physical.frontWeightBias);
  const rearAxleFromCgM = physical.wheelbaseM * physical.frontWeightBias;
  return {
    cgFromAxleMidpointM,
    cgFromAxleMidpointPagePx,
    collisionHullPagePx: CAR_VISUAL_GEOMETRY.collisionHullPagePx.map(({ x, y }) => ({
      x: x - cgFromAxleMidpointPagePx,
      y,
    })),
    frontAxleFromCgM,
    pagePixelsPerMeter,
    rearAxleFromCgM,
    wheelCentersPagePx: {
      front: frontAxleFromCgM * pagePixelsPerMeter,
      lateral: CAR_VISUAL_GEOMETRY.pageWheelCentersPx.lateral,
      rear: -rearAxleFromCgM * pagePixelsPerMeter,
    },
  } as const;
}

export function getCarYawInertiaKgM2(id: CarGeometryId, massKg: number) {
  const { bodyLengthM, bodyWidthM } = CAR_PHYSICAL_GEOMETRY[id];
  return massKg * (bodyLengthM * bodyLengthM + bodyWidthM * bodyWidthM) / 12;
}

export function getCarCollisionHalfLengthFromCg(id: CarGeometryId) {
  return Math.max(
    ...getCarGeometryFrame(id).collisionHullPagePx
      .map(({ x }) => Math.abs(x)),
  );
}
