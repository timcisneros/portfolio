import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { KEYCAP_RENDER_ENGINE_ENABLED } from "../lib/keycap/config";

const KeycapCameraControl = dynamic(() => import("./KeycapCameraControl"), {
  ssr: false,
});

export default function DeferredCameraControl() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const requested = KEYCAP_RENDER_ENGINE_ENABLED
      || new URLSearchParams(window.location.search).get("keycap-inspector") === "1";
    if (!requested) return;
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (win.requestIdleCallback) {
      const handle = win.requestIdleCallback(() => setMounted(true), { timeout: 1800 });
      return () => win.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(() => setMounted(true), 500);
    return () => window.clearTimeout(handle);
  }, []);

  return mounted ? <KeycapCameraControl /> : null;
}
