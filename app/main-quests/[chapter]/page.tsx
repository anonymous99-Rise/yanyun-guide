import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MAIN_QUEST_CHAPTERS, getMainQuestChapter } from "@/lib/main-quests";

export function generateStaticParams() {
  return MAIN_QUEST_CHAPTERS.map((c) => ({ chapter: c.key }));
}

export async function generateMetadata({ params }: PageProps<"/main-quests/[chapter]">): Promise<Metadata> {
  const { chapter } = await params;
  const ch = getMainQuestChapter(chapter);
  if (!ch) return { title: "章节不存在" };
  return { title: `${ch.name} · 主章攻略`, description: `${ch.name}主章逐节攻略：${ch.sections.map((s) => s.title).join("、")}` };
}

export default async function MainQuestChapterPage({ params }: PageProps<"/main-quests/[chapter]">) {
  const { chapter } = await params;
  const ch = getMainQuestChapter(chapter);
  if (!ch) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs tracking-[0.2em] text-gold">主章 · {ch.region}</p>
        <h1 className="font-serif text-2xl font-semibold tracking-wide sm:text-3xl">{ch.name}</h1>
        {ch.overviewTitle && <p className="text-sm text-muted">篇章主题：{ch.overviewTitle}</p>}
        <nav className="flex flex-wrap gap-1.5 pt-1" aria-label="章节目录">
          {ch.sections.map((s) => (
            <a
              key={s.slug}
              href={`#sec-${s.section}`}
              className="rounded-full border border-border px-3 py-1.5 text-[13px] text-muted transition hover:border-accent/60 hover:text-foreground"
            >
              {s.title || `第${s.section}节`}
            </a>
          ))}
        </nav>
      </header>

      {ch.sections.map((s) => (
        <section key={s.slug} id={`sec-${s.section}`} className="scroll-mt-28 rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-serif text-xl font-semibold tracking-wide">{s.title || `第${s.section}节`}</h2>
            <span className="text-xs text-muted">第 {s.section} 节</span>
          </div>

          {s.intro && <p className="mt-3 border-l-4 border-gold bg-surface-2 px-4 py-3 text-sm leading-7">{s.intro}</p>}

          {s.goals.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs tracking-[0.25em] text-muted">任务目标</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-7">
                {s.goals.map((goal, i) => (
                  <li key={i}>{goal}</li>
                ))}
              </ol>
            </div>
          )}

          {s.steps.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs tracking-[0.25em] text-muted">流程节点</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {s.steps.map((step, i) => (
                  <li key={i} className="rounded-md bg-surface-2 px-2.5 py-1 text-[13px]">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {s.achievements.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs tracking-[0.25em] text-muted">本节成就</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {s.achievements.map((a, i) => (
                  <li key={i} className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs text-gold">
                    🏆 {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-muted">
            来源：
            <a href={s.source} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-accent">
              灰机wiki · {s.slug}
            </a>
            （CC BY-NC-SA）· 以游戏内实际流程为准
          </p>
        </section>
      ))}

      <footer className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Link href="/main-quests" className="text-sm text-muted hover:text-accent">
          ← 全部主章
        </Link>
      </footer>
    </div>
  );
}
