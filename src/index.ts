import { loadConfig } from "./config.js";
import { createHttpServer } from "./http-server.js";

const config = loadConfig();
const server = createHttpServer(config);

server.listen(config.port, config.host, () => {
  console.error(
    JSON.stringify({
      level: "info",
      event: "server_started",
      address: config.host,
      port: config.port,
      endpoint: "/mcp",
    }),
  );
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  console.error(
    JSON.stringify({ level: "info", event: "server_stopping", signal }),
  );

  const forceClose = setTimeout(() => {
    server.closeAllConnections();
  }, 10_000);
  forceClose.unref();

  server.close((error) => {
    clearTimeout(forceClose);
    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "server_stop_failed",
          error: error.message,
        }),
      );
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
