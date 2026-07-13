export interface KeycapCamera {
  distance: number;
  elevationDeg: number;
  azimuthDeg: number;
  targetZ: number;
  verticalFovDeg: number;
}

export const DEFAULT_KEYCAP_CAMERA: KeycapCamera = {
  distance: 9,
  elevationDeg: 52,
  azimuthDeg: 0,
  targetZ: 0.17,
  verticalFovDeg: 8.8,
};

type CameraListener = (camera: KeycapCamera, committed: boolean) => void;

let camera: KeycapCamera = { ...DEFAULT_KEYCAP_CAMERA };
const listeners = new Set<CameraListener>();

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function getKeycapCamera(): KeycapCamera {
  return camera;
}

export function setKeycapCamera(
  update: Partial<KeycapCamera>,
  committed = true,
) {
  camera = {
    ...camera,
    ...update,
    elevationDeg: clamp(
      update.elevationDeg ?? camera.elevationDeg,
      8,
      88,
    ),
    azimuthDeg: clamp(update.azimuthDeg ?? camera.azimuthDeg, -75, 75),
    distance: clamp(update.distance ?? camera.distance, 6, 14),
    verticalFovDeg: clamp(
      update.verticalFovDeg ?? camera.verticalFovDeg,
      8,
      42,
    ),
  };
  listeners.forEach((listener) => listener(camera, committed));
}

export function resetKeycapCamera() {
  camera = { ...DEFAULT_KEYCAP_CAMERA };
  listeners.forEach((listener) => listener(camera, true));
}

export function commitKeycapCamera() {
  listeners.forEach((listener) => listener(camera, true));
}

export function subscribeKeycapCamera(listener: CameraListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
