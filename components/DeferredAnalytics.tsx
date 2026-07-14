import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((module) => module.Analytics),
  { ssr: false },
);

export default function DeferredAnalytics() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let done = false;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    const commit = () => {
      if (!done) setMounted(true);
    };
    const mount = () => {
      if (done) return;
      window.removeEventListener("pointerdown", mount);
      window.removeEventListener("keydown", mount);
      window.removeEventListener("scroll", mount);
      const win = window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };
      if (win.requestIdleCallback) {
        idleHandle = win.requestIdleCallback(commit, { timeout: 1800 });
      } else {
        timeoutHandle = window.setTimeout(commit, 250);
      }
    };
    window.addEventListener("pointerdown", mount, { passive: true, once: true });
    window.addEventListener("keydown", mount, { once: true });
    window.addEventListener("scroll", mount, { passive: true, once: true });
    return () => {
      done = true;
      const win = window as Window & { cancelIdleCallback?: (handle: number) => void };
      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
      window.removeEventListener("pointerdown", mount);
      window.removeEventListener("keydown", mount);
      window.removeEventListener("scroll", mount);
    };
  }, []);

  return mounted ? <Analytics /> : null;
}
