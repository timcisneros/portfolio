import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "scripts/audit-engine-source.mjs"),
  "utf8",
);

function createPcmWav(seconds: number, seed: number) {
  const sampleRate = 44_100;
  const sampleCount = Math.ceil(seconds * sampleRate);
  const buffer = Buffer.alloc(44 + sampleCount * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(sampleCount * 2, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    buffer.writeInt16LE(((index * (seed * 2 + 1)) % 511) - 255, 44 + index * 2);
  }
  return buffer;
}

function writeSource(root: string, name: string, seconds: number, seed: number) {
  const buffer = createPcmWav(seconds, seed);
  writeFileSync(join(root, name), buffer);
  return {
    file: name,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

describe("engine source quarantine audit contract", () => {
  it("allows only commercial-safe source licenses", () => {
    expect(source).toContain('["CC0-1.0", "CC-BY-4.0", "PDM-1.0"]');
    expect(source).toContain("noncommercial licenses are rejected");
    expect(source).toContain("licenseUrl does not match");
    expect(source).not.toMatch(/SAFE_LICENSES[^;]+CC-BY-NC/);
  });

  it("keeps originals quarantined and lossless", () => {
    expect(source).toContain("must remain outside public/");
    expect(source).toContain("only original lossless WAV sources are accepted");
    expect(source).toContain("source escapes the quarantined manifest directory");
    expect(source).toContain("symlink escapes the quarantined manifest directory");
    expect(source).toContain("sha256 does not match");
  });

  it("requires a genuine documented RPM/load matrix", () => {
    expect(source).toContain('manifest.schemaVersion !== 2');
    expect(source).toContain("at least two independently documented load programs");
    expect(source).toContain("at least three steady RPM bands");
    expect(source).toContain("RPM grid must match the first load program exactly");
    expect(source).toContain("capture window overlaps audio already used by another source point");
    expect(source).toContain("source-rpm-torque-metadata");
  });

  it("requires operating calibration and all three synchronized perspectives", () => {
    expect(source).toContain("calibration.maximumTorqueRpm must exceed idleRpm");
    expect(source).toContain("calibration.maximumPowerRpm must exceed maximumTorqueRpm");
    expect(source).toContain("RPM grid must cover both the documented torque and power peaks");
    expect(source).toContain('["exterior", "intake", "exhaust"]');
    expect(source).toContain("recording.microphonePerspectives");
    expect(source).toContain("band.stems?.[perspective]");
  });

  it("requires matched lifecycle and driving transients", () => {
    expect(source).toContain('["startup", "shutdown"]');
    expect(source).toContain('"overrun-fuel-cut"');
    expect(source).toContain('"shift-torque-release"');
    expect(source).toContain('"throttle-tip-in"');
    expect(source).toContain("transients must include");
  });

  it("accepts a complete v2 source package and rejects a missing perspective", () => {
    const root = mkdtempSync(join(tmpdir(), "engine-source-audit-"));
    try {
      const stems = {
        exterior: writeSource(root, "exterior.wav", 32, 1),
        intake: writeSource(root, "intake.wav", 32, 2),
        exhaust: writeSource(root, "exhaust.wav", 32, 3),
      };
      const lifecycleSource = writeSource(root, "lifecycle.wav", 7, 4);
      const transientSource = writeSource(root, "transients.wav", 7, 5);
      let captureIndex = 0;
      const makeBands = () => [1200, 2400, 3900].map((rpm) => {
        const steadyStartSeconds = captureIndex * 5;
        captureIndex += 1;
        return {
          rpm,
          steadyStartSeconds,
          steadyEndSeconds: steadyStartSeconds + 3,
          stems,
        };
      });
      const manifest = {
        schemaVersion: 2,
        status: "candidate",
        source: {
          title: "Test source",
          creator: "Test creator",
          sourceUrl: "https://example.com/source",
          rights: {
            licenseId: "CC0-1.0",
            licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
            commercialUse: true,
            derivatives: true,
            redistribution: true,
          },
        },
        recording: {
          vehicle: "2022 test vehicle",
          engine: "Test engine",
          transmission: "Six-speed manual",
          captureEnvironment: "Controlled test cell",
          microphonePerspectives: {
            exterior: "One metre ahead of the closed hood",
            intake: "Fixed at the intake",
            exhaust: "Fixed behind the exhaust",
          },
          rpmEvidence: "tachometer-log",
          loadEvidence: "dynamometer-log",
        },
        calibration: {
          evidenceKind: "manufacturer-specification",
          evidenceUrl: "https://example.com/specification",
          idleRpm: 850,
          maximumRpm: 4700,
          maximumPowerKw: 96,
          maximumPowerRpm: 3750,
          maximumTorqueNm: 300,
          maximumTorqueRpm: 1750,
        },
        programs: [
          { label: "light", normalizedLoad: 0.25, bands: makeBands() },
          { label: "full", normalizedLoad: 1, bands: makeBands() },
        ],
        lifecycle: {
          startup: {
            ...lifecycleSource,
            startSeconds: 0,
            endSeconds: 2,
          },
          shutdown: {
            ...lifecycleSource,
            startSeconds: 2.5,
            endSeconds: 5,
          },
        },
        transients: [
          { kind: "throttle-tip-in", ...transientSource, startSeconds: 0, endSeconds: 0.5 },
          { kind: "overrun-fuel-cut", ...transientSource, startSeconds: 1, endSeconds: 1.5 },
          { kind: "shift-torque-release", ...transientSource, startSeconds: 2, endSeconds: 2.5 },
        ],
      };
      const manifestPath = join(root, "manifest.json");
      writeFileSync(manifestPath, JSON.stringify(manifest));
      const valid = spawnSync(process.execPath, [
        join(process.cwd(), "scripts", "audit-engine-source.mjs"),
        manifestPath,
      ], { encoding: "utf8" });
      expect(valid.status, valid.stderr).toBe(0);

      delete (manifest.recording.microphonePerspectives as Partial<
        typeof manifest.recording.microphonePerspectives
      >).intake;
      writeFileSync(manifestPath, JSON.stringify(manifest));
      const invalid = spawnSync(process.execPath, [
        join(process.cwd(), "scripts", "audit-engine-source.mjs"),
        manifestPath,
      ], { encoding: "utf8" });
      expect(invalid.status).toBe(1);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
