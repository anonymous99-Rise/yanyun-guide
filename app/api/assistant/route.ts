// AI 攻略助手：SSE 流式投影（delta / final / status 帧）。
// 上游是用户自备的 Claude 兼容网关，密钥只在服务端。检索上下文在 lib/knowledge。
import { buildSystemPrompt, retrieveContext } from "@/lib/knowledge";

export const maxDuration = 60;

const DEFAULT_MODEL = "claude-haiku-4-5";
// [1M] 等方括号后缀是 Claude Code 客户端侧的上下文标记，直连 API 不识别（本地 dev 会继承 CC 的环境变量）
function resolveModel(raw: string | undefined): string {
  const cleaned = (raw ?? "").replace(/\[[^\]]+\]$/i, "").trim();
  return cleaned || DEFAULT_MODEL;
}
const TOTAL_BUDGET_MS = 55_000;
const MAX_ANSWER_CHARS = 20_000;
const MAX_TOKENS = 1400;
const REQUESTS_PER_WINDOW = 12;
const WINDOW_MS = 60_000;

// 实例级频次抑制：只防手抖连点，防不了脚本。公网防护靠 Vercel Firewall。
const recent = new Map<string, number[]>();

function withinLimit(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (hits.length >= REQUESTS_PER_WINDOW) return false;
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear();
  return true;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

type Turn = { role?: string; text?: string };

function buildPrompt(question: string, focus: string, turns: Turn[]) {
  const history = turns
    .filter((turn) => (turn.role === "user" || turn.role === "guide") && typeof turn.text === "string" && turn.text)
    .slice(-6)
    .map((turn) => `${turn.role === "user" ? "玩家" : "助手"}：${String(turn.text).replace(/\s+/g, " ").slice(0, 600)}`)
    .join("\n");
  const context = focus.replace(/[\u0000-\u001f]/g, " ").slice(0, 6000);
  return [context ? `【用户附带的条目资料】\n${context}\n` : "", history ? `【本次对话前文】\n${history}\n` : "", `【玩家提问】\n${question}`]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }

  const base = (process.env.ANTHROPIC_BASE_URL ?? "").replace(/\/+$/, "");
  const token = process.env.ANTHROPIC_AUTH_TOKEN ?? "";
  if (!base || !token) return Response.json({ ok: false, error: "assistant_not_configured" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ ok: false, error: "cross_origin" }, { status: 403 });
  if (!withinLimit(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local")) {
    return Response.json({ ok: false, error: "too_many_requests" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { question?: unknown; turns?: unknown; focus?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.replace(/\u0000/g, "").trim() : "";
  if (question.length < 2 || question.length > 1200) return Response.json({ ok: false, error: "invalid_question" }, { status: 400 });
  const turns = Array.isArray(body?.turns) ? (body.turns as Turn[]).slice(0, 6) : [];
  const focus = typeof body?.focus === "string" ? body.focus : "";
  if (focus.length > 12000) return Response.json({ ok: false, error: "context_too_large" }, { status: 413 });

  const controller = new AbortController();
  const budget = setTimeout(() => controller.abort(), TOTAL_BUDGET_MS);

  const [systemPrompt, gathered] = await Promise.all([buildSystemPrompt(), retrieveContext(question, focus)]);
  const prompt = buildPrompt(question, gathered.context, turns);
  // 官方 web_search 服务端工具：网关透传 Anthropic 时即可用；不支持则降级重发无工具请求
  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }];

  const encoder = new TextEncoder();
  const sse = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(sink) {
      const send = (event: string, data: unknown) => {
        try {
          sink.enqueue(sse(event, data));
        } catch {
          controller.abort();
        }
      };
      send("status", { state: "initializing" });
      let answer = "";
      let settled = false;
      const callUpstream = (withTools: boolean) =>
        fetch(`${base}/v1/messages`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${token}`,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: resolveModel(process.env.ANTHROPIC_MODEL),
            max_tokens: MAX_TOKENS,
            stream: true,
            thinking: { type: "disabled" },
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
            ...(withTools ? { tools } : {}),
          }),
        });
      try {
        let upstream = await callUpstream(true);
        if (!upstream.ok) {
          // 工具不被网关/上游支持时，降级为无工具请求（网络信息已由 DDG 注入上下文）
          upstream = await callUpstream(false);
        }
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error(`[assistant] upstream ${upstream.status} model=${process.env.ANTHROPIC_MODEL || "(default)"} detail=${detail.slice(0, 300)}`);
          const code = /model|unauthorized|forbidden/i.test(detail) ? "upstream_rejected" : "upstream_unavailable";
          send("status", { state: "failed", reason: upstream.status === 401 || upstream.status === 403 ? "assistant_forbidden" : code });
          settled = true;
          return;
        }
        send("status", { state: "running" });

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let cut = buffer.indexOf("\n\n");
          while (cut >= 0) {
            const frame = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            cut = buffer.indexOf("\n\n");
            const raw = frame.split("\n").find((line) => line.startsWith("data:"));
            if (!raw) continue;
            let payload: { type?: string; delta?: { type?: string; text?: string } };
            try {
              payload = JSON.parse(raw.slice(5).trim());
            } catch {
              continue;
            }
            if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta" && payload.delta.text) {
              const slice = payload.delta.text;
              if (answer.length < MAX_ANSWER_CHARS) {
                answer += slice;
                send("delta", { text: slice });
              }
              continue;
            }
            if (payload.type === "error") {
              send("status", { state: "failed", reason: "upstream_error" });
              settled = true;
            }
            if (payload.type === "message_stop") {
              if (answer) send("final", { text: answer, state: "completed" });
              else send("status", { state: "failed", reason: "no_reply" });
              settled = true;
            }
          }
        }
        if (!settled) send("status", { state: "failed", reason: answer ? "stream_ended" : "no_reply" });
      } catch {
        if (controller.signal.aborted) send("status", { state: "failed", reason: "assistant_timeout" });
        else send("status", { state: "failed", reason: "assistant_unavailable" });
      } finally {
        clearTimeout(budget);
        try {
          sink.close();
        } catch {
          /* 已中止 */
        }
      }
    },
    cancel() {
      clearTimeout(budget);
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
