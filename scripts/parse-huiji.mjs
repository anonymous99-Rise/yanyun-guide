// 解析灰机主章 wikitext → content/huiji/parsed/main-quests.json
// 提取每节的：标题(DISPLAYTITLE)、任务简介、目标({{目标|}})、步骤(* 项)、成就({{成就ask|}})。
// 对话/演出模板过滤（攻略站不镜像全对话）。
import fs from "node:fs";
import path from "node:path";

const RAW = path.resolve(import.meta.dirname, "../content/huiji/pages.json");
const OUT_DIR = path.resolve(import.meta.dirname, "../content/huiji/parsed");

const CHAPTERS = [
  { key: "神仙不渡", name: "第一章 · 神仙不渡（清河）", region: "清河" },
  { key: "天地熔炉", name: "第二章 · 天地熔炉（开封）", region: "开封" },
  { key: "问月长安", name: "第三章 · 问月长安（河西）", region: "河西" },
  { key: "金乌衔枝", name: "第四章 · 金乌衔枝（不见山）", region: "不见山" },
  { key: "最忆江南", name: "第五章 · 平澜起风波（江南）", region: "江南" },
];

function templateArg(text, name) {
  // 匹配 {{名称|内容}}（内容可含嵌套括号，做深度平衡扫描）
  const re = new RegExp("\\{\\{" + name + "\\s*\\|", "g");
  let m;
  while ((m = re.exec(text))) {
    let depth = 2;
    let i = m.index + m[0].length;
    let start = i;
    while (i < text.length && depth > 0) {
      if (text.startsWith("{{", i)) (depth += 2), (i += 2);
      else if (text.startsWith("}}", i)) (depth -= 2), (i += 2);
      else i++;
    }
    if (depth === 0) return text.slice(start, i - 2).trim();
  }
  return "";
}

function stripMarkup(text) {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[\[([^|\]]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/'{2,5}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSection(page) {
  const wt = page.wikitext;
  const displayTitle = (wt.match(/\{\{DISPLAYTITLE:([^}]+)\}\}/) ?? [])[1]?.trim() ?? "";
  const intro = stripMarkup(templateArg(wt, "任务简介"));
  const goals = [...new Set([...wt.matchAll(/\{\{目标\|([^}]+)\}\}/g)].map((m) => stripMarkup(m[1])))];
  const achievements = [...wt.matchAll(/\{\{成就ask\|([^}|]+)(?:\|[^}]*)?\}\}/g)].map((m) => m[1].trim());

  // 步骤：行首 * 的裸列表项（不含模板行）
  const steps = [...wt.matchAll(/^\*\s*([^*{\n][^\n]*)$/gm)]
    .map((m) => stripMarkup(m[1]))
    .filter((s) => s.length > 0 && s.length < 60);

  return {
    slug: page.title,
    section: page.title.split("/")[1] ?? "总览",
    title: displayTitle,
    intro,
    goals,
    steps,
    achievements,
    source: `https://yy16s.huijiwiki.com/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
  };
}

function main() {
  const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const chapters = [];
  let totalSections = 0;
  for (const ch of CHAPTERS) {
    // 页面名可能带「第一章 」前缀（如"第一章 神仙不渡/1"），统一剥离后再匹配
    const pages = raw.pages
      .filter(
        (p) =>
          p.categories.includes("主章") &&
          p.title.includes("/") &&
          p.title.split("/")[0].replace(/^第[一二三四五六七八九十]+章\s*/, "").trim() === ch.key,
      )
      .sort((a, b) => Number(a.title.split("/")[1]) - Number(b.title.split("/")[1]));
    const overview = raw.pages.find((p) => p.title === ch.key);
    const sections = pages.map(parseSection);
    chapters.push({
      key: ch.key,
      name: ch.name,
      region: ch.region,
      overviewTitle: overview ? (overview.wikitext.match(/\{\{DISPLAYTITLE:([^}]+)\}\}/) ?? [])[1]?.trim() ?? "" : "",
      sectionCount: sections.length,
      sections,
    });
    totalSections += sections.length;
    console.log(`${ch.name}: ${sections.length} 节 [${sections.map((s) => s.title || s.section).join(" / ")}]`);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "main-quests.json"),
    JSON.stringify({ license: "CC BY-NC-SA, 来源: 灰机wiki yy16s.huijiwiki.com", chapters }, null, 1),
    "utf8",
  );
  console.log(`\n完成：${chapters.length} 章 ${totalSections} 节 → content/huiji/parsed/main-quests.json`);
}

main();
