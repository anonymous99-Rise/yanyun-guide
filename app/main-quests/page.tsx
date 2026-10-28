import type { Metadata } from "next";
import Link from "next/link";
import { MAIN_QUEST_CHAPTERS } from "@/lib/main-quests";

export const metadata: Metadata = {
  title: "主章攻略",
  description: "燕云十六声主章逐节攻略：神仙不渡、天地熔炉、问月长安、金乌衔枝、平澜起风波（江南）五章全节任务目标与步骤。",
};

export default function MainQuestsPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-wide">主章攻略</h1>
        <p className="mt-1.5 text-sm leading-7 text-muted">
          五章主线逐节攻略：每节含任务目标链、流程节点与隐藏成就。章节标题以游戏内显示为准。
        </p>
      </header>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {MAIN_QUEST_CHAPTERS.map((ch) => (
          <li key={ch.key}>
            <Link
              href={`/main-quests/${ch.key}`}
              className="block h-full rounded-lg border border-border bg-surface px-4 py-3.5 transition hover:border-accent/60 hover:bg-surface-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-serif font-semibold">{ch.name}</span>
                <span className="shrink-0 text-xs text-muted">{ch.sectionCount} 节</span>
              </div>
              <p className="mt-1 text-[13px] leading-6 text-muted">
                {ch.sections.map((s) => s.title || `第${s.section}节`).join(" · ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
