/** NuPhy Air75 V2 nSA physical basis, normalized from an 18.15 mm 1u base. */
export const AIR75_V2_NSA = {
  baseMm: 18.15,
  topMm: 15.6,
  heightMm: 5.5,
  topToBase: 15.6 / 18.15,
  heightToBase: 5.5 / 18.15,
  // Mold radii and sag are isolated calibration values because NuPhy does not
  // publish its mold CAD. They can be refitted without changing the backend.
  faceRadiusToBase: 0.205,
  baseRadiusToBase: 0.105,
  // The lower footprint retains a conventional molded corner while the face
  // transitions to NuPhy's visibly fuller squircle silhouette.
  baseCornerExponent: 2.35,
  // The face corner is a continuous superellipse, but the photographed mold
  // is softer than an L4 mathematical squircle. L3.05 preserves straight
  // runs on wide keys while matching the longer 1u corner transition.
  faceCornerExponent: 3.05,
  dishSagToBase: 0.038,
  faceWallFilletToBase: 0.0025,
  // The lower mold edge is visibly broader than the crisp face break. Keeping
  // these radii independent prevents one smoothing value from turning the
  // face into a soft lip or the base into a razor edge.
  baseWallFilletToBase: 0.008,
  matteRoughness: 0.66,
} as const;

export type CameraBasis = {
  azimuth: number;
  elevation: number;
  weight: number;
};

/** Bilinear camera lattice. All buttons consume the same four weights. */
export function cameraBasis(azimuth: number, elevation: number): CameraBasis[] {
  const azStep = 15;
  const elStep = 10;
  const az0 = Math.floor(azimuth / azStep) * azStep;
  const el0 = Math.floor(elevation / elStep) * elStep;
  const tx = (azimuth - az0) / azStep;
  const ty = (elevation - el0) / elStep;
  return [
    { azimuth: az0, elevation: el0, weight: (1 - tx) * (1 - ty) },
    { azimuth: az0 + azStep, elevation: el0, weight: tx * (1 - ty) },
    { azimuth: az0, elevation: el0 + elStep, weight: (1 - tx) * ty },
    { azimuth: az0 + azStep, elevation: el0 + elStep, weight: tx * ty },
  ];
}
