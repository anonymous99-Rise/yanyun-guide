// 全量导入 content/*.json 到 Supabase Postgres（先清表再写入，内容以仓库 JSON 为准）。
// 用法：node scripts/db-import.mjs   （需要 .env.local 里的 POSTGRES_URL）
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const CONTENT_DIR = path.resolve(import.meta.dirname, "../content");

if (!process.env.POSTGRES_URL) {
  console.error("缺少 POSTGRES_URL。先 vercel env pull --yes .env.local，再用 node --env-file=.env.local 运行。");
  process.exit(1);
}

const sql = postgres(process.env.POSTGRES_URL, { max: 3, prepare: false });

const guides = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, "guides.json"), "utf8"));
const quests = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, "quests.json"), "utf8"));
const datasets = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, "datasets.json"), "utf8"));
const mainQuests = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, "huiji/parsed/main-quests.json"), "utf8"));

try {
  await sql.begin(async (tx) => {
    await tx`create table if not exists guides (
      slug text primary key,
      title text not null,
      category text not null,
      category_label text not null default '',
      summary text not null default '',
      tldr text not null default '',
      keywords text not null default '',
      version text not null default '',
      hot boolean not null default false,
      data_driven boolean not null default false,
      source_url text not null default '',
      updated_at text not null default '',
      body_md text not null default ''
    )`;
    await tx`create table if not exists quests (
      id text primary key,
      category text not null,
      sub text,
      name text not null,
      chapter text,
      region text,
      group_name text,
      location text,
      route text,
      unlock text,
      steps jsonb,
      note text,
      caution text,
      hint text,
      time text,
      source text not null default ''
    )`;
    await tx`create table if not exists datasets (
      key text primary key,
      data jsonb not null,
      updated text not null default ''
    )`;
    await tx`create table if not exists main_sections (
      slug text primary key,
      chapter text not null,
      chapter_name text not null,
      region text not null,
      section text not null,
      title text not null default '',
      intro text not null default '',
      goals jsonb not null default '[]',
      steps jsonb not null default '[]',
      achievements jsonb not null default '[]',
      source text not null default ''
    )`;

    await tx`delete from guides`;
    for (const g of guides) {
      await tx`
        insert into guides (slug, title, category, category_label, summary, tldr, keywords, version, hot, data_driven, source_url, updated_at, body_md)
        values (${g.slug}, ${g.title}, ${g.category}, ${g.categoryLabel}, ${g.summary}, ${g.tldr}, ${g.keywords}, ${g.version}, ${g.hot}, ${g.dataDriven}, ${g.sourceUrl}, ${g.updatedAt}, ${g.bodyMd})`;
    }

    await tx`delete from quests`;
    for (const q of quests.entries) {
      await tx`
        insert into quests (id, category, sub, name, chapter, region, group_name, location, route, unlock, steps, note, caution, hint, time, source)
        values (${q.id}, ${q.category}, ${q.sub ?? null}, ${q.name}, ${q.chapter ?? null}, ${q.region ?? null}, ${q.group ?? null}, ${q.location ?? null}, ${q.route ?? null}, ${q.unlock ?? null}, ${q.steps ? JSON.stringify(q.steps) : null}, ${q.note ?? null}, ${q.caution ?? null}, ${q.hint ?? null}, ${q.time ?? null}, ${q.source})`;
    }

    await tx`delete from datasets`;
    for (const [key, data] of Object.entries(datasets)) {
      const updated = typeof data === "object" && data && "updated" in data ? String(data.updated) : "";
      await tx`insert into datasets (key, data, updated) values (${key}, ${JSON.stringify(data)}, ${updated})`;
    }

    await tx`delete from main_sections`;
    for (const ch of mainQuests.chapters) {
      for (const s of ch.sections) {
        await tx`
          insert into main_sections (slug, chapter, chapter_name, region, section, title, intro, goals, steps, achievements, source)
          values (${s.slug}, ${ch.key}, ${ch.name}, ${ch.region}, ${s.section}, ${s.title}, ${s.intro}, ${JSON.stringify(s.goals)}, ${JSON.stringify(s.steps)}, ${JSON.stringify(s.achievements)}, ${s.source})`;
      }
    }
  });

  const sectionCount = mainQuests.chapters.reduce((s, c) => s + c.sections.length, 0);
  console.log(`导入完成：guides ${guides.length} 篇，quests ${quests.entries.length} 条，datasets ${Object.keys(datasets).length} 块，main_sections ${sectionCount} 节`);
} finally {
  await sql.end();
}
