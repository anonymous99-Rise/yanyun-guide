import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/content";
import { SITE_URL } from "@/lib/site-meta";

export default function sitemap(): MetadataRoute.Sitemap {
  const statics = ["", "/guides", "/quests", "/explore", "/quiz", "/assistant"].map((path) => ({
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
  return [...statics, ...guideUrls];
}
