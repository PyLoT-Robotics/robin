# server

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## WSS Proxy

This server accepts secure WebSocket connections and forwards messages to ROS bridge.

- listen: `wss://<LocalIP>:8080`
- upstream: `ws://localhost:9090`

Run:

```bash
bun run index.ts
```

Optional environment variables:

- `PORT` (default: `8080`)
- `HOST` (default: `0.0.0.0`)
- `UPSTREAM_URL` (default: `ws://localhost:9090`)
- `TLS_CERT_PATH` (default: `../client/certs/dev-cert.pem`)
- `TLS_KEY_PATH` (default: `../client/certs/dev-key.pem`)
- `LOCAL_IP` (overrides auto-detected IP for startup log)
