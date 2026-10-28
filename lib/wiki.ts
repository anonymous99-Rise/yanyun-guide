// GameKee 燕云十六声资料库代理（探游板块的实时补充）。缓存与限流均为实例级。
const ORIGIN = "https://www.gamekee.com";
const ALIAS = "yysls";
const TREE_TTL_MS = 30 * 60 * 1000;
const PAGE_TTL_MS = 10 * 60 * 1000;
const MAX_UPSTREAM_BYTES = 6 * 1024 * 1024;

type Raw = Record<string, unknown>;
export type TreeLeaf = { id: number; name: string; contentId: string; leaf: boolean; count: number };
type TreeNode = { id: number; name: string; path: string[]; children: unknown[]; contentId: string };

const pageCache = new Map<string, { value: unknown; at: number }>();
let treeState: { index: Map<string, TreeNode>; at: number } | null = null;
let treeInflight: Promise<Map<string, TreeNode>> | null = null;

function cacheRead<T>(store: Map<string, { value: T; at: number }>, key: string, ttl: number) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > ttl) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

async function getJson(url: string, timeoutMs = 9000) {
  const response = await fetch(url, {
    headers: { "game-alias": ALIAS, "user-agent": "yanyun-guide/2.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`upstream_${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("upstream_empty");
  const decoder = new TextDecoder();
  let raw = "";
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value?.byteLength ?? 0;
    if (bytes > MAX_UPSTREAM_BYTES) {
      await reader.cancel();
      throw new Error("upstream_too_large");
    }
    raw += decoder.decode(value, { stream: true });
  }
  return JSON.parse(raw) as { code?: number; data?: unknown };
}

function toLeaf(node: Raw): TreeLeaf {
  const child = Array.isArray(node.child) ? node.child : [];
  return {
    id: Number(node.id),
    name: String(node.name ?? "").trim(),
    contentId: node.content_id ? String(node.content_id) : "",
    leaf: child.length === 0,
    count: child.length,
  };
}

function indexTree(nodes: unknown[], path: string[], into: Map<string, TreeNode>) {
  for (const raw of nodes) {
    const node = raw as Raw;
    const children = Array.isArray(node.child) ? node.child : [];
    const next = path.concat(String(node.name ?? "").trim());
    into.set(String(node.id), {
      id: Number(node.id),
      name: next[next.length - 1],
      path: next,
      children,
      contentId: node.content_id ? String(node.content_id) : "",
    });
    indexTree(children, next, into);
  }
}

async function loadIndex() {
  if (treeState && Date.now() - treeState.at < TREE_TTL_MS) return treeState.index;
  if (treeInflight) return treeInflight;
  treeInflight = (async () => {
    const payload = await getJson(`${ORIGIN}/v1/entry/treesByPidV1?pid=0`);
    if (payload.code !== 0 || !Array.isArray(payload.data)) throw new Error("upstream_tree_shape");
    const index = new Map<string, TreeNode>();
    index.set("0", { id: 0, name: "", path: [], children: payload.data, contentId: "" });
    indexTree(payload.data, [], index);
    treeState = { index, at: Date.now() };
    return index;
  })().finally(() => {
    treeInflight = null;
  });
  return treeInflight;
}

export async function getTree(pid: string) {
  const index = await loadIndex();
  const node = index.get(pid);
  if (!node) return { path: [] as string[], groups: [] as TreeLeaf[] };
  return { path: node.path, groups: node.children.map((child) => toLeaf(child as Raw)) };
}

export async function searchLeaves(query: string, pid: number) {
  const index = await loadIndex();
  const scope = pid > 0 ? index.get(String(pid)) : undefined;
  const needle = query.toLowerCase();
  const matches: { id: number; name: string; path: string[]; contentId: string }[] = [];
  for (const node of index.values()) {
    if (node.children.length || !node.contentId) continue;
    if (scope && node.path.length <= scope.path.length) continue;
    if (scope && node.path.slice(0, scope.path.length).join(">") !== scope.path.join(">")) continue;
    if (!node.name.toLowerCase().includes(needle)) continue;
    matches.push({ id: node.id, name: node.name, path: node.path.slice(0, -1), contentId: node.contentId });
    if (matches.length >= 80) break;
  }
  return matches;
}

type Block =
  | { t: "h"; l: number; x: string }
  | { t: "p"; x: string }
  | { t: "table"; rows: string[][] }
  | { t: "img"; src: string; alt: string };

function absolutize(url: string) {
  return url.startsWith("//") ? `https:${url}` : url;
}

function flatten(node: unknown): string {
  const record = node as Raw;
  if (typeof record.text === "string") return record.text;
  return (Array.isArray(record.children) ? record.children : []).map(flatten).join("");
}

function blockText(children: unknown[]): string {
  const parts: string[] = [];
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      const node = raw as Raw;
      if (node.type === "a" || node.type === "image") continue;
      if (typeof node.text === "string" && node.text) {
        parts.push(node.text);
        continue;
      }
      if (Array.isArray(node.children)) walk(node.children);
    }
  };
  walk(children);
  return parts.join("").trim();
}

function parseBlocks(nodes: unknown[], out: Block[]) {
  for (const raw of nodes) {
    const node = raw as Raw;
    const children = Array.isArray(node.children) ? node.children : [];
    const type = String(node.type ?? "");

    if (type === "table") {
      const rows = children.map((row) =>
        ((row as Raw).children as unknown[] ?? []).map((cell) =>
          ((cell as Raw).children as unknown[] ?? []).map(flatten).join("\n").trim(),
        ),
      );
      if (rows.some((row) => row.some((cell) => cell))) out.push({ t: "table", rows });
      continue;
    }

    const header = /^header(\d)$/.exec(type);
    const text = blockText(children);
    if (text) out.push(header ? { t: "h", l: Number(header[1]), x: text } : { t: "p", x: text });
    for (const child of children) {
      const image = child as Raw;
      if (image.type === "image" && typeof image.src === "string") {
        out.push({ t: "img", src: absolutize(image.src), alt: String(image.alt ?? "") });
      }
    }
  }
}

export async function getArticle(contentId: string) {
  const cached = cacheRead(pageCache, contentId, PAGE_TTL_MS);
  if (cached) return cached;
  const payload = await getJson(`${ORIGIN}/v1/content/detail/${encodeURIComponent(contentId)}`, 12000);
  if (payload.code !== 0 || !payload.data) throw new Error("upstream_article_shape");
  const data = payload.data as Raw;
  const blocks: Block[] = [];
  let slate: unknown = data.content_json;
  if (typeof slate === "string") {
    try {
      slate = JSON.parse(slate);
    } catch {
      slate = [];
    }
  }
  if (Array.isArray(slate)) parseBlocks(slate, blocks);
  const outline = blocks.filter((b): b is Extract<Block, { t: "h" }> => b.t === "h").slice(0, 40);
  const article = {
    title: String(data.title ?? ""),
    updatedAt: Number(data.updated_at ?? 0),
    // 摘要索引而非镜像全文：完整步骤以原文为准
    summary: String(data.summary ?? "").replace(/\s+/g, " ").slice(0, 180),
    outline,
    source: `${ORIGIN}/yysls/${encodeURIComponent(contentId)}.html`,
  };
  pageCache.set(contentId, { value: article, at: Date.now() });
  return article;
}
