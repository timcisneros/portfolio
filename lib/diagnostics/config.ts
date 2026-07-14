/**
 * Hard development switch for the runtime diagnostics panel.
 *
 * false: no diagnostics UI is mounted and its chunk is never loaded; the app
 *   behaves identically to a normal visitor build.
 * true: mount the evidence-only diagnostics panel (copyable runtime bundle) on
 *   every page. This is a development/support tool — keep it false for release.
 */
export const DIAGNOSTICS_ENABLED = false;
