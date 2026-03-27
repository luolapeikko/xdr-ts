import {XdrSchema, XdrType} from '@luolapeikko/onc-xdr';
import type {RpcNetId} from '../RpcBindTypes';

/**
 * A mapping of (program, version, network ID) to address.
 * Equivalent to 'struct rpcb' in rpcb_prot.x
 */
export type RpcbType = {
	prog: number;
	vers: number;
	netid: RpcNetId;
	addr: string;
	owner: string;
}

export const RpcResponseSchema = {
	setProgram: new XdrSchema(XdrType.Boolean()),
	unsetProgram: new XdrSchema(XdrType.Boolean()),
	getAddr: new XdrSchema(XdrType.String()),
} as const satisfies Record<string, XdrSchema>;
