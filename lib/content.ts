// 类型、常量与检索算法。页面渲染读打包 JSON（全静态）；助手/搜索查库（lib/queries）。
import guidesJson from "@/content/guides.json";
import questsJson from "@/content/quests.json";
import datasetsJson from "@/content/datasets.json";

export type GuideCategory = "explore" | "quiz" | "achieve" | "grow" | "season";

export type Guide = {
  slug: string;
  title: string;
  category: GuideCategory;
  categoryLabel: string;
  summary: string;
  tldr: string;
  keywords: string;
  version: string;
  hot: boolean;
  dataDriven: boolean;
  sourceUrl: string;
  updatedAt: string;
  bodyMd: string;
};

export type QuestCategory = "main" | "remnant" | "encounter" | "explore";

export type QuestEntry = {
  id: string;
  category: QuestCategory;
  sub?: string;
  name: string;
  chapter?: string;
  region?: string;
  group?: string;
  location?: string;
  route?: string;
  unlock?: string;
  steps?: string[];
  note?: string;
  caution?: string;
  hint?: string;
  time?: string;
  source: string;
};

export const GUIDES = guidesJson as Guide[];
export const QUEST_ENTRIES = questsJson.entries as QuestEntry[];
export const MAIN_CHAPTERS = questsJson.mainChapters as string[];
export const DATA_AS_OF = questsJson.dataAsOf as string;
export const DATASETS = datasetsJson as Record<string, unknown>;

// 探游页五图清单的展示顺序
export const EXPLORE_MAPS = [
  { key: "qinghe-explore", name: "清河", file: "qinghe-explore" },
  { key: "kaifeng-explore", name: "开封", file: "kaifeng-explore" },
  { key: "hexi-explore", name: "河西", file: "hexi-explore" },
  { key: "bujian-explore", name: "不见山", file: "bujian-explore" },
  { key: "hangzhou-explore", name: "江南", file: "hangzhou-explore" },
] as const;

// 数据驱动攻略页 slug → 数据块 key（页面组件按它取数渲染）
export const DATA_DRIVEN_BLOCKS: Record<string, string> = {
  "hexi-checklist": "hexi-explore",
  "kaifeng-checklist": "kaifeng-explore",
  "qinghe-checklist": "qinghe-explore",
  "bujian-checklist": "bujian-explore",
  "hangzhou-checklist": "hangzhou-explore",
  "shefu-answers": "shefu",
  "wenjinguan-exam": "wenjinguan",
  "rugang-inspection": "rugang",
  "quiz-achievements": "quiz-achievements",
  "achievements-index": "achievements-index",
  "achieve-bangwo-paipai": "achieve-bangwo-paipai",
  "achieve-jinpai-shichi": "achieve-jinpai-shichi",
  "kaifeng-side": "kaifeng-side",
  "kaifeng-events": "kaifeng-events",
  "hexi-mamitu": "hexi-mamitu",
  "yulutai-wanshizhi": "yulutai-wanshizhi",
  "cat-dog-play": "cat-dog-play",
  "zhaoyingmiao-guide": "zhaoyingmiao",
  "cangfengzhi-guide": "cangfengzhi",
  "dawu-youhuang-guide": "dawu-youhuang",
  "hangzhou-west-guide": "hangzhou-west",
  "bupingshi-rewind": "bupingshi-rewind",
};

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function listGuides(category?: GuideCategory): Guide[] {
  return category ? GUIDES.filter((g) => g.category === category) : GUIDES;
}

export function listQuests(category?: QuestCategory): QuestEntry[] {
  return category ? QUEST_ENTRIES.filter((q) => q.category === category) : QUEST_ENTRIES;
}

export function getDataset(key: string): unknown {
  return DATASETS[key];
}

export type SearchHit = {
  kind: "guide" | "quest" | "section" | "questGuide";
  score: number;
  guide?: Guide;
  quest?: QuestEntry;
  section?: {
    slug: string;
    chapter: string;
    chapterName: string;
    region: string;
    title: string;
    intro: string;
    goals: string[];
    steps: string[];
    achievements: string[];
    source: string;
  };
  questGuide?: {
    name: string;
    category: string;
    intro: string;
    highlights: string[];
    goals: string[];
    details: string[];
    achievements: string[];
    source: string;
  };
};

// 中文检索：整词 + 2-gram 命中计分，站内搜索与 AI 检索共用。语料由调用方传入（页面用打包数据，助手查库）。
function bigrams(text: string): string[] {
  const clean = text.toLowerCase().replace(/[\s，。？！、：；·（）()「」『』\-—/\\]+/g, "");
  const grams: string[] = [];
  for (let i = 0; i < clean.length - 1; i++) grams.push(clean.slice(i, i + 2));
  return grams;
}

export function searchContent(
  query: string,
  corpus: {
    guides: Guide[];
    quests: QuestEntry[];
    mainSections?: {
      slug: string;
      chapter: string;
      chapterName: string;
      region: string;
      title: string;
      intro: string;
      goals: string[];
      steps: string[];
      achievements: string[];
      source: string;
    }[];
    questGuides?: {
      name: string;
      category: string;
      intro: string;
      highlights: string[];
      goals: string[];
      details: string[];
      achievements: string[];
      source: string;
    }[];
  },
  limit = 20,
): SearchHit[] {
  const needle = query.trim();
  if (needle.length < 1) return [];
  const grams = bigrams(needle);
  const whole = needle.toLowerCase().replace(/\s+/g, "");

  const score = (fields: (string | string[] | undefined)[]) => {
    let s = 0;
    for (const field of fields) {
      if (!field) continue;
      const hay = Array.isArray(field) ? field.join(" ").toLowerCase() : field.toLowerCase();
      const compact = hay.replace(/\s+/g, "");
      for (const gram of grams) {
        let at = 0;
        while ((at = compact.indexOf(gram, at)) >= 0) {
          s += gram === whole ? 3 : 1;
          at += gram.length;
        }
      }
      if (whole && compact.includes(whole)) s += 5;
    }
    return s;
  };

  const hits: SearchHit[] = [];
  for (const guide of corpus.guides) {
    const s = score([guide.title, guide.keywords, guide.summary, guide.tldr, guide.bodyMd.slice(0, 4000)]);
    if (s > 0) hits.push({ kind: "guide", score: s + (guide.hot ? 1 : 0), guide });
  }
  for (const quest of corpus.quests) {
    const s = score([quest.name, quest.region, quest.chapter, quest.note, quest.route, quest.location, quest.hint, quest.steps]);
    if (s > 0) hits.push({ kind: "quest", score: s, quest });
  }
  for (const section of corpus.mainSections ?? []) {
    const s = score([section.chapterName, section.region, section.title, section.intro, section.goals, section.steps]);
    if (s > 0) hits.push({ kind: "section", score: s + 2, section });
  }
  for (const qg of corpus.questGuides ?? []) {
    const s = score([qg.name, qg.category === "wanshizhi" ? "万事知" : "奇遇", qg.intro, qg.highlights, qg.goals, qg.details]);
    if (s > 0) hits.push({ kind: "questGuide", score: s + 2, questGuide: qg });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
