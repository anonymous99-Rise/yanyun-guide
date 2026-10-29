// 轻量 web 搜索：DuckDuckGo HTML 端点（无 key）。失败返回空数组，调用方降级。
export type WebResult = { title: string; url: string; snippet: string };

export async function webSearch(query: string, maxResults = 5): Promise<WebResult[]> {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "accept-language": "zh-CN,zh;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: WebResult[] = [];
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < maxResults) {
      const url = decodeDdgHref(m[1]);
      const title = stripTags(m[2]);
      const snippet = stripTags(m[3]);
      if (title && url) results.push({ title, url, snippet });
    }
    return results;
  } catch {
    return [];
  }
}

// DDG 的 href 是 /l/?uddg=<encoded> 形式
function decodeDdgHref(href: string): string {
  const abs = href.startsWith("//") ? "https:" + href : href;
  try {
    const u = new URL(abs, "https://duckduckgo.com");
    const target = u.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : abs;
  } catch {
    return abs;
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
