import http, { type IncomingHttpHeaders } from "node:http";

const port = Number(process.env.LOAD_BALANCER_PORT ?? 3004);
const backends = (process.env.LOAD_BACKENDS ?? "http://127.0.0.1:3000,http://127.0.0.1:3001")
  .split(",")
  .map((value) => new URL(value.trim()))
  .filter((value) => value.protocol === "http:");

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("LOAD_BALANCER_PORT must be a valid TCP port");
}
if (backends.length < 2) {
  throw new Error("LOAD_BACKENDS must contain at least two HTTP backends");
}

const active = backends.map(() => 0);
let cursor = 0;

function chooseBackend() {
  const minActive = Math.min(...active);
  for (let offset = 0; offset < backends.length; offset += 1) {
    const index = (cursor + offset) % backends.length;
    if (active[index] === minActive) {
      cursor = (index + 1) % backends.length;
      return index;
    }
  }
  return 0;
}

function forwardedHeaders(headers: IncomingHttpHeaders) {
  const next = { ...headers };
  delete next.connection;
  delete next["proxy-connection"];
  delete next["keep-alive"];
  delete next["transfer-encoding"];
  delete next.upgrade;
  return next;
}

const server = http.createServer((request, response) => {
  const backendIndex = chooseBackend();
  const backend = backends[backendIndex];
  active[backendIndex] += 1;
  let released = false;

  const release = () => {
    if (released) return;
    released = true;
    active[backendIndex] = Math.max(0, active[backendIndex] - 1);
  };

  const upstream = http.request({
    protocol: backend.protocol,
    hostname: backend.hostname,
    port: backend.port,
    method: request.method,
    path: request.url,
    headers: forwardedHeaders(request.headers),
  }, (upstreamResponse) => {
    const headers = { ...upstreamResponse.headers, "x-load-test-backend": backend.port };
    response.writeHead(upstreamResponse.statusCode ?? 502, headers);
    upstreamResponse.pipe(response);
    upstreamResponse.once("end", release);
    upstreamResponse.once("close", release);
  });

  upstream.once("error", (error) => {
    release();
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "application/json" });
    }
    response.end(JSON.stringify({ error: "load_test_upstream_failed", message: error.message }));
  });
  request.once("aborted", () => {
    upstream.destroy();
    release();
  });
  response.once("close", release);
  request.pipe(upstream);
});

server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({
    ready: true,
    url: `http://127.0.0.1:${port}`,
    backends: backends.map((backend) => backend.href),
  }));
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
