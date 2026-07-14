import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { KEYCAP_RENDER_ENGINE_ENABLED } from "../lib/keycap/config";
import { getKeycapGpuEngine, type KeycapHandle } from "../lib/keycap/gpu";
import { registerLegend } from "../lib/keycap/gpu/legendAtlas";

type Rgb = readonly [number, number, number];

const SHADOW_MARGIN_X = 22;
const SHADOW_MARGIN_TOP = 14;
const SHADOW_MARGIN_BOTTOM = 30;

function parseChannel(value: string) {
  const number = Number.parseFloat(value);
  return value.endsWith("%") ? Math.max(0, Math.min(1, number / 100)) : Math.max(0, Math.min(1, number / 255));
}

function parseColor(value: string): Rgb | null {
  const color = value.trim();
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
    return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255) as unknown as Rgb;
  }
  const rgb = color.match(/^rgba?\(\s*([^,\s/]+)[,\s]+([^,\s/]+)[,\s]+([^,\s/)]+)/i);
  return rgb ? [parseChannel(rgb[1]), parseChannel(rgb[2]), parseChannel(rgb[3])] : null;
}

function materialFrom(host: HTMLElement) {
  const style = getComputedStyle(host);
  const color = parseColor(style.getPropertyValue("--cap-top"));
  const roughness = Number.parseFloat(style.getPropertyValue("--keycap-roughness"));
  const ambient = Number.parseFloat(style.getPropertyValue("--keycap-ambient"));
  if (!color || !Number.isFinite(roughness) || !Number.isFinite(ambient)) return null;
  return {
    color,
    roughness,
    ambient,
  };
}

function contentSignature(label: HTMLElement, hostHeight: number) {
  const image = label.querySelector<SVGImageElement>(".keycap-content-image");
  // The immutable asset key already includes every CSS value and source node
  // that affects content pixels. Renderer-owned opacity/visibility must never
  // participate here or hiding the fallback would invalidate the atlas that
  // made it safe to hide, creating a compile/present feedback loop.
  return JSON.stringify([hostHeight, image?.dataset.keycapAssetKey ?? "pending"]);
}

function renderRect(bounds: DOMRectReadOnly) {
  return {
    x: bounds.x + window.scrollX - SHADOW_MARGIN_X,
    y: bounds.y + window.scrollY - SHADOW_MARGIN_TOP,
    width: bounds.width + SHADOW_MARGIN_X * 2,
    height: bounds.height + SHADOW_MARGIN_TOP + SHADOW_MARGIN_BOTTOM,
  };
}

/**
 * A semantic/layout anchor for the shared compositor. It renders no physical
 * layer. The neighboring `.btn-cap` remains the native content source while
 * this component registers the host's live CSS box with the GPU scene.
 */
export default function KeycapEngineSurface() {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<KeycapHandle | null>(null);
  const frameRef = useRef(0);
  const legendKeyRef = useRef("");
  const legendCleanupRef = useRef<(() => void) | null>(null);
  const id = useId().replace(/:/g, "");

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const host = anchor?.parentElement;
    if (!anchor || !host) return;
    if (!KEYCAP_RENDER_ENGINE_ENABLED) return;
    const engine = getKeycapGpuEngine();

    const measure = () => {
      frameRef.current = 0;
      const bounds = host.getBoundingClientRect();
      const label = host.querySelector<HTMLElement>(".btn-cap");
      const text = label?.getAttribute("aria-label")?.trim() ?? label?.innerText.trim() ?? "";
      const material = materialFrom(host);
      host.dataset.keycapMaterialContract = material ? "exact" : "unsupported";
      if (!material) host.dataset.keycapMaterialIssues = "--cap-top,--keycap-roughness,--keycap-ambient";
      else delete host.dataset.keycapMaterialIssues;
      const update = {
        id,
        rect: renderRect(bounds),
        objectRect: {
          x: bounds.x + window.scrollX,
          y: bounds.y + window.scrollY,
          width: bounds.width,
          height: bounds.height,
        },
        coordinateSpace: "document" as const,
        widthUnits: Math.max(0.75, bounds.width / Math.max(bounds.height, 1)),
        material: material ?? { color: [0, 0, 0] as const, roughness: 1, ambient: 0 },
        text,
        visible: Boolean(material),
      };
      if (handleRef.current) handleRef.current.update(update);
      else handleRef.current = engine.register(update);
      const legendKey = label ? contentSignature(label, bounds.height) : "";
      if (!label && legendKeyRef.current) {
        legendCleanupRef.current?.();
        legendCleanupRef.current = null;
        legendKeyRef.current = "";
        handleRef.current?.update({ legendUv: [0, 0, 0, 0] });
      }
      if (label && legendKey !== legendKeyRef.current) {
        legendCleanupRef.current?.();
        handleRef.current?.update({ legendUv: [0, 0, 0, 0] });
        legendKeyRef.current = legendKey;
        host.dataset.keycapTextContract = "compiling";
        legendCleanupRef.current = registerLegend(label, host, (legendUv, error) => {
          host.dataset.keycapTextContract = error ? "unsupported" : "exact";
          if (error) host.dataset.keycapTextIssues = error;
          else delete host.dataset.keycapTextIssues;
          handleRef.current?.update({ legendUv });
        });
      }
    };
    const scheduleMeasure = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(measure);
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(host);
    const contentObserver = new MutationObserver(scheduleMeasure);
    contentObserver.observe(host, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "disabled", "style"] });
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    measure();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      contentObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      handleRef.current?.remove();
      handleRef.current = null;
      legendCleanupRef.current?.();
      legendCleanupRef.current = null;
      legendKeyRef.current = "";
      delete host.dataset.keycapTextContract;
      delete host.dataset.keycapTextIssues;
      delete host.dataset.keycapMaterialContract;
      delete host.dataset.keycapMaterialIssues;
    };
  }, [id]);

  useEffect(() => {
    const onTheme = () => {
      const host = anchorRef.current?.parentElement;
      const material = host ? materialFrom(host) : null;
      if (material) handleRef.current?.update({ material });
    };
    const observer = new MutationObserver(onTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return <span ref={anchorRef} className="keycap-surface keycap-gpu-anchor" data-keycap-instance={id} aria-hidden="true" />;
}
