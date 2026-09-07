import type { AppConfig } from "./config.js";

export type ToolType =
  | "gpt"
  | "ios"
  | "android"
  | "chrome"
  | "ai"
  | "tool"
  | "agents"
  | "apis"
  | "telegram"
  | "mini-tools";

export type ToolSort =
  | "default"
  | "latest"
  | "most-saved"
  | "top-rated"
  | "popular"
  | "price"
  | "sota";

export type SearchToolsInput = {
  query: string;
  type?: ToolType | undefined;
  sort: ToolSort;
  limit: number;
};

export class TaaftApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "TaaftApiError";
  }
}

type Fetch = typeof globalThis.fetch;

export class TaaftClient {
  constructor(
    private readonly config: AppConfig["taaftApi"],
    private readonly fetchImplementation: Fetch = globalThis.fetch,
  ) {}

  async searchTools(input: SearchToolsInput): Promise<{ tools: unknown[] }> {
    const url = this.createUrl(this.config.searchPath);
    url.searchParams.set("query", input.query);
    url.searchParams.set("sort", input.sort);
    url.searchParams.set("limit", String(input.limit));
    if (input.type) {
      url.searchParams.set("type", input.type);
    }

    const body = await this.request(url);
    const tools = this.extractArray(body, ["tools", "results", "data"]);

    return { tools };
  }

  async getTool(slug: string): Promise<{ tool: unknown }> {
    const path = this.config.toolPathTemplate.replace(
      "{slug}",
      encodeURIComponent(slug),
    );
    const body = await this.request(this.createUrl(path));

    if (this.isRecord(body)) {
      return { tool: body.tool ?? body.data ?? body };
    }

    return { tool: body };
  }

  private createUrl(path: string): URL {
    const baseUrl = this.config.baseUrl.endsWith("/")
      ? this.config.baseUrl
      : `${this.config.baseUrl}/`;
    return new URL(path.replace(/^\/+/, ""), baseUrl);
  }

  private async request(url: URL): Promise<unknown> {
    const headers = new Headers({
      Accept: "application/json",
      "User-Agent": "taaft-mcp-server/1.0.1",
    });

    if (this.config.apiKey) {
      headers.set(
        this.config.apiKeyHeader,
        `${this.config.apiKeyPrefix}${this.config.apiKey}`,
      );
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "TimeoutError"
          ? "TAAFT API request timed out"
          : "TAAFT API request failed";
      throw new TaaftApiError(message);
    }

    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > this.config.maxResponseBytes) {
      throw new TaaftApiError("TAAFT API response exceeded the size limit");
    }

    if (!response.ok) {
      throw new TaaftApiError(
        `TAAFT API returned HTTP ${response.status}`,
        response.status,
      );
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new TaaftApiError("TAAFT API returned invalid JSON");
    }
  }

  private extractArray(body: unknown, keys: string[]): unknown[] {
    if (Array.isArray(body)) {
      return body;
    }

    if (this.isRecord(body)) {
      for (const key of keys) {
        const value = body[key];
        if (Array.isArray(value)) {
          return value;
        }
      }
    }

    throw new TaaftApiError("TAAFT API returned an unexpected search response");
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
