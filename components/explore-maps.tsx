"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id?: string;
  type?: string;
  name?: string;
  location?: string;
  route?: string;
  hint?: string;
  time?: string;
  note?: string;
  steps?: string[];
};
type Region = { id?: string; name?: string; note?: string; items?: Item[] };
type MapData = {
  regions?: Region[];
  tips?: string[];
  jingyuan?: { note?: string } & Record<string, unknown>;
  route?: { order?: string; area?: string; note?: string }[];
  note?: string;
};
export type ExploreMapInfo = { key: string; name: string; data: unknown };

const TYPE_TABS = [
  { id: "all", label: "全部" },
  { id: "蹊跷", label: "蹊跷" },
  { id: "宝箱", label: "宝箱" },
];

function storageKey(mapKey: string, itemId: string) {
  return `yy-explore:${mapKey}:${itemId}`;
}

export function ExploreMaps({ maps }: { maps: ExploreMapInfo[] }) {
  const [activeName, setActiveName] = useState(maps[0]?.name ?? "");
  const active = maps.find((m) => m.name === activeName) ?? maps[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="选择地图">
        {maps.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={m.name === activeName}
            onClick={() => setActiveName(m.name)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              m.name === activeName ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
      {active && <MapChecklist mapKey={active.key} data={active.data as MapData} />}
    </div>
  );
}

function MapChecklist({ mapKey, data }: { mapKey: string; data: MapData }) {
  const regions = data.regions ?? [];
  const [typeFilter, setTypeFilter] = useState("all");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const found: Record<string, boolean> = {};
    try {
      for (const region of regions) {
        for (const item of region.items ?? []) {
          const id = String(item.id ?? "");
          if (id) found[id] = localStorage.getItem(storageKey(mapKey, id)) === "1";
        }
      }
    } catch {
      /* storage 被禁用时全部视为未勾选 */
    }
    setChecked(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey]);

  function toggle(id: string) {
    const next = !checked[id];
    setChecked((past) => ({ ...past, [id]: next }));
    try {
      if (next) localStorage.setItem(storageKey(mapKey, id), "1");
      else localStorage.removeItem(storageKey(mapKey, id));
    } catch {
      /* ignore */
    }
  }

  const allItems = useMemo(() => regions.flatMap((r) => r.items ?? []), [regions]);
  const doneCount = allItems.filter((item) => checked[String(item.id ?? "")]).length;
  const totalCount = allItems.length;

  const visibleRegions = useMemo(
    () =>
      regions.map((region) => ({
        ...region,
        items: (region.items ?? []).filter((item) => typeFilter === "all" || item.type === typeFilter),
      })),
    [regions, typeFilter],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted">
          总进度 <strong className="text-foreground">{doneCount}</strong> / {totalCount}
        </p>
        <div className="h-1.5 w-40 overflow-hidden rounded bg-surface-2" role="progressbar" aria-valuenow={doneCount} aria-valuemax={totalCount}>
          <div className="h-full bg-moss transition-all" style={{ width: totalCount ? `${(doneCount / totalCount) * 100}%` : "0%" }} />
        </div>
        <div className="ml-auto flex gap-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              aria-pressed={typeFilter === tab.id}
              className={`rounded-full border px-2.5 py-1.5 text-xs transition ${
                typeFilter === tab.id ? "border-gold bg-gold/15 text-gold" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {data.jingyuan?.note && (
        <p className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-[13px] leading-6">
          <span className="text-muted">精元：</span>
          {data.jingyuan.note}
        </p>
      )}

      {Array.isArray(data.tips) && data.tips.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-[13px] leading-6">
          {data.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      )}

      {Array.isArray(data.route) && data.route.length > 0 && (
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-6 text-muted">
          {data.route.map((step, i) => (
            <li key={i}>
              <span className="font-mono text-xs text-gold">{step.order ?? i + 1}</span> <strong className="text-foreground">{step.area}</strong> {step.note}
            </li>
          ))}
        </ol>
      )}

      {visibleRegions.map((region) => (
        <section key={region.id ?? region.name} className="flex flex-col gap-2">
          <h2 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold tracking-[0.15em] text-muted">
            {region.name}
            {region.note && <span className="text-xs font-normal leading-5">{region.note}</span>}
          </h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {(region.items ?? []).map((item, i) => {
              const id = String(item.id ?? `${region.id}-${i}`);
              const isChecked = Boolean(checked[id]);
              return (
                <li
                  key={id}
                  className={`rounded-lg border px-3.5 py-3 transition ${
                    isChecked ? "border-moss/50 bg-moss/10" : "border-border bg-surface"
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(id)}
                      className="mt-1 size-4 shrink-0 accent-[var(--moss)]"
                      aria-label={`标记 ${item.name ?? id}`}
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className={`font-medium ${isChecked ? "line-through opacity-60" : ""}`}>{item.name}</span>
                        {item.type && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] ${
                              item.type === "蹊跷" ? "bg-accent/10 text-accent" : "bg-gold/15 text-gold"
                            }`}
                          >
                            {item.type}
                          </span>
                        )}
                        {item.time && <span className="text-[11px] text-muted">{item.time}</span>}
                      </span>
                      {item.location && <span className="mt-0.5 block text-[13px] leading-6"><span className="text-muted">位置：</span>{item.location}</span>}
                      {item.route && <span className="block text-[13px] leading-6"><span className="text-muted">路线：</span>{item.route}</span>}
                      {item.hint && <span className="block text-[13px] leading-6"><span className="text-muted">提示：</span>{item.hint}</span>}
                      {item.note && <span className="block text-[13px] leading-6 text-muted">{item.note}</span>}
                      {item.steps && (
                        <span className="mt-1 block list-decimal pl-5 text-[13px] leading-6 text-muted">
                          {item.steps.map((step, j) => (
                            <span key={j} className="block">
                              {step}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
