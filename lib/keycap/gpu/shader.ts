import { KEYCAP_KERNEL as K } from "../kernel";

/**
 * One continuous implicit low-profile keycap. No face/wall/base draw layers
 * exist: the closest zero of `keyField` supplies position and normal to every
 * material and lighting operation.
 */
export const KEYCAP_WGSL = /* wgsl */ `
struct Scene {
  viewport : vec2f,
  dpr : f32,
  time : f32,
  camera : vec4f,       // azimuth radians, elevation radians, distance, fov radians
  targetData : vec4f,   // xyz target, frame
  light : vec4f,        // xyz world-space center, radius
};

struct Instance {
  rect : vec4f,         // device pixel x, y, width, height
  color : vec4f,        // rgb sRGB, opacity
  shape : vec4f,        // width units, roughness, ambient, visible
  legendRect : vec4f,
  legendColor : vec4f,
};

@group(0) @binding(0) var<uniform> scene : Scene;
@group(0) @binding(1) var<storage, read> instances : array<Instance>;
@group(0) @binding(2) var legendAtlas : texture_2d<f32>;
@group(0) @binding(3) var legendSampler : sampler;

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) pixel : vec2f,
  @location(1) @interpolate(flat) instanceIndex : u32,
};

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex : u32,
) -> VertexOut {
  let corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
  );
  let instance = instances[instanceIndex];
  let corner = corners[vertexIndex];
  let pixel = instance.rect.xy + corner * instance.rect.zw;
  let ndc = vec2f(
    pixel.x / scene.viewport.x * 2.0 - 1.0,
    1.0 - pixel.y / scene.viewport.y * 2.0
  );
  var output : VertexOut;
  output.position = vec4f(ndc, 0.0, 1.0);
  output.pixel = pixel;
  output.instanceIndex = instanceIndex;
  return output;
}

fn smax(a : f32, b : f32, k : f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
  return mix(b, a, h) + k * h * (1.0 - h);
}

fn superRadius(p : vec2f, halfSize : vec2f, exponent : f32) -> f32 {
  let q = abs(p) / max(halfSize, vec2f(0.0001));
  return pow(pow(q.x, exponent) + pow(q.y, exponent), 1.0 / exponent);
}

fn faceRadius(p : vec2f, widthUnits : f32) -> f32 {
  let halfSize = vec2f(${K.faceHalf} * widthUnits, ${K.faceHalf});
  // The molded face is a squircle, not an ellipse.  Its level sets become
  // progressively rounder toward the centre, matching the broad shallow dish
  // rather than producing a circular dimple or diagonal faceting.
  let first = superRadius(p, halfSize, ${K.faceExponentEdge});
  let exponent = mix(${K.faceExponentCenter}, ${K.faceExponentEdge}, smoothstep(0.08, 0.82, first));
  return superRadius(p, halfSize, exponent);
}

fn faceHeight(p : vec2f, widthUnits : f32) -> f32 {
  let r = clamp(faceRadius(p, widthUnits), 0.0, 1.12);
  // Air-style keycaps have a broad, extremely smooth dish.  The depression
  // reaches the complete face boundary; it is not a radial highlight painted
  // over a flat top.  Zero first derivative at both centre and edge prevents
  // a visible inner ring.
  let t = clamp(r, 0.0, 1.0);
  let broad = t * t * (3.0 - 2.0 * t);
  let dishHeight = mix(${K.faceCenterHeight}, ${K.faceEdgeHeight}, broad);
  // The four molded corners sit fractionally high without becoming a lip.
  let corner = pow(abs(p.x) / max(${K.faceHalf} * widthUnits, 0.001), 8.0)
    * pow(abs(p.y) / ${K.faceHalf}, 8.0);
  return dishHeight + ${K.cornerLift} * corner;
}

fn keyField(p : vec3f, widthUnits : f32) -> f32 {
  let zRatio = clamp(p.z / ${K.faceEdgeHeight}, 0.0, 1.0);
  let baseHalf = vec2f(${K.baseHalf} * widthUnits, ${K.baseHalf});
  let topHalf = vec2f(${K.faceHalf} * widthUnits, ${K.faceHalf});
  // A low-profile key is still a tapered shell.  Keeping the shoulder nearly
  // linear and tightening only at the two molded radii prevents the squeezed
  // pillow silhouette of the previous field.
  let wallT = smoothstep(${K.wallBlendStart}, ${K.wallBlendEnd}, p.z);
  let halfSize = mix(baseHalf, topHalf, wallT);
  // The base is a tighter rounded rectangle; the face is the more pronounced
  // squircle visible in the reference caps.
  let exponent = mix(${K.baseExponent}, ${K.faceExponentEdge}, smoothstep(${K.wallExponentStart}, ${K.wallExponentEnd}, p.z));
  let lateral = (superRadius(p.xy, halfSize, exponent) - 1.0) * min(halfSize.x, halfSize.y);
  let top = p.z - faceHeight(p.xy, widthUnits);
  let bottom = -p.z;
  // These are molded fillet radii in the same continuous field.  The harder
  // face shoulder is deliberate; it supplies the defined plastic edge without
  // drawing an outline or constructing a second surface.
  let upper = smax(lateral, top, ${K.upperFillet});
  return smax(upper, bottom, ${K.baseFillet});
}

fn fieldNormal(p : vec3f, widthUnits : f32) -> vec3f {
  let e = ${K.normalEpsilon};
  return normalize(vec3f(
    keyField(p + vec3f(e, 0.0, 0.0), widthUnits) - keyField(p - vec3f(e, 0.0, 0.0), widthUnits),
    keyField(p + vec3f(0.0, e, 0.0), widthUnits) - keyField(p - vec3f(0.0, e, 0.0), widthUnits),
    keyField(p + vec3f(0.0, 0.0, e), widthUnits) - keyField(p - vec3f(0.0, 0.0, e), widthUnits)
  ));
}

fn intersectBounds(ro : vec3f, rd : vec3f, widthUnits : f32) -> vec2f {
  let lo = vec3f(-0.54 * widthUnits, -0.54, -0.03);
  let hi = vec3f( 0.54 * widthUnits,  0.54,  0.46);
  let inverse = 1.0 / select(vec3f(0.000001), rd, abs(rd) > vec3f(0.000001));
  let a = (lo - ro) * inverse;
  let b = (hi - ro) * inverse;
  let near3 = min(a, b);
  let far3 = max(a, b);
  return vec2f(max(max(near3.x, near3.y), near3.z), min(min(far3.x, far3.y), far3.z));
}

fn intersectKey(ro : vec3f, rd : vec3f, widthUnits : f32) -> f32 {
  let bounds = intersectBounds(ro, rd, widthUnits);
  if (bounds.x > bounds.y || bounds.y < 0.0) { return -1.0; }
  var t = max(bounds.x, 0.0);
  var previousT = t;
  var previousD = keyField(ro + rd * t, widthUnits);
  for (var step = 0; step < 72; step += 1) {
    let p = ro + rd * t;
    let d = keyField(p, widthUnits);
    if (abs(d) < 0.00035) { return t; }
    if (d < 0.0 && previousD > 0.0) {
      var low = previousT;
      var high = t;
      for (var refine = 0; refine < 7; refine += 1) {
        let middle = (low + high) * 0.5;
        if (keyField(ro + rd * middle, widthUnits) > 0.0) { low = middle; } else { high = middle; }
      }
      return (low + high) * 0.5;
    }
    previousT = t;
    previousD = d;
    // keyField is a continuous modeling field, not an exact Euclidean SDF.
    // A conservative bound is required at grazing incidence or a ray can jump
    // across the shallow face/shoulder interval and expose the background.
    t += max(abs(d) * 0.60, 0.00042);
    if (t > bounds.y) { break; }
  }
  return -1.0;
}

fn occludedKey(ro : vec3f, rd : vec3f, maxDistance : f32, widthUnits : f32) -> bool {
  let bounds = intersectBounds(ro, rd, widthUnits);
  if (bounds.x > bounds.y || bounds.y < 0.0) { return false; }
  var t = max(bounds.x, 0.0);
  let end = min(bounds.y, maxDistance);
  var previousD = keyField(ro + rd * t, widthUnits);
  for (var step = 0; step < 28; step += 1) {
    let d = keyField(ro + rd * t, widthUnits);
    if (d < 0.0008 || (d < 0.0 && previousD > 0.0)) { return true; }
    previousD = d;
    t += max(abs(d) * 0.76, 0.0008);
    if (t > end) { break; }
  }
  return false;
}

fn cameraRay(pixel : vec2f, rect : vec4f) -> mat2x3f {
  let az = scene.camera.x;
  let el = scene.camera.y;
  let forward = normalize(vec3f(cos(el) * sin(az), -cos(el) * cos(az), -sin(el)));
  let lookTarget = scene.targetData.xyz;
  let origin = lookTarget - forward * scene.camera.z;
  let right = normalize(cross(forward, vec3f(0.0, 0.0, 1.0)));
  let up = normalize(cross(right, forward));
  let uv = ((pixel - rect.xy) / rect.zw) * 2.0 - 1.0;
  let viewAspect = rect.z / max(rect.w, 1.0);
  let spread = tan(scene.camera.w * 0.5);
  let direction = normalize(forward + right * uv.x * spread * viewAspect - up * uv.y * spread);
  return mat2x3f(origin, direction);
}

fn visibilityToLight(point : vec3f, widthUnits : f32) -> f32 {
  var visible = 0.0;
  let disk = array<vec2f, 3>(vec2f(0.0), vec2f(-0.48, -0.28), vec2f(0.50, 0.32));
  for (var sample = 0; sample < 3; sample += 1) {
    let lightPoint = scene.light.xyz + vec3f(disk[sample] * scene.light.w, 0.0);
    let delta = lightPoint - point;
    let distance = length(delta);
    let direction = delta / distance;
    let blocked = occludedKey(point + direction * 0.003, direction, distance, widthUnits);
    visible += select(1.0, 0.0, blocked);
  }
  return visible / 3.0;
}

fn linearFromSrgb(c : vec3f) -> vec3f {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3f(2.4)), step(vec3f(0.04045), c));
}

fn srgbFromLinear(c : vec3f) -> vec3f {
  let x = max(c, vec3f(0.0));
  return mix(x * 12.92, 1.055 * pow(x, vec3f(1.0 / 2.4)) - 0.055, step(vec3f(0.0031308), x));
}

@fragment fn fragmentMain(input : VertexOut) -> @location(0) vec4f {
  let instance = instances[input.instanceIndex];
  if (instance.shape.w < 0.5) { discard; }
  let ray = cameraRay(input.pixel, instance.rect);
  let ro = ray[0];
  let rd = ray[1];
  let widthUnits = max(instance.shape.x, 0.35);
  let hit = intersectKey(ro, rd, widthUnits);
  if (hit > 0.0) {
    let p = ro + rd * hit;
    let n = fieldNormal(p, widthUnits);
    let lightDirection = normalize(scene.light.xyz - p);
    let viewDirection = normalize(ro - p);
    let halfVector = normalize(lightDirection + viewDirection);
    let ndl = max(dot(n, lightDirection), 0.0);
    let ndv = max(dot(n, viewDirection), 0.001);
    let ndh = max(dot(n, halfVector), 0.0);
    let vdh = max(dot(viewDirection, halfVector), 0.0);
    let roughness = clamp(instance.shape.y, 0.20, 0.98);
    let visibility = visibilityToLight(p + n * 0.002, widthUnits);
    // The legend is not a plane. Its UV comes from this exact surface hit, so
    // dish height, perspective, occlusion and lighting are necessarily shared.
    // Camera-right is world -X and the molded legend's top points toward
    // world -Y. This object-space orientation keeps the texture upright while
    // the camera orbits; it is not a compensating screen-space transform.
    let legendWidthUnits = min(widthUnits, 3.4);
    let surfaceUv = vec2f(0.5 - p.x / (${K.faceHalf * 2} * legendWidthUnits), 0.5 + p.y / ${K.faceHalf * 2});
    let atlasUv = instance.legendRect.xy + surfaceUv * instance.legendRect.zw;
    let inLegendSpan = step(abs(p.x), ${K.faceHalf} * legendWidthUnits);
    let inFace = step(faceRadius(p.xy, widthUnits), 1.008) * step(0.32, n.z) * inLegendSpan;
    let hasLegend = step(0.000001, instance.legendRect.z * instance.legendRect.w);
    let incidence = max(dot(n, viewDirection), 0.05);
    let legendLod = clamp(log2(1.0 / incidence) * 0.9, 0.0, 2.0);
    let legendSample = textureSampleLevel(legendAtlas, legendSampler, atlasUv, legendLod);
    let legendCoverage = legendSample.r * inFace * hasLegend;
    let plastic = linearFromSrgb(instance.color.rgb);
    let legendInk = linearFromSrgb(instance.legendColor.rgb);
    let base = mix(plastic, legendInk, legendCoverage);
    // Energy-conserving dielectric GGX over diffuse matte plastic.  The
    // vertical-shell term is indirect room/page bounce, evaluated from the
    // same normal—not a painted wall gradient.
    let alpha = roughness * roughness;
    let alpha2 = alpha * alpha;
    let distributionDenominator = 3.14159265 * pow(ndh * ndh * (alpha2 - 1.0) + 1.0, 2.0);
    let distribution = alpha2 / max(distributionDenominator, 0.00001);
    let geometryK = pow(roughness + 1.0, 2.0) / 8.0;
    let geometryV = ndv / (ndv * (1.0 - geometryK) + geometryK);
    let geometryL = ndl / (ndl * (1.0 - geometryK) + geometryK);
    let fresnel = vec3f(0.04) + vec3f(0.96) * pow(1.0 - vdh, 5.0);
    let specular = distribution * geometryV * geometryL * fresnel / max(4.0 * ndv * max(ndl, 0.001), 0.001);
    let wrapDiffuse = max((dot(n, lightDirection) + 0.16) / 1.16, 0.0);
    let directDiffuse = base * (vec3f(1.0) - fresnel) * 0.76 * mix(ndl, wrapDiffuse, 0.14) * visibility;
    let verticalBounce = 0.16 * (1.0 - smoothstep(0.05, 0.82, max(n.z, 0.0)));
    let skyBounce = 0.04 * max(n.z, 0.0);
    let indirect = base * (instance.shape.z + verticalBounce + skyBounce);
    let color = srgbFromLinear(indirect + directDiffuse + specular * ndl * visibility);
    return vec4f(color, instance.color.a);
  }

  // Transparent receiver plane: only the key's physically derived cast shadow
  // is emitted, so the browser may composite normal DOM beneath this island.
  if (abs(rd.z) > 0.00001) {
    let groundT = -ro.z / rd.z;
    if (groundT > 0.0) {
      let ground = ro + rd * groundT;
      let footprint = superRadius(ground.xy, vec2f(0.63 * widthUnits, 0.63), 2.35);
      if (footprint < 1.0) {
        let visibility = visibilityToLight(ground + vec3f(0.0, 0.0, 0.001), widthUnits);
        let alpha = (1.0 - visibility) * 0.22 * smoothstep(1.0, 0.72, footprint);
        return vec4f(0.0, 0.0, 0.0, alpha);
      }
    }
  }
  discard;
  return vec4f(0.0);
}
`;
