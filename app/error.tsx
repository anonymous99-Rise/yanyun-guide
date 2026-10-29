"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <h1 className="font-serif text-xl font-semibold tracking-wide">出了点小问题</h1>
      <p className="text-sm leading-7 text-muted">
        页面加载失败了，重试一次；持续失败请稍后再来。
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground transition hover:opacity-90"
      >
        重试
      </button>
    </div>
  );
}
