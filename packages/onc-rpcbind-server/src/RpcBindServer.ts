import * as dgram from 'node:dgram';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import type {ILoggerLike} from '@avanio/logger-like';
import {XdrBuffer} from '@luolapeikko/onc-node';
import {type RpcbEntry, type RpcbProtocol, type RpcbProtoFamily, RpcbSemantics, RpcUniversalAddress} from '@luolapeikko/onc-rpcbind-common';
import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import http from 'http';
import {AbstractRpcBindServer} from './AbstractRpcBindServer';
import {isIPv6Supported} from './lib/networkUtils';
import {dropNullishValues} from './lib/paramUtils';
import {getWebsocketServer} from './Websocket';

export type RpcBindServerOptions = {
	tcp?: boolean;
	udp?: boolean;
	ipv6?: boolean;
	/** allow SET and UNSET operations from any host. */
	inSecure?: boolean;
	/**
	 * Path for the IPC socket.
	 * - Linux/macOS: Unix domain socket path (e.g. '/run/rpcbind.sock')
	 * - Windows: Named pipe path (e.g. '\\\\.\\pipe\\rpcbind')
	 */
	socketPath?: string;
	/**
	 * Unix socket mode applied after bind (ignored on Windows named pipes).
	 * Defaults to 0o666 to match traditional rpcbind accessibility.
	 */
	socketMode?: number;
	logger?: ILoggerLike;
	wsPort?: number;
	bindAddress?: string;
	bindIpv6Address?: string;
	/** list of allowed origins for CORS, else tries to use the bind address */
	allowOrigins?: string[];
};

export class RpcBindServer extends AbstractRpcBindServer<Buffer> {
	readonly #port: number;
	readonly #options: {
		tcp: boolean;
		udp: boolean;
		ipv6: boolean;
		inSecure: boolean;
		socketPath: string;
		socketMode: number;
		wsPort: number | undefined;
		bindAddress: string;
		bindIpv6Address: string;
		allowOrigins: string[];
	};
	#tcpServers: net.Server[] = [];
	#udpSockets: dgram.Socket[] = [];
	#httpSockets: http.Server[] = [];
	#localServer: net.Server | undefined;

	#defaultOptions = {
		tcp: true,
		udp: true,
		ipv6: isIPv6Supported(),
		inSecure: false,
		socketPath: os.platform() === 'win32' ? '\\\\.\\pipe\\rpcbind' : '/run/rpcbind.sock',
		socketMode: 0o666,
		logger: undefined,
		wsPort: undefined,
		bindAddress: '0.0.0.0',
		bindIpv6Address: '::',
		allowOrigins: [],
	} as const satisfies RpcBindServerOptions;

	public constructor(port: number, options?: RpcBindServerOptions) {
		super(options);
		this.#port = port;
		this.#options = Object.assign({}, this.#defaultOptions, dropNullishValues(options ?? {}));
	}

	public createXdrBuffer(initialize?: number | Buffer): IXdrBuffer<Buffer> {
		return new XdrBuffer(initialize);
	}

	public async bind(): Promise<void> {
		const promises: Promise<void>[] = [];
		const ipv4RpcUaddr = RpcUniversalAddress.from({host: this.#options.bindAddress, port: this.#port});
		const ipv6RpcUaddr = RpcUniversalAddress.from({host: this.#options.bindIpv6Address, port: this.#port});
		if (this.#options.tcp) {
			promises.push(this.bindTcp());
			this.#registerRpcBindEntry({
				maddr: ipv4RpcUaddr,
				netid: 'tcp',
				semantics: RpcbSemantics.CLTS,
				protofmly: 'inet',
				proto: 'tcp',
			});
		}
		if (this.#options.udp) {
			promises.push(this.bindUdp());
			this.#registerRpcBindEntry({
				maddr: ipv4RpcUaddr,
				netid: 'udp',
				semantics: RpcbSemantics.COTS_ORD,
				protofmly: 'inet',
				proto: 'udp',
			});
		}
		if (this.#options.ipv6) {
			if (this.#options.tcp) {
				promises.push(this.bindTcpIpv6());
				this.#registerRpcBindEntry({
					maddr: ipv6RpcUaddr,
					netid: 'tcp6',
					semantics: RpcbSemantics.CLTS,
					protofmly: 'inet6',
					proto: 'tcp',
				});
			}
			if (this.#options.udp) {
				promises.push(this.bindUdpIpv6());
				this.#registerRpcBindEntry({
					maddr: ipv6RpcUaddr,
					netid: 'udp6',
					semantics: RpcbSemantics.COTS_ORD,
					protofmly: 'inet6',
					proto: 'udp',
				});
			}
		}
		if (this.#options.wsPort) {
			promises.push(this.bindWs());
			this.#registerRpcBindEntry({
				maddr: RpcUniversalAddress.from({host: this.#options.bindAddress, port: this.#options.wsPort}),
				netid: 'ws',
				semantics: RpcbSemantics.COTS_ORD,
				protofmly: 'inet',
				proto: 'ws',
			});
			if (this.#options.ipv6) {
				promises.push(this.bindWsIpv6());
				this.#registerRpcBindEntry({
					maddr: RpcUniversalAddress.from({host: this.#options.bindIpv6Address, port: this.#options.wsPort}),
					netid: 'ws6',
					semantics: RpcbSemantics.COTS_ORD,
					protofmly: 'inet6',
					proto: 'ws',
				});
			}
		}

		this.#registerRpcBindEntry({
			maddr: this.#options.socketPath.replaceAll('\\', '/'),
			netid: 'local',
			semantics: RpcbSemantics.COTS_ORD,
			protofmly: 'loopback',
			proto: '-',
		});
		promises.push(this.bindLocal(this.#options.socketPath));
		// wait for all listeners to be up before returning
		await Promise.all(promises);
	}

	#registerRpcBindEntry(entry: RpcbEntry): void {
		this.services.set(this.getKey(entry.netid, 100000, 2), {prog: 100000, vers: 2, owner: 'superuser', entry});
		this.services.set(this.getKey(entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry});
		this.services.set(this.getKey(entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry});
	}

	private addOriginRule(origin: string): boolean {
		if (this.#options.allowOrigins.includes(origin)) {
			return true;
		}
		// Allow if origin matches the bind any ipv4 or ipv6 then allow any origin
		if (this.#options.bindAddress === '0.0.0.0' || this.#options.bindIpv6Address === '::') {
			return true;
		}
		if (origin.startsWith(`http://${this.#options.bindAddress}`) || origin.startsWith(`https://${this.#options.bindAddress}`)) {
			return true;
		}
		if (origin.startsWith(`http://${this.#options.bindIpv6Address}`) || origin.startsWith(`https://${this.#options.bindIpv6Address}`)) {
			return true;
		}
		return false;
	}

	private checkAllowIp(remoteAddress: string | undefined): boolean {
		if (this.#options.bindAddress === '0.0.0.0' || this.#options.bindIpv6Address === '::') {
			return true;
		}
		if (remoteAddress === this.#options.bindAddress || remoteAddress === this.#options.bindIpv6Address) {
			return true;
		}
		return false;
	}

	#setupCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse) {
		const origin = req.headers.origin;
		if (origin && this.addOriginRule(origin)) {
			res.setHeader('Access-Control-Allow-Origin', origin);
			res.setHeader('Vary', 'Origin');
			res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		}
		if (origin && req.method === 'OPTIONS') {
			res.writeHead(204);
			return res.end();
		}
	}

	private async bindWs(): Promise<void> {
		if (!this.#options.wsPort) {
			return Promise.resolve();
		}
		const WebSocketServer = await getWebsocketServer();
		const httpServer = http.createServer((req, res) => this.#setupCorsHeaders(req, res));
		this.#httpSockets.push(httpServer);
		httpServer.listen({port: this.#options.wsPort, host: this.#options.bindAddress}, () => {
			this.logger?.info(`Bound to WS on port ${this.#options.bindAddress}:${this.#options.wsPort} ${this.inSecure ? '[RW]' : '[RO]'}`);
			console.log(`Listening on ${this.#options.bindAddress}:${this.#options.wsPort}`);
		});
		const wss = new WebSocketServer({server: httpServer});
		wss.on('connection', (ws, req) => {
			ws.on('message', (message) => {
				if (!this.checkAllowIp(req.socket.remoteAddress)) {
					return;
				}
				if (typeof message === 'string') {
					return; // ignore text messages
				}
				let payload: Buffer;
				if (Array.isArray(message)) {
					payload = Buffer.concat(message);
				} else if (message instanceof ArrayBuffer) {
					payload = Buffer.from(message);
				} else {
					payload = Buffer.from(message);
				}
				const response = this.handleRequest(payload, 'inet', 'ws');
				if (ws.readyState === ws.OPEN) {
					ws.send(response);
				}
			});
		});
	}

	private async bindWsIpv6(): Promise<void> {
		if (!this.#options.wsPort) {
			return Promise.resolve();
		}
		const WebSocketServer = await getWebsocketServer();
		const httpServer = http.createServer((req, res) => this.#setupCorsHeaders(req, res));
		this.#httpSockets.push(httpServer);
		httpServer.listen({port: this.#options.wsPort, host: this.#options.bindIpv6Address, ipv6Only: true}, () => {
			this.logger?.info(`Bound to WS on port ${this.#options.bindIpv6Address}:${this.#options.wsPort} ${this.inSecure ? '[RW]' : '[RO]'}`);
			console.log(`Listening on ${this.#options.bindIpv6Address}:${this.#options.wsPort}`);
		});
		const wss = new WebSocketServer({server: httpServer});
		wss.on('connection', (ws, req) => {
			ws.on('message', (message) => {
				if (!this.checkAllowIp(req.socket.remoteAddress)) {
					return;
				}
				if (typeof message === 'string') {
					return; // ignore text messages
				}
				let payload: Buffer;
				if (Array.isArray(message)) {
					payload = Buffer.concat(message);
				} else if (message instanceof ArrayBuffer) {
					payload = Buffer.from(message);
				} else {
					payload = Buffer.from(message);
				}
				const response = this.handleRequest(payload, 'inet6', 'ws');
				if (ws.readyState === ws.OPEN) {
					ws.send(response);
				}
			});
		});
	}

	private bindTcp(): Promise<void> {
		return new Promise((resolve, reject) => {
			const tcpServer = net.createServer((socket) => {
				this.logger?.debug(`TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);
				this.attachStreamSocket(socket, 'inet', 'tcp');
			});
			this.#tcpServers.push(tcpServer);
			tcpServer.on('error', reject);
			tcpServer.listen({port: this.#port, host: this.#options.bindAddress}, () => {
				this.logger?.info(`Bound to TCP on port ${this.#options.bindAddress}:${this.#port} ${this.inSecure ? '[RW]' : '[RO]'}`);
				resolve();
			});
		});
	}

	private bindTcpIpv6(): Promise<void> {
		return new Promise((resolve, reject) => {
			const tcpServer = net.createServer((socket) => {
				this.logger?.debug(`TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);
				this.attachStreamSocket(socket, 'inet6', 'tcp');
			});
			this.#tcpServers.push(tcpServer);
			tcpServer.on('error', reject);
			tcpServer.listen({port: this.#port, host: this.#options.bindIpv6Address, ipv6Only: true}, () => {
				this.logger?.info(`Bound to TCP on port ${this.#options.bindIpv6Address}:${this.#port} ${this.inSecure ? '[RW]' : '[RO]'}`);
				resolve();
			});
		});
	}

	private bindUdp(): Promise<void> {
		return new Promise((resolve, reject) => {
			const udpSocket = dgram.createSocket({type: 'udp4'});
			this.#udpSockets.push(udpSocket);
			udpSocket.on('message', (msg, rinfo) => {
				this.logger?.debug(`Received UDP message from ${rinfo.address}:${rinfo.port} - ${msg.length} bytes`);
				try {
					const response = this.handleRequest(msg, 'inet', 'udp');
					udpSocket.send(response, rinfo.port, rinfo.address);
				} catch (_e) {
					// silent
				}
			});
			udpSocket.on('error', reject);
			udpSocket.bind(this.#port, this.#options.bindAddress, () => {
				this.logger?.info(`Bound to UDP on port ${this.#options.bindAddress}:${this.#port} ${this.inSecure ? '[RW]' : '[RO]'}`);
				resolve();
			});
		});
	}

	private bindUdpIpv6(): Promise<void> {
		return new Promise((resolve, reject) => {
			const udpSocket = dgram.createSocket({type: 'udp6', ipv6Only: true});
			this.#udpSockets.push(udpSocket);
			udpSocket.on('message', (msg, rinfo) => {
				this.logger?.debug(`Received UDP message from ${rinfo.address}:${rinfo.port} - ${msg.length} bytes`);
				try {
					const response = this.handleRequest(msg, 'inet6', 'udp');
					udpSocket.send(response, rinfo.port, rinfo.address);
				} catch (_e) {
					// silent
				}
			});
			udpSocket.on('error', reject);
			udpSocket.bind(this.#port, this.#options.bindIpv6Address, () => {
				this.logger?.info(`Bound to UDP on port ${this.#options.bindIpv6Address}:${this.#port} ${this.inSecure ? '[RW]' : '[RO]'}`);
				resolve();
			});
		});
	}

	public async close(): Promise<boolean> {
		const promises: Promise<boolean>[] = [];
		if (this.#options.tcp) {
			promises.push(this.closeTcp());
		}
		if (this.#options.udp) {
			promises.push(this.closeUdp());
		}
		if (this.#options.wsPort) {
			promises.push(this.closeWebsocket());
		}
		promises.push(this.closeLocal(this.#options.socketPath));
		const results = await Promise.all(promises);
		this.#tcpServers = [];
		this.#udpSockets = [];
		this.#httpSockets = [];
		this.#localServer = undefined;
		return results.every((r) => r === true);
	}

	private async closeTcp(): Promise<boolean> {
		if (this.#tcpServers.length === 0) {
			return true;
		}
		const results = await Promise.all(
			this.#tcpServers.map(
				(server) =>
					new Promise<boolean>((resolve) => {
						server.close((err) => {
							resolve(!err);
						});
					}),
			),
		);
		return results.every(Boolean);
	}

	private async closeUdp(): Promise<boolean> {
		if (this.#udpSockets.length === 0) {
			return true;
		}
		const results = await Promise.all(
			this.#udpSockets.map(
				(socket) =>
					new Promise<boolean>((resolve) => {
						socket.close(() => {
							resolve(true);
						});
					}),
			),
		);
		return results.every(Boolean);
	}

	private async closeWebsocket(): Promise<boolean> {
		if (this.#httpSockets.length === 0) {
			return true;
		}
		const results = await Promise.all(
			this.#httpSockets.map(
				(server) =>
					new Promise<boolean>((resolve) => {
						server.close(() => {
							resolve(true);
						});
					}),
			),
		);
		return results.every(Boolean);
	}

	private bindLocal(socketPath: string): Promise<void> {
		// Remove stale socket file if it exists
		try {
			fs.unlinkSync(socketPath);
		} catch {
			// Ignore if file doesn't exist
		}
		return new Promise((resolve, reject) => {
			this.#localServer = net.createServer((socket) => {
				this.attachStreamSocket(socket, 'loopback', '-');
			});
			this.#localServer.on('error', reject);
			this.#localServer.listen(socketPath, () => {
				if (process.platform !== 'win32') {
					fs.chmodSync(socketPath, this.#options.socketMode);
				}
				if (process.platform !== 'win32') {
					this.logger?.info(`Bound to local socket at ${this.#options.socketPath} mode=${this.#options.socketMode.toString(8)} [RW]`);
				} else {
					this.logger?.info(`Bound to local socket at ${this.#options.socketPath} [RW]`);
				}
				resolve();
			});
		});
	}

	private closeLocal(socketPath: string): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.#localServer) {
				return resolve(true);
			}
			this.#localServer.close(() => {
				try {
					fs.unlinkSync(socketPath);
				} catch {
					// Ignore if already removed
				}
				resolve(true);
			});
		});
	}

	/**
	 * Attaches TCP record-mark framing (RFC 5531) to a stream socket.
	 * Used by both TCP and local (Unix domain socket / Windows named pipe) listeners.
	 */
	private attachStreamSocket(socket: net.Socket, protofmly: RpcbProtoFamily, proto: RpcbProtocol): void {
		let buffer = Buffer.alloc(0);
		socket.on('data', (data: Buffer) => {
			buffer = Buffer.concat([buffer, data]);
			while (buffer.length >= 4) {
				const length = buffer.readUInt32BE(0) & 0x7fffffff;
				if (buffer.length < 4 + length) {
					break;
				}
				const requestData = buffer.subarray(4, 4 + length);
				buffer = buffer.subarray(4 + length);
				try {
					const response = this.handleRequest(requestData, protofmly, proto);
					const responseHeader = Buffer.alloc(4);
					responseHeader.writeUInt32BE((0x80000000 | response.length) >>> 0, 0);
					socket.write(responseHeader);
					socket.write(response);
				} catch {
					// ignore decode errors
				}
			}
		});
		socket.on('error', () => {
			// ignore
		});
	}
}
