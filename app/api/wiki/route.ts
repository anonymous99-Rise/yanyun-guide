// 探游资料库代理路由：tree / search / article
import { getArticle, getTree, searchLeaves } from "@/lib/wiki";

export const maxDuration = 30;

function digits(value: string | null, fallback: string) {
  return value && /^\d{1,12}$/.test(value) ? value : fallback;
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const route = params.get("route") ?? "tree";

  try {
    if (route === "tree") {
      return Response.json({ ok: true, ...(await getTree(digits(params.get("pid"), "0"))) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (route === "search") {
      const query = (params.get("q") ?? "").trim().slice(0, 40);
      if (!query) return Response.json({ ok: false, error: "invalid_query" }, { status: 400 });
      return Response.json(
        { ok: true, matches: await searchLeaves(query, Number(digits(params.get("pid"), "0"))) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (route === "article") {
      const id = params.get("id");
      if (!id || !/^\d{1,12}$/.test(id)) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
      const article = await getArticle(id);
      return Response.json({ ok: true, article }, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ ok: false, error: "unknown_route" }, { status: 404 });
  } catch {
    return Response.json({ ok: false, error: "wiki_unavailable" }, { status: 502 });
  }
}
