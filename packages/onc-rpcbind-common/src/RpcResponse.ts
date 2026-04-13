import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import type {IRpcTransport} from './interfaces/IRpcTransport';
import {
	RpcDeniedError,
	type RpcError,
	RpcGarbageArgsError,
	RpcProcUnavailError,
	RpcProgMismatchError,
	RpcProgUnavailError,
	RpcSystemError,
	RpcUnknownError,
} from './RpcError';
import {RpcAcceptStat, RpcReplyStat, type RpcReplyType, rpcReplySchemaModel} from './schema/RpcReply';

export type RpcResponseOk = {
	ok: true;
	xdr: IXdrBuffer;
	reply: RpcReplyType;
}

export type RpcResponseError = {
	ok: false;
	error: RpcError;
	reply: RpcReplyType;
}

export type RpcResponse = RpcResponseOk | RpcResponseError;

class RpcResponseImpl<B extends Uint8Array> {
	public readonly reply: RpcReplyType;
	private readonly remaining: B;
	private readonly transport: IRpcTransport<B>;

	public constructor(transport: IRpcTransport<B>, buffer: B) {
		this.transport = transport;
		const xdr = this.transport.createXdrBuffer(buffer);
		this.reply = rpcReplySchemaModel.decode(xdr);
		this.remaining = buffer.subarray(xdr.currentPointer) as B;
	}

	public get ok(): boolean {
		return this.reply.replyStat === RpcReplyStat.MSG_ACCEPTED && this.reply.acceptStat === RpcAcceptStat.SUCCESS;
	}

	public get xdr(): IXdrBuffer<B> {
		return this.transport.createXdrBuffer(this.remaining);
	}

	public get error(): RpcError {
		if (this.reply.replyStat === RpcReplyStat.MSG_DENIED) {
			return new RpcDeniedError('RPC Message Denied', this.reply);
		}
		switch (this.reply.acceptStat) {
			case RpcAcceptStat.PROG_UNAVAIL:
				return new RpcProgUnavailError('Program Unavailable', this.reply);
			case RpcAcceptStat.PROG_MISMATCH:
				return new RpcProgMismatchError('Program Mismatch', this.reply);
			case RpcAcceptStat.PROC_UNAVAIL:
				return new RpcProcUnavailError('Procedure Unavailable', this.reply);
			case RpcAcceptStat.GARBAGE_ARGS:
				return new RpcGarbageArgsError('Garbage Arguments', this.reply);
			case RpcAcceptStat.SYSTEM_ERR:
				return new RpcSystemError('System Error', this.reply);
			default:
				return new RpcUnknownError('Unknown RPC Error', this.reply);
		}
	}
}

export const RpcResponse = RpcResponseImpl as unknown as {
	new <B extends Uint8Array>(transport: IRpcTransport<B>, buffer: B): RpcResponse;
};
