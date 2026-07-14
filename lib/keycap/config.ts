/**
 * Hard development switch for the physical keycap renderer.
 *
 * false: use the embedded SVG keycaps only; WebGPU/software never initializes.
 * true: enable the in-development compositor and its SVG-to-renderer handoff.
 */
export const KEYCAP_RENDER_ENGINE_ENABLED = false;
