// 灰机wiki 全站采集：主命名空间页面 + wikitext + 分类，落盘 content/huiji/pages.json
// 用法：node scripts/huiji-scrape.mjs   （headless Chromium 已实测可过 CF）
// 频控：每批间隔 500ms；只读公开内容，来源署名灰机wiki（CC BY-NC-SA）。
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT = path.resolve(import.meta.dirname, "../content/huiji");
const BATCH = 40;
const DELAY_MS = 500;

const { browser, page } = await (async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });
  return { browser, page };
})();

try {
  console.log("1/3 打开灰机，等待 CF…");
  await page.goto("https://yy16s.huijiwiki.com/wiki/%E9%A6%96%E9%A1%B5", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2000);
    if (!/请稍候|Just a moment/i.test(await page.title())) break;
  }
  if (/请稍候|Just a moment/i.test(await page.title())) {
    console.error("CF 未通过");
    process.exit(2);
  }

  console.log("2/3 枚举主命名空间全部页面…");
  const pages = await page.evaluate(async () => {
    const api = (params) =>
      fetch("https://yy16s.huijiwiki.com/api.php?" + new URLSearchParams({ format: "json", formatversion: "2", ...params })).then((r) => r.json());
    let titles = [];
    let cont = {};
    while (true) {
      const d = await api({ action: "query", list: "allpages", aplimit: "max", ...cont });
      titles.push(...(d.query?.allpages ?? []).map((p) => p.title));
      if (!d.continue) break;
      cont = d.continue;
    }
    return titles;
  });
  console.log(`   共 ${pages.length} 页`);

  console.log("3/3 分批抓取全文与分类…");
  const results = [];
  for (let i = 0; i < pages.length; i += BATCH) {
    const batch = pages.slice(i, i + BATCH);
    const data = await page.evaluate(async (titles) => {
      const api = (params) =>
        fetch("https://yy16s.huijiwiki.com/api.php?" + new URLSearchParams({ format: "json", formatversion: "2", ...params })).then((r) => r.json());
      const d = await api({
        action: "query",
        prop: "revisions|categories",
        rvprop: "content",
        rvslots: "main",
        cllimit: "max",
        titles: titles.join("|"),
      });
      return (d.query?.pages ?? []).map((p) => ({
        title: p.title,
        missing: p.missing !== undefined,
        wikitext: p.revisions?.[0]?.slots?.main?.content ?? "",
        categories: (p.categories ?? []).map((c) => c.title.replace(/^分类:/, "")),
      }));
    }, batch);
    results.push(...data.filter((p) => !p.missing && p.wikitext));
    process.stdout.write(`   [${Math.min(i + BATCH, pages.length)}/${pages.length}] 累计 ${results.length} 页\n`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT, "pages.json"),
    JSON.stringify({ site: "yy16s.huijiwiki.com", license: "CC BY-NC-SA", scrapedAt: new Date().toISOString(), pages: results }, null, 1),
    "utf8",
  );
  console.log(`\n完成：${results.length} 页 → content/huiji/pages.json`);
} finally {
  await browser.close().catch(() => {});
}
