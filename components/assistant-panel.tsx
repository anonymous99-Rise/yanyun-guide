"use client";

import { useEffect, useRef, useState } from "react";
import { streamAssistant, type GuideTurn } from "@/lib/assistant-client";

type ChatMessage = GuideTurn & { pending?: boolean; reason?: string };

const STORAGE_KEY = "yy-assistant.v1";
const FOCUS_KEY = "yy-assistant-focus";

const SUGGESTIONS = [
  "心力应该先花在哪？",
  "开封残章有哪些，分别在哪触发？",
  "射覆线索「七夕」的答案是什么？",
  "清河探索怎么规划路线？",
  "万事知「桑间之咏」怎么做？",
];

const FAILURES: Record<string, string> = {
  assistant_not_configured: "助手还未配置模型服务，暂时无法回答。",
  assistant_forbidden: "模型服务鉴权未通过，请联系站点维护者。",
  assistant_unavailable: "模型服务暂时连不上，稍后再试。",
  upstream_unavailable: "模型服务暂时不可用，稍后再试。",
  upstream_rejected: "模型服务拒绝了这次请求，请联系站点维护者。",
  too_many_requests: "提问太频繁了，请稍等一分钟再问。",
  cross_origin: "这个请求不是从本站发出的，已拒绝。",
  unavailable: "助手服务暂时不可用，稍后再试。",
  no_reply: "这一轮没有取回答案，可以再问一次。",
  upstream_error: "上游服务返回失败，稍后再试。",
  stream_ended: "回答中断了，重新提问可继续。",
  stream_interrupted: "连接中断，重新提问可继续。",
  assistant_timeout: "回答超时了，问题可以再具体一些。",
};

export function AssistantPanel({
  focus: focusProp = "",
  focusLabel: focusLabelProp = "",
  onClearFocus,
  seed,
  onSeedUsed,
}: {
  focus?: string;
  focusLabel?: string;
  onClearFocus?: () => void;
  seed?: { question: string } | null;
  onSeedUsed?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"idle" | "initializing" | "running">("idle");
  const [focus, setFocus] = useState(focusProp);
  const [focusLabel, setFocusLabel] = useState(focusLabelProp);
  const restore = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved) as ChatMessage[]);
    } catch {
      /* 本地历史不可读时忽略 */
    }
    // 从其他页面跳转过来时恢复附带的条目资料
    try {
      const raw = sessionStorage.getItem(FOCUS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { context?: string; label?: string };
        if (parsed.context) {
          setFocus(parsed.context);
          setFocusLabel(parsed.label ?? "");
        }
        sessionStorage.removeItem(FOCUS_KEY);
      }
    } catch {
      /* 忽略 */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30).map(({ role, text }) => ({ role, text }))));
    } catch {
      /* 存储满或被禁时忽略 */
    }
  }, [messages]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || phase !== "idle") return;
    const history = messages.filter((message) => !message.pending && message.reason === undefined);
    setMessages((past) => [...past, { role: "user", text: trimmed }, { role: "guide", text: "", pending: true }]);
    setDraft("");
    setPhase("initializing");
    const controller = new AbortController();
    restore.current = controller.abort.bind(controller);
    let streamed = "";
    const patch = (text: string, extra: Partial<ChatMessage> = {}) =>
      setMessages((past) => {
        const next = [...past];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, text, ...extra };
        return next;
      });
    try {
      await streamAssistant(
        { question: trimmed, turns: history.slice(-6), focus: focus || undefined },
        (event) => {
          if ("delta" in event) {
            streamed += event.delta;
            setPhase("running");
            patch(streamed, { pending: true });
          }
          if ("final" in event) patch(event.final, { pending: false });
          if ("state" in event && event.state === "failed") patch(streamed || "", { pending: false, reason: event.reason ?? "unavailable" });
          if ("state" in event && event.state === "running") setPhase("running");
        },
        controller.signal,
      );
      setMessages((past) => {
        const last = past[past.length - 1];
        if (!last?.pending) return past;
        const text = last.text || streamed;
        return [...past.slice(0, -1), { role: "guide", text, pending: false, ...(text ? {} : { reason: "stream_ended" }) }];
      });
    } finally {
      setPhase("idle");
      restore.current = null;
    }
  }

  useEffect(() => {
    if (seed?.question) {
      send(seed.question);
      onSeedUsed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  return (
    <section className="flex h-full min-h-[32rem] flex-col rounded-xl border border-border bg-surface" aria-label="攻略助手">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h2 className="font-serif text-lg font-semibold tracking-wide">攻略助手</h2>
          <p className="text-xs text-muted">按本站收录的攻略与任务资料作答，答不出会直说。</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setFocus("");
              setFocusLabel("");
            }}
            className="text-sm text-muted hover:text-accent"
          >
            清空
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">问一句卡住的地方，或者从下面挑一个：</p>
            <ul className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => send(item)}
                    className="rounded-full border border-border px-3 py-1.5 text-left text-[13px] transition hover:border-accent hover:bg-surface-2"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <li key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-lg bg-accent px-3.5 py-2.5 text-[15px] leading-7 text-accent-foreground"
                      : "max-w-[92%] rounded-lg border border-border bg-background px-3.5 py-2.5"
                  }
                >
                  {message.role === "guide" && (
                    <p className="mb-1 text-[11px] tracking-[0.25em] text-muted">{message.reason ? "未取回答案" : "助手"}</p>
                  )}
                  {message.text ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-7 break-words">{message.text}</p>
                  ) : message.pending ? (
                    <span className="text-sm text-muted">{phase === "initializing" ? "正在聚合站内攻略、wiki 与网络…" : "正在组织答案…"}</span>
                  ) : null}
                  {message.reason && <p className="mt-1 text-xs text-accent">{FAILURES[message.reason] ?? "回答失败，请重试。"}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {focus && (
        <div className="mx-5 mb-2 flex items-center justify-between gap-3 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-xs">
          <span className="truncate">已附上条目：{focusLabel || "（内容）"}</span>
          <button
            type="button"
            onClick={() => {
              setFocus("");
              setFocusLabel("");
              onClearFocus?.();
            }}
            className="shrink-0 text-muted hover:text-foreground"
          >
            移除
          </button>
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-border px-5 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
          rows={2}
          maxLength={1200}
          aria-label="向攻略助手提问"
          placeholder="例如：心力应该先花在哪？"
          className="min-h-16 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex flex-col gap-1.5">
          <button
            type="submit"
            disabled={phase !== "idle" || !draft.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {phase === "idle" ? "提问" : "回答中"}
          </button>
          {phase !== "idle" && (
            <button type="button" onClick={() => restore.current?.()} className="rounded-md border border-border px-4 py-1.5 text-sm text-muted hover:text-foreground">
              停止
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
