import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DATA_DRIVEN_BLOCKS, getDataset, getGuide, listGuides } from "@/lib/content";
import { MarkdownBody } from "@/components/markdown-body";
import { DatasetView } from "@/components/dataset-view";

export function generateStaticParams() {
  return listGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "攻略不存在" };
  return { title: guide.title, description: guide.summary };
}

const CHECKLIST_SLUGS = new Set([
  "qinghe-checklist",
  "kaifeng-checklist",
  "hexi-checklist",
  "bujian-checklist",
  "hangzhou-checklist",
]);

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const blockKey = DATA_DRIVEN_BLOCKS[slug];
  const block = blockKey ? getDataset(blockKey) : undefined;
  const related = listGuides(guide.category).filter((g) => g.slug !== slug).slice(0, 4);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs tracking-[0.2em] text-gold">{guide.categoryLabel}</p>
        <h1 className="font-serif text-2xl font-semibold leading-snug tracking-wide sm:text-3xl">{guide.title}</h1>
        <p className="text-sm text-muted">
          {guide.version} · 更新 {guide.updatedAt}
          {guide.dataDriven && " · 结构化清单"}
        </p>
        {guide.tldr && (
          <p className="rounded-lg border-l-4 border-gold bg-surface-2 px-4 py-3 text-sm leading-7">
            <strong className="font-serif">一句话结论：</strong>
            {guide.tldr}
          </p>
        )}
      </header>

      {CHECKLIST_SLUGS.has(slug) && (
        <p className="rounded-lg border border-moss/40 bg-moss/10 px-4 py-2.5 text-[13px] leading-6">
          想边玩边勾进度？<Link href="/explore" className="text-accent underline underline-offset-4">探游页有可勾选版本</Link>，进度存在本机。
        </p>
      )}

      {guide.bodyMd ? (
        <MarkdownBody text={guide.bodyMd} />
      ) : block ? (
        <DatasetView data={block} />
      ) : null}

      {related.length > 0 && (
        <footer className="mt-6 border-t border-border pt-4">
          <h2 className="text-xs tracking-[0.25em] text-muted">相关攻略</h2>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {related.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="inline-block rounded-full border border-border px-3 py-1.5 text-[13px] text-muted transition hover:border-accent/60 hover:text-foreground"
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}
