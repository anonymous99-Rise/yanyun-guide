// 灰机wiki 探测：过 Cloudflare 后在页面内调 MediaWiki API，摸清内容结构。
// 用法：node scripts/huiji-explore.mjs [--cdp http://localhost:9222]
import { chromium } from "playwright";

const cdp = process.argv.includes("--cdp") ? process.argv[process.argv.indexOf("--cdp") + 1] : null;

async function openPage() {
  if (cdp) {
    const browser = await chromium.connectOverCDP(cdp);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = await context.newPage();
    return { browser, page };
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });
  return { browser, page };
}

const { browser, page } = await openPage();

try {
  console.log("打开灰机首页，等待 Cloudflare 检查…");
  await page.goto("https://yy16s.huijiwiki.com/wiki/%E9%A6%96%E9%A1%B5", { waitUntil: "domcontentloaded", timeout: 30000 });
  // CF 挑战通常 5 秒内自动通过；循环检测标题
  let passed = false;
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2500);
    const title = await page.title();
    console.log(`  [${i}] 标题: ${title.slice(0, 40)}`);
    if (!/请稍候|Just a moment|Attention/i.test(title)) {
      passed = true;
      break;
    }
  }
  if (!passed) {
    console.error("CF 未通过。改用 --cdp 模式连接已登录的 Edge。");
    process.exit(2);
  }

  // 页面上下文内调 MediaWiki API（同域 + 已过 CF 的 cookie）
  const result = await page.evaluate(async () => {
    const api = (params) =>
      fetch("https://yy16s.huijiwiki.com/api.php?" + new URLSearchParams({ format: "json", ...params })).then((r) => r.json());
    const out = {};
    const cats = await api({ action: "query", list: "allcategories", aclimit: 100, acmin: 2 });
    out.categories = (cats.query?.allcategories ?? []).map((c) => Object.values(c)[0]);
    for (const term of ["第五章", "主线任务", "平澜", "江南"]) {
      const s = await api({ action: "query", list: "search", srsearch: term, srlimit: 20 });
      out["search_" + term] = (s.query?.search ?? []).map((r) => r.title);
    }
    return out;
  });

  console.log(JSON.stringify(result, null, 1));
} finally {
  await browser.close().catch(() => {});
}
