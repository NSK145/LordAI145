import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-config";

export async function streamChat(body: unknown, onDelta: (acc: string) => void): Promise<string> {
  const res = await authenticatedFetch(`${getApiBaseUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const o = JSON.parse(payload);
        if (o.type === "text-delta" && typeof o.delta === "string") {
          acc += o.delta;
          onDelta(acc);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return acc;
}
