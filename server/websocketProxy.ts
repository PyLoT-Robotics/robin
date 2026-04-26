export type ProxySocketData = {
	upstream: WebSocket | null;
};

type CreateProxyServerConfigOptions = {
	port?: number;
	hostname?: string;
	upstreamUrl?: string;
	certPath?: string;
	keyPath?: string;
	createUpstreamSocket?: (url: string) => WebSocket;
};

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

export const createProxyWebSocketHandlers = (
	upstreamUrl: string,
	createUpstreamSocket: (url: string) => WebSocket = (url) => new WebSocket(url),
) => ({
	open(client: Bun.ServerWebSocket<ProxySocketData>) {
		const upstream = createUpstreamSocket(upstreamUrl);
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
	message(
		client: Bun.ServerWebSocket<ProxySocketData>,
		message: string | ArrayBuffer | Uint8Array,
	) {
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
	close(client: Bun.ServerWebSocket<ProxySocketData>) {
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
});

export const createProxyServerConfig = (
	options: CreateProxyServerConfigOptions = {},
) => {
	const port = options.port ?? Number(Bun.env.WSS_PORT ?? 9091);
	const hostname = options.hostname ?? Bun.env.HOST ?? "0.0.0.0";
	const upstreamUrl = options.upstreamUrl ?? Bun.env.UPSTREAM_URL ?? "ws://localhost:9090";
	const certPath = options.certPath ?? Bun.env.TLS_CERT_PATH ?? "../client/certs/dev-cert.pem";
	const keyPath = options.keyPath ?? Bun.env.TLS_KEY_PATH ?? "../client/certs/dev-key.pem";

	return {
		port,
		hostname,
		tls: {
			cert: Bun.file(certPath),
			key: Bun.file(keyPath),
		},
		fetch(
			req: Request,
			server: { upgrade(req: Request, options: { data: ProxySocketData }): boolean },
		) {
			if (server.upgrade(req, { data: { upstream: null } })) {
				return;
			}
			return new Response("Upgrade Required", { status: 426 });
		},
		websocket: createProxyWebSocketHandlers(
			upstreamUrl,
			options.createUpstreamSocket,
		),
	};
};

export const startWebSocketProxy = () => {
	const port = Number(Bun.env.WSS_PORT ?? 9091);
	const hostname = Bun.env.HOST ?? "0.0.0.0";
	const upstreamUrl = Bun.env.UPSTREAM_URL ?? "ws://localhost:9090";
	const certPath = Bun.env.TLS_CERT_PATH ?? "../client/certs/dev-cert.pem";
	const keyPath = Bun.env.TLS_KEY_PATH ?? "../client/certs/dev-key.pem";
	const localIp = Bun.env.LOCAL_IP ?? detectLocalIp();
	const server = Bun.serve<ProxySocketData>(
		createProxyServerConfig({
			port,
			hostname,
			upstreamUrl,
			certPath,
			keyPath,
		}),
	);

	console.log(`WSS proxy listening on wss://${localIp}:${server.port}`);
	console.log(`Forwarding traffic to ${upstreamUrl}`);
	return server;
};

if (import.meta.main) {
	startWebSocketProxy();
}
