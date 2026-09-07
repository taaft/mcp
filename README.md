# TAAFT MCP server

Remote, stateless [Model Context Protocol](https://modelcontextprotocol.io/)
server for finding AI tools in the TAAFT directory.

It exposes:

- `search_tools` — search by query, type, sort, and result limit.
- `get_tool` — retrieve public details by the slug returned from search.

The MCP endpoint is `POST /mcp`. `GET /healthz` is an unauthenticated
liveness endpoint.

## Install

The public endpoint is:

```text
https://theresanaiforthat.com/mcp/
```

It uses Streamable HTTP and requires no authentication.

### Cursor

The repository root is a Cursor plugin. For local plugin development:

```bash
mkdir -p ~/.cursor/plugins/local
ln -s "$(pwd)" ~/.cursor/plugins/local/taaft
```

Run **Developer: Reload Window**, then confirm `taaft` appears under
Customize. Remove or disable a manually configured `taaft` server to avoid a
duplicate name.

### Claude

Add the connector directly to Claude Code:

```bash
claude mcp add --transport http taaft \
  https://theresanaiforthat.com/mcp/
```

Or install the Claude plugin from this repository:

```bash
claude plugin marketplace add taaft/mcp
claude plugin install taaft@taaft-plugins
```

For Claude.ai and Claude Desktop, add a custom connector under
**Customize → Connectors** using the public endpoint and authentication
type **None**.

### Codex

Add the server directly to Codex CLI or the Codex IDE extension:

```bash
codex mcp add taaft \
  --url https://theresanaiforthat.com/mcp/
```

For plugin-capable Codex surfaces:

```bash
codex plugin marketplace add taaft/mcp
codex plugin add taaft@taaft-plugins
```

You can also install it interactively from `/plugins`. Codex IDE supports
direct MCP configuration but does not currently install plugins.

### ChatGPT

Enable **Developer mode**, open **Plugins**, select **+**, and register:

- URL: `https://theresanaiforthat.com/mcp/`
- Authentication: **None**
- Transport: **Streamable HTTP**

The repository contains the Codex/OpenAI plugin package, but a ChatGPT plugin
also needs an `.app.json` mapping to the `plugin_asdk_app...` identifier that
ChatGPT creates when the endpoint is registered. That account-specific file
cannot be generated before registration.

### Visual Studio Code

This repository includes `.vscode/mcp.json`. Opening the repository in VS Code
loads the server at workspace scope. To install it globally without cloning:

```bash
code --add-mcp \
  '{"name":"taaft","type":"http","url":"https://theresanaiforthat.com/mcp/"}'
```

A VS Code extension is unnecessary for a fixed remote endpoint. Public
`@mcp` gallery inclusion is a separate, curated GitHub MCP Registry process.

### Google Antigravity

After cloning the repository:

```bash
mkdir -p ~/.gemini/config/plugins
cp -R plugins/antigravity/taaft ~/.gemini/config/plugins/taaft
```

The plugin uses `serverUrl`, the current Antigravity key for remote MCP
servers. No transport or authentication fields are needed. Restart
Antigravity after copying the plugin.

### Grok

Grok Build automatically loads `.grok/config.toml`, which enables the
Claude-compatible TAAFT plugin already shipped in this repository. To add the
remote server directly instead:

```bash
grok mcp add --transport http taaft \
  https://theresanaiforthat.com/mcp/
```

Grok can also load the packaged plugin explicitly:

```bash
grok --plugin-dir ./plugins/claude/taaft
```

Use `grok inspect` or `grok mcp doctor taaft` to verify discovery and
connectivity.

## Prerequisites

- Node.js 22+
- Access to the internal TAAFT HTTP API

## Local development

```bash
npm install
cp .env.example .env
```

Set at least `TAAFT_API_BASE_URL` in `.env`, then run:

```bash
npm run dev
```

By default, the service listens on `http://localhost:3000/mcp`.

The upstream adapter expects:

- `GET {TAAFT_SEARCH_PATH}?query=...&type=...&sort=...&limit=...`
- `GET {TAAFT_TOOL_PATH_TEMPLATE}`, replacing `{slug}` with the URL-encoded slug

Search may return an array or an object containing `tools`, `results`, or
`data`. Detail may return the tool directly or under `tool` or `data`. Change
the adapter in `src/taaft-client.ts` if the internal API contract differs; do
not add more environment-driven response mapping.

Example client configuration:

```json
{
  "mcpServers": {
    "taaft": {
      "url": "https://theresanaiforthat.com/mcp/"
    }
  }
}
```

## Production

Set:

- `NODE_ENV=production`
- `PUBLIC_BASE_URL` to the external HTTPS origin
- `TAAFT_API_BASE_URL` and, if required, `TAAFT_API_KEY`

Build and run:

```bash
docker build -t taaft-mcp .
docker run --rm -p 3000:3000 --env-file .env taaft-mcp
```

Terminate TLS at your ingress or load balancer. The application is stateless,
so it can run multiple replicas without sticky sessions. Apply rate limits at
the ingress because the MCP endpoint is intentionally public; application-level
rate limiting is ineffective once replicas are added.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Then connect with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```
