import { getKeycapGpuEngine } from "./engine";

type Region = readonly [number, number, number, number];
type Listener = (region: Region, error?: string) => void;

const COLUMNS = 4;
const ROWS = 8;
const CELL_WIDTH = 512;
const CELL_HEIGHT = 96;
const WIDTH = COLUMNS * CELL_WIDTH;
const HEIGHT = ROWS * CELL_HEIGHT;

type Snapshot = {
  key: string;
  assetUrl: string;
  cssWidth: number;
  cssHeight: number;
  hostHeight: number;
};
type Entry = { snapshot: Snapshot; slot: number; listeners: Set<Listener> };

const entries = new Map<string, Entry>();
let scheduled = false;
let statusSubscribed = false;

function regionFor(slot: number): Region {
  return [(slot % COLUMNS) / COLUMNS, Math.floor(slot / COLUMNS) / ROWS, 1 / COLUMNS, 1 / ROWS];
}

function snapshotFrom(label: HTMLElement, host: HTMLElement): Snapshot {
  const source = label.querySelector<SVGSVGElement>(".keycap-content-svg");
  if (!source) throw new Error("Canonical keycap SVG is missing");
  const image = source.querySelector<SVGImageElement>(".keycap-content-image");
  const assetUrl = image?.dataset.keycapAssetUrl;
  const assetKey = image?.dataset.keycapAssetKey;
  if (!assetUrl || !assetKey) throw new Error("Immutable surface asset is still compiling");
  const bounds = source.getBoundingClientRect();
  const hostBounds = host.getBoundingClientRect();
  return {
    key: JSON.stringify([hostBounds.height, bounds.width, bounds.height, assetKey]),
    assetUrl,
    cssWidth: Math.max(1, bounds.width),
    cssHeight: Math.max(1, bounds.height),
    hostHeight: Math.max(1, hostBounds.height),
  };
}

async function bitmapFrom(assetUrl: string) {
  const image = new Image();
  image.decoding = "sync";
  image.src = assetUrl;
  await image.decode();
  return createImageBitmap(image);
}

async function buildAtlas() {
  if (!entries.size) return;
  const surface = new OffscreenCanvas(WIDTH, HEIGHT);
  const context = surface.getContext("2d", { alpha: true });
  if (!context) return;
  const failed = new Set<Entry>();
  context.clearRect(0, 0, WIDTH, HEIGHT);
  for (const entry of entries.values()) {
    try {
      const bitmap = await bitmapFrom(entry.snapshot.assetUrl);
      const scale = CELL_HEIGHT / entry.snapshot.hostHeight;
      const width = entry.snapshot.cssWidth * scale;
      const height = entry.snapshot.cssHeight * scale;
      const x = (entry.slot % COLUMNS) * CELL_WIDTH + (CELL_WIDTH - width) / 2;
      const y = Math.floor(entry.slot / COLUMNS) * CELL_HEIGHT + (CELL_HEIGHT - height) / 2;
      context.drawImage(bitmap, x, y, width, height);
      bitmap.close();
    } catch (error) {
      failed.add(entry);
      const reason = error instanceof Error ? error.message : "Canonical SVG decoding failed";
      entry.listeners.forEach((listener) => listener([0, 0, 0, 0], reason));
    }
  }
  const data = new Uint8Array(context.getImageData(0, 0, WIDTH, HEIGHT).data);
  if (!getKeycapGpuEngine().setLegendAtlasData(data, WIDTH, HEIGHT)) return;
  entries.forEach((entry) => {
    if (!failed.has(entry)) entry.listeners.forEach((listener) => listener(regionFor(entry.slot)));
  });
}

function scheduleBuild() {
  if (scheduled || typeof requestAnimationFrame === "undefined") return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; void buildAtlas(); });
}

export function registerLegend(label: HTMLElement, host: HTMLElement, listener: Listener) {
  let snapshot: Snapshot;
  try {
    snapshot = snapshotFrom(label, host);
  } catch (error) {
    listener([0, 0, 0, 0], error instanceof Error ? error.message : "Surface asset unavailable");
    return () => undefined;
  }
  let entry = entries.get(snapshot.key);
  if (!entry) {
    if (entries.size >= COLUMNS * ROWS) {
      listener([0, 0, 0, 0], "Surface-content atlas capacity exceeded");
      return () => undefined;
    }
    const occupied = new Set(Array.from(entries.values(), (value) => value.slot));
    let slot = 0;
    while (occupied.has(slot)) slot += 1;
    entry = { snapshot, slot, listeners: new Set() };
    entries.set(snapshot.key, entry);
  }
  entry.listeners.add(listener);
  if (!statusSubscribed) {
    statusSubscribed = true;
    getKeycapGpuEngine().subscribeStatus((status) => { if (status.state === "ready") scheduleBuild(); });
  }
  scheduleBuild();
  return () => {
    if (!entry) return;
    entry.listeners.delete(listener);
    if (!entry.listeners.size && entries.get(snapshot.key) === entry) {
      entries.delete(snapshot.key);
      scheduleBuild();
    }
  };
}
