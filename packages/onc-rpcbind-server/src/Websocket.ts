export async function getWebsocketServer() {
	const module = await import('ws');
	return module.WebSocketServer;
}
