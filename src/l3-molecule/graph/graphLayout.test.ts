import { describe, expect, it } from "vitest";
import { createDeterministicSeedVector } from "./graphLayout";

describe("createDeterministicSeedVector", () => {
  it("returns stable coordinates for the same node id and index", () => {
    const first = createDeterministicSeedVector("node-a", 0);
    const second = createDeterministicSeedVector("node-a", 0);

    expect(second.toArray()).toEqual(first.toArray());
  });

  it("spreads different nodes to different seed coordinates", () => {
    const first = createDeterministicSeedVector("node-a", 0);
    const second = createDeterministicSeedVector("node-b", 1);

    expect(second.toArray()).not.toEqual(first.toArray());
  });
});
