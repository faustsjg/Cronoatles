import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { survivalChance } from "./eras-generator";

describe("survivalChance", () => {
  it("gives the dominant state in a two-state world a high but capped chance", () => {
    expect(survivalChance(90, 100, 2)).toBe(0.9);
  });

  it("gives a tiny state a low but non-zero chance, never below the floor", () => {
    // share 0.001, count 5 -> 0.001 * 5 * 0.6 = 0.003, clamped up to the 0.05 floor
    expect(survivalChance(1, 1000, 5)).toBe(0.05);
  });

  it("scales with relative share for a mid-size state", () => {
    // share 0.25, count 4 -> 0.25 * 4 * 0.6 = 0.6
    expect(survivalChance(25, 100, 4)).toBeCloseTo(0.6, 5);
  });

  it("returns 0 when there is no settled area or no states", () => {
    expect(survivalChance(0, 0, 4)).toBe(0);
    expect(survivalChance(10, 100, 0)).toBe(0);
  });
});

describe("ErasModule.generate", () => {
  let ErasModule: any;
  let regenerate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    // P() delegates to Math.random() internally (it's a real import, not a
    // stubbable global) — forcing random() to 0 makes every P(probability > 0)
    // call deterministically true, since survivalChance never returns exactly 0.
    vi.spyOn(Math, "random").mockReturnValue(0);

    globalThis.window = globalThis.window || ({} as any);
    regenerate = vi.fn();
    globalThis.window.States = { regenerate } as any;

    globalThis.options = { year: 1000 } as any;
    globalThis.pack = {
      states: [
        { i: 0, name: "Neutrals" },
        { i: 1, name: "Big", area: 90, culture: 0 },
        { i: 2, name: "Small", area: 10, culture: 0 }
      ],
      burgs: [{ i: 0 }, { i: 1, capital: 1, population: 20 }, { i: 2, capital: 0, population: 1 }],
      cells: { state: [0, 1, 1, 2] }
    } as any;

    await import("./eras-generator");
    ErasModule = (globalThis as any).window.Eras;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns nothing and leaves options.year untouched for eraCount < 1", () => {
    const eras = ErasModule.generate(0, 100);
    expect(eras).toEqual([]);
    expect(regenerate).not.toHaveBeenCalled();
    expect(globalThis.options.year).toBe(1000);
  });

  it("takes an immediate snapshot for a single era without calling regenerate", () => {
    const eras = ErasModule.generate(1, 100);
    expect(eras).toHaveLength(1);
    expect(eras[0].year).toBe(1000);
    expect(eras[0].cellsState).toEqual([0, 1, 1, 2]);
    expect(regenerate).not.toHaveBeenCalled();
    expect(globalThis.pack.eras).toBe(eras);
  });

  it("advances the year and calls States.regenerate once per extra era", () => {
    const eras = ErasModule.generate(3, 50);
    expect(eras.map((e: any) => e.year)).toEqual([1000, 1050, 1100]);
    expect(regenerate).toHaveBeenCalledTimes(2);
  });

  it("locks every state when P() always succeeds, so all survive into the next era", () => {
    ErasModule.generate(2, 100);
    // both non-neutral states get evaluated for survival; with P() forced true both are locked
    expect(globalThis.pack.states[1].lock).toBe(true);
    expect(globalThis.pack.states[2].lock).toBe(true);
    // neutral state (i: 0) is never touched
    expect(globalThis.pack.states[0].lock).toBeUndefined();
  });

  it("never removes a capital burg regardless of population", () => {
    ErasModule.generate(2, 100);
    const capital = globalThis.pack.burgs.find((b: any) => b.capital);
    expect(capital?.removed).toBeUndefined();
  });
});
