import { describe, expect, it } from "vitest";
import { buildLorePrompt, parseStateLore } from "./state-lore";

const CURRENT_YEAR = 1200;

describe("parseStateLore", () => {
  it("accepts a well-formed JSON response", () => {
    const raw = '{"founded": 1050, "description": "Founded by river traders fleeing the old empire."}';
    expect(parseStateLore(raw, CURRENT_YEAR)).toEqual({
      founded: 1050,
      description: "Founded by river traders fleeing the old empire."
    });
  });

  it("salvages JSON wrapped in markdown fences or a stray sentence", () => {
    const raw = 'Sure! Here you go:\n```json\n{"founded": 900, "description": "A frontier fort turned capital."}\n```';
    expect(parseStateLore(raw, CURRENT_YEAR)).toEqual({
      founded: 900,
      description: "A frontier fort turned capital."
    });
  });

  it("rejects garbage that isn't JSON at all", () => {
    expect(parseStateLore("this is not JSON in any way", CURRENT_YEAR)).toBeNull();
  });

  it("rejects a JSON array instead of an object", () => {
    expect(parseStateLore("[1, 2, 3]", CURRENT_YEAR)).toBeNull();
  });

  it("rejects a response missing founded", () => {
    expect(parseStateLore('{"description": "Something happened."}', CURRENT_YEAR)).toBeNull();
  });

  it("rejects founded when it isn't a number", () => {
    expect(parseStateLore('{"founded": "long ago", "description": "Something happened."}', CURRENT_YEAR)).toBeNull();
  });

  it("rejects a response missing description", () => {
    expect(parseStateLore('{"founded": 1000}', CURRENT_YEAR)).toBeNull();
  });

  it("rejects a description that's empty after trimming", () => {
    expect(parseStateLore('{"founded": 1000, "description": "   "}', CURRENT_YEAR)).toBeNull();
  });

  it("clamps a founding year in the future down to the current year", () => {
    const result = parseStateLore('{"founded": 9999, "description": "A prophecy, apparently."}', CURRENT_YEAR);
    expect(result?.founded).toBe(CURRENT_YEAR);
  });

  it("clamps an absurdly ancient founding year", () => {
    const result = parseStateLore('{"founded": -999999, "description": "Older than time."}', CURRENT_YEAR);
    expect(result?.founded).toBe(CURRENT_YEAR - 5000);
  });

  it("strips HTML tags out of the description", () => {
    const result = parseStateLore(
      '{"founded": 1000, "description": "<b>Bold</b> claim, <script>evil()</script>"}',
      CURRENT_YEAR
    );
    expect(result?.description).toBe("Bold claim, evil()");
  });

  it("truncates an overlong description", () => {
    const longText = "a".repeat(400);
    const result = parseStateLore(`{"founded": 1000, "description": "${longText}"}`, CURRENT_YEAR);
    expect(result?.description).toHaveLength(300);
    expect(result?.description.endsWith("…")).toBe(true);
  });

  it("ignores unexpected extra fields", () => {
    const raw = '{"founded": 1000, "description": "Fine.", "vigor": 99, "aggressiveness": "high"}';
    expect(parseStateLore(raw, CURRENT_YEAR)).toEqual({ founded: 1000, description: "Fine." });
  });

  it("rounds a non-integer founding year", () => {
    const result = parseStateLore('{"founded": 1000.6, "description": "Fine."}', CURRENT_YEAR);
    expect(result?.founded).toBe(1001);
  });
});

describe("buildLorePrompt", () => {
  it("embeds the state name, culture, and current year", () => {
    const prompt = buildLorePrompt("Aldoria", "Highland", 1200);
    expect(prompt).toContain("Aldoria");
    expect(prompt).toContain("Highland");
    expect(prompt).toContain("1200");
    expect(prompt).toContain("ONLY a single JSON object");
  });
});
