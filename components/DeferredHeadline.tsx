import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

function StaticHeadline() {
  return (
    <span className="tw" aria-hidden="true">
      <span className="tw-line1"><span className="tw-word">Software that</span></span>
      <em className="tw-line2">
        <span className="tw-word">works for you</span>
        <span className="tw-caret" />
      </em>
      <i className="tw-handle tw-handle-tl" />
      <i className="tw-handle tw-handle-tr" />
      <i className="tw-handle tw-handle-bl" />
      <i className="tw-handle tw-handle-br" />
    </span>
  );
}

const TypewriterHeadline = dynamic(() => import("./TypewriterHeadline"), {
  ssr: false,
  loading: StaticHeadline,
});

/** Paint the complete headline immediately, then hydrate its editing runtime
 * after critical rendering work has settled. The two states share dimensions
 * and text, so loading the animation cannot move the hero. */
export default function DeferredHeadline() {
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    let observer: IntersectionObserver | undefined;
    let isVisible = false;
    let isScheduled = false;
    const schedule = () => {
      if (document.hidden || !isVisible || isScheduled) return;
      isScheduled = true;
      if (win.requestIdleCallback) {
        idleHandle = win.requestIdleCallback(() => setInteractive(true), { timeout: 1400 });
      } else {
        timeoutHandle = window.setTimeout(() => setInteractive(true), 250);
      }
    };
    const onVisibility = () => {
      if (!document.hidden) {
        document.removeEventListener("visibilitychange", onVisibility);
        schedule();
      }
    };
    const headline = document.querySelector(".hero-headline h1");
    if (headline && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          observer?.disconnect();
          schedule();
        }
      }, { rootMargin: "80px 0px" });
      observer.observe(headline);
    } else {
      isVisible = true;
      schedule();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
    };
  }, []);

  return interactive ? <TypewriterHeadline /> : <StaticHeadline />;
}
