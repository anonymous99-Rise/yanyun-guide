// 网关对照实验：逐项逼近 Claude Code 的真实请求形状，找出失败的差异项
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync("D:/devProject/Qoder/.env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const BASE = env.ANTHROPIC_BASE_URL.replace(/\/+$/, "");
const TOKEN = env.ANTHROPIC_AUTH_TOKEN;

async function probe(label, { model, body, headers = {} }) {
  try {
    const res = await fetch(`${BASE}/v1/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ model, stream: true, ...body }),
      signal: AbortSignal.timeout(45000),
    });
    const text = await res.text();
    let verdict;
    if (res.ok && text.includes("content_block")) verdict = "✓ 通";
    else {
      try {
        const j = JSON.parse(text);
        verdict = `✗ ${res.status} ${j.error?.message?.slice(0, 90) ?? text.slice(0, 90)}`;
      } catch {
        verdict = `✗ ${res.status} ${text.slice(0, 60)}`;
      }
    }
    console.log(`[${label}] ${verdict}`);
    return res.ok;
  } catch (e) {
    console.log(`[${label}] ✗ 异常 ${e.message.slice(0, 80)}`);
    return false;
  }
}

const CC_UA = { "user-agent": "claude-cli/2.0.55 (external, cli)", "x-app": "cli" };
const CC_BETA = { "anthropic-beta": "claude-code-20250219,oauth-2025-04-20" };
const ccSystem = [{ type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." }];
const ccMeta = { user_id: "user_8f4a2b1c7d9e0f3a_account_5e4d3c2b-1a2b-3c4d-5e6f-7a8b9c0d1e2f" };

// 1. 基线：攻略站当前请求（haiku + thinking disabled + 纯文本 system）
await probe("1 攻略站现状(haiku+thinking)", {
  model: "claude-haiku-4-5",
  body: { max_tokens: 100, thinking: { type: "disabled" }, system: "测试", messages: [{ role: "user", content: "回复:OK" }] },
});

// 2. Node fetch 直测 haiku（无 thinking）
await probe("2 haiku 无thinking", {
  model: "claude-haiku-4-5",
  body: { max_tokens: 100, messages: [{ role: "user", content: "回复:OK" }] },
});

// 3. haiku + CC UA
await probe("3 haiku + CC UA", {
  model: "claude-haiku-4-5",
  body: { max_tokens: 100, messages: [{ role: "user", content: "回复:OK" }] },
  headers: CC_UA,
});

// 4. sonnet-4-6[1M] + CC 全套特征（UA + beta + system 数组 + metadata）
await probe("4 [1M] + CC全套", {
  model: "claude-sonnet-4-6[1M]",
  body: { max_tokens: 100, system: ccSystem, messages: [{ role: "user", content: [{ type: "text", text: "回复:OK" }] }], metadata: ccMeta },
  headers: { ...CC_UA, ...CC_BETA },
});

// 5. sonnet-4-6（无后缀）+ CC 全套特征
await probe("5 sonnet + CC全套", {
  model: "claude-sonnet-4-6",
  body: { max_tokens: 100, system: ccSystem, messages: [{ role: "user", content: [{ type: "text", text: "回复:OK" }] }], metadata: ccMeta },
  headers: { ...CC_UA, ...CC_BETA },
});

// 6. haiku + CC 全套特征
await probe("6 haiku + CC全套", {
  model: "claude-haiku-4-5",
  body: { max_tokens: 100, system: ccSystem, messages: [{ role: "user", content: [{ type: "text", text: "回复:OK" }] }], metadata: ccMeta },
  headers: { ...CC_UA, ...CC_BETA },
});

// 7. max_tokens 大值（Claude Code 用 32000）
await probe("7 haiku + max_tokens 32000", {
  model: "claude-haiku-4-5",
  body: { max_tokens: 32000, messages: [{ role: "user", content: "回复:OK" }] },
  headers: CC_UA,
});
