import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";

const SAFE_LICENSES = new Set(["CC0-1.0", "CC-BY-4.0", "PDM-1.0"]);
const LICENSE_URLS = new Map([
  ["CC0-1.0", "creativecommons.org/publicdomain/zero/1.0"],
  ["CC-BY-4.0", "creativecommons.org/licenses/by/4.0"],
  ["PDM-1.0", "creativecommons.org/publicdomain/mark/1.0"],
]);
const LOAD_EVIDENCE = new Set([
  "dynamometer-log",
  "source-rpm-torque-metadata",
  "source-torque-channel",
]);
const RPM_EVIDENCE = new Set([
  "source-rpm-metadata",
  "source-rpm-channel",
  "tachometer-log",
]);

const manifestArgument = process.argv[2];
if (!manifestArgument) {
  console.error("Usage: npm run audio:source:audit -- .engine-audio-source/manifest.json");
  process.exit(2);
}

const manifestPath = resolve(process.cwd(), manifestArgument);
const manifestDirectory = dirname(manifestPath);
const failures = [];
const checkedFiles = new Map();
const captureIntervals = new Map();

const relativeToPublic = relative(resolve(process.cwd(), "public"), manifestPath);
if (!relativeToPublic.startsWith("..") && !isAbsolute(relativeToPublic)) {
  failures.push("candidate manifests and original recordings must remain outside public/");
}

function fail(message) {
  failures.push(message);
}

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function inspectWav(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a RIFF/WAVE file");
  }

  let offset = 12;
  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (offset + 8 + size > buffer.length) throw new Error("truncated WAV chunk");
    if (id === "fmt " && size >= 16) {
      audioFormat = buffer.readUInt16LE(offset + 8);
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
      if (audioFormat === 65_534 && size >= 40) audioFormat = buffer.readUInt16LE(offset + 32);
    }
    if (id === "data") dataSize += size;
    offset += 8 + size + (size & 1);
  }

  if (![1, 3].includes(audioFormat)) throw new Error(`unsupported WAV encoding ${audioFormat}`);
  if (!channels || !sampleRate || !bitsPerSample || !dataSize) throw new Error("incomplete WAV metadata");
  const bytesPerFrame = channels * (bitsPerSample / 8);
  return {
    bitsPerSample,
    channels,
    duration: dataSize / bytesPerFrame / sampleRate,
    sampleRate,
  };
}

function inspectSourceFile(relativePath, expectedHash) {
  if (!isNonEmptyString(relativePath)) {
    fail("every band needs a relative file path");
    return null;
  }
  if (isAbsolute(relativePath)) {
    fail(`${relativePath}: absolute source paths are not portable`);
    return null;
  }
  if (extname(relativePath).toLowerCase() !== ".wav") {
    fail(`${relativePath}: only original lossless WAV sources are accepted`);
    return null;
  }

  const path = resolve(manifestDirectory, relativePath);
  const relativeToRoot = relative(manifestDirectory, path);
  if (relativeToRoot.startsWith("..") || isAbsolute(relativeToRoot)) {
    fail(`${relativePath}: source escapes the quarantined manifest directory`);
    return null;
  }
  if (!existsSync(path) || !statSync(path).isFile()) {
    fail(`${relativePath}: source file is missing`);
    return null;
  }
  const realDirectory = realpathSync(manifestDirectory);
  const realPath = realpathSync(path);
  const realRelative = relative(realDirectory, realPath);
  if (realRelative.startsWith("..") || isAbsolute(realRelative)) {
    fail(`${relativePath}: symlink escapes the quarantined manifest directory`);
    return null;
  }

  if (!/^[a-f\d]{64}$/i.test(expectedHash ?? "")) {
    fail(`${relativePath}: sha256 must be a complete 64-character digest`);
  } else {
    const actualHash = createHash("sha256").update(readFileSync(realPath)).digest("hex");
    if (actualHash !== expectedHash.toLowerCase()) fail(`${relativePath}: sha256 does not match`);
  }

  if (checkedFiles.has(realPath)) return checkedFiles.get(realPath);
  try {
    const metrics = inspectWav(realPath);
    if (metrics.sampleRate < 44_100) fail(`${relativePath}: source must be at least 44.1 kHz`);
    if (metrics.bitsPerSample < 16) fail(`${relativePath}: source must be at least 16-bit`);
    if (metrics.channels < 1 || metrics.channels > 2) fail(`${relativePath}: source must be mono or stereo`);
    checkedFiles.set(realPath, metrics);
    return metrics;
  } catch (error) {
    fail(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function inspectSourceWindow(entry, prefix, start, end, minimumDuration) {
  const metrics = inspectSourceFile(entry?.file, entry?.sha256);
  if (
    !Number.isFinite(start)
    || !Number.isFinite(end)
    || start < 0
    || end - start < minimumDuration
  ) {
    fail(`${prefix}: capture window must be at least ${minimumDuration} seconds`);
    return metrics;
  }
  if (metrics && end > metrics.duration) {
    fail(`${prefix}: capture window exceeds the ${metrics.duration.toFixed(3)} s source`);
  }
  const captureIdentity = /^[a-f\d]{64}$/i.test(entry?.sha256 ?? "")
    ? entry.sha256.toLowerCase()
    : entry?.file;
  const intervals = captureIntervals.get(captureIdentity) ?? [];
  if (intervals.some((interval) => Math.max(start, interval.start) < Math.min(end, interval.end))) {
    fail(`${prefix}: capture window overlaps audio already used by another source point`);
  }
  intervals.push({ start, end });
  captureIntervals.set(captureIdentity, intervals);
  return metrics;
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.error(`Source audit: cannot read ${manifestArgument}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

if (manifest.schemaVersion !== 2) fail("schemaVersion must be 2");
if (manifest.status !== "candidate") fail('status must remain "candidate" until derivatives pass the runtime audit');

const source = manifest.source ?? {};
const rights = source.rights ?? {};
if (!isNonEmptyString(source.title)) fail("source.title is required");
if (!isNonEmptyString(source.creator)) fail("source.creator is required");
if (!isHttpUrl(source.sourceUrl)) fail("source.sourceUrl must be an HTTP(S) URL");
if (!SAFE_LICENSES.has(rights.licenseId)) {
  fail(`source.rights.licenseId must be one of ${[...SAFE_LICENSES].join(", ")}; noncommercial licenses are rejected`);
}
if (!isHttpUrl(rights.licenseUrl)) fail("source.rights.licenseUrl must be an HTTP(S) URL");
else if (LICENSE_URLS.has(rights.licenseId) && !rights.licenseUrl.includes(LICENSE_URLS.get(rights.licenseId))) {
  fail("source.rights.licenseUrl does not match source.rights.licenseId");
}
for (const permission of ["commercialUse", "derivatives", "redistribution"]) {
  if (rights[permission] !== true) fail(`source.rights.${permission} must be explicitly true`);
}
if (rights.licenseId === "CC-BY-4.0" && !isNonEmptyString(rights.attribution)) {
  fail("source.rights.attribution is required for CC-BY-4.0");
}

const recording = manifest.recording ?? {};
for (const field of ["vehicle", "engine", "transmission", "captureEnvironment"]) {
  if (!isNonEmptyString(recording[field])) fail(`recording.${field} is required`);
}
for (const perspective of ["exterior", "intake", "exhaust"]) {
  if (!isNonEmptyString(recording.microphonePerspectives?.[perspective])) {
    fail(`recording.microphonePerspectives.${perspective} is required`);
  }
}
if (!RPM_EVIDENCE.has(recording.rpmEvidence)) {
  fail(`recording.rpmEvidence must be one of ${[...RPM_EVIDENCE].join(", ")}`);
}
if (!LOAD_EVIDENCE.has(recording.loadEvidence)) {
  fail(`recording.loadEvidence must be one of ${[...LOAD_EVIDENCE].join(", ")}`);
}

const calibration = manifest.calibration ?? {};
if (!isHttpUrl(calibration.evidenceUrl)) {
  fail("calibration.evidenceUrl must be an HTTP(S) URL");
}
if (!["manufacturer-specification", "recorded-vehicle-telemetry"].includes(calibration.evidenceKind)) {
  fail("calibration.evidenceKind must be manufacturer-specification or recorded-vehicle-telemetry");
}
for (const field of ["idleRpm", "maximumRpm", "maximumPowerKw", "maximumPowerRpm", "maximumTorqueNm", "maximumTorqueRpm"]) {
  if (!Number.isFinite(calibration[field]) || calibration[field] <= 0) {
    fail(`calibration.${field} must be a positive finite number`);
  }
}
if (
  Number.isFinite(calibration.idleRpm)
  && Number.isFinite(calibration.maximumTorqueRpm)
  && calibration.maximumTorqueRpm <= calibration.idleRpm
) fail("calibration.maximumTorqueRpm must exceed idleRpm");
if (
  Number.isFinite(calibration.maximumTorqueRpm)
  && Number.isFinite(calibration.maximumPowerRpm)
  && calibration.maximumPowerRpm <= calibration.maximumTorqueRpm
) fail("calibration.maximumPowerRpm must exceed maximumTorqueRpm");
if (
  Number.isFinite(calibration.maximumPowerRpm)
  && Number.isFinite(calibration.maximumRpm)
  && calibration.maximumRpm <= calibration.maximumPowerRpm
) fail("calibration.maximumRpm must exceed maximumPowerRpm");

const programs = Array.isArray(manifest.programs) ? manifest.programs : [];
if (programs.length < 2) fail("at least two independently documented load programs are required");
let referenceRpmGrid = null;
let previousLoad = -Infinity;

for (const [programIndex, program] of programs.entries()) {
  const prefix = `programs[${programIndex}]`;
  if (!isNonEmptyString(program.label)) fail(`${prefix}.label is required`);
  if (typeof program.normalizedLoad !== "number" || program.normalizedLoad < 0 || program.normalizedLoad > 1) {
    fail(`${prefix}.normalizedLoad must be between 0 and 1`);
  } else if (program.normalizedLoad <= previousLoad) {
    fail(`${prefix}.normalizedLoad must be strictly increasing`);
  } else {
    previousLoad = program.normalizedLoad;
  }

  const bands = Array.isArray(program.bands) ? program.bands : [];
  if (bands.length < 3) fail(`${prefix} needs at least three steady RPM bands`);
  const rpmGrid = [];
  let previousRpm = -Infinity;
  for (const [bandIndex, band] of bands.entries()) {
    const bandPrefix = `${prefix}.bands[${bandIndex}]`;
    if (!Number.isFinite(band.rpm) || band.rpm <= previousRpm) {
      fail(`${bandPrefix}.rpm must be finite and strictly increasing`);
    } else {
      previousRpm = band.rpm;
      rpmGrid.push(band.rpm);
      if (band.rpm < calibration.idleRpm || band.rpm > calibration.maximumRpm) {
        fail(`${bandPrefix}.rpm must remain inside the calibrated operating range`);
      }
    }
    const start = band.steadyStartSeconds;
    const end = band.steadyEndSeconds;
    for (const perspective of ["exterior", "intake", "exhaust"]) {
      inspectSourceWindow(
        band.stems?.[perspective],
        `${bandPrefix}.stems.${perspective}`,
        start,
        end,
        2.5,
      );
    }
  }

  if (!referenceRpmGrid) referenceRpmGrid = rpmGrid;
  else if (JSON.stringify(referenceRpmGrid) !== JSON.stringify(rpmGrid)) {
    fail(`${prefix}: RPM grid must match the first load program exactly`);
  }
}

if (
  referenceRpmGrid
  && (
    referenceRpmGrid[0] > calibration.maximumTorqueRpm
    || referenceRpmGrid.at(-1) < calibration.maximumPowerRpm
  )
) {
  fail("RPM grid must cover both the documented torque and power peaks");
}

for (const lifecycleKind of ["startup", "shutdown"]) {
  const entry = manifest.lifecycle?.[lifecycleKind];
  inspectSourceWindow(
    entry,
    `lifecycle.${lifecycleKind}`,
    entry?.startSeconds,
    entry?.endSeconds,
    0.5,
  );
}

const supportedTransientKinds = new Set([
  "overrun-fuel-cut",
  "shift-torque-release",
  "throttle-tip-in",
]);
const missingTransientKinds = new Set(supportedTransientKinds);
const transients = Array.isArray(manifest.transients) ? manifest.transients : [];
for (const [index, transient] of transients.entries()) {
  const prefix = `transients[${index}]`;
  if (!supportedTransientKinds.has(transient.kind)) {
    fail(`${prefix}.kind is not a supported matched transient`);
  } else if (!missingTransientKinds.has(transient.kind)) {
    fail(`${prefix}.kind duplicates ${transient.kind}`);
  } else {
    missingTransientKinds.delete(transient.kind);
  }
  inspectSourceWindow(
    transient,
    prefix,
    transient.startSeconds,
    transient.endSeconds,
    0.15,
  );
}
for (const missingKind of missingTransientKinds) {
  fail(`transients must include ${missingKind}`);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`Source audit: ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Source audit passed: ${programs.length} load programs, ${programs.reduce((count, program) => count + program.bands.length, 0)} matrix points, ${checkedFiles.size} lossless source files.`,
  );
  console.log("Candidate remains quarantined; create runtime derivatives and run npm run audio:audit before enabling it.");
}
