import dynamic from "next/dynamic";
import { KEYCAP_RENDER_ENGINE_ENABLED } from "../lib/keycap/config";

const KeycapEngineSurface = dynamic(() => import("./KeycapEngineSurface"), {
  ssr: false,
});

/**
 * Zero-runtime anchor in SVG mode. Enabling the development renderer swaps in
 * the observer/atlas registration component without changing button markup.
 */
export default function KeycapSurface() {
  return KEYCAP_RENDER_ENGINE_ENABLED ? <KeycapEngineSurface /> : null;
}
