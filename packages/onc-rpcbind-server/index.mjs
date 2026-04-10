#!/usr/bin/env node

import {RpcBindServer} from './dist/index.mjs';

const HELP = `
Usage: onc-rpcbind-server [options]

Options:
  -p, --port         Port to listen on (default: 111, env: RPCBIND_PORT)
  -6, --ipv6         IPv6 mode: true | false (default: auto detect, env: RPCBIND_IPV6)
  -s, --socket-path  Local socket path / Windows named pipe
                       (default Linux/macOS: /run/rpcbind.sock
                        default Windows:     \\\\.\\pipe\\rpcbind
                        env: RPCBIND_SOCKET_PATH)
  -m, --socket-mode  Unix socket file mode in octal (default: 666, env: RPCBIND_SOCKET_MODE)
  -i, --insecure     Allow insecure operations (default: false, env: RPCBIND_INSECURE=true)
  -w, --ws-port      WebSocket port (default: undefined, env: RPCBIND_WS_PORT)
  -h, --help         Show this help message
`.trim();

function parseOptionalBoolean(value) {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}
	if (typeof value === 'boolean') {
		return value;
	}
	if (typeof value !== 'string') {
		throw new Error(`Invalid boolean value: ${String(value)}`);
	}
	const normalized = value.toLowerCase().trim();
	if (['true', '1', 'yes', 'on'].includes(normalized)) {
		return true;
	}
	if (['false', '0', 'no', 'off'].includes(normalized)) {
		return false;
	}
	throw new Error(`Invalid boolean value for --ipv6: ${value}. Use true or false.`);
}

async function startServer() {
	const minimist = await import('minimist');
	const args = minimist.default(process.argv.slice(2), {
		boolean: ['insecure', 'help'],
		string: ['port', 'socket-path', 'socket-mode', 'ws-port', 'ipv6', 'bind-address', 'bind-ipv6-address'],
		alias: {p: 'port', s: 'socket-path', m: 'socket-mode', i: 'insecure', h: 'help', w: 'ws-port', 6: 'ipv6'},
		default: {
			port: process.env.RPCBIND_PORT ?? 111,
			'socket-path': process.env.RPCBIND_SOCKET_PATH ?? (process.platform === 'win32' ? '\\\\.\\pipe\\rpcbind' : '/run/rpcbind.sock'),
			'socket-mode': process.env.RPCBIND_SOCKET_MODE ?? '666',
			insecure: process.env.RPCBIND_INSECURE === 'true' || false,
			'ws-port': process.env.RPCBIND_WS_PORT ?? undefined,
			ipv6: process.env.RPCBIND_IPV6 ?? undefined,
			'bind-address': process.env.RPCBIND_BIND_ADDRESS ?? '0.0.0.0',
			'bind-ipv6-address': process.env.RPCBIND_BIND_IPV6_ADDRESS ?? '::',
		},
	});

	if (args.help) {
		console.log(HELP);
		process.exit(0);
	}
	const server = new RpcBindServer(args.port, {
		tcp: true,
		udp: true,
		bindAddress: args['bind-address'],
		bindIpv6Address: args['bind-ipv6-address'],
		ipv6: parseOptionalBoolean(args.ipv6),
		wsPort: args['ws-port'] ? Number.parseInt(args['ws-port'], 10) : undefined,
		socketPath: args['socket-path'],
		socketMode: Number.parseInt(args['socket-mode'], 8),
		logger: console,
		inSecure: parseOptionalBoolean(args.insecure),
	});
	await server.bind();
	console.info(`[rpcbind] listening on tcp/udp :${args.port} and local socket ${args['socket-path']} insecure=${args.insecure}`);
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
