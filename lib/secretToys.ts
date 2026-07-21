export type SecretToyKind = "car" | "radio" | "launchpad" | "oscilloscope";

/**
 * Hard availability switch for interactive toys. Disabled toys are omitted at
 * the shared render boundary, so their observers, runtime code, and media do
 * not initialize.
 */
export const SECRET_TOY_ENABLED = {
  car: true,
  radio: false,
  launchpad: false,
  oscilloscope: false,
} as const satisfies Record<SecretToyKind, boolean>;

export function isSecretToyEnabled(kind: SecretToyKind): boolean {
  return SECRET_TOY_ENABLED[kind];
}
