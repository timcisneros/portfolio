import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent } from "react";
import {
  commitKeycapCamera,
  getKeycapCamera,
  resetKeycapCamera,
  setKeycapCamera,
  subscribeKeycapCamera,
} from "../lib/keycap/cameraStore";

const AZIMUTH_RANGE = 55;
const ELEVATION_CENTER = 52;
const ELEVATION_RANGE = 36;

export default function KeycapCameraControl() {
  const [camera, setCamera] = useState(getKeycapCamera);
  const [dragging, setDragging] = useState(false);
  const [backend, setBackend] = useState({ label: "Detecting", reason: "" });
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const elevationRef = useRef<HTMLElement>(null);
  const azimuthRef = useRef<HTMLElement>(null);
  const distanceRef = useRef<HTMLElement>(null);
  const pointerRef = useRef<number | null>(null);
  const orbitFrameRef = useRef(0);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => subscribeKeycapCamera((next, committed) => {
    const knobX = (next.azimuthDeg / AZIMUTH_RANGE) * 50;
    const knobY = ((ELEVATION_CENTER - next.elevationDeg) / ELEVATION_RANGE) * 50;
    if (knobRef.current) {
      knobRef.current.style.transform =
        `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }
    if (elevationRef.current) elevationRef.current.textContent = `${next.elevationDeg.toFixed(1)}°`;
    if (azimuthRef.current) azimuthRef.current.textContent = `${next.azimuthDeg.toFixed(1)}°`;
    if (distanceRef.current) distanceRef.current.textContent = next.distance.toFixed(2);
    // Orbiting updates the renderer and these small DOM readouts directly.
    // React only reconciles the control when an interaction is committed.
    if (committed) setCamera({ ...next });
  }), []);

  useEffect(() => {
    const updateBackend = () => {
      const compositor = document.querySelector<HTMLElement>(".keycap-webgpu-compositor[data-render-backend]");
      if (!compositor) {
        setBackend({ label: "Detecting", reason: "The shared compositor has not mounted." });
        return;
      }
      const renderer = compositor.dataset.renderBackend;
      const analytic = renderer === "webgpu-analytic" || renderer === "software-analytic";
      setBackend({
        label: renderer === "webgpu-analytic" ? "WebGPU analytic" : renderer === "software-analytic" ? "Software analytic" : "Renderer unavailable",
        reason: analytic ? "" : (compositor.dataset.rendererReason || "Waiting for the analytic renderer to initialize."),
      });
    };
    const observer = new MutationObserver(updateBackend);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-render-backend"],
    });
    updateBackend();
    return () => observer.disconnect();
  }, []);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const bounds = padRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const radius = Math.min(bounds.width, bounds.height) / 2 - 14;
    let x = (clientX - (bounds.left + bounds.width / 2)) / radius;
    let y = (clientY - (bounds.top + bounds.height / 2)) / radius;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    setKeycapCamera(
      {
        azimuthDeg: x * AZIMUTH_RANGE,
        elevationDeg: ELEVATION_CENTER - y * ELEVATION_RANGE,
      },
      false,
    );
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateFromPointer(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pendingPointRef.current = { x: event.clientX, y: event.clientY };
    if (orbitFrameRef.current) return;
    orbitFrameRef.current = requestAnimationFrame(() => {
      orbitFrameRef.current = 0;
      const point = pendingPointRef.current;
      pendingPointRef.current = null;
      if (point) updateFromPointer(point.x, point.y);
    });
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    if (orbitFrameRef.current) cancelAnimationFrame(orbitFrameRef.current);
    orbitFrameRef.current = 0;
    const point = pendingPointRef.current;
    pendingPointRef.current = null;
    if (point) updateFromPointer(point.x, point.y);
    pointerRef.current = null;
    setDragging(false);
    commitKeycapCamera();
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setKeycapCamera({ distance: getKeycapCamera().distance + event.deltaY * 0.004 });
  };

  const knobX = (camera.azimuthDeg / AZIMUTH_RANGE) * 50;
  const knobY =
    ((ELEVATION_CENTER - camera.elevationDeg) / ELEVATION_RANGE) * 50;

  return (
    <aside className="camera-control" aria-label="Button camera controls">
      <div className="camera-control-head">
        <div>
          <strong>Key camera</strong>
          <span>Drag to orbit · wheel to dolly</span>
        </div>
        <button type="button" onClick={resetKeycapCamera}>Reset</button>
      </div>
      <div
        ref={padRef}
        className={`camera-trackball${dragging ? " is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onWheel={onWheel}
      >
        <span className="camera-axis camera-axis-x" />
        <span className="camera-axis camera-axis-y" />
        <span
          ref={knobRef}
          className="camera-knob"
          style={{ transform: `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))` }}
        />
      </div>
      {backend.reason && <p className="camera-renderer-message" role="status">{backend.reason}</p>}
      <dl className="camera-readout">
        <div><dt>Elevation</dt><dd ref={elevationRef}>{camera.elevationDeg.toFixed(1)}°</dd></div>
        <div><dt>Azimuth</dt><dd ref={azimuthRef}>{camera.azimuthDeg.toFixed(1)}°</dd></div>
        <div><dt>Distance</dt><dd ref={distanceRef}>{camera.distance.toFixed(2)}</dd></div>
        <div><dt>Renderer</dt><dd>{backend.label}</dd></div>
      </dl>
    </aside>
  );
}
