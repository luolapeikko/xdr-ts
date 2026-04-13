import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import type {RpcProcedure} from './RpcTypeCoders';

export type RpcCallType<A = never, R = void> = {
	procedure: RpcProcedure;
	args?: (xdr: IXdrBuffer, args: A | undefined) => IXdrBuffer;
	decoder?: (xdr: IXdrBuffer) => R;
};
