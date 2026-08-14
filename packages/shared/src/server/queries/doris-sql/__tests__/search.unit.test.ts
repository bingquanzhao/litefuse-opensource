import { describe, expect, it } from "vitest";
import { dorisSearchCondition } from "../search";

describe("dorisSearchCondition", () => {
  it("uses MATCH_ALL for observation content search", () => {
    const result = dorisSearchCondition("prompt output", ["content"], {
      type: "observations",
    });

    expect(result.query).toContain("o.input MATCH_ALL {searchPhrase: String}");
    expect(result.query).toContain("o.output MATCH_ALL {searchPhrase: String}");
    expect(result.params).toEqual({
      searchQuery: "%prompt output%",
      searchPhrase: "prompt output",
    });
  });

  it("uses MATCH_ALL for trace content search", () => {
    const result = dorisSearchCondition("prompt output", ["content"], {
      type: "traces",
    });

    expect(result.query).toContain("input MATCH_ALL {searchPhrase: String}");
    expect(result.query).toContain("output MATCH_ALL {searchPhrase: String}");
  });
});
