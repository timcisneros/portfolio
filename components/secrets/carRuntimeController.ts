import type { CarControl } from "../../lib/carContinuity";

export type CarRuntimeInput = Readonly<{
  accelerating: boolean;
  brakingOrReversing: boolean;
  opposingPedals: boolean;
  pressed: ReadonlySet<CarControl>;
  steering: -1 | 0 | 1;
  throttle: -1 | 0 | 1;
}>;

/** Mutable frame-local state owned by the car runtime rather than React. */
export type CarRuntimeController = {
  appliedControls: Set<CarControl>;
  frame: number | null;
  keyboardControls: Set<CarControl>;
  lastFrameTime: number;
  wake: () => void;
};

export function createCarRuntimeController(): CarRuntimeController {
  return {
    appliedControls: new Set(),
    frame: null,
    keyboardControls: new Set(),
    lastFrameTime: 0,
    wake: () => {},
  };
}

export function readCarRuntimeInput(
  runtime: CarRuntimeController,
  parking: boolean,
): CarRuntimeInput {
  // Keyboard state is the sole input authority. Applied controls are replaced
  // atomically at the frame boundary, so a missed release cannot retain force.
  const pressed = new Set(runtime.keyboardControls);
  runtime.appliedControls = pressed;
  const accelerating = !parking && pressed.has("up");
  const brakingOrReversing = !parking && pressed.has("down");
  return {
    accelerating,
    brakingOrReversing,
    opposingPedals: accelerating && brakingOrReversing,
    pressed,
    steering: (Number(pressed.has("right"))
      - Number(pressed.has("left"))) as -1 | 0 | 1,
    throttle: (Number(accelerating)
      - Number(brakingOrReversing)) as -1 | 0 | 1,
  };
}

export function clearCarRuntimeInput(runtime: CarRuntimeController) {
  runtime.keyboardControls.clear();
  runtime.appliedControls.clear();
}

export function getCarRuntimeDelta(
  runtime: CarRuntimeController,
  time: number,
  maximumFrameDeltaSeconds: number,
) {
  const elapsedMilliseconds = runtime.lastFrameTime
    ? Math.max(0, time - runtime.lastFrameTime)
    : 1000 / 60;
  const rawDeltaSeconds = elapsedMilliseconds / 1000;
  const stalled = rawDeltaSeconds > maximumFrameDeltaSeconds;
  runtime.lastFrameTime = time;
  return {
    deltaSeconds: stalled
      ? Math.min(1 / 30, rawDeltaSeconds)
      : rawDeltaSeconds,
    rawDeltaSeconds,
    stalled,
  };
}

export function resetCarRuntimeClock(runtime: CarRuntimeController) {
  runtime.lastFrameTime = 0;
}
