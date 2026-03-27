import {XdrType} from '@luolapeikko/onc-xdr';
import {PortMapperV2Req, PortMapperV2Res} from '../portMapperV2';
import type {RpcNetId} from '../RpcBindTypes';
import type {RpcProgramSetup} from '../RpcProgram';
import {RpcType} from '../RpcType';
import {RpcBindV4Res} from './response';

export interface RpcbsAddrList {
	prog: number;
	vers: number;
	success: number;
	failure: number;
	netid: RpcNetId;
}

export interface RpcbsRmtCallList {
	prog: number;
	vers: number;
	proc: number;
	success: number;
	failure: number;
	indirect: number;
	netid: RpcNetId;
}

export interface RpcbStat {
	info: number[];
	setinfo: number;
	unsetinfo: number;
	addrinfo: RpcbsAddrList[];
	rmtinfo: RpcbsRmtCallList[];
}

export const RpcBindV4 = {
	prog: 100000,
	vers: 4,
	procedures: {
		RPCBPROC_SET: {
			proc: 1,
			request: RpcType.rpcb,
			response: XdrType.boolean,
		},
		RPCBPROC_UNSET: {
			proc: 2,
			request: RpcType.rpcb,
			response: XdrType.boolean,
		},
		RPCBPROC_GETADDR: {
			proc: 3,
			request: RpcType.rpcb,
			response: XdrType.string,
		},
		RPCBPROC_DUMP: {
			proc: 4,
			response: RpcType.rpcblist,
		},
		RPCBPROC_BCAST: {
			proc: 5,
			request: PortMapperV2Req.rpcb_rmtcallargs,
			response: PortMapperV2Res.rpcb_rmtcallres,
		},
		RPCBPROC_GETTIME: {
			proc: 6,
			response: XdrType.uint,
		},
		RPCBPROC_UADDR2TADDR: {
			proc: 7,
			request: XdrType.string,
			response: RpcType.netbuf,
		},
		RPCBPROC_TADDR2UADDR: {
			proc: 8,
			request: RpcType.netbuf,
			response: XdrType.string,
		},
		RPCBPROC_GETVERSADDR: {
			proc: 9,
			request: RpcType.rpcb,
			response: XdrType.string,
		},
		RPCBPROC_INDIRECT: {
			proc: 10,
			request: PortMapperV2Req.rpcb_rmtcallargs,
			response: PortMapperV2Res.rpcb_rmtcallres,
		},
		RPCBPROC_GETADDRLIST: {
			proc: 11,
			request: RpcType.rpcb,
			response: RpcBindV4Res.rpcb_entry_list,
		},
		RPCBPROC_GETSTAT: {
			proc: 12,
			response: RpcBindV4Res.rpcb_stat,
		},
	},
} as const satisfies RpcProgramSetup;
