import type {RpcRequest} from '../rpc/RpcRequest';
import type {RpcResponse} from '../rpc/RpcResponse';

export interface IRpcTransport {
	call(request: RpcRequest): Promise<RpcResponse>;
	close(): void;
}

export * from './RpcTcpTransport';
export * from './RpcUdpTransport';

export type AnyRpcTransport = IRpcTransport;
