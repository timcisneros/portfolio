import { useEffect, useRef, useState } from "react";
import { getKeycapCamera, subscribeKeycapCamera } from "../lib/keycap/cameraStore";
import { getKeycapGpuEngine, type KeycapGpuStatus } from "../lib/keycap/gpu";

function backendFor(status: KeycapGpuStatus) {
  if (status.state !== "ready") return "dom-fallback";
  return status.backend === "webgpu" ? "webgpu-analytic" : "software-analytic";
}

/**
 * The only browser presentation surface used by the physical-control engine.
 * Geometry, light, materials and scene state live in the shared WebGPU engine;
 * this canvas is only its viewport-sized compositor socket.
 */
export default function KeycapCompositor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileHostRef = useRef<HTMLDivElement>(null);
  const [backend, setBackend] = useState("dom-fallback");

  useEffect(() => {
    const canvas = canvasRef.current;
    const tileHost = tileHostRef.current;
    if (!canvas || !tileHost) return;
    const engine = getKeycapGpuEngine();
    let active = true;
    delete document.documentElement.dataset.keycapRenderer;
    delete document.documentElement.dataset.keycapLegends;

    const onFramePresented = () => {
      if (!active) return;
      document.documentElement.dataset.keycapRenderer = "webgpu";
    };
    const onLegendsPresented = () => {
      if (!active) return;
      document.documentElement.dataset.keycapLegends = "ready";
    };
    const syncDocumentSurface = () => {
      if (canvas.dataset.renderBackend !== "software-analytic") return;
      engine.setSoftwareDocumentSize(document.documentElement.clientWidth, document.documentElement.scrollHeight);
    };
    const documentResizeObserver = new ResizeObserver(syncDocumentSurface);
    documentResizeObserver.observe(document.documentElement);
    documentResizeObserver.observe(document.body);
    canvas.addEventListener("keycap-frame-presented", onFramePresented);
    canvas.addEventListener("keycap-legends-presented", onLegendsPresented);

    const unsubscribeStatus = engine.subscribeStatus((status) => {
      if (!active) return;
      const nextBackend = backendFor(status);
      setBackend(nextBackend);
      canvas.dataset.renderBackend = nextBackend;
      canvas.dataset.rendererState = status.state;
      canvas.dataset.rendererReason = "reason" in status ? status.reason : "";
      syncDocumentSurface();
      if (status.state !== "ready") {
        delete document.documentElement.dataset.keycapRenderer;
        delete document.documentElement.dataset.keycapLegends;
      }
    });
    const unsubscribeCamera = subscribeKeycapCamera((camera, committed) => {
      engine.setCamera(camera, committed);
    });

    engine.attach(canvas, { camera: getKeycapCamera(), softwareTileHost: tileHost }).then((status) => {
      if (!active) return;
      const nextBackend = backendFor(status);
      setBackend(nextBackend);
      canvas.dataset.renderBackend = nextBackend;
    });

    return () => {
      active = false;
      unsubscribeStatus();
      unsubscribeCamera();
      canvas.removeEventListener("keycap-frame-presented", onFramePresented);
      canvas.removeEventListener("keycap-legends-presented", onLegendsPresented);
      documentResizeObserver.disconnect();
      engine.detach();
      delete document.documentElement.dataset.keycapRenderer;
      delete document.documentElement.dataset.keycapLegends;
    };
  }, []);

  return <div className="keycap-compositor-layer" aria-hidden="true">
    <canvas
        ref={canvasRef}
        className="keycap-webgpu-compositor"
        data-render-backend={backend}
        data-scene-version="0"
        data-frame-version="0"
        tabIndex={-1}
      />
    <div ref={tileHostRef} className="keycap-software-tile-host" />
  </div>;
}
