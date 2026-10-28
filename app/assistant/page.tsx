import type { Metadata } from "next";
import { AssistantPanel } from "@/components/assistant-panel";
import { siteStats } from "@/lib/knowledge";

export const metadata: Metadata = {
  title: "AI 攻略助手",
  description: "基于站内攻略与任务数据的燕云十六声 AI 攻略助手，答不出会直说。",
};

export default function AssistantPage() {
  const stats = siteStats();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-wide">AI 攻略助手</h1>
        <p className="mt-1.5 text-sm leading-7 text-muted">
          每次提问会先检索站内 {stats.guides} 篇攻略和 {stats.quests} 条任务资料，再回答。资料里没有的细节会明说未收录。
        </p>
      </header>
      <AssistantPanel />
    </div>
  );
}
