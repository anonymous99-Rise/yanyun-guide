# 燕云攻略

燕云十六声非官方攻略站：主章五章逐节攻略、奇遇/万事知攻略卡、五图探索清单、题库答案、6100+ 页 wiki 资料库，以及基于站内语料与网络检索聚合回答的 AI 攻略助手。

## 架构

- **Next.js 16（App Router + cacheComponents）+ Tailwind 4 + TypeScript**
- **数据三源**：
  - `guide.nidcsoft.cn`（自家站）：30 个结构化块 + 36 篇攻略正文
  - `yy16s.huijiwiki.com`（灰机wiki，CC BY-NC-SA）：6112 页全量（Playwright 过 CF 采集）
  - GameKee：探游资料库实时代理（树 / 检索 / 摘要）
- **存储**：页面渲染读 `content/*.json`（构建期打包，全静态）；AI 检索与全站搜索运行时查 Supabase Postgres
- **AI 助手**：四层聚合（站内语料 → 灰机全量 ILIKE → GameKee → DDG 网络检索），网关请求携带官方 web_search 工具（不支持自动降级），流式 SSE

## 目录

```
content/
├── guides.json            # 自家站攻略（含 markdown 正文）
├── quests.json            # 任务目录（主章/残章/奇遇/探游，两源合并）
├── datasets.json          # 探索清单/题库/门派/赛季等结构化块
└── huiji/
    ├── pages.json         # 灰机全站原始 wikitext 归档
    └── parsed/            # 解析产物（主章逐节/奇遇万事知攻略卡）
scripts/
├── sync-content.mjs       # 抓取自家站 → content/*.json
├── build-quests.mjs       # 任务两源合并
├── huiji-scrape.mjs       # 灰机全站采集（Playwright）
├── parse-huiji*.mjs       # 灰机数据解析
├── db-import.mjs          # content/ → Supabase
├── probe-gateway.mjs      # 网关对照排障
└── test-assistant.mjs     # 助手端到端测试
```

## 本地开发

Node `^22.13 || >=24`。`cp .env.example .env.local` 并填入网关与数据库配置（Supabase：`vercel link` 后 `vercel integration add supabase` → `vercel env pull`）。

```sh
npm install
npm run sync      # 可选：重新抓取自家站数据
node --env-file=.env.local scripts/db-import.mjs   # 数据入库
npm run dev       # http://127.0.0.1:3000
```

构建 `npm run build`；助手端到端测试 `node scripts/test-assistant.mjs "问题"`。

## 部署

Vercel + GitHub：环境变量 `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`（Sensitive）与 `POSTGRES_URL`（Supabase 集成自动注入）。内容更新跑 `npm run sync` 提交即自动部署；GitHub Actions（`.github/workflows/sync.yml`）每日定时同步。

## 数据来源与署名

- 站内攻略与任务事实以游戏内实际显示为准，逐任务分步流程不镜像、给原文外链
- 灰机wiki 数据遵循 **CC BY-NC-SA**，已在本站页脚与详情页署名
- GameKee 为社区资料库，本站只做目录与摘要代理
