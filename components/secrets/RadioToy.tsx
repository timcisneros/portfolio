import { useCallback, useEffect, useRef, useState } from "react";
import * as Zdog from "zdog";
import {
  startSecretStation,
  stopSecretStation,
  subscribeSecretAudio,
  toggleSecretMute,
  type SecretStation,
} from "../../lib/secretAudio";
import styles from "./SecretToys.module.css";
import type { SecretPalette } from "./useSecretScene";
import { useSecretActivity, useSecretScene } from "./useSecretScene";

type RadioScene = {
  illustration: Zdog.Illustration;
  dial: Zdog.Anchor;
  needle: Zdog.Shape;
};

const stations: Array<{ id: SecretStation; name: string; frequency: string }> = [
  { id: "sunroom", name: "Sunroom", frequency: "88.4" },
  { id: "machines", name: "Small Machines", frequency: "104.2" },
  { id: "night-drive", name: "Night Drive", frequency: "109.7" },
];

export default function RadioToy() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [stationIndex, setStationIndex] = useState(0);
  const [playing, setPlaying] = useState<SecretStation | null>(null);
  const [muted, setMuted] = useState(false);
  const { active, reducedMotion } = useSecretActivity(rootRef);
  const selected = stations[stationIndex];

  const createScene = useCallback((canvas: HTMLCanvasElement, palette: SecretPalette): RadioScene => {
    const illustration = new Zdog.Illustration({
      element: canvas,
      resize: true,
      zoom: 1.2,
      rotate: { x: -Zdog.TAU / 18, y: -Zdog.TAU / 14 },
    });
    const radio = new Zdog.Anchor({ addTo: illustration, translate: { y: 5 } });
    new Zdog.Box({
      addTo: radio,
      width: 116,
      height: 72,
      depth: 30,
      stroke: 2,
      color: palette.panel,
      leftFace: palette.panelSide,
      rightFace: palette.panelSide,
      rearFace: palette.panelDark,
      bottomFace: palette.panelDark,
    });
    new Zdog.RoundedRect({
      addTo: radio,
      width: 58,
      height: 42,
      cornerRadius: 8,
      translate: { x: -20, z: 16 },
      stroke: 3,
      fill: true,
      color: palette.panelDark,
    });
    for (let x = -40; x <= 0; x += 10) {
      new Zdog.Shape({
        addTo: radio,
        path: [{ x, y: -14, z: 18 }, { x, y: 14, z: 18 }],
        stroke: 2,
        color: palette.muted,
      });
    }
    const dial = new Zdog.Anchor({ addTo: radio, translate: { x: 36, y: -12, z: 19 } });
    new Zdog.Cylinder({
      addTo: dial,
      diameter: 22,
      length: 7,
      stroke: 2,
      color: palette.accent,
      frontFace: palette.accent,
    });
    new Zdog.Shape({
      addTo: dial,
      path: [{ y: -7, z: 4 }, { y: -2, z: 4 }],
      stroke: 2,
      color: palette.panelDark,
    });
    new Zdog.Cylinder({
      addTo: radio,
      diameter: 18,
      length: 7,
      translate: { x: 36, y: 18, z: 19 },
      stroke: 2,
      color: palette.panelSide,
      frontFace: palette.ink,
    });
    const needle = new Zdog.Shape({
      addTo: radio,
      path: [{ x: -48, y: -24, z: 19 }, { x: 22, y: -24, z: 19 }],
      stroke: 3,
      color: palette.yellow,
    });
    new Zdog.Shape({
      addTo: radio,
      path: [{ x: -45, y: -36, z: 6 }, { x: 25, y: -78, z: 6 }],
      stroke: 3,
      color: palette.border,
    });
    new Zdog.Shape({
      addTo: radio,
      path: [{ x: -49, y: 32, z: 17 }, { x: -36, y: 32, z: 17 }],
      stroke: 5,
      color: palette.red,
    });
    return { illustration, dial, needle };
  }, []);

  const sceneRef = useSecretScene<RadioScene>(canvasRef, createScene);

  useEffect(() => subscribeSecretAudio((state) => {
    setPlaying(state.station);
    setMuted(state.muted);
  }), []);

  useEffect(() => () => stopSecretStation(), []);

  useEffect(() => {
    if (active || !playing) return;
    stopSecretStation();
  }, [active, playing]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.needle.translate.x = -22 + stationIndex * 22;
    scene.illustration.updateRenderGraph();
  }, [sceneRef, stationIndex]);

  useEffect(() => {
    if (!playing || !active || reducedMotion) return;
    const tick = (time: number) => {
      const scene = sceneRef.current;
      if (!scene) return;
      scene.dial.rotate.z = time * 0.0008;
      scene.illustration.updateRenderGraph();
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [active, playing, reducedMotion, sceneRef]);

  const choose = async (index: number) => {
    const nextIndex = (index + stations.length) % stations.length;
    setStationIndex(nextIndex);
    if (playing) await startSecretStation(stations[nextIndex].id);
  };

  const togglePlayback = async () => {
    if (playing) stopSecretStation();
    else await startSecretStation(selected.id);
  };

  return (
    <section ref={rootRef} className={`${styles.secret} ${styles.radioSecret}`} aria-labelledby="tiny-radio-title">
      <div className={styles.toyCopy}>
        <p className={styles.eyebrow}>A tiny radio</p>
        <h2 id="tiny-radio-title" className={styles.visuallyHidden}>Three original loops. No autoplay.</h2>
        <p className={styles.visuallyHidden}>Turn it on, then tune around.</p>
      </div>
      <div className={styles.radioObject}>
        <canvas ref={canvasRef} className={styles.radioCanvas} width="250" height="190" aria-hidden="true" />
        <button type="button" className={styles.objectButton} onClick={() => void togglePlayback()}>
          <span className={styles.visuallyHidden}>{playing ? "Turn off the radio" : "Turn on the radio"}</span>
        </button>
      </div>
      <div className={styles.radioPanel}>
        <div className={styles.radioReadout} aria-live="polite">
          <span>{selected.frequency} FM</span>
          <strong>{selected.name}</strong>
        </div>
        <div className={styles.inlineControls}>
          <button type="button" onClick={() => void choose(stationIndex - 1)} aria-label="Previous station">←</button>
          <button type="button" onClick={() => void togglePlayback()}>{playing ? "Stop" : "Play"}</button>
          <button type="button" onClick={() => void choose(stationIndex + 1)} aria-label="Next station">→</button>
          <button type="button" onClick={toggleSecretMute}>{muted ? "Sound on" : "Mute"}</button>
        </div>
      </div>
    </section>
  );
}
