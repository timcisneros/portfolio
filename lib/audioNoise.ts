export type SeamlessNoiseOptions = {
  crossfadeSeconds?: number;
  durationSeconds: number;
  random?: () => number;
  sampleRate: number;
  smoothing: number;
};

/**
 * Builds colored noise whose loop boundary is an ordinary adjacent pair from
 * one longer stochastic sequence. The extra tail is folded into the beginning
 * of the loop, so neither the value nor the local slope is forced through an
 * artificial endpoint.
 */
export function createSeamlessColoredNoiseSamples({
  crossfadeSeconds = 0.35,
  durationSeconds,
  random = Math.random,
  sampleRate,
  smoothing,
}: SeamlessNoiseOptions) {
  const boundedSampleRate = Math.max(1, Math.floor(sampleRate));
  const loopLength = Math.max(2, Math.floor(durationSeconds * boundedSampleRate));
  const overlapLength = Math.max(
    1,
    Math.min(
      Math.floor(loopLength / 3),
      Math.floor(crossfadeSeconds * boundedSampleRate),
    ),
  );
  const boundedSmoothing = Math.max(0, Math.min(0.995, smoothing));
  const raw = new Float32Array(loopLength + overlapLength);
  let previous = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const white = random() * 2 - 1;
    previous = previous * boundedSmoothing + white * (1 - boundedSmoothing);
    raw[index] = previous;
  }

  const loop = raw.slice(0, loopLength);
  for (let index = 0; index < overlapLength; index += 1) {
    const fraction = overlapLength === 1 ? 1 : index / (overlapLength - 1);
    const blend = fraction * fraction * (3 - 2 * fraction);
    loop[index] = raw[loopLength + index] * (1 - blend) + raw[index] * blend;
  }
  return loop;
}
