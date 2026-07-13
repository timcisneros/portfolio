import { getKeycapGpuEngine } from "./engine";
import {
  GLYPH_CELL_HEIGHT,
  GLYPH_CELL_WIDTH,
  GLYPH_COUNT,
  GLYPH_FIRST_CODEPOINT,
  GLYPH_STRIP_GZIP_BASE64,
} from "./glyphAtlasData";

export type KeycapLegendIcon = "none" | "download" | "mail" | "external" | "github";
type Region = readonly [number, number, number, number];

const COLUMNS = 4;
const ROWS = 8;
const CELL_WIDTH = 256;
const CELL_HEIGHT = 96;
const WIDTH = COLUMNS * CELL_WIDTH;
const HEIGHT = ROWS * CELL_HEIGHT;

type Entry = {
  text: string;
  icon: KeycapLegendIcon;
  slot: number;
  listeners: Set<(region: Region) => void>;
};

const entries = new Map<string, Entry>();
let scheduled = false;
let statusSubscribed = false;
let glyphStripPromise: Promise<Uint8Array> | null = null;

function decodeGlyphStrip() {
  if (glyphStripPromise) return glyphStripPromise;
  glyphStripPromise = (async () => {
    const binary = atob(GLYPH_STRIP_GZIP_BASE64);
    const compressed = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) compressed[index] = binary.charCodeAt(index);
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
    const data = new Uint8Array(await new Response(stream).arrayBuffer());
    const expected = GLYPH_CELL_WIDTH * GLYPH_COUNT * GLYPH_CELL_HEIGHT;
    if (data.length !== expected) throw new Error(`Invalid glyph coverage strip: ${data.length}/${expected}`);
    return data;
  })();
  return glyphStripPromise;
}

function regionFor(slot: number): Region {
  const column = slot % COLUMNS;
  const row = Math.floor(slot / COLUMNS);
  return [column / COLUMNS, row / ROWS, 1 / COLUMNS, 1 / ROWS];
}

function putCoverage(atlas: Uint8Array, x: number, y: number, coverage: number) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = y * WIDTH + x;
  atlas[offset] = Math.max(atlas[offset], Math.max(0, Math.min(255, Math.round(coverage))));
}

function blitGlyph(
  atlas: Uint8Array,
  strip: Uint8Array,
  codepoint: number,
  destinationX: number,
  destinationY: number,
  scale: number,
) {
  const fallback = "?".codePointAt(0)! - GLYPH_FIRST_CODEPOINT;
  const requested = codepoint - GLYPH_FIRST_CODEPOINT;
  const glyph = requested >= 0 && requested < GLYPH_COUNT ? requested : fallback;
  const targetWidth = Math.max(1, Math.round(GLYPH_CELL_WIDTH * scale));
  const targetHeight = Math.max(1, Math.round(GLYPH_CELL_HEIGHT * scale));
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(GLYPH_CELL_HEIGHT - 1, Math.floor((y + 0.5) / scale));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(GLYPH_CELL_WIDTH - 1, Math.floor((x + 0.5) / scale));
      const coverage = strip[sourceY * GLYPH_CELL_WIDTH * GLYPH_COUNT + glyph * GLYPH_CELL_WIDTH + sourceX];
      if (coverage) putCoverage(atlas, destinationX + x, destinationY + y, coverage);
    }
  }
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax;
  const vy = by - ay;
  const lengthSquared = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / lengthSquared));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

function stroke(atlas: Uint8Array, cellX: number, cellY: number, segments: readonly number[][]) {
  for (const [ax, ay, bx, by] of segments) {
    const left = Math.floor(Math.min(ax, bx) - 2);
    const right = Math.ceil(Math.max(ax, bx) + 2);
    const top = Math.floor(Math.min(ay, by) - 2);
    const bottom = Math.ceil(Math.max(ay, by) + 2);
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const distance = distanceToSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
        const coverage = Math.max(0, Math.min(1, 1.65 - distance)) * 255;
        if (coverage) putCoverage(atlas, cellX + x, cellY + y, coverage);
      }
    }
  }
}

function drawIcon(atlas: Uint8Array, icon: KeycapLegendIcon, cellX: number, cellY: number, x: number) {
  if (icon === "none") return;
  const y = 35;
  if (icon === "download") stroke(atlas, cellX, cellY, [
    [x + 2, y + 17, x + 2, y + 21], [x + 2, y + 21, x + 22, y + 21], [x + 22, y + 21, x + 22, y + 17],
    [x + 12, y + 1, x + 12, y + 15], [x + 6, y + 9, x + 12, y + 15], [x + 18, y + 9, x + 12, y + 15],
  ]);
  if (icon === "mail") stroke(atlas, cellX, cellY, [
    [x + 2, y + 4, x + 22, y + 4], [x + 22, y + 4, x + 22, y + 20], [x + 22, y + 20, x + 2, y + 20], [x + 2, y + 20, x + 2, y + 4],
    [x + 2, y + 6, x + 12, y + 13], [x + 12, y + 13, x + 22, y + 6],
  ]);
  if (icon === "external") stroke(atlas, cellX, cellY, [
    [x + 3, y + 8, x + 3, y + 21], [x + 3, y + 21, x + 17, y + 21], [x + 17, y + 21, x + 17, y + 15],
    [x + 10, y + 14, x + 22, y + 2], [x + 14, y + 2, x + 22, y + 2], [x + 22, y + 2, x + 22, y + 10],
  ]);
  if (icon === "github") {
    const segments: number[][] = [];
    for (let step = 0; step < 16; step += 1) {
      const a = (step / 16) * Math.PI * 2;
      const b = ((step + 1) / 16) * Math.PI * 2;
      segments.push([x + 12 + Math.cos(a) * 10, y + 12 + Math.sin(a) * 10, x + 12 + Math.cos(b) * 10, y + 12 + Math.sin(b) * 10]);
    }
    stroke(atlas, cellX, cellY, segments);
  }
}

function normalizeLegendText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .toUpperCase();
}

async function buildAtlas() {
  if (!entries.size) return;
  try {
    const strip = await decodeGlyphStrip();
    const atlas = new Uint8Array(WIDTH * HEIGHT);
    for (const entry of entries.values()) {
      const column = entry.slot % COLUMNS;
      const row = Math.floor(entry.slot / COLUMNS);
      const cellX = column * CELL_WIDTH;
      const cellY = row * CELL_HEIGHT;
      const text = normalizeLegendText(entry.text);
      const hasIcon = entry.icon !== "none";
      const iconWidth = hasIcon ? 24 : 0;
      const iconGap = hasIcon ? 12 : 0;
      const horizontalPadding = 18;
      const availableTextWidth = CELL_WIDTH - horizontalPadding * 2 - iconWidth - iconGap;
      const naturalTextWidth = Math.max(1, GLYPH_CELL_WIDTH * text.length);
      const scale = Math.min(20 / 28, availableTextWidth / naturalTextWidth);
      const advance = GLYPH_CELL_WIDTH * scale;
      const textWidth = advance * text.length;
      const groupWidth = iconWidth + iconGap + textWidth;
      const groupX = (CELL_WIDTH - groupWidth) / 2;
      let cursor = cellX + groupX + iconWidth + iconGap;
      const top = Math.round(cellY + (CELL_HEIGHT - GLYPH_CELL_HEIGHT * scale) / 2);
      for (const character of text) {
        blitGlyph(atlas, strip, character.codePointAt(0) ?? 32, Math.round(cursor), top, scale);
        cursor += advance;
      }
      drawIcon(atlas, entry.icon, cellX, cellY, Math.round(groupX));
    }
    const installed = getKeycapGpuEngine().setLegendAtlasData(atlas, WIDTH, HEIGHT);
    if (!installed) return;
    entries.forEach((entry) => {
      const region = regionFor(entry.slot);
      entry.listeners.forEach((listener) => listener(region));
    });
  } catch (error) {
    console.error("Unable to build the custom keycap legend atlas", error);
  }
}

function scheduleBuild() {
  if (scheduled || typeof requestAnimationFrame === "undefined") return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    void buildAtlas();
  });
}

export function registerLegend(text: string, icon: KeycapLegendIcon, listener: (region: Region) => void) {
  const key = `${icon}:${text}`;
  let entry = entries.get(key);
  if (!entry) {
    if (entries.size >= COLUMNS * ROWS) return () => undefined;
    const occupied = new Set(Array.from(entries.values(), (value) => value.slot));
    let slot = 0;
    while (occupied.has(slot)) slot += 1;
    entry = { text, icon, slot, listeners: new Set() };
    entries.set(key, entry);
  }
  entry.listeners.add(listener);
  listener(regionFor(entry.slot));
  if (!statusSubscribed) {
    statusSubscribed = true;
    getKeycapGpuEngine().subscribeStatus((status) => {
      if (status.state === "ready") scheduleBuild();
    });
  }
  scheduleBuild();
  return () => {
    if (!entry) return;
    entry.listeners.delete(listener);
    if (!entry.listeners.size && entries.get(key) === entry) {
      entries.delete(key);
      scheduleBuild();
    }
  };
}
