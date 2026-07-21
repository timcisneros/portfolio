import type { CarVariant } from "../../lib/carContinuity";
import {
  CAR_VISUAL_GEOMETRY,
  getCarGeometryFrame,
} from "../../lib/carGeometry";

type Vec3 = [number, number, number];
type Color = [number, number, number];

type MeshData = {
  vertices: number[];
};

const TAU = Math.PI * 2;
type CarPaint = {
  body: Color;
  shadow: Color;
  farSide: Color;
};

const CAR_PAINT: Record<CarVariant, CarPaint> = {
  city: {
    body: [0.941, 0.267, 0.286],
    shadow: [0.741, 0.188, 0.22],
    farSide: [0.86, 0.225, 0.247],
  },
  rally: {
    body: [0.165, 0.455, 0.91],
    shadow: [0.075, 0.255, 0.66],
    farSide: [0.12, 0.365, 0.77],
  },
  taxi: {
    body: [0.98, 0.72, 0.1],
    shadow: [0.72, 0.45, 0.025],
    farSide: [0.88, 0.6, 0.055],
  },
};
const GLASS: Color = [0.125, 0.137, 0.149];
const GLASS_EDGE: Color = [0.271, 0.29, 0.306];
const BUMPER: Color = [0.663, 0.667, 0.678];
const TIRE: Color = [0.125, 0.129, 0.141];
const RIM: Color = [0.467, 0.482, 0.502];
const BRAKE_LIGHT: Color = [0.46, 0.025, 0.03];
const REVERSE_LIGHT: Color = [0.72, 0.76, 0.8];
const MODEL_GEOMETRY = CAR_VISUAL_GEOMETRY.model;
const WHEEL_X = MODEL_GEOMETRY.wheelCenterLongitudinal;
const WHEEL_Y = MODEL_GEOMETRY.wheelCenterVertical;
const BODY_CENTER_HALF_WIDTH = MODEL_GEOMETRY.bodyCenterHalfWidth;
const BODY_END_HALF_WIDTH = MODEL_GEOMETRY.bodyEndHalfWidth;
const CAB_BASE_HALF_WIDTH = MODEL_GEOMETRY.cabinBaseHalfWidth;
const CAB_ROOF_HALF_WIDTH = MODEL_GEOMETRY.cabinRoofHalfWidth;
const WHEEL_CENTER_Z = MODEL_GEOMETRY.wheelCenterLateral;
const WELL_RADIUS = MODEL_GEOMETRY.wheelWellRadius;
const WELL_SEGMENTS = 16;

function hexColor(value: string): Color {
  const hex = value.replace("#", "");
  if (hex.length !== 6) return [1, 0.878, 0.31];
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as Color;
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(value: Vec3): Vec3 {
  const length = Math.hypot(...value) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function addTriangle(mesh: MeshData, a: Vec3, b: Vec3, c: Vec3, color: Color, normal?: Vec3) {
  const faceNormal = normal ?? normalize(cross(subtract(b, a), subtract(c, a)));
  [a, b, c].forEach((point) => {
    mesh.vertices.push(...point, ...faceNormal, ...color);
  });
}

function addQuad(mesh: MeshData, a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: Color) {
  const normal = normalize(cross(subtract(b, a), subtract(c, a)));
  addTriangle(mesh, a, b, c, color, normal);
  addTriangle(mesh, a, c, d, color, normal);
}

function polygonArea(points: Array<[number, number]>) {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function pointInTriangle(point: [number, number], a: [number, number], b: [number, number], c: [number, number]) {
  const sign = (p1: [number, number], p2: [number, number], p3: [number, number]) => (
    (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
  );
  const d1 = sign(point, a, b);
  const d2 = sign(point, b, c);
  const d3 = sign(point, c, a);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNegative && hasPositive);
}

function triangulate(points: Array<[number, number]>) {
  const orientation = Math.sign(polygonArea(points)) || 1;
  const remaining = points.map((_, index) => index);
  const triangles: number[][] = [];
  let guard = points.length * points.length;

  while (remaining.length > 3 && guard > 0) {
    guard -= 1;
    let clipped = false;
    for (let index = 0; index < remaining.length; index += 1) {
      const previous = remaining[(index - 1 + remaining.length) % remaining.length];
      const current = remaining[index];
      const next = remaining[(index + 1) % remaining.length];
      const a = points[previous];
      const b = points[current];
      const c = points[next];
      const turn = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (turn * orientation <= 0) continue;
      const containsPoint = remaining.some((candidate) => (
        candidate !== previous
        && candidate !== current
        && candidate !== next
        && pointInTriangle(points[candidate], a, b, c)
      ));
      if (containsPoint) continue;
      triangles.push([previous, current, next]);
      remaining.splice(index, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (remaining.length === 3) triangles.push([...remaining]);
  return triangles;
}

function wellPoints(centerX: number) {
  return Array.from({ length: WELL_SEGMENTS + 1 }, (_, index): [number, number] => {
    const angle = Math.PI + index / WELL_SEGMENTS * Math.PI;
    // Geometry uses conventional Y-up coordinates.
    return [
      centerX + Math.cos(angle) * WELL_RADIUS,
      WHEEL_Y - Math.sin(angle) * WELL_RADIUS,
    ];
  });
}

function bodyHalfWidth(x: number) {
  const taper = Math.max(0, Math.min(1, (Math.abs(x) - 29) / 12));
  return BODY_CENTER_HALF_WIDTH
    - taper * (BODY_CENTER_HALF_WIDTH - BODY_END_HALF_WIDTH);
}

function cabinHalfWidth(y: number) {
  const taper = Math.max(0, Math.min(1, (y - 8) / 24));
  return CAB_BASE_HALF_WIDTH
    - taper * (CAB_BASE_HALF_WIDTH - CAB_ROOF_HALF_WIDTH);
}

function buildBody(mesh: MeshData, paint: CarPaint) {
  const rearWell = wellPoints(-WHEEL_X);
  const frontWell = wellPoints(WHEEL_X);
  const points: Array<[number, number]> = [
    [-38, 8],
    [-30, 9],
    [14, 9],
    [34.5, 7],
    [40, 3],
    [41, -10.5],
    [38, WHEEL_Y],
    ...frontWell.slice().reverse(),
    [-WHEEL_X + WELL_RADIUS, WHEEL_Y],
    ...rearWell.slice().reverse(),
    [-38, WHEEL_Y],
    [-41, -10.5],
    [-41, 3],
  ];
  const triangles = triangulate(points);
  const pocketDepth = 13.5;

  [-1, 1].forEach((side, sideIndex) => {
    const color = sideIndex ? paint.body : paint.farSide;
    triangles.forEach(([a, b, c]) => {
      const pA: Vec3 = [points[a][0], points[a][1], side * bodyHalfWidth(points[a][0])];
      const pB: Vec3 = [points[b][0], points[b][1], side * bodyHalfWidth(points[b][0])];
      const pC: Vec3 = [points[c][0], points[c][1], side * bodyHalfWidth(points[c][0])];
      if (sideIndex) addTriangle(mesh, pA, pB, pC, color, [0, 0, 1]);
      else addTriangle(mesh, pC, pB, pA, color, [0, 0, -1]);
    });
  });

  const isWellEdge = (point: [number, number], next: [number, number]) => (
    [-WHEEL_X, WHEEL_X].some((centerX) => {
      const pointRadius = Math.hypot(point[0] - centerX, point[1] - WHEEL_Y);
      const nextRadius = Math.hypot(next[0] - centerX, next[1] - WHEEL_Y);
      return Math.abs(pointRadius - WELL_RADIUS) < 0.01
        && Math.abs(nextRadius - WELL_RADIUS) < 0.01;
    })
  );

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    if (isWellEdge(point, next)) {
      // Each wheel has its own shallow pocket. A full-width tunnel lets the
      // opposite wheel show through the arch and reads as a detached artifact.
      [-1, 1].forEach((side) => {
        const pointOuterZ = side * bodyHalfWidth(point[0]);
        const nextOuterZ = side * bodyHalfWidth(next[0]);
        const innerZ = side * pocketDepth;
        addQuad(mesh,
          [point[0], point[1], pointOuterZ],
          [next[0], next[1], nextOuterZ],
          [next[0], next[1], innerZ],
          [point[0], point[1], innerZ],
          paint.shadow,
        );
      });
      return;
    }

    addQuad(mesh,
      [point[0], point[1], -bodyHalfWidth(point[0])],
      [next[0], next[1], -bodyHalfWidth(next[0])],
      [next[0], next[1], bodyHalfWidth(next[0])],
      [point[0], point[1], bodyHalfWidth(point[0])],
      paint.body,
    );
  });

  // Close the back of every pocket with a single continuous half-disc. The
  // tire sits in front of this surface, while the opposite tire is fully
  // occluded by it at oblique angles.
  [-1, 1].forEach((side) => {
    [-WHEEL_X, WHEEL_X].forEach((centerX) => {
      const arc = wellPoints(centerX);
      for (let index = 0; index < arc.length - 1; index += 1) {
        addTriangle(mesh,
          [centerX, WHEEL_Y, side * pocketDepth],
          [arc[index][0], arc[index][1], side * pocketDepth],
          [arc[index + 1][0], arc[index + 1][1], side * pocketDepth],
          paint.shadow,
        );
      }
    });
  });
}

function buildBodySculpting(mesh: MeshData, paint: CarPaint) {
  // The bonnet grows out of the beltline and rolls down toward a narrower
  // nose. Its side bevels make one continuous shoulder with the body shell.
  const hoodRearTopLeft: Vec3 = [13.5, 11.5, -19.1];
  const hoodRearTopRight: Vec3 = [13.5, 11.5, 19.1];
  const hoodFrontTopLeft: Vec3 = [36.5, 7.8, -17.6];
  const hoodFrontTopRight: Vec3 = [36.5, 7.8, 17.6];
  const hoodRearBaseLeft: Vec3 = [14, 9, -22];
  const hoodRearBaseRight: Vec3 = [14, 9, 22];
  const hoodFrontBaseLeft: Vec3 = [39.2, 4.2, -19.7];
  const hoodFrontBaseRight: Vec3 = [39.2, 4.2, 19.7];
  addQuad(mesh, hoodRearTopLeft, hoodFrontTopLeft, hoodFrontTopRight, hoodRearTopRight, paint.body);
  addQuad(mesh, hoodRearBaseLeft, hoodFrontBaseLeft, hoodFrontTopLeft, hoodRearTopLeft, paint.shadow);
  addQuad(mesh, hoodRearTopRight, hoodFrontTopRight, hoodFrontBaseRight, hoodRearBaseRight, paint.body);
  addQuad(mesh, hoodFrontBaseLeft, hoodFrontBaseRight, hoodFrontTopRight, hoodFrontTopLeft, paint.body);
  addQuad(mesh,
    [16, 11.18, -0.3], [35.5, 8.02, -0.3],
    [35.5, 8.02, 0.3], [16, 11.18, 0.3],
    paint.shadow,
  );

  // The hatch shoulder slopes into the rear face instead of ending in a
  // separate trunk-shaped block.
  const deckFrontTopLeft: Vec3 = [-29, 10.2, -19.6];
  const deckFrontTopRight: Vec3 = [-29, 10.2, 19.6];
  const deckRearTopLeft: Vec3 = [-38, 7.8, -17.9];
  const deckRearTopRight: Vec3 = [-38, 7.8, 17.9];
  const deckFrontBaseLeft: Vec3 = [-29.5, 9, -22];
  const deckFrontBaseRight: Vec3 = [-29.5, 9, 22];
  const deckRearBaseLeft: Vec3 = [-39.5, 4, -19.6];
  const deckRearBaseRight: Vec3 = [-39.5, 4, 19.6];
  addQuad(mesh, deckRearTopLeft, deckFrontTopLeft, deckFrontTopRight, deckRearTopRight, paint.body);
  addQuad(mesh, deckRearBaseLeft, deckFrontBaseLeft, deckFrontTopLeft, deckRearTopLeft, paint.shadow);
  addQuad(mesh, deckRearTopRight, deckFrontTopRight, deckFrontBaseRight, deckRearBaseRight, paint.body);
  addQuad(mesh, deckRearBaseRight, deckRearBaseLeft, deckRearTopLeft, deckRearTopRight, paint.body);
}

function addBox(mesh: MeshData, min: Vec3, max: Vec3, color: Color) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  addQuad(mesh, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color);
  addQuad(mesh, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], color);
  addQuad(mesh, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], color);
  addQuad(mesh, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color);
  addQuad(mesh, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], color);
  addQuad(mesh, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color);
}

function buildCabin(mesh: MeshData, paint: CarPaint) {
  // A single straight hatch plane keeps the rear glazing and both side
  // frames geometrically consistent instead of introducing a mid-height
  // kink and a large metal panel below the rear window.
  const rearFaceX = (y: number) => -29 + (y - 8) * (8.5 / 22.5);
  const rearWindowBottom = { x: rearFaceX(8.8), y: 8.8, z: 18.3 };
  const rearWindowTop = { x: rearFaceX(29.8), y: 29.8, z: 14.6 };
  const outline = [
    { x: -29, y: 8, z: cabinHalfWidth(8) },
    { x: -20.5, y: 30.5, z: cabinHalfWidth(30.5) },
    { x: -17.5, y: 32, z: cabinHalfWidth(32) },
    { x: 0, y: 32, z: cabinHalfWidth(32) },
    { x: 3.5, y: 29.5, z: cabinHalfWidth(29.5) },
    { x: 15, y: 8, z: cabinHalfWidth(8) },
  ];
  const sideTriangles = triangulate(outline.map(({ x, y }) => [x, y]));

  [-1, 1].forEach((side, sideIndex) => {
    const color = sideIndex ? paint.body : paint.farSide;
    sideTriangles.forEach(([a, b, c]) => {
      const pA = outline[a];
      const pB = outline[b];
      const pC = outline[c];
      addTriangle(mesh,
        [pA.x, pA.y, side * pA.z],
        [pB.x, pB.y, side * pB.z],
        [pC.x, pC.y, side * pC.z],
        color,
        [0, 0, side],
      );
    });
  });

  outline.forEach((point, index) => {
    const next = outline[(index + 1) % outline.length];
    if (index === 0) {
      // Construct the rear cab face as a real frame around an opening. A
      // glass overlay on a solid face can be depth-occluded at oblique yaw.
      const outerBottomLeft: Vec3 = [point.x, point.y, -point.z];
      const outerBottomRight: Vec3 = [point.x, point.y, point.z];
      const outerTopLeft: Vec3 = [next.x, next.y, -next.z];
      const outerTopRight: Vec3 = [next.x, next.y, next.z];
      const innerBottomLeft: Vec3 = [rearWindowBottom.x, rearWindowBottom.y, -rearWindowBottom.z];
      const innerBottomRight: Vec3 = [rearWindowBottom.x, rearWindowBottom.y, rearWindowBottom.z];
      const innerTopLeft: Vec3 = [rearWindowTop.x, rearWindowTop.y, -rearWindowTop.z];
      const innerTopRight: Vec3 = [rearWindowTop.x, rearWindowTop.y, rearWindowTop.z];

      addQuad(mesh, outerBottomLeft, innerBottomLeft, innerBottomRight, outerBottomRight, paint.shadow);
      addQuad(mesh, innerTopLeft, outerTopLeft, outerTopRight, innerTopRight, paint.shadow);
      addQuad(mesh, outerBottomLeft, outerTopLeft, innerTopLeft, innerBottomLeft, paint.shadow);
      addQuad(mesh, innerBottomRight, innerTopRight, outerTopRight, outerBottomRight, paint.shadow);
      return;
    }
    addQuad(mesh,
      [point.x, point.y, -point.z],
      [next.x, next.y, -next.z],
      [next.x, next.y, next.z],
      [point.x, point.y, point.z],
      index === 2 ? paint.body : index < 2 ? paint.shadow : paint.body,
    );
  });

  const addSidePane = (
    side: number,
    pane: Array<[number, number]>,
    color: Color,
  ) => {
    const triangles = triangulate(pane.map(([x, y]) => [x, y]));
    triangles.forEach(([a, b, c]) => {
      const pA = pane[a];
      const pB = pane[b];
      const pC = pane[c];
      addTriangle(mesh,
        [pA[0], pA[1], side * (cabinHalfWidth(pA[1]) + 0.18)],
        [pB[0], pB[1], side * (cabinHalfWidth(pB[1]) + 0.18)],
        [pC[0], pC[1], side * (cabinHalfWidth(pC[1]) + 0.18)],
        color,
        [0, 0, side],
      );
    });
  };

  [-1, 1].forEach((side) => {
    const glass = side > 0 ? GLASS : [0.105, 0.114, 0.122] as Color;
    addSidePane(side, [
      [-27.3, 10.5], [-19.8, 29.7], [-8.8, 30.4],
      [-8.8, 10.5],
    ], glass);
    addSidePane(side, [
      [-7.5, 30.2], [1.8, 29],
      [13.2, 10.5], [-7.5, 10.5],
    ], glass);
  });

  // The windshields follow the actual raked front and rear cab surfaces.
  addQuad(mesh,
    [3.95, 29, -14.5], [3.95, 29, 14.5],
    [13.85, 10.5, 17.7], [13.85, 10.5, -17.7],
    GLASS_EDGE,
  );
  // The glass closes the framed opening and sits just rearward of its rim.
  const rearGlassOffset = 0.16;
  addQuad(mesh,
    [rearWindowTop.x - rearGlassOffset, rearWindowTop.y, rearWindowTop.z],
    [rearWindowTop.x - rearGlassOffset, rearWindowTop.y, -rearWindowTop.z],
    [rearWindowBottom.x - rearGlassOffset, rearWindowBottom.y, -rearWindowBottom.z],
    [rearWindowBottom.x - rearGlassOffset, rearWindowBottom.y, rearWindowBottom.z],
    GLASS,
  );
}

function addDisc(mesh: MeshData, center: Vec3, radius: number, axis: "x" | "z", color: Color, segments = 24) {
  for (let index = 0; index < segments; index += 1) {
    const angleA = index / segments * TAU;
    const angleB = (index + 1) / segments * TAU;
    if (axis === "z") {
      addTriangle(mesh, center,
        [center[0] + Math.cos(angleA) * radius, center[1] + Math.sin(angleA) * radius, center[2]],
        [center[0] + Math.cos(angleB) * radius, center[1] + Math.sin(angleB) * radius, center[2]],
        color,
      );
    } else {
      addTriangle(mesh, center,
        [center[0], center[1] + Math.sin(angleA) * radius, center[2] + Math.cos(angleA) * radius],
        [center[0], center[1] + Math.sin(angleB) * radius, center[2] + Math.cos(angleB) * radius],
        color,
      );
    }
  }
}

function buildWheel(mesh: MeshData, x: number, side: number) {
  const centerY = WHEEL_Y;
  // The tire sits inside the body skin so the canonical arch—not a floating
  // overlay—covers its shoulder and forms a real wheel well.
  const centerZ = side * WHEEL_CENTER_Z;
  const profiles = [
    { z: -4.2, radius: 7.8 },
    { z: -3.2, radius: 8.7 },
    { z: -1.7, radius: 9 },
    { z: 1.7, radius: 9 },
    { z: 3.2, radius: 8.7 },
    { z: 4.2, radius: 7.8 },
  ];
  const segments = 24;
  for (let profileIndex = 0; profileIndex < profiles.length - 1; profileIndex += 1) {
    const current = profiles[profileIndex];
    const next = profiles[profileIndex + 1];
    for (let index = 0; index < segments; index += 1) {
      const angleA = index / segments * TAU;
      const angleB = (index + 1) / segments * TAU;
      const point = (profile: typeof current, angle: number): Vec3 => [
        x + Math.cos(angle) * profile.radius,
        centerY + Math.sin(angle) * profile.radius,
        centerZ + profile.z,
      ];
      addQuad(mesh, point(current, angleA), point(current, angleB), point(next, angleB), point(next, angleA), TIRE);
    }
  }

  const outwardZ = centerZ + side * 4.25;
  const inwardZ = centerZ - side * 4.25;
  addDisc(mesh, [x, centerY, outwardZ], 7.8, "z", TIRE);
  addDisc(mesh, [x, centerY, outwardZ + side * 0.05], 5, "z", RIM);
  addDisc(mesh, [x, centerY, outwardZ + side * 0.1], 1.75, "z", GLASS_EDGE);
  // Five slim spokes make wheel rotation legible without adding protruding
  // geometry that could clip through the arch at oblique angles.
  for (let spoke = 0; spoke < 5; spoke += 1) {
    const angle = spoke / 5 * TAU;
    const radialX = Math.cos(angle);
    const radialY = Math.sin(angle);
    const tangentX = -radialY * 0.48;
    const tangentY = radialX * 0.48;
    const spokeZ = outwardZ + side * 0.13;
    const point = (radius: number, tangent: number): Vec3 => [
      x + radialX * radius + tangentX * tangent,
      centerY + radialY * radius + tangentY * tangent,
      spokeZ,
    ];
    addQuad(
      mesh,
      point(1.45, -1),
      point(4.6, -1),
      point(4.6, 1),
      point(1.45, 1),
      GLASS_EDGE,
    );
  }
  addDisc(mesh, [x, centerY, inwardZ], 7.8, "z", TIRE);
  addDisc(mesh, [x, centerY, inwardZ - side * 0.05], 4.5, "z", GLASS_EDGE);
  addDisc(mesh, [x, centerY, inwardZ - side * 0.1], 1.6, "z", TIRE);
}

function buildWheelWellLip(mesh: MeshData, x: number, side: number, paint: CarPaint) {
  const outerRadius = WELL_RADIUS + 1.15;
  const segments = 20;
  for (let index = 0; index < segments; index += 1) {
    const angleA = index / segments * Math.PI;
    const angleB = (index + 1) / segments * Math.PI;
    const zA = side * (bodyHalfWidth(x + Math.cos(angleA) * WELL_RADIUS) + 0.14);
    const zB = side * (bodyHalfWidth(x + Math.cos(angleB) * WELL_RADIUS) + 0.14);
    const point = (radius: number, angle: number, z: number): Vec3 => [
      x + Math.cos(angle) * radius,
      WHEEL_Y + Math.sin(angle) * radius,
      z,
    ];
    addQuad(mesh,
      point(outerRadius, angleA, zA),
      point(outerRadius, angleB, zB),
      point(WELL_RADIUS, angleB, zB),
      point(WELL_RADIUS, angleA, zA),
      paint.shadow,
    );
  }
}

function buildDetails(mesh: MeshData, yellow: Color, paint: CarPaint) {
  // Front and rear trim sit just beyond the body planes, so depth testing
  // keeps them attached without coplanar flicker.
  [-15.5, 15.5].forEach((z) => addDisc(mesh, [41.2, -1, z], 3, "x", yellow));
  addBox(mesh, [41.15, -6.5, -11], [41.35, -1.5, 11], GLASS);
  addBox(mesh, [41.2, -13.5, -20.5], [41.45, -8.5, 20.5], BUMPER);
  [-14.5, 14.5].forEach((z) => addDisc(mesh, [-41.25, -3, z], 2.5, "x", BRAKE_LIGHT));
  [-7, 7].forEach((z) => addDisc(mesh, [-41.28, -3, z], 1.55, "x", REVERSE_LIGHT));
  addBox(mesh, [-41.5, -13.5, -17], [-41.2, -10.5, 17], BUMPER);

  // Door handles and mirrors retain the small toy-like details.
  [-1, 1].forEach((side) => {
    const sideZ = side * (BODY_CENTER_HALF_WIDTH + 0.08);
    addQuad(mesh,
      [-7.3, 8.5, sideZ], [-6.85, 8.5, sideZ],
      [-6.85, -10, sideZ], [-7.3, -10, sideZ],
      paint.shadow,
    );
    addQuad(mesh,
      [-15, -11.2, sideZ], [15, -11.2, sideZ],
      [15, -12.4, sideZ], [-15, -12.4, sideZ],
      paint.shadow,
    );
    addBox(mesh,
      [-3, 4.5, side > 0 ? 24.05 : -24.25],
      [3, 5.7, side > 0 ? 24.25 : -24.05],
      BUMPER,
    );
    const mirrorInner = cabinHalfWidth(13) + 0.2;
    const mirrorOuter = mirrorInner + 2.3;
    addBox(mesh,
      [11, 12, side > 0 ? mirrorInner : -mirrorOuter],
      [15, 15, side > 0 ? mirrorOuter : -mirrorInner],
      GLASS_EDGE,
    );
  });
}

function buildVariantDetails(
  mesh: MeshData,
  variant: CarVariant,
  paint: CarPaint,
  yellow: Color,
) {
  if (variant === "rally") {
    // A low hood scoop intersects the bonnet instead of floating above it.
    addBox(mesh, [20, 9.4, -6], [29, 13.2, 6], paint.shadow);

    // Two planted uprights carry one continuous rear wing.
    addBox(mesh, [-36.5, 7.2, -18], [-33, 14.5, -13.5], paint.shadow);
    addBox(mesh, [-36.5, 7.2, 13.5], [-33, 14.5, 18], paint.body);
    addBox(mesh, [-40, 13.6, -24], [-30.5, 16.4, 24], paint.body);

    // Compact auxiliary lamps give the nose a rally identity without
    // interfering with the primary headlights.
    [-7, 7].forEach((z) => addDisc(mesh, [41.5, -7, z], 1.75, "x", yellow));
  }

  if (variant === "taxi") {
    // The sign base penetrates the roof plane slightly so it remains attached
    // from every yaw angle.
    addBox(mesh, [-10, 30.8, -7], [2, 36.5, 7], GLASS_EDGE);
    [-1, 1].forEach((side) => addQuad(mesh,
      [-9.2, 31.7, side * 7.08], [1.2, 31.7, side * 7.08],
      [1.2, 35.6, side * 7.08], [-9.2, 35.6, side * 7.08],
      yellow,
    ));

    // A restrained checker belt reads on both sides without adding loose or
    // coplanar geometry around the wheel arches.
    [-1, 1].forEach((side) => {
      [-20, -12, -4, 4, 12].forEach((x, index) => {
        const z = side * (bodyHalfWidth(x) + 0.2);
        const color = index % 2 === 0 ? GLASS : GLASS_EDGE;
        addQuad(mesh,
          [x, -2.5, z], [x + 6, -2.5, z],
          [x + 6, 1.3, z], [x, 1.3, z],
          color,
        );
      });
    });
  }
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create car shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Unable to compile car shader");
  }
  return shader;
}

export type CarMeshRenderer = {
  render: () => void;
  setYaw: (yaw: number) => void;
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
  getYaw: () => number;
  dispose: () => void;
};

export function createCarMeshRenderer(
  canvas: HTMLCanvasElement,
  yellow: string,
  variant: CarVariant = "city",
): CarMeshRenderer {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: true,
    // The car's turntable audit reads frames immediately after rendering.
    // Keeping the tiny 180 x 132 buffer avoids intermittent blank captures.
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error("WebGL is unavailable for the car model");
  const geometryFrame = getCarGeometryFrame(variant);

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aColor;
    uniform vec2 uYaw;
    uniform vec2 uTilt;
    uniform vec2 uScale;
    uniform vec3 uDynamics;
    uniform float uCgOffset;
    uniform vec3 uWheelCenter;
    uniform float uWheelPart;
    uniform float uWheelSpin;
    uniform float uWheelSteering;
    uniform float uWheelTravel;
    varying vec3 vNormal;
    varying vec3 vColor;
    vec3 applyWheel(vec3 value, bool normal) {
      if (uWheelPart < 0.5) return value;
      vec3 local = normal ? value : value - uWheelCenter;
      float spinCos = cos(uWheelSpin);
      float spinSin = sin(uWheelSpin);
      local = vec3(
        local.x * spinCos - local.y * spinSin,
        local.x * spinSin + local.y * spinCos,
        local.z
      );
      float steerCos = cos(uWheelSteering);
      float steerSin = sin(uWheelSteering);
      // Match the positive-y rotation used by the body yaw below. The former
      // matrix used its inverse, so a positive/right chassis steer visibly
      // pointed both front tires toward the negative/left side of the car.
      local = vec3(
        local.x * steerCos - local.z * steerSin,
        local.y,
        local.x * steerSin + local.z * steerCos
      );
      return normal ? local : local + uWheelCenter + vec3(0.0, uWheelTravel, 0.0);
    }
    vec3 applyDynamics(vec3 value) {
      float pitchCos = cos(uDynamics.x);
      float pitchSin = sin(uDynamics.x);
      vec3 pitched = vec3(
        value.x * pitchCos - value.y * pitchSin,
        value.x * pitchSin + value.y * pitchCos,
        value.z
      );
      float rollCos = cos(uDynamics.y);
      float rollSin = sin(uDynamics.y);
      return vec3(
        pitched.x,
        pitched.y * rollCos - pitched.z * rollSin,
        pitched.y * rollSin + pitched.z * rollCos
      );
    }
    vec3 rotateModel(vec3 value, bool normal) {
      if (uWheelPart < 0.5) value = applyDynamics(value);
      if (!normal) value.y += uDynamics.z;
      vec3 yawed = vec3(
        value.x * uYaw.x - value.z * uYaw.y,
        value.y,
        value.x * uYaw.y + value.z * uYaw.x
      );
      return vec3(
        yawed.x,
        yawed.y * uTilt.x - yawed.z * uTilt.y,
        yawed.y * uTilt.y + yawed.z * uTilt.x
      );
    }
    void main() {
      vec3 positionValue = applyWheel(aPosition, false);
      positionValue.x -= uCgOffset;
      vec3 position = rotateModel(positionValue, false);
      vNormal = normalize(rotateModel(applyWheel(aNormal, true), true));
      vColor = aColor;
      gl_Position = vec4(
        position.x * uScale.x,
        (position.y - 4.0) * uScale.y,
        -position.z / 90.0,
        1.0
      );
    }
  `);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vColor;
    uniform float uBrake;
    uniform float uReverse;
    void main() {
      vec3 light = normalize(vec3(-0.35, 0.75, 0.55));
      float shade = 0.78 + 0.22 * max(dot(normalize(vNormal), light), 0.0);
      float brakeMask = 1.0 - step(0.03, distance(vColor, vec3(0.46, 0.025, 0.03)));
      float reverseMask = 1.0 - step(0.03, distance(vColor, vec3(0.72, 0.76, 0.8)));
      vec3 surfaceColor = mix(vColor, vec3(1.0, 0.025, 0.018), brakeMask * uBrake * 0.9);
      surfaceColor = mix(surfaceColor, vec3(1.0), reverseMask * uReverse * 0.86);
      gl_FragColor = vec4(surfaceColor * shade, 1.0);
    }
  `);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create car shader program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Unable to link car shader");
  }

  const mesh: MeshData = { vertices: [] };
  const paint = CAR_PAINT[variant];
  const headlight = hexColor(yellow);
  buildBody(mesh, paint);
  buildBodySculpting(mesh, paint);
  buildCabin(mesh, paint);
  const firstBodyVertexCount = mesh.vertices.length / 9;
  const wheelRanges: Array<{
    center: Vec3;
    first: number;
    count: number;
    front: boolean;
    side: -1 | 1;
  }> = [];
  [-1, 1].forEach((side) => [-WHEEL_X, WHEEL_X].forEach((x) => {
    const first = mesh.vertices.length / 9;
    buildWheel(mesh, x, side);
    wheelRanges.push({
      center: [x, WHEEL_Y, side * WHEEL_CENTER_Z],
      first,
      count: mesh.vertices.length / 9 - first,
      front: x > 0,
      side: side as -1 | 1,
    });
  }));
  const trailingBodyFirst = mesh.vertices.length / 9;
  [-1, 1].forEach((side) => [-WHEEL_X, WHEEL_X].forEach((x) => buildWheelWellLip(mesh, x, side, paint)));
  buildDetails(mesh, headlight, paint);
  buildVariantDetails(mesh, variant, paint, headlight);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
  gl.useProgram(program);
  const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
  const positionLocation = gl.getAttribLocation(program, "aPosition");
  const normalLocation = gl.getAttribLocation(program, "aNormal");
  const colorLocation = gl.getAttribLocation(program, "aColor");
  [positionLocation, normalLocation, colorLocation].forEach((location) => gl.enableVertexAttribArray(location));
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);
  gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);

  const yawLocation = gl.getUniformLocation(program, "uYaw");
  const tiltLocation = gl.getUniformLocation(program, "uTilt");
  const scaleLocation = gl.getUniformLocation(program, "uScale");
  const dynamicsLocation = gl.getUniformLocation(program, "uDynamics");
  const cgOffsetLocation = gl.getUniformLocation(program, "uCgOffset");
  const wheelCenterLocation = gl.getUniformLocation(program, "uWheelCenter");
  const wheelPartLocation = gl.getUniformLocation(program, "uWheelPart");
  const wheelSpinLocation = gl.getUniformLocation(program, "uWheelSpin");
  const wheelSteeringLocation = gl.getUniformLocation(program, "uWheelSteering");
  const wheelTravelLocation = gl.getUniformLocation(program, "uWheelTravel");
  const brakeLocation = gl.getUniformLocation(program, "uBrake");
  const reverseLocation = gl.getUniformLocation(program, "uReverse");
  // Positive pitch places the near wheels lower in screen space and the far
  // wheels higher behind the body, matching a camera looking down at the car.
  const tilt = TAU / 8;
  let yaw = TAU / 10;
  let pitch = 0;
  let roll = 0;
  let heave = 0;
  let steering = 0;
  let frontWheelRotation = 0;
  let rearWheelRotation = 0;
  let frontLeftWheelRotation = 0;
  let frontRightWheelRotation = 0;
  let rearLeftWheelRotation = 0;
  let rearRightWheelRotation = 0;
  let frontLeftSuspensionTravel = 0;
  let frontRightSuspensionTravel = 0;
  let rearLeftSuspensionTravel = 0;
  let rearRightSuspensionTravel = 0;
  let brake = 0;
  let reverse = 0;
  let disposed = false;

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);

  const render = () => {
    if (disposed) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(CAR_VISUAL_GEOMETRY.canvasWidthPx * ratio);
    const height = Math.round(CAR_VISUAL_GEOMETRY.canvasHeightPx * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(yawLocation, Math.cos(yaw), Math.sin(yaw));
    gl.uniform2f(tiltLocation, Math.cos(tilt), Math.sin(tilt));
    gl.uniform2f(
      scaleLocation,
      CAR_VISUAL_GEOMETRY.renderScale.x / (CAR_VISUAL_GEOMETRY.canvasWidthPx / 2),
      CAR_VISUAL_GEOMETRY.renderScale.y / (CAR_VISUAL_GEOMETRY.canvasHeightPx / 2),
    );
    gl.uniform3f(dynamicsLocation, pitch, roll, heave);
    gl.uniform1f(cgOffsetLocation, geometryFrame.cgFromAxleMidpointPagePx);
    gl.uniform1f(brakeLocation, brake);
    gl.uniform1f(reverseLocation, reverse);
    gl.uniform1f(wheelPartLocation, 0);
    gl.drawArrays(gl.TRIANGLES, 0, firstBodyVertexCount);
    wheelRanges.forEach((wheel) => {
      gl.uniform1f(wheelPartLocation, 1);
      gl.uniform3f(wheelCenterLocation, ...wheel.center);
      const axleRotation = wheel.front ? frontWheelRotation : rearWheelRotation;
      const individualRotation = wheel.front
        ? wheel.side < 0 ? frontLeftWheelRotation : frontRightWheelRotation
        : wheel.side < 0 ? rearLeftWheelRotation : rearRightWheelRotation;
      gl.uniform1f(wheelSpinLocation, individualRotation ?? axleRotation);
      const suspensionTravel = wheel.front
        ? wheel.side < 0 ? frontLeftSuspensionTravel : frontRightSuspensionTravel
        : wheel.side < 0 ? rearLeftSuspensionTravel : rearRightSuspensionTravel;
      gl.uniform1f(wheelTravelLocation, suspensionTravel);
      let wheelSteering = 0;
      if (wheel.front && Math.abs(steering) > 0.0001) {
        const direction = Math.sign(steering);
        const radius = Math.abs((WHEEL_X * 2) / Math.tan(steering));
        const inner = Math.sign(wheel.center[2]) === direction;
        const wheelRadius = Math.max(
          WHEEL_CENTER_Z * 0.55,
          radius + (inner ? -WHEEL_CENTER_Z : WHEEL_CENTER_Z),
        );
        wheelSteering = direction * Math.atan((WHEEL_X * 2) / wheelRadius);
      }
      gl.uniform1f(wheelSteeringLocation, wheelSteering);
      gl.drawArrays(gl.TRIANGLES, wheel.first, wheel.count);
    });
    gl.uniform1f(wheelPartLocation, 0);
    gl.uniform1f(wheelTravelLocation, 0);
    gl.drawArrays(
      gl.TRIANGLES,
      trailingBodyFirst,
      mesh.vertices.length / 9 - trailingBodyFirst,
    );
  };

  return {
    render,
    getYaw: () => yaw,
    setYaw(value) {
      yaw = value;
      render();
    },
    setDynamics(next) {
      brake = Math.max(0, Math.min(1, next.brake ?? 0));
      reverse = Math.max(0, Math.min(1, next.reverse ?? 0));
      heave = next.heave ?? 0;
      frontLeftSuspensionTravel = next.frontLeftSuspensionTravel ?? 0;
      frontRightSuspensionTravel = next.frontRightSuspensionTravel ?? 0;
      rearLeftSuspensionTravel = next.rearLeftSuspensionTravel ?? 0;
      rearRightSuspensionTravel = next.rearRightSuspensionTravel ?? 0;
      pitch = next.pitch;
      roll = next.roll;
      steering = next.steering;
      frontWheelRotation = next.frontWheelRotation ?? next.wheelRotation;
      rearWheelRotation = next.rearWheelRotation ?? next.wheelRotation;
      frontLeftWheelRotation = next.frontLeftWheelRotation ?? frontWheelRotation;
      frontRightWheelRotation = next.frontRightWheelRotation ?? frontWheelRotation;
      rearLeftWheelRotation = next.rearLeftWheelRotation ?? rearWheelRotation;
      rearRightWheelRotation = next.rearRightWheelRotation ?? rearWheelRotation;
      render();
    },
    setPose(next) {
      brake = Math.max(0, Math.min(1, next.brake ?? 0));
      reverse = Math.max(0, Math.min(1, next.reverse ?? 0));
      heave = next.heave ?? 0;
      frontLeftSuspensionTravel = next.frontLeftSuspensionTravel ?? 0;
      frontRightSuspensionTravel = next.frontRightSuspensionTravel ?? 0;
      rearLeftSuspensionTravel = next.rearLeftSuspensionTravel ?? 0;
      rearRightSuspensionTravel = next.rearRightSuspensionTravel ?? 0;
      yaw = next.yaw;
      pitch = next.pitch;
      roll = next.roll;
      steering = next.steering;
      frontWheelRotation = next.frontWheelRotation ?? next.wheelRotation;
      rearWheelRotation = next.rearWheelRotation ?? next.wheelRotation;
      frontLeftWheelRotation = next.frontLeftWheelRotation ?? frontWheelRotation;
      frontRightWheelRotation = next.frontRightWheelRotation ?? frontWheelRotation;
      rearLeftWheelRotation = next.rearLeftWheelRotation ?? rearWheelRotation;
      rearRightWheelRotation = next.rearRightWheelRotation ?? rearWheelRotation;
      render();
    },
    dispose() {
      disposed = true;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    },
  };
}
