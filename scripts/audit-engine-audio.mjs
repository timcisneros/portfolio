import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const audioDirectory = join(process.cwd(), "public", "audio");
const lifecycleFiles = new Set(["engine-startup.wav", "engine-shutdown.wav"]);
const files = readdirSync(audioDirectory)
  .filter((name) => /^engine-(?:startup|shutdown|natural-idle|(?:city|rally|taxi)-(?:mid|high|load-(?:light|medium|full)-(?:low|mid|high)))\.wav$/.test(name))
  .sort();

function inspectPcmWav(path) {
  const buffer = readFileSync(path);
  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (id === "data") {
      dataOffset = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size & 1);
  }
  if (dataOffset < 0 || bitsPerSample !== 16) throw new Error(`Unsupported PCM WAV: ${path}`);

  const sampleCount = dataSize / 2;
  let peak = 0;
  let sum = 0;
  let sumSquares = 0;
  const sample = (index) => buffer.readInt16LE(dataOffset + index * 2) / 32768;
  for (let index = 0; index < sampleCount; index += 1) {
    const value = sample(index);
    peak = Math.max(peak, Math.abs(value));
    sum += value;
    sumSquares += value * value;
  }
  const first = sample(0);
  const second = sample(1);
  const penultimate = sample(sampleCount - 2);
  const last = sample(sampleCount - 1);
  return {
    bitsPerSample,
    channels,
    dc: sum / sampleCount,
    duration: sampleCount / channels / sampleRate,
    peak,
    rms: Math.sqrt(sumSquares / sampleCount),
    sampleRate,
    seamJump: Math.abs(last - first),
    seamSlopeJump: Math.abs((last - penultimate) - (second - first)),
    windowRms(startSeconds, endSeconds) {
      const start = Math.max(0, Math.floor(startSeconds * sampleRate * channels));
      const end = Math.min(
        sampleCount,
        Math.ceil(endSeconds * sampleRate * channels),
      );
      let windowSumSquares = 0;
      for (let index = start; index < end; index += 1) {
        const value = sample(index);
        windowSumSquares += value * value;
      }
      return Math.sqrt(windowSumSquares / Math.max(1, end - start));
    },
  };
}

const failures = [];
const metricsByName = new Map();
const rows = files.map((name) => {
  const metrics = inspectPcmWav(join(audioDirectory, name));
  metricsByName.set(name, metrics);
  if (metrics.channels !== 1) failures.push(`${name}: expected mono`);
  if (metrics.sampleRate !== 48_000) failures.push(`${name}: expected 48 kHz`);
  if (metrics.bitsPerSample !== 16) failures.push(`${name}: expected 16-bit PCM`);
  if (metrics.peak >= 0.98) failures.push(`${name}: insufficient peak headroom`);
  if (Math.abs(metrics.dc) >= 0.01) failures.push(`${name}: excessive DC offset`);
  if (!lifecycleFiles.has(name)) {
    if (metrics.seamJump >= 0.04) failures.push(`${name}: loop boundary jumps`);
    if (metrics.seamSlopeJump >= 0.04) failures.push(`${name}: loop slope jumps`);
  }
  return {
    file: basename(name),
    seconds: metrics.duration.toFixed(3),
    peakDb: (20 * Math.log10(metrics.peak)).toFixed(1),
    rmsDb: (20 * Math.log10(metrics.rms)).toFixed(1),
    seam: metrics.seamJump.toFixed(4),
  };
});

const idleMetrics = metricsByName.get("engine-natural-idle.wav");
const startupMetrics = metricsByName.get("engine-startup.wav");
const shutdownMetrics = metricsByName.get("engine-shutdown.wav");
if (idleMetrics && startupMetrics && shutdownMetrics) {
  const idleReference = idleMetrics.windowRms(0, 0.2);
  const startupHandoff = startupMetrics.windowRms(0.9, 1.1);
  const shutdownEntry = shutdownMetrics.windowRms(0, 0.2);
  const differenceDb = (first, second) => Math.abs(
    20 * Math.log10(Math.max(first, 1e-9) / Math.max(second, 1e-9)),
  );
  const startupDifferenceDb = differenceDb(startupHandoff, idleReference);
  const shutdownDifferenceDb = differenceDb(shutdownEntry, idleReference);
  if (startupDifferenceDb >= 3.5) {
    failures.push("engine-startup.wav: idle handoff level differs by 3.5 dB or more");
  }
  if (shutdownDifferenceDb >= 2) {
    failures.push("engine-shutdown.wav: idle entry level differs by 2 dB or more");
  }
  console.log(
    `Lifecycle entry deltas: startup ${startupDifferenceDb.toFixed(2)} dB, shutdown ${shutdownDifferenceDb.toFixed(2)} dB`,
  );
}

console.table(rows);
if (failures.length) {
  failures.forEach((failure) => console.error(`Audio audit: ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Audio audit passed for ${rows.length} engine assets.`);
}
