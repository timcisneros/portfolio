/** Canonical physical keycap kernel. Both execution backends consume this data. */
export const KEYCAP_KERNEL = Object.freeze({
  faceHalf: 0.445,
  baseHalf: 0.5,
  faceExponentCenter: 3.15,
  faceExponentEdge: 5.6,
  baseExponent: 8.2,
  faceCenterHeight: 0.346,
  faceEdgeHeight: 0.421,
  cornerLift: 0.004,
  wallBlendStart: 0.015,
  wallBlendEnd: 0.405,
  wallExponentStart: 0.04,
  wallExponentEnd: 0.39,
  upperFillet: 0.0024,
  baseFillet: 0.0065,
  normalEpsilon: 0.0007,
  lightX: -1.8,
  lightY: -2.2,
  lightZ: 5.5,
  lightRadius: 0.72,
} as const);

export type KeycapKernel = typeof KEYCAP_KERNEL;
