import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAR_ENGINE_STYLES } from "../../lib/carEngineStyles";

function readPcmWav(relativeUrl: string) {
  const buffer = readFileSync(join(process.cwd(), "public", relativeUrl));
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
    }
    if (id === "data") {
      dataOffset = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size & 1);
  }
  if (dataOffset < 0 || bitsPerSample !== 16) throw new Error(`Invalid PCM WAV: ${relativeUrl}`);
  const sampleCount = dataSize / 2;
  const samples = new Int16Array(sampleCount);
  let peak = 0;
  let sumSquares = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = buffer.readInt16LE(dataOffset + index * 2);
    peak = Math.max(peak, Math.abs(samples[index]));
    sumSquares += samples[index] * samples[index];
  }
  return {
    bitsPerSample,
    channels,
    peak: peak / 32768,
    rms: Math.sqrt(sumSquares / sampleCount) / 32768,
    samples,
    duration: sampleCount / channels / sampleRate,
    sampleRate,
    seamJump: Math.abs(samples.at(-1)! - samples[0]) / 32768,
    seamSlopeJump: Math.abs(
      (samples.at(-1)! - samples.at(-2)!) - (samples[1] - samples[0]),
    ) / 32768,
  };
}

function windowRms(
  wav: ReturnType<typeof readPcmWav>,
  startSeconds: number,
  endSeconds: number,
) {
  const start = Math.max(0, Math.floor(startSeconds * wav.sampleRate));
  const end = Math.min(wav.samples.length, Math.ceil(endSeconds * wav.sampleRate));
  let sumSquares = 0;
  for (let index = start; index < end; index += 1) {
    const sample = wav.samples[index] / 32768;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / Math.max(1, end - start));
}

function levelDifferenceDb(first: number, second: number) {
  return Math.abs(20 * Math.log10(Math.max(first, 1e-9) / Math.max(second, 1e-9)));
}

describe("engine audio banks", () => {
  it("ships a cycle-coherent worklet without allocating inside the sample loop", () => {
    const source = readFileSync(
      join(process.cwd(), "public", "audio", "engine-cycle-processor.js"),
      "utf8",
    );
    expect(() => new Function(source)).not.toThrow();
    expect(source).toContain('registerProcessor("engine-cycle-processor"');
    expect(source).toContain('automationRate: "k-rate"');
    expect(source).toContain('name: "load"');
    expect(source).toContain('name: "overrun"');
    expect(source).toContain('name: "shift"');
    expect(source).toContain('name: "rpmAcceleration"');
    expect(source).toContain('name: "limiter"');
    expect(source).toContain("this.cylinderGains[cylinderIndex]");
    expect(source).toContain("this.overrunAccumulator");
    expect(source).toContain("this.exhaustPressure");
    expect(source).toContain("upper.referenceRpm / 2.05");
    expect(source).toContain("Math.max(0.72, windowSum)");
    expect(source).toContain("this.combustionPhase");
    expect(source).toContain("const eventMargin = expectedPeriod * 1.5");
    expect(source).toContain("interpolatedSample");
    expect(source).not.toContain("wrappedSample");
    expect(source).not.toContain("nextEventFrame");
    const processBody = source.slice(source.indexOf("process("));
    expect(processBody).not.toMatch(/new (?:Array|Float32Array)/);
  });

  it("renders and hot-swaps RPM-specific combustion-event sources", () => {
    const source = readFileSync(
      join(process.cwd(), "public", "audio", "engine-cycle-processor.js"),
      "utf8",
    );
    let Processor: new (options: unknown) => {
      port: { onmessage?: (event: { data: unknown }) => void };
      sources: Array<{ events: Float32Array }>;
      cylinderGains: Float32Array;
      firingOrder: Int16Array;
      process: (
        inputs: unknown[],
        outputs: Float32Array[][],
        parameters: {
          load?: Float32Array;
          limiter?: Float32Array;
          overrun?: Float32Array;
          rpm: Float32Array;
          rpmAcceleration?: Float32Array;
          shift?: Float32Array;
        },
      ) => boolean;
    };
    class AudioWorkletProcessorMock {
      port = { postMessage: () => undefined } as {
        onmessage?: (event: { data: unknown }) => void;
        postMessage: () => void;
      };
    }
    new Function("AudioWorkletProcessor", "sampleRate", "registerProcessor", source)(
      AudioWorkletProcessorMock,
      48_000,
      (_name: string, definition: typeof Processor) => {
        Processor = definition;
      },
    );
    const samples = Float32Array.from(
      { length: 2_400 },
      (_, index) => Math.sin(index * 0.09) * 0.25,
    );
    const events = Float32Array.from([200, 800, 1_400, 2_000]);
    const processor = new Processor!({
      processorOptions: {
        eventsPerRevolution: 2,
        cylinderCount: 4,
        cylinderGains: [1, 0.98, 1.02, 0.99],
        cylinderTimingMs: [0, 0.04, -0.03, 0.02],
        firingOrder: [0, 2, 3, 1],
        overrunCutStrength: 0.5,
        sources: [{
          events,
          referenceRpm: 2_400,
          samples,
          sourceSampleRate: 48_000,
          startEventIndex: 1,
        }],
      },
    });
    expect(Array.from(processor.sources[0].events)).toEqual([1_400]);
    const firstOutput = new Float32Array(128);
    expect(processor.process([], [[firstOutput]], {
      load: Float32Array.of(0.85),
      limiter: Float32Array.of(0),
      overrun: Float32Array.of(0),
      rpm: Float32Array.of(2_400),
      rpmAcceleration: Float32Array.of(0.7),
      shift: Float32Array.of(0),
    })).toBe(true);
    expect(firstOutput.every(Number.isFinite)).toBe(true);
    expect(Math.max(...firstOutput.map(Math.abs))).toBeGreaterThan(0);
    expect(Array.from(processor.firingOrder)).toEqual([0, 2, 3, 1]);
    expect(Array.from(processor.cylinderGains)).toEqual([
      1,
      expect.closeTo(0.98, 5),
      expect.closeTo(1.02, 5),
      expect.closeTo(0.99, 5),
    ]);

    processor.port.onmessage?.({
      data: {
        cylinderCount: 4,
        cylinderGains: [0.99, 1.01, 0.985, 1.015],
        cylinderTimingMs: [0, -0.02, 0.03, 0.01],
        eventsPerRevolution: 2,
        firingOrder: [0, 3, 1, 2],
        overrunCutStrength: 0.4,
        type: "configuration",
      },
    });
    expect(Array.from(processor.firingOrder)).toEqual([0, 3, 1, 2]);

    processor.port.onmessage?.({
      data: {
        sources: [
          {
            events,
            referenceRpm: 850,
            samples,
            sourceSampleRate: 48_000,
          },
          {
            events,
            referenceRpm: 4_500,
            samples,
            sourceSampleRate: 48_000,
          },
        ],
        type: "sources",
      },
    });
    const blendedOutput = new Float32Array(128);
    expect(processor.process([], [[blendedOutput]], {
      load: Float32Array.of(0.1),
      limiter: Float32Array.of(1),
      overrun: Float32Array.of(0.7),
      rpm: Float32Array.of(2_700),
      rpmAcceleration: Float32Array.of(-0.5),
      shift: Float32Array.of(1),
    })).toBe(true);
    expect(blendedOutput.every(Number.isFinite)).toBe(true);

    let previousSample = blendedOutput.at(-1) ?? 0;
    let maximumAccelerationJump = 0;
    for (let block = 0; block < 80; block += 1) {
      const accelerationOutput = new Float32Array(128);
      const rpm = 900 + (block / 79) * 3_300;
      processor.process([], [[accelerationOutput]], {
        load: Float32Array.of(0.9),
        limiter: Float32Array.of(0),
        overrun: Float32Array.of(0),
        rpm: Float32Array.of(rpm),
        rpmAcceleration: Float32Array.of(0.65),
        shift: Float32Array.of(0),
      });
      accelerationOutput.forEach((sample) => {
        maximumAccelerationJump = Math.max(
          maximumAccelerationJump,
          Math.abs(sample - previousSample),
        );
        previousSample = sample;
      });
    }
    expect(maximumAccelerationJump).toBeLessThan(0.2);
  });

  it("keeps the experimental cycle handoff behind an explicit banked production switch", () => {
    const source = readFileSync(
      join(process.cwd(), "lib", "secretAudio.ts"),
      "utf8",
    );
    expect(source).toContain("const beginRendererHandoff = () =>");
    expect(source).toContain("const bankFade = Float32Array.from");
    expect(source).toContain("const cycleFade = Float32Array.from");
    expect(source).toContain(
      "bankProgramGain.gain.setValueCurveAtTime(bankFade, switchAt, duration)",
    );
    expect(source).toContain(
      "cycleProgramGain.gain.setValueCurveAtTime(cycleFade, switchAt, duration)",
    );
    expect(source).not.toContain("acousticLoad +=");
    expect(source).toContain('parameters.get("rpmAcceleration")');
    expect(source).toContain('parameters.get("limiter")');
    expect(source).toContain("const ignitionDuration = coldStart && startupBuffer");
    expect(source).not.toContain("gearPrimarySource");
    expect(source).not.toContain("gearSecondarySource");
    expect(source).not.toContain("reverseOscillator");
    expect(source).toContain("const normalizationGain = bands[index].gain");
    expect(source).toContain("const normalizationGain = band.gain");
    expect(source).toContain("master.connect(masterLimiter)");
    expect(source).toContain("masterLimiter.connect(analyser)");
    expect(source).toContain("limiterReductionDb: masterLimiter?.reduction ?? 0");
    expect(source).toContain("getCarIgnitionThrottleAuthority(");
    expect(source).toContain("getCarEngineDirectivity()");
    expect(source).toContain("carEngineDirectivityGains.add(engineDirectivityGain)");
    expect(source).toContain("createCarSpatialEmitter(audio.context, audio.master, 0.12)");
    expect(source).toContain("createCarSpatialEmitter(audio.context, audio.master, -0.13)");
    expect(source).toContain("intakeFilter.connect(intakeGain).connect(intakeEmitter.panner)");
    expect(source).toContain("overrunFilter.connect(overrunGain).connect(exhaustEmitter.panner)");
    expect(source).not.toContain("intakeFilter.connect(intakeGain).connect(engineMix)");
    expect(source).not.toContain("overrunFilter.connect(overrunGain).connect(engineMix)");
    expect(source).toContain(
      'const ENGINE_RENDERER_MODE: "banked" | "cycle-coherent" = "banked"',
    );
  });

  it.each(
    Object.values(CAR_ENGINE_STYLES).flatMap((style) => (
      style.samples.rpmBands.map((band) => [style.id, band.url] as const)
    )),
  )("%s bank %s is loop-safe mono PCM with headroom", (_variant, url) => {
    const wav = readPcmWav(url.replace(/^\//, ""));
    expect(wav.channels).toBe(1);
    expect(wav.sampleRate).toBe(48_000);
    expect(wav.bitsPerSample).toBe(16);
    expect(wav.peak).toBeGreaterThan(0.15);
    expect(wav.peak).toBeLessThan(0.5);
    expect(wav.seamJump).toBeLessThan(0.04);
    expect(wav.seamSlopeJump).toBeLessThan(0.04);
  });

  it.each([
    "audio/engine-startup.wav",
    "audio/engine-shutdown.wav",
  ])("%s is a compact mono PCM lifecycle recording with headroom", (url) => {
    const wav = readPcmWav(url);
    expect(wav.channels).toBe(1);
    expect(wav.sampleRate).toBe(48_000);
    expect(wav.bitsPerSample).toBe(16);
    expect(wav.peak).toBeGreaterThan(0.08);
    expect(wav.peak).toBeLessThan(0.8);
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$id source gains normalize driving banks to the matched idle",
    (style) => {
      const [idle, ...drivingBands] = style.samples.rpmBands;
      const idleWav = readPcmWav(idle.url.replace(/^\//, ""));
      const idleLevel = idleWav.rms * idle.gain;
      drivingBands.forEach((band) => {
        const wav = readPcmWav(band.url.replace(/^\//, ""));
        const differenceDb = 20 * Math.log10((wav.rms * band.gain) / idleLevel);
        expect(Math.abs(differenceDb)).toBeLessThan(0.35);
      });
    },
  );

  it("keeps lifecycle handoff windows level-compatible with the matched idle", () => {
    const startup = readPcmWav("audio/engine-startup.wav");
    const idle = readPcmWav("audio/engine-natural-idle.wav");
    const shutdown = readPcmWav("audio/engine-shutdown.wav");
    const idleReference = windowRms(idle, 0, 0.2);
    const startupHandoff = windowRms(startup, 0.9, 1.1);
    const shutdownEntry = windowRms(shutdown, 0, 0.2);

    expect(levelDifferenceDb(startupHandoff, idleReference)).toBeLessThan(3.5);
    expect(levelDifferenceDb(shutdownEntry, idleReference)).toBeLessThan(2);
  });

});
