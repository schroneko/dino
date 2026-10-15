export type Snapshot = Record<string, unknown>;

declare module "claude-code" {
  interface PluginState {
    dino: { isOpen: boolean; snapshot: Snapshot | null };
  }
}
