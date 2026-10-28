import Link from "next/link";
import { QUEST_ENTRIES, getDataset, listGuides } from "@/lib/content";

type Season = {
  name: string;
  patch: string;
  summary: string;
  weekTip?: { items?: { label: string; href: string; note?: string }[] };
};

const CATEGORY_CARDS = [
  { href: "/quests?category=main", title: "主章", desc: "主线章节顺序与任务清单" },
  { href: "/quests?category=remnant", title: "残章", desc: "各州城支线，含触发路线" },
  { href: "/quests?category=encounter", title: "奇遇", desc: "江湖际遇与触发条件" },
  { href: "/explore", title: "探游", desc: "五图探索清单与资料库" },
  { href: "/quiz", title: "题库", desc: "射覆 · 文津馆 · 入港稽查" },
  { href: "/guides", title: "全篇攻略", desc: "养成 · 装备 · 副本 · 成就" },
];

export default function HomePage() {
  const season = getDataset("season") as Season | undefined;
  const guides = listGuides();
  const questCount = QUEST_ENTRIES.length;
  const hot = guides.filter((g) => g.hot).slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      {season && (
        <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">当前赛季</span>
            <h1 className="font-serif text-xl font-semibold tracking-wide">{season.name}</h1>
            <span className="text-sm text-muted">{season.patch}</span>
          </div>
          <p className="mt-3 text-sm leading-7 text-muted">{season.summary}</p>
          {season.weekTip?.items && season.weekTip.items.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {season.weekTip.items.map((tip) => (
                <li key={tip.label}>
                  <Link
                    href={internalize(tip.href)}
                    className="inline-flex items-baseline gap-1.5 rounded-full border border-border px-3 py-1 text-[13px] transition hover:border-gold hover:text-gold"
                  >
                    {tip.label}
                    {tip.note && <span className="text-xs text-muted">{tip.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="font-serif text-lg font-semibold tracking-wide">从哪里开始</h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_CARDS.map((card) => (
            <li key={card.href + card.title}>
              <Link
                href={card.href}
                className="block h-full rounded-lg border border-border bg-surface px-4 py-3.5 transition hover:border-accent/60 hover:bg-surface-2"
              >
                <span className="font-serif text-base font-semibold tracking-wide">{card.title}</span>
                <p className="mt-1 text-[13px] leading-6 text-muted">{card.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold tracking-wide">热门攻略</h2>
          <Link href="/guides" className="text-sm text-muted hover:text-accent">
            全部 {guides.length} 篇 →
          </Link>
        </div>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {hot.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guides/${guide.slug}`}
                className="block h-full rounded-lg border border-border bg-surface px-4 py-3.5 transition hover:border-accent/60 hover:bg-surface-2"
              >
                <span className="font-medium">{guide.title}</span>
                <p className="mt-1 text-[13px] leading-6 text-muted">{guide.summary}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {guide.categoryLabel} · 更新 {guide.updatedAt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-gold/40 bg-gold/10 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-base font-semibold tracking-wide">卡关了？问 AI 攻略助手</h2>
            <p className="mt-1 text-[13px] leading-6 text-muted">
              基于 {guides.length} 篇攻略与 {questCount} 条任务数据作答，答不出会直说。
            </p>
          </div>
          <Link
            href="/assistant"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            开始提问
          </Link>
        </div>
      </section>
    </div>
  );
}

// 赛季提示里的 href 是原站相对路径，转成站内路由
function internalize(href: string): string {
  if (href.startsWith("guides/")) return "/guides/" + href.slice("guides/".length).replace(/\.html$/, "");
  if (href.startsWith("/")) return href;
  return "/" + href.replace(/\.html$/, "");
}
