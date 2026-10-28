import type { ReactNode } from "react";

// 数据驱动攻略页的通用渲染器。数据块有四种形状，统一归一化后输出：
// 1. regions[] 分组条目（探索清单 / 支线 / 事件 / 见闻 / 猫狗）
// 2. groups[] 分组条目（成就索引）或 items[] 平铺（射覆 / 文津馆 / 答题成就）
// 3. days[] 按天分组（入港稽查 ships）
// 4. quests[] 分步任务（万事知）
// 其余标量字段进「要点」信息区，tips 与 route（推荐路线）单独成块。

type Item = Record<string, unknown>;
type Section = { title: string; note?: string; items: Item[] };

const FIELD_LABELS: [string, string][] = [
  ["location", "位置"],
  ["route", "路线"],
  ["hint", "提示"],
  ["time", "时辰"],
  ["unlock", "解锁"],
  ["verdict", "裁决"],
  ["marks", "疑点"],
  ["answer", "答案"],
  ["summary", "简介"],
  ["note", "备注"],
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalize(data: Record<string, unknown>): { sections: Section[]; extras: [string, string][] } {
  const sections: Section[] = [];
  const extras: [string, string][] = [];

  if (Array.isArray(data.regions)) {
    for (const region of data.regions as Record<string, unknown>[]) {
      sections.push({
        title: str(region.name) || "条目",
        note: str(region.note) || undefined,
        items: Array.isArray(region.items) ? (region.items as Item[]) : [],
      });
    }
  } else if (Array.isArray(data.groups)) {
    for (const group of data.groups as Record<string, unknown>[]) {
      sections.push({
        title: str(group.title) || "分组",
        note: undefined,
        items: Array.isArray(group.items) ? (group.items as Item[]) : [],
      });
    }
  } else if (Array.isArray(data.days)) {
    for (const day of data.days as Record<string, unknown>[]) {
      sections.push({
        title: `第 ${str(day.day) || "?"} 天`,
        note: undefined,
        items: Array.isArray(day.ships) ? (day.ships as Item[]) : [],
      });
    }
    if (str(data.start)) extras.push(["起始", str(data.start)]);
  } else if (Array.isArray(data.quests)) {
    sections.push({ title: "任务清单", note: undefined, items: data.quests as Item[] });
  } else if (Array.isArray(data.items)) {
    sections.push({ title: "", note: undefined, items: data.items as Item[] });
  }

  for (const [key, label] of [
    ["note", "说明"],
    ["location", "位置"],
    ["start", "起始"],
    ["loop", "循环"],
  ] as [string, string][]) {
    if (typeof data[key] === "string") extras.push([label, data[key] as string]);
  }
  return { sections, extras };
}

function ItemCard({ item, index }: { item: Item; index: number }) {
  const title = str(item.name) || str(item.clue) || str(item.q) || str(item.title) || `条目 ${index + 1}`;
  const badge = str(item.type) || str(item.tag) || undefined;
  const answer = str(item.answer) || str(item.a);

  return (
    <li className="rounded-lg border border-border bg-surface px-3.5 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium">{title}</span>
        {badge && (
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">{badge}</span>
        )}
        {answer && <span className="text-[15px] font-semibold text-gold">→ {answer}</span>}
      </div>
      <ItemLines item={item} skip={["name", "clue", "q", "title", "type", "tag", "answer", "a", "id", "url"]} />
      {Array.isArray(item.steps) && item.steps.length > 0 && (
        <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[13px] leading-6 text-muted">
          {(item.steps as unknown[]).map((step, i) => (
            <li key={i}>{String(step)}</li>
          ))}
        </ol>
      )}
    </li>
  );
}

function ItemLines({ item, skip }: { item: Item; skip: string[] }) {
  const lines: ReactNode[] = [];
  for (const [key, label] of FIELD_LABELS) {
    if (skip.includes(key)) continue;
    const value = str(item[key]);
    if (!value) continue;
    lines.push(
      <p key={key} className="mt-1 text-[13px] leading-6">
        <span className="text-muted">{label}：</span>
        {key === "answer" || key === "verdict" ? <strong className="text-gold">{value}</strong> : value}
      </p>,
    );
  }
  const reversible = item.reversible === false;
  if (reversible) {
    lines.push(
      <p key="rev" className="mt-1 text-[13px] text-accent">
        不可回溯，做前想清楚。
      </p>,
    );
  }
  if (lines.length === 0) return null;
  return <div>{lines}</div>;
}

export function DatasetView({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const { sections, extras } = normalize(record);

  return (
    <div className="flex flex-col gap-6">
      {extras.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm leading-7">
          {extras.map(([label, value]) => (
            <p key={label}>
              <span className="text-muted">{label}：</span>
              {value}
            </p>
          ))}
        </div>
      )}

      {Array.isArray(record.tips) && record.tips.length > 0 && (
        <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3">
          <h2 className="text-xs tracking-[0.25em] text-muted">要点</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-6">
            {(record.tips as unknown[]).map((tip, i) => (
              <li key={i}>{String(tip)}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(record.route) && record.route.length > 0 && (
        <div>
          <h2 className="text-xs tracking-[0.25em] text-muted">推荐路线</h2>
          <ol className="mt-2 flex flex-col gap-1.5">
            {(record.route as Record<string, unknown>[]).map((step, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm leading-7">
                <span className="font-mono text-xs text-gold">{str(step.order) || i + 1}</span>
                <strong>{str(step.area)}</strong>
                <span className="text-muted">{str(step.note)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {sections.map((section, i) => (
        <section key={i} className="flex flex-col gap-2.5">
          {section.title && <h2 className="font-serif text-lg font-semibold tracking-wide">{section.title}</h2>}
          {section.note && <p className="text-[13px] leading-6 text-muted">{section.note}</p>}
          <ul className="grid gap-2">
            {section.items.map((item, j) => (
              <ItemCard key={str(item.id) || j} item={item} index={j} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
