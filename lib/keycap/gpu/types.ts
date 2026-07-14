import type { KeycapCamera } from "../cameraStore";

export type KeycapGpuStatus =
  | { state: "idle" }
  | { state: "initializing" }
  | { state: "ready"; adapter: string; backend: "webgpu" | "software" }
  | { state: "unsupported"; reason: string }
  | { state: "lost"; reason: string };

export interface KeycapMaterial {
  /** Linearized by the shader; accepts CSS-style sRGB channel values. */
  color: readonly [number, number, number];
  legendColor?: readonly [number, number, number];
  roughness?: number;
  ambient?: number;
}

export interface KeycapRegistration {
  /** Bounds occupied by the complete keycap render. */
  rect: DOMRectReadOnly | { x: number; y: number; width: number; height: number };
  /** Unexpanded CSS box that defines physical projection and mesh aspect. */
  objectRect?: DOMRectReadOnly | { x: number; y: number; width: number; height: number };
  /** Document coordinates let one scroll revision position the entire scene. */
  coordinateSpace?: "document" | "viewport";
  material: KeycapMaterial;
  /** Semantic source for the forthcoming surface glyph atlas. */
  text?: string;
  /** Normalized atlas region. Coverage is evaluated from the actual hit point. */
  legendUv?: readonly [x: number, y: number, width: number, height: number];
  /** Stable application identifier, useful for diagnostics and hit testing. */
  id?: string;
  /** Physical width in key units. Defaults to the visible bounds' aspect. */
  widthUnits?: number;
  visible?: boolean;
}

export interface KeycapHandle {
  readonly key: number;
  update(update: Partial<KeycapRegistration>): void;
  remove(): void;
}

export interface KeycapCompositorOptions {
  devicePixelRatio?: number;
  camera?: Partial<KeycapCamera>;
  /** Render continuously. The default is demand-driven rendering. */
  continuous?: boolean;
  /** DOM-owned host for bounded software presentation tiles. */
  softwareTileHost?: HTMLElement;
}

export interface KeycapGpuDiagnostics {
  status: KeycapGpuStatus;
  instanceCount: number;
  frame: number;
  submissions: number;
  gpuFrameMs?: number;
  gpuP95Ms?: number;
}
