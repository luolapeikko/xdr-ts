import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import type {RpcProcedure} from './RpcType';
import {RpcAuthFlavor} from './schema/RpcAuth';

export type RpcRequestOptions = {
	credentials?: {flavor: RpcAuthFlavor; body: Uint8Array};
	args?: (xdr: IXdrBuffer) => void;
	xid?: number;
};

export class RpcRequest {
	public readonly procedure: RpcProcedure;
	public readonly xid: number;
	public readonly args?: (xdr: IXdrBuffer) => void;
	public readonly credentials: {flavor: RpcAuthFlavor; body: Uint8Array};

	public constructor(procedure: RpcProcedure, options: RpcRequestOptions = {}) {
		this.procedure = procedure;
		this.credentials = options.credentials ?? {flavor: RpcAuthFlavor.AUTH_NONE, body: new Uint8Array(0)};
		this.args = options.args;
		this.xid = options.xid ?? Math.floor(Math.random() * 0xffffffff);
	}
}
