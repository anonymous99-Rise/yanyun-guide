"use client";

import { useCallback, useEffect, useState } from "react";

type TreeLeaf = { id: number; name: string; contentId: string; leaf: boolean; count: number };
type SearchHit = { id: number; name: string; path: string[]; contentId: string };
type Article = {
  title: string;
  updatedAt: number;
  summary: string;
  outline: { l: number; x: string }[];
  source: string;
};

// GameKee 资料库顶部分类（树节点 id 实测有效）
const GROUPS = [
  { id: 171297, name: "世界探索", note: "区域全收集 · 武林录 · 镇守 · 野外首领" },
  { id: 200265, name: "万事知", note: "各地风土小任务，常有双结局" },
  { id: 199690, name: "见闻", note: "与 NPC 交谈收集的地区见闻" },
  { id: 200396, name: "不平事", note: "路见不平的微型行侠任务" },
  { id: 200548, name: "众生录", note: "众生相图鉴收集" },
  { id: 199829, name: "前尘旧物", note: "旧物与往事残页" },
  { id: 200545, name: "别录", note: "乡邑录 · 往来书 · 杂闻录 · 江湖录" },
];

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`/api/wiki?${path}`);
  const body = (await res.json().catch(() => null)) as { ok: boolean } & T | null;
  if (!body || body.ok !== true) throw new Error("wiki_unavailable");
  return body;
}

export function WikiBrowser() {
  const [crumbs, setCrumbs] = useState<{ pid: number; name: string }[]>([]);
  const [nodes, setNodes] = useState<TreeLeaf[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [article, setArticle] = useState<{ name: string; data: Article } | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);

  const current = crumbs[crumbs.length - 1];

  const loadTree = useCallback((pid: number) => {
    setLoading(true);
    setError("");
    api<{ path: string[]; groups: TreeLeaf[] }>(`route=tree&pid=${pid}`)
      .then((result) => setNodes(result.groups.filter((node) => node.name)))
      .catch(() => setError("资料库暂时连不上，稍后再试。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (current) loadTree(current.pid);
    else setNodes([]);
  }, [current, loadTree]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setHits(null);
      return;
    }
    const timer = setTimeout(() => {
      api<{ matches: SearchHit[] }>(`route=search&q=${encodeURIComponent(trimmed)}&pid=${current?.pid ?? 0}`)
        .then((result) => setHits(result.matches))
        .catch(() => setHits([]));
    }, 320);
    return () => clearTimeout(timer);
  }, [query, current]);

  const openArticle = useCallback((contentId: string, name: string) => {
    setArticle({ name, data: { title: name, updatedAt: 0, summary: "", outline: [], source: "" } });
    setArticleLoading(true);
    api<{ article: Article }>(`route=article&id=${encodeURIComponent(contentId)}`)
      .then((result) => setArticle({ name, data: result.article }))
      .catch(() => setArticle(null))
      .finally(() => setArticleLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-base font-semibold tracking-wide">资料库检索</h2>
        <span className="text-xs text-muted">实时读取社区资料库，只给目录与摘要，完整步骤看原文</span>
      </div>

      {crumbs.length === 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => setCrumbs([{ pid: group.id, name: group.name }])}
                className="h-full w-full rounded-lg border border-border bg-background px-3.5 py-3 text-left transition hover:border-moss hover:bg-surface-2"
              >
                <span className="text-sm font-medium">{group.name}</span>
                <p className="mt-0.5 text-xs leading-5 text-muted">{group.note}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCrumbs([])}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition hover:text-foreground"
            >
              换个分类
            </button>
            <span className="text-sm text-muted">
              {crumbs.map((c) => c.name).join(" / ")}
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`在「${current?.name}」内检索条目`}
              aria-label="检索资料库条目"
              className="ml-auto w-full max-w-56 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
          </div>

          {error && <p className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm">{error}</p>}
          {loading && <p className="text-sm text-muted">加载中…</p>}

          {!loading && !error && hits && (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {hits.length === 0 && <li className="text-sm text-muted">没有匹配条目。</li>}
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => openArticle(hit.contentId, hit.name)}
                    className="h-full w-full rounded-lg border border-border bg-background px-3 py-2.5 text-left transition hover:border-gold"
                  >
                    <span className="block text-sm">{hit.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{hit.path.slice(0, 3).join(" › ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && !error && !hits && (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {nodes.map((node) =>
                node.count > 0 ? (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => setCrumbs((past) => [...past, { pid: node.id, name: node.name }])}
                      className="flex h-full w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition hover:border-moss"
                    >
                      <span className="text-sm">{node.name}</span>
                      <span className="shrink-0 text-xs text-muted">{node.count} 项</span>
                    </button>
                  </li>
                ) : node.contentId ? (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => openArticle(node.contentId, node.name)}
                      className="flex h-full w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition hover:border-gold"
                    >
                      <span className="text-sm">{node.name}</span>
                      <span className="shrink-0 text-xs text-gold">摘要</span>
                    </button>
                  </li>
                ) : (
                  <li key={node.id} className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted">
                    {node.name}
                  </li>
                ),
              )}
            </ul>
          )}
        </>
      )}

      {article && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label={article.name} onClick={() => setArticle(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold">{articleLoading ? "读取中…" : article.data.title || article.name}</h3>
              <button type="button" onClick={() => setArticle(null)} className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground">
                关闭
              </button>
            </div>
            {!articleLoading && (
              <>
                {article.data.summary && <p className="mt-3 rounded-lg border-l-4 border-gold bg-surface-2 px-3 py-2 text-sm leading-7">{article.data.summary}</p>}
                {article.data.outline.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs tracking-[0.25em] text-muted">内容目录</h4>
                    <ol className="mt-2 flex flex-col gap-1 text-sm leading-7">
                      {article.data.outline.map((item, i) => (
                        <li key={i} className={item.l <= 2 ? "" : "pl-4 text-muted"}>
                          <span className="mr-2 font-mono text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>
                          {item.x}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {article.data.source && (
                  <a
                    href={article.data.source}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground transition hover:opacity-90"
                  >
                    在资料库看完整图文攻略
                  </a>
                )}
                <p className="mt-3 text-xs leading-5 text-muted">资料库条目来自社区攻略站，本站只做目录与摘要，步骤与配图以原文为准。</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
