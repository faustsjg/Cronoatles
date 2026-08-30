import { sum } from "d3";
import type { State } from "@/generators/states-generator";
import { minmax, P } from "../utils";

declare global {
  var Eras: ErasModule;
}

export interface Era {
  year: number;
  states: State[];
  cellsState: number[];
}

// Chance that a state survives into the next era, based on its share of the
// total settled area of that era: bigger states are more likely to keep their
// throne, small ones more likely to be swallowed or collapse.
export function survivalChance(stateArea: number, totalArea: number, stateCount: number): number {
  if (totalArea <= 0 || stateCount <= 0) return 0;
  const share = stateArea / totalArea;
  return minmax(share * stateCount * 0.6, 0.05, 0.9);
}

class ErasModule {
  // Generate `eraCount` snapshots of the political layer, `yearsPerEra` years apart.
  // Geography (pack.cells.h/biome/rivers/...) is untouched — only pack.states and
  // pack.cells.state are regenerated each era, inheriting from the previous one.
  generate(eraCount: number, yearsPerEra: number): Era[] {
    if (eraCount < 1) return [];

    const eras: Era[] = [this.snapshot(options.year)];

    for (let n = 1; n < eraCount; n++) {
      options.year += yearsPerEra;
      this.applySuccession();
      window.States.regenerate();
      eras.push(this.snapshot(options.year));
    }

    pack.eras = eras;
    return eras;
  }

  private snapshot(year: number): Era {
    return {
      year,
      states: structuredClone(pack.states),
      cellsState: Array.from(pack.cells.state)
    };
  }

  // Decide, in place, which states survive (lock) into the next era and which
  // small settlements are abandoned. States.regenerate() reads state.lock to
  // preserve locked states untouched and recreate the rest from scratch.
  private applySuccession() {
    const { states, burgs } = pack;
    const validStates = states.filter(s => s.i && !s.removed);
    if (!validStates.length) return;

    const totalArea = sum(validStates.map(s => s.area ?? 0)) || 1;
    for (const state of validStates) {
      state.lock = P(survivalChance(state.area ?? 0, totalArea, validStates.length));
    }

    // small, non-capital settlements have a chance to be abandoned each era;
    // burgs.capital markers are never pruned directly
    for (const burg of burgs) {
      if (!burg.i || burg.removed || burg.capital) continue;
      if ((burg.population ?? 0) < 3 && P(0.15)) burg.removed = true;
    }
  }
}

window.Eras = new ErasModule();
