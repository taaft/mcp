import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppConfig } from "../src/config.js";
import { TaaftApiError, TaaftClient } from "../src/taaft-client.js";

const baseConfig: AppConfig["taaftApi"] = {
  baseUrl: "https://api.example.test/internal/",
  apiKey: "upstream-secret",
  apiKeyHeader: "X-API-Key",
  apiKeyPrefix: "",
  searchPath: "/v1/tools/search",
  toolPathTemplate: "/v1/tools/{slug}",
  timeoutMs: 1_000,
  maxResponseBytes: 10_000,
};

describe("TaaftClient", () => {
  it("sends search filters and normalizes a tools response", async () => {
    const fetchMock: typeof fetch = async (input, init) => {
      const url = new URL(input.toString());
      assert.equal(
        url.toString(),
        "https://api.example.test/internal/v1/tools/search?query=code&sort=latest&limit=5&type=ai",
      );
      assert.equal(new Headers(init?.headers).get("X-API-Key"), "upstream-secret");

      return new Response(
        JSON.stringify({ tools: [{ name: "Example", slug: "example" }] }),
        { status: 200 },
      );
    };
    const client = new TaaftClient(baseConfig, fetchMock);

    const result = await client.searchTools({
      query: "code",
      type: "ai",
      sort: "latest",
      limit: 5,
    });

    assert.deepEqual(result, {
      tools: [{ name: "Example", slug: "example" }],
    });
  });

  it("URL-encodes the tool slug", async () => {
    const fetchMock: typeof fetch = async (input) => {
      assert.equal(
        input.toString(),
        "https://api.example.test/internal/v1/tools/my-tool",
      );
      return new Response(JSON.stringify({ tool: { slug: "my-tool" } }));
    };
    const client = new TaaftClient(baseConfig, fetchMock);

    assert.deepEqual(await client.getTool("my-tool"), {
      tool: { slug: "my-tool" },
    });
  });

  it("does not expose an upstream error body", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response("private upstream details", { status: 503 });
    const client = new TaaftClient(baseConfig, fetchMock);

    await assert.rejects(
      client.searchTools({ query: "code", sort: "default", limit: 10 }),
      (error: unknown) =>
        error instanceof TaaftApiError &&
        error.message === "TAAFT API returned HTTP 503" &&
        !error.message.includes("private upstream details"),
    );
  });
});
