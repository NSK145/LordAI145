import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createOpenRouterProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export { LORD_MODELS, LORD_SYSTEM_PROMPT, type LordMode } from "./lord-config";
