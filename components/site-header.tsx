import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/guides", label: "攻略" },
  { href: "/quests", label: "任务" },
  { href: "/explore", label: "探游" },
  { href: "/quiz", label: "题库" },
  { href: "/assistant", label: "助手" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-accent font-serif text-lg font-semibold text-accent-foreground">
            燕
          </span>
          <span className="hidden font-serif text-lg font-semibold tracking-[0.15em] sm:block">燕云攻略</span>
        </Link>

        <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto" aria-label="主导航">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/search" className="relative w-28 sm:w-56" role="search">
          <input
            type="search"
            name="q"
            placeholder="搜攻略 / 任务 / 答案…"
            aria-label="全站搜索"
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none transition placeholder:text-muted focus:border-accent"
          />
        </form>

        <ThemeToggle />
      </div>
    </header>
  );
}
