import type { Metadata } from "next";
import { Suspense } from "react";
import { GuidesBrowser } from "@/components/guides-browser";
import { listGuides } from "@/lib/content";

export const metadata: Metadata = {
  title: "全部攻略",
  description: "燕云十六声全部攻略：新手开荒、养成避坑、装备调律、副本机制、成就收集、赛季追赶。",
};

export default function GuidesPage() {
  const guides = listGuides();
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-wide">全篇攻略</h1>
        <p className="mt-1.5 text-sm leading-7 text-muted">
          养成、探索、题库、成就与赛季的成篇攻略，共 {guides.length} 篇。
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">加载分类…</p>}>
        <GuidesBrowser guides={guides} />
      </Suspense>
    </div>
  );
}
