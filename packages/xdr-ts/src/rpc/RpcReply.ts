import {XdrConditional} from '../types/XdrConditional';
import {XdrSchema} from '../types/XdrSchema';
import type {InferArgument, XdrObjectSchema} from '../types/XdrSchemaTypes';
import {XdrType} from '../types/XdrType';
import {rpcAuthSchema} from './RpcAuth';

export const RpcReplyStat = {
	MSG_ACCEPTED: 0,
	MSG_DENIED: 1,
} as const;

export type RpcReplyStat = (typeof RpcReplyStat)[keyof typeof RpcReplyStat];

export const RpcAcceptStat = {
	SUCCESS: 0,
	PROG_UNAVAIL: 1,
	PROG_MISMATCH: 2,
	PROC_UNAVAIL: 3,
	GARBAGE_ARGS: 4,
	SYSTEM_ERR: 5,
} as const;

export type RpcAcceptStat = (typeof RpcAcceptStat)[keyof typeof RpcAcceptStat];

export const rpcReplySchema = [
	{
		name: 'xid',
		type: XdrType.UInt(),
	},
	{
		name: 'mtype',
		type: XdrType.UInt(),
	},
	{
		name: 'replyStat',
		type: XdrType.UInt<RpcReplyStat>(),
	},
	{
		name: 'verf',
		type: rpcAuthSchema,
	},
	{
		name: 'acceptStat',
		type: new XdrConditional((data) => data.replyStat === RpcReplyStat.MSG_ACCEPTED, XdrType.UInt<RpcAcceptStat>()),
		default: undefined,
	},
] as const satisfies XdrObjectSchema[];

export type RpcReplyType = InferArgument<typeof rpcReplySchema>;

export const rpcReplySchemaModel = new XdrSchema(rpcReplySchema);
