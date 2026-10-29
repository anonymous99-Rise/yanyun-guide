import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";
import { GUIDES } from "@/lib/content";
import { MAIN_QUEST_CHAPTERS } from "@/lib/main-quests";
import { QUEST_GUIDES } from "@/lib/quest-guides";
import { SITE_URL, wikiHref } from "@/lib/site-meta";

export default function sitemap(): MetadataRoute.Sitemap {
  const statics = ["", "/guides", "/quests", "/explore", "/quiz", "/assistant", "/main-quests"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  const guideUrls = GUIDES.map((g) => ({
    url: `${SITE_URL}/guides/${g.slug}`,
    lastModified: g.updatedAt ? new Date(g.updatedAt) : undefined,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const mainQuests = MAIN_QUEST_CHAPTERS.map((c) => ({
    url: `${SITE_URL}/main-quests/${c.key}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const questGuides = QUEST_GUIDES.map((g) => ({
    url: `${SITE_URL}/quest-guide/${encodeURIComponent(g.name)}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  // 灰机全量词条：构建时从采集归档取标题清单（不查库）
  let wikiUrls: MetadataRoute.Sitemap = [];
  try {
    const raw = fs.readFileSync(path.resolve(import.meta.dirname, "../content/huiji/pages.json"), "utf8");
    const titles = (JSON.parse(raw).pages as { title: string }[]).map((p) => p.title);
    wikiUrls = titles.map((title) => ({
      url: `${SITE_URL}${wikiHref(title)}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  } catch {
    /* 归档缺失时跳过 wiki 页 */
  }
  return [...statics, ...mainQuests, ...guideUrls, ...questGuides, ...wikiUrls];
}
