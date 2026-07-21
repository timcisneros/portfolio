import { describe, expect, it } from "vitest";
import { createSeamlessColoredNoiseSamples } from "../../lib/audioNoise";

function seededRandom(seed = 0x51f15e) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("seamless colored noise", () => {
  it("keeps the loop boundary inside the source's normal adjacent-step range", () => {
    const samples = createSeamlessColoredNoiseSamples({
      crossfadeSeconds: 0.2,
      durationSeconds: 3,
      random: seededRandom(),
      sampleRate: 8_000,
      smoothing: 0.72,
    });
    let largestInternalStep = 0;
    for (let index = 1; index < samples.length; index += 1) {
      largestInternalStep = Math.max(
        largestInternalStep,
        Math.abs(samples[index] - samples[index - 1]),
      );
    }
    const boundaryStep = Math.abs(samples[0] - samples.at(-1)!);
    expect(samples).toHaveLength(24_000);
    expect(boundaryStep).toBeLessThanOrEqual(largestInternalStep);
  });

  it("is deterministic when supplied a deterministic source", () => {
    const options = {
      durationSeconds: 0.5,
      sampleRate: 1_000,
      smoothing: 0.4,
    } as const;
    const first = createSeamlessColoredNoiseSamples({
      ...options,
      random: seededRandom(42),
    });
    const second = createSeamlessColoredNoiseSamples({
      ...options,
      random: seededRandom(42),
    });
    expect(first).toEqual(second);
  });
});
