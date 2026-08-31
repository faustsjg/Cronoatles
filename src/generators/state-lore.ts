// Validates an AI response before any of it reaches pack.states. The model
// is asked for structured JSON — {"founded": <year>, "description": "..."}
// — never free text executed or trusted as-is: a response with the wrong
// shape or wrong field types is rejected outright (returns null); a value
// that's merely out of range (a founding year in the future, an overlong
// description) is clamped instead of thrown away, same policy as
// terrain-dsl.ts.
export interface StateLore {
  founded: number;
  description: string;
}

const MAX_DESCRIPTION_LENGTH = 300;
const MAX_FOUNDING_SPAN_YEARS = 5000;

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

export function parseStateLore(raw: string, currentYear: number): StateLore | null {
  let parsed: unknown;
  try {
    // some models wrap JSON in markdown fences or add a stray sentence
    // despite being told not to; salvage the first {...} block if so
    const jsonMatch = /\{[\s\S]*\}/.exec(raw);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const { founded, description } = parsed as Record<string, unknown>;

  if (typeof founded !== "number" || !Number.isFinite(founded)) return null;
  if (typeof description !== "string") return null;

  const cleanDescription = stripHtml(description).trim();
  if (!cleanDescription) return null;

  const clampedFounded = Math.round(Math.min(Math.max(founded, currentYear - MAX_FOUNDING_SPAN_YEARS), currentYear));
  const clampedDescription =
    cleanDescription.length > MAX_DESCRIPTION_LENGTH
      ? `${cleanDescription.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
      : cleanDescription;

  return { founded: clampedFounded, description: clampedDescription };
}

export function buildLorePrompt(stateName: string, cultureName: string, currentYear: number): string {
  return `You are writing structured lore data for a fantasy map generator, not prose meant to be read directly.

Respond with ONLY a single JSON object, nothing else — no markdown fences, no explanation:
{"founded": <year, an integer no later than ${currentYear}>, "description": "<one or two sentences, plain text, no HTML>"}

The state is called "${stateName}", its people are of ${cultureName} culture, and the current year is ${currentYear}. Invent a short founding story consistent with those facts.`;
}
