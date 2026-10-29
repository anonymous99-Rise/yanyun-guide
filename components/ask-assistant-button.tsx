"use client";

// 把当前条目资料存入 sessionStorage 并跳转助手页（助手挂载时恢复为 focus 上下文）
export function AskAssistantButton({
  context,
  label,
  className,
}: {
  context: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          sessionStorage.setItem("yy-assistant-focus", JSON.stringify({ context: context.slice(0, 6000), label }));
        } catch {
          /* storage 不可用时仅跳转 */
        }
        location.href = "/assistant";
      }}
      className={
        className ??
        "rounded-md border border-accent/50 bg-accent/5 px-3.5 py-2 text-sm text-accent transition hover:bg-accent/15"
      }
    >
      问助手
    </button>
  );
}
