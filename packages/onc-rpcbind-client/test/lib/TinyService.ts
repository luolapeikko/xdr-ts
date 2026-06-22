import * as dgram from 'node:dgram';
import * as net from 'node:net';
import {RpcNodeUdpTransport, XdrBuffer} from '@luolapeikko/onc-node';
import {
	type IRpcTransport,
	RpcAcceptStat,
	RpcAuthFlavor,
	RpcMsgType,
	type RpcProcedure,
	RpcUniversalAddress,
	rpcCallSchemaModel,
	rpcReplySchemaModel,
} from '@luolapeikko/onc-rpcbind-common';
import {RpcBindClient} from '../../src';

type TinyServiceOptions = {
	host?: string;
	procedure?: RpcProcedure;
	udpPort?: number;
	tcpPort?: number;
	timeProvider?: () => number;
	rpcbindHost?: string;
	rpcbindPort?: number;
	rpcbindOwner?: string;
	autoRegister?: boolean;
	logger?: Pick<Console, 'info' | 'debug' | 'error' | 'warn'>;
};

const defaultOptions = {
	host: '127.0.0.1',
	procedure: {proc: 1, vers: 1, prog: 0x5f0001},
	udpPort: 0,
	tcpPort: 0,
	timeProvider: () => Math.floor(Date.now() / 1000),
	logger: undefined,
	rpcbindHost: '127.0.0.1',
	rpcbindPort: 111,
	rpcbindOwner: 'owner',
	autoRegister: true,
} as const satisfies TinyServiceOptions;

export class TinyService {
	private readonly options: {
		host: string;
		procedure: RpcProcedure;
		udpPort: number;
		tcpPort: number;
		timeProvider: () => number;
		logger: undefined | Pick<Console, 'info' | 'debug' | 'error' | 'warn'>;
		rpcbindHost: string;
		rpcbindPort: number;
		rpcbindOwner: string;
		autoRegister: boolean;
	};
	private udpSocket: dgram.Socket | undefined;
	private tcpServer: net.Server | undefined;
	private rpcbindTransport: IRpcTransport | undefined;
	private rpcbindClient: RpcBindClient | undefined;
	private currentUdpPort = 0;
	private currentTcpPort = 0;
	private readonly events: string[] = [];

	public constructor(options: TinyServiceOptions = {}) {
		this.options = Object.assign({}, defaultOptions, options);
	}

	public get program() {
		return this.options.procedure.prog;
	}

	public get version() {
		return this.options.procedure.vers;
	}

	public get procedure() {
		return this.options.procedure.proc;
	}

	public get host() {
		return this.options.host;
	}

	public get udpPort() {
		if (!this.currentUdpPort) {
			throw new Error('TinyService UDP socket is not bound');
		}
		return this.currentUdpPort;
	}

	public get tcpPort() {
		if (!this.currentTcpPort) {
			throw new Error('TinyService TCP server is not bound');
		}
		return this.currentTcpPort;
	}

	public get udpUaddr() {
		return RpcUniversalAddress.from({host: this.options.host, port: this.udpPort});
	}

	public get tcpUaddr() {
		return RpcUniversalAddress.from({host: this.options.host, port: this.tcpPort});
	}

	public getEvents(): readonly string[] {
		return this.events;
	}

	public clearEvents(): void {
		this.events.length = 0;
	}

	public async start(): Promise<void> {
		try {
			await Promise.all([this.startUdp(), this.startTcp()]);
			this.log(`started program=${this.program} version=${this.version} procedure=${this.procedure} udp=${this.udpUaddr} tcp=${this.tcpUaddr}`);
			if (this.options.autoRegister) {
				await this.registerWithRpcbind();
			}
		} catch (error) {
			await Promise.allSettled([this.closeUdp(), this.closeTcp()]);
			throw error;
		}
	}

	public async close(): Promise<void> {
		this.log('closing service');
		try {
			if (this.options.autoRegister) {
				await this.unregisterFromRpcbind();
			}
		} finally {
			this.closeRpcbindClient();
			await Promise.all([this.closeUdp(), this.closeTcp()]);
		}
	}

	private startUdp(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.udpSocket = dgram.createSocket('udp4');
			this.udpSocket.on('error', reject);
			this.udpSocket.on('message', (msg, rinfo) => {
				this.log(`udp recv bytes=${msg.length} from=${rinfo.address}:${rinfo.port}`);
				const response = this.handleRequest(msg, `udp:${rinfo.address}:${rinfo.port}`);
				if (response) {
					this.log(`udp send bytes=${response.length} to=${rinfo.address}:${rinfo.port}`);
					this.udpSocket?.send(response, rinfo.port, rinfo.address);
				}
			});
			this.udpSocket.bind(this.options.udpPort, this.options.host, () => {
				const bound = this.udpSocket?.address();
				if (bound && typeof bound !== 'string') {
					this.currentUdpPort = bound.port;
				}
				this.log(`udp bound host=${this.options.host} port=${this.currentUdpPort}`);
				resolve();
			});
		});
	}

	private startTcp(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.tcpServer = net.createServer((socket) => {
				this.log(`tcp client connected remote=${socket.remoteAddress ?? 'unknown'}:${socket.remotePort ?? 0}`);
				let received: Buffer<ArrayBufferLike> = Buffer.alloc(0);
				socket.on('data', (data) => {
					received = this.handleTcpData(socket, received, data);
				});
				socket.on('close', () => {
					this.log(`tcp client closed remote=${socket.remoteAddress ?? 'unknown'}:${socket.remotePort ?? 0}`);
				});
			});

			this.tcpServer.on('error', reject);
			this.tcpServer.listen(this.options.tcpPort, this.options.host, () => {
				const bound = this.tcpServer?.address();
				if (bound && typeof bound !== 'string') {
					this.currentTcpPort = bound.port;
				}
				this.log(`tcp bound host=${this.options.host} port=${this.currentTcpPort}`);
				resolve();
			});
		});
	}

	private handleTcpData(socket: net.Socket, received: Buffer<ArrayBufferLike>, data: Buffer | string): Buffer<ArrayBufferLike> {
		const chunk = typeof data === 'string' ? Buffer.from(data) : data;
		this.log(`tcp recv chunk bytes=${chunk.length} from=${socket.remoteAddress ?? 'unknown'}:${socket.remotePort ?? 0}`);
		let buffered = Buffer.concat([received, chunk]);

		while (buffered.length >= 4) {
			const fragmentHeader = buffered.readUInt32BE(0);
			const fragmentLength = fragmentHeader & 0x7fffffff;
			if (buffered.length < 4 + fragmentLength) {
				return buffered;
			}

			const requestData = buffered.subarray(4, 4 + fragmentLength);
			buffered = buffered.subarray(4 + fragmentLength);

			const response = this.handleRequest(requestData, `tcp:${socket.remoteAddress ?? 'unknown'}:${socket.remotePort ?? 0}`);
			if (!response) {
				continue;
			}

			const responseHeader = Buffer.alloc(4);
			responseHeader.writeUInt32BE((0x80000000 | response.length) >>> 0, 0);
			this.log(`tcp send fragment bytes=${response.length} to=${socket.remoteAddress ?? 'unknown'}:${socket.remotePort ?? 0}`);
			socket.write(responseHeader);
			socket.write(response);
		}

		return buffered;
	}

	private closeUdp(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.udpSocket) {
				resolve();
				return;
			}
			this.udpSocket.close(() => {
				this.log('udp socket closed');
				this.udpSocket = undefined;
				this.currentUdpPort = 0;
				resolve();
			});
		});
	}

	private closeTcp(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.tcpServer) {
				resolve();
				return;
			}
			this.tcpServer.close(() => {
				this.log('tcp server closed');
				this.tcpServer = undefined;
				this.currentTcpPort = 0;
				resolve();
			});
		});
	}

	private handleRequest(data: Buffer, source: string): Buffer | undefined {
		const xdr = new XdrBuffer(data);
		const call = rpcCallSchemaModel.decode(xdr);
		this.log(
			`decoded source=${source} xid=${call.xid} prog=${call.prog} vers=${call.vers} proc=${call.proc} cred=${call.cred.flavor} bodyBytes=${data.length}`,
		);

		const isMatch = call.prog === this.options.procedure.prog && call.vers === this.options.procedure.vers && call.proc === this.options.procedure.proc;

		const acceptStat = isMatch ? RpcAcceptStat.SUCCESS : RpcAcceptStat.PROC_UNAVAIL;
		const header = this.buildReplyHeader(call.xid, acceptStat);

		if (!isMatch) {
			this.log(`request mismatch source=${source} acceptStat=${acceptStat}`);
			return header;
		}

		const body = new XdrBuffer(8);
		const currentTime = this.options.timeProvider();
		body.writeUInt(currentTime);
		this.log(`request success source=${source} result=${currentTime}`);
		return Buffer.concat([header, body.sliceUsed()]);
	}

	private buildReplyHeader(xid: number, acceptStat: RpcAcceptStat): Buffer {
		const xdr = new XdrBuffer(64);
		rpcReplySchemaModel.encode(xdr, {
			xid,
			mtype: RpcMsgType.REPLY,
			replyStat: 0,
			verf: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
			acceptStat,
		});
		return xdr.sliceUsed();
	}

	private getRpcbindClient(): RpcBindClient {
		if (!this.rpcbindClient) {
			this.rpcbindTransport = new RpcNodeUdpTransport({host: this.options.rpcbindHost, port: this.options.rpcbindPort});
			this.rpcbindClient = new RpcBindClient(this.rpcbindTransport);
		}
		return this.rpcbindClient;
	}

	private async registerWithRpcbind(): Promise<void> {
		const client = this.getRpcbindClient();
		this.log(`registering with rpcbind host=${this.options.rpcbindHost} port=${this.options.rpcbindPort} udp=${this.udpUaddr} tcp=${this.tcpUaddr}`);
		await client.setProgram({prog: this.program, vers: this.version}, 'udp', this.udpUaddr, this.options.rpcbindOwner);
		await client.setProgram({prog: this.program, vers: this.version}, 'tcp', this.tcpUaddr, this.options.rpcbindOwner);
		this.log('rpcbind registration complete');
	}

	private async unregisterFromRpcbind(): Promise<void> {
		if (!this.rpcbindClient) {
			return;
		}
		this.log('unregistering from rpcbind');
		await this.rpcbindClient.unsetProgram({prog: this.program, vers: this.version}, 'udp');
		await this.rpcbindClient.unsetProgram({prog: this.program, vers: this.version}, 'tcp');
		this.log('rpcbind unregister complete');
	}

	private closeRpcbindClient(): void {
		this.rpcbindTransport = undefined;
		this.rpcbindClient = undefined;
	}

	private log(message: string): void {
		const entry = `[TinyService] ${message}`;
		this.events.push(entry);
		this.options.logger?.info(entry);
	}
}
