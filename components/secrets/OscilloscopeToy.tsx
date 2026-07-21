import { useCallback, useEffect, useRef, useState } from "react";
import * as Zdog from "zdog";
import { getSecretAnalyser, triggerSecretPulse } from "../../lib/secretAudio";
import styles from "./SecretToys.module.css";
import type { SecretPalette } from "./useSecretScene";
import { useSecretActivity, useSecretScene } from "./useSecretScene";

type MutableShape = Zdog.Shape & { path: Array<{ x: number; y: number; z?: number }> };

type ScopeScene = {
  illustration: Zdog.Illustration;
  trace: MutableShape;
  light: Zdog.Shape;
};

export default function OscilloscopeToy() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const stopAtRef = useRef(0);
  const [status, setStatus] = useState("Signal idle");
  const { active, reducedMotion } = useSecretActivity(rootRef);

  const createScene = useCallback((canvas: HTMLCanvasElement, palette: SecretPalette): ScopeScene => {
    const illustration = new Zdog.Illustration({
      element: canvas,
      resize: true,
      zoom: 1.17,
      rotate: { x: -Zdog.TAU / 24, y: -Zdog.TAU / 24 },
    });
    const scope = new Zdog.Anchor({ addTo: illustration, translate: { y: 5 } });
    new Zdog.Box({
      addTo: scope,
      width: 142,
      height: 92,
      depth: 32,
      stroke: 2,
      color: palette.panel,
      leftFace: palette.panelSide,
      rightFace: palette.panelSide,
      rearFace: palette.panelDark,
      bottomFace: palette.panelDark,
    });
    new Zdog.RoundedRect({
      addTo: scope,
      width: 92,
      height: 59,
      cornerRadius: 7,
      translate: { x: -16, y: -5, z: 18 },
      stroke: 3,
      fill: true,
      color: palette.panelDark,
    });
    [-32, -16, 0, 16, 32].forEach((x) => {
      new Zdog.Shape({
        addTo: scope,
        path: [{ x: x - 16, y: -31, z: 20 }, { x: x - 16, y: 21, z: 20 }],
        stroke: 0.65,
        color: palette.border,
      });
    });
    [-20, -8, 4, 16].forEach((y) => {
      new Zdog.Shape({
        addTo: scope,
        path: [{ x: -60, y, z: 20 }, { x: 28, y, z: 20 }],
        stroke: 0.65,
        color: palette.border,
      });
    });
    const idlePath = Array.from({ length: 25 }, (_, index) => ({
      x: -58 + index * 3.55,
      y: -5 + Math.sin(index * 0.9) * 7,
      z: 22,
    }));
    const trace = new Zdog.Shape({
      addTo: scope,
      path: idlePath,
      closed: false,
      stroke: 2,
      color: palette.yellow,
    }) as MutableShape;
    [32, 51].forEach((x, index) => {
      new Zdog.Cylinder({
        addTo: scope,
        diameter: index ? 18 : 21,
        length: 7,
        translate: { x, y: index ? 16 : -12, z: 19 },
        stroke: 2,
        color: index ? palette.panelSide : palette.accent,
        frontFace: index ? palette.ink : palette.accent,
      });
    });
    const light = new Zdog.Shape({
      addTo: scope,
      translate: { x: 48, y: 35, z: 20 },
      stroke: 7,
      color: palette.red,
    });
    return { illustration, trace, light };
  }, []);

  const sceneRef = useSecretScene<ScopeScene>(canvasRef, createScene);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    if (active) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setStatus("Signal idle");
  }, [active]);

  const drawSignal = useCallback((time: number) => {
    const scene = sceneRef.current;
    if (!scene || !active) {
      frameRef.current = null;
      return;
    }
    const analyser = getSecretAnalyser();
    const samples = new Uint8Array(analyser?.frequencyBinCount ?? 32);
    analyser?.getByteTimeDomainData(samples);
    const pointCount = 25;
    const points = Array.from({ length: pointCount }, (_, index) => {
      const sampleIndex = Math.floor(index / (pointCount - 1) * (samples.length - 1));
      const audioY = analyser ? (samples[sampleIndex] - 128) / 128 : Math.sin(index * 0.8 + time * 0.012) * 0.25;
      return { x: -58 + index * 3.55, y: -5 + audioY * 24, z: 22 };
    });
    scene.trace.path = points;
    scene.trace.updatePath();
    scene.light.stroke = Math.floor(time / 120) % 2 ? 7 : 4;
    scene.illustration.updateRenderGraph();

    if (!reducedMotion && time < stopAtRef.current) {
      frameRef.current = requestAnimationFrame(drawSignal);
    } else {
      frameRef.current = null;
      setStatus("Trace complete");
    }
  }, [active, reducedMotion, sceneRef]);

  const testSignal = async () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    setStatus("Tracing test signal");
    await triggerSecretPulse(392);
    const now = performance.now();
    stopAtRef.current = now + (reducedMotion ? 0 : 920);
    frameRef.current = requestAnimationFrame(drawSignal);
  };

  return (
    <section ref={rootRef} className={`${styles.secret} ${styles.scopeSecret}`} aria-labelledby="scope-title">
      <div className={styles.toyCopy}>
        <p className={styles.eyebrow}>Signal trace</p>
        <h2 id="scope-title" className={styles.visuallyHidden}>Debug the thing you can&apos;t see.</h2>
        <p className={styles.visuallyHidden}>A small scope for a project built to make hidden workflow state inspectable.</p>
      </div>
      <div className={styles.scopeObject}>
        <canvas ref={canvasRef} className={styles.scopeCanvas} width="270" height="205" aria-hidden="true" />
        <button type="button" className={styles.objectButton} onClick={() => void testSignal()}>
          <span className={styles.visuallyHidden}>Send a test signal through the oscilloscope</span>
        </button>
      </div>
      <div className={styles.scopeControls}>
        <button type="button" onClick={() => void testSignal()}>Send test pulse</button>
        <span aria-live="polite">{status}</span>
      </div>
    </section>
  );
}
