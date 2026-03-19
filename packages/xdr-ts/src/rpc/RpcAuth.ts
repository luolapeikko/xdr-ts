import {XdrSchema} from '../types/XdrSchema';
import type {InferArgument, XdrObjectSchema} from '../types/XdrSchemaTypes';
import {XdrType} from '../types/XdrType';

export const RpcAuthFlavor = {
	AUTH_NONE: 0,
	AUTH_SYS: 1,
	AUTH_SHORT: 2,
	AUTH_DH: 3,
} as const;
export type RpcAuthFlavor = (typeof RpcAuthFlavor)[keyof typeof RpcAuthFlavor];

export const rpcAuthSchema = [
	{name: 'flavor', type: XdrType.UInt<RpcAuthFlavor>(), default: 0},
	{name: 'body', type: XdrType.Opaque(), default: Buffer.alloc(0)},
] as const satisfies XdrObjectSchema[];

export type RpcAuthType = InferArgument<typeof rpcAuthSchema>;

export const rpcAuthSchemaModel = new XdrSchema(rpcAuthSchema);
