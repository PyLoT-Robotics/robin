import { describe, expect, test } from "bun:test";
import {
	createProxyServerConfig,
	createProxyWebSocketHandlers,
} from "./websocketProxy";

const createClientMock = () => {
	const sentMessages: unknown[] = [];
	const closeCalls: Array<[number | undefined, string | undefined]> = [];

	const client: any = {
		readyState: WebSocket.OPEN,
		data: { upstream: null },
		sentMessages,
		closeCalls,
		send(message: unknown) {
			sentMessages.push(message);
		},
		close(code?: number, reason?: string) {
			closeCalls.push([code, reason]);
			client.readyState = WebSocket.CLOSED;
		},
	};

	return { client, sentMessages, closeCalls };
};

const createUpstreamMock = () => {
	const sentMessages: unknown[] = [];
	const closeCalls: Array<Array<unknown>> = [];

	const upstream: any = {
		binaryType: "",
		readyState: WebSocket.OPEN,
		onmessage: undefined,
		onclose: undefined,
		onerror: undefined,
		send(message: unknown) {
			sentMessages.push(message);
		},
		close(...args: unknown[]) {
			closeCalls.push(args);
			upstream.readyState = WebSocket.CLOSED;
		},
	};

	return { upstream, sentMessages, closeCalls };
};

describe("websocket proxy", () => {
	test("returns 426 when websocket upgrade fails", async () => {
		const config = createProxyServerConfig({
			port: 8080,
			hostname: "0.0.0.0",
			upstreamUrl: "ws://localhost:9090",
			certPath: "../certs/dev-cert.pem",
			keyPath: "../certs/dev-key.pem",
		});

		const response = await config.fetch(
			new Request("https://example.com/socket"),
			{ upgrade: () => false } as any,
		);

		expect(response).toBeInstanceOf(Response);
		expect(response?.status).toBe(426);
		expect(await response?.text()).toBe("Upgrade Required");
	});

	test("open connects to upstream and forwards upstream messages to the client", () => {
		const { upstream } = createUpstreamMock();
		const { client } = createClientMock();
		const handlers = createProxyWebSocketHandlers(
			"ws://upstream.test",
			() => upstream as WebSocket,
		);

		handlers.open(client);

		expect(client.data.upstream).toBe(upstream);
		expect(upstream.binaryType).toBe("arraybuffer");

		upstream.onmessage?.({ data: "payload" } as MessageEvent);

		expect(client.sentMessages).toEqual(["payload"]);
		expect(client.closeCalls).toEqual([]);
	});

	test("message forwards payloads when upstream is ready", () => {
		const { upstream, sentMessages } = createUpstreamMock();
		const { client } = createClientMock();
		const handlers = createProxyWebSocketHandlers(
			"ws://upstream.test",
			() => upstream as WebSocket,
		);

		handlers.open(client);
		handlers.message(client, "hello");

		expect(sentMessages).toEqual(["hello"]);
		expect(client.closeCalls).toEqual([]);
	});

	test("message closes the client when upstream is not ready", () => {
		const { upstream } = createUpstreamMock();
		const { client, closeCalls } = createClientMock();
		const handlers = createProxyWebSocketHandlers(
			"ws://upstream.test",
			() => upstream as WebSocket,
		);

		handlers.open(client);
		upstream.readyState = WebSocket.CLOSING;

		handlers.message(client, "hello");

		expect(closeCalls).toEqual([[1013, "Upstream not ready"]]);
	});

	test("close shuts down the upstream socket", () => {
		const { upstream, closeCalls } = createUpstreamMock();
		const { client } = createClientMock();
		const handlers = createProxyWebSocketHandlers(
			"ws://upstream.test",
			() => upstream as WebSocket,
		);

		handlers.open(client);
		handlers.close(client);

		expect(closeCalls).toEqual([[]]);
		expect(client.data.upstream).toBeNull();
	});
});
