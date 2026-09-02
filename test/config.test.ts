import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("provides safe local-development defaults", () => {
    const config = loadConfig({
      TAAFT_API_BASE_URL: "https://api.example.test",
    });

    assert.equal(config.port, 3000);
    assert.equal(config.host, "0.0.0.0");
    assert.deepEqual(config.allowedHosts, [
      "localhost",
      "127.0.0.1",
      "[::1]",
    ]);
  });

  it("derives the allowed host from the public URL", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      PUBLIC_BASE_URL: "https://mcp.example.test",
      TAAFT_API_BASE_URL: "https://api.example.test",
    });

    assert.deepEqual(config.allowedHosts, ["mcp.example.test"]);
    assert.deepEqual(config.allowedOrigins, ["mcp.example.test"]);
  });
});
