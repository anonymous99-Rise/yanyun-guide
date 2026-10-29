// 助手端到端测试（UTF-8 安全）：node scripts/test-assistant.mjs "问题"
const question = process.argv[2] ?? "最忆江南第一节怎么过？";
const res = await fetch("http://127.0.0.1:3000/api/assistant", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question, turns: [] }),
});
if (!res.ok || !res.body) {
  console.error("HTTP", res.status, await res.text());
  process.exit(1);
}
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
let answer = "";
let failed = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  let cut;
  while ((cut = buffer.indexOf("\n\n")) >= 0) {
    const frame = buffer.slice(0, cut);
    buffer = buffer.slice(cut + 2);
    const event = /^event:\s*(.+)$/m.exec(frame)?.[1];
    const data = JSON.parse(/^data:\s*(.*)$/m.exec(frame)?.[1] ?? "{}");
    if (event === "delta") answer += data.text ?? "";
    if (event === "final") answer = data.text ?? answer;
    if (event === "status" && data.state === "failed") failed = data.reason ?? "unknown";
  }
}
if (failed) console.error("失败:", failed);
console.log("=== 回答 ===");
console.log(answer || "(空)");
