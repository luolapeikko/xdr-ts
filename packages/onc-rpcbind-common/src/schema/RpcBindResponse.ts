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
};
