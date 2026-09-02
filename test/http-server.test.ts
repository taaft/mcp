import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.js";
import { createHttpServer } from "../src/http-server.js";

describe("HTTP server", () => {
  it("serves health and MCP without authentication", async () => {
    const config = loadConfig({
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "3000",
      TAAFT_API_BASE_URL: "https://api.example.test",
    });
    const server = createHttpServer(config);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const health = await fetch(`${baseUrl}/healthz`);
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { status: "ok" });

      const initialize = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0.0" },
          },
        }),
      });
      assert.equal(initialize.status, 200);
      assert.match(await initialize.text(), /"serverInfo":\{"name":"taaft"/);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
