import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = "https://theresanaiforthat.com/mcp/";
const version = "1.0.1";

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
}

const cursor = readJson("mcp.json");
assert.equal(cursor.mcpServers?.taaft?.url, endpoint);
assert.equal(readJson(".cursor-plugin/plugin.json").version, version);
assert.equal(readJson("package.json").version, version);

const registry = readJson("server.json");
assert.equal(registry.name, "com.theresanaiforthat/taaft");
assert.equal(registry.version, version);
assert.deepEqual(registry.remotes, [
  { type: "streamable-http", url: endpoint },
]);

const vscode = readJson(".vscode/mcp.json");
assert.deepEqual(vscode.servers?.taaft, {
  type: "http",
  url: endpoint,
});

const claudeMarketplace = readJson(".claude-plugin/marketplace.json");
assert.equal(claudeMarketplace.plugins?.[0]?.name, "taaft");
assert.equal(
  claudeMarketplace.plugins?.[0]?.source,
  "./plugins/claude/taaft",
);

const claude = readJson("plugins/claude/taaft/.mcp.json");
assert.equal(
  readJson("plugins/claude/taaft/.claude-plugin/plugin.json").version,
  version,
);
assert.deepEqual(claude.mcpServers?.taaft, {
  type: "http",
  url: endpoint,
});

const openAiMarketplace = readJson(".agents/plugins/marketplace.json");
assert.equal(openAiMarketplace.plugins?.[0]?.name, "taaft");
assert.equal(
  openAiMarketplace.plugins?.[0]?.source?.path,
  "./plugins/openai/taaft",
);

const openAi = readJson("plugins/openai/taaft/.mcp.json");
assert.equal(
  readJson("plugins/openai/taaft/.codex-plugin/plugin.json").version,
  version,
);
assert.deepEqual(openAi.taaft, { url: endpoint });

const antigravity = readJson(
  "plugins/antigravity/taaft/mcp_config.json",
);
assert.deepEqual(antigravity.mcpServers?.taaft, {
  serverUrl: endpoint,
});

const grokConfig = readFileSync(
  resolve(root, ".grok/config.toml"),
  "utf8",
);
assert.match(grokConfig, /paths = \["\.\/plugins\/claude\/taaft"\]/);
assert.match(grokConfig, /enabled = \["taaft"\]/);

console.log("Cross-client packaging validation passed.");
