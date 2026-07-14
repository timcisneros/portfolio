/// <reference lib="webworker" />

import type { KeycapCamera } from "../cameraStore";
import type { KeycapRegistration } from "./types";
import { renderSoftwareKeycaps, type SoftwareAtlas, type SoftwareRasterCacheEntry } from "./softwareRasterizer";

type TileMessage = {
  type: "tiles";
  tiles: Array<{ id: number; top: number; height: number; canvas: OffscreenCanvas }>;
};
type RenderMessage = {
  type: "render";
  version: number;
  width: number;
  height: number;
  dpr: number;
  pixelStep: number;
  scrollY: number;
  viewportHeight: number;
  camera: KeycapCamera;
  instances: KeycapRegistration[];
};
type AtlasMessage = { type: "atlas"; atlas: SoftwareAtlas };
type ClearMessage = { type: "clear" };
type WorkerMessage = TileMessage | RenderMessage | AtlasMessage | ClearMessage;

type Tile = {
  id: number;
  top: number;
  height: number;
  canvas: OffscreenCanvas;
  context: OffscreenCanvasRenderingContext2D;
  backBuffer: OffscreenCanvas;
  backContext: OffscreenCanvasRenderingContext2D;
};
let tiles: Tile[] = [];
let latest: RenderMessage | null = null;
let atlas: SoftwareAtlas | null = null;
const rasterCache = new Map<string, SoftwareRasterCacheEntry>();
let scheduled = false;
let everPresented = false;
const TILE_OBJECT_OVERFLOW = 256;

self.postMessage({ type: "ready" });

function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    const frame = latest;
    latest = null;
    if (!frame || tiles.length === 0) return;
    const pixelWidth = Math.max(1, Math.round(frame.width * frame.dpr));
    const startedAt = performance.now();
    const orderedTiles = [...tiles].sort((a, b) => {
      const center = frame.scrollY + frame.viewportHeight * 0.5;
      const distanceA = Math.abs(a.top + a.height * 0.5 - center);
      const distanceB = Math.abs(b.top + b.height * 0.5 - center);
      return distanceA - distanceB;
    });
    const renderTile = (tile: Tile, pixelStep: number) => {
      const pixelHeight = Math.max(1, Math.round(tile.height * frame.dpr));
      if (tile.backBuffer.width !== pixelWidth) tile.backBuffer.width = pixelWidth;
      if (tile.backBuffer.height !== pixelHeight) tile.backBuffer.height = pixelHeight;
      const localInstances = frame.instances
        .filter((instance) => instance.rect.y + instance.rect.height >= tile.top - TILE_OBJECT_OVERFLOW
          && instance.rect.y <= tile.top + tile.height + TILE_OBJECT_OVERFLOW)
        .map((instance) => ({
          ...instance,
          rect: { ...instance.rect, y: instance.rect.y - tile.top },
          objectRect: instance.objectRect
            ? { ...instance.objectRect, y: instance.objectRect.y - tile.top }
            : undefined,
        }));
      renderSoftwareKeycaps(
        tile.backContext,
        tile.backBuffer,
        localInstances,
        frame.camera,
        atlas,
        pixelStep,
        { width: frame.width, height: tile.height, dpr: frame.dpr },
        rasterCache,
      );
      if (tile.canvas.width !== pixelWidth) tile.canvas.width = pixelWidth;
      if (tile.canvas.height !== pixelHeight) tile.canvas.height = pixelHeight;
      tile.context.clearRect(0, 0, pixelWidth, pixelHeight);
      tile.context.drawImage(tile.backBuffer, 0, 0);
    };
    if (!everPresented && orderedTiles[0]) {
      renderTile(orderedTiles[0], Math.max(2, frame.pixelStep));
      everPresented = true;
      self.postMessage({ type: "visible-presented", version: frame.version, elapsed: performance.now() - startedAt, scrollY: frame.scrollY });
    }
    for (let tileIndex = 0; tileIndex < orderedTiles.length; tileIndex += 1) {
      const tile = orderedTiles[tileIndex];
      renderTile(tile, frame.pixelStep);
      if (tileIndex === 0) {
        self.postMessage({ type: "visible-presented", version: frame.version, elapsed: performance.now() - startedAt, scrollY: frame.scrollY });
      }
    }
    self.postMessage({ type: "presented", version: frame.version, elapsed: performance.now() - startedAt, scrollY: frame.scrollY });
    if (latest) schedule();
  }, 0);
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === "tiles") {
    tiles = message.tiles.flatMap((entry) => {
      const context = entry.canvas.getContext("2d", { alpha: true });
      const backBuffer = new OffscreenCanvas(1, 1);
      const backContext = backBuffer.getContext("2d", { alpha: true });
      return context && backContext ? [{ ...entry, context, backBuffer, backContext }] : [];
    });
    self.postMessage({ type: "tiles-ready", count: tiles.length });
    return;
  }
  if (message.type === "clear") {
    latest = null;
    everPresented = false;
    tiles.forEach((tile) => tile.context.clearRect(0, 0, tile.canvas.width, tile.canvas.height));
    return;
  }
  if (message.type === "atlas") {
    atlas = message.atlas;
    rasterCache.clear();
    return;
  }
  latest = message;
  self.postMessage({ type: "render-received", version: message.version });
  schedule();
};

export {};
