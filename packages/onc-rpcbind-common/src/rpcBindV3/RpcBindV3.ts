import {XdrType} from '@luolapeikko/onc-xdr';
import {PortMapperV2Req, PortMapperV2Res} from '../portMapperV2';
import type {RpcProgramSetup} from '../RpcProgram';
import {RpcType} from '../RpcType';

export const RpcBindV3 = {
	prog: 100000,
	vers: 3,
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
		RPCBPROC_CALLIT: {
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
	},
} as const satisfies RpcProgramSetup;
