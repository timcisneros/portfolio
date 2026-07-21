import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Illustration } from "zdog";

export type SecretPalette = {
  accent: string;
  background: string;
  border: string;
  ink: string;
  muted: string;
  panel: string;
  panelSide: string;
  panelDark: string;
  yellow: string;
  red: string;
};

type SecretRenderer = Pick<Illustration, "updateRenderGraph"> & {
  setResize?: (resize: boolean) => void;
};

export type SecretScene = {
  illustration: SecretRenderer;
  dispose?: () => void;
};

function cssValue(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function readSecretPalette(): SecretPalette {
  const scheme = getComputedStyle(document.documentElement).colorScheme;
  const light = scheme.includes("light");
  return {
    accent: cssValue("--accent-display", light ? "#ff5a1f" : "#ffe04f"),
    background: cssValue("--bg", light ? "#f5f6f7" : "#131314"),
    border: cssValue("--border-strong", light ? "#c9ccd1" : "#46464c"),
    ink: cssValue("--text", light ? "#1b1c1e" : "#ececee"),
    muted: cssValue("--text-muted", light ? "#55575c" : "#a3a4a8"),
    panel: light ? "#ffffff" : "#29292d",
    panelSide: light ? "#d9dadd" : "#1d1d20",
    panelDark: light ? "#aeb1b6" : "#111113",
    yellow: "#ffe04f",
    red: "#e34d48",
  };
}

export function useSecretActivity(rootRef: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateMotion();
    updateVisibility();

    const observer = root && "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
          rootMargin: "160px 0px",
        })
      : null;
    if (root && observer) observer.observe(root);

    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer?.disconnect();
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [rootRef]);

  return { active: inView && pageVisible, reducedMotion };
}

export function useSecretScene<T extends SecretScene>(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  createScene: (canvas: HTMLCanvasElement, palette: SecretPalette) => T,
) {
  const sceneRef = useRef<T | null>(null);
  const [themeRevision, setThemeRevision] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeRevision((value) => value + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createScene(canvas, readSecretPalette());
    sceneRef.current = scene;
    scene.illustration.updateRenderGraph();
    return () => {
      scene.dispose?.();
      const illustration = scene.illustration;
      illustration.setResize?.(false);
      if (sceneRef.current === scene) sceneRef.current = null;
    };
  }, [canvasRef, createScene, themeRevision]);

  return sceneRef;
}
