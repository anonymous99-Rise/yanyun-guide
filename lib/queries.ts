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

export type Corpus = { guides: Guide[]; quests: QuestEntry[] };

// 全量语料：助手检索与站内搜索一次取全部条目，应用层计分。
export async function loadSearchCorpus(): Promise<Corpus> {
  const sql = getDb();
  const [guideRows, questRows] = await Promise.all([
    sql<[GuideRow]>`select * from guides`,
    sql<[QuestRow]>`select * from quests`,
  ]);
  return { guides: guideRows.map(toGuide), quests: questRows.map(toQuest) };
}

export async function getGlossary(): Promise<unknown> {
  const sql = getDb();
  const rows = await sql<[{ data: unknown }]>`select data from datasets where key = 'glossary' limit 1`;
  return rows[0]?.data;
}
