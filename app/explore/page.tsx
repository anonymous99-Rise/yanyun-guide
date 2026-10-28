import type { Metadata } from "next";
import { ExploreMaps } from "@/components/explore-maps";
import { WikiBrowser } from "@/components/wiki-browser";
import { EXPLORE_MAPS, getDataset } from "@/lib/content";

export const metadata: Metadata = {
  title: "探游清单",
  description: "燕云十六声五图探索清单：清河、开封、河西、不见山、江南的蹊跷与宝箱点位，可勾选记进度，附社区资料库检索。",
};

export default function ExplorePage() {
  const maps = EXPLORE_MAPS.map((m) => ({ key: m.key, name: m.name, data: getDataset(m.key) }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <header>
          <h1 className="font-serif text-2xl font-semibold tracking-wide">探游清单</h1>
          <p className="mt-1.5 text-sm leading-7 text-muted">
            五张地图的蹊跷与宝箱点位，每条含地标、路线与提示。勾选进度保存在本机浏览器。
          </p>
        </header>
        <ExploreMaps maps={maps} />
      </div>
      <WikiBrowser />
    </div>
  );
}
