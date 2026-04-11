# server

To install dependencies:

```bash
bun install
```

To run all proxies simultaneously:

```bash
bun run serve
```

This project was created using `bun init` in bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## WSS Proxy (WebSocket Secure)

This server accepts secure WebSocket connections and forwards messages to ROS bridge.

- listen: `wss://<LocalIP>:9091`
- upstream: `ws://localhost:9090`

Run individually:

```bash
bun run websocketProxy.ts
```

Optional environment variables:

- `WSS_PORT` (default: `9091`)
- `HOST` (default: `0.0.0.0`)
- `UPSTREAM_URL` (default: `ws://localhost:9090`)
- `TLS_CERT_PATH` (default: `../certs/dev-cert.pem`)
- `TLS_KEY_PATH` (default: `../certs/dev-key.pem`)
- `LOCAL_IP` (overrides auto-detected IP for startup log)

## Video Publisher Proxy (HTTPS → HTTP)

This server accepts HTTPS and forwards requests to a local HTTP endpoint.

- listen: `https://<LocalIP>:8081`
- upstream: `http://localhost:8080`

Run individually:

```bash
bun run videoPublisherProxy.ts
```

Optional environment variables:

- `VIDEO_PROXY_PORT` (default: `8081`)
- `HOST` (default: `0.0.0.0`)
- `UPSTREAM_BASE_URL` (default: `http://localhost:8080`)
- `TLS_CERT_PATH` (default: `../certs/dev-cert.pem`)
- `TLS_KEY_PATH` (default: `../certs/dev-key.pem`)
- `LOCAL_IP` (overrides auto-detected IP for startup log)

