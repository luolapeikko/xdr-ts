import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import type {RpcRequest} from './RpcRequest';
import type {RpcResponse} from './RpcResponse';

export interface IRpcTransport<T extends Uint8Array = Uint8Array> {
	createXdrBuffer(initialize?: number | T): IXdrBuffer<T>;
	call(request: RpcRequest): Promise<RpcResponse>;
}
