# TAAFT MCP server

Remote, stateless [Model Context Protocol](https://modelcontextprotocol.io/)
server for finding AI tools in the TAAFT directory.

It exposes:

- `search_tools` — search by query, type, sort, and result limit.
- `get_tool` — retrieve public details by the slug returned from search.

The MCP endpoint is `POST /mcp`. `GET /healthz` is an unauthenticated
liveness endpoint.

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
      "url": "https://mcp.example.com/mcp"
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
