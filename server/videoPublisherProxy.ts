type CreateHttpsHttpProxyServerConfigOptions = {
	port?: number;
	hostname?: string;
	upstreamBaseUrl?: string;
	certPath?: string;
	keyPath?: string;
	forwardRequest?: (request: Request) => Promise<Response>;
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

export const createHttpsHttpProxyServerConfig = (
	options: CreateHttpsHttpProxyServerConfigOptions = {},
) => {
	const port = options.port ?? Number(Bun.env.VIDEO_PROXY_PORT ?? 8081);
	const hostname = options.hostname ?? Bun.env.HOST ?? "0.0.0.0";
	const upstreamBaseUrl =
		options.upstreamBaseUrl ?? Bun.env.UPSTREAM_BASE_URL ?? "http://localhost:8080";
	const certPath = options.certPath ?? Bun.env.TLS_CERT_PATH ?? "../certs/dev-cert.pem";
	const keyPath = options.keyPath ?? Bun.env.TLS_KEY_PATH ?? "../certs/dev-key.pem";
	const forwardRequest = options.forwardRequest ?? ((request: Request) => fetch(request));

	return {
		port,
		hostname,
		tls: {
			cert: Bun.file(certPath),
			key: Bun.file(keyPath),
		},
		async fetch(req: Request) {
			const incomingUrl = new URL(req.url);
			const targetUrl = new URL(
				`${incomingUrl.pathname}${incomingUrl.search}`,
				upstreamBaseUrl,
			);
			const proxiedRequest = new Request(targetUrl, req);

			try {
				return await forwardRequest(proxiedRequest);
			} catch {
				return new Response("Bad Gateway", { status: 502 });
			}
		},
	};
};

export const startVideoPublisherProxy = () => {
	const port = Number(Bun.env.VIDEO_PROXY_PORT ?? 8081);
	const hostname = Bun.env.HOST ?? "0.0.0.0";
	const upstreamBaseUrl = Bun.env.UPSTREAM_BASE_URL ?? "http://localhost:8080";
	const certPath = Bun.env.TLS_CERT_PATH ?? "../certs/dev-cert.pem";
	const keyPath = Bun.env.TLS_KEY_PATH ?? "../certs/dev-key.pem";
	const localIp = Bun.env.LOCAL_IP ?? detectLocalIp();
	const server = Bun.serve(
		createHttpsHttpProxyServerConfig({
			port,
			hostname,
			upstreamBaseUrl,
			certPath,
			keyPath,
		}),
	);

	console.log(`HTTPS video proxy listening on https://${localIp}:${server.port}`);
	console.log(`Forwarding traffic to ${upstreamBaseUrl}`);
	return server;
};

if (import.meta.main) {
	startVideoPublisherProxy();
}
