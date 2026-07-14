import React, { useLayoutEffect, useRef, useState } from "react";
import { compileSurfaceAsset, releaseSurfaceAsset, retainSurfaceAsset, type SurfaceAsset } from "../lib/keycap/surfaceAsset";

type Props = {
  children: string;
  icon?: React.ReactElement<React.SVGProps<SVGSVGElement>>;
};

const LEGEND_EDGE_GUARD = 4;

/**
 * The single visual/typographic source for a physical button. The browser
 * shapes this SVG text for fallback display; the renderer decodes this same
 * SVG subtree as its surface texture. No parallel HTML text run exists.
 */
export default function KeycapLabel({ children, icon }: Props) {
  const rootRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const [asset, setAsset] = useState<SurfaceAsset | null>(null);
  const assetRef = useRef<SurfaceAsset | null>(null);
  const revisionRef = useRef(0);
  const fallbackSize = useRef({
    // foreignObject clips to its viewport. Reserve against the widest button
    // legends up front so font weight and tracking cannot trim edge glyphs.
    width: Math.max(32, Math.ceil(children.length * 8 + (icon ? 28 : 8))),
    height: 18,
    textX: icon ? 25 : 0,
  }).current;
  const [size, setSize] = useState(() => ({ ...fallbackSize }));

  useLayoutEffect(() => {
    let active = true;
    const measure = () => {
      const root = rootRef.current;
      const text = textRef.current;
      const parent = root?.parentElement;
      if (!active || !root || !parent) return;
      const style = getComputedStyle(parent);
      const fontSize = Number.parseFloat(style.fontSize) || 13;
      const gap = Number.parseFloat(style.columnGap || style.gap) || 0;
      const iconSize = icon ? Number.parseFloat(getComputedStyle(root.querySelector("svg") ?? root).width) || 16 : 0;
      const height = Math.max(fontSize * 1.25, iconSize);
      const textX = iconSize ? iconSize + gap : 0;
      const width = Math.max(
        1,
        textX
          + (text?.getComputedTextLength() ?? Math.max(0, (assetRef.current?.width ?? 0) - textX))
          + LEGEND_EDGE_GUARD,
      );
      setSize((current) => current.width === width && current.height === height && current.textX === textX
        ? current
        : { width, height, textX });
      const revision = ++revisionRef.current;
      void compileSurfaceAsset(root, parent, children, Boolean(icon)).then((next) => {
        if (active && revision === revisionRef.current) {
          if (assetRef.current?.key !== next.key) {
            if (assetRef.current) releaseSurfaceAsset(assetRef.current);
            retainSurfaceAsset(next);
          }
          assetRef.current = next;
          setSize({ width: next.width, height: next.height, textX: next.textX });
          setAsset(next);
        }
      }).catch((error) => {
        if (!active || revision !== revisionRef.current) return;
        if (assetRef.current) releaseSurfaceAsset(assetRef.current);
        assetRef.current = null;
        setAsset(null);
        const host = root.closest<HTMLElement>(".btn");
        if (host) {
          host.dataset.keycapTextContract = "unsupported";
          host.dataset.keycapTextIssues = error instanceof Error ? error.message : "Surface asset compilation failed";
        }
      });
    };
    measure();
    void document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    if (rootRef.current?.parentElement) observer.observe(rootRef.current.parentElement);
    const host = rootRef.current?.closest(".btn");
    const mutations = new MutationObserver(measure);
    if (host) mutations.observe(host, { subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    mutations.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    return () => {
      active = false;
      observer.disconnect();
      mutations.disconnect();
      if (assetRef.current) releaseSurfaceAsset(assetRef.current);
      assetRef.current = null;
    };
  }, [children, icon]);

  return <span className="btn-cap" aria-label={children}>
    <svg
      ref={rootRef}
      className="keycap-content-svg keycap-asset-source-svg"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      aria-hidden="true"
    >
      {asset ? <image
        className="keycap-content-image"
        href={asset.url}
        width={asset.width}
        height={asset.height}
        data-keycap-asset-key={asset.key}
        data-keycap-asset-url={asset.url}
        data-keycap-font-fingerprint={asset.fontFingerprint}
        aria-hidden="true"
      /> : null}
      {icon ? React.cloneElement(icon, {
        x: 0,
        y: (size.height - 16) / 2,
        width: 16,
        height: 16,
        "aria-hidden": true,
      }) : null}
      <text ref={textRef} className="keycap-label-text" x={size.textX} y={size.height / 2} dominantBaseline="central">
        {children}
      </text>
    </svg>
    <svg
      className="keycap-fallback-svg"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      role="img"
      aria-label={children}
    >
      <foreignObject width={size.width} height={size.height}>
        <div className="keycap-fallback-content" {...{ xmlns: "http://www.w3.org/1999/xhtml" }}>
          {icon ? React.cloneElement(icon, { "aria-hidden": true }) : null}
          <span>{children}</span>
        </div>
      </foreignObject>
    </svg>
  </span>;
}
