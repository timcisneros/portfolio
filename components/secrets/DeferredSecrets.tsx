import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CarToyProps } from "./CarToy";
import { hasCarRouteTransfer } from "../../lib/carContinuity";
import {
  isSecretToyEnabled,
  type SecretToyKind,
} from "../../lib/secretToys";

const CarToy = dynamic(() => import("./CarToy"), { ssr: false });
const RadioToy = dynamic(() => import("./RadioToy"), { ssr: false });
const LaunchpadToy = dynamic(() => import("./LaunchpadToy"), { ssr: false });
const OscilloscopeToy = dynamic(() => import("./OscilloscopeToy"), { ssr: false });

function shouldLoadCarImmediately() {
  if (typeof window === "undefined") return false;
  return hasCarRouteTransfer()
    || new URLSearchParams(window.location.search).get("car-audit") === "1";
}

function EnabledDeferredSecret({ kind, carNavigation }: {
  kind: SecretToyKind;
  carNavigation?: CarToyProps;
}) {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => (
    kind === "car"
    && shouldLoadCarImmediately()
  ));

  useEffect(() => {
    if (kind === "car" && shouldLoadCarImmediately()) {
      setReady(true);
      return;
    }
    const boundary = boundaryRef.current;
    if (!boundary || !("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setReady(true);
      observer.disconnect();
    }, { rootMargin: "520px 0px" });
    observer.observe(boundary);
    return () => observer.disconnect();
  }, [kind]);

  return (
    <div ref={boundaryRef} className={`secret-deferred secret-deferred-${kind}`}>
      {ready ? (
        <>
          {kind === "car" && <CarToy {...carNavigation} />}
          {kind === "radio" && <RadioToy />}
          {kind === "launchpad" && <LaunchpadToy />}
          {kind === "oscilloscope" && <OscilloscopeToy />}
        </>
      ) : (
        <div className="secret-placeholder" aria-hidden="true" />
      )}
    </div>
  );
}

function DeferredSecret({ kind, carNavigation }: {
  kind: SecretToyKind;
  carNavigation?: CarToyProps;
}) {
  if (!isSecretToyEnabled(kind)) return null;
  return <EnabledDeferredSecret kind={kind} carNavigation={carNavigation} />;
}

export function DeferredCarToy(props: CarToyProps) {
  return <DeferredSecret kind="car" carNavigation={props} />;
}

export function DeferredRadioToy() {
  return <DeferredSecret kind="radio" />;
}

export function DeferredLaunchpadToy() {
  return <DeferredSecret kind="launchpad" />;
}

export function DeferredOscilloscopeToy() {
  return <DeferredSecret kind="oscilloscope" />;
}
