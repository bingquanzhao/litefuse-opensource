import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchLLMCompletion } = vi.hoisted(() => ({
  fetchLLMCompletion: vi.fn(),
}));

vi.mock("../fetchLLMCompletion", () => ({ fetchLLMCompletion }));

import { testModelCall } from "../testModelCall";
import { LLMAdapter } from "../types";

describe("testModelCall", () => {
  beforeEach(() => {
    fetchLLMCompletion.mockReset();
    fetchLLMCompletion.mockResolvedValue({
      score: 5,
      reasoning: "Matched all passing criteria.",
    });
  });

  it("accepts numeric scores returned by a model", async () => {
    await testModelCall({
      provider: "deepseek",
      model: "deepseek-v4-pro",
      apiKey: {
        id: "key-id",
        projectId: "project-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        adapter: LLMAdapter.OpenAI,
        provider: "deepseek",
        displaySecretKey: "sk-...",
        secretKey: "encrypted-key",
        extraHeaders: null,
        extraHeaderKeys: [],
        baseURL: "https://api.deepseek.com/v1",
        customModels: ["deepseek-v4-pro"],
        withDefaultModels: false,
        config: null,
      },
    });

    const request = fetchLLMCompletion.mock.calls[0]?.[0];
    const parsed = request?.structuredOutputSchema.parse({
      score: 5,
      reasoning: "Matched all passing criteria.",
    });

    expect(parsed).toEqual({
      score: 5,
      reasoning: "Matched all passing criteria.",
    });
  });
});
