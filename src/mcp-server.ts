import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {
  TaaftApiError,
  type SearchToolsInput,
  TaaftClient,
} from "./taaft-client.js";

const toolTypeSchema = z.enum([
  "gpt",
  "ios",
  "android",
  "chrome",
  "ai",
  "tool",
  "agents",
  "apis",
  "telegram",
  "mini-tools",
]);

const toolSortSchema = z.enum([
  "default",
  "latest",
  "most-saved",
  "top-rated",
  "popular",
  "price",
  "sota",
]);

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export function createTaaftMcpServer(client: TaaftClient): McpServer {
  const server = new McpServer({
    name: "taaft",
    version: "1.0.0",
  });

  server.registerTool(
    "search_tools",
    {
      title: "Search AI tools",
      description: "Search the TAAFT directory for AI tools that match a query.",
      inputSchema: z.object({
        query: z
          .string()
          .trim()
          .min(2)
          .max(200)
          .describe("What the user needs an AI tool for."),
        type: toolTypeSchema
          .optional()
          .describe("Optionally restrict results to one tool type."),
        sort: toolSortSchema
          .default("default")
          .describe("How to order matching tools."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Maximum number of tools to return."),
      }),
      annotations: readOnlyAnnotations,
    },
    async (input) => {
      try {
        const result = await client.searchTools(input as SearchToolsInput);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_tool",
    {
      title: "Get AI tool details",
      description: "Get public details for one TAAFT AI tool by slug.",
      inputSchema: z.object({
        slug: z
          .string()
          .trim()
          .min(1)
          .max(160)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .describe("The tool slug returned by search_tools."),
      }),
      annotations: readOnlyAnnotations,
    },
    async ({ slug }) => {
      try {
        const result = await client.getTool(slug);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

function toolError(error: unknown) {
  const message =
    error instanceof TaaftApiError
      ? error.message
      : "Unexpected error while querying TAAFT";

  console.error(
    JSON.stringify({
      level: "error",
      event: "tool_call_failed",
      error: error instanceof Error ? error.message : String(error),
    }),
  );

  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}
