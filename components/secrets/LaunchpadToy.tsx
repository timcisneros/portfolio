import { useCallback, useEffect, useRef, useState } from "react";
import * as Zdog from "zdog";
import { triggerSecretPad } from "../../lib/secretAudio";
import styles from "./SecretToys.module.css";
import type { SecretPalette } from "./useSecretScene";
import { useSecretScene } from "./useSecretScene";

type LaunchpadScene = {
  illustration: Zdog.Illustration;
};

const keys = ["1", "2", "3", "4", "q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"];
const sounds = ["kick", "snare", "low tone", "soft chord", "bell", "high chord", "hat", "pulse"];

export default function LaunchpadToy() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timersRef = useRef(new Map<number, number>());
  const [pressed, setPressed] = useState<Set<number>>(() => new Set());
  const [lastSound, setLastSound] = useState("Ready");

  const createScene = useCallback((canvas: HTMLCanvasElement, palette: SecretPalette): LaunchpadScene => {
    const illustration = new Zdog.Illustration({
      element: canvas,
      resize: true,
      zoom: 1.12,
      rotate: { x: -Zdog.TAU / 13, y: Zdog.TAU / 18 },
    });
    const device = new Zdog.Anchor({ addTo: illustration, translate: { y: 6 } });
    new Zdog.Box({
      addTo: device,
      width: 174,
      height: 18,
      depth: 174,
      stroke: 2,
      color: palette.panel,
      topFace: palette.panel,
      frontFace: palette.panelSide,
      rearFace: palette.panelDark,
      leftFace: palette.panelSide,
      rightFace: palette.panelSide,
      bottomFace: palette.panelDark,
    });
    new Zdog.Shape({
      addTo: device,
      path: [{ x: -72, y: -11, z: 72 }, { x: -42, y: -11, z: 72 }],
      stroke: 4,
      color: palette.accent,
    });
    new Zdog.Shape({
      addTo: device,
      translate: { x: 69, y: -11, z: -68 },
      stroke: 9,
      color: palette.red,
    });
    return { illustration };
  }, []);

  useSecretScene<LaunchpadScene>(canvasRef, createScene);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const play = useCallback((index: number) => {
    const oldTimer = timersRef.current.get(index);
    if (oldTimer) window.clearTimeout(oldTimer);
    setPressed((current) => new Set(current).add(index));
    setLastSound(`${keys[index].toUpperCase()} · ${sounds[index % sounds.length]}`);
    void triggerSecretPad(index);
    const timer = window.setTimeout(() => {
      setPressed((current) => {
        const next = new Set(current);
        next.delete(index);
        return next;
      });
      timersRef.current.delete(index);
    }, 140);
    timersRef.current.set(index, timer);
  }, []);

  return (
    <section
      ref={rootRef}
      className={`${styles.secret} ${styles.launchpadSecret}`}
      aria-labelledby="sample-pad-title"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.repeat) return;
        const index = keys.indexOf(event.key.toLowerCase());
        if (index < 0) return;
        event.preventDefault();
        play(index);
      }}
    >
      <div className={styles.toyCopy}>
        <p className={styles.eyebrow}>Pocket sample pad</p>
        <h2 id="sample-pad-title" className={styles.visuallyHidden}>Make a beat while the video buffers.</h2>
        <p className={styles.visuallyHidden}>Use the pads or the printed keyboard keys. Every sound is generated in your browser.</p>
      </div>
      <div className={styles.launchpadObject}>
        <canvas ref={canvasRef} className={styles.launchpadCanvas} width="310" height="260" aria-hidden="true" />
        <div className={styles.padGrid} role="group" aria-label="Sixteen sample pads">
          {keys.map((key, index) => (
            <button
              key={key}
              type="button"
              className={`${styles.pad}${pressed.has(index) ? ` ${styles.padPressed}` : ""}`}
              aria-label={`${key.toUpperCase()}: ${sounds[index % sounds.length]}`}
              onClick={() => play(index)}
            >
              <span aria-hidden="true">{key.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
      <p className={styles.padReadout} aria-live="polite">{lastSound}</p>
    </section>
  );
}
