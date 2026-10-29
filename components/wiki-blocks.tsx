import type { Block } from "@/lib/wikitext";

// 灰机 wikitext 解析后的区块渲染
export function WikiBlocks({ blocks }: { blocks: Block[] }) {
  const visible = blocks.filter((b) => b.text || b.type === "step");
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 text-sm leading-7">
      {visible.map((block, i) => {
        switch (block.type) {
          case "goal":
            return (
              <p key={i} className="flex gap-2 rounded-md border-l-4 border-moss bg-moss/10 px-3 py-1.5 font-medium">
                <span aria-hidden>✔</span>
                {block.text}
              </p>
            );
          case "highlight":
            return (
              <p key={i} className="rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5">
                <span className="mr-1" aria-hidden>
                  ★
                </span>
                {block.text}
              </p>
            );
          case "achievement":
            return (
              <span key={i} className="mr-1.5 inline-block rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
                🏆 {block.text}
              </span>
            );
          case "dialog":
            return (
              <p key={i} className="pl-3 text-[13px] leading-6 text-muted">
                <span className="font-medium text-foreground">{block.actor}</span>：{block.text}
              </p>
            );
          case "intro":
            return (
              <p key={i} className="border-l-4 border-gold bg-surface-2 px-3 py-2 text-[13px]">
                {block.text}
              </p>
            );
          case "transition":
            return (
              <p key={i} className="text-center text-xs italic text-muted">
                —— {block.text} ——
              </p>
            );
          case "quote":
            return (
              <blockquote key={i} className="rounded-md bg-surface-2 px-3 py-2 text-[13px] italic">
                {block.text}
              </blockquote>
            );
          case "step":
            return (
              <p key={i} className="flex items-baseline gap-2">
                <span className="shrink-0 text-gold" aria-hidden>
                  •
                </span>
                {block.text}
              </p>
            );
          default:
            return <p key={i}>{block.text}</p>;
        }
      })}
    </div>
  );
}
