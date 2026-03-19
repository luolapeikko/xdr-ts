import type {RpcReplyType} from './RpcReply';

export abstract class RpcError extends Error {
	public readonly reply: RpcReplyType;

	public constructor(message: string, reply: RpcReplyType) {
		super(message);
		this.reply = reply;
	}
}

export class RpcDeniedError extends RpcError {
	public constructor(message: string, reply: RpcReplyType) {
		super(message, reply);
		this.name = 'RpcDeniedError';
	}
}

export class RpcProgUnavailError extends RpcError {
	public constructor(message: string, reply: RpcReplyType) {
		super(message, reply);
		this.name = 'RpcProgUnavailError';
	}
}

export class RpcProgMismatchError extends RpcError {
	public constructor(message: string, reply: RpcReplyType) {
		super(message, reply);
		this.name = 'RpcProgMismatchError';
	}
}

export class RpcProcUnavailError extends RpcError {
	public constructor(message: string, reply: RpcReplyType) {
		super(message, reply);
		this.name = 'RpcProcUnavailError';
	}
}

export class RpcGarbageArgsError extends RpcError {
	public constructor(message: string, reply: RpcReplyType) {
		super(message, reply);
		this.name = 'RpcGarbageArgsError';
	}
}

export class RpcSystemError extends RpcError {
	public constructor(message: string, reply: RpcReplyType) {
		super(message, reply);
		this.name = 'RpcSystemError';
	}
}

export class RpcUnknownError extends RpcError {
	public constructor(message: string, reply: RpcReplyType) {
		super(message, reply);
		this.name = 'RpcUnknownError';
	}
}
