import type {RpcNetId} from './RpcBindTypes';

export interface SetProgramRequest {
	prog: number;
	vers: number;
	netid: RpcNetId;
	addr: string;
	owner: string;
}

export interface UnsetProgramRequest {
	prog: number;
	vers: number;
	netid: RpcNetId;
}

export interface GetAddrRequest {
	prog: number;
	vers: number;
	netid: RpcNetId;
}

export interface GetAddrListRequest {
	prog: number;
	vers: number;
}
