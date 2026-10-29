// 站点级常量（无数据依赖，客户端/服务端共用）
export const DATA_AS_OF = "2026-10";

export const SITE_NAME = "燕云攻略";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yanyun-guide.vercel.app";

// wiki 标题含「/」的子页面用多段路径，避免 %2F 被 404
export function wikiHref(title: string): string {
  return "/wiki/" + title.split("/").map(encodeURIComponent).join("/");
}
