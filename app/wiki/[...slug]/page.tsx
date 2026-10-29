import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getHuijiPage } from "@/lib/queries";
import { parseWikitext } from "@/lib/wikitext";
import { WikiBlocks } from "@/components/wiki-blocks";
import { AskAssistantButton } from "@/components/ask-assistant-button";

// 标题含「/」的子页面（如 最忆江南/1）占 1000+ 页，用 catch-all 多段拼回原始标题
export function wikiHref(title: string): string {
  return "/wiki/" + title.split("/").map(encodeURIComponent).join("/");
}

function decodeTitle(slug: string[]): string {
  try {
    return slug.map(decodeURIComponent).join("/");
  } catch {
    return slug.map((s) => s).join("/");
  }
}

export async function generateMetadata({ params }: PageProps<"/wiki/[...slug]">): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeTitle(slug);
  return { title: `${decoded} · 燕云wiki`, description: `${decoded}的燕云十六声资料与攻略。` };
}

export default function WikiPage({ params }: PageProps<"/wiki/[...slug]">) {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <WikiContent params={params} />
    </Suspense>
  );
}

async function WikiContent({ params }: { params: PageProps<"/wiki/[...slug]">["params"] }) {
  const { slug } = await params;
  const decoded = decodeTitle(slug);
  const page = await getHuijiPage(decoded);
  if (!page) notFound();

  const sections = parseWikitext(page.wikitext);
  const plain = sections
    .flatMap((s) => s.blocks.map((b) => ("text" in b ? b.text : "")))
    .filter(Boolean)
    .join("\n")
    .slice(0, 3000);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs tracking-[0.2em] text-gold">燕云wiki · {page.categories.slice(0, 3).join(" / ") || "资料"}</p>
        <h1 className="font-serif text-2xl font-semibold tracking-wide sm:text-3xl">{decoded}</h1>
        <div className="flex flex-wrap gap-2">
          <AskAssistantButton
            context={plain}
            label={decoded}
            className="rounded-md border border-accent/50 bg-accent/5 px-3 py-1.5 text-[13px] text-accent transition hover:bg-accent/15"
          />
          <Link href="/explore" className="rounded-md border border-border px-3 py-1.5 text-[13px] text-muted transition hover:text-foreground">
            ← 探游与资料库
          </Link>
        </div>
      </header>

      {sections.map((section, i) => (
        <section key={i} className="flex flex-col gap-2">
          {section.heading && <h2 className="border-l-4 border-accent pl-2.5 font-serif text-lg font-semibold">{section.heading}</h2>}
          <WikiBlocks blocks={section.blocks} />
        </section>
      ))}

      <footer className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted">
        <p>
          来源：
          <a href={page.source} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-accent">
            灰机wiki · {decoded}
          </a>
          （CC BY-NC-SA）· 内容可能随版本更新，以游戏内为准
        </p>
      </footer>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="h-8 w-2/3 animate-pulse rounded bg-surface-2" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-surface-2" style={{ width: `${90 - i * 6}%` }} />
        ))}
      </div>
    </div>
  );
}
