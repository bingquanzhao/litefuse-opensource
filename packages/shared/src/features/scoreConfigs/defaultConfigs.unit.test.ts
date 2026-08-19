import { describe, expect, it } from "vitest";
import { ScoreConfigDataType } from "@prisma/client";
import {
  DEFAULT_SCORE_CONFIG_DEFINITIONS,
  getDefaultScoreConfigsForProject,
} from "./defaultConfigs";

describe("getDefaultScoreConfigsForProject", () => {
  it("stamps the projectId onto every default config", () => {
    const configs = getDefaultScoreConfigsForProject("project-xyz");

    expect(configs).toHaveLength(DEFAULT_SCORE_CONFIG_DEFINITIONS.length);
    expect(configs.every((c) => c.projectId === "project-xyz")).toBe(true);
    expect(configs.map((c) => c.name)).toEqual([
      "is_correct",
      "accuracy",
      "relevance",
      "helpfulness",
      "toxicity",
    ]);
  });

  it("uses only score-config data types the schema supports (no TEXT)", () => {
    const configs = getDefaultScoreConfigsForProject("p");
    const allowed = new Set<ScoreConfigDataType>([
      ScoreConfigDataType.BOOLEAN,
      ScoreConfigDataType.NUMERIC,
      ScoreConfigDataType.CATEGORICAL,
    ]);
    expect(configs.every((c) => allowed.has(c.dataType))).toBe(true);
    // is_correct is the boolean gate; numeric configs carry 0..1 bounds.
    const isCorrect = configs.find((c) => c.name === "is_correct");
    expect(isCorrect?.dataType).toBe(ScoreConfigDataType.BOOLEAN);
  });
});
