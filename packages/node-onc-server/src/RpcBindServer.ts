import * as dgram from 'node:dgram';
import * as net from 'node:net';
import type {ILoggerLike} from '@avanio/logger-like';
import {
	type GetAddrRequest,
	RpcBindProcedure,
	type RpcbEntry,
	RpcbSemantics,
	type RpcNetId,
	RpcResponseSchema,
	type SetProgramRequest,
	type UnsetProgramRequest,
} from '@luolapeikko/node-onc-common';
import {
	RpcAcceptStat,
	type RpcAuthType,
	RpcMsgType,
	type RpcProcedure,
	RpcReplyStat,
	rpcCallSchemaModel,
	rpcReplySchemaModel,
	XdrBuffer,
} from '@luolapeikko/xdr-ts';

function normalizeProcedure(prog: number, vers: number, proc: number): string {
	return `${prog}:${vers}:${proc}`;
}

function normalizeRpcProcedure(procedure: RpcProcedure): string {
	return normalizeProcedure(procedure.prog, procedure.vers, procedure.proc);
}

const procedures: Record<keyof typeof RpcBindProcedure, string> = {
	getTime: normalizeRpcProcedure(RpcBindProcedure.getTime),
	getStats: normalizeRpcProcedure(RpcBindProcedure.getStats),
	getAddr: normalizeRpcProcedure(RpcBindProcedure.getAddr),
	getAddrList: normalizeRpcProcedure(RpcBindProcedure.getAddrList),
	setProgram: normalizeRpcProcedure(RpcBindProcedure.setProgram),
	unsetProgram: normalizeRpcProcedure(RpcBindProcedure.unsetProgram),
	null: normalizeRpcProcedure(RpcBindProcedure.null),
	dump: normalizeRpcProcedure(RpcBindProcedure.dump),
	taddr2uaddr: normalizeRpcProcedure(RpcBindProcedure.taddr2uaddr),
	uaddr2taddr: normalizeRpcProcedure(RpcBindProcedure.uaddr2taddr),
	callIt: normalizeRpcProcedure(RpcBindProcedure.callIt),
	indirect: normalizeRpcProcedure(RpcBindProcedure.indirect),
} as const;

export type RpcBindServerOptions = {
	tcp?: boolean;
	udp?: boolean;
	logger?: ILoggerLike;
};

const defaultOptions = {
	tcp: true,
	udp: true,
	logger: undefined,
} as const satisfies RpcBindServerOptions;

type ServiceEntry = {prog: number; vers: number; owner: string; entry: RpcbEntry};

type ServiceKey = `${RpcNetId}:${number}:${number}`;

export class RpcBindServer {
	private readonly port: number;
	private readonly options: typeof defaultOptions | RpcBindServerOptions;
	private tcpServer: net.Server | undefined;
	private udpSocket: dgram.Socket | undefined;

	private readonly services = new Map<ServiceKey, ServiceEntry>();

	public constructor(port: number, options?: RpcBindServerOptions) {
		this.port = port;
		this.options = Object.assign({}, defaultOptions, options);
	}

	public async bind(): Promise<void> {
		const promises: Promise<void>[] = [];
		if (this.options.tcp) {
			promises.push(this.bindTcp());
			const entry: RpcbEntry = {
				maddr: `127.0.0.1.${this.port >> 8}.${this.port & 0xff}`,
				netid: 'tcp',
				semantics: RpcbSemantics.CLTS,
				protofmly: 'inet',
				proto: 'tcp',
			};
			this.services.set(this.getKey(entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry});
			this.options.logger?.info(`Bound to TCP on port ${this.port}`);
		}
		if (this.options.udp) {
			promises.push(this.bindUdp());
			const entry: RpcbEntry = {
				maddr: `127.0.0.1.${this.port >> 8}.${this.port & 0xff}`,
				netid: 'udp',
				semantics: RpcbSemantics.COTS_ORD,
				protofmly: 'inet',
				proto: 'udp',
			};
			this.services.set(this.getKey(entry.netid, 100000, 3), {prog: 100000, vers: 3, owner: 'superuser', entry});
			this.services.set(this.getKey(entry.netid, 100000, 4), {prog: 100000, vers: 4, owner: 'superuser', entry});
			this.options.logger?.info(`Bound to UDP on port ${this.port}`);
		}
		await Promise.all(promises);
	}

	private getKey(netid: RpcNetId, prog: number, vers: number): ServiceKey {
		return `${netid}:${prog}:${vers}`;
	}

	private bindTcp(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.tcpServer = net.createServer((socket) => {
				let buffer = Buffer.alloc(0);
				socket.on('data', (data) => {
					const bufferData = typeof data === 'string' ? Buffer.from(data) : data;
					buffer = Buffer.concat([buffer, bufferData]);
					while (buffer.length >= 4) {
						const header = buffer.readUInt32BE(0);
						const length = header & 0x7fffffff;
						// const isLast = (header & 0x80000000) !== 0;
						if (buffer.length >= 4 + length) {
							const requestData = buffer.subarray(4, 4 + length);
							buffer = buffer.subarray(4 + length);
							try {
								const response = this.handleRequest(requestData);
								const responseHeader = Buffer.alloc(4);
								responseHeader.writeUInt32BE((0x80000000 | response.length) >>> 0, 0);
								socket.write(responseHeader);
								socket.write(response);
							} catch (_e) {
								// ignore decode errors for now
							}
						} else {
							break;
						}
					}
				});
				socket.on('error', () => {
					// ignore
				});
			});
			this.tcpServer.on('error', reject);
			this.tcpServer.listen(this.port, () => {
				resolve();
			});
		});
	}

	private bindUdp(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.udpSocket = dgram.createSocket('udp4');
			this.udpSocket.on('message', (msg, rinfo) => {
				try {
					const response = this.handleRequest(msg);
					this.udpSocket?.send(response, rinfo.port, rinfo.address);
				} catch (_e) {
					// silent
				}
			});
			this.udpSocket.on('error', reject);
			this.udpSocket.bind(this.port, () => {
				resolve();
			});
		});
	}

	private handleRequest(data: Buffer): Buffer<ArrayBufferLike> {
		const xdr = new XdrBuffer(data);
		const {xid, prog, vers, proc} = rpcCallSchemaModel.decode(xdr);
		const procedure = normalizeProcedure(prog, vers, proc);
		let acceptStat: RpcAcceptStat = RpcAcceptStat.SUCCESS;
		let results: Buffer<ArrayBufferLike> = Buffer.alloc(0);

		switch (procedure) {
			case procedures.null: {
				break;
			}
			case procedures.getTime: {
				results = this.getTime();
				break;
			}
			case procedures.getAddrList: {
				const rpcb = this.decodeRpcb(xdr);
				results = this.getAddrList(rpcb.prog, rpcb.vers);
				break;
			}
			case procedures.dump: {
				results = this.getDump();
				break;
			}
			case procedures.getAddr: {
				const rpcb = this.decodeRpcb(xdr);
				results = this.getAddr(rpcb);
				break;
			}
			case procedures.setProgram: {
				const rpcb = this.decodeRpcb(xdr);
				results = this.setProgram(rpcb);
				break;
			}
			case procedures.unsetProgram: {
				const rpcb = this.decodeRpcb(xdr);
				results = this.unsetProgram(rpcb);
				break;
			}
			default:
				acceptStat = RpcAcceptStat.PROC_UNAVAIL;
		}

		const header = this.buildResponseHeader(xid, acceptStat);
		return Buffer.concat([header, results]);
	}

	public async close(): Promise<boolean> {
		const promises: Promise<boolean>[] = [];
		if (this.options.tcp) {
			promises.push(this.closeTcp());
		}
		if (this.options.udp) {
			promises.push(this.closeUdp());
		}
		const results = await Promise.all(promises);
		this.tcpServer = undefined;
		this.udpSocket = undefined;
		return results.every((r) => r === true);
	}

	private buildResponseHeader(xid: number, acceptStat: RpcAcceptStat, verf?: RpcAuthType) {
		const responseXdr = new XdrBuffer(1024);
		rpcReplySchemaModel.encode(responseXdr, {
			xid,
			mtype: RpcMsgType.REPLY,
			replyStat: RpcReplyStat.MSG_ACCEPTED,
			verf: verf ?? {flavor: 0, body: Buffer.alloc(0)},
			acceptStat,
		});

		return responseXdr.sliceUsed();
	}

	private getTime() {
		const xdrBuffer = RpcResponseSchema.getTime.encode(new XdrBuffer(4), Math.floor(Date.now() / 1000));
		return xdrBuffer.rawBuffer;
	}

	private decodeRpcb(xdr: XdrBuffer): SetProgramRequest {
		return {
			prog: xdr.readUInt(),
			vers: xdr.readUInt(),
			netid: xdr.readString<RpcNetId>(),
			addr: xdr.readString(),
			owner: xdr.readString(),
		};
	}

	private setProgram(rpcb: SetProgramRequest): Buffer<ArrayBufferLike> {
		const key = this.getKey(rpcb.netid, rpcb.prog, rpcb.vers);
		const notFound = !this.services.has(key);
		// Check if already exists
		if (notFound) {
			this.services.set(key, {
				prog: rpcb.prog,
				vers: rpcb.vers,
				owner: rpcb.owner,
				entry: this.buildRpcbEntry(rpcb),
			});
		}
		const xdrBuffer = RpcResponseSchema.setProgram.encode(new XdrBuffer(4), notFound);
		return xdrBuffer.rawBuffer;
	}

	private unsetProgram(rpcb: UnsetProgramRequest): Buffer<ArrayBufferLike> {
		const key = this.getKey(rpcb.netid, rpcb.prog, rpcb.vers);
		const xdrBuffer = RpcResponseSchema.unsetProgram.encode(new XdrBuffer(4), this.services.delete(key));
		return xdrBuffer.rawBuffer;
	}

	private getAddr(rpcb: GetAddrRequest): Buffer<ArrayBufferLike> {
		const key = this.getKey(rpcb.netid, rpcb.prog, rpcb.vers);
		const service = this.services.get(key);
		const xdrBuffer = RpcResponseSchema.getAddr.encode(new XdrBuffer(1024), service?.entry.maddr ?? '');
		return xdrBuffer.sliceUsed();
	}

	private buildRpcbEntry(rpcb: SetProgramRequest): RpcbEntry {
		switch (rpcb.netid) {
			case 'local':
				return {
					maddr: rpcb.addr,
					netid: rpcb.netid,
					semantics: RpcbSemantics.COTS_ORD,
					protofmly: 'loopback',
					proto: '-',
				};
			case 'tcp':
				return {
					maddr: rpcb.addr,
					netid: rpcb.netid,
					semantics: RpcbSemantics.CLTS,
					protofmly: 'inet',
					proto: 'tcp',
				};
			case 'tcp6':
				return {
					maddr: rpcb.addr,
					netid: rpcb.netid,
					semantics: RpcbSemantics.CLTS,
					protofmly: 'inet6',
					proto: 'tcp',
				};
			case 'udp':
				return {
					maddr: rpcb.addr,
					netid: rpcb.netid,
					semantics: RpcbSemantics.COTS_ORD,
					protofmly: 'inet',
					proto: 'udp',
				};
			case 'udp6':
				return {
					maddr: rpcb.addr,
					netid: rpcb.netid,
					semantics: RpcbSemantics.COTS_ORD,
					protofmly: 'inet6',
					proto: 'udp',
				};
			default:
				throw new Error(`Invalid netid ${rpcb.netid satisfies never}`);
		}
	}

	private getAddrList(prog: number, vers: number) {
		const xdr = new XdrBuffer(4096);
		const filtered = Array.from(this.services.values())
			.filter((s) => s.prog === prog && s.vers === vers)
			.map((s) => s.entry);

		xdr.writeList(filtered, (x, service: RpcbEntry) => {
			x.writeString(service.maddr);
			x.writeString(service.netid);
			x.writeUInt(service.semantics);
			x.writeString(service.protofmly);
			x.writeString(service.proto);
		});
		return xdr.rawBuffer.subarray(0, xdr.currentPointer);
	}

	private getDump() {
		const xdr = new XdrBuffer(8192);
		const mappings = Array.from(this.services.values());
		xdr.writeList(mappings, (x, service) => {
			x.writeUInt(service.prog);
			x.writeUInt(service.vers);
			x.writeString(service.entry.netid);
			x.writeString(service.entry.maddr);
			x.writeString(service.owner);
		});
		return xdr.rawBuffer.subarray(0, xdr.currentPointer);
	}

	private closeTcp(): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.tcpServer) {
				return resolve(true);
			}
			this.tcpServer.close((err) => {
				resolve(!err);
			});
		});
	}

	private closeUdp(): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.udpSocket) {
				return resolve(true);
			}
			this.udpSocket.close(() => {
				resolve(true);
			});
		});
	}
}
