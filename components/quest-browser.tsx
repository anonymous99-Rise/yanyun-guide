"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { QuestCategory, QuestEntry } from "@/lib/content";

const TABS: { id: QuestCategory; label: string; groupKey: "chapter" | "region" | "sub" }[] = [
  { id: "main", label: "主章", groupKey: "chapter" },
  { id: "remnant", label: "残章", groupKey: "region" },
  { id: "encounter", label: "奇遇", groupKey: "region" },
  { id: "explore", label: "探游", groupKey: "sub" },
];

const VALID_CATEGORIES = new Set(TABS.map((t) => t.id));

export function QuestBrowser({
  entries,
  chapters,
  guideMap,
}: {
  entries: QuestEntry[];
  chapters: string[];
  guideMap: Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const param = searchParams.get("category") as QuestCategory | null;
  const initial: QuestCategory = param && VALID_CATEGORIES.has(param) ? param : "main";
  const [category, setCategory] = useState<QuestCategory>(initial);
  const [query, setQuery] = useState("");

  const activeTab = TABS.find((t) => t.id === category) ?? TABS[0];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        entry.category === category &&
        (!needle ||
          entry.name.toLowerCase().includes(needle) ||
          (entry.region ?? "").includes(needle) ||
          (entry.chapter ?? "").includes(needle) ||
          (entry.sub ?? "").includes(needle) ||
          (entry.note ?? "").includes(needle)),
    );
  }, [entries, category, query]);

  const groups = useMemo(() => {
    const map = new Map<string, QuestEntry[]>();
    for (const entry of filtered) {
      let key: string;
      if (activeTab.groupKey === "chapter") {
        const matched = chapters.find((c) => entry.chapter === c);
        key = matched ?? entry.chapter ?? "未分区";
      } else if (activeTab.groupKey === "sub") {
        key = entry.sub ?? "其他";
      } else {
        key = entry.region ?? "未分区";
      }
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    const ordered = activeTab.groupKey === "chapter" ? chapters.filter((c) => map.has(c)) : [...map.keys()];
    return ordered.map((key) => [key, map.get(key) ?? []] as const);
  }, [filtered, activeTab, chapters]);

  return (
    <div className="flex flex-col gap-4">
      {category === "main" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-[13px]">
          <span>五章主章已收录逐节攻略：任务目标链、流程节点与隐藏成就。</span>
          <Link href="/main-quests" className="shrink-0 font-medium text-accent underline underline-offset-4">
            查看主章攻略 →
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="tablist" aria-label="任务分类">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={category === t.id}
              onClick={() => setCategory(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                category === t.id ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="按名称 / 区域 / 备注…"
          aria-label="筛选任务"
          className="ml-auto w-full max-w-60 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
      </div>

      {groups.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          没有匹配的条目，换个关键词试试。
        </p>
      )}

      {groups.map(([group, items]) => (
        <section key={group} className="flex flex-col gap-2">
          <h2 className="flex items-baseline gap-2 text-sm font-semibold tracking-[0.15em] text-muted">
            {group}
            <span className="text-xs font-normal">{items.length}</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((entry) => (
              <QuestCard key={entry.id} entry={entry} guideSlug={guideMap[entry.name]} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function QuestCard({ entry, guideSlug }: { entry: QuestEntry; guideSlug?: string }) {
  return (
    <li className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium">{entry.name}</span>
        {entry.sub && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">{entry.sub}</span>}
        {entry.time && <span className="text-[11px] text-gold">{entry.time}</span>}
        {guideSlug && (
          <Link
            href={`/quest-guide/${encodeURIComponent(guideSlug)}`}
            className="ml-auto shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent transition hover:bg-accent/20"
          >
            攻略
          </Link>
        )}
      </div>
      {entry.location && <p className="mt-1 text-[13px] leading-6"><span className="text-muted">位置：</span>{entry.location}</p>}
      {entry.route && <p className="mt-1 text-[13px] leading-6"><span className="text-muted">路线：</span>{entry.route}</p>}
      {entry.note && <p className="mt-1 text-[13px] leading-6 text-muted">{entry.note}</p>}
      {entry.caution && <p className="mt-1 text-[13px] leading-6 text-accent">注意：{entry.caution}</p>}
      {entry.hint && <p className="mt-1 text-[13px] leading-6"><span className="text-muted">提示：</span>{entry.hint}</p>}
      {entry.steps && entry.steps.length > 0 && (
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-[13px] leading-6 text-muted">
          {entry.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
    </li>
  );
}
