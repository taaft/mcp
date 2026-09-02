import {
  createServer,
  type Server,
  type ServerResponse,
  type IncomingMessage,
} from "node:http";
import {
  hostHeaderValidation,
  originValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { AppConfig } from "./config.js";
import { createTaaftMcpServer } from "./mcp-server.js";
import { TaaftClient } from "./taaft-client.js";

export function createHttpServer(config: AppConfig): Server {
  const client = new TaaftClient(config.taaftApi);
  const handleMcp = toNodeHandler(
    createMcpHandler(() => createTaaftMcpServer(client)),
    {
      onerror: (error) => {
        console.error(
          JSON.stringify({
            level: "error",
            event: "mcp_handler_failed",
            error: error.message,
          }),
        );
      },
    },
  );
  const validateHost = hostHeaderValidation(config.allowedHosts);
  const validateOrigin = originValidation(config.allowedOrigins);

  return createServer((request, response) => {
    if (!request.method || !request.url) {
      sendJson(response, 400, { error: "Malformed HTTP request" });
      return;
    }

    const path = new URL(request.url, "http://localhost").pathname;

    if (request.method === "GET" && path === "/healthz") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (!validateHost(request, response) || !validateOrigin(request, response)) {
      return;
    }

    if (path !== "/mcp") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    void handleMcp(
      request as IncomingMessage & { method: string; url: string },
      response,
    ).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          level: "error",
          event: "request_failed",
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      if (!response.headersSent) {
        sendJson(response, 500, { error: "Internal server error" });
      }
    });
  });
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}
