import Link from "next/link";
import { DATA_AS_OF } from "@/lib/site-meta";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs leading-6 text-muted sm:px-6">
        <p>
          燕云攻略 — 非官方攻略站。内容条目截至 {DATA_AS_OF}，以游戏内实际显示为准；分步流程随版本改动，发现偏差欢迎指正。
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/guides" className="hover:text-foreground">全部攻略</Link>
          <Link href="/quests" className="hover:text-foreground">任务目录</Link>
          <Link href="/explore" className="hover:text-foreground">探游清单</Link>
          <Link href="/quiz" className="hover:text-foreground">题库答案</Link>
          <Link href="/assistant" className="hover:text-foreground">AI 助手</Link>
        </p>
      </div>
    </footer>
  );
}
