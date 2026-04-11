/**
 * Real-time sync version store.
 * Admin mutations bump the version, clients poll to detect changes.
 * Module-level singleton — persists across API route calls in the same process.
 */

const versions: Record<string, number> = {};

export function bumpVersion(channel: string) {
  versions[channel] = (versions[channel] || 0) + 1;
}

export function getVersion(channel: string): number {
  return versions[channel] || 0;
}

export function initVersion(channel: string, value: number) {
  if (versions[channel] === undefined) {
    versions[channel] = value;
  }
}
