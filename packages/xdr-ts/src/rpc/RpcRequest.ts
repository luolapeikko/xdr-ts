import type {RpcProcedure} from '../types';
import type {IXdrBuffer} from '../types/IXdrBuffer';
import {RpcAuthFlavor} from './RpcAuth';

export type RpcRequestOptions = {
	credentials?: {flavor: RpcAuthFlavor; body: Buffer};
	args?: (xdr: IXdrBuffer) => void;
	xid?: number;
};

export class RpcRequest {
	public readonly procedure: RpcProcedure;
	public readonly xid: number;
	public readonly args?: (xdr: IXdrBuffer) => void;
	public readonly credentials: {flavor: RpcAuthFlavor; body: Buffer};

	public constructor(procedure: RpcProcedure, options: RpcRequestOptions = {}) {
		this.procedure = procedure;
		this.credentials = options.credentials ?? {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)};
		this.args = options.args;
		this.xid = options.xid ?? Math.floor(Math.random() * 0xffffffff);
	}
}
