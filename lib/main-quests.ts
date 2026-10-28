// 主章逐节攻略（解析自灰机wiki，CC BY-NC-SA）。
import mainQuestsJson from "@/content/huiji/parsed/main-quests.json";

export type MainQuestSection = {
  slug: string;
  section: string;
  title: string;
  intro: string;
  goals: string[];
  steps: string[];
  achievements: string[];
  source: string;
};

export type MainQuestChapter = {
  key: string;
  name: string;
  region: string;
  overviewTitle: string;
  sectionCount: number;
  sections: MainQuestSection[];
};

export const MAIN_QUEST_CHAPTERS = mainQuestsJson.chapters as MainQuestChapter[];

export function getMainQuestChapter(key: string): MainQuestChapter | undefined {
  return MAIN_QUEST_CHAPTERS.find((c) => c.key === key);
}
