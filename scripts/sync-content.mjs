// 同步 guide.nidcsoft.cn 全站内容到本地 content/*.json
// 用法：node scripts/sync-content.mjs
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import TurndownService from "turndown";

const ORIGIN = "https://guide.nidcsoft.cn";
const CONTENT_DIR = path.resolve(import.meta.dirname, "../content");

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// 站内攻略链接归一化为 /guides/<id>(#anchor)；站内根路径归一化为 /<path>
turndown.addRule("internalLinks", {
  filter: (node) => node.nodeName === "A" && !!node.getAttribute("href"),
  replacement: (_content, node) => {
    const href = node.getAttribute("href") ?? "";
    const text = node.textContent.trim();
    let out;
    if (/^https?:\/\//i.test(href)) out = href;
    else if (href.startsWith("guides/")) out = "/guides/" + href.slice("guides/".length).replace(/\.html$/, "");
    else if (href.startsWith("#")) out = href;
    else out = "/" + href.replace(/\.html$/, "");
    return `[${text}](${out})`;
  },
});

// 勾选清单容器由数据块驱动渲染，正文里是空壳，整段跳过
turndown.addRule("skipEmptyChecklist", {
  filter: (node) =>
    node.nodeName === "UL" && /guide-checklist/.test(node.getAttribute("class") ?? ""),
  replacement: () => "",
});
turndown.addRule("skipToolbars", {
  filter: (node) =>
    node.nodeName === "DIV" && /explore-toolbar|filter-tabs/.test(node.getAttribute("class") ?? ""),
  replacement: () => "",
});

async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (res.ok) return await res.text();
      if (res.status === 404) throw new Error(`404 ${url}`);
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
}

function parseYanyunData(jsSource) {
  const marker = "window.YANYUN_DATA =";
  const start = jsSource.indexOf(marker);
  if (start < 0) throw new Error("YANYUN_DATA 标记未找到");
  const jsonText = jsSource.slice(start + marker.length, jsSource.lastIndexOf("}") + 1);
  return JSON.parse(jsonText);
}

// guide-body 内部 section 标题保持层级；清理空段落与重复空行
function bodyToMarkdown(bodyHtml) {
  let md = turndown.turndown(bodyHtml);
  md = md
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\\\s*$/gm, "")
    .trim();
  return md;
}

async function main() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  console.log("1/3 下载数据包 data.js …");
  const dataJs = await fetchText(`${ORIGIN}/js/data.js`);
  const datasets = parseYanyunData(dataJs);
  const guideIndex = datasets.guides ?? [];
  console.log(`   数据块 ${Object.keys(datasets).length} 个，攻略索引 ${guideIndex.length} 篇`);

  console.log("2/3 抓取攻略正文 …");
  const guides = [];
  const failures = [];
  for (const [i, g] of guideIndex.entries()) {
    const url = `${ORIGIN}/${g.url}`;
    try {
      const html = await fetchText(url);
      const root = parse(html);
      const article = root.querySelector("article.guide-article");
      if (!article) throw new Error("article 节点未找到");
      const tldrEl = article.querySelector(".guide-conclusion");
      const bodyEl = article.querySelector(".guide-body");
      const body = bodyEl ? bodyToMarkdown(bodyEl.innerHTML) : "";
      // 数据驱动页（探索清单/题库/事件等）的正文由前端按数据块渲染，HTML 壳里本来就短
      const dataDriven = body.length < 150;
      guides.push({
        slug: g.id,
        title: g.title,
        category: g.category,
        categoryLabel: g.categoryLabel,
        summary: g.summary,
        tldr: tldrEl ? tldrEl.textContent.replace(/^一句话结论：/, "").trim() : "",
        keywords: g.keywords ?? "",
        version: g.version ?? "",
        hot: Boolean(g.hot),
        dataDriven,
        sourceUrl: url,
        updatedAt: g.updated ?? "",
        bodyMd: dataDriven ? "" : body,
      });
      process.stdout.write(`   [${i + 1}/${guideIndex.length}] ${g.id} ${dataDriven ? "数据驱动" : body.length + " 字"}\n`);
    } catch (err) {
      failures.push(`${g.id}: ${err.message}`);
      process.stdout.write(`   [${i + 1}/${guideIndex.length}] ${g.id} 失败 ${err.message}\n`);
    }
  }

  console.log("3/3 写出 content/*.json …");
  const datasetsOut = { ...datasets };
  delete datasetsOut.guides; // guides 已带正文单独成文件
  fs.writeFileSync(path.join(CONTENT_DIR, "guides.json"), JSON.stringify(guides, null, 1), "utf8");
  fs.writeFileSync(path.join(CONTENT_DIR, "datasets.json"), JSON.stringify(datasetsOut, null, 1), "utf8");

  const totalChars = guides.reduce((sum, g) => sum + g.bodyMd.length, 0);
  console.log(`\n完成：${guides.length} 篇正文共 ${totalChars} 字，数据块 ${Object.keys(datasetsOut).length} 个`);
  if (failures.length) {
    console.log("失败清单：");
    for (const f of failures) console.log("  " + f);
    process.exitCode = 1;
  }
}

main();
