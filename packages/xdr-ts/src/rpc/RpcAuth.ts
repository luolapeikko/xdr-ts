import type {XdrObjectSchemaArrayInput} from '../types/XdrObjectSchemaArray';
import {type InferXdrSchema, XdrSchema} from '../types/XdrSchema';
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
] as const satisfies XdrObjectSchemaArrayInput;

export const rpcAuthSchemaModel = new XdrSchema(rpcAuthSchema);

export type RpcAuthType = InferXdrSchema<typeof rpcAuthSchemaModel>;
