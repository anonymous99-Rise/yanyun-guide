import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { searchContent } from "@/lib/content";
import { loadSearchCorpus, searchHuijiPages } from "@/lib/queries";
import { keywordsFromQuestion } from "@/lib/knowledge";
import { wikiHref } from "@/lib/site-meta";

export const metadata: Metadata = {
  title: "搜索",
  description: "全站搜索攻略、任务与答案。",
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-wide">搜索</h1>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">搜索中…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const [hits, wikiHits] = query
    ? await Promise.all([searchContent(query, await loadSearchCorpus(), 30), searchHuijiPages(keywordsFromQuestion(query, 6), 8)])
    : [[], []] as const;
  const guideHits = hits.filter((h) => h.kind === "guide");
  const questHits = hits.filter((h) => h.kind === "quest");
  const sectionHits = hits.filter((h) => h.kind === "section");
  const questGuideHits = hits.filter((h) => h.kind === "questGuide");

  return (
    <div className="flex flex-col gap-6">
      {query && (
        <p className="text-sm text-muted">
          「{query}」命中 {hits.length} 条
        </p>
      )}

      {!query && (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          在上方搜索框输入关键词，比如「心力」「州桥」「射覆」。
        </p>
      )}

      {query && hits.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          没有匹配内容。试试更短的关键词，或者去问 AI 助手。
        </p>
      )}

      {guideHits.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs tracking-[0.25em] text-muted">攻略 ({guideHits.length})</h2>
          <ul className="grid gap-2">
            {guideHits.map(
              (hit) =>
                hit.guide && (
                  <li key={hit.guide.slug}>
                    <Link
                      href={`/guides/${hit.guide.slug}`}
                      className="block rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-accent/60"
                    >
                      <span className="font-medium">{hit.guide.title}</span>
                      <span className="ml-2 text-xs text-muted">{hit.guide.categoryLabel}</span>
                      <p className="mt-0.5 text-[13px] leading-6 text-muted">{hit.guide.summary}</p>
                    </Link>
                  </li>
                ),
            )}
          </ul>
        </section>
      )}

      {sectionHits.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs tracking-[0.25em] text-muted">主章 ({sectionHits.length})</h2>
          <ul className="grid gap-2">
            {sectionHits.map(
              (hit) =>
                hit.section && (
                  <li key={hit.section.slug}>
                    <Link
                      href={`/main-quests/${hit.section.chapter}#sec-${hit.section.slug.split("/")[1] ?? ""}`}
                      className="block rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-accent/60"
                    >
                      <span className="font-medium">{hit.section.title}</span>
                      <span className="ml-2 text-xs text-muted">{hit.section.chapterName}</span>
                      {(hit.section.intro || hit.section.goals[0]) && (
                        <p className="mt-0.5 text-[13px] leading-6 text-muted">{hit.section.intro || hit.section.goals[0]}</p>
                      )}
                    </Link>
                  </li>
                ),
            )}
          </ul>
        </section>
      )}

      {questGuideHits.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs tracking-[0.25em] text-muted">奇遇 / 万事知 ({questGuideHits.length})</h2>
          <ul className="grid gap-2">
            {questGuideHits.map(
              (hit) =>
                hit.questGuide && (
                  <li key={hit.questGuide.name}>
                    <Link
                      href={`/quest-guide/${encodeURIComponent(hit.questGuide.name)}`}
                      className="block rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-accent/60"
                    >
                      <span className="font-medium">{hit.questGuide.name}</span>
                      <span className="ml-2 text-xs text-muted">{hit.questGuide.category === "wanshizhi" ? "万事知" : "奇遇"}</span>
                      {(hit.questGuide.intro || hit.questGuide.highlights[0]) && (
                        <p className="mt-0.5 text-[13px] leading-6 text-muted">{hit.questGuide.intro || hit.questGuide.highlights[0]}</p>
                      )}
                    </Link>
                  </li>
                ),
            )}
          </ul>
        </section>
      )}

      {wikiHits.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs tracking-[0.25em] text-muted">燕云wiki ({wikiHits.length})</h2>
          <ul className="grid gap-2">
            {wikiHits.map((w) => (
              <li key={w.title}>
                <Link
                  href={wikiHref(w.title)}
                  className="block rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-accent/60"
                >
                  <span className="font-medium">{w.title}</span>
                  <p className="mt-0.5 text-[13px] leading-6 text-muted">{w.snippet.slice(0, 120)}…</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {questHits.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs tracking-[0.25em] text-muted">任务 ({questHits.length})</h2>
          <ul className="grid gap-2">
            {questHits.map(
              (hit) =>
                hit.quest && (
                  <li key={hit.quest.id} className="rounded-lg border border-border bg-surface px-4 py-3">
                    <span className="font-medium">{hit.quest.name}</span>
                    <span className="ml-2 text-xs text-muted">
                      {hit.quest.region ?? ""}
                      {hit.quest.chapter ? ` · ${hit.quest.chapter}` : ""}
                    </span>
                    {(hit.quest.route || hit.quest.note) && (
                      <p className="mt-0.5 text-[13px] leading-6 text-muted">{hit.quest.route ?? hit.quest.note}</p>
                    )}
                  </li>
                ),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
