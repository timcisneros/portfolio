import type { KeycapCamera } from "../cameraStore";
import { KEYCAP_KERNEL as K } from "../kernel";
import type { KeycapRegistration } from "./types";

type V3 = [number, number, number];
type Vertex = { p: V3; n: V3 };
type Triangle = [Vertex, Vertex, Vertex];

export interface SoftwareAtlas {
  data: Uint8Array;
  width: number;
  height: number;
}

type RasterCanvas = HTMLCanvasElement | OffscreenCanvas;
type RasterContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export interface SoftwareRasterCacheEntry {
  signature: string;
  surface: OffscreenCanvas;
  guardLeft: number;
  guardTop: number;
}

const TAU = Math.PI * 2;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v: V3): V3 => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

function superRadius(x: number, y: number, hx: number, hy: number, exponent: number) {
  return (Math.abs(x / hx) ** exponent + Math.abs(y / hy) ** exponent) ** (1 / exponent);
}

function faceRadius(x: number, y: number, widthUnits: number) {
  const hx = K.faceHalf * widthUnits;
  const first = superRadius(x, y, hx, K.faceHalf, K.faceExponentEdge);
  const exponent = mix(K.faceExponentCenter, K.faceExponentEdge, smooth(0.08, 0.82, first));
  return superRadius(x, y, hx, K.faceHalf, exponent);
}

export function evaluateKeycapFaceHeight(x: number, y: number, widthUnits: number) {
  const r = clamp(faceRadius(x, y, widthUnits), 0, 1.12);
  const t = clamp(r);
  const broad = t * t * (3 - 2 * t);
  const corner = Math.abs(x / Math.max(K.faceHalf * widthUnits, 0.001)) ** 8 * Math.abs(y / K.faceHalf) ** 8;
  return mix(K.faceCenterHeight, K.faceEdgeHeight, broad) + K.cornerLift * corner;
}

function smax(a: number, b: number, k: number) {
  const h = clamp(0.5 + 0.5 * (a - b) / k);
  return mix(b, a, h) + k * h * (1 - h);
}

export function evaluateKeycapField(p: V3, widthUnits: number) {
  const wallT = smooth(K.wallBlendStart, K.wallBlendEnd, p[2]);
  const hx = mix(K.baseHalf * widthUnits, K.faceHalf * widthUnits, wallT);
  const hy = mix(K.baseHalf, K.faceHalf, wallT);
  const exponent = mix(K.baseExponent, K.faceExponentEdge, smooth(K.wallExponentStart, K.wallExponentEnd, p[2]));
  const lateral = (superRadius(p[0], p[1], hx, hy, exponent) - 1) * Math.min(hx, hy);
  const upper = smax(lateral, p[2] - evaluateKeycapFaceHeight(p[0], p[1], widthUnits), K.upperFillet);
  return smax(upper, -p[2], K.baseFillet);
}

function fieldNormal(p: V3, widthUnits: number): V3 {
  const e = K.normalEpsilon;
  return normalize([
    evaluateKeycapField([p[0] + e, p[1], p[2]], widthUnits) - evaluateKeycapField([p[0] - e, p[1], p[2]], widthUnits),
    evaluateKeycapField([p[0], p[1] + e, p[2]], widthUnits) - evaluateKeycapField([p[0], p[1] - e, p[2]], widthUnits),
    evaluateKeycapField([p[0], p[1], p[2] + e], widthUnits) - evaluateKeycapField([p[0], p[1], p[2] - e], widthUnits),
  ]);
}

function ringPoint(radius: number, angle: number, widthUnits: number): V3 {
  if (radius === 0) return [0, 0, evaluateKeycapFaceHeight(0, 0, widthUnits)];
  const exponent = mix(K.faceExponentCenter, K.faceExponentEdge, smooth(0.08, 0.82, radius));
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const x = K.faceHalf * widthUnits * radius * Math.sign(c) * Math.abs(c) ** (2 / exponent);
  const y = K.faceHalf * radius * Math.sign(s) * Math.abs(s) ** (2 / exponent);
  return [x, y, evaluateKeycapFaceHeight(x, y, widthUnits)];
}

const meshCache = new Map<number, Triangle[]>();

function buildMesh(widthUnits: number) {
  const cacheKey = Math.round(widthUnits * 100);
  const cached = meshCache.get(cacheKey);
  if (cached) return cached;
  const triangles: Triangle[] = [];
  const segments = 64;
  const rings = 18;
  const top: Vertex[][] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const r = ring / rings;
    const vertices: Vertex[] = [];
    for (let segment = 0; segment < segments; segment += 1) {
      const p = ringPoint(r, segment / segments * TAU, widthUnits);
      vertices.push({ p, n: fieldNormal(p, widthUnits) });
    }
    top.push(vertices);
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      if (ring === 0) {
        triangles.push([top[0][segment], top[1][segment], top[1][next]]);
      } else {
        triangles.push([top[ring][segment], top[ring + 1][segment], top[ring + 1][next]]);
        triangles.push([top[ring][segment], top[ring + 1][next], top[ring][next]]);
      }
    }
  }
  const wallLevels = 10;
  const wall: Vertex[][] = [top[rings]];
  for (let level = 1; level <= wallLevels; level += 1) {
    const z = K.faceEdgeHeight * (1 - level / wallLevels);
    const wallT = smooth(K.wallBlendStart, K.wallBlendEnd, z);
    const hx = mix(K.baseHalf * widthUnits, K.faceHalf * widthUnits, wallT);
    const hy = mix(K.baseHalf, K.faceHalf, wallT);
    const exponent = mix(K.baseExponent, K.faceExponentEdge, smooth(K.wallExponentStart, K.wallExponentEnd, z));
    const vertices: Vertex[] = [];
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * TAU;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const p: V3 = [
        hx * Math.sign(c) * Math.abs(c) ** (2 / exponent),
        hy * Math.sign(s) * Math.abs(s) ** (2 / exponent),
        z,
      ];
      vertices.push({ p, n: fieldNormal(p, widthUnits) });
    }
    wall.push(vertices);
  }
  for (let level = 0; level < wallLevels; level += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      triangles.push([wall[level][segment], wall[level + 1][segment], wall[level + 1][next]]);
      triangles.push([wall[level][segment], wall[level + 1][next], wall[level][next]]);
    }
  }
  const bottomCenter: Vertex = { p: [0, 0, 0], n: [0, 0, -1] };
  const bottom = wall[wallLevels];
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    triangles.push([bottomCenter, bottom[next], bottom[segment]]);
  }
  meshCache.set(cacheKey, triangles);
  return triangles;
}

interface Projected extends Vertex { x: number; y: number; depth: number }

function srgbToLinear(v: number) { return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }
function linearToSrgb(v: number) { return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055; }

function shade(p: V3, normal: V3, registration: KeycapRegistration, atlas: SoftwareAtlas | null, cameraOrigin: V3) {
  const light = normalize(sub([K.lightX, K.lightY, K.lightZ], p));
  const view = normalize(sub(cameraOrigin, p));
  const halfVector = normalize([light[0] + view[0], light[1] + view[1], light[2] + view[2]]);
  const ndl = Math.max(0, dot(normal, light));
  const ndv = Math.max(0.001, dot(normal, view));
  const ndh = Math.max(0, dot(normal, halfVector));
  const vdh = Math.max(0, dot(view, halfVector));
  let color = registration.material.color.map(srgbToLinear) as unknown as V3;
  const uv = registration.legendUv;
  if (atlas && uv && faceRadius(p[0], p[1], registration.widthUnits ?? 1) <= 1.008 && normal[2] >= 0.32) {
    const legendWidth = Math.min(registration.widthUnits ?? 1, 3.4);
    const u = 0.5 - p[0] / (K.faceHalf * 2 * legendWidth);
    const v = 0.5 + p[1] / (K.faceHalf * 2);
    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
      const sampleX = (uv[0] + u * uv[2]) * atlas.width - 0.5;
      const sampleY = (uv[1] + v * uv[3]) * atlas.height - 0.5;
      const x0 = clamp(Math.floor(sampleX), 0, atlas.width - 1);
      const y0 = clamp(Math.floor(sampleY), 0, atlas.height - 1);
      const x1 = Math.min(x0 + 1, atlas.width - 1);
      const y1 = Math.min(y0 + 1, atlas.height - 1);
      const tx = clamp(sampleX - Math.floor(sampleX), 0, 1);
      const ty = clamp(sampleY - Math.floor(sampleY), 0, 1);
      const row0 = mix(atlas.data[y0 * atlas.width + x0], atlas.data[y0 * atlas.width + x1], tx);
      const row1 = mix(atlas.data[y1 * atlas.width + x0], atlas.data[y1 * atlas.width + x1], tx);
      const coverage = mix(row0, row1, ty) / 255;
      const ink = (registration.material.legendColor ?? [0.2, 0.2, 0.18]).map(srgbToLinear) as unknown as V3;
      color = [mix(color[0], ink[0], coverage), mix(color[1], ink[1], coverage), mix(color[2], ink[2], coverage)];
    }
  }
  const roughness = clamp(registration.material.roughness ?? 0.66, 0.2, 0.98);
  const alpha = roughness * roughness;
  const alpha2 = alpha * alpha;
  const distribution = alpha2 / Math.max(Math.PI * (ndh * ndh * (alpha2 - 1) + 1) ** 2, 0.00001);
  const geometryK = (roughness + 1) ** 2 / 8;
  const geometryV = ndv / (ndv * (1 - geometryK) + geometryK);
  const geometryL = ndl / (ndl * (1 - geometryK) + geometryK);
  const fresnel = 0.04 + 0.96 * (1 - vdh) ** 5;
  const specular = distribution * geometryV * geometryL * fresnel / Math.max(4 * ndv * Math.max(ndl, 0.001), 0.001);
  const wrapDiffuse = Math.max((dot(normal, light) + 0.16) / 1.16, 0);
  const direct = 0.76 * mix(ndl, wrapDiffuse, 0.14);
  const indirect = (registration.material.ambient ?? 0.14)
    + 0.16 * (1 - smooth(0.05, 0.82, Math.max(normal[2], 0)))
    + 0.04 * Math.max(normal[2], 0);
  return color.map((channel) => clamp(linearToSrgb(channel * (1 - fresnel) * direct + channel * indirect + specular * ndl)) * 255) as unknown as V3;
}

export function renderSoftwareKeycaps(
  context: RasterContext,
  canvas: RasterCanvas,
  instances: KeycapRegistration[],
  camera: KeycapCamera,
  atlas: SoftwareAtlas | null,
  pixelStep = 1,
  viewport = {
    width: "clientWidth" in canvas ? canvas.clientWidth : canvas.width,
    height: "clientHeight" in canvas ? canvas.clientHeight : canvas.height,
    dpr: typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5),
  },
  cache?: Map<string, SoftwareRasterCacheEntry>,
) {
  const dpr = viewport.dpr;
  const width = Math.max(1, Math.round(viewport.width * dpr));
  const height = Math.max(1, Math.round(viewport.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  context.clearRect(0, 0, width, height);
  const radians = Math.PI / 180;
  const az = camera.azimuthDeg * radians;
  const el = camera.elevationDeg * radians;
  const forward = normalize([Math.cos(el) * Math.sin(az), -Math.cos(el) * Math.cos(az), -Math.sin(el)]);
  const target: V3 = [0, 0, camera.targetZ];
  const origin: V3 = [target[0] - forward[0] * camera.distance, target[1] - forward[1] * camera.distance, target[2] - forward[2] * camera.distance];
  const right = normalize(cross(forward, [0, 0, 1]));
  const up = normalize(cross(right, forward));
  const spread = Math.tan(camera.verticalFovDeg * radians * 0.5);

  for (const registration of instances) {
    if (registration.visible === false) continue;
    const rect = registration.rect;
    const viewportWidth = Math.max(1, Math.round(rect.width * dpr));
    const viewportHeight = Math.max(1, Math.round(rect.height * dpr));
    const cacheKey = registration.id;
    const signature = cacheKey ? JSON.stringify([
      rect.width, rect.height, registration.widthUnits, registration.material,
      registration.legendUv, camera, pixelStep, dpr,
    ]) : "";
    const cached = cacheKey ? cache?.get(cacheKey) : undefined;
    if (cached?.signature === signature) {
      context.drawImage(cached.surface, rect.x * dpr - cached.guardLeft, rect.y * dpr - cached.guardTop);
      continue;
    }
    const widthUnits = registration.widthUnits ?? rect.width / Math.max(rect.height, 1);
    const aspect = viewportWidth / viewportHeight;
    const projectBase = (vertex: Vertex): Projected => {
      const relative = sub(vertex.p, origin);
      const depth = dot(relative, forward);
      return {
        ...vertex,
        x: (dot(relative, right) / (depth * spread * aspect) * 0.5 + 0.5) * viewportWidth,
        y: (-dot(relative, up) / (depth * spread) * 0.5 + 0.5) * viewportHeight,
        depth,
      };
    };
    const mesh = buildMesh(widthUnits);
    const lightSamples: Array<[number, number]> = [
      [0, 0], [-0.62, -0.08], [0.61, 0.12], [-0.08, -0.63], [0.1, 0.62],
      [-0.43, -0.44], [0.45, -0.4], [-0.4, 0.46], [0.42, 0.43],
      [-0.22, -0.18], [0.24, -0.2], [-0.2, 0.23], [0.21, 0.2],
    ];
    const boundPoints = mesh.flatMap((triangle) => triangle.map(projectBase));
    for (const [sampleX, sampleY] of lightSamples) {
      const lightPoint: V3 = [K.lightX + sampleX * K.lightRadius, K.lightY + sampleY * K.lightRadius, K.lightZ];
      for (let segment = 0; segment < 64; segment += 1) {
        const p = ringPoint(1, segment / 64 * TAU, widthUnits);
        const t = -lightPoint[2] / (p[2] - lightPoint[2]);
        boundPoints.push(projectBase({ p: [
          lightPoint[0] + (p[0] - lightPoint[0]) * t,
          lightPoint[1] + (p[1] - lightPoint[1]) * t,
          0,
        ], n: [0, 0, 1] }));
      }
    }
    const minX = Math.min(...boundPoints.map((point) => point.x));
    const maxX = Math.max(...boundPoints.map((point) => point.x));
    const minY = Math.min(...boundPoints.map((point) => point.y));
    const maxY = Math.max(...boundPoints.map((point) => point.y));
    const guardLeft = Math.max(2, Math.ceil(-minX) + 2);
    const guardRight = Math.max(2, Math.ceil(maxX - viewportWidth) + 2);
    const guardTop = Math.max(2, Math.ceil(-minY) + 2);
    const guardBottom = Math.max(2, Math.ceil(maxY - viewportHeight) + 2);
    const rw = viewportWidth + guardLeft + guardRight;
    const rh = viewportHeight + guardTop + guardBottom;
    const project = (vertex: Vertex): Projected => {
      const projected = projectBase(vertex);
      return { ...projected, x: projected.x + guardLeft, y: projected.y + guardTop };
    };
    const image = context.createImageData(rw, rh);
    const depths = new Float32Array(rw * rh);
    depths.fill(Number.POSITIVE_INFINITY);
    const shadowCoverage = new Uint8Array(rw * rh);
    for (const [sampleX, sampleY] of lightSamples) {
      const sampleMask = new Uint8Array(rw * rh);
      const lightPoint: V3 = [K.lightX + sampleX * K.lightRadius, K.lightY + sampleY * K.lightRadius, K.lightZ];
      const ring = Array.from({ length: 64 }, (_, segment) => {
        const p = ringPoint(1, segment / 64 * TAU, widthUnits);
        const t = -lightPoint[2] / (p[2] - lightPoint[2]);
        const ground: V3 = [
          lightPoint[0] + (p[0] - lightPoint[0]) * t,
          lightPoint[1] + (p[1] - lightPoint[1]) * t,
          0,
        ];
        return project({ p: ground, n: [0, 0, 1] });
      });
      const centerPoint: V3 = [
        ring.reduce((sum, vertex) => sum + vertex.p[0], 0) / ring.length,
        ring.reduce((sum, vertex) => sum + vertex.p[1], 0) / ring.length,
        0,
      ];
      const center = project({ p: centerPoint, n: [0, 0, 1] });
      for (let segment = 0; segment < ring.length; segment += 1) {
        const a = center; const b = ring[segment]; const c = ring[(segment + 1) % ring.length];
        const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if (Math.abs(area) < 0.0001) continue;
        const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
        const maxX = Math.min(rw - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
        const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
        const maxY = Math.min(rh - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
        for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
          const px = x + 0.5; const py = y + 0.5;
          const wa = ((b.x - px) * (c.y - py) - (b.y - py) * (c.x - px)) / area;
          const wb = ((c.x - px) * (a.y - py) - (c.y - py) * (a.x - px)) / area;
          const wc = 1 - wa - wb;
          if (wa >= -0.0001 && wb >= -0.0001 && wc >= -0.0001) sampleMask[y * rw + x] = 1;
        }
      }
      for (let index = 0; index < sampleMask.length; index += 1) shadowCoverage[index] += sampleMask[index];
    }
    for (let index = 0; index < shadowCoverage.length; index += 1) {
      if (!shadowCoverage[index]) continue;
      image.data[index * 4 + 3] = Math.round(shadowCoverage[index] / lightSamples.length * 44);
    }
    for (const triangle of mesh) {
      const a = project(triangle[0]); const b = project(triangle[1]); const c = project(triangle[2]);
      const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      if (Math.abs(area) < 0.0001) continue;
      const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
      const maxX = Math.min(rw - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
      const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
      const maxY = Math.min(rh - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
      for (let y = minY; y <= maxY; y += pixelStep) for (let x = minX; x <= maxX; x += pixelStep) {
        const px = x + 0.5; const py = y + 0.5;
        const wa = ((b.x - px) * (c.y - py) - (b.y - py) * (c.x - px)) / area;
        const wb = ((c.x - px) * (a.y - py) - (c.y - py) * (a.x - px)) / area;
        const wc = 1 - wa - wb;
        if (wa < -0.0001 || wb < -0.0001 || wc < -0.0001) continue;
        const depth = wa * a.depth + wb * b.depth + wc * c.depth;
        const index = y * rw + x;
        if (depth >= depths[index]) continue;
        const p: V3 = [wa * a.p[0] + wb * b.p[0] + wc * c.p[0], wa * a.p[1] + wb * b.p[1] + wc * c.p[1], wa * a.p[2] + wb * b.p[2] + wc * c.p[2]];
        const n = normalize([wa * a.n[0] + wb * b.n[0] + wc * c.n[0], wa * a.n[1] + wb * b.n[1] + wc * c.n[1], wa * a.n[2] + wb * b.n[2] + wc * c.n[2]]);
        const color = shade(p, n, registration, atlas, origin);
        for (let by = 0; by < pixelStep && y + by < rh; by += 1) {
          for (let bx = 0; bx < pixelStep && x + bx < rw; bx += 1) {
            const blockIndex = (y + by) * rw + x + bx;
            if (depth >= depths[blockIndex]) continue;
            depths[blockIndex] = depth;
            const offset = blockIndex * 4;
            image.data[offset] = color[0]; image.data[offset + 1] = color[1]; image.data[offset + 2] = color[2]; image.data[offset + 3] = 255;
          }
        }
      }
    }
    if (typeof OffscreenCanvas !== "undefined") {
      const surface = new OffscreenCanvas(image.width, image.height);
      const surfaceContext = surface.getContext("2d", { alpha: true });
      if (surfaceContext) {
        surfaceContext.putImageData(image, 0, 0);
        if (cacheKey && cache) cache.set(cacheKey, { signature, surface, guardLeft, guardTop });
        context.drawImage(surface, rect.x * dpr - guardLeft, rect.y * dpr - guardTop);
        continue;
      }
    }
    context.putImageData(image, Math.round(rect.x * dpr) - guardLeft, Math.round(rect.y * dpr) - guardTop);
  }
}
