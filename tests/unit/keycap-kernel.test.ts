import { describe, expect, it } from "vitest";
import { KEYCAP_KERNEL as K } from "../../lib/keycap/kernel";
import { KEYCAP_WGSL } from "../../lib/keycap/gpu/shader";
import { evaluateKeycapFaceHeight, evaluateKeycapField } from "../../lib/keycap/gpu/softwareRasterizer";

describe("canonical keycap kernel", () => {
  it("defines one continuous broad dish from center to the complete face edge", () => {
    expect(evaluateKeycapFaceHeight(0, 0, 1)).toBeCloseTo(K.faceCenterHeight, 6);
    expect(evaluateKeycapFaceHeight(K.faceHalf, 0, 1)).toBeCloseTo(K.faceEdgeHeight, 6);
    expect(evaluateKeycapFaceHeight(K.faceHalf, K.faceHalf, 1)).toBeGreaterThan(K.faceEdgeHeight);
  });

  it("keeps the face inside the flared base and the solid field continuous", () => {
    expect(K.faceHalf).toBeLessThan(K.baseHalf);
    expect(K.faceExponentEdge).toBeLessThan(K.baseExponent);
    const samples = Array.from({ length: 65 }, (_, index) => evaluateKeycapField([0, 0, index / 64 * K.faceEdgeHeight], 1));
    for (let index = 1; index < samples.length; index += 1) {
      expect(Math.abs(samples[index] - samples[index - 1])).toBeLessThan(0.02);
    }
  });

  it("injects canonical dimensions and fillets into generated WGSL", () => {
    for (const value of [K.faceHalf, K.baseHalf, K.faceCenterHeight, K.faceEdgeHeight, K.upperFillet, K.baseFillet, K.normalEpsilon]) {
      expect(KEYCAP_WGSL).toContain(String(value));
    }
  });
});
