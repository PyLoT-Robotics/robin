import { describe, expect, test } from "bun:test";
import { createHttpsHttpProxyServerConfig } from "./videoPublisherProxy";

describe("video publisher proxy", () => {
	test("forwards path and query to upstream preserving method", async () => {
		let capturedRequest: Request | null = null;
		const config = createHttpsHttpProxyServerConfig({
			upstreamBaseUrl: "http://localhost:8080",
			forwardRequest: async (request) => {
				capturedRequest = request;
				return new Response("ok", { status: 201 });
			},
		});

		const response = await config.fetch(
			new Request("https://edge.local/api/health?verbose=1", {
				method: "POST",
				headers: { "content-type": "application/json", "x-test": "1" },
				body: JSON.stringify({ hello: "world" }),
			}),
		);

		expect(response.status).toBe(201);
		expect(capturedRequest).not.toBeNull();
		expect(capturedRequest?.url).toBe("http://localhost:8080/api/health?verbose=1");
		expect(capturedRequest?.method).toBe("POST");
		expect(capturedRequest?.headers.get("x-test")).toBe("1");
		expect(await capturedRequest?.text()).toBe('{"hello":"world"}');
	});

	test("returns 502 when upstream request fails", async () => {
		const config = createHttpsHttpProxyServerConfig({
			upstreamBaseUrl: "http://localhost:8080",
			forwardRequest: async () => {
				throw new Error("upstream down");
			},
		});

		const response = await config.fetch(
			new Request("https://edge.local/status", { method: "GET" }),
		);

		expect(response.status).toBe(502);
		expect(await response.text()).toBe("Bad Gateway");
	});
});
