"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Guide, GuideCategory } from "@/lib/content";

const CATEGORY_TABS: { id: GuideCategory | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "grow", label: "养成避坑" },
  { id: "explore", label: "探索" },
  { id: "quiz", label: "题库解谜" },
  { id: "achieve", label: "成就收集" },
  { id: "season", label: "当期赛季" },
];

export function GuidesBrowser({ guides }: { guides: Guide[] }) {
  const searchParams = useSearchParams();
  const param = searchParams.get("category") as GuideCategory | null;
  const active: GuideCategory | "all" =
    param && CATEGORY_TABS.some((t) => t.id === param) ? param : "all";

  const list = active === "all" ? guides : guides.filter((g) => g.category === active);

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-1.5" aria-label="攻略分类">
        {CATEGORY_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.id === "all" ? "/guides" : `/guides?category=${tab.id}`}
            aria-current={active === tab.id ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-[13px] transition ${
              active === tab.id
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted hover:border-accent/60 hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {list.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}`}
              className="block h-full rounded-lg border border-border bg-surface px-4 py-3.5 transition hover:border-accent/60 hover:bg-surface-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{guide.title}</span>
                {guide.hot && <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent">热门</span>}
              </div>
              <p className="mt-1 text-[13px] leading-6 text-muted">{guide.summary}</p>
              <p className="mt-1.5 text-xs text-muted">
                {guide.categoryLabel} · {guide.version} · 更新 {guide.updatedAt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
