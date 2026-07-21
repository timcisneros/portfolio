export type CarCameraMode = "idle" | "acquire" | "track" | "release" | "settle";

export type CarCameraState = {
  direction: number;
  following: boolean;
  intentDirection: number;
  intentSeconds: number;
  journeyStarted: boolean;
  mode: CarCameraMode;
  scrollY: number;
  suppressed: boolean;
  targetScreenY: number | null;
  velocity: number;
};

export function createCarCameraState(scrollY = 0): CarCameraState {
  return {
    direction: 0,
    following: false,
    intentDirection: 0,
    intentSeconds: 0,
    journeyStarted: false,
    mode: "idle",
    scrollY,
    suppressed: false,
    targetScreenY: null,
    velocity: 0,
  };
}

export function resetCarCameraState(
  state: CarCameraState,
  input: {
    following?: boolean;
    journeyStarted?: boolean;
    scrollY: number;
    suppressed?: boolean;
  },
) {
  state.direction = 0;
  state.following = input.following ?? false;
  state.intentDirection = 0;
  state.intentSeconds = 0;
  state.journeyStarted = input.journeyStarted ?? false;
  state.mode = "idle";
  state.scrollY = input.scrollY;
  state.suppressed = input.suppressed ?? false;
  state.targetScreenY = null;
  state.velocity = 0;
}

export function cameraSettleComplete(error: number, velocity: number) {
  return Math.abs(error) < 0.45 && Math.abs(velocity) < 1;
}
