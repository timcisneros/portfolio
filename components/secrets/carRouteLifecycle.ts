import type { SecretEngineController } from "../../lib/secretAudio";

export type CarRouteLifecycle = {
  readonly arrivalReady: boolean;
  readonly engine: SecretEngineController | null;
  readonly phase: "ready" | "departing" | "arriving";
  readonly sequence: number;
};

type MutableCarRouteLifecycle = {
  -readonly [Key in keyof CarRouteLifecycle]: CarRouteLifecycle[Key];
};

function mutable(state: CarRouteLifecycle) {
  return state as MutableCarRouteLifecycle;
}

export function createCarRouteLifecycle(): CarRouteLifecycle {
  return {
    arrivalReady: true,
    engine: null,
    phase: "ready",
    sequence: 0,
  };
}

export function isCarRouteDeparting(state: CarRouteLifecycle) {
  return mutable(state).phase === "departing";
}

export function isCarRouteArrivalReady(state: CarRouteLifecycle) {
  return state.arrivalReady;
}

export function isCarRouteSequenceCurrent(
  state: CarRouteLifecycle,
  sequence: number,
) {
  return state.sequence === sequence;
}

export function getCarRouteEngine(state: CarRouteLifecycle) {
  return state.engine;
}

export function retainCarRouteEngine(
  state: CarRouteLifecycle,
  engine: SecretEngineController | null,
) {
  mutable(state).engine = engine;
}

export function releaseCarRouteEngine(state: CarRouteLifecycle) {
  const engine = state.engine;
  mutable(state).engine = null;
  return engine;
}

export function beginCarRouteDeparture(state: CarRouteLifecycle) {
  mutable(state).phase = "departing";
  mutable(state).arrivalReady = false;
  mutable(state).sequence += 1;
  return state.sequence;
}

export function beginCarRouteArrival(
  state: CarRouteLifecycle,
  transferred: boolean,
) {
  mutable(state).sequence += 1;
  mutable(state).phase = transferred ? "arriving" : "ready";
  mutable(state).arrivalReady = !transferred;
  return state.sequence;
}

export function completeCarRouteArrival(state: CarRouteLifecycle) {
  mutable(state).phase = "ready";
  mutable(state).arrivalReady = true;
}

export function invalidateCarRouteLifecycle(state: CarRouteLifecycle) {
  mutable(state).sequence += 1;
  mutable(state).phase = "ready";
  mutable(state).arrivalReady = true;
  mutable(state).engine = null;
}
