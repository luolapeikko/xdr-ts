import {
	type GetAddrListRequest,
	type GetAddrRequest,
	type IRpcTransport,
	type Netbuf,
	PortMapperV2,
	type PortMapperV2CallItRequest,
	type PortMapperV2CallItResponse,
	programAsRpcProcedure,
	RpcBindV3,
	RpcBindV4,
	type RpcbEntry,
	type RpcbStat,
	type RpcbType,
	type RpcCallType,
	type RpcNetId,
	type RpcProgram,
	type RpcProgramCoder,
	type RpcProgramSetup,
	type RpcRemoteCallCoder,
	RpcRequest,
} from '@luolapeikko/onc-rpcbind-common';
import type {InferXdrCodecInput, InferXdrCodecOutput, IXdrBuffer} from '@luolapeikko/onc-xdr';

export type RemoteCallOptions<A, O = void> = {
	request?: (xdr: IXdrBuffer, value: A) => void;
	response?: (xdr: IXdrBuffer) => O;
};

export class RpcBindClient {
	private transport: IRpcTransport;
	public constructor(transport: IRpcTransport) {
		this.transport = transport;
	}

	public getTime(): Promise<number> {
		return this.callProcedure(RpcBindV3, 'RPCBPROC_GETTIME');
	}

	public null(): Promise<void> {
		return this.callProcedure(PortMapperV2, 'PMAPPROC_NULL');
	}

	public setProgram({prog, vers}: RpcProgram, netid: RpcNetId, addr: string, owner: string): Promise<boolean> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_SET', {prog, vers, netid, addr, owner});
	}

	public unsetProgram({prog, vers}: RpcProgram, netid: RpcNetId): Promise<boolean> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_UNSET', {prog, vers, netid, addr: '', owner: ''});
	}

	public getStats(): Promise<RpcbStat[]> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_GETSTAT');
	}

	public getAddr({netid, prog, vers}: GetAddrRequest): Promise<string> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_GETADDR', {netid, prog, vers, addr: '', owner: ''});
	}

	public getVersAddr({netid, prog, vers}: GetAddrRequest): Promise<string> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_GETVERSADDR', {netid, prog, vers, addr: '', owner: ''});
	}

	public getAddrList({prog, vers}: GetAddrListRequest): Promise<RpcbEntry[]> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_GETADDRLIST', {prog, vers, netid: '' as RpcNetId, addr: '', owner: ''});
	}

	public dump(): Promise<RpcbType[]> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_DUMP');
	}

	public uaddr2taddr(uaddr: string): Promise<Netbuf> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_UADDR2TADDR', uaddr);
	}

	public taddr2uaddr(netbuf: Netbuf): Promise<string> {
		return this.callProcedure(RpcBindV4, 'RPCBPROC_TADDR2UADDR', netbuf);
	}

	public callIt<R extends RpcRemoteCallCoder>(
		rmCall: R,
		args?: InferXdrCodecInput<R['request']>,
	): Promise<PortMapperV2CallItResponse<InferXdrCodecOutput<R['response']>>> {
		const proxyCall = this.getAsRpcCallType(RpcBindV3, 'RPCBPROC_CALLIT');
		return this.remoteCall(proxyCall, rmCall, args);
	}

	public broadcastCall<R extends RpcRemoteCallCoder>(
		rmCall: R,
		args?: InferXdrCodecInput<R['request']>,
	): Promise<PortMapperV2CallItResponse<InferXdrCodecOutput<R['response']>>> {
		const proxyCall = this.getAsRpcCallType(RpcBindV4, 'RPCBPROC_BCAST');
		return this.remoteCall(proxyCall, rmCall, args);
	}

	public indirectCall<R extends RpcRemoteCallCoder>(
		rmCall: R,
		args?: InferXdrCodecInput<R['request']>,
	): Promise<PortMapperV2CallItResponse<InferXdrCodecOutput<R['response']>>> {
		const proxyCall = this.getAsRpcCallType(RpcBindV4, 'RPCBPROC_INDIRECT');
		return this.remoteCall(proxyCall, rmCall, args);
	}

	public getAsRpcCallType<TProcedures extends Record<string, RpcProgramCoder>, TProcedure extends keyof TProcedures>(
		setup: RpcProgramSetup & {procedures: TProcedures},
		procedure: TProcedure,
	): RpcCallType<InferXdrCodecInput<TProcedures[TProcedure]['request']>, InferXdrCodecOutput<TProcedures[TProcedure]['response']>> {
		const proc = setup.procedures[procedure];
		return {
			procedure: programAsRpcProcedure(setup, procedure),
			args: proc.request?.encode,
			decoder: proc.response?.decode,
		};
	}

	private async callProcedure<TProcedures extends Record<string, RpcProgramCoder>, TProcedure extends keyof TProcedures>(
		setup: RpcProgramSetup & {procedures: TProcedures},
		procedure: TProcedure,
		args?: InferXdrCodecInput<TProcedures[TProcedure]['request']>,
	): Promise<InferXdrCodecOutput<TProcedures[TProcedure]['response']>> {
		const proc = setup.procedures[procedure];
		const request = new RpcRequest(
			{proc: proc.proc, prog: setup.prog, vers: setup.vers},
			{
				args: (xdr) => proc.request?.encode(xdr, args),
			},
		);
		const response = await this.transport.call(request);
		if (!response.ok) {
			throw response.error;
		}
		if (proc.response) {
			return proc.response.decode(response.xdr);
		}
		return undefined as InferXdrCodecOutput<TProcedures[TProcedure]['response']>;
	}

	private async call<A = never, R = void>(call: RpcCallType<A, R>, args?: A): Promise<R> {
		const request = new RpcRequest(call.procedure, {
			args: (xdr) => call.args?.(xdr, args),
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

	private async remoteCall<R extends RpcRemoteCallCoder>(
		proxyCall: RpcCallType<PortMapperV2CallItRequest<Uint8Array>, PortMapperV2CallItResponse<Uint8Array>>,
		targetCall: R,
		args?: InferXdrCodecInput<R['request']>,
	): Promise<PortMapperV2CallItResponse<InferXdrCodecOutput<R['response']>>> {
		const argsXdr = this.transport.createXdrBuffer();
		targetCall.request?.encode(argsXdr, args);
		const encodedArgs = argsXdr.sliceUsed();

		const proxyResponse = await this.call(proxyCall, {
			prog: targetCall.prog,
			vers: targetCall.vers,
			proc: targetCall.proc,
			args: encodedArgs,
		});

		const resultsXdr = this.transport.createXdrBuffer(proxyResponse.results);
		const decodedResults = targetCall.response?.decode(resultsXdr);
		return {
			addr: proxyResponse.addr,
			results: decodedResults as InferXdrCodecOutput<R['response']>,
		};
	}
}
