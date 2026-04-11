import { startWebSocketProxy } from "./websocketProxy";
import { startVideoPublisherProxy } from "./videoPublisherProxy";

const main = () => {
	console.log("Starting proxy servers...\n");

	const wsServer = startWebSocketProxy();
	const videoServer = startVideoPublisherProxy();

	console.log(`\n✓ All proxy servers started successfully`);
	console.log(`\nPress Ctrl+C to stop\n`);

	return { wsServer, videoServer };
};

if (import.meta.main) {
	main();
}

export { startWebSocketProxy, startVideoPublisherProxy };