import {type InferArgument, type XdrObjectSchemaArrayInput, XdrSchema, XdrType} from '@luolapeikko/onc-xdr';
import {rpcAuthSchema} from './RpcAuth';

export const RpcMsgType = {
	CALL: 0,
	REPLY: 1,
} as const;
export type RpcMsgType = (typeof RpcMsgType)[keyof typeof RpcMsgType];

export const rpcCallSchema = [
	{name: 'xid', type: XdrType.UInt()},
	{name: 'mtype', type: XdrType.UInt<RpcMsgType>()},
	{name: 'rpcvers', type: XdrType.UInt()},
	{name: 'prog', type: XdrType.UInt()},
	{name: 'vers', type: XdrType.UInt()},
	{name: 'proc', type: XdrType.UInt()},
	{
		name: 'cred',
		type: rpcAuthSchema,
	},
	{
		name: 'verf',
		type: rpcAuthSchema,
	},
] as const satisfies XdrObjectSchemaArrayInput;

export const rpcCallSchemaModel = new XdrSchema(rpcCallSchema);

export type RpcRequestCall = InferArgument<typeof rpcCallSchemaModel>;
