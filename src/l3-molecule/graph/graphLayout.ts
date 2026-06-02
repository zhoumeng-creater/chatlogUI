import * as THREE from "three";

export function createDeterministicSeedVector(id: string, index: number, scale = 5): THREE.Vector3 {
  return new THREE.Vector3(
    seededCoordinate(`${id}:x:${index}`, scale),
    seededCoordinate(`${id}:y:${index}`, scale),
    seededCoordinate(`${id}:z:${index}`, scale),
  );
}

function seededCoordinate(seed: string, scale: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0xffffffff - 0.5) * scale;
}
