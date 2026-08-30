// A stylized phonetic-drift simulator, not a historical-linguistics model:
// it mimics the *shape* of sound change (Barcino -> Barcelona, Ilerda -> Lleida)
// with a small set of generic rules, so names visibly evolve across eras
// instead of surviving unchanged or being replaced outright.
interface SoundChange {
  pattern: RegExp;
  replace: string;
}

const SOUND_CHANGES: SoundChange[] = [
  { pattern: /um$/i, replace: "" }, // Latin -um loss
  { pattern: /us$/i, replace: "" }, // Latin -us loss
  { pattern: /o$/i, replace: "a" }, // final -o raises to -a
  { pattern: /ph/i, replace: "f" }, // ph simplifies to f
  { pattern: /qu/i, replace: "c" }, // qu simplifies to c
  { pattern: /th/i, replace: "t" }, // th simplifies to t
  { pattern: /c([ei])/i, replace: "s$1" }, // ce/ci lenites to se/si
  { pattern: /t([aeiou])/i, replace: "d$1" }, // intervocalic t lenites to d
  { pattern: /ll/i, replace: "l" }, // geminate simplifies
  { pattern: /nn/i, replace: "n" } // geminate simplifies
];

// Applies one random applicable sound change. Returns the name unchanged if
// none apply, the result would be empty, or the result is identical.
export function mutateName(name: string): string {
  if (!name) return name;

  const applicable = SOUND_CHANGES.filter(change => change.pattern.test(name));
  if (!applicable.length) return name;

  const change = applicable[Math.floor(Math.random() * applicable.length)];
  const mutated = name.replace(change.pattern, change.replace);
  if (!mutated || mutated === name) return name;

  return mutated[0].toUpperCase() + mutated.slice(1);
}
