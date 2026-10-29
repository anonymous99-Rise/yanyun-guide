// 通用 wikitext → 结构化可读内容。灰机模板白名单转换，未知模板取首参或丢弃。
export type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "intro"; text: string }
  | { type: "goal"; text: string }
  | { type: "highlight"; text: string }
  | { type: "step"; text: string }
  | { type: "achievement"; text: string }
  | { type: "dialog"; actor: string; text: string }
  | { type: "quote"; text: string }
  | { type: "transition"; text: string }
  | { type: "item"; text: string };

export type WikiSection = { heading: string | null; blocks: Block[] };

// 深度感知：取 {{name ...}} 模板的完整片段
function findTemplate(text: string, startIndex: number): { inner: string; end: number } | null {
  let depth = 0;
  let i = startIndex;
  const open = i;
  while (i < text.length) {
    if (text.startsWith("{{", i)) (depth += 2), (i += 2);
    else if (text.startsWith("}}", i)) {
      depth -= 2;
      i += 2;
      if (depth === 0) return { inner: text.slice(open + 2, i - 2), end: i };
    } else i++;
  }
  return null;
}

function splitTop(inner: string): string[] {
  const parts: string[] = [];
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

export function cleanText(text: string): string {
  return text
    .replace(/\{\{物品\|([^|}]+)[^}]*\}\}/g, "$1")
    .replace(/\[\[([^|\]]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/'{2,5}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 解析一个模板片段为 0..n 个 Block
function templateToBlocks(inner: string): Block[] {
  const parts = splitTop(inner);
  const name = (parts[0] ?? "").trim();
  const arg = (n: number) => {
    const v = parts[n] ?? "";
    const eq = v.indexOf("=");
    return cleanText(eq > 0 && /^[^\d]/.test(v.slice(0, eq)) ? v.slice(eq + 1) : v);
  };
  switch (name) {
    case "任务简介":
      return [{ type: "intro", text: arg(1) }];
    case "目标":
      return [{ type: "goal", text: arg(1) }];
    case "高亮":
      return [{ type: "highlight", text: arg(1) }];
    case "成就ask":
    case "成就":
      return [{ type: "achievement", text: arg(1) }];
    case "对话":
    case "偷听":
      return [{ type: "dialog", actor: arg(1), text: arg(2) }];
    case "转场":
    case "跳过动画":
      return [{ type: "transition", text: arg(1) }];
    case "quote":
      return [{ type: "quote", text: arg(1) }];
    case "主题词":
      return [{ type: "quote", text: arg(2) }];
    case "物品框":
    case "邮件":
    case "称呼差分":
    case "人物图":
    case "分页":
    case "需要帮助":
    case "正在施工":
    case "DISPLAYTITLE":
    case "剧透":
      return [];
    default: {
      // 未知模板：取首个位置参数文本，无则丢弃
      const first = cleanText(parts[1] ?? "");
      if (first && first.length < 120 && !first.includes("=")) return [{ type: "p", text: first }];
      return [];
    }
  }
}

// wikitext → 分节结构。行级语法（== 标题 ==、* 列表）与行内模板统一处理。
export function parseWikitext(wikitext: string): WikiSection[] {
  const sections: WikiSection[] = [{ heading: null, blocks: [] }];
  const lines = wikitext.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const heading = /^={2,4}\s*(.+?)\s*={2,4}$/.exec(line);
    if (heading) {
      sections.push({ heading: cleanText(heading[1]), blocks: [] });
      continue;
    }
    const step = /^\*\s*(.+)$/.exec(line);
    if (step) {
      // 行内模板逐个替换为块，纯文本作为 step
      let rest = step[1];
      let emitted = false;
      for (let i = 0; i < rest.length; ) {
        if (rest.startsWith("{{", i)) {
          const tpl = findTemplate(rest, i);
          if (tpl) {
            const blocks = templateToBlocks(tpl.inner);
            if (blocks.length) (sections.at(-1)!.blocks.push(...blocks), (emitted = true));
            i = tpl.end;
            continue;
          }
        }
        const next = rest.indexOf("{{", i);
        const chunk = next < 0 ? rest.slice(i) : rest.slice(i, next);
        const cleaned = cleanText(chunk);
        if (cleaned) (sections.at(-1)!.blocks.push({ type: "step", text: cleaned }), (emitted = true));
        i = next < 0 ? rest.length : next;
      }
      if (!emitted) sections.at(-1)!.blocks.push({ type: "step", text: "" });
      continue;
    }
    if (!line.trim()) continue;
    // 行内模板与文本
    let i = 0;
    let buffer = "";
    const flush = () => {
      const cleaned = cleanText(buffer);
      if (cleaned) sections.at(-1)!.blocks.push({ type: "p", text: cleaned });
      buffer = "";
    };
    while (i < line.length) {
      if (line.startsWith("{{", i)) {
        const tpl = findTemplate(line, i);
        if (tpl) {
          flush();
          sections.at(-1)!.blocks.push(...templateToBlocks(tpl.inner));
          i = tpl.end;
          continue;
        }
      }
      buffer += line[i];
      i++;
    }
    flush();
  }
  // 丢空节（无任何有效块）
  return sections.filter((s) => s.blocks.some((b) => b.text || b.type === "step"));
}

// 纯文本摘要（供检索/卡片用）
export function wikitextToSummary(wikitext: string, maxLen = 300): string {
  const sections = parseWikitext(wikitext);
  const parts: string[] = [];
  for (const s of sections) {
    for (const b of s.blocks) {
      if (b.type === "p" || b.type === "intro" || b.type === "highlight") parts.push(b.text);
      if (parts.join("").length > maxLen) break;
    }
    if (parts.join("").length > maxLen) break;
  }
  return parts.join(" ").slice(0, maxLen);
}
