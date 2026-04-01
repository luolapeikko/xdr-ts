#!/usr/bin/env node

import {RpcBindServer} from './dist/index.mjs';

async function startServer() {
	const port = Number(process.env.RPCBIND_PORT ?? 111);
	const isWindows = process.platform === 'win32';
	const socketPath = process.env.RPCBIND_SOCKET_PATH ?? (isWindows ? '\\\\.\\pipe\\rpcbind' : '/run/rpcbind.sock');
	const socketMode = Number.parseInt(process.env.RPCBIND_SOCKET_MODE ?? '666', 8);
	const server = new RpcBindServer(port, {
		tcp: true,
		udp: true,
		local: true,
		ipv6: true,
		socketPath,
		socketMode,
		logger: console,
	});
	await server.bind();
	console.info(`[rpcbind] listening on tcp/udp :${port} and local socket ${socketPath} mode=${socketMode.toString(8)}`);
}

startServer().catch((error) => {
	if (error && typeof error === 'object' && 'code' in error) {
		switch (error.code) {
			case 'EACCES':
				console.error('[rpcbind] permission denied. Try running as root/sudo for port 111 and /run/rpcbind.sock');
				break;
			case 'EADDRINUSE':
				console.error('[rpcbind] address already in use. Stop existing rpcbind or use RPCBIND_PORT/RPCBIND_SOCKET_PATH');
				break;
			default:
				break;
		}
	}
	console.error(error);
	process.exitCode = 1;
});
