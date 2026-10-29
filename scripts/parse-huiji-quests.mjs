// 解析灰机 奇遇/万事知 页面 → content/huiji/parsed/quest-guides.json
// 奇遇：任务简介/高亮/目标/步骤/成就；万事知：infobox 详情N 序列 + 高亮/物品/成就。
// 对话模板只计数不镜像（剧情正文不搬，攻略要点才要）。
import fs from "node:fs";
import path from "node:path";

const RAW = path.resolve(import.meta.dirname, "../content/huiji/pages.json");
const OUT_DIR = path.resolve(import.meta.dirname, "../content/huiji/parsed");

// 深度感知：切分 {{模板名 | 参数=值 ...}} 的顶层参数
function splitTemplateArgs(inner) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    if (inner.startsWith("{{", i)) (depth += 2), (cur += "{{"), i++;
    else if (inner.startsWith("}}", i)) (depth -= 2), (cur += "}}"), i++;
    else if (inner[i] === "|" && depth === 0) parts.push(cur), (cur = "");
    else cur += inner[i];
  }
  parts.push(cur);
  return parts;
}

function stripMarkup(text) {
  return text
    .replace(/\{\{物品\|([^|}]+)[^}]*\}\}/g, "$1")
    .replace(/\{\{(对话|偷听)\|[^{]*?\}\}/g, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^|\]]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/'{2,5}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extract(wikitext, templateName) {
  const open = wikitext.indexOf("{{" + templateName);
  if (open < 0) return null;
  // 找到该模板的完整范围（深度平衡）
  let depth = 0;
  let i = open;
  while (i < wikitext.length) {
    if (wikitext.startsWith("{{", i)) (depth += 2), (i += 2);
    else if (wikitext.startsWith("}}", i)) {
      depth -= 2;
      i += 2;
      if (depth === 0) break;
    } else i++;
  }
  const inner = wikitext.slice(open + 2, i - 2);
  const parts = splitTemplateArgs(inner);
  const args = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq > 0) args[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    else args[part.trim()] = "";
  }
  return args;
}

function pageUrl(title) {
  return `https://yy16s.huijiwiki.com/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function commonOf(wikitext) {
  return {
    intro: stripMarkup(extract(wikitext, "任务简介")?.["1"] ?? extract(wikitext, "任务简介")?.["任务简介"] ?? ""),
    highlights: [...wikitext.matchAll(/\{\{高亮\|([^}]+)\}\}/g)].map((m) => stripMarkup(m[1])),
    goals: [...new Set([...wikitext.matchAll(/\{\{目标\|([^}]+)\}\}/g)].map((m) => stripMarkup(m[1])))],
    steps: [...wikitext.matchAll(/^\*\s*([^*{\n][^\n]*)$/gm)]
      .map((m) => stripMarkup(m[1]))
      .filter((s) => s && s.length < 60),
    achievements: [...wikitext.matchAll(/\{\{成就ask\|([^}|]+)(?:\|[^}]*)?\}\}/g)].map((m) => m[1].trim()),
  };
}

function main() {
  const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const encounters = raw.pages
    .filter((p) => p.categories.includes("奇遇"))
    .map((p) => ({ name: p.title, category: "encounter", source: pageUrl(p.title), ...commonOf(p.wikitext) }));

  const wanshizhi = raw.pages
    .filter((p) => p.categories.includes("万事知"))
    .map((p) => {
      const base = { name: p.title, category: "wanshizhi", source: pageUrl(p.title), ...commonOf(p.wikitext) };
      const box = extract(p.wikitext, "万事知");
      const details = [];
      const items = [];
      if (box) {
        const indices = new Set();
        for (const key of Object.keys(box)) {
          const m = /^(详情|物品|落款)(\d+)$/.exec(key);
          if (m) indices.add(m[2]);
        }
        for (const idx of [...indices].sort((a, b) => a - b)) {
          const detail = stripMarkup(box["详情" + idx] ?? "");
          if (detail) details.push(detail);
          const item = stripMarkup(box["物品" + idx] ?? "");
          if (item) items.push(item);
        }
      }
      return { ...base, details, items };
    })
    .filter((p) => p.details.length || p.highlights.length || p.goals.length);

  fs.writeFileSync(
    path.join(OUT_DIR, "quest-guides.json"),
    JSON.stringify({ license: "CC BY-NC-SA, 来源: 灰机wiki yy16s.huijiwiki.com", encounters, wanshizhi }, null, 1),
    "utf8",
  );
  const filled = (list) => list.filter((p) => p.intro || p.highlights.length || p.goals.length || p.details?.length).length;
  console.log(`奇遇 ${encounters.length} 页（有攻略骨架 ${filled(encounters)}）`);
  console.log(`万事知 ${wanshizhi.length} 页（有要点 ${filled(wanshizhi)}）`);
  const sample = wanshizhi.find((w) => w.name === "一本万利");
  console.log("\n样本 一本万利:", JSON.stringify({ highlights: sample.highlights, details: sample.details.slice(0, 2), items: sample.items.slice(0, 3) }, null, 1));
}

main();
