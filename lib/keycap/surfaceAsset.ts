const FONT_URLS = {
  normal: "/fonts/InstrumentSans-variable.woff2",
  italic: "/fonts/InstrumentSans-Italic-variable.woff2",
} as const;

export type SurfaceAsset = {
  key: string;
  url: string;
  svg: string;
  width: number;
  height: number;
  textX: number;
  fontFingerprint: string;
};

type FontPayload = { data: string; fingerprint: string };
const fontPayloads = new Map<string, Promise<FontPayload>>();
const assetCache = new Map<string, SurfaceAsset>();
const assetReferences = new Map<string, number>();
const disposalTimers = new Map<string, ReturnType<typeof setTimeout>>();
const iconCache = new WeakMap<SVGSVGElement, { markup: string; color: string }>();
const LEGEND_EDGE_GUARD = 4;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const stride = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + stride));
  }
  return btoa(binary);
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function loadFont(style: string) {
  const variant = style === "italic" || style === "oblique" ? "italic" : "normal";
  const url = FONT_URLS[variant];
  let pending = fontPayloads.get(url);
  if (!pending) {
    pending = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Exact keycap font unavailable (${response.status})`);
      const buffer = await response.arrayBuffer();
      const fingerprint = hex(await crypto.subtle.digest("SHA-256", buffer));
      return { data: bytesToBase64(new Uint8Array(buffer)), fingerprint };
    });
    fontPayloads.set(url, pending);
  }
  return pending;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;",
  })[character] ?? character);
}

function transformText(value: string, transform: string) {
  if (transform === "uppercase") return value.toLocaleUpperCase();
  if (transform === "lowercase") return value.toLocaleLowerCase();
  if (transform === "capitalize") return value.replace(/(^|\s)(\S)/g, (_, prefix, letter) => prefix + letter.toLocaleUpperCase());
  return value;
}

function inlineIcon(root: SVGSVGElement, source: SVGSVGElement | null, color: string, x: number, height: number) {
  const cached = iconCache.get(root);
  if (cached) return cached.markup.replaceAll(cached.color, color);
  if (!source) return "";
  const clone = source.cloneNode(true) as SVGSVGElement;
  const sourceNodes = [source, ...Array.from(source.querySelectorAll("*"))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll("*"))];
  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index] as SVGElement | undefined;
    if (!target) return;
    const style = getComputedStyle(node);
    for (const property of ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity"] as const) {
      const value = style.getPropertyValue(property);
      if (value) target.setAttribute(property, value === "currentcolor" ? color : value);
    }
    target.removeAttribute("class");
    target.removeAttribute("style");
  });
  clone.setAttribute("x", String(x));
  clone.setAttribute("y", String((height - 16) / 2));
  clone.setAttribute("width", "16");
  clone.setAttribute("height", "16");
  clone.setAttribute("overflow", "visible");
  clone.removeAttribute("class");
  clone.removeAttribute("aria-hidden");
  const markup = new XMLSerializer().serializeToString(clone);
  iconCache.set(root, { markup, color });
  return markup;
}

function finite(value: string, fallback = 0) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

export async function compileSurfaceAsset(
  source: SVGSVGElement,
  label: Element,
  textValue: string,
  hasIcon: boolean,
): Promise<SurfaceAsset> {
  const style = getComputedStyle(label);
  const family = style.fontFamily.toLowerCase();
  if (!family.includes("instrument sans")) {
    throw new Error(`Unsupported exact font family: ${style.fontFamily}`);
  }
  const font = await loadFont(style.fontStyle);
  await document.fonts.load(`${style.fontStyle} ${style.fontWeight} ${style.fontSize} "Instrument Sans"`, textValue);

  const text = transformText(textValue, style.textTransform);
  const fontSize = finite(style.fontSize, 13);
  const gap = hasIcon ? finite(style.columnGap || style.gap) : 0;
  const iconSize = hasIcon ? 16 : 0;
  const textX = iconSize ? iconSize + gap : 0;
  const height = Math.max(fontSize * 1.25, iconSize, 1);
  const measurement = source.querySelector<SVGTextElement>(".keycap-label-text");
  let textWidth = measurement?.getComputedTextLength() ?? 0;
  if (!textWidth) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser text metrics unavailable");
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} "Instrument Sans"`;
    textWidth = context.measureText(text).width + finite(style.letterSpacing) * Math.max(0, text.length - 1);
  }
  const width = Math.max(1, textX + textWidth + LEGEND_EDGE_GUARD);
  const color = style.color;
  const icon = inlineIcon(source, source.querySelector<SVGSVGElement>("svg"), color, 0, height);
  const embeddedFamily = `KeycapFont-${font.fingerprint.slice(0, 16)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="visible"><style>@font-face{font-family:'${embeddedFamily}';src:url(data:font/woff2;base64,${font.data}) format('woff2');font-style:${style.fontStyle};font-weight:400 700;font-stretch:75% 100%}text{font-family:'${embeddedFamily}';font-size:${style.fontSize};font-style:${style.fontStyle};font-weight:${style.fontWeight};font-stretch:${style.fontStretch};font-kerning:${style.fontKerning};font-feature-settings:${style.fontFeatureSettings};font-variation-settings:${style.fontVariationSettings};font-optical-sizing:${style.fontOpticalSizing};letter-spacing:${style.letterSpacing};word-spacing:${style.wordSpacing};fill:${color}}</style>${icon}<text x="${textX}" y="${height / 2}" dominant-baseline="central">${escapeXml(text)}</text></svg>`;
  const keyBuffer = new TextEncoder().encode(svg);
  const key = hex(await crypto.subtle.digest("SHA-256", keyBuffer));
  const cached = assetCache.get(key);
  if (cached) return cached;
  const asset = {
    key,
    url: URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" })),
    svg,
    width,
    height,
    textX,
    fontFingerprint: font.fingerprint,
  };
  assetCache.set(key, asset);
  return asset;
}

export function retainSurfaceAsset(asset: SurfaceAsset) {
  const timer = disposalTimers.get(asset.key);
  if (timer) clearTimeout(timer);
  disposalTimers.delete(asset.key);
  assetReferences.set(asset.key, (assetReferences.get(asset.key) ?? 0) + 1);
}

export function releaseSurfaceAsset(asset: SurfaceAsset) {
  const remaining = Math.max(0, (assetReferences.get(asset.key) ?? 1) - 1);
  if (remaining) {
    assetReferences.set(asset.key, remaining);
    return;
  }
  assetReferences.delete(asset.key);
  // Atlas decoding is asynchronous. This grace period preserves an in-flight
  // decode while bounding memory during repeated live CSS edits.
  disposalTimers.set(asset.key, setTimeout(() => {
    if (assetReferences.has(asset.key) || assetCache.get(asset.key) !== asset) return;
    URL.revokeObjectURL(asset.url);
    assetCache.delete(asset.key);
    disposalTimers.delete(asset.key);
  }, 10_000));
}
