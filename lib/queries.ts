// Supabase 查询：供 AI 助手与全站搜索在运行时使用（页面渲染走打包 JSON，见 lib/content）。
import { getDb } from "./db";
import type { Guide, QuestEntry } from "./content";

type GuideRow = {
  slug: string;
  title: string;
  category: Guide["category"];
  category_label: string;
  summary: string;
  tldr: string;
  keywords: string;
  version: string;
  hot: boolean;
  data_driven: boolean;
  source_url: string;
  updated_at: string;
  body_md: string;
};

type QuestRow = {
  id: string;
  category: QuestEntry["category"];
  sub: string | null;
  name: string;
  chapter: string | null;
  region: string | null;
  group_name: string | null;
  location: string | null;
  route: string | null;
  unlock: string | null;
  steps: string[] | null;
  note: string | null;
  caution: string | null;
  hint: string | null;
  time: string | null;
  source: string;
};

function toGuide(row: GuideRow): Guide {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    categoryLabel: row.category_label,
    summary: row.summary,
    tldr: row.tldr,
    keywords: row.keywords,
    version: row.version,
    hot: row.hot,
    dataDriven: row.data_driven,
    sourceUrl: row.source_url,
    updatedAt: row.updated_at,
    bodyMd: row.body_md,
  };
}

function toQuest(row: QuestRow): QuestEntry {
  return {
    id: row.id,
    category: row.category,
    sub: row.sub ?? undefined,
    name: row.name,
    chapter: row.chapter ?? undefined,
    region: row.region ?? undefined,
    group: row.group_name ?? undefined,
    location: row.location ?? undefined,
    route: row.route ?? undefined,
    unlock: row.unlock ?? undefined,
    steps: row.steps ?? undefined,
    note: row.note ?? undefined,
    caution: row.caution ?? undefined,
    hint: row.hint ?? undefined,
    time: row.time ?? undefined,
    source: row.source,
  };
}

export type Corpus = { guides: Guide[]; quests: QuestEntry[]; mainSections: MainSection[]; questGuides: QuestGuide[] };

// 语料进程内缓存（5 分钟）：/search 与助手高频复用，省去每次全量拉库
let corpusCache: { at: number; data: Corpus } | null = null;

export type QuestGuide = {
  name: string;
  category: string;
  intro: string;
  highlights: string[];
  goals: string[];
  steps: string[];
  achievements: string[];
  details: string[];
  items: string[];
  source: string;
};

type QuestGuideRow = {
  name: string;
  category: string;
  intro: string;
  highlights: string[];
  goals: string[];
  steps: string[];
  achievements: string[];
  details: string[];
  items: string[];
  source: string;
};

export type MainSection = {
  slug: string;
  chapter: string;
  chapterName: string;
  region: string;
  section: string;
  title: string;
  intro: string;
  goals: string[];
  steps: string[];
  achievements: string[];
  source: string;
};

type MainSectionRow = {
  slug: string;
  chapter: string;
  chapter_name: string;
  region: string;
  section: string;
  title: string;
  intro: string;
  goals: string[];
  steps: string[];
  achievements: string[];
  source: string;
};

// 全量语料：助手检索与站内搜索一次取全部条目，应用层计分。
export async function loadSearchCorpus(): Promise<Corpus> {
  if (corpusCache && Date.now() - corpusCache.at < 300_000) return corpusCache.data;
  const sql = getDb();
  const [guideRows, questRows, sectionRows, guideCardRows] = await Promise.all([
    sql<[GuideRow]>`select * from guides`,
    sql<[QuestRow]>`select * from quests`,
    sql<[MainSectionRow]>`select * from main_sections`,
    sql<[QuestGuideRow]>`select * from quest_guides`,
  ]);
  const data: Corpus = {
    guides: guideRows.map(toGuide),
    quests: questRows.map(toQuest),
    mainSections: sectionRows.map((r) => ({
      slug: r.slug,
      chapter: r.chapter,
      chapterName: r.chapter_name,
      region: r.region,
      section: r.section,
      title: r.title,
      intro: r.intro,
      goals: r.goals ?? [],
      steps: r.steps ?? [],
      achievements: r.achievements ?? [],
      source: r.source,
    })),
    questGuides: guideCardRows.map((r) => ({
      name: r.name,
      category: r.category,
      intro: r.intro,
      highlights: r.highlights ?? [],
      goals: r.goals ?? [],
      steps: r.steps ?? [],
      achievements: r.achievements ?? [],
      details: r.details ?? [],
      items: r.items ?? [],
      source: r.source,
    })),
  };
  corpusCache = { at: Date.now(), data };
  return data;
}

export async function getGlossary(): Promise<unknown> {
  const sql = getDb();
  const rows = await sql<[{ data: unknown }]>`select data from datasets where key = 'glossary' limit 1`;
  return rows[0]?.data;
}

export type HuijiPage = { title: string; wikitext: string; categories: string[]; source: string };

export async function getHuijiPage(title: string): Promise<HuijiPage | undefined> {
  const sql = getDb();
  const rows = await sql<[{ title: string; wikitext: string; categories: string[] | string; source: string }]>
    `select title, wikitext, categories, source from huiji_pages where title = ${title} limit 1`;
  const row = rows[0];
  if (!row) return undefined;
  // 批量导入路径会把数组双重编码为 JSON 字符串，读取时兼容
  const categories = typeof row.categories === "string" ? (JSON.parse(row.categories) as string[]) : row.categories;
  return { ...row, categories };
}

// 全量 wiki 关键词检索：ILIKE 命中标题或正文，标题命中加权。LIKE 通配符需转义。
function escapeLike(text: string): string {
  return text.replace(/([%_\\])/g, "\\$1");
}

export async function searchHuijiPages(query: string, limit = 12): Promise<{ title: string; snippet: string; source: string }[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const needle = `%${escapeLike(trimmed)}%`;
  const sql = getDb();
  const rows = await sql<[{ title: string; wikitext: string; source: string }]>`
    select title, wikitext, source from huiji_pages
    where title ilike ${needle} or wikitext ilike ${needle}
    order by (title ilike ${needle})::int desc, length(wikitext) desc
    limit ${limit}`;
  return rows.map((r) => {
    const at = r.wikitext.toLowerCase().indexOf(trimmed.toLowerCase());
    const snippet = at >= 0 ? r.wikitext.slice(Math.max(0, at - 80), at + 220) : r.wikitext.slice(0, 220);
    return { title: r.title, snippet: snippet.replace(/\s+/g, " "), source: r.source };
  });
}
