import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KEYCAP_RENDER_ENGINE_ENABLED } from "../lib/keycap/config";

/**
 * Evidence-only runtime diagnostics.
 *
 * Every line in the generated bundle is a value measured from the live app at
 * capture time: real navigator/viewport facts, real CSS media-query results,
 * and the render contracts the app itself stamps onto the DOM
 * (`data-keycap-*`, `data-renderer-*`, headline `data-*`). Nothing here is
 * hand-authored architecture prose or an assumption — a probe that cannot read
 * its source reports `unavailable` rather than guessing. Mounting is controlled
 * by the `DIAGNOSTICS_ENABLED` flag in `lib/diagnostics/config.ts` via
 * `DeferredDiagnostics`; once mounted the panel is always active.
 */

const SCHEMA = 2;

type CapturedError = { kind: "error" | "unhandledrejection"; message: string; at: number };

function q(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value.length ? value : "(empty)";
  return String(value);
}

/** Run a probe defensively so an unsupported API becomes evidence, not a crash. */
function probe<T>(fn: () => T): T | string {
  try {
    return fn();
  } catch (error) {
    return `unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function mq(query: string): string {
  return probe(() => (window.matchMedia(query).matches ? query.replace(/[()]/g, "") : "no")) as string;
}

function rect(el: Element | null): string {
  if (!el) return "absent";
  const r = el.getBoundingClientRect();
  return `${Math.round(r.width)}x${Math.round(r.height)} @ (${Math.round(r.left)},${Math.round(r.top)})`;
}

function collectOverflow(): string[] {
  const docWidth = document.documentElement.clientWidth;
  const offenders: string[] = [];
  const all = document.body.querySelectorAll<HTMLElement>("*");
  for (const el of Array.from(all)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > docWidth + 1 || r.left < -1) {
      const id = el.id ? `#${el.id}` : "";
      const cls = el.classList.length ? `.${Array.from(el.classList).slice(0, 2).join(".")}` : "";
      offenders.push(`${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(r.right)} (doc=${docWidth})`);
      if (offenders.length >= 12) break;
    }
  }
  return offenders;
}

function buildBundle(errors: CapturedError[], captureWindowStart: number): string {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
    userAgentData?: { platform?: string; mobile?: boolean; brands?: { brand: string; version: string }[] };
    gpu?: unknown;
  };
  const perf = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
  const de = document.documentElement;
  const vv = window.visualViewport;
  const L: string[] = [];
  const push = (k: string, v: unknown) => L.push(`${k}: ${q(v)}`);
  const head = (title: string) => L.push("", `[${title}]`);

  L.push("=== PORTFOLIO RUNTIME DIAGNOSTIC BUNDLE ===");
  push("schema", SCHEMA);
  push("generated", new Date().toISOString());
  push("href", location.href);
  push("referrer", document.referrer || "(none)");
  push("readyState", document.readyState);

  head("ENVIRONMENT");
  push("userAgent", navigator.userAgent);
  push("uaData.platform", probe(() => nav.userAgentData?.platform ?? "unavailable"));
  push("uaData.mobile", probe(() => nav.userAgentData?.mobile ?? "unavailable"));
  push("language", navigator.language);
  push("viewport.inner", `${window.innerWidth}x${window.innerHeight}`);
  push("visualViewport", vv ? `${Math.round(vv.width)}x${Math.round(vv.height)} scale=${vv.scale.toFixed(2)} offsetTop=${Math.round(vv.offsetTop)}` : "absent");
  push("devicePixelRatio", window.devicePixelRatio);
  push("screen", `${screen.width}x${screen.height} avail=${screen.availWidth}x${screen.availHeight}`);
  push("orientation", probe(() => screen.orientation?.type ?? "unavailable"));
  push("online", navigator.onLine);

  head("PREFERENCES");
  push("prefers-reduced-motion", mq("(prefers-reduced-motion: reduce)"));
  push("prefers-color-scheme", `${mq("(prefers-color-scheme: dark)")} / ${mq("(prefers-color-scheme: light)")}`);
  push("forced-colors", mq("(forced-colors: active)"));
  push("documentElement[data-theme]", de.getAttribute("data-theme") ?? "(unset)");

  head("CAPABILITIES");
  push("navigator.gpu", "gpu" in navigator ? "present" : "absent");
  push("webgl", probe(() => (document.createElement("canvas").getContext("webgl2") ? "webgl2" : document.createElement("canvas").getContext("webgl") ? "webgl1" : "none")));
  push("hardwareConcurrency", navigator.hardwareConcurrency);
  push("deviceMemory", nav.deviceMemory ?? "unavailable");
  push("connection", nav.connection ? `${nav.connection.effectiveType} down=${nav.connection.downlink} rtt=${nav.connection.rtt} saveData=${nav.connection.saveData}` : "unavailable");
  push("requestIdleCallback", "requestIdleCallback" in window ? "present" : "absent");

  head("KEYCAP ENGINE");
  push("config.KEYCAP_RENDER_ENGINE_ENABLED", KEYCAP_RENDER_ENGINE_ENABLED);
  push("documentElement[data-keycap-renderer]", de.dataset.keycapRenderer ?? "(unset)");
  push("documentElement[data-keycap-legends]", de.dataset.keycapLegends ?? "(unset)");
  const canvas = document.querySelector<HTMLCanvasElement>(".keycap-webgpu-compositor");
  if (canvas) {
    push("compositor.canvas", "present");
    push("canvas[data-renderer-state]", canvas.dataset.rendererState ?? "(unset)");
    push("canvas[data-renderer-reason]", canvas.dataset.rendererReason ?? "(unset)");
    push("canvas[data-render-backend]", canvas.dataset.renderBackend ?? "(unset)");
    push("canvas[data-frame-version]", canvas.dataset.frameVersion ?? "(unset)");
    push("canvas[data-webgpu-failure]", canvas.dataset.webgpuFailure ?? "(none)");
  } else {
    push("compositor.canvas", "absent (embedded-SVG mode / not mounted)");
  }

  head("KEYCAP CONTRACTS");
  const hosts = Array.from(document.querySelectorAll<HTMLElement>("[data-keycap-material-contract], [data-keycap-text-contract]"));
  push("hostCount", hosts.length);
  hosts.slice(0, 24).forEach((host, i) => {
    const mat = host.dataset.keycapMaterialContract ?? "n/a";
    const matIssues = host.dataset.keycapMaterialIssues ? ` issues=${host.dataset.keycapMaterialIssues}` : "";
    const txt = host.dataset.keycapTextContract ?? "n/a";
    const txtIssues = host.dataset.keycapTextIssues ? ` issues=${host.dataset.keycapTextIssues}` : "";
    const label = host.querySelector(".btn-cap")?.textContent?.trim().slice(0, 24) ?? "";
    L.push(`  #${i} "${label}" material=${mat}${matIssues} text=${txt}${txtIssues}`);
  });

  head("HERO RENDER STATE");
  const defer = document.querySelector(".hero-diagram-defer");
  push("hero-diagram-defer", rect(defer));
  push("hero-diagram-defer.computedWidth", defer ? probe(() => getComputedStyle(defer).width) : "absent");
  const heroCards = document.querySelectorAll(".hero-diagram-defer .hero-diagram");
  push("hero-diagram.cards", heroCards.length);
  push("hd-card-status", document.querySelector(".hero-diagram-defer .hd-card-status")?.textContent?.trim() ?? "absent");
  const tw = document.querySelector<HTMLElement>(".hero-headline .tw");
  push("headline.present", tw ? "yes" : "no");
  push("headline.interactive(data-line1)", tw?.dataset.line1 !== undefined ? "hydrated" : "static-fallback");
  if (tw?.dataset.line1 !== undefined) {
    push("headline.data-caret", tw.dataset.caret ?? "(unset)");
    push("headline.data-moving", tw.dataset.moving ?? "(unset)");
    push("headline.data-selection", tw.dataset.selection ?? "(unset)");
  }
  push("hero-headline.rect", rect(document.querySelector(".hero-headline h1")));

  head("LAYOUT");
  push("document.scroll/clientWidth", `${de.scrollWidth}/${de.clientWidth}`);
  push("horizontalOverflow", de.scrollWidth > de.clientWidth ? `YES (+${de.scrollWidth - de.clientWidth}px)` : "no");
  push("body.scrollHeight", document.body.scrollHeight);
  push("header.hero.rect", rect(document.querySelector("header.hero")));
  const offenders = probe(() => collectOverflow());
  if (Array.isArray(offenders)) {
    push("overflowingElements", offenders.length);
    offenders.forEach((o) => L.push(`  - ${o}`));
  } else {
    push("overflowingElements", offenders);
  }

  head("TIMING");
  const navEntry = probe(() => performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined);
  if (navEntry && typeof navEntry !== "string") {
    push("nav.type", navEntry.type);
    push("nav.domContentLoaded", `${Math.round(navEntry.domContentLoadedEventEnd)}ms`);
    push("nav.loadEventEnd", `${Math.round(navEntry.loadEventEnd)}ms`);
    push("nav.responseEnd", `${Math.round(navEntry.responseEnd)}ms`);
  } else {
    push("nav", navEntry);
  }
  const fcp = probe(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime);
  push("paint.first-contentful-paint", typeof fcp === "number" ? `${Math.round(fcp)}ms` : fcp ?? "unavailable");
  push("memory", perf.memory ? `used=${(perf.memory.usedJSHeapSize / 1048576).toFixed(1)}MB / limit=${(perf.memory.jsHeapSizeLimit / 1048576).toFixed(1)}MB` : "unavailable");

  head("ERRORS");
  push("captureWindowStart", new Date(captureWindowStart).toISOString());
  push("captured", `${errors.length} (only errors after panel mount are observed)`);
  errors.slice(-20).forEach((e) => L.push(`  [${e.kind}] +${Math.round(e.at - captureWindowStart)}ms ${e.message}`));

  L.push("", "=== END BUNDLE ===");
  return L.join("\n");
}

export default function DiagnosticsPanel() {
  const [bundle, setBundle] = useState("");
  const [copied, setCopied] = useState(false);
  const errorsRef = useRef<CapturedError[]>([]);
  const captureStartRef = useRef<number>(Date.now());

  useEffect(() => {
    captureStartRef.current = Date.now();
    const onError = (e: ErrorEvent) =>
      errorsRef.current.push({ kind: "error", message: `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`, at: Date.now() });
    const onRejection = (e: PromiseRejectionEvent) =>
      errorsRef.current.push({ kind: "unhandledrejection", message: q(e.reason instanceof Error ? e.reason.message : e.reason), at: Date.now() });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const regenerate = useCallback(() => {
    setBundle(buildBundle(errorsRef.current, captureStartRef.current));
    setCopied(false);
  }, []);

  useEffect(() => {
    // Capture after load + a settle delay so deferred hero/headline hydration
    // and any engine handoff are reflected as measured state, not mid-flight.
    const run = () => window.setTimeout(regenerate, 5200);
    if (document.readyState === "complete") {
      const h = run();
      return () => window.clearTimeout(h);
    }
    window.addEventListener("load", run, { once: true });
    return () => window.removeEventListener("load", run);
  }, [regenerate]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bundle);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [bundle]);

  const styles = useMemo(
    () =>
      ({
        wrap: {
          position: "fixed",
          right: "12px",
          bottom: "12px",
          zIndex: 2147483647,
          width: "min(440px, calc(100vw - 24px))",
          background: "#0b0f14",
          color: "#e6edf3",
          border: "1px solid #30363d",
          borderRadius: "10px",
          padding: "10px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
          font: "12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
        },
        row: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" },
        btn: {
          appearance: "none",
          border: "1px solid #30363d",
          background: "#161b22",
          color: "#e6edf3",
          borderRadius: "6px",
          padding: "5px 10px",
          cursor: "pointer",
          font: "inherit",
        },
        area: {
          width: "100%",
          height: "240px",
          resize: "vertical",
          background: "#010409",
          color: "#c9d1d9",
          border: "1px solid #21262d",
          borderRadius: "6px",
          padding: "8px",
          font: "11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace",
          whiteSpace: "pre",
        },
        title: { fontWeight: 700, marginRight: "auto" },
      }) as const,
    [],
  );

  return (
    <div style={styles.wrap} role="region" aria-label="Runtime diagnostics">
      <div style={styles.row}>
        <span style={styles.title}>Diagnostic bundle</span>
        <button type="button" style={styles.btn} onClick={regenerate}>
          Refresh
        </button>
        <button type="button" style={styles.btn} onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <textarea
        style={styles.area}
        readOnly
        value={bundle || "Collecting evidence… (auto-captures ~5s after load; press Refresh to re-run)"}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Copyable diagnostic bundle"
      />
    </div>
  );
}
