import { z } from "zod";

export type ModelRegistryEntry = {
  id: string; // actual OpenRouter model ID
  label: string;
  provider: string;
  description?: string;
};

// Single source of truth for all selectable models.
// Update/add models only here.
export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  {
    id: "openai/gpt-5",
    label: "GPT-5",
    provider: "Openrouter",
  },
  {
    id: "openai/gpt-4.1",
    label: "GPT-4.1",
    provider: "Openrouter",
  },
  {
    id: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    provider: "Openrouter",
  },
  {
    id: "anthropic/claude-opus-4",
    label: "Claude Opus 4",
    provider: "Openrouter",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "Openrouter",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "Openrouter",
  },
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    provider: "Openrouter",
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    provider: "Openrouter",
  },
  {
    id: "qwen/qwen3-coder",
    label: "Qwen3 Coder",
    provider: "Openrouter",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    provider: "Openrouter",
  },
];

// If the primary choice becomes unavailable, server falls back to the default.
export const DEFAULT_MODEL_ID: string = MODEL_REGISTRY[0]?.id ?? "";

const ModelIdSchema = z.string().min(1);

export function validateModelId(
  modelId: unknown,
): { valid: true; modelId: string } | { valid: false; modelId: string; reason: string } {
  const fallback = DEFAULT_MODEL_ID;

  const parsed = ModelIdSchema.safeParse(modelId);
  if (!parsed.success) {
    return { valid: false, modelId: fallback, reason: "missing_or_not_string" };
  }

  const knownIds = new Set(MODEL_REGISTRY.map((m) => m.id));
  if (knownIds.has(parsed.data)) {
    return { valid: true, modelId: parsed.data };
  }

  return { valid: false, modelId: fallback, reason: "unknown_model_id" };
}
