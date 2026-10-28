import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 攻略正文渲染。.guide-md 的样式在 globals.css。
export function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="guide-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
