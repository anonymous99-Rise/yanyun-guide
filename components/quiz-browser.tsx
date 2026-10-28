"use client";

import { useMemo, useState } from "react";

type ShefuItem = { clue?: string; answer?: string };
type WenjinItem = { q?: string; a?: string };
type Wenjin = { note?: string; location?: string; items?: WenjinItem[] };
type Ship = { name?: string; verdict?: string; marks?: string };
type Rugang = { note?: string; start?: string; days?: { day?: number; ships?: Ship[] }[] };

const TABS = [
  { id: "shefu", label: "射覆" },
  { id: "wenjin", label: "文津馆" },
  { id: "rugang", label: "入港稽查" },
] as const;

export function QuizBrowser({
  shefuClues,
  wenjin,
  rugang,
}: {
  shefuClues: ShefuItem[];
  wenjin: Wenjin;
  rugang: Rugang;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("shefu");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const shefuHits = useMemo(
    () =>
      !needle
        ? shefuClues.slice(0, 60)
        : shefuClues.filter((it) => (it.clue ?? "").toLowerCase().includes(needle) || (it.answer ?? "").toLowerCase().includes(needle)),
    [shefuClues, needle],
  );

  const wenjinHits = useMemo(
    () =>
      !needle
        ? (wenjin.items ?? []).slice(0, 40)
        : (wenjin.items ?? []).filter((it) => (it.q ?? "").toLowerCase().includes(needle) || (it.a ?? "").toLowerCase().includes(needle)),
    [wenjin, needle],
  );

  const rugangDays = useMemo(() => {
    const days = rugang.days ?? [];
    if (!needle) return days;
    return days
      .map((day) => ({
        ...day,
        ships: (day.ships ?? []).filter(
          (ship) => (ship.name ?? "").toLowerCase().includes(needle) || (ship.verdict ?? "").includes(needle) || (ship.marks ?? "").includes(needle),
        ),
      }))
      .filter((day) => (day.ships ?? []).length > 0);
  }, [rugang, needle]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="tablist" aria-label="题库分类">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                tab === t.id ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "shefu" ? "搜线索或答案，如「七夕」" : tab === "wenjin" ? "搜题目关键词" : "搜船名或裁决"}
          aria-label="搜索答案"
          className="ml-auto w-full max-w-60 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
      </div>

      {tab === "shefu" && (
        <section className="flex flex-col gap-2">
          <p className="text-[13px] text-muted">共 {shefuClues.length} 条对照。表格只显示前 60 条，输入关键词缩小范围。</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-left">
                  <th className="px-3.5 py-2 font-medium">线索</th>
                  <th className="px-3.5 py-2 font-medium">答案</th>
                </tr>
              </thead>
              <tbody>
                {shefuHits.map((it, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3.5 py-2">{it.clue}</td>
                    <td className="px-3.5 py-2 font-semibold text-gold">{it.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "wenjin" && (
        <section className="flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-[13px] leading-6">
            {wenjin.location && (
              <p>
                <span className="text-muted">位置：</span>
                {wenjin.location}
              </p>
            )}
            {wenjin.note && <p className="text-muted">{wenjin.note}</p>}
          </div>
          <ul className="grid gap-2 lg:grid-cols-2">
            {wenjinHits.map((it, i) => (
              <li key={i} className="rounded-lg border border-border bg-surface px-3.5 py-3">
                <p className="text-sm leading-6">{it.q}</p>
                <p className="mt-1 text-sm font-semibold text-gold">{it.a}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "rugang" && (
        <section className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-[13px] leading-6">
            {rugang.start && (
              <p>
                <span className="text-muted">起始：</span>
                {rugang.start}
              </p>
            )}
            {rugang.note && <p className="text-muted">{rugang.note}</p>}
          </div>
          {rugangDays.map((day, i) => (
            <div key={i} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold tracking-[0.15em] text-muted">第 {day.day} 天</h2>
              <ul className="grid gap-2 lg:grid-cols-2">
                {(day.ships ?? []).map((ship, j) => (
                  <li key={j} className="rounded-lg border border-border bg-surface px-3.5 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{ship.name}</span>
                      <span className="text-sm font-semibold text-gold">{ship.verdict}</span>
                    </div>
                    {ship.marks && <p className="mt-1 text-[13px] leading-6 text-muted">{ship.marks}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
