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
      {/* 移动端：一行 logo + 搜索 + 主题，导航第二行横滑；桌面单行 */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-2 py-2.5 sm:gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-accent font-serif text-lg font-semibold text-accent-foreground">
              燕
            </span>
            <span className="hidden font-serif text-lg font-semibold tracking-[0.15em] md:block">燕云攻略</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-0.5 md:flex" aria-label="主导航">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form action="/search" className="relative ml-auto hidden w-56 md:block lg:w-64" role="search">
            <input
              type="search"
              name="q"
              placeholder="搜攻略 / 任务 / 答案…"
              aria-label="全站搜索"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-accent"
            />
          </form>

          <Link
            href="/search"
            aria-label="全站搜索"
            className="ml-auto rounded-md border border-border px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-accent md:hidden"
          >
            搜索
          </Link>

          <ThemeToggle />
        </div>

        <nav className="flex gap-1 overflow-x-auto pb-2 md:hidden" aria-label="主导航">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-[13px] text-muted transition hover:border-accent/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
