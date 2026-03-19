import {
	type GetAddrListRequest,
	type GetAddrRequest,
	type Netbuf,
	type RpcbEntry,
	type RpcbMapping,
	type RpcbStat,
	RpcCall,
	type RpcCallType,
	type RpcNetId,
} from '@luolapeikko/node-onc-common';
import {type AnyRpcTransport, type RpcProgram, RpcRequest} from '@luolapeikko/xdr-ts';

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

	public getAddr({netid, prog, vers}: GetAddrRequest): Promise<string> {
		return this.call(RpcCall.getAddr, {netid, prog, vers});
	}

	public getAddrList({prog, vers}: GetAddrListRequest): Promise<RpcbEntry[]> {
		return this.call(RpcCall.getAddrList, {prog, vers});
	}

	public dump(): Promise<RpcbMapping[]> {
		return this.call(RpcCall.dump);
	}

	public uaddr2taddr(uaddr: string): Promise<Netbuf> {
		return this.call(RpcCall.uaddr2taddr, uaddr);
	}

	public taddr2uaddr(netbuf: Netbuf): Promise<string> {
		return this.call(RpcCall.taddr2uaddr, netbuf);
	}

	private async call<A = never, R = void>(call: RpcCallType<A, R>, args?: A): Promise<R> {
		const request = new RpcRequest(call.procedure, {
			args: call.args?.(args as A),
		});
		const response = await this.transport.call(request);
		if (!response.ok) {
			throw response.error;
		}
		if (call.decoder) {
			return call.decoder(response.xdr);
		}
		return undefined as R;
	}
}
