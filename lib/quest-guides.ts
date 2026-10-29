// 奇遇/万事知攻略卡（解析自灰机wiki，CC BY-NC-SA）。
import questGuidesJson from "@/content/huiji/parsed/quest-guides.json";

export type QuestGuide = {
  name: string;
  category: "encounter" | "wanshizhi";
  source: string;
  intro: string;
  highlights: string[];
  goals: string[];
  steps: string[];
  achievements: string[];
  details?: string[];
  items?: string[];
};

type QuestGuidesFile = { license: string; encounters: QuestGuide[]; wanshizhi: QuestGuide[] };

const file = questGuidesJson as QuestGuidesFile;
export const QUEST_GUIDES: QuestGuide[] = [...file.encounters, ...file.wanshizhi];

// 条目名 → 灰机页面名（去标点匹配，供 quests 目录挂链接）
const normalize = (s: string) => s.replace(/[·（）()、\s]/g, "");
const GUIDE_INDEX = new Map(QUEST_GUIDES.map((g) => [normalize(g.name), g]));

export function findQuestGuide(name: string): QuestGuide | undefined {
  return GUIDE_INDEX.get(normalize(name));
}

// quests 目录条目名 → 灰机 slug 映射（轻量，给客户端组件）
export const GUIDE_NAME_MAP: Record<string, string> = Object.fromEntries(
  QUEST_GUIDES.map((g) => [g.name, g.name]),
);
