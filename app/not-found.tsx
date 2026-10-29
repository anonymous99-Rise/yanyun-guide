import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <p className="font-serif text-6xl font-semibold text-border">404</p>
      <h1 className="font-serif text-xl font-semibold tracking-wide">这一页没有收录</h1>
      <p className="text-sm leading-7 text-muted">
        条目可能还没建，或者链接有误。试试站内搜索，或者直接问 AI 助手。
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground transition hover:opacity-90">
          回首页
        </Link>
        <Link href="/search" className="rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground">
          站内搜索
        </Link>
        <Link href="/assistant" className="rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground">
          问助手
        </Link>
      </div>
    </div>
  );
}
