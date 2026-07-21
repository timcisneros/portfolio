import {
  getCarEngineBandWeights,
  getCarEngineLoadWeights,
  getCarEngineMixTargets,
  getCarEngineStyle,
  type CarEngineStyle,
  type CarEngineSampleBand,
  type CarEngineStyleId,
  type CarEngineTransient,
} from "./carEngineStyles";
import {
  createCarDrivetrainState,
  getCarIgnitionState,
  getCarIgnitionThrottleAuthority,
  updateCarDrivetrain,
  type CarDrivetrainOutput,
  type CarIgnitionPhase,
} from "./carDrivetrain";

export type SecretStation = "sunroom" | "machines" | "night-drive";

export type CarTireAudioInput = {
  adhesionLoss: number;
  brakePressure: number;
  brakingBreakaway: number;
  corneringBreakaway: number;
  drivenBreakaway: number;
  lateralSlip: number;
  longitudinalSlip: number;
  serviceBraking: boolean;
  slippingWheelCount: number;
  tireLoad: number;
};

export type CarImpactAudioInput = {
  material: "keycap" | "page";
  normalImpulse: number;
};

type AudioState = {
  station: SecretStation | null;
  muted: boolean;
};

type AudioListener = (state: AudioState) => void;

export type SecretEngineController = {
  cancelHandoff: () => void;
  isActive: () => boolean;
  setDrive: (
    signedSpeedRatio: number,
    throttle: number,
    steering?: number,
    serviceBrake?: boolean,
    tireSlip?: number,
    engagedDirection?: -1 | 0 | 1,
    mechanicalDrive?: CarDrivetrainOutput,
    tireFeedback?: CarTireAudioInput,
  ) => void;
  setVariant: (variant: SecretEngineVariant) => void;
  handoff: () => void;
  shutdown: () => number;
  stop: () => void;
};

export type SecretEngineVariant = CarEngineStyleId;

export type SecretEngineTelemetry = {
  acousticLoad: number;
  abruptStop: boolean;
  braking: boolean;
  clutch: number;
  clutchSlipRpm: number;
  decelerationRate: number;
  direction: -1 | 0 | 1;
  engineLabel: string;
  engineState: "starting" | "running" | "stopping" | "off";
  ignitionPhase: CarIgnitionPhase | "off";
  gear: number;
  gearCount: number;
  hardDeceleration: boolean;
  limiterCut: number;
  load: number;
  playbackRate: number;
  loadBlend: number;
  overrun: number;
  rapidRpmRecovery: boolean;
  renderer: "banked" | "cycle-coherent";
  roadSpeedKph: number;
  rpm: number;
  rpmVelocity: number;
  serviceBraking: boolean;
  speedRatio: number;
  steering: number;
  tireSlip: number;
  shiftState: "pending" | "shifting" | "steady";
  shiftProgress: number;
  targetRpm: number;
  throttle: number;
  torqueFactor: number;
  variant: SecretEngineVariant;
  wheelForceNewtons: number;
};

export type SecretAudioDiagnostics = {
  contextState: AudioContextState | "uninitialized";
  engineActive: boolean;
  engineState: SecretEngineTelemetry["engineState"];
  limiterReductionDb: number;
  muted: boolean;
  outputPeak: number;
  outputRms: number;
  spectralCentroidHz: number;
};

export type SecretHornController = {
  stop: () => void;
};

let context: AudioContext | null = null;
let master: GainNode | null = null;
let masterLimiter: DynamicsCompressorNode | null = null;
let analyser: AnalyserNode | null = null;
let stationGain: GainNode | null = null;
let carSpatialPanner: PannerNode | null = null;
let carSpatialFilter: BiquadFilterNode | null = null;
let carSpatialPosition = { x: 0, y: 0, z: -2.4 };
let carSpatialOffscreenDistance = 0;
let carSpatialHeading = 0;
let carSpatialNormalizedPosition = { x: 0, y: 0 };
const carEngineDirectivityGains = new Set<GainNode>();
type CarSpatialEmitter = {
  distanceFilter: BiquadFilterNode;
  longitudinalOffset: number;
  panner: PannerNode;
};
const carSpatialEmitters = new Set<CarSpatialEmitter>();
let stationTimer: number | null = null;
let station: SecretStation | null = null;
let muted = false;
let activeHorn: SecretHornController | null = null;
let hornRequest = 0;
let hornBufferPromise: Promise<AudioBuffer> | null = null;
let lastCarImpactAt = Number.NEGATIVE_INFINITY;
let lastCarImpactStrength = 0;
const engineBufferPromises = new Map<string, Promise<AudioBuffer>>();
const decodedEngineBuffers = new Map<string, AudioBuffer>();
let activeEngineCore: SecretEngineController | null = null;
let engineCorePromise: Promise<SecretEngineController> | null = null;
let engineCoreGeneration = 0;
let engineShutdownLocked = false;
let engineLeaseSerial = 0;
let currentEngineLease = 0;
let engineRouteHoldTimer: number | null = null;
let engineTelemetry: SecretEngineTelemetry = {
  acousticLoad: 0,
  abruptStop: false,
  braking: false,
  clutch: 1,
  clutchSlipRpm: 0,
  decelerationRate: 0,
  direction: 0,
  engineLabel: "Compact five-speed",
  engineState: "off",
  ignitionPhase: "off",
  gear: 0,
  gearCount: 5,
  hardDeceleration: false,
  limiterCut: 0,
  load: 0,
  playbackRate: 0.76,
  loadBlend: 0,
  overrun: 0,
  rapidRpmRecovery: false,
  renderer: "banked",
  roadSpeedKph: 0,
  rpm: 850,
  rpmVelocity: 0,
  serviceBraking: false,
  speedRatio: 0,
  steering: 0,
  tireSlip: 0,
  shiftState: "steady",
  shiftProgress: 0,
  targetRpm: 850,
  throttle: 0,
  torqueFactor: 0,
  variant: "city",
  wheelForceNewtons: 0,
};
const listeners = new Set<AudioListener>();

const CAR_HORN_AUDIO_URL = "/audio/car-horn-modern.wav";
const CAR_TIRE_SCREECH_BUFFERS = [
  "/audio/car-tire-screech-1-real.mp3",
  "/audio/car-tire-screech-2-real.mp3",
  "/audio/car-tire-screech-3-real.mp3",
  "/audio/car-tire-screech-real.mp3",
] as const;
// These are complete, naturally bounded tire events. Cutting many overlapping
// excerpts out of their middles discarded the recorded attacks and decays,
// which made each physical breakaway sound like a chopped sample trigger.
const CAR_TIRE_SCREECH_VARIANTS = [
  { bufferIndex: 0, duration: 2.05, fadeOut: 0.1, level: 1, start: 0.09 },
  { bufferIndex: 1, duration: 2.12, fadeOut: 0.025, level: 1.16, start: 0.02 },
  { bufferIndex: 2, duration: 1.98, fadeOut: 0.025, level: 1.06, start: 0.02 },
  { bufferIndex: 3, duration: 4.78, fadeOut: 0.08, level: 1.55, start: 1.76 },
] as const;
const CAR_TIRE_SCREECH_VARIANT_BANDS: readonly (readonly number[])[] = [
  [0, 1, 2],
  [0, 1, 2],
  [3],
] as const;
const CAR_LIGHT_IMPACT_AUDIO_URL = "/audio/car-impact-light-real.mp3";
const CAR_HEAVY_IMPACT_AUDIO_URL = "/audio/car-impact-heavy-real.mp3";
const CAR_HORN_LOOP_START = 7542 / 44100;
const CAR_HORN_LOOP_END = 15019 / 44100;
const CAR_HORN_LEVEL = 0.58;
// Startup and the idle bank are RMS-matched and share the same lifecycle mix.
// Entering below unity made the engine audibly duck just as ignition finished.
const ENGINE_STARTUP_IDLE_ENTRY_LEVEL = 1;
const ENGINE_IDLE_MIX_LEVEL = 0.55;
const ENGINE_LIFECYCLE_MIX_LEVEL = 0.55;
// One global make-up trim preserves the authored balance across the engine,
// road, horn, radio, and interactive sound objects. A final shared limiter
// catches summed peaks after this gain so loud playback cannot hard-clip.
const SECRET_AUDIO_MASTER_LEVEL = 3;
const ENGINE_CYCLE_PROCESSOR_URL = "/audio/engine-cycle-processor.js";
const ENGINE_CYCLE_REFERENCE_RPM = 850;
// At 60 Hz this admits every animation frame; on high-refresh displays it
// caps graph automation near 90 Hz instead of scheduling redundant targets.
const ENGINE_AUDIO_CONTROL_INTERVAL = 1 / 90;
// The cycle-coherent renderer remains available for development, but its
// grain reconstruction is still audible during rev sweeps. Production uses
// the continuous banked renderer until that implementation is perceptually
// transparent. This is the single hard switch between the two paths.
const ENGINE_RENDERER_MODE: "banked" | "cycle-coherent" = "banked";
let engineCycleModulePromise: Promise<boolean> | null = null;
let audioVisibilityListenerInstalled = false;
let audioWasRunningBeforeHidden = false;
let audioVisibilityTransition = Promise.resolve();

function loadEngineCycleModule(audioContext: AudioContext) {
  if (ENGINE_RENDERER_MODE === "banked") return Promise.resolve(false);
  if (!audioContext.audioWorklet) return Promise.resolve(false);
  if (!engineCycleModulePromise) {
    engineCycleModulePromise = audioContext.audioWorklet
      .addModule(ENGINE_CYCLE_PROCESSOR_URL)
      .then(() => true)
      .catch(() => false);
  }
  return engineCycleModulePromise;
}

function getCycleProgramLevel(style: CarEngineStyle, speed: number) {
  const ratio = Math.max(
    0,
    Math.min(1, speed / Math.max(0.01, style.sound.idleFadeSpeed)),
  );
  const eased = ratio * ratio * (3 - 2 * ratio);
  return (
    style.sound.normalization *
    (ENGINE_IDLE_MIX_LEVEL + (1 - ENGINE_IDLE_MIX_LEVEL) * eased)
  );
}

const stationSettings: Record<
  SecretStation,
  {
    beat: number;
    bass: number[];
    lead: number[];
    bassWave: OscillatorType;
    leadWave: OscillatorType;
  }
> = {
  sunroom: {
    beat: 60 / 92,
    bass: [110, 110, 146.83, 130.81],
    lead: [220, 261.63, 329.63, 261.63, 196, 246.94, 293.66, 246.94],
    bassWave: "sine",
    leadWave: "triangle",
  },
  machines: {
    beat: 60 / 124,
    bass: [82.41, 82.41, 98, 110],
    lead: [329.63, 392, 493.88, 392, 369.99, 440, 554.37, 440],
    bassWave: "square",
    leadWave: "square",
  },
  "night-drive": {
    beat: 60 / 104,
    bass: [73.42, 73.42, 87.31, 65.41],
    lead: [293.66, 349.23, 440, 349.23, 261.63, 329.63, 392, 329.63],
    bassWave: "sawtooth",
    leadWave: "sine",
  },
};

function publish() {
  const state = { station, muted };
  listeners.forEach((listener) => listener(state));
}

function isSecretAudioPageVisible() {
  return typeof document === "undefined"
    || document.visibilityState === "visible";
}

function pauseSecretStationScheduler() {
  if (stationTimer === null) return;
  window.clearInterval(stationTimer);
  stationTimer = null;
}

function resumeSecretStationScheduler() {
  if (!station || !stationGain || stationTimer !== null) return;
  scheduleStationBar(station);
  const barDuration = stationSettings[station].beat * 8;
  stationTimer = window.setInterval(
    () => station && scheduleStationBar(station),
    barDuration * 1000,
  );
}

function installAudioVisibilityHandler(audioContext: AudioContext) {
  if (audioVisibilityListenerInstalled || typeof document === "undefined") return;
  audioVisibilityListenerInstalled = true;
  document.addEventListener("visibilitychange", () => {
    const hidden = !isSecretAudioPageVisible();
    if (hidden) {
      audioWasRunningBeforeHidden ||= audioContext.state === "running";
      pauseSecretStationScheduler();
      stopCarHorn();
    }
    const shouldResume = !hidden && audioWasRunningBeforeHidden;
    if (shouldResume) audioWasRunningBeforeHidden = false;
    audioVisibilityTransition = audioVisibilityTransition
      .catch(() => undefined)
      .then(async () => {
        if (hidden) {
          if (audioContext.state === "running") await audioContext.suspend();
          return;
        }
        if (!shouldResume || !isSecretAudioPageVisible()) return;
        if (audioContext.state !== "running") await audioContext.resume();
        resumeSecretStationScheduler();
      });
  });
}

async function resumeAudioContextIfVisible(audioContext: AudioContext) {
  if (!isSecretAudioPageVisible()) {
    if (audioContext.state === "running") {
      audioWasRunningBeforeHidden = true;
      await audioContext.suspend();
    }
    return false;
  }
  if (audioContext.state !== "running") await audioContext.resume();
  return audioContext.state === "running";
}

function getContext() {
  if (context && master && masterLimiter && analyser) {
    return { context, master, analyser };
  }

  context = new AudioContext();
  master = context.createGain();
  masterLimiter = context.createDynamicsCompressor();
  analyser = context.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.72;
  master.gain.value = muted ? 0 : SECRET_AUDIO_MASTER_LEVEL;
  masterLimiter.threshold.value = -3;
  masterLimiter.knee.value = 0;
  masterLimiter.ratio.value = 20;
  masterLimiter.attack.value = 0.002;
  masterLimiter.release.value = 0.08;
  master.connect(masterLimiter);
  masterLimiter.connect(analyser);
  analyser.connect(context.destination);
  installAudioVisibilityHandler(context);

  return { context, master, analyser };
}

function getCarSpatialBus(audioContext: AudioContext, destination: AudioNode) {
  if (carSpatialPanner) return carSpatialPanner;

  const listener = audioContext.listener;
  listener.positionX.value = 0;
  listener.positionY.value = 0;
  listener.positionZ.value = 0;
  listener.forwardX.value = 0;
  listener.forwardY.value = 0;
  listener.forwardZ.value = -1;
  listener.upX.value = 0;
  listener.upY.value = 1;
  listener.upZ.value = 0;

  const panner = audioContext.createPanner();
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  // Model the page as a compact plane in front of the listener. Keeping the
  // source deeper than it is wide makes an on-screen crossing feel like a car
  // moving across a desk, rather than a sound circling beside the listener's
  // ears. Distance falloff becomes noticeable once the car leaves that plane.
  panner.refDistance = 2.4;
  panner.maxDistance = 40;
  panner.rolloffFactor = 0.75;
  panner.coneInnerAngle = 360;
  panner.coneOuterAngle = 360;
  panner.positionX.value = carSpatialPosition.x;
  panner.positionY.value = carSpatialPosition.y;
  panner.positionZ.value = carSpatialPosition.z;
  const distanceFilter = audioContext.createBiquadFilter();
  distanceFilter.type = "lowpass";
  distanceFilter.frequency.value = Math.max(
    850,
    16000 / Math.pow(1 + carSpatialOffscreenDistance, 1.35),
  );
  distanceFilter.Q.value = 0.32;
  panner.connect(distanceFilter);
  distanceFilter.connect(destination);
  carSpatialPanner = panner;
  carSpatialFilter = distanceFilter;
  return panner;
}

function getCarEngineDirectivity() {
  const listenerX = -carSpatialNormalizedPosition.x;
  const listenerY = carSpatialNormalizedPosition.y;
  const listenerLength = Math.hypot(listenerX, listenerY);
  const headingX = Math.cos(carSpatialHeading);
  const headingY = Math.sin(carSpatialHeading) * 0.58;
  const headingLength = Math.max(0.0001, Math.hypot(headingX, headingY));
  const facing = listenerLength > 0.04
    ? (headingX * listenerX + headingY * listenerY)
      / (headingLength * listenerLength)
    : 1;
  // A small bidirectional bias suggests engine bay/exhaust orientation without
  // making a tiny on-screen car vanish acoustically when viewed broadside.
  return 0.92
    + Math.abs(facing) * 0.055
    + Math.max(0, facing) * 0.025;
}

function getCarSpatialEmitterPosition(longitudinalOffset: number) {
  const normalizedX = carSpatialNormalizedPosition.x
    + Math.cos(carSpatialHeading) * longitudinalOffset;
  const normalizedY = carSpatialNormalizedPosition.y
    - Math.sin(carSpatialHeading) * 0.58 * longitudinalOffset;
  return {
    x: Math.max(-12, Math.min(12, normalizedX * 0.6)),
    y: Math.max(-12, Math.min(12, normalizedY * 0.38)),
    z: carSpatialPosition.z,
  };
}

function createCarSpatialEmitter(
  audioContext: AudioContext,
  destination: AudioNode,
  longitudinalOffset: number,
) {
  const panner = audioContext.createPanner();
  const distanceFilter = audioContext.createBiquadFilter();
  const position = getCarSpatialEmitterPosition(longitudinalOffset);
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.refDistance = 2.4;
  panner.maxDistance = 40;
  panner.rolloffFactor = 0.75;
  panner.coneInnerAngle = 360;
  panner.coneOuterAngle = 360;
  panner.positionX.value = position.x;
  panner.positionY.value = position.y;
  panner.positionZ.value = position.z;
  distanceFilter.type = "lowpass";
  distanceFilter.frequency.value = Math.max(
    850,
    16000 / Math.pow(1 + carSpatialOffscreenDistance, 1.35),
  );
  distanceFilter.Q.value = 0.32;
  panner.connect(distanceFilter).connect(destination);
  const emitter = { distanceFilter, longitudinalOffset, panner };
  carSpatialEmitters.add(emitter);
  return emitter;
}

function disconnectCarSpatialEmitter(emitter: CarSpatialEmitter) {
  carSpatialEmitters.delete(emitter);
  emitter.panner.disconnect();
  emitter.distanceFilter.disconnect();
}

export function setCarAudioSpatialPosition(
  screenX: number,
  screenY: number,
  viewportWidth: number,
  viewportHeight: number,
  heading = carSpatialHeading,
) {
  const halfWidth = Math.max(1, viewportWidth / 2);
  const halfHeight = Math.max(1, viewportHeight / 2);
  const normalizedX = (screenX - halfWidth) / halfWidth;
  const normalizedY = (halfHeight - screenY) / halfHeight;
  const offscreenDistance = Math.hypot(
    Math.max(0, Math.abs(normalizedX) - 1),
    Math.max(0, Math.abs(normalizedY) - 1),
  );
  carSpatialOffscreenDistance = offscreenDistance;
  carSpatialHeading = heading;
  carSpatialNormalizedPosition = { x: normalizedX, y: normalizedY };
  carSpatialPosition = {
    x: Math.max(-12, Math.min(12, normalizedX * 0.6)),
    y: Math.max(-12, Math.min(12, normalizedY * 0.38)),
    // Panning stays compact on the page plane, while leaving the viewport
    // moves the source away from the listener in depth. This keeps scrolling
    // acoustically anchored to the parked car instead of to the camera.
    z: -Math.min(40, 2.4 + offscreenDistance * 6),
  };

  if (!context || !carSpatialPanner) return;
  const now = context.currentTime;
  carSpatialPanner.positionX.setTargetAtTime(carSpatialPosition.x, now, 0.035);
  carSpatialPanner.positionY.setTargetAtTime(carSpatialPosition.y, now, 0.035);
  carSpatialPanner.positionZ.setTargetAtTime(carSpatialPosition.z, now, 0.035);
  carSpatialFilter?.frequency.setTargetAtTime(
    Math.max(850, 16000 / Math.pow(1 + carSpatialOffscreenDistance, 1.35)),
    now,
    0.08,
  );
  carSpatialEmitters.forEach((emitter) => {
    const position = getCarSpatialEmitterPosition(emitter.longitudinalOffset);
    emitter.panner.positionX.setTargetAtTime(position.x, now, 0.035);
    emitter.panner.positionY.setTargetAtTime(position.y, now, 0.035);
    emitter.panner.positionZ.setTargetAtTime(position.z, now, 0.035);
    emitter.distanceFilter.frequency.setTargetAtTime(
      Math.max(850, 16000 / Math.pow(1 + carSpatialOffscreenDistance, 1.35)),
      now,
      0.08,
    );
  });
  const directivity = getCarEngineDirectivity();
  carEngineDirectivityGains.forEach((gain) => {
    gain.gain.setTargetAtTime(directivity, now, 0.08);
  });
}

export async function resumeSecretAudio() {
  const audio = getContext();
  await resumeAudioContextIfVisible(audio.context);
}

function scheduleVoice(
  audioContext: AudioContext,
  destination: AudioNode,
  frequency: number,
  start: number,
  duration: number,
  wave: OscillatorType,
  volume: number,
) {
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.025);
}

function scheduleStationBar(id: SecretStation) {
  if (!context || !stationGain || station !== id) return;
  const settings = stationSettings[id];
  const start = context.currentTime + 0.045;

  settings.bass.forEach((frequency, index) => {
    scheduleVoice(
      context!,
      stationGain!,
      frequency,
      start + index * settings.beat * 2,
      settings.beat * 1.55,
      settings.bassWave,
      id === "machines" ? 0.035 : 0.055,
    );
  });

  settings.lead.forEach((frequency, index) => {
    scheduleVoice(
      context!,
      stationGain!,
      frequency,
      start + index * settings.beat,
      settings.beat * (id === "sunroom" ? 0.82 : 0.52),
      settings.leadWave,
      id === "machines" ? 0.024 : 0.034,
    );
  });

  if (id === "sunroom") {
    [1, 1.25, 1.5].forEach((ratio) => {
      scheduleVoice(
        context!,
        stationGain!,
        110 * ratio,
        start,
        settings.beat * 7.5,
        "sine",
        0.018,
      );
    });
  }
}

export async function startSecretStation(id: SecretStation) {
  const audio = getContext();
  if (!(await resumeAudioContextIfVisible(audio.context))) return;
  stopSecretStation(false);

  station = id;
  stationGain = audio.context.createGain();
  stationGain.gain.setValueAtTime(0.0001, audio.context.currentTime);
  stationGain.gain.exponentialRampToValueAtTime(
    0.9,
    audio.context.currentTime + 0.08,
  );
  stationGain.connect(audio.master);
  scheduleStationBar(id);

  resumeSecretStationScheduler();
  publish();
}

export function stopSecretStation(notify = true) {
  if (stationTimer !== null) {
    window.clearInterval(stationTimer);
    stationTimer = null;
  }
  if (stationGain && context) {
    const gain = stationGain;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(
      Math.max(gain.gain.value, 0.0001),
      context.currentTime,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
    window.setTimeout(() => gain.disconnect(), 90);
  }
  stationGain = null;
  station = null;
  if (notify) publish();
}

function playNoise(duration: number, volume: number, destination: AudioNode) {
  if (!context) return;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(destination);
  source.start();
}

export async function triggerSecretPad(index: number) {
  const audio = getContext();
  if (!(await resumeAudioContextIfVisible(audio.context))) return;
  const now = audio.context.currentTime;
  const kind = index % 8;

  if (kind === 0) {
    const oscillator = audio.context.createOscillator();
    const envelope = audio.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(135, now);
    oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.22);
    envelope.gain.setValueAtTime(0.3, now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    oscillator.connect(envelope);
    envelope.connect(audio.master);
    oscillator.start(now);
    oscillator.stop(now + 0.27);
  } else if (kind === 1 || kind === 6) {
    playNoise(kind === 1 ? 0.13 : 0.045, kind === 1 ? 0.16 : 0.1, audio.master);
  } else {
    const frequencies = [146.83, 174.61, 220, 261.63, 293.66, 349.23];
    const frequency =
      frequencies[(kind - 2 + frequencies.length) % frequencies.length];
    scheduleVoice(
      audio.context,
      audio.master,
      frequency,
      now,
      0.28,
      kind % 2 ? "triangle" : "sine",
      0.13,
    );
    if (kind === 5) {
      scheduleVoice(
        audio.context,
        audio.master,
        frequency * 1.5,
        now,
        0.34,
        "sine",
        0.06,
      );
    }
  }
  publish();
}

export async function triggerSecretPulse(frequency = 440) {
  const audio = getContext();
  if (!(await resumeAudioContextIfVisible(audio.context))) return;
  const now = audio.context.currentTime;
  scheduleVoice(
    audio.context,
    audio.master,
    frequency,
    now,
    0.52,
    "sine",
    0.15,
  );
  scheduleVoice(
    audio.context,
    audio.master,
    frequency * 1.5,
    now + 0.06,
    0.32,
    "triangle",
    0.07,
  );
  publish();
}

function createIdleVariationBuffer(audioContext: AudioContext) {
  const duration = 11;
  const controlPointCount = 29;
  // This is a sub-audio-rate control signal, so an 8 kHz buffer avoids
  // allocating and filling hundreds of thousands of unnecessary samples.
  const controlSampleRate = 8000;
  const length = controlSampleRate * duration;
  const buffer = audioContext.createBuffer(1, length, controlSampleRate);
  const data = buffer.getChannelData(0);
  const controlPoints = Array.from(
    { length: controlPointCount },
    () => Math.random() * 2 - 1,
  );
  for (let index = 0; index < length; index += 1) {
    const position = (index / length) * controlPointCount;
    const point = Math.floor(position);
    const nextPoint = (point + 1) % controlPointCount;
    const fraction = position - point;
    const eased = fraction * fraction * (3 - 2 * fraction);
    data[index] =
      controlPoints[point] * (1 - eased) + controlPoints[nextPoint] * eased;
  }
  return buffer;
}

const combustionEventCache = new WeakMap<AudioBuffer, Map<number, Float32Array>>();
function analyzeCombustionEvents(
  buffer: AudioBuffer,
  referenceRpm: number,
  eventsPerRevolution: number,
) {
  let bufferCache = combustionEventCache.get(buffer);
  if (!bufferCache) {
    bufferCache = new Map();
    combustionEventCache.set(buffer, bufferCache);
  }
  const cacheKey = Math.round(referenceRpm * 10) * 10
    + Math.round(eventsPerRevolution);
  const cached = bufferCache.get(cacheKey);
  if (cached) return cached;

  const samples = buffer.getChannelData(0);
  const expectedPeriod = buffer.sampleRate * 60
    / (referenceRpm * eventsPerRevolution);
  const searchRadius = Math.max(8, Math.round(expectedPeriod * 0.24));
  const positions: number[] = [];
  let prediction = expectedPeriod;
  while (prediction < samples.length - expectedPeriod * 0.5) {
    const start = Math.max(12, Math.round(prediction - searchRadius));
    const end = Math.min(samples.length - 13, Math.round(prediction + searchRadius));
    let strongestPosition = Math.round(prediction);
    let strongestEnergy = -1;
    for (let position = start; position <= end; position += 2) {
      let energy = 0;
      for (let offset = -10; offset <= 10; offset += 4) {
        energy += Math.abs(samples[position + offset] - samples[position + offset - 2]);
      }
      if (energy > strongestEnergy) {
        strongestEnergy = energy;
        strongestPosition = position;
      }
    }
    const previous = positions.at(-1);
    if (previous === undefined || strongestPosition - previous > expectedPeriod * 0.52) {
      positions.push(strongestPosition);
      prediction = strongestPosition + expectedPeriod;
    } else {
      prediction += expectedPeriod;
    }
  }
  const events = Float32Array.from(positions);
  bufferCache.set(cacheKey, events);
  return events;
}

function findMatchingIdleEvent(
  startupBuffer: AudioBuffer | null,
  idleBuffer: AudioBuffer,
  idleEvents: Float32Array,
) {
  if (!startupBuffer || idleEvents.length === 0) return 0;
  const startup = startupBuffer.getChannelData(0);
  const idle = idleBuffer.getChannelData(0);
  // Match a substantial part of the recorded rundown, not only its final
  // waveform cycle. The longer window favors an idle entry with compatible
  // energy and texture throughout the audible crossfade.
  const comparisonLength = Math.round(
    idleBuffer.sampleRate * Math.min(0.32, startupBuffer.duration * 0.28),
  );
  if (startup.length < comparisonLength + 2) return 0;
  let bestIndex = 0;
  let bestCorrelation = Number.NEGATIVE_INFINITY;
  for (let eventIndex = 0; eventIndex < idleEvents.length; eventIndex += 1) {
    const idleEnd = Math.round(idleEvents[eventIndex]);
    if (idleEnd < comparisonLength + 2) continue;
    let startupMean = 0;
    let idleMean = 0;
    const sampleCount = 120;
    for (let index = 0; index < sampleCount; index += 1) {
      const fraction = index / (sampleCount - 1);
      const startupIndex = Math.round(
        startup.length - comparisonLength + fraction * (comparisonLength - 1),
      );
      const idleIndex = Math.round(
        idleEnd - comparisonLength + fraction * (comparisonLength - 1),
      );
      startupMean += startup[startupIndex] - startup[startupIndex - 1];
      idleMean += idle[idleIndex] - idle[idleIndex - 1];
    }
    startupMean /= sampleCount;
    idleMean /= sampleCount;
    let numerator = 0;
    let startupEnergy = 0;
    let idleEnergy = 0;
    for (let index = 0; index < sampleCount; index += 1) {
      const fraction = index / (sampleCount - 1);
      const startupIndex = Math.round(
        startup.length - comparisonLength + fraction * (comparisonLength - 1),
      );
      const idleIndex = Math.round(
        idleEnd - comparisonLength + fraction * (comparisonLength - 1),
      );
      const startupValue = startup[startupIndex] - startup[startupIndex - 1] - startupMean;
      const idleValue = idle[idleIndex] - idle[idleIndex - 1] - idleMean;
      numerator += startupValue * idleValue;
      startupEnergy += startupValue * startupValue;
      idleEnergy += idleValue * idleValue;
    }
    const correlation = numerator / Math.sqrt(Math.max(1e-12, startupEnergy * idleEnergy));
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestIndex = eventIndex;
    }
  }
  return bestIndex;
}

type RuntimeEngineBank = {
  directRoot: GainNode;
  programs: {
    cruise: RuntimeEngineProgram;
    load: RuntimeEngineProgram[];
  };
  root: GainNode;
  style: CarEngineStyle;
};

type RuntimeEngineProgram = {
  bands: CarEngineSampleBand[];
  directRoot: GainNode;
  layers: Array<{
    buffer: AudioBuffer;
    gain: GainNode;
    normalizationGain: number;
    source: AudioBufferSourceNode;
  }>;
  root: GainNode;
  programGain: number;
  referenceLoad: number;
  startedAt: number;
  startedOffset: number;
  stateGain: number;
};

async function loadEngineBuffer(audioContext: AudioContext, url: string) {
  let promise = engineBufferPromises.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Unable to load car engine (${response.status})`);
        return response.arrayBuffer();
      })
      .then((buffer) => audioContext.decodeAudioData(buffer))
      .then((buffer) => {
        decodedEngineBuffers.set(url, buffer);
        return buffer;
      })
      .catch((error) => {
        engineBufferPromises.delete(url);
        throw error;
      });
    engineBufferPromises.set(url, promise);
  }
  return promise;
}

async function loadEngineBank(
  audioContext: AudioContext,
  style: CarEngineStyle,
) {
  const cruise = await Promise.all(
    style.samples.rpmBands.map((band) =>
      loadEngineBuffer(audioContext, band.url),
    ),
  );
  const loadPrograms = await Promise.all(
    (style.samples.loadPrograms ?? []).map((program) =>
      Promise.all(
        program.rpmBands.map((band) =>
          loadEngineBuffer(audioContext, band.url),
        ),
      ),
    ),
  );
  return { cruise, loadPrograms };
}

function preloadEngineTransients(
  audioContext: AudioContext,
  style: CarEngineStyle,
) {
  Object.values(style.samples.transients ?? {}).forEach((url) => {
    if (url) void loadEngineBuffer(audioContext, url).catch(() => undefined);
  });
}

async function createBankedSecretEngineCore(
  initialVariant: SecretEngineVariant,
  coldStart: boolean,
): Promise<SecretEngineController> {
  const audio = getContext();
  let engineVariant = initialVariant;
  let engineStyle = getCarEngineStyle(initialVariant);
  const initialBand = engineStyle.samples.rpmBands[0];
  const startupLifecycle = engineStyle.samples.lifecycle.startup;
  // A route handoff can instantiate the engine without a fresh user gesture.
  // Browsers are allowed to reject `resume()` in that situation, but buffer
  // loading and graph construction are still valid while the context is
  // suspended. Build the real engine now; the next click/key gesture will
  // resume it. Coupling these promises used to cache a silent no-op engine
  // whenever only the autoplay-policy request failed.
  void resumeAudioContextIfVisible(audio.context).catch(() => undefined);
  const [initialBuffer, startupBuffer, tireScreechBuffers, cycleModuleAvailable] =
    await Promise.all([
      loadEngineBuffer(audio.context, initialBand.url),
      coldStart
        ? loadEngineBuffer(audio.context, startupLifecycle.url).catch(
            () => null,
          )
        : Promise.resolve(null),
      Promise.all(
        CAR_TIRE_SCREECH_BUFFERS.map((url) =>
          loadEngineBuffer(audio.context, url),
        ),
      ),
      loadEngineCycleModule(audio.context),
    ]);
  void loadEngineBuffer(
    audio.context,
    engineStyle.samples.lifecycle.shutdown.url,
  ).catch(() => undefined);
  void loadEngineBuffer(audio.context, CAR_LIGHT_IMPACT_AUDIO_URL)
    .catch(() => undefined);
  void loadEngineBuffer(audio.context, CAR_HEAVY_IMPACT_AUDIO_URL)
    .catch(() => undefined);

  const now = audio.context.currentTime;
  const initialEvents = analyzeCombustionEvents(
    initialBuffer,
    ENGINE_CYCLE_REFERENCE_RPM,
    engineStyle.combustion.eventsPerRevolution,
  );
  const matchingIdleEvent = findMatchingIdleEvent(
    startupBuffer,
    initialBuffer,
    initialEvents,
  );
  const lifecyclePlaybackRate = engineStyle.sound.lifecyclePlaybackRate;
  const maximumStartupCrossfadeDuration =
    (startupLifecycle.bankCrossfadeEndSeconds
      - startupLifecycle.bankCrossfadeStartSeconds)
    / lifecyclePlaybackRate;
  const startupPlaybackDuration = startupBuffer
    ? startupBuffer.duration / lifecyclePlaybackRate
    : startupLifecycle.bankCrossfadeEndSeconds / lifecyclePlaybackRate;
  // Faster engine variants play the shared ignition capture slightly faster.
  // Finish their handoff before that recording ends so its final milliseconds
  // cannot vanish underneath a still-running fade envelope.
  const startupCrossfadeEnd = Math.min(
    startupLifecycle.bankCrossfadeEndSeconds / lifecyclePlaybackRate,
    startupPlaybackDuration,
  );
  const startupCrossfadeDuration = Math.min(
    maximumStartupCrossfadeDuration,
    startupCrossfadeEnd,
  );
  const startupCrossfadeStart =
    startupCrossfadeEnd - startupCrossfadeDuration;
  // Derive the modeled crank/catch/flare duration from the decoded lifecycle
  // capture after playback-rate scaling. This keeps torque release and the
  // physical RPM state on the recording's actual idle-entry boundary.
  const ignitionDuration = coldStart && startupBuffer
    ? startupCrossfadeStart
    : startupLifecycle.bankCrossfadeStartSeconds / lifecyclePlaybackRate;
  const startupTorqueStart = Math.min(
    ignitionDuration,
    startupLifecycle.torqueStartSeconds / lifecyclePlaybackRate,
  );
  const startupEventCount = Math.round(
    startupCrossfadeDuration *
      initialBand.referenceRpm *
      engineStyle.combustion.eventsPerRevolution /
      60,
  );
  const initialCycleEvent = coldStart && initialEvents.length > 0
    ? (matchingIdleEvent - startupEventCount + initialEvents.length)
      % initialEvents.length
    : 0;
  const spatialBus = getCarSpatialBus(audio.context, audio.master);
  const intakeEmitter = createCarSpatialEmitter(audio.context, audio.master, 0.12);
  const exhaustEmitter = createCarSpatialEmitter(audio.context, audio.master, -0.13);
  const idleVariation = audio.context.createBufferSource();
  const idleDepth = audio.context.createGain();
  const lowFilter = audio.context.createBiquadFilter();
  const lowGain = audio.context.createGain();
  const midFilter = audio.context.createBiquadFilter();
  const midGain = audio.context.createGain();
  const highFilter = audio.context.createBiquadFilter();
  const highGain = audio.context.createGain();
  const intakeFilter = audio.context.createBiquadFilter();
  const intakeGain = audio.context.createGain();
  const overrunFilter = audio.context.createBiquadFilter();
  const overrunGain = audio.context.createGain();
  const driveDryGain = audio.context.createGain();
  const driveProgramGain = audio.context.createGain();
  const bankProgramGain = audio.context.createGain();
  const cycleProgramGain = audio.context.createGain();
  const lifecycleToneInput = audio.context.createGain();
  const engineMix = audio.context.createGain();
  const body = audio.context.createBiquadFilter();
  const presence = audio.context.createBiquadFilter();
  const outputFilter = audio.context.createBiquadFilter();
  const compressor = audio.context.createDynamicsCompressor();
  const output = audio.context.createGain();
  const engineDirectivityGain = audio.context.createGain();
  let tireScreechVoice: {
    clipGain: GainNode;
    gain: GainNode;
    source: AudioBufferSourceNode;
  } | null = null;
  let tireScreechActive = false;
  let tireScreechEventArmed = true;
  let tireScreechLastVariant = -1;
  let tireScreechOnsetAt = 0;
  let tireScreechReleaseAt = 0;
  let tireScreechNextStartAt = 0;
  let tireScreechTakeCursor = 0;
  let cycleNode: AudioWorkletNode | null = null;
  if (cycleModuleAvailable) {
    try {
      cycleNode = new AudioWorkletNode(
        audio.context,
        "engine-cycle-processor",
        {
          channelCount: 1,
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          processorOptions: {
            cylinderCount: engineStyle.combustion.cylinderCount,
            cylinderGains: [...engineStyle.combustion.cylinderGains],
            cylinderTimingMs: [...engineStyle.combustion.cylinderTimingMs],
            eventsPerRevolution: engineStyle.combustion.eventsPerRevolution,
            firingOrder: [...engineStyle.combustion.firingOrder],
            overrunCutStrength: engineStyle.combustion.overrunCutStrength,
            sources: [{
              events: new Float32Array(initialEvents),
              gain: 1,
              referenceRpm: initialBand.referenceRpm,
              samples: new Float32Array(initialBuffer.getChannelData(0)),
              sourceSampleRate: initialBuffer.sampleRate,
              startEventIndex: initialCycleEvent,
            }],
          },
        },
      );
    } catch {
      cycleNode = null;
    }
  }
  let cycleRendererActive = false;
  const banks = new Set<RuntimeEngineBank>();
  let activeBank: RuntimeEngineBank;
  let bankRequest = 0;
  let stopped = false;
  let lastUpdateTime = now;
  let lastAudioUpdate = now - 1;
  let lastLoadBlend = 0;
  let startupStateTimer: number | null = null;
  let cycleHandoffTimer: number | null = null;
  const runningAt = coldStart ? now + ignitionDuration : now;
  // Let throttle/load color enter with the ignition-to-idle crossfade. Holding
  // it until the fade had completely ended caused a conspicuous quiet shelf.
  const dynamicAudioAt = coldStart ? now + startupCrossfadeStart : now;
  let cycleLevelAutomationAt = coldStart
    ? now + startupCrossfadeEnd
    : now;
  let drivetrainState = createCarDrivetrainState(engineStyle);

  const setParameter = (
    parameter: AudioParam,
    value: number,
    time: number,
    immediate = false,
  ) => {
    if (immediate) parameter.setValueAtTime(value, time);
    else parameter.setTargetAtTime(value, time, 0.08);
  };

  const applyAcoustics = (
    style: CarEngineStyle,
    time: number,
    immediate = false,
  ) => {
    const { filters, compressor: compression } = style.sound;
    setParameter(lowFilter.frequency, filters.lowFrequency, time, immediate);
    setParameter(lowFilter.Q, filters.lowQ, time, immediate);
    setParameter(midFilter.frequency, filters.midFrequency, time, immediate);
    setParameter(midFilter.Q, filters.midQ, time, immediate);
    setParameter(highFilter.frequency, filters.highFrequency, time, immediate);
    setParameter(highFilter.Q, filters.highQ, time, immediate);
    setParameter(
      intakeFilter.frequency,
      filters.intakeFrequency,
      time,
      immediate,
    );
    setParameter(intakeFilter.Q, filters.intakeQ, time, immediate);
    setParameter(
      overrunFilter.frequency,
      filters.overrunFrequency,
      time,
      immediate,
    );
    setParameter(overrunFilter.Q, filters.overrunQ, time, immediate);
    setParameter(
      outputFilter.frequency,
      filters.outputFrequency,
      time,
      immediate,
    );
    setParameter(body.frequency, filters.bodyFrequency, time, immediate);
    setParameter(
      presence.frequency,
      filters.presenceFrequency,
      time,
      immediate,
    );
    setParameter(presence.Q, filters.presenceQ, time, immediate);
    setParameter(presence.gain, filters.presenceGain, time, immediate);
    setParameter(
      lifecycleToneInput.gain,
      style.sound.levelBase,
      time,
      immediate,
    );
    setParameter(compressor.threshold, compression.threshold, time, immediate);
    setParameter(compressor.knee, compression.knee, time, immediate);
    setParameter(compressor.ratio, compression.ratio, time, immediate);
    setParameter(compressor.attack, compression.attack, time, immediate);
    setParameter(compressor.release, compression.release, time, immediate);
  };

  lowFilter.type = "lowpass";
  midFilter.type = "bandpass";
  highFilter.type = "highpass";
  intakeFilter.type = "bandpass";
  overrunFilter.type = "bandpass";
  body.type = "lowshelf";
  presence.type = "peaking";
  outputFilter.type = "lowpass";
  outputFilter.Q.value = 0.48;
  const initialMix = getCarEngineMixTargets(engineStyle, {
    load: 0,
    overrun: 0,
    rpm: engineStyle.rpm.idle,
    shiftProgress: 0,
    speed: 0,
  });
  engineMix.gain.value = 1;
  lowGain.gain.value = initialMix.low;
  midGain.gain.value = initialMix.mid;
  highGain.gain.value = initialMix.high;
  intakeGain.gain.value = 0.0001;
  overrunGain.gain.value = 0.0001;
  // Preserve the recorded combustion body while the parallel filters add
  // load-specific color. The filtered-only path made driving several dB
  // quieter and markedly lower fidelity than idle and lifecycle recordings.
  driveDryGain.gain.value = initialMix.dry;
  driveProgramGain.gain.value = initialMix.driveLevel;
  // Keep the proven bank audible until the processor explicitly reports that
  // it initialized. Module support alone is not enough to prevent a silent
  // worklet failure on a partially compatible browser.
  bankProgramGain.gain.value = 1;
  cycleProgramGain.gain.value = 0.0001;
  lifecycleToneInput.gain.value = initialMix.driveLevel;
  body.gain.value = engineStyle.sound.body;
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(1, now + 0.14);
  engineDirectivityGain.gain.value = getCarEngineDirectivity();
  carEngineDirectivityGains.add(engineDirectivityGain);
  applyAcoustics(engineStyle, now, true);

  lowFilter.connect(lowGain).connect(engineMix);
  midFilter.connect(midGain).connect(engineMix);
  highFilter.connect(highGain).connect(engineMix);
  intakeFilter.connect(intakeGain).connect(intakeEmitter.panner);
  overrunFilter.connect(overrunGain).connect(exhaustEmitter.panner);
  driveDryGain.connect(engineMix);
  driveProgramGain.connect(lowFilter);
  driveProgramGain.connect(midFilter);
  driveProgramGain.connect(highFilter);
  driveProgramGain.connect(intakeFilter);
  driveProgramGain.connect(overrunFilter);
  driveProgramGain.connect(driveDryGain);
  bankProgramGain.connect(driveProgramGain);
  if (cycleNode) cycleNode.connect(cycleProgramGain).connect(driveProgramGain);
  if (cycleNode) {
    cycleNode.port.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (
        event.data?.type !== "ready" ||
        stopped ||
        cycleRendererActive ||
        cycleHandoffTimer !== null
      )
        return;
      // During a cold start, first complete the recorded-ignition -> bank
      // handoff. Begin this renderer transition live rather than scheduling it
      // from the earlier ready event, so immediate driving sets the correct
      // destination level instead of being forced through the idle level.
      const coldRendererGap = 0.035;
      const requestedSwitchAt = coldStart
        ? now + startupCrossfadeEnd + coldRendererGap
        : audio.context.currentTime;
      const beginRendererHandoff = () => {
        cycleHandoffTimer = null;
        if (stopped || cycleRendererActive) return;
        cycleRendererActive = true;
        const switchAt = audio.context.currentTime + 0.008;
        const duration = coldStart
          ? Math.max(0.14, engineStyle.sound.bankCrossfade)
          : Math.max(0.12, engineStyle.sound.bankCrossfade);
        const targetLevel = getCycleProgramLevel(
          engineStyle,
          Math.abs(drivetrainState.lastSpeedRatio),
        );
        const bankStartLevel = Math.max(0.0001, bankProgramGain.gain.value);
        const curveSize = 64;
        const bankFade = Float32Array.from({ length: curveSize }, (_, index) =>
          Math.max(
            0.0001,
            Math.cos(((index / (curveSize - 1)) * Math.PI) / 2) *
              bankStartLevel,
          ),
        );
        const cycleFade = Float32Array.from({ length: curveSize }, (_, index) =>
          Math.max(
            0.0001,
            Math.sin(((index / (curveSize - 1)) * Math.PI) / 2) *
              targetLevel,
          ),
        );
        cycleLevelAutomationAt = switchAt + duration;
        cycleNode?.port.postMessage({
          type: "reset",
          delayFrames: Math.max(
            0,
            Math.round(
              (switchAt - audio.context.currentTime) * audio.context.sampleRate,
            ),
          ),
          eventOffset: coldStart
            ? startupEventCount + Math.round(
                Math.max(0, switchAt - (now + startupCrossfadeEnd)) *
                engineStyle.rpm.idle *
                  engineStyle.combustion.eventsPerRevolution /
                  60,
              )
            : 0,
        });
        bankProgramGain.gain.cancelScheduledValues(switchAt);
        cycleProgramGain.gain.cancelScheduledValues(switchAt);
        bankProgramGain.gain.setValueCurveAtTime(bankFade, switchAt, duration);
        cycleProgramGain.gain.setValueCurveAtTime(cycleFade, switchAt, duration);
        engineTelemetry = { ...engineTelemetry, renderer: "cycle-coherent" };
      };
      const delayMilliseconds = Math.max(
        0,
        (requestedSwitchAt - audio.context.currentTime) * 1000,
      );
      if (delayMilliseconds > 8) {
        cycleHandoffTimer = window.setTimeout(
          beginRendererHandoff,
          delayMilliseconds,
        );
      } else {
        beginRendererHandoff();
      }
    };
  }
  // Lifecycle recordings use the same dry/low/mid/high tone as idle, but not
  // the moving drivetrain-only intake and overrun layers.
  lifecycleToneInput.connect(lowFilter);
  lifecycleToneInput.connect(midFilter);
  lifecycleToneInput.connect(highFilter);
  lifecycleToneInput.connect(driveDryGain);
  engineMix
    .connect(body)
    .connect(presence)
    .connect(outputFilter)
    .connect(compressor);
  compressor.connect(output).connect(engineDirectivityGain).connect(spatialBus);
  const startTireScreech = (
    time: number,
    input: {
      brakePressure: number;
      excitation: number;
      lateralSlip: number;
      longitudinalSlip: number;
      roadSpeedKph: number;
      serviceBraking: boolean;
      slippingWheelCount: number;
      tireLoad: number;
    },
  ) => {
    if (
      !tireScreechEventArmed
      || tireScreechVoice
      || time < tireScreechNextStartAt
    ) return;
    const physicalCharacter = input.lateralSlip > input.longitudinalSlip * 1.15
      ? 2
      : input.brakePressure > 0.68
        ? 1
        : 0;
    const forceBand = input.excitation > 0.4
      ? 2
      : input.excitation > 0.22
        ? 1
        : 0;
    const candidates = CAR_TIRE_SCREECH_VARIANT_BANDS[forceBand];
    let candidateIndex =
      (tireScreechTakeCursor * 2 + physicalCharacter) % candidates.length;
    let variantIndex = candidates[candidateIndex];
    if (variantIndex === tireScreechLastVariant) {
      candidateIndex = (candidateIndex + 1) % candidates.length;
      variantIndex = candidates[candidateIndex];
    }
    tireScreechTakeCursor = (tireScreechTakeCursor + 1) % 90;
    tireScreechLastVariant = variantIndex;
    const variant = CAR_TIRE_SCREECH_VARIANTS[variantIndex];
    const buffer = tireScreechBuffers[variant.bufferIndex];
    const source = audio.context.createBufferSource();
    const clipGain = audio.context.createGain();
    const gain = audio.context.createGain();
    const sectionStart = Math.min(
      variant.start,
      Math.max(0, buffer.duration - 0.08),
    );
    const sectionDuration = Math.max(
      0.08,
      Math.min(variant.duration, buffer.duration - sectionStart),
    );
    const attackSeconds = 0.004;
    const releaseSeconds = Math.min(variant.fadeOut, sectionDuration * 0.2);
    const sectionEnd = time + sectionDuration;
    const audibleSlip = Math.max(
      0,
      Math.min(1, (input.excitation - 0.035) / 0.72),
    );
    const loadScale = 0.88 + Math.min(1, input.tireLoad) * 0.12;
    const wheelScale = 0.92 + Math.min(4, input.slippingWheelCount) * 0.035;
    const brakeEnergy = input.serviceBraking
      ? 0.95 + input.brakePressure * 0.12
      : 1;
    const speedEnergy = 0.92 + Math.min(0.12, input.roadSpeedKph / 700);
    const recordedScreechLevel = Math.pow(audibleSlip, 0.88)
      * (0.18 + engineStyle.road.tireScrubLevel * 1.1)
      * loadScale * wheelScale * brakeEnergy * speedEnergy * variant.level;
    source.buffer = buffer;
    source.loop = false;
    clipGain.gain.setValueAtTime(0.0001, time);
    clipGain.gain.linearRampToValueAtTime(1, time + attackSeconds);
    clipGain.gain.setValueAtTime(1, sectionEnd - releaseSeconds);
    clipGain.gain.exponentialRampToValueAtTime(0.0001, sectionEnd);
    // Set the physical event level at the same instant as playback. Previously
    // the voice waited for the next animation update to fade in, losing the
    // recording's real onset and making braking sound late and chopped.
    gain.gain.setValueAtTime(
      Math.max(0.0001, recordedScreechLevel),
      time,
    );
    source.connect(clipGain).connect(gain).connect(spatialBus);
    tireScreechVoice = {
      clipGain,
      gain,
      source,
    };
    tireScreechActive = true;
    tireScreechEventArmed = false;
    source.onended = () => {
      source.disconnect();
      clipGain.disconnect();
      gain.disconnect();
      if (tireScreechVoice?.source !== source) return;
      tireScreechVoice = null;
      tireScreechActive = false;
      tireScreechNextStartAt = audio.context.currentTime + 0.025;
    };
    // A complete real event plays once per measured grip breakaway. Nothing is
    // pitch-shifted, looped, or cut into repeated fragments.
    source.start(time, sectionStart, sectionDuration);
  };
  const stopTireScreech = (time: number, releaseSeconds = 0.15) => {
    const voice = tireScreechVoice;
    if (!voice) return;
    tireScreechVoice = null;
    tireScreechActive = false;
    tireScreechNextStartAt = time + releaseSeconds + 0.04;
    voice.gain.gain.cancelAndHoldAtTime(time);
    voice.gain.gain.exponentialRampToValueAtTime(
      0.0001,
      time + releaseSeconds,
    );
    voice.source.stop(time + releaseSeconds + 0.02);
  };
  idleVariation.buffer = createIdleVariationBuffer(audio.context);
  idleVariation.loop = true;
  idleVariation.connect(idleDepth);
  idleDepth.gain.value = 0.15 + engineStyle.sound.idleDetune;

  const playLifecycleSample = (
    buffer: AudioBuffer,
    level: number,
    startTime: number,
    options: {
      fadeIn?: number;
      fadeOutDuration?: number;
      fadeOutStart?: number;
      playbackRate?: number;
    } = {},
  ) => {
    const source = audio.context.createBufferSource();
    const lifecycleGain = audio.context.createGain();
    const fadeIn = options.fadeIn ?? 0;
    const fadeOutDuration = options.fadeOutDuration ?? 0;
    const fadeOutStart = options.fadeOutStart ?? buffer.duration;
    const playbackRate = options.playbackRate ?? 1;
    const curveSize = 32;
    const fadeInCurve = Float32Array.from(
      { length: curveSize },
      (_, index) => Math.sin(((index / (curveSize - 1)) * Math.PI) / 2) * level,
    );
    const fadeOutCurve = Float32Array.from(
      { length: curveSize },
      (_, index) => Math.cos(((index / (curveSize - 1)) * Math.PI) / 2) * level,
    );
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    lifecycleGain.gain.setValueAtTime(fadeIn > 0 ? 0.0001 : level, startTime);
    if (fadeIn > 0) {
      lifecycleGain.gain.setValueCurveAtTime(fadeInCurve, startTime, fadeIn);
    }
    if (fadeOutDuration > 0) {
      lifecycleGain.gain.setValueCurveAtTime(
        fadeOutCurve,
        startTime + fadeOutStart,
        fadeOutDuration,
      );
    }
    // Lifecycle recordings share the complete engine tone, dynamics, output,
    // and spatial path. This keeps ignition and shutdown in the same acoustic
    // perspective as idle instead of sounding pasted over it.
    source.connect(lifecycleGain).connect(lifecycleToneInput);
    source.start(startTime);
    source.onended = () => {
      source.disconnect();
      lifecycleGain.disconnect();
    };
    return buffer.duration / playbackRate;
  };

  const connectProgram = (
    bankRoot: GainNode,
    bankDirectRoot: GainNode,
    bands: readonly CarEngineSampleBand[],
    buffers: AudioBuffer[],
    time: number,
    initialStateGain: number,
    sourceStartDelay = 0,
    sourceStartOffset = 0,
    referenceLoad = 0,
    programGain = 1,
  ): RuntimeEngineProgram => {
    const root = audio.context.createGain();
    const directRoot = audio.context.createGain();
    root.gain.setValueAtTime(initialStateGain, time);
    directRoot.gain.setValueAtTime(initialStateGain, time);
    root.connect(bankRoot);
    directRoot.connect(bankDirectRoot);
    const layers = buffers.map((buffer, index) => {
      const source = audio.context.createBufferSource();
      const gain = audio.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = buffer.duration;
      const normalizationGain = bands[index].gain;
      gain.gain.value =
        index === 0
          ? normalizationGain *
            (bands[index].role === "idle" ? ENGINE_IDLE_MIX_LEVEL : 1)
          : 0.0001;
      source
        .connect(gain)
        .connect(bands[index].role === "idle" ? directRoot : root);
      idleDepth.connect(source.detune);
      const offset = ((sourceStartOffset % buffer.duration) + buffer.duration)
        % buffer.duration;
      source.start(time + sourceStartDelay, offset);
      return { buffer, gain, normalizationGain, source };
    });
    return {
      bands: [...bands],
      directRoot,
      layers,
      programGain,
      referenceLoad,
      root,
      startedAt: time + sourceStartDelay,
      startedOffset: sourceStartOffset,
      stateGain: initialStateGain,
    };
  };

  const connectBank = (
    style: CarEngineStyle,
    bands: readonly CarEngineSampleBand[],
    buffers: AudioBuffer[],
    time: number,
    initialLevel: number,
    sourceStartDelay = 0,
    sourceStartOffset = 0,
  ) => {
    const root = audio.context.createGain();
    const directRoot = audio.context.createGain();
    root.gain.setValueAtTime(initialLevel, time);
    directRoot.gain.setValueAtTime(initialLevel, time);
    // Every RPM source, including idle, shares one stationary tone path. A
    // direct idle bypass made the engine resonance change at the handoff.
    root.connect(bankProgramGain);
    directRoot.connect(bankProgramGain);
    const cruise = connectProgram(
      root,
      directRoot,
      bands,
      buffers,
      time,
      1,
      sourceStartDelay,
      sourceStartOffset,
    );
    const bank: RuntimeEngineBank = {
      directRoot,
      programs: { cruise, load: [] },
      root,
      style,
    };
    banks.add(bank);
    return bank;
  };

  const getBankPrograms = (bank: RuntimeEngineBank) => [
    bank.programs.cruise,
    ...bank.programs.load,
  ];

  const retireBank = (bank: RuntimeEngineBank, stopAt: number) => {
    getBankPrograms(bank).forEach((program) => {
      program?.layers.forEach(({ source }) => source.stop(stopAt));
    });
    window.setTimeout(
      () => {
        getBankPrograms(bank).forEach((program) => {
          program?.layers.forEach(({ source, gain }) => {
            idleDepth.disconnect(source.detune);
            source.disconnect();
            gain.disconnect();
          });
          program?.root.disconnect();
          program?.directRoot.disconnect();
        });
        bank.root.disconnect();
        bank.directRoot.disconnect();
        banks.delete(bank);
      },
      Math.max(0, (stopAt - audio.context.currentTime) * 1000 + 40),
    );
  };

  const updateProgram = (
    program: RuntimeEngineProgram,
    style: CarEngineStyle,
    rpm: number,
    time: number,
    playbackResponse = 0.045,
    resetPlaybackAutomation = false,
  ) => {
    const weights = getCarEngineBandWeights(program.bands, rpm);
    program.layers.forEach(({ source, gain, normalizationGain }, index) => {
      const band = program.bands[index];
      if (!band) return;
      gain.gain.setTargetAtTime(
        Math.max(
          0.0001,
          weights[index] *
            normalizationGain *
            (band.role === "idle" ? ENGINE_IDLE_MIX_LEVEL : 1),
        ),
        time,
        0.14,
      );
      const targetPlaybackRate = Math.max(
        0.25,
        Math.min(
          2.2,
          (rpm / band.referenceRpm) *
            (band.role === "idle" ? style.sound.lifecyclePlaybackRate : 1),
        ),
      );
      if (resetPlaybackAutomation) {
        // Hold the instantaneous value before replacing stale deceleration
        // automation. This is click-safe but lets a physical stop win now.
        source.playbackRate.cancelAndHoldAtTime(time);
      }
      source.playbackRate.setTargetAtTime(
        targetPlaybackRate,
        time,
        playbackResponse,
      );
    });
  };

  const updateBank = (
    bank: RuntimeEngineBank,
    rpm: number,
    loadBlend: number,
    time: number,
    playbackResponse = 0.045,
    resetPlaybackAutomation = false,
  ) => {
    const programs = getBankPrograms(bank);
    const loadWeights = getCarEngineLoadWeights(
      programs.map((program) => program.referenceLoad),
      programs.length > 1 ? loadBlend : 0,
    );
    programs.forEach((program, index) => {
      const stateGain = loadWeights[index] * program.programGain;
      program.stateGain = stateGain;
      program.root.gain.setTargetAtTime(
        Math.max(0.0001, stateGain),
        time,
        0.12,
      );
      program.directRoot.gain.setTargetAtTime(
        Math.max(0.0001, stateGain),
        time,
        0.12,
      );
      updateProgram(
        program,
        bank.style,
        rpm,
        time,
        playbackResponse,
        resetPlaybackAutomation,
      );
    });
  };

  const triggerTransient = (kind: CarEngineTransient) => {
    if (stopped || !activeBank) return;
    const dedicatedUrl = engineStyle.samples.transients?.[kind];
    const buffer = dedicatedUrl
      ? decodedEngineBuffers.get(dedicatedUrl)
      : undefined;
    // Never manufacture a transient by chopping an arbitrary piece out of a
    // looping RPM bank. Those snippets have no physical attack or release and
    // sound like clicks from a second, filtered engine. Until a style provides
    // a genuine recorded event, the continuous drivetrain envelope is the
    // natural fallback.
    if (!buffer) return;
    const time = audio.context.currentTime;
    const duration = buffer.duration;
    const source = audio.context.createBufferSource();
    const gain = audio.context.createGain();
    source.buffer = buffer;
    const level = engineStyle.sound.transientLevel;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.02);
    gain.gain.setValueAtTime(level, time + Math.max(0.02, duration - 0.06));
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);
    source.connect(gain).connect(engineMix);
    source.start(time);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  };

  const crossfadeToBank = (
    style: CarEngineStyle,
    bands: readonly CarEngineSampleBand[],
    buffers: AudioBuffer[],
    request: number,
  ) => {
    if (stopped || request !== bankRequest) return null;
    const time = audio.context.currentTime;
    const previousBank = activeBank;
    const nextBank = connectBank(style, bands, buffers, time, 0.0001);
    updateBank(nextBank, drivetrainState.rpm, lastLoadBlend, time);
    nextBank.root.gain.exponentialRampToValueAtTime(
      style.sound.normalization,
      time + style.sound.bankCrossfade,
    );
    nextBank.directRoot.gain.exponentialRampToValueAtTime(
      style.sound.normalization,
      time + style.sound.bankCrossfade,
    );
    previousBank.root.gain.cancelScheduledValues(time);
    previousBank.root.gain.setValueAtTime(
      Math.max(0.0001, previousBank.root.gain.value),
      time,
    );
    previousBank.root.gain.exponentialRampToValueAtTime(
      0.0001,
      time + style.sound.bankCrossfade,
    );
    previousBank.directRoot.gain.cancelScheduledValues(time);
    previousBank.directRoot.gain.setValueAtTime(
      Math.max(0.0001, previousBank.directRoot.gain.value),
      time,
    );
    previousBank.directRoot.gain.exponentialRampToValueAtTime(
      0.0001,
      time + style.sound.bankCrossfade,
    );
    activeBank = nextBank;
    retireBank(previousBank, time + style.sound.bankCrossfade + 0.04);
    return nextBank;
  };

  const expandCruiseProgram = (
    bank: RuntimeEngineBank,
    style: CarEngineStyle,
    buffers: AudioBuffer[],
    request: number,
  ) => {
    if (stopped || request !== bankRequest || activeBank !== bank) return;
    const time = audio.context.currentTime;
    const program = bank.programs.cruise;
    const firstMissingLayer = program.layers.length;
    style.samples.rpmBands.slice(firstMissingLayer).forEach((band, offset) => {
      const index = firstMissingLayer + offset;
      const source = audio.context.createBufferSource();
      const gain = audio.context.createGain();
      const normalizationGain = band.gain;
      source.buffer = buffers[index];
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = buffers[index].duration;
      gain.gain.value = 0.0001;
      source
        .connect(gain)
        .connect(band.role === "idle" ? program.directRoot : program.root);
      idleDepth.connect(source.detune);
      // Join an already-running bank close to its current normalized phrase
      // position instead of always restarting at the beginning of the loop.
      const anchor = program.layers[0];
      const anchorBand = program.bands[0];
      const elapsed = Math.max(0, time - program.startedAt);
      const anchorRate =
        (drivetrainState.rpm / anchorBand.referenceRpm) *
        (anchorBand.role === "idle"
          ? bank.style.sound.lifecyclePlaybackRate
          : 1);
      const rawPhase = anchor
        ? (program.startedOffset + elapsed * anchorRate)
            / anchor.buffer.duration
        : 0;
      const normalizedPhase = ((rawPhase % 1) + 1) % 1;
      // Assets commonly finish loading before the ignition handoff starts.
      // They must still be queued at the idle layer's matched cycle position;
      // starting future layers at offset zero made immediate throttle blend
      // phase-opposed recordings and caused a pronounced cancellation dip.
      source.start(
        time < program.startedAt ? program.startedAt : time,
        normalizedPhase * buffers[index].duration,
      );
      program.bands.push(band);
      program.layers.push({
        buffer: buffers[index],
        gain,
        normalizationGain,
        source,
      });
    });
    updateBank(bank, drivetrainState.rpm, lastLoadBlend, time);
  };

  const attachLoadPrograms = (
    bank: RuntimeEngineBank,
    style: CarEngineStyle,
    buffers: AudioBuffer[][],
    request: number,
  ) => {
    const definitions = style.samples.loadPrograms ?? [];
    if (
      definitions.length === 0 ||
      buffers.length !== definitions.length ||
      stopped ||
      request !== bankRequest ||
      activeBank !== bank
    )
      return;
    const time = audio.context.currentTime;
    bank.programs.load = definitions.map((definition, index) =>
      connectProgram(
        bank.root,
        bank.directRoot,
        definition.rpmBands,
        buffers[index],
        time,
        0.0001,
        0,
        0,
        definition.referenceLoad,
        definition.gain,
      ),
    );
    updateBank(bank, drivetrainState.rpm, lastLoadBlend, time);
  };

  const completeProgressiveBank = (
    style: CarEngineStyle,
    request: number,
    bank: RuntimeEngineBank,
  ) => {
    preloadEngineTransients(audio.context, style);
    void loadEngineBank(audio.context, style)
      .then((buffers) => {
        if (!stopped && request === bankRequest && activeBank === bank) {
          cycleNode?.port.postMessage({
            type: "sources",
            sources: style.samples.rpmBands.map((band, index) => {
              const buffer = buffers.cruise[index];
              const analysisRpm = band.role === "idle"
                ? ENGINE_CYCLE_REFERENCE_RPM
                : band.referenceRpm;
              return {
                events: new Float32Array(
                  analyzeCombustionEvents(
                    buffer,
                    analysisRpm,
                    style.combustion.eventsPerRevolution,
                  ),
                ),
                gain: band.gain,
                referenceRpm: band.referenceRpm,
                samples: new Float32Array(buffer.getChannelData(0)),
                sourceSampleRate: buffer.sampleRate,
                startEventIndex: band.role === "idle" ? initialCycleEvent : 0,
              };
            }),
          });
        }
        expandCruiseProgram(bank, style, buffers.cruise, request);
        attachLoadPrograms(bank, style, buffers.loadPrograms, request);
      })
      .catch(() => {
        // The decoded idle layer remains a complete, playable fallback.
      });
  };

  activeBank = connectBank(
    engineStyle,
    [initialBand],
    [initialBuffer],
    now,
    coldStart && startupBuffer ? 0.0001 : engineStyle.sound.normalization,
    coldStart && startupBuffer ? startupCrossfadeStart : 0,
    coldStart && startupBuffer && initialEvents.length > 0
      ? (
          initialEvents[matchingIdleEvent] -
          startupCrossfadeDuration *
            initialBuffer.sampleRate *
            engineStyle.sound.lifecyclePlaybackRate
        ) / initialBuffer.sampleRate
      : 0,
  );
  updateBank(activeBank, engineStyle.rpm.idle, lastLoadBlend, now);
  cycleNode?.parameters.get("rpm")?.setValueAtTime(engineStyle.rpm.idle, now);
  cycleNode?.parameters.get("load")?.setValueAtTime(0, now);
  cycleNode?.parameters.get("overrun")?.setValueAtTime(0, now);
  cycleNode?.parameters.get("shift")?.setValueAtTime(0, now);
  cycleNode?.parameters.get("rpmAcceleration")?.setValueAtTime(0, now);
  cycleNode?.parameters.get("limiter")?.setValueAtTime(0, now);
  idleVariation.start(now);
  if (coldStart && startupBuffer) {
    const crossfadeDuration = startupCrossfadeDuration;
    playLifecycleSample(
      startupBuffer,
      engineStyle.sound.normalization * ENGINE_LIFECYCLE_MIX_LEVEL,
      now,
      {
        fadeOutDuration: crossfadeDuration,
        fadeOutStart: startupCrossfadeStart,
        playbackRate: engineStyle.sound.lifecyclePlaybackRate,
      },
    );
    const curveSize = 32;
    const bankFadeIn = Float32Array.from({ length: curveSize }, (_, index) =>
      Math.max(
        0.0001,
        Math.sin(((index / (curveSize - 1)) * Math.PI) / 2) *
          engineStyle.sound.normalization *
          ENGINE_STARTUP_IDLE_ENTRY_LEVEL,
      ),
    );
    activeBank.root.gain.setValueCurveAtTime(
      bankFadeIn,
      now + startupCrossfadeStart,
      crossfadeDuration,
    );
    activeBank.directRoot.gain.setValueCurveAtTime(
      bankFadeIn,
      now + startupCrossfadeStart,
      crossfadeDuration,
    );
    activeBank.root.gain.setTargetAtTime(
      engineStyle.sound.normalization,
      now + startupCrossfadeEnd,
      0.22,
    );
    activeBank.directRoot.gain.setTargetAtTime(
      engineStyle.sound.normalization,
      now + startupCrossfadeEnd,
      0.22,
    );
    if (cycleRendererActive) {
      cycleProgramGain.gain.setValueCurveAtTime(
        bankFadeIn,
        now + startupCrossfadeStart,
        crossfadeDuration,
      );
    }
  } else if (coldStart) {
    triggerTransient("ignition");
    if (cycleRendererActive) {
      cycleProgramGain.gain.exponentialRampToValueAtTime(
        getCycleProgramLevel(engineStyle, 0),
        now + 0.14,
      );
    }
  }
  const initialIgnition = getCarIgnitionState(
    engineStyle,
    coldStart ? 0 : ignitionDuration,
    ignitionDuration,
  );
  engineTelemetry = {
    ...engineTelemetry,
    acousticLoad: 0,
    engineLabel: engineStyle.label,
    engineState: coldStart ? "starting" : "running",
    ignitionPhase: initialIgnition.phase,
    limiterCut: 0,
    gearCount: engineStyle.transmission.gears.length,
    loadBlend: 0,
    renderer: cycleRendererActive ? "cycle-coherent" : "banked",
    rpm: initialIgnition.rpm,
    rpmVelocity: initialIgnition.rpmVelocity,
    shiftProgress: 0,
    targetRpm: initialIgnition.rpm,
    throttle: 0,
    torqueFactor: coldStart ? 0 : 1,
    variant: engineVariant,
  };
  if (coldStart) {
    startupStateTimer = window.setTimeout(() => {
      startupStateTimer = null;
      if (stopped || engineTelemetry.engineState !== "starting") return;
      engineTelemetry = {
        ...engineTelemetry,
        engineState: "running",
        ignitionPhase: "running",
      };
    }, ignitionDuration * 1000);
  }
  completeProgressiveBank(engineStyle, ++bankRequest, activeBank);

  const switchStyle = (variant: SecretEngineVariant) => {
    if (variant === engineVariant) return;
    const previousSourceId = engineStyle.samples.sourceId;
    engineVariant = variant;
    engineStyle = getCarEngineStyle(variant);
    void loadEngineBuffer(
      audio.context,
      engineStyle.samples.lifecycle.shutdown.url,
    ).catch(() => undefined);
    cycleNode?.port.postMessage({
      type: "configuration",
      cylinderCount: engineStyle.combustion.cylinderCount,
      cylinderGains: [...engineStyle.combustion.cylinderGains],
      cylinderTimingMs: [...engineStyle.combustion.cylinderTimingMs],
      eventsPerRevolution: engineStyle.combustion.eventsPerRevolution,
      firingOrder: [...engineStyle.combustion.firingOrder],
      overrunCutStrength: engineStyle.combustion.overrunCutStrength,
    });
    drivetrainState = {
      ...drivetrainState,
      forwardGear: Math.min(
        drivetrainState.forwardGear,
        engineStyle.transmission.gears.length,
      ),
      shiftTargetGear: drivetrainState.shiftTargetGear === null
        ? null
        : Math.min(
            drivetrainState.shiftTargetGear,
            engineStyle.transmission.gears.length,
          ),
      rpm: Math.max(
        engineStyle.rpm.idle,
        Math.min(engineStyle.rpm.maximum, drivetrainState.rpm),
      ),
    };
    applyAcoustics(engineStyle, audio.context.currentTime);
    cycleProgramGain.gain.setTargetAtTime(
      cycleRendererActive
        ? getCycleProgramLevel(
            engineStyle,
            Math.abs(drivetrainState.lastSpeedRatio),
          )
        : 0.0001,
      audio.context.currentTime,
      engineStyle.sound.bankCrossfade,
    );
    engineTelemetry = {
      ...engineTelemetry,
      engineLabel: engineStyle.label,
      gearCount: engineStyle.transmission.gears.length,
      variant,
    };
    if (engineStyle.samples.sourceId === previousSourceId) {
      // A vehicle selection changes gearing, coupling, mass, and road layers,
      // but it must not restart or crossfade the same physical engine. Keep
      // the running bank at its current phase and adopt the new drivetrain.
      activeBank.style = engineStyle;
      return;
    }
    const request = ++bankRequest;
    const style = engineStyle;
    const idleBand = style.samples.rpmBands[0];
    void loadEngineBuffer(audio.context, idleBand.url)
      .then((buffer) => {
        if (stopped || request !== bankRequest) return;
        const bank = crossfadeToBank(style, [idleBand], [buffer], request);
        if (bank) completeProgressiveBank(style, request, bank);
      })
      .catch(() => {
        // Keep the previous bank alive if a future optional engine asset fails.
      });
  };

  const stop = (graceful = false) => {
    if (stopped) return 0;
    const time = audio.context.currentTime;
    const shutdownBuffer = graceful
      ? decodedEngineBuffers.get(engineStyle.samples.lifecycle.shutdown.url)
      : undefined;
    const shutdownCrossfade = engineStyle.samples.lifecycle.shutdown.crossfadeSeconds
      / engineStyle.sound.lifecyclePlaybackRate;
    let shutdownDuration = 0;
    if (graceful) {
      const shutdownMix = getCarEngineMixTargets(engineStyle, {
        load: 0,
        overrun: 0,
        rpm: engineStyle.rpm.idle,
        shiftProgress: 0,
        speed: 0,
      });
      cycleProgramGain.gain.cancelScheduledValues(time);
      cycleProgramGain.gain.setValueAtTime(
        Math.max(0.0001, cycleProgramGain.gain.value),
        time,
      );
      cycleProgramGain.gain.exponentialRampToValueAtTime(
        0.0001,
        time + shutdownCrossfade,
      );
      lowGain.gain.setTargetAtTime(shutdownMix.low, time, 0.06);
      midGain.gain.setTargetAtTime(shutdownMix.mid, time, 0.06);
      highGain.gain.setTargetAtTime(shutdownMix.high, time, 0.06);
      driveDryGain.gain.setTargetAtTime(shutdownMix.dry, time, 0.06);
      intakeGain.gain.setTargetAtTime(0.0001, time, 0.04);
      overrunGain.gain.setTargetAtTime(0.0001, time, 0.04);
    }
    if (shutdownBuffer) {
      shutdownDuration = playLifecycleSample(
        shutdownBuffer,
        engineStyle.sound.normalization * ENGINE_LIFECYCLE_MIX_LEVEL,
        time,
        {
          fadeIn: shutdownCrossfade,
          playbackRate: engineStyle.sound.lifecyclePlaybackRate,
        },
      );
    } else if (graceful) {
      triggerTransient("shutdown");
      shutdownDuration = 0.48;
    }
    intakeGain.gain.setTargetAtTime(0.0001, time, 0.035);
    overrunGain.gain.setTargetAtTime(0.0001, time, 0.035);
    stopped = true;
    if (startupStateTimer !== null) {
      window.clearTimeout(startupStateTimer);
      startupStateTimer = null;
    }
    if (cycleHandoffTimer !== null) {
      window.clearTimeout(cycleHandoffTimer);
      cycleHandoffTimer = null;
    }
    bankRequest += 1;
    const stopAt = graceful
      ? time + Math.max(0.78, shutdownDuration + 0.08)
      : time + 0.14;
    output.gain.cancelScheduledValues(time);
    output.gain.setValueAtTime(Math.max(output.gain.value, 0.0001), time);
    if (graceful) {
      const curveSize = 32;
      banks.forEach((bank) => {
        const rootLevel = Math.max(0.0001, bank.root.gain.value);
        const directLevel = Math.max(0.0001, bank.directRoot.gain.value);
        const rootFade = Float32Array.from({ length: curveSize }, (_, index) =>
          Math.max(
            0.0001,
            Math.cos(((index / (curveSize - 1)) * Math.PI) / 2) * rootLevel,
          ),
        );
        const directFade = Float32Array.from(
          { length: curveSize },
          (_, index) =>
            Math.max(
              0.0001,
              Math.cos(((index / (curveSize - 1)) * Math.PI) / 2) * directLevel,
            ),
        );
        bank.root.gain.cancelScheduledValues(time);
        bank.directRoot.gain.cancelScheduledValues(time);
        bank.root.gain.setValueCurveAtTime(
          rootFade,
          time,
          shutdownCrossfade,
        );
        bank.directRoot.gain.setValueCurveAtTime(
          directFade,
          time,
          shutdownCrossfade,
        );
      });
      // The shutdown recording contains its own fuel cut and rundown. Keep the
      // common output open through its final sample; fading this master early
      // made the engine appear to be cut off a second time.
      output.gain.setValueAtTime(1, time);
    } else {
      output.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    }
    stopTireScreech(time, 0.035);
    banks.forEach((bank) => retireBank(bank, stopAt + 0.02));
    idleVariation.stop(stopAt + 0.02);
    engineTelemetry = {
      acousticLoad: 0,
      abruptStop: false,
      braking: false,
      clutch: 1,
      clutchSlipRpm: 0,
      decelerationRate: 0,
      direction: 0,
      engineLabel: engineStyle.label,
      engineState: graceful ? "stopping" : "off",
      ignitionPhase: "off",
      limiterCut: 0,
      gear: 0,
      gearCount: engineStyle.transmission.gears.length,
      hardDeceleration: false,
      load: 0,
      playbackRate: engineStyle.sound.playbackBase,
      loadBlend: 0,
      overrun: 0,
      rapidRpmRecovery: false,
      renderer: cycleRendererActive ? "cycle-coherent" : "banked",
      roadSpeedKph: 0,
      rpm: engineStyle.rpm.idle,
      rpmVelocity: 0,
      serviceBraking: false,
      speedRatio: 0,
      steering: 0,
      tireSlip: 0,
      shiftState: "steady",
      shiftProgress: 0,
      targetRpm: engineStyle.rpm.idle,
      throttle: 0,
      torqueFactor: 0,
      variant: engineVariant,
      wheelForceNewtons: 0,
    };
    window.setTimeout(
      () => {
        if (graceful && engineTelemetry.engineState === "stopping") {
          engineTelemetry = { ...engineTelemetry, engineState: "off" };
        }
        idleVariation.disconnect();
        idleDepth.disconnect();
        lowFilter.disconnect();
        lowGain.disconnect();
        midFilter.disconnect();
        midGain.disconnect();
        highFilter.disconnect();
        highGain.disconnect();
        intakeFilter.disconnect();
        intakeGain.disconnect();
        overrunFilter.disconnect();
        overrunGain.disconnect();
        driveDryGain.disconnect();
        bankProgramGain.disconnect();
        cycleNode?.disconnect();
        cycleProgramGain.disconnect();
        driveProgramGain.disconnect();
        lifecycleToneInput.disconnect();
        engineMix.disconnect();
        body.disconnect();
        presence.disconnect();
        outputFilter.disconnect();
        compressor.disconnect();
        output.disconnect();
        carEngineDirectivityGains.delete(engineDirectivityGain);
        engineDirectivityGain.disconnect();
        disconnectCarSpatialEmitter(intakeEmitter);
        disconnectCarSpatialEmitter(exhaustEmitter);
      },
      Math.ceil((stopAt - time) * 1000 + 80),
    );
    return stopAt - time;
  };

  return {
    cancelHandoff() {},
    handoff() {},
    isActive() {
      return !stopped;
    },
    shutdown() {
      return stop(true);
    },
    setVariant: switchStyle,
    setDrive(
      signedSpeedRatio,
      throttle,
      steering = 0,
      serviceBrake = false,
      tireSlip = 0,
      engagedDirection,
      mechanicalDrive,
      tireFeedback,
    ) {
      if (stopped) return;
      if (audio.context.state !== "running") {
        void resumeAudioContextIfVisible(audio.context);
      }
      const time = audio.context.currentTime;
      const ignition = getCarIgnitionState(
        engineStyle,
        coldStart ? time - now : ignitionDuration,
        ignitionDuration,
      );
      const starting = ignition.phase !== "running" && time < runningAt;
      const startupThrottleAuthority = starting
        ? getCarIgnitionThrottleAuthority(
            time - now,
            startupTorqueStart,
            ignitionDuration,
          )
        : 1;
      const deltaSeconds = Math.max(
        1 / 120,
        Math.min(0.1, time - lastUpdateTime),
      );
      lastUpdateTime = time;
      const previousLoad = mechanicalDrive?.load ?? drivetrainState.lastLoad;
      const update = mechanicalDrive
        ? null
        : updateCarDrivetrain(drivetrainState, engineStyle, {
            deltaSeconds,
            engagedDirection,
            serviceBrake,
            signedSpeedRatio,
            steering,
            throttle: throttle * startupThrottleAuthority,
          });
      if (update) {
        drivetrainState = starting
          ? {
              ...update.state,
              rpm: ignition.rpm,
              rpmVelocity: ignition.rpmVelocity,
            }
          : update.state;
      }
      const mechanicalOutput = mechanicalDrive ?? update!.output;
      const drive = starting
        ? {
            ...mechanicalOutput,
            rpm: ignition.rpm,
            rpmVelocity: ignition.rpmVelocity,
            targetRpm: ignition.rpm,
          }
        : mechanicalOutput;
      const speed = Math.abs(drive.speedRatio);
      const mix = getCarEngineMixTargets(engineStyle, {
        load: drive.load,
        overrun: drive.overrun,
        rpm: drive.rpm,
        shiftProgress: drive.shiftProgress,
        speed,
      });
      lastLoadBlend = mix.loadBlend;
      const rpmRatio = Math.max(
        0,
        Math.min(
          1,
          (drive.rpm - engineStyle.rpm.idle) /
            (engineStyle.rpm.maximum - engineStyle.rpm.idle),
        ),
      );
      const playbackRate =
        engineStyle.sound.playbackBase +
        rpmRatio * engineStyle.sound.playbackSpan;
      engineTelemetry = {
        ...drive,
        acousticLoad: drive.load,
        engineLabel: engineStyle.label,
        engineState: starting ? "starting" : "running",
        ignitionPhase: ignition.phase,
        gearCount: engineStyle.transmission.gears.length,
        playbackRate,
        loadBlend: mix.loadBlend,
        renderer: cycleRendererActive ? "cycle-coherent" : "banked",
        tireSlip: Math.max(0, Math.min(1, tireSlip)),
        torqueFactor: drive.torqueFactor,
        variant: engineVariant,
      };
      if (drive.shifted) triggerTransient("shift");
      else if (drive.load - previousLoad > 0.24) triggerTransient("throttle");
      if (
        time - lastAudioUpdate < ENGINE_AUDIO_CONTROL_INTERVAL
        && !drive.shifted
      ) return;
      lastAudioUpdate = time;

      const playbackResponse = drive.abruptStop
        ? 0.012
        : drive.rapidRpmRecovery
          ? 0.022
          : drive.braking
            ? 0.03
            : 0.045;
      const toneResponse = drive.abruptStop
        ? 0.03
        : drive.rapidRpmRecovery
          ? 0.055
          : drive.braking
            ? 0.07
            : 0.14;
      const levelResponse = drive.abruptStop
        ? 0.035
        : drive.rapidRpmRecovery
          ? 0.06
          : drive.load < previousLoad
            ? 0.16
            : 0.11;
      const cycleRpm = cycleNode?.parameters.get("rpm");
      if (cycleRpm) {
        if (drive.abruptStop) cycleRpm.cancelAndHoldAtTime(time);
        cycleRpm.setTargetAtTime(drive.rpm, time, playbackResponse);
      }
      cycleNode?.parameters.get("load")?.setTargetAtTime(
        drive.load,
        time,
        0.015,
      );
      cycleNode?.parameters.get("overrun")?.setTargetAtTime(
        drive.overrun,
        time,
        drive.overrun > 0.05 ? 0.055 : 0.09,
      );
      cycleNode?.parameters.get("shift")?.setTargetAtTime(
        Math.sin(drive.shiftProgress * Math.PI),
        time,
        0.01,
      );
      cycleNode?.parameters.get("rpmAcceleration")?.setTargetAtTime(
        Math.max(-1, Math.min(1, drive.rpmVelocity / 12_000)),
        time,
        0.012,
      );
      cycleNode?.parameters.get("limiter")?.setTargetAtTime(
        drive.limiterCut,
        time,
        drive.limiterCut > 0 ? 0.003 : 0.012,
      );
      if (cycleRendererActive && time >= cycleLevelAutomationAt) {
        cycleProgramGain.gain.setTargetAtTime(
          getCycleProgramLevel(engineStyle, speed),
          time,
          levelResponse,
        );
      }
      banks.forEach((bank) =>
        updateBank(
          bank,
          drive.rpm,
          mix.loadBlend,
          time,
          playbackResponse,
          drive.abruptStop,
        ),
      );
      idleDepth.gain.setTargetAtTime(
        0.15 +
          Math.max(0, 1 - speed / engineStyle.sound.idleFadeSpeed) *
            engineStyle.sound.idleDetune,
        time,
        drive.hardDeceleration ? 0.05 : 0.12,
      );
      // Keep the global body/presence response stationary. Load changes the
      // source program and parallel physical components instead of sweeping a
      // filter across the whole engine, which sounded digitally "filtered".
      lowGain.gain.setTargetAtTime(mix.low, time, toneResponse);
      midGain.gain.setTargetAtTime(mix.mid, time, toneResponse);
      highGain.gain.setTargetAtTime(mix.high, time, toneResponse);
      driveDryGain.gain.setTargetAtTime(mix.dry, time, toneResponse);
      intakeGain.gain.setTargetAtTime(mix.intake, time, levelResponse);
      overrunFilter.frequency.setTargetAtTime(
        engineStyle.sound.filters.overrunFrequency + rpmRatio * 420,
        time,
        0.1,
      );
      overrunGain.gain.setTargetAtTime(
        mix.overrun,
        time,
        mix.overrun > 0.0001 ? 0.1 : 0.18,
      );
      if (time >= dynamicAudioAt) {
        driveProgramGain.gain.setTargetAtTime(
          mix.driveLevel,
          time,
          levelResponse,
        );
      }
      const lateralSlip = Math.max(0, Math.min(
        1,
        tireFeedback?.lateralSlip ?? tireSlip,
      ));
      const longitudinalSlip = Math.max(0, Math.min(
        1,
        tireFeedback?.longitudinalSlip
          ?? (serviceBrake ? tireSlip : 0),
      ));
      const adhesionLoss = Math.max(0, Math.min(
        1,
        tireFeedback?.adhesionLoss ?? 0,
      ));
      const tireLoad = Math.max(0, tireFeedback?.tireLoad ?? 0);
      const brakingBreakaway = Math.max(0, Math.min(
        1,
        tireFeedback?.brakingBreakaway
          ?? (serviceBrake
            ? longitudinalSlip * (0.48 + adhesionLoss * 0.52)
            : 0),
      ));
      const drivenBreakaway = Math.max(0, Math.min(
        1,
        tireFeedback?.drivenBreakaway
          ?? (!serviceBrake
            ? longitudinalSlip * (0.48 + adhesionLoss * 0.52)
            : 0),
      ));
      const corneringBreakaway = Math.max(0, Math.min(
        1,
        tireFeedback?.corneringBreakaway
          ?? lateralSlip * (0.48 + adhesionLoss * 0.52),
      ));
      const roadSpeedKph = Math.abs(drive.roadSpeedKph);
      const lowSpeedWheelspin = drivenBreakaway > 0.6 && drive.load > 0.45;
      const rollingSpeedGate = lowSpeedWheelspin
        ? Math.min(1, (roadSpeedKph + 4) / 10)
        : Math.max(0, Math.min(1, (roadSpeedKph - 5) / 15));
      const brakingSpeedGate = Math.max(
        0,
        Math.min(1, (roadSpeedKph - 12) / 18),
      );
      const brakingExcitation = Math.max(0, Math.min(
        1,
        ((brakingBreakaway - 0.16) / 0.52) * brakingSpeedGate,
      ));
      const corneringExcitation = Math.max(0, Math.min(
        1,
        ((corneringBreakaway - 0.42) / 0.42) * rollingSpeedGate,
      ));
      const drivenExcitation = Math.max(0, Math.min(
        1,
        ((drivenBreakaway - 0.4) / 0.45)
          * (lowSpeedWheelspin
            ? Math.min(1, (roadSpeedKph + 4) / 10)
            : rollingSpeedGate),
      ));
      // Recorded tire screech is reserved for extreme loss of grip. Braking
      // additionally requires high pressure and longitudinal adhesion loss at
      // the same wheel; steering slip and powered wheelspin remain separate
      // physical causes instead of sharing one generic maximum.
      const excitation = Math.max(
        brakingExcitation,
        corneringExcitation,
        drivenExcitation,
      );
      const brakePressure = Math.max(
        0,
        Math.min(1, tireFeedback?.brakePressure ?? (serviceBrake ? 1 : 0)),
      );
      const onsetThreshold = 0.085;
      const releaseThreshold = 0.04;
      if (excitation >= onsetThreshold) {
        if (tireScreechOnsetAt === 0) tireScreechOnsetAt = time;
      } else {
        tireScreechOnsetAt = 0;
      }
      if (excitation > releaseThreshold) {
        // Bridge ABS/contact-patch modulation without turning each pressure
        // pulse into another sample trigger.
        tireScreechReleaseAt = time + 0.16;
      } else if (time >= tireScreechReleaseAt) {
        tireScreechEventArmed = true;
        if (tireScreechActive) stopTireScreech(time, 0.09);
      }
      const onsetDwell = excitation > 0.5 ? 0.008 : 0.022;
      if (
        tireScreechEventArmed
        && !tireScreechActive
        && excitation >= onsetThreshold
        && time - tireScreechOnsetAt >= onsetDwell
      ) {
        startTireScreech(time, {
          brakePressure,
          excitation,
          lateralSlip,
          longitudinalSlip,
          roadSpeedKph,
          serviceBraking: tireFeedback?.serviceBraking ?? serviceBrake,
          slippingWheelCount: tireFeedback?.slippingWheelCount ?? 1,
          tireLoad,
        });
      }
    },
    stop,
  };
}

export function shutdownActiveSecretEngine() {
  // Invalidate a graph that is still being constructed as well as the graph
  // already on the page. Web Audio setup is asynchronous, so clearing only
  // `activeEngineCore` allowed a pending startup to publish itself after Park.
  engineCoreGeneration += 1;
  engineShutdownLocked = true;
  currentEngineLease = 0;
  if (engineRouteHoldTimer !== null) {
    window.clearTimeout(engineRouteHoldTimer);
    engineRouteHoldTimer = null;
  }
  if (!activeEngineCore) return 0;
  const duration = activeEngineCore.shutdown();
  activeEngineCore = null;
  return duration;
}

export async function startSecretEngine(
  variant: SecretEngineVariant = "city",
  options: { coldStart?: boolean } = {},
): Promise<SecretEngineController> {
  if (engineShutdownLocked) {
    if (options.coldStart) engineShutdownLocked = false;
    else throw new Error("Engine recovery is locked until the next cold start");
  }
  const generation = engineCoreGeneration;
  const lease = ++engineLeaseSerial;
  currentEngineLease = lease;
  if (engineRouteHoldTimer !== null) {
    window.clearTimeout(engineRouteHoldTimer);
    engineRouteHoldTimer = null;
  }

  // Never lease a core whose graph has already stopped. A stale module-level
  // reference previously returned a valid-looking controller that ignored
  // every drive update and left the car permanently without torque.
  if (
    activeEngineCore
    && (!activeEngineCore.isActive() || engineTelemetry.engineState === "off")
  ) {
    activeEngineCore.stop();
    activeEngineCore = null;
  }

  if (!activeEngineCore) {
    engineCorePromise ??= createBankedSecretEngineCore(
      variant,
      options.coldStart ?? true,
    )
      .then((core) => {
        if (generation !== engineCoreGeneration) {
          core.stop();
        } else {
          activeEngineCore = core;
        }
        return core;
      })
      .finally(() => {
        engineCorePromise = null;
      });
  }
  const core = activeEngineCore ?? (await engineCorePromise!);
  if (
    generation === engineCoreGeneration
    && lease === currentEngineLease
    && core === activeEngineCore
  ) {
    core.setVariant(variant);
  }

  return {
    cancelHandoff() {
      if (lease !== currentEngineLease || core !== activeEngineCore) return;
      if (engineRouteHoldTimer !== null) {
        window.clearTimeout(engineRouteHoldTimer);
        engineRouteHoldTimer = null;
      }
    },
    handoff() {
      if (lease !== currentEngineLease || core !== activeEngineCore) return;
      if (engineRouteHoldTimer !== null)
        window.clearTimeout(engineRouteHoldTimer);
      engineRouteHoldTimer = window.setTimeout(() => {
        if (lease !== currentEngineLease || core !== activeEngineCore) return;
        currentEngineLease = 0;
        core.stop();
        activeEngineCore = null;
        engineRouteHoldTimer = null;
      }, 6000);
    },
    isActive() {
      return lease === currentEngineLease
        && core === activeEngineCore
        && core.isActive();
    },
    shutdown() {
      if (lease !== currentEngineLease || core !== activeEngineCore) return 0;
      currentEngineLease = 0;
      if (engineRouteHoldTimer !== null) {
        window.clearTimeout(engineRouteHoldTimer);
        engineRouteHoldTimer = null;
      }
      const duration = core.shutdown();
      activeEngineCore = null;
      return duration;
    },
    setDrive(
      signedSpeedRatio,
      throttle,
      steering = 0,
      serviceBrake = false,
      tireSlip = 0,
      engagedDirection,
      mechanicalDrive,
      tireFeedback,
    ) {
      if (lease !== currentEngineLease || core !== activeEngineCore) return;
      core.setDrive(
        signedSpeedRatio,
        throttle,
        steering,
        serviceBrake,
        tireSlip,
        engagedDirection,
        mechanicalDrive,
        tireFeedback,
      );
    },
    setVariant(nextVariant) {
      if (lease !== currentEngineLease || core !== activeEngineCore) return;
      core.setVariant(nextVariant);
    },
    stop() {
      if (lease !== currentEngineLease || core !== activeEngineCore) return;
      currentEngineLease = 0;
      if (engineRouteHoldTimer !== null) {
        window.clearTimeout(engineRouteHoldTimer);
        engineRouteHoldTimer = null;
      }
      core.stop();
      activeEngineCore = null;
    },
  };
}

export function getSecretEngineTelemetry() {
  return { ...engineTelemetry };
}

export function getSecretAudioDiagnostics(): SecretAudioDiagnostics {
  let outputPeak = 0;
  let outputRms = 0;
  let spectralCentroidHz = 0;
  if (analyser && context?.state === "running") {
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    let sumSquares = 0;
    for (const sample of samples) {
      outputPeak = Math.max(outputPeak, Math.abs(sample));
      sumSquares += sample * sample;
    }
    outputRms = Math.sqrt(sumSquares / samples.length);

    const spectrum = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(spectrum);
    const binWidth = context.sampleRate / analyser.fftSize;
    let magnitudeSum = 0;
    let weightedFrequencySum = 0;
    for (let index = 0; index < spectrum.length; index += 1) {
      if (!Number.isFinite(spectrum[index])) continue;
      const magnitude = 10 ** (spectrum[index] / 20);
      magnitudeSum += magnitude;
      weightedFrequencySum += magnitude * index * binWidth;
    }
    spectralCentroidHz = magnitudeSum > 0
      ? weightedFrequencySum / magnitudeSum
      : 0;
  }
  return {
    contextState: context?.state ?? "uninitialized",
    engineActive: activeEngineCore !== null,
    engineState: engineTelemetry.engineState,
    limiterReductionDb: masterLimiter?.reduction ?? 0,
    muted,
    outputPeak,
    outputRms,
    spectralCentroidHz,
  };
}

export function playCarImpactSound({
  material,
  normalImpulse,
}: CarImpactAudioInput) {
  if (!Number.isFinite(normalImpulse) || normalImpulse < 8) return;
  const strength = Math.max(
    0,
    Math.min(1, Math.log1p(normalImpulse / 18) / Math.log1p(110)),
  );
  const nowMilliseconds = performance.now();
  if (
    nowMilliseconds - lastCarImpactAt < 85
    && strength < lastCarImpactStrength * 1.22
  ) return;
  lastCarImpactAt = nowMilliseconds;
  lastCarImpactStrength = strength;

  const heavy = strength >= (material === "page" ? 0.48 : 0.7);
  const url = heavy
    ? CAR_HEAVY_IMPACT_AUDIO_URL
    : CAR_LIGHT_IMPACT_AUDIO_URL;
  if (!isSecretAudioPageVisible()) return;
  const audio = getContext();
  void resumeAudioContextIfVisible(audio.context);
  const buffer = decodedEngineBuffers.get(url);
  if (!buffer) {
    void loadEngineBuffer(audio.context, url).catch(() => undefined);
    return;
  }

  const now = audio.context.currentTime + 0.002;
  const source = audio.context.createBufferSource();
  const output = audio.context.createGain();
  const duration = buffer.duration;
  const level = (heavy ? 0.3 : 0.22) * (0.48 + strength * 0.52);
  const releaseStart = now + Math.max(0.03, duration - (heavy ? 0.07 : 0.11));
  const end = now + duration;

  source.buffer = buffer;
  output.gain.setValueAtTime(0.0001, now);
  output.gain.linearRampToValueAtTime(level, now + 0.003);
  output.gain.setValueAtTime(level, releaseStart);
  output.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(output).connect(getCarSpatialBus(audio.context, audio.master));
  source.start(now);
  source.stop(end + 0.01);

  window.setTimeout(() => {
    source.disconnect();
    output.disconnect();
  }, Math.ceil((duration + 0.08) * 1000));
}

export async function startCarHorn() {
  if (!isSecretAudioPageVisible()) return;
  const request = ++hornRequest;
  const audio = getContext();
  hornBufferPromise ??= fetch(CAR_HORN_AUDIO_URL)
    .then((response) => {
      if (!response.ok)
        throw new Error(`Unable to load car horn (${response.status})`);
      return response.arrayBuffer();
    })
    .then((buffer) => audio.context.decodeAudioData(buffer))
    .catch((error) => {
      hornBufferPromise = null;
      throw error;
    });

  const [, hornBuffer] = await Promise.all([
    resumeAudioContextIfVisible(audio.context),
    hornBufferPromise,
  ]).catch(() => [undefined, null] as const);
  if (request !== hornRequest) return;
  if (!hornBuffer) return;
  activeHorn?.stop();

  const now = audio.context.currentTime;
  const source = audio.context.createBufferSource();
  const releaseFilter = audio.context.createBiquadFilter();
  const output = audio.context.createGain();
  let stopped = false;
  const minimumReleaseTime = now + 0.1;

  source.buffer = hornBuffer;
  source.loop = true;
  source.loopStart = CAR_HORN_LOOP_START;
  source.loopEnd = CAR_HORN_LOOP_END;
  releaseFilter.type = "lowpass";
  releaseFilter.frequency.value = 7000;
  releaseFilter.Q.value = 0.62;
  output.gain.setValueAtTime(CAR_HORN_LEVEL, now);
  source.connect(releaseFilter);
  releaseFilter.connect(output);
  output.connect(getCarSpatialBus(audio.context, audio.master));
  source.start(now);

  const controller: SecretHornController = {
    stop() {
      if (stopped) return;
      stopped = true;
      const currentTime = audio.context.currentTime;
      const releaseStart = Math.max(currentTime, minimumReleaseTime);
      const releaseEnd = releaseStart + 0.07;

      output.gain.cancelScheduledValues(releaseStart);
      output.gain.setValueAtTime(CAR_HORN_LEVEL, releaseStart);
      output.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
      releaseFilter.frequency.cancelScheduledValues(releaseStart);
      releaseFilter.frequency.setValueAtTime(7000, releaseStart);
      releaseFilter.frequency.exponentialRampToValueAtTime(900, releaseEnd);
      source.stop(releaseEnd + 0.01);
      window.setTimeout(
        () => {
          source.disconnect();
          releaseFilter.disconnect();
          output.disconnect();
        },
        Math.ceil((releaseEnd - currentTime + 0.08) * 1000),
      );
      if (activeHorn === controller) activeHorn = null;
    },
  };
  activeHorn = controller;
  publish();
}

export function stopCarHorn() {
  hornRequest += 1;
  activeHorn?.stop();
  activeHorn = null;
}

export function toggleSecretMute() {
  const audio = getContext();
  muted = !muted;
  audio.master.gain.cancelScheduledValues(audio.context.currentTime);
  audio.master.gain.setTargetAtTime(
    muted ? 0 : SECRET_AUDIO_MASTER_LEVEL,
    audio.context.currentTime,
    0.018,
  );
  publish();
  return muted;
}

export function subscribeSecretAudio(listener: AudioListener) {
  listeners.add(listener);
  listener({ station, muted });
  return () => {
    listeners.delete(listener);
  };
}

export function getSecretAnalyser() {
  return analyser;
}
