import dynamic from "next/dynamic";
import { DIAGNOSTICS_ENABLED } from "../lib/diagnostics/config";

const DiagnosticsPanel = dynamic(() => import("./DiagnosticsPanel"), {
  ssr: false,
});

/**
 * Mounts the evidence-only diagnostics panel when the diagnostics render engine
 * is enabled in `lib/diagnostics/config.ts`. When disabled, the panel's chunk
 * is never loaded and nothing renders for visitors.
 */
export default function DeferredDiagnostics() {
  if (!DIAGNOSTICS_ENABLED) return null;
  return <DiagnosticsPanel />;
}
