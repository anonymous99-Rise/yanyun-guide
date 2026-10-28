// 合并两源任务数据 → content/quests.json
// 源 1：旧版 data/quests.ts 的主章/残章/奇遇目录（约 200 条）
// 源 2：datasets 里带路线的分步条目（开封残章/万事知/见闻/不平事/猫狗）
// 用法：node scripts/build-quests.mjs
import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.resolve(import.meta.dirname, "../content");
const LEGACY_QUESTS_TS = "file:///D:/devProject/Qoder/data/quests.ts";

const { QUESTS, MAIN_CHAPTERS, DATA_AS_OF } = await import(LEGACY_QUESTS_TS);

function readDatasets() {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, "datasets.json"), "utf8"));
}

// nidcsoft 数据块 → 统一条目。key: 数据块名；sub: 探游子类；region: 归属区域
const BLOCK_SPECS = [
  { key: "kaifeng-side", sub: "残章", category: "remnant", region: "开封" },
  { key: "yulutai-wanshizhi", sub: "万事知", category: "explore", region: "河西" },
  { key: "hexi-mamitu", sub: "见闻", category: "explore", region: "河西" },
  { key: "kaifeng-events", sub: "不平事", category: "explore", region: "开封" },
  { key: "cat-dog-play", sub: "猫狗戏", category: "explore", region: "" },
];

function collectDatasetEntries(datasets) {
  const entries = [];
  for (const spec of BLOCK_SPECS) {
    const block = datasets[spec.key];
    if (!block) continue;
    const regions = block.regions ?? [];
    for (const region of regions) {
      for (const item of region.items ?? []) {
        entries.push({
          id: `src-${item.id}`,
          category: spec.category,
          sub: spec.sub,
          name: item.name,
          region: spec.region || undefined,
          group: region.name,
          location: item.location || undefined,
          route: item.route || undefined,
          steps: Array.isArray(item.steps) ? item.steps : undefined,
          hint: item.hint || undefined,
          note: item.note || region.note || undefined,
          time: item.time || undefined,
          source: item.url ? `https://guide.nidcsoft.cn/guides/${item.url.replace(/\.html$/, "")}` : `https://guide.nidcsoft.cn/guides/${spec.key}.html`,
        });
      }
    }
    // cat-dog-play 这类无 regions 分层的块
    if (!regions.length && Array.isArray(block.items)) {
      for (const item of block.items) {
        entries.push({
          id: `src-${item.id ?? spec.key + "-" + entries.length}`,
          category: spec.category,
          sub: spec.sub,
          name: item.name,
          location: item.location || undefined,
          route: item.route || undefined,
          steps: Array.isArray(item.steps) ? item.steps : undefined,
          hint: item.hint || undefined,
          note: item.summary || item.note || undefined,
          time: item.time || undefined,
          source: `https://guide.nidcsoft.cn/guides/${spec.key}.html`,
        });
      }
    }
  }
  return entries;
}

function keyOf(entry) {
  return (entry.name ?? "").replace(/[·（）()、\s]/g, "");
}

function main() {
  const datasets = readDatasets();
  const base = QUESTS.map((q) => ({ ...q }));
  const extras = collectDatasetEntries(datasets);

  // 按名字去重：同名的条目把 extras 的路线信息并入 base 条目缺失的字段
  const baseKeys = new Map(base.map((q) => [keyOf(q), q]));
  const merged = [...base];
  let enriched = 0;
  let added = 0;
  for (const extra of extras) {
    const hit = baseKeys.get(keyOf(extra));
    if (hit) {
      Object.assign(hit, Object.fromEntries(Object.entries(extra).filter(([k, v]) => v !== undefined && hit[k] === undefined)));
      enriched++;
    } else {
      baseKeys.set(keyOf(extra), extra);
      merged.push(extra);
      added++;
    }
  }

  const order = { main: 0, remnant: 1, encounter: 2, explore: 3 };
  merged.sort((a, b) => (order[a.category] - order[b.category]) || String(a.region ?? "").localeCompare(String(b.region ?? ""), "zh"));

  fs.writeFileSync(
    path.join(CONTENT_DIR, "quests.json"),
    JSON.stringify({ dataAsOf: DATA_AS_OF, mainChapters: MAIN_CHAPTERS, entries: merged }, null, 1),
    "utf8",
  );
  const byCat = {};
  for (const q of merged) byCat[q.category] = (byCat[q.category] ?? 0) + 1;
  console.log(`合并完成：共 ${merged.length} 条 — ${JSON.stringify(byCat)}`);
  console.log(`路线信息并入既有条目 ${enriched} 条，新增 ${added} 条`);
}

main();
