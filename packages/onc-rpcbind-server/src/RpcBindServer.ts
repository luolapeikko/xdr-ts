import * as dgram from 'node:dgram';
import * as fs from 'node:fs';
import * as net from 'node:net';
import type {ILoggerLike} from '@avanio/logger-like';
import {XdrBuffer} from '@luolapeikko/onc-node';
import {type RpcbEntry, RpcbSemantics, RpcUniversalAddress} from '@luolapeikko/onc-rpcbind-common';
import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import http from 'http';
import {AbstractRpcBindServer} from './AbstractRpcBindServer';
import {getWebsocketServer} from './Websocket';

export type RpcBindServerOptions = {
	tcp?: boolean;
	udp?: boolean;
	ipv6?: boolean;
	ws?: boolean;
	/**
	 * Enable Unix domain socket (Linux/macOS) or Windows named pipe listener.
	 * Requires `socketPath` to be set.
	 */
	local?: boolean;
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
		ws: boolean;
		ipv6: boolean;
		local: boolean;
		socketPath: string | undefined;
		socketMode: number;
		wsPort: number;
		bindAddress: string;
		bindIpv6Address: string;
		allowOrigins: string[];
	};
	#tcpServer: net.Server | undefined;
	#udpSocket: dgram.Socket | undefined;
	#httpSocket: http.Server | undefined;
	#localServer: net.Server | undefined;

	#defaultOptions = {
		tcp: true,
		udp: true,
		ws: false,
		ipv6: false,
		local: false,
		socketPath: undefined,
		socketMode: 0o666,
		logger: undefined,
		wsPort: 8111,
		bindAddress: '127.0.0.1',
		bindIpv6Address: '::1',
		allowOrigins: [],
	} as const satisfies RpcBindServerOptions;

	public constructor(port: number, options?: RpcBindServerOptions) {
		super(options);
		this.#port = port;
		this.#options = Object.assign({}, this.#defaultOptions, options);
	}

	public createXdrBuffer(initialize?: number | Buffer): IXdrBuffer<Buffer> {
		return new XdrBuffer(initialize);
	}

	public async bind(): Promise<void> {
		const promises: Promise<void>[] = [];
		const localRpcUaddr = RpcUniversalAddress.from({host: '127.0.0.1', port: this.#port});
		if (this.#options.tcp) {
			promises.push(this.bindTcp());
			const entry: RpcbEntry = {
				maddr: localRpcUaddr,
				netid: 'tcp',
				semantics: RpcbSemantics.CLTS,
				protofmly: 'inet',
				proto: 'tcp',
			};
			this.services.set(this.getKey(entry.netid, 100000, 2), {prog: 100000, vers: 2, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry});
			this.logger?.info(`Bound to TCP on port ${this.#options.bindAddress}:${this.#port}`);
		}
		if (this.#options.udp) {
			promises.push(this.bindUdp());
			const entry: RpcbEntry = {
				maddr: localRpcUaddr,
				netid: 'udp',
				semantics: RpcbSemantics.COTS_ORD,
				protofmly: 'inet',
				proto: 'udp',
			};
			this.services.set(this.getKey(entry.netid, 100000, 2), {prog: 100000, vers: 2, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry});
			this.logger?.info(`Bound to UDP on port ${this.#options.bindAddress}:${this.#port}`);
		}
		if (this.#options.ipv6) {
			if (this.#options.tcp) {
				promises.push(this.bindTcpIpv6());
				const ipv6Entry: RpcbEntry = {
					maddr: RpcUniversalAddress.from({host: '::1', port: this.#port}),
					netid: 'tcp6',
					semantics: RpcbSemantics.CLTS,
					protofmly: 'inet6',
					proto: 'tcp',
				};
				this.services.set(this.getKey(ipv6Entry.netid, 100000, 2), {prog: 100000, vers: 2, owner: 'superuser', entry: ipv6Entry});
				this.services.set(this.getKey(ipv6Entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry: ipv6Entry});
				this.services.set(this.getKey(ipv6Entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry: ipv6Entry});
				this.logger?.info(`Bound to TCP on port ${this.#options.bindIpv6Address}:${this.#port}`);
			}
			if (this.#options.udp) {
				promises.push(this.bindUdpIpv6());
				const ipv6Entry: RpcbEntry = {
					maddr: RpcUniversalAddress.from({host: '::1', port: this.#port}),
					netid: 'udp6',
					semantics: RpcbSemantics.COTS_ORD,
					protofmly: 'inet6',
					proto: 'udp',
				};
				this.services.set(this.getKey(ipv6Entry.netid, 100000, 2), {prog: 100000, vers: 2, owner: 'superuser', entry: ipv6Entry});
				this.services.set(this.getKey(ipv6Entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry: ipv6Entry});
				this.services.set(this.getKey(ipv6Entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry: ipv6Entry});
				this.logger?.info(`Bound to UDP on port ${this.#options.bindIpv6Address}:${this.#port}`);
			}
		}
		if (this.#options.ws) {
			const entry: RpcbEntry = {
				maddr: localRpcUaddr,
				netid: 'ws',
				semantics: RpcbSemantics.COTS_ORD,
				protofmly: 'inet',
				proto: 'ws',
			};
			this.services.set(this.getKey(entry.netid, 100000, 2), {prog: 100000, vers: 2, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry});
			await this.bindWebsocket();
			this.logger?.info(`Bound to Websocket on port ${this.#options.wsPort}`);
		}
		if (this.#options.local) {
			if (!this.#options.socketPath) {
				throw new Error('socketPath must be set when local is enabled');
			}
			const entry: RpcbEntry = {
				maddr: this.#options.socketPath,
				netid: 'local',
				semantics: RpcbSemantics.COTS_ORD,
				protofmly: 'loopback',
				proto: '-',
			};
			this.services.set(this.getKey(entry.netid, 100000, 2), {prog: 100000, vers: 2, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry});
			promises.push(this.bindLocal(this.#options.socketPath));
			this.logger?.info(`Bound to local socket at ${this.#options.socketPath}`);
		}
		await Promise.all(promises);
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

	private async bindWebsocket(): Promise<void> {
		if (!this.#options.ws) {
			return Promise.resolve();
		}
		const WebSocketServer = await getWebsocketServer();
		this.#httpSocket = http.createServer((req, res) => {
			const origin = req.headers.origin;
			if (origin && this.addOriginRule(origin)) {
				res.setHeader('Access-Control-Allow-Origin', origin);
				res.setHeader('Vary', 'Origin');
				res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
				res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
				res.setHeader('Access-Control-Allow-Credentials', 'true');
			}
			if (origin && req.method === 'OPTIONS') {
				res.writeHead(204);
				return res.end();
			}
		});
		this.#httpSocket.listen(this.#options.wsPort, this.#options.bindAddress, () => {
			console.log(`Listening on ${this.#options.bindAddress}:${this.#options.wsPort}`);
		});
		const wss = new WebSocketServer({server: this.#httpSocket});
		wss.on('connection', (ws, req) => {
			ws.on('message', async (message) => {
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
				const response = await this.handleRequest(payload);
				if (ws.readyState === ws.OPEN) {
					ws.send(response);
				}
			});
		});
	}

	private bindTcp(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.#tcpServer = net.createServer((socket) => {
				this.logger?.debug(`TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);
				this.attachStreamSocket(socket);
			});
			this.#tcpServer.on('error', reject);
			this.#tcpServer.listen(this.#port, this.#options.bindAddress, () => {
				resolve();
			});
		});
	}

	private bindTcpIpv6(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.#tcpServer = net.createServer((socket) => {
				this.logger?.debug(`TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);
				this.attachStreamSocket(socket);
			});
			this.#tcpServer.on('error', reject);
			this.#tcpServer.listen(this.#port, this.#options.bindIpv6Address, () => {
				resolve();
			});
		});
	}

	private bindUdp(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.#udpSocket = dgram.createSocket('udp4');
			this.#udpSocket.on('message', (msg, rinfo) => {
				this.logger?.debug(`Received UDP message from ${rinfo.address}:${rinfo.port} - ${msg.length} bytes`);
				try {
					const response = this.handleRequest(msg);
					this.#udpSocket?.send(response, rinfo.port, rinfo.address);
				} catch (_e) {
					// silent
				}
			});
			this.#udpSocket.on('error', reject);
			this.#udpSocket.bind(this.#port, this.#options.bindAddress, () => {
				resolve();
			});
		});
	}

	private bindUdpIpv6(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.#udpSocket = dgram.createSocket('udp6');
			this.#udpSocket.on('message', (msg, rinfo) => {
				this.logger?.debug(`Received UDP message from ${rinfo.address}:${rinfo.port} - ${msg.length} bytes`);
				try {
					const response = this.handleRequest(msg);
					this.#udpSocket?.send(response, rinfo.port, rinfo.address);
				} catch (_e) {
					// silent
				}
			});
			this.#udpSocket.on('error', reject);
			this.#udpSocket.bind(this.#port, this.#options.bindIpv6Address, () => {
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
		if (this.#options.ws) {
			promises.push(this.closeWebsocket());
		}
		if (this.#options.local && this.#options.socketPath) {
			promises.push(this.closeLocal(this.#options.socketPath));
		}
		const results = await Promise.all(promises);
		this.#tcpServer = undefined;
		this.#udpSocket = undefined;
		this.#httpSocket = undefined;
		this.#localServer = undefined;
		return results.every((r) => r === true);
	}

	private closeTcp(): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.#tcpServer) {
				return resolve(true);
			}
			this.#tcpServer.close((err) => {
				resolve(!err);
			});
		});
	}

	private closeUdp(): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.#udpSocket) {
				return resolve(true);
			}
			this.#udpSocket.close(() => {
				resolve(true);
			});
		});
	}

	private closeWebsocket(): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.#httpSocket) {
				return resolve(true);
			}
			this.#httpSocket.close(() => {
				resolve(true);
			});
		});
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
				this.attachStreamSocket(socket);
			});
			this.#localServer.on('error', reject);
			this.#localServer.listen(socketPath, () => {
				if (process.platform !== 'win32') {
					fs.chmodSync(socketPath, this.#options.socketMode);
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
	private attachStreamSocket(socket: net.Socket): void {
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
					const response = this.handleRequest(requestData);
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
