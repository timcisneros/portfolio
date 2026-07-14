/** Canonical physical keycap kernel. Both execution backends consume this data. */
export const KEYCAP_KERNEL = Object.freeze({
  // Air75 V2 nSA: broad face over a low, subtly flared shell.
  faceHalf: 0.45,
  baseHalf: 0.5,
  faceExponentCenter: 2.8,
  faceExponentEdge: 4.65,
  baseExponent: 7.0,
  faceCenterHeight: 0.292,
  faceEdgeHeight: 0.36,
  dishCurvature: 0.72,
  cornerLift: 0.002,
  // nSA has a narrow, moderately sharp shoulder chamfer above its straighter
  // flared wall. Keeping this as geometry produces the real edge highlight.
  shoulderHalf: 0.462,
  shoulderHeightRatio: 0.87,
  wallExponentStart: 0.025,
  wallExponentEnd: 0.385,
  // Real molded edges have finite radii. Sub-pixel radii turn into the hard
  // black seam seen in the old render, especially at grazing angles.
  upperFillet: 0.012,
  baseFillet: 0.019,
  normalEpsilon: 0.0007,
  lightX: -1.8,
  lightY: -2.2,
  lightZ: 5.5,
  lightRadius: 0.72,
  // Explicit model-to-CSS projection calibration. Historically this scale
  // leaked in through the shadow-expanded render island; keeping it in the
  // physical kernel makes CSS width/height changes linear and backend-identical.
  projectionScale: 1.45,
  contourBlend: 0.0015,
} as const);

export type KeycapKernel = typeof KEYCAP_KERNEL;
