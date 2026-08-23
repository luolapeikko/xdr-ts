import type {ILoggerLike} from '@avanio/logger-like';
import {
	IPPROTO,
	PortMapperV2,
	type PortMapperV2Mapping,
	RpcAcceptStat,
	type RpcAuthType,
	RpcBindV3,
	RpcBindV4,
	type RpcbEntry,
	type RpcbProtocol,
	type RpcbProtoFamily,
	RpcbSemantics,
	type RpcbType,
	RpcMsgType,
	type RpcNetId,
	type RpcProcedure,
	type RpcProgramCoder,
	type RpcProgramSetup,
	RpcReplyStat,
	RpcTypeCoders,
	RpcUniversalAddress,
	rpcCallSchemaModel,
	rpcReplySchemaModel,
} from '@luolapeikko/onc-rpcbind-common';
import type {InferXdrCodecInput, IXdrBuffer} from '@luolapeikko/onc-xdr';

function normalizeProcedure(prog: number, vers: number, proc: number): string {
	return `${prog}:${vers}:${proc}`;
}

export function normalizeRpcProcedure(procedure: RpcProcedure): string {
	return normalizeProcedure(procedure.prog, procedure.vers, procedure.proc);
}

/**
 * Takes a procedure definition and returns the normalized procedure string key used in the server's internal mapping.
 */
function buildKey<TProcedures extends Record<string, RpcProgramCoder>, TProcedure extends keyof TProcedures>(
	setup: RpcProgramSetup & {procedures: TProcedures},
	procedure: TProcedure,
): string {
	const proc = setup.procedures[procedure];
	return normalizeProcedure(setup.prog, setup.vers, proc.proc);
}

type ServiceEntry = {prog: number; vers: number; owner: string; entry: RpcbEntry};

type ServiceKey = `${RpcNetId}:${number}:${number}`;

export type AbstractRpcBindServerOptions = {
	logger?: ILoggerLike;
	inSecure?: boolean;
};

export abstract class AbstractRpcBindServer<B extends Uint8Array> {
	public abstract createXdrBuffer(initialize?: number | B): IXdrBuffer<B>;
	protected readonly logger?: ILoggerLike;
	protected readonly inSecure: boolean;

	public constructor(options?: AbstractRpcBindServerOptions) {
		this.logger = options?.logger;
		this.inSecure = options?.inSecure ?? false;
	}

	protected readonly services = new Map<ServiceKey, ServiceEntry>();

	protected handleRequest(data: B, protofmly: RpcbProtoFamily, proto: RpcbProtocol): Buffer<ArrayBufferLike> {
		const xdr = this.createXdrBuffer(data);
		const reqCall = rpcCallSchemaModel.decode(xdr);
		const procedure = normalizeRpcProcedure(reqCall);
		let acceptStat: RpcAcceptStat = RpcAcceptStat.SUCCESS;
		let results: Uint8Array = Buffer.alloc(0);

		switch (procedure) {
			case buildKey(PortMapperV2, 'PMAPPROC_NULL'):
			case buildKey(RpcBindV3, 'RPCBPROC_NULL'):
			case buildKey(RpcBindV4, 'RPCBPROC_NULL'):
				this.logger?.debug(`Received NULL ${reqCall.vers} procedure call`);
				break;

			case buildKey(RpcBindV3, 'RPCBPROC_GETTIME'):
			case buildKey(RpcBindV4, 'RPCBPROC_GETTIME'):
				this.logger?.debug(`Received RPCBPROC_GETTIME ${reqCall.vers} procedure call`);
				results = this.getTime();
				break;

			case buildKey(RpcBindV4, 'RPCBPROC_GETADDRLIST'): {
				this.logger?.debug(`Received RPCBPROC_GETADDRLIST ${reqCall.vers} procedure call`);
				const rpcb = RpcTypeCoders.rpcb.decode(xdr);
				results = this.getAddrList(rpcb.prog, rpcb.vers);
				break;
			}
			case buildKey(PortMapperV2, 'PMAPPROC_DUMP'): {
				this.logger?.debug(`Received PMAPPROC_DUMP ${reqCall.vers} procedure call`);
				results = this.getV2Dump();
				break;
			}
			case buildKey(RpcBindV4, 'RPCBPROC_DUMP'):
			case buildKey(RpcBindV3, 'RPCBPROC_DUMP'): {
				this.logger?.debug(`Received RPCBPROC_DUMP ${reqCall.vers} procedure call`);
				results = this.getV3Dump();
				break;
			}
			case buildKey(RpcBindV4, 'RPCBPROC_GETADDR'):
			case buildKey(RpcBindV3, 'RPCBPROC_GETADDR'): {
				this.logger?.debug(`Received RPCBPROC_GETADDR ${reqCall.vers} procedure call`);
				const rpcb = RpcTypeCoders.rpcb.decode(xdr);
				results = this.getAddr(rpcb);
				break;
			}
			case buildKey(PortMapperV2, 'PMAPPROC_GETPORT'): {
				this.logger?.debug(`Received PMAPPROC_GETPORT ${reqCall.vers} procedure call`);
				const mapping = PortMapperV2.procedures.PMAPPROC_GETPORT.request.decode(xdr);
				results = this.getPort(mapping);
				break;
			}
			case buildKey(RpcBindV4, 'RPCBPROC_SET'):
			case buildKey(RpcBindV3, 'RPCBPROC_SET'): {
				this.logger?.debug(`Received RPCBPROC_SET ${reqCall.vers} procedure call`);
				if (!this.inSecure && protofmly !== 'loopback') {
					acceptStat = RpcAcceptStat.PROC_UNAVAIL;
					this.logger?.warn(`Refusing RPCBPROC_UNSET call from ${protofmly}/${proto} due to security`);
					break;
				}
				const rpcb = RpcTypeCoders.rpcb.decode(xdr);
				results = this.setProgram(rpcb);
				break;
			}
			case buildKey(PortMapperV2, 'PMAPPROC_SET'): {
				this.logger?.debug(`Received PMAPPROC_SET ${reqCall.vers} procedure call`);
				if (!this.inSecure && protofmly !== 'loopback') {
					acceptStat = RpcAcceptStat.PROC_UNAVAIL;
					this.logger?.warn(`Refusing PMAPPROC_SET call from ${protofmly}/${proto} due to security`);
					break;
				}
				const mapping = PortMapperV2.procedures.PMAPPROC_SET.request.decode(xdr);
				results = this.setProgram(this.#portMapperToRpcbType(mapping));
				break;
			}
			case buildKey(RpcBindV4, 'RPCBPROC_UNSET'):
			case buildKey(RpcBindV3, 'RPCBPROC_UNSET'): {
				this.logger?.debug(`Received RPCBPROC_UNSET ${reqCall.vers} procedure call`);
				if (!this.inSecure && protofmly !== 'loopback') {
					acceptStat = RpcAcceptStat.PROC_UNAVAIL;
					this.logger?.warn(`Refusing RPCBPROC_UNSET call from ${protofmly}/${proto} due to security`);
					break;
				}
				const rpcb = RpcTypeCoders.rpcb.decode(xdr);
				results = this.unsetProgram(rpcb);
				break;
			}
			case buildKey(PortMapperV2, 'PMAPPROC_UNSET'): {
				this.logger?.debug(`Received PMAPPROC_UNSET ${reqCall.vers} procedure call`);
				if (!this.inSecure && protofmly !== 'loopback') {
					acceptStat = RpcAcceptStat.PROC_UNAVAIL;
					this.logger?.warn(`Refusing PMAPPROC_UNSET call from ${protofmly}/${proto} due to security`);
					break;
				}
				const mapping = PortMapperV2.procedures.PMAPPROC_UNSET.request.decode(xdr);
				results = this.unsetProgram(this.#portMapperToRpcbType(mapping));
				break;
			}
			default: {
				acceptStat = RpcAcceptStat.PROC_UNAVAIL;
			}
		}

		const header = this.buildResponseHeader(reqCall.xid, acceptStat);
		return Buffer.concat([header, results]);
	}

	protected getKey(netid: RpcNetId, prog: number, vers: number): ServiceKey {
		return `${netid}:${prog}:${vers}`;
	}

	#portMapperToRpcbType(mapping: PortMapperV2Mapping): RpcbType {
		return {
			prog: mapping.prog,
			vers: mapping.vers,
			netid: mapping.prot === IPPROTO.TCP ? 'tcp' : 'udp',
			addr: RpcUniversalAddress.from({host: '0.0.0.0', port: mapping.port}),
			owner: 'portmapper',
		};
	}

	private buildResponseHeader(xid: number, acceptStat: RpcAcceptStat, verf?: RpcAuthType) {
		const responseXdr = this.createXdrBuffer(1024);
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
		const xdr = RpcBindV3.procedures.RPCBPROC_GETTIME.response.encode(this.createXdrBuffer(4), Math.floor(Date.now() / 1000));
		return xdr.rawBuffer;
	}

	private setProgram(rpcb: InferXdrCodecInput<typeof RpcTypeCoders.rpcb>): Uint8Array {
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
		const xdr = RpcBindV3.procedures.RPCBPROC_SET.response.encode(this.createXdrBuffer(4), notFound);
		return xdr.rawBuffer;
	}

	private getAddrList(prog: number, vers: number) {
		const filtered = Array.from(this.services.values())
			.filter((s) => s.prog === prog && s.vers === vers)
			.map((s) => s.entry);
		const xdr = RpcBindV4.procedures.RPCBPROC_GETADDRLIST.response.encode(this.createXdrBuffer(4096), filtered);
		return xdr.sliceUsed();
	}

	private getV3Dump() {
		const mappings = Array.from(this.services.values()).map<RpcbType>((s) => ({
			prog: s.prog,
			vers: s.vers,
			netid: s.entry.netid,
			addr: s.entry.maddr,
			owner: s.owner,
		}));
		const xdr = RpcBindV3.procedures.RPCBPROC_DUMP.response.encode(this.createXdrBuffer(8192), mappings);
		return xdr.sliceUsed();
	}

	private getV2Dump() {
		const mappings = Array.from(this.services.values()).map<PortMapperV2Mapping>((s) => ({
			prog: s.prog,
			vers: s.vers,
			netid: s.entry.netid,
			port: RpcUniversalAddress.to(s.entry.maddr).port,
			prot: this.#netIdToV2Proto(s.entry.netid),
		}));
		const xdr = PortMapperV2.procedures.PMAPPROC_DUMP.response.encode(this.createXdrBuffer(8192), mappings);
		return xdr.sliceUsed();
	}

	private unsetProgram(rpcb: InferXdrCodecInput<typeof RpcTypeCoders.rpcb>): Uint8Array {
		const key = this.getKey(rpcb.netid, rpcb.prog, rpcb.vers);
		const xdrBuffer = PortMapperV2.procedures.PMAPPROC_UNSET.response.encode(this.createXdrBuffer(4), this.services.delete(key));
		return xdrBuffer.rawBuffer;
	}

	private getAddr(rpcb: InferXdrCodecInput<typeof RpcTypeCoders.rpcb>): Uint8Array {
		const key = this.getKey(rpcb.netid, rpcb.prog, rpcb.vers);
		const service = this.services.get(key);
		const xdrBuffer = RpcBindV4.procedures.RPCBPROC_GETADDR.response.encode(this.createXdrBuffer(1024), service?.entry.maddr ?? '');
		return xdrBuffer.sliceUsed();
	}

	/** portmapper PMAPPROC_GETPORT  */
	private getPort(mapping: PortMapperV2Mapping) {
		const key = this.getKey(mapping.prot === IPPROTO.TCP ? 'tcp' : 'udp', mapping.prog, mapping.vers);
		const service = this.services.get(key);
		const xdrBuffer = PortMapperV2.procedures.PMAPPROC_GETPORT.response.encode(
			this.createXdrBuffer(4),
			service ? RpcUniversalAddress.to(service.entry.maddr).port : 0,
		);
		return xdrBuffer.rawBuffer;
	}

	#netIdToV2Proto(netid: RpcNetId): PortMapperV2Mapping['prot'] {
		switch (netid) {
			case 'tcp':
			case 'tcp6':
				return IPPROTO.TCP;
			case 'udp':
			case 'udp6':
				return IPPROTO.UDP;
			case 'ws':
			case 'ws6':
				// Websocket is not directly supported in PortMapperV2, but we can treat it as TCP for compatibility
				return IPPROTO.TCP;
			case 'local':
				// Local transport does not have a direct equivalent in PortMapperV2, but we can treat it as TCP for compatibility
				return IPPROTO.TCP;
			default:
				throw new Error(`Unsupported netid for PortMapperV2 dump: ${netid satisfies never}`);
		}
	}

	private buildRpcbEntry(rpcb: InferXdrCodecInput<typeof RpcTypeCoders.rpcb>): RpcbEntry {
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
			case 'ws':
				return {
					maddr: rpcb.addr,
					netid: rpcb.netid,
					semantics: RpcbSemantics.CLTS,
					protofmly: 'inet',
					proto: 'ws',
				};
			case 'ws6':
				return {
					maddr: rpcb.addr,
					netid: rpcb.netid,
					semantics: RpcbSemantics.CLTS,
					protofmly: 'inet6',
					proto: 'ws',
				};
			default:
				throw new Error(`Invalid netid ${rpcb.netid satisfies never}`);
		}
	}
}
