import { afterEach, describe, expect, it, vi } from "vitest";
import { mutateName } from "./toponym-drift";

describe("mutateName", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the name unchanged for empty input", () => {
    expect(mutateName("")).toBe("");
  });

  it("returns the name unchanged when no rule applies", () => {
    expect(mutateName("Xyz")).toBe("Xyz");
  });

  it("drops a final -um and capitalizes the result", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(mutateName("Barcinum")).toBe("Barcin");
  });

  it("picks among only the rules whose pattern actually matches", () => {
    // "Roma" only matches the final -o->-a rule... but it ends in -a already,
    // so no rule applies and the name is returned unchanged.
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(mutateName("Roma")).toBe("Roma");
  });

  it("never returns an empty string even if a rule would produce one", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    // "Us" matches /us$/ -> "" ; mutateName must fall back to the original
    expect(mutateName("Us")).toBe("Us");
  });
});
