import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QUEST_GUIDES } from "@/lib/quest-guides";

export function generateStaticParams() {
  return QUEST_GUIDES.map((g) => ({ name: g.name }));
}

export async function generateMetadata({ params }: PageProps<"/quest-guide/[name]">): Promise<Metadata> {
  const { name } = await params;
  const guide = QUEST_GUIDES.find((g) => g.name === name);
  if (!guide) return { title: "条目不存在" };
  const kind = guide.category === "wanshizhi" ? "万事知" : "奇遇";
  return { title: `${name} · ${kind}攻略`, description: guide.intro || guide.highlights.join("；") || `${name}的${kind}攻略要点。` };
}

export default async function QuestGuidePage({ params }: PageProps<"/quest-guide/[name]">) {
  const { name } = await params;
  const guide = QUEST_GUIDES.find((g) => g.name === name);
  if (!guide) notFound();
  const kind = guide.category === "wanshizhi" ? "万事知" : "奇遇";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs tracking-[0.2em] text-gold">{kind}</p>
        <h1 className="font-serif text-2xl font-semibold tracking-wide sm:text-3xl">{guide.name}</h1>
        {guide.intro && (
          <p className="rounded-lg border-l-4 border-gold bg-surface-2 px-4 py-3 text-sm leading-7">{guide.intro}</p>
        )}
      </header>

      {guide.highlights.length > 0 && (
        <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3">
          <h2 className="text-xs tracking-[0.25em] text-muted">触发提示</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-7">
            {guide.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {guide.goals.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.25em] text-muted">任务目标</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-7">
            {guide.goals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ol>
        </section>
      )}

      {guide.steps.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.25em] text-muted">流程节点</h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {guide.steps.map((s, i) => (
              <li key={i} className="rounded-md bg-surface-2 px-2.5 py-1 text-[13px]">
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {guide.details && guide.details.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.25em] text-muted">攻略要点</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-7">
            {guide.details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ol>
        </section>
      )}

      {guide.items && guide.items.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.25em] text-muted">关联物品</h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {guide.items.map((item, i) => (
              <li key={i} className="rounded-full border border-border px-2.5 py-1 text-[13px] text-muted">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {guide.achievements.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.25em] text-muted">相关成就</h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {guide.achievements.map((a, i) => (
              <li key={i} className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs text-gold">
                🏆 {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted">
        <p>
          来源：
          <a href={guide.source} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-accent">
            灰机wiki · {guide.name}
          </a>
          （CC BY-NC-SA）· 以游戏内实际触发为准
        </p>
        <Link href="/quests" className="hover:text-accent">
          ← 返回任务目录
        </Link>
      </footer>
    </div>
  );
}
