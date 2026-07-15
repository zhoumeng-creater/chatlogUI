import type { SearchHit } from "@/l2-coordinator/api-docs/search";

export type SearchHitIdentity = `search-hit-${string}`;

type SearchHitIdentitySource = Pick<SearchHit, "conversationId" | "messageId" | "seq">;

/**
 * Produces the opaque, stable identity used for one search hit across result
 * windows, presentation state, navigation state, and React keys. Source IDs
 * never appear in the returned value.
 */
export function createSearchHitIdentity(hit: SearchHitIdentitySource): SearchHitIdentity {
  const canonical = [hit.conversationId, hit.messageId, String(hit.seq)]
    .map((part) => `${part.length}:${part}`)
    .join("|");
  return `search-hit-${HASH_SEEDS.map((seed) => hashLane(canonical, seed)).join("")}`;
}

const HASH_SEEDS = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35] as const;

function hashLane(value: string, seed: number): string {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    hash ^= codeUnit & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= codeUnit >>> 8;
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= value.length;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0).toString(16).padStart(8, "0");
}
