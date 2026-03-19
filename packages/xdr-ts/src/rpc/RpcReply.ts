import {XdrConditional, XdrConditionalSchema} from '../types/XdrConditional';
import {XdrSchema} from '../types/XdrSchema';
import type {InferArgument, XdrInnerSchema} from '../types/XdrSchemaTypes';
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
		// Per RFC 5531: verf (opaque_auth) is only present in the MSG_ACCEPTED branch.
		// MSG_DENIED replies skip directly to the rejected_reply body, with no verf.
		name: 'verf',
		type: new XdrConditionalSchema(rpcAuthSchema, (data) => data.replyStat === RpcReplyStat.MSG_ACCEPTED),
		default: undefined,
	},
	{
		name: 'acceptStat',
		type: new XdrConditional(XdrType.UInt<RpcAcceptStat>(), (data) => data.replyStat === RpcReplyStat.MSG_ACCEPTED),
		default: undefined,
	},
] as const satisfies XdrInnerSchema[];

export type RpcReplyType = InferArgument<typeof rpcReplySchema>;

export const rpcReplySchemaModel = new XdrSchema(rpcReplySchema);
