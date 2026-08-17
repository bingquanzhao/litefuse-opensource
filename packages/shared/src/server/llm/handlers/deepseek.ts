import {
  type OpenAICompatibleProviderHandler,
  getHostname,
  normalizeProviderName,
  processOpenAICompatibleBaseURL,
} from "./shared";

function matchesDeepSeekProvider(params: {
  provider?: string;
  baseURL?: string | null;
}): boolean {
  return (
    normalizeProviderName(params.provider) === "deepseek" ||
    getHostname(params.baseURL) === "api.deepseek.com"
  );
}

export const deepSeekOpenAICompatibleProviderHandler: OpenAICompatibleProviderHandler =
  {
    id: "deepseek-openai",
    matches: matchesDeepSeekProvider,
    buildConfig: ({
      baseURL,
      modelName,
      providerOptions,
      hasStructuredOutput,
    }) => ({
      baseURL: processOpenAICompatibleBaseURL({
        url: baseURL,
        modelName,
      }),
      modelKwargs: hasStructuredOutput
        ? {
            ...(providerOptions ?? {}),
            thinking: { type: "disabled" },
          }
        : providerOptions,
      structuredOutput: hasStructuredOutput
        ? { method: "jsonMode" }
        : undefined,
      structuredOutputInstruction: hasStructuredOutput
        ? "Return a valid JSON object that satisfies the requested schema."
        : undefined,
    }),
  };
