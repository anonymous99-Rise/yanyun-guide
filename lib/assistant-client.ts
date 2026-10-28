// 前端助手 SSE 解析。202/200 无终止帧视为未完成。
export type GuideTurn = { role: "user" | "guide"; text: string };
export type AssistantEvent =
  | { state: "initializing" | "running" | "failed"; reason?: string }
  | { delta: string }
  | { final: string };

export async function streamAssistant(
  payload: { question: string; turns: GuideTurn[]; focus?: string },
  emit: (event: AssistantEvent) => void,
  signal: AbortSignal,
) {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok || !response.body) {
    const code = (await response.json().catch(() => null)) as { error?: string } | null;
    emit({ state: "failed", reason: code?.error === "assistant_not_configured" ? "assistant_not_configured" : "unavailable" });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let settled = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = /^event:\s*(.+)$/m.exec(frame)?.[1]?.trim();
        const raw = /^data:\s*(.*)$/m.exec(frame)?.[1] ?? "{}";
        let data: Record<string, string>;
        try {
          data = JSON.parse(raw) as Record<string, string>;
        } catch {
          data = {};
        }
        if (event === "delta" && data.text) emit({ delta: data.text });
        if (event === "final" && data.text) {
          emit({ final: data.text });
          settled = true;
        }
        if (event === "status" && data.state === "failed") {
          emit({ state: "failed", reason: data.reason });
          settled = true;
        }
        if (event === "status" && data.state && data.state !== "failed") emit({ state: data.state as "initializing" | "running" });
        boundary = buffer.indexOf("\n\n");
      }
    }
  } catch {
    if (!signal.aborted) emit({ state: "failed", reason: "stream_interrupted" });
    return;
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (!settled && !signal.aborted) emit({ state: "failed", reason: "stream_ended" });
}
