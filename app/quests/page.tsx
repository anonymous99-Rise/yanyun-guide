import type { Metadata } from "next";
import { Suspense } from "react";
import { QuestBrowser } from "@/components/quest-browser";
import { MAIN_CHAPTERS, listQuests } from "@/lib/content";

export const metadata: Metadata = {
  title: "任务目录",
  description: "燕云十六声主章、残章、奇遇与探游任务目录，含章节区域归属、触发条件与推进路线。",
};

export default function QuestsPage() {
  const entries = listQuests();
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-wide">任务目录</h1>
        <p className="mt-1.5 text-sm leading-7 text-muted">
          主章、残章、奇遇按章节与区域收录，探游收录带路线的分步条目。分步图文以原文链接为准。
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">加载任务目录…</p>}>
        <QuestBrowser entries={entries} chapters={MAIN_CHAPTERS} />
      </Suspense>
    </div>
  );
}
