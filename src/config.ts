import { z } from "zod/v4";

const environmentSchema = z.enum(["development", "test", "production"]);
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const rawConfigSchema = z.object({
  NODE_ENV: environmentSchema.default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  ALLOWED_HOSTS: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  TAAFT_API_BASE_URL: z.url(),
  TAAFT_API_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  TAAFT_API_KEY_HEADER: z.string().min(1).default("Authorization"),
  TAAFT_API_KEY_PREFIX: z.string().default("Bearer "),
  TAAFT_SEARCH_PATH: z.string().min(1).default("/v1/tools/search"),
  TAAFT_TOOL_PATH_TEMPLATE: z
    .string()
    .includes("{slug}")
    .default("/v1/tools/{slug}"),
  TAAFT_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(10_000),
  TAAFT_MAX_RESPONSE_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .max(10_000_000)
    .default(2_000_000),
});

export type AppConfig = {
  environment: z.infer<typeof environmentSchema>;
  host: string;
  port: number;
  publicBaseUrl: string | undefined;
  allowedHosts: string[];
  allowedOrigins: string[];
  taaftApi: {
    baseUrl: string;
    apiKey: string | undefined;
    apiKeyHeader: string;
    apiKeyPrefix: string;
    searchPath: string;
    toolPathTemplate: string;
    timeoutMs: number;
    maxResponseBytes: number;
  };
};

function parseList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const raw = rawConfigSchema.parse(environment);
  const publicUrl = raw.PUBLIC_BASE_URL
    ? new URL(raw.PUBLIC_BASE_URL)
    : undefined;

  const defaultHosts =
    raw.NODE_ENV === "production"
      ? []
      : ["localhost", "127.0.0.1", "[::1]"];
  const allowedHosts = [
    ...new Set([
      ...defaultHosts,
      ...(publicUrl ? [publicUrl.hostname] : []),
      ...parseList(raw.ALLOWED_HOSTS),
    ]),
  ];
  const allowedOrigins = [
    ...new Set([
      ...defaultHosts,
      ...(publicUrl ? [publicUrl.hostname] : []),
      ...parseList(raw.ALLOWED_ORIGINS),
    ]),
  ];

  if (raw.NODE_ENV === "production" && allowedHosts.length === 0) {
    throw new Error(
      "Production requires PUBLIC_BASE_URL or ALLOWED_HOSTS for DNS rebinding protection.",
    );
  }

  return {
    environment: raw.NODE_ENV,
    host: raw.HOST,
    port: raw.PORT,
    publicBaseUrl: raw.PUBLIC_BASE_URL,
    allowedHosts,
    allowedOrigins,
    taaftApi: {
      baseUrl: raw.TAAFT_API_BASE_URL,
      apiKey: raw.TAAFT_API_KEY,
      apiKeyHeader: raw.TAAFT_API_KEY_HEADER,
      apiKeyPrefix: raw.TAAFT_API_KEY_PREFIX,
      searchPath: raw.TAAFT_SEARCH_PATH,
      toolPathTemplate: raw.TAAFT_TOOL_PATH_TEMPLATE,
      timeoutMs: raw.TAAFT_API_TIMEOUT_MS,
      maxResponseBytes: raw.TAAFT_MAX_RESPONSE_BYTES,
    },
  };
}
