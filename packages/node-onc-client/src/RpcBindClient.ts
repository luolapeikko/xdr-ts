import {
	type GetAddrListRequest,
	type GetAddrRequest,
	type Netbuf,
	RpcBindProcedure,
	type RpcbEntry,
	type RpcbMapping,
	type RpcbSemantics,
	type RpcbStat,
	type RpcbsAddrList,
	type RpcbsRmtCallList,
	RpcCall,
	type RpcCallType,
	type RpcNetId,
} from '@luolapeikko/node-onc-common';
import {type AnyRpcTransport, type IXdrBuffer, type RpcProgram, RpcRequest} from '@luolapeikko/xdr-ts';

export class RpcBindClient {
	private transport: AnyRpcTransport;
	public constructor(transport: AnyRpcTransport) {
		this.transport = transport;
	}

	public getTime(): Promise<number> {
		return this.call(RpcCall.getTime);
	}

	public null(): Promise<void> {
		return this.call(RpcCall.null);
	}

	public setProgram({prog, vers}: RpcProgram, netid: RpcNetId, addr: string, owner: string): Promise<boolean> {
		return this.call(RpcCall.setProgram, {prog, vers, netid, addr, owner});
	}

	public unsetProgram({prog, vers}: RpcProgram, netid: RpcNetId): Promise<boolean> {
		return this.call(RpcCall.unsetProgram, {prog, vers, netid});
	}

	public getStats(): Promise<RpcbStat[]> {
		return this.call(RpcCall.getStats);
	}

	public async getAddr({netid, prog, vers}: GetAddrRequest): Promise<string> {
		const request = new RpcRequest(RpcBindProcedure.getAddr, {
			args: (xdr) => {
				xdr.writeUInt(prog);
				xdr.writeUInt(vers);
				xdr.writeString(netid);
				xdr.writeString(''); // r_addr (not used for query)
				xdr.writeString(''); // r_owner (not used for query)
			},
		});
		const response = await this.transport.call(request);
		if (!response.ok) {
			throw response.error;
		}
		return response.xdr.readString();
	}

	public async getAddrList({prog, vers}: GetAddrListRequest): Promise<RpcbEntry[]> {
		const request = new RpcRequest(RpcBindProcedure.getAddrList, {
			args: (xdr) => {
				xdr.writeUInt(prog);
				xdr.writeUInt(vers);
				xdr.writeString(''); // netid
				xdr.writeString(''); // addr
				xdr.writeString(''); // owner
			},
		});
		const response = await this.transport.call(request);
		if (!response.ok) {
			throw response.error;
		}
		return this.decodeEntryList(response.xdr);
	}

	public async dump(): Promise<RpcbMapping[]> {
		const request = new RpcRequest(RpcBindProcedure.dump);
		const response = await this.transport.call(request);
		if (!response.ok) {
			throw response.error;
		}
		return this.decodeDumpList(response.xdr);
	}

	public async uaddr2taddr(uaddr: string): Promise<Netbuf> {
		const request = new RpcRequest(RpcBindProcedure.uaddr2taddr, {
			args: (xdr) => {
				xdr.writeString(uaddr);
			},
		});
		const response = await this.transport.call(request);
		if (!response.ok) {
			throw response.error;
		}
		return this.decodeNetbuf(response.xdr);
	}

	public async taddr2uaddr(netbuf: Netbuf): Promise<string> {
		const request = new RpcRequest(RpcBindProcedure.taddr2uaddr, {
			args: (xdr) => {
				this.encodeNetbuf(xdr, netbuf);
			},
		});
		const response = await this.transport.call(request);
		if (!response.ok) {
			throw response.error;
		}
		return response.xdr.readString();
	}

	private async call<A = never, R = void>(call: RpcCallType<A, R>, args?: A): Promise<R> {
		const request = new RpcRequest(call.procedure, {
			args: call.args?.(args as A),
		});
		const response = await this.transport.call(request);
		if (!response.ok) {
			throw response.error;
		}
		if (call.response) {
			return call.response(response.xdr);
		}
		return undefined as R;
	}



	private decodeEntryList(xdr: IXdrBuffer): RpcbEntry[] {
		return xdr.readList(
			(x) => ({
				maddr: x.readString(),
				netid: x.readString(),
				semantics: x.readUInt<RpcbSemantics>(),
				protofmly: x.readString<RpcbEntry['protofmly']>(),
				proto: x.readString<RpcbEntry['proto']>(),
			}),
			(x) => x.readUInt(),
		);
	}

	private decodeDumpList(xdr: IXdrBuffer): RpcbMapping[] {
		return xdr.readList(
			(x) => ({
				prog: x.readUInt(),
				vers: x.readUInt(),
				netid: x.readString<RpcNetId>(),
				addr: x.readString(),
				owner: x.readString(),
			}),
			(x) => x.readUInt(),
		);
	}

	private decodeNetbuf(xdr: IXdrBuffer): Netbuf {
		return {
			maxlen: xdr.readUInt(),
			buf: xdr.readOpaque(),
		};
	}

	private encodeNetbuf(xdr: IXdrBuffer, netbuf: Netbuf): void {
		xdr.writeUInt(netbuf.maxlen);
		xdr.writeOpaque(netbuf.buf);
	}
}
