import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#141519" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://yanyun-guide.vercel.app"),
  title: {
    default: "燕云攻略 · 燕云十六声任务攻略站",
    template: "%s · 燕云攻略",
  },
  description:
    "燕云十六声攻略：主章、残章、奇遇、探游清单、题库答案、成就收集、养成避坑与赛季追赶，配 AI 攻略助手，站内一站查全。",
  keywords: ["燕云十六声", "燕云十六声攻略", "主章", "残章", "奇遇", "探游", "题库", "成就", "养成"],
};

const themeInit = `try{if(localStorage.getItem('yy-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh flex flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
