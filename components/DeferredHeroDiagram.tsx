import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import StaticHeroDiagram from "./StaticHeroDiagram";

const HeroDiagram = dynamic(() => import("./HeroDiagram"), {
  ssr: false,
  loading: StaticHeroDiagram,
});

export default function DeferredHeroDiagram() {
  const [interactive, setInteractive] = useState(false);
  const hydrate = useCallback(() => setInteractive(true), []);

  useEffect(() => {
    const win = window as Window & {
      __heroDiagramImmediate?: boolean;
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (win.__heroDiagramImmediate) {
      hydrate();
      return;
    }

    let delayHandle: number | undefined;
    let idleHandle: number | undefined;
    const schedule = () => {
      delayHandle = window.setTimeout(() => {
        if (win.requestIdleCallback) {
          idleHandle = win.requestIdleCallback(hydrate, { timeout: 2500 });
        } else {
          hydrate();
        }
      }, 4500);
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      window.removeEventListener("load", schedule);
      if (delayHandle !== undefined) window.clearTimeout(delayHandle);
      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle);
    };
  }, [hydrate]);

  return (
    <div className="hero-diagram-defer" onPointerEnter={hydrate} onFocus={hydrate}>
      {interactive ? <HeroDiagram /> : <StaticHeroDiagram />}
    </div>
  );
}
