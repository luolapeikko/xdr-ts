import {XdrBuffer} from '../xdrBuffer/XdrBuffer';
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
import {RpcAcceptStat, RpcReplyStat, type RpcReplyType, rpcReplySchemaModel} from './RpcReply';

export interface RpcResponseOk {
	ok: true;
	xdr: XdrBuffer;
	reply: RpcReplyType;
}

export interface RpcResponseError {
	ok: false;
	error: RpcError;
	reply: RpcReplyType;
}

export type RpcResponse = RpcResponseOk | RpcResponseError;

class RpcResponseImpl {
	public readonly reply: RpcReplyType;
	private readonly remaining: Buffer;

	public constructor(buffer: Buffer) {
		const xdr = new XdrBuffer(buffer);
		this.reply = rpcReplySchemaModel.decode(new XdrBuffer(buffer));
		this.remaining = buffer.subarray(xdr.currentPointer);
	}

	public get ok(): boolean {
		return this.reply.replyStat === RpcReplyStat.MSG_ACCEPTED && this.reply.acceptStat === RpcAcceptStat.SUCCESS;
	}

	public get xdr(): XdrBuffer {
		return new XdrBuffer(this.remaining);
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
	new (buffer: Buffer): RpcResponse;
};
