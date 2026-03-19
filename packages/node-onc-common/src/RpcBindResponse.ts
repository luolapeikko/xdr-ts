import {XdrSchema, XdrType} from '@luolapeikko/xdr-ts';
import type {RpcNetId} from './RpcBindTypes';

/**
 * A mapping of (program, version, network ID) to address.
 * Equivalent to 'struct rpcb' in rpcb_prot.x
 */
export interface RpcbMapping {
	prog: number;
	vers: number;
	netid: RpcNetId;
	addr: string;
	owner: string;
}

export const RpcResponseSchema = {
	getTime: new XdrSchema(XdrType.UInt<number>()),
	setProgram: new XdrSchema(XdrType.Boolean(XdrType.UInt())),
	unsetProgram: new XdrSchema(XdrType.Boolean(XdrType.UInt())),
	getAddr: new XdrSchema(XdrType.String()),
} as const satisfies Record<string, XdrSchema>;
