import {XdrBuffer} from '@luolapeikko/onc-node';
import {type IRpcTransport, RpcAuthFlavor, RpcMsgType, type RpcRequest, RpcResponse, rpcCallSchemaModel} from '@luolapeikko/onc-rpcbind-common';
import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import {AbstractRpcBindServer} from '../../src/AbstractRpcBindServer';

export class CallbackTransportServer extends AbstractRpcBindServer<Buffer> implements IRpcTransport<Buffer> {
	public createXdrBuffer(initialize?: number | Buffer): IXdrBuffer<Buffer> {
		return new XdrBuffer(initialize);
	}

	public call(request: RpcRequest): Promise<RpcResponse> {
		const xdr = new XdrBuffer(1024);
		rpcCallSchemaModel.encode(xdr, {
			xid: request.xid,
			mtype: RpcMsgType.CALL,
			rpcvers: 2,
			prog: request.procedure.prog,
			vers: request.procedure.vers,
			proc: request.procedure.proc,
			cred: request.credentials,
			verf: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
		});
		if (request.args) {
			request.args(xdr);
		}
		return Promise.resolve(new RpcResponse(this, this.handleRequest(xdr.sliceUsed())));
	}
}
