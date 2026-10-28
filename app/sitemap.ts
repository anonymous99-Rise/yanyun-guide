import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/content";
import { MAIN_QUEST_CHAPTERS } from "@/lib/main-quests";
import { SITE_URL } from "@/lib/site-meta";

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
  return [...statics, ...mainQuests, ...guideUrls];
}
