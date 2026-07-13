import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { getKeycapGpuEngine, type KeycapHandle } from "../lib/keycap/gpu";
import { registerLegend, type KeycapLegendIcon } from "../lib/keycap/gpu/legendAtlas";

type Rgb = readonly [number, number, number];

const FALLBACK_PLASTIC: Rgb = [0.91, 0.91, 0.88];
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
  return {
    color: parseColor(style.getPropertyValue("--cap-top")) ?? FALLBACK_PLASTIC,
    legendColor: parseColor(style.getPropertyValue("--cap-ink")) ?? [0.20, 0.20, 0.18] as const,
    roughness: 0.78,
    ambient: document.documentElement.dataset.theme === "dark" ? 0.18 : 0.14,
  };
}

function iconFrom(label: HTMLElement | null): KeycapLegendIcon {
  const markup = label?.querySelector("svg")?.innerHTML ?? "";
  if (markup.includes("M21 15v4")) return "download";
  if (markup.includes('x="2" y="4"')) return "mail";
  if (markup.includes("M18 13v6")) return "external";
  if (markup.includes("M12 .5")) return "github";
  return "none";
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
export default function KeycapSurface() {
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
    const engine = getKeycapGpuEngine();

    const measure = () => {
      frameRef.current = 0;
      const bounds = host.getBoundingClientRect();
      const label = host.querySelector<HTMLElement>(".btn-cap");
      const text = label?.innerText.trim() ?? "";
      const update = {
        id,
        rect: renderRect(bounds),
        coordinateSpace: "document" as const,
        widthUnits: Math.max(0.75, bounds.width / Math.max(bounds.height, 1)),
        material: materialFrom(host),
        text,
        visible: true,
      };
      if (handleRef.current) handleRef.current.update(update);
      else handleRef.current = engine.register(update);
      const icon = iconFrom(label);
      const legendKey = `${icon}:${text}`;
      if (text && legendKey !== legendKeyRef.current) {
        legendCleanupRef.current?.();
        legendKeyRef.current = legendKey;
        legendCleanupRef.current = registerLegend(text, icon, (legendUv) => {
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
    contentObserver.observe(host, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "disabled"] });
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
    };
  }, [id]);

  useEffect(() => {
    const onTheme = () => {
      const host = anchorRef.current?.parentElement;
      if (host) handleRef.current?.update({ material: materialFrom(host) });
    };
    const observer = new MutationObserver(onTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return <span ref={anchorRef} className="keycap-surface keycap-gpu-anchor" data-keycap-instance={id} aria-hidden="true" />;
}
