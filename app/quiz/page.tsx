import type { Metadata } from "next";
import { QuizBrowser } from "@/components/quiz-browser";
import { getDataset } from "@/lib/content";

export const metadata: Metadata = {
  title: "题库答案",
  description: "燕云十六声题库：射覆答案对照表、文津馆考试题库、入港稽查裁决，卡关直接搜。",
};

type Shefu = { items?: { clue?: string; answer?: string }[] };
type Wenjin = { note?: string; location?: string; items?: { q?: string; a?: string }[] };
type Rugang = { note?: string; start?: string; days?: { day?: number; ships?: { name?: string; verdict?: string; marks?: string }[] }[] };

export default function QuizPage() {
  const shefu = getDataset("shefu") as Shefu | undefined;
  const wenjin = getDataset("wenjinguan") as Wenjin | undefined;
  const rugang = getDataset("rugang") as Rugang | undefined;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-wide">题库答案</h1>
        <p className="mt-1.5 text-sm leading-7 text-muted">
          射覆、文津馆、入港稽查的答案对照，卡关直接搜关键词。
        </p>
      </header>
      <QuizBrowser shefuClues={shefu?.items ?? []} wenjin={wenjin ?? {}} rugang={rugang ?? {}} />
    </div>
  );
}
