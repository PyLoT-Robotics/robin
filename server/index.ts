type ProxySocketData = {
	upstream: WebSocket | null;
};

const port = Number(Bun.env.PORT ?? 8080);
const hostname = Bun.env.HOST ?? "0.0.0.0";
const upstreamUrl = Bun.env.UPSTREAM_URL ?? "ws://localhost:9090";
const certPath = Bun.env.TLS_CERT_PATH ?? "../client/certs/dev-cert.pem";
const keyPath = Bun.env.TLS_KEY_PATH ?? "../client/certs/dev-key.pem";

const detectLocalIp = (): string => {
	const result = Bun.spawnSync({
		cmd: [
			"sh",
			"-lc",
			"ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}'",
		],
		stdout: "pipe",
		stderr: "ignore",
	});

	const ip = new TextDecoder().decode(result.stdout).trim();
	return ip || "localhost";
};

const localIp = Bun.env.LOCAL_IP ?? detectLocalIp();

const server = Bun.serve<ProxySocketData>({
	port,
	hostname,
	tls: {
		cert: Bun.file(certPath),
		key: Bun.file(keyPath),
	},
	fetch(req, server) {
		if (server.upgrade(req, { data: { upstream: null } })) {
			return;
		}
		return new Response("Upgrade Required", { status: 426 });
	},
	websocket: {
		open(client) {
			const upstream = new WebSocket(upstreamUrl);
			client.data.upstream = upstream;
			upstream.binaryType = "arraybuffer";

			upstream.onmessage = (event) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(event.data);
				}
			};

			upstream.onclose = (event) => {
				if (client.readyState === WebSocket.OPEN) {
					client.close(event.code || 1011, "Upstream closed");
				}
			};

			upstream.onerror = () => {
				if (client.readyState === WebSocket.OPEN) {
					client.close(1011, "Upstream error");
				}
			};
		},
		message(client, message) {
			const upstream = client.data.upstream;
			if (!upstream) {
				client.close(1011, "Upstream not connected");
				return;
			}

			if (upstream.readyState === WebSocket.OPEN) {
				upstream.send(message);
				return;
			}

			client.close(1013, "Upstream not ready");
		},
		close(client) {
			const upstream = client.data.upstream;
			if (!upstream) {
				return;
			}

			if (
				upstream.readyState === WebSocket.OPEN ||
				upstream.readyState === WebSocket.CONNECTING
			) {
				upstream.close();
			}
			client.data.upstream = null;
		},
	},
});

console.log(`WSS proxy listening on wss://${localIp}:${server.port}`);
console.log(`Forwarding traffic to ${upstreamUrl}`);