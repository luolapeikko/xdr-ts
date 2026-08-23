import {XdrType} from '@luolapeikko/onc-xdr';
import {PortMapperV2Req, PortMapperV2Res} from '../portMapperV2';
import type {RpcProgramSetup} from '../RpcProgram';
import {RpcTypeCoders} from '../RpcTypeCoders';

export const RpcBindV3 = {
	prog: 100000,
	vers: 3,
	procedures: {
		RPCBPROC_NULL: {
			proc: 0,
		},
		RPCBPROC_SET: {
			proc: 1,
			request: RpcTypeCoders.rpcb,
			response: XdrType.boolean,
		},
		RPCBPROC_UNSET: {
			proc: 2,
			request: RpcTypeCoders.rpcb,
			response: XdrType.boolean,
		},
		RPCBPROC_GETADDR: {
			proc: 3,
			request: RpcTypeCoders.rpcb,
			response: XdrType.string,
		},
		RPCBPROC_DUMP: {
			proc: 4,
			response: RpcTypeCoders.rpcblist,
		},
		RPCBPROC_CALLIT: {
			proc: 5,
			request: PortMapperV2Req.call_args,
			response: PortMapperV2Res.call_result,
		},
		RPCBPROC_GETTIME: {
			proc: 6,
			response: XdrType.uint,
		},
		RPCBPROC_UADDR2TADDR: {
			proc: 7,
			request: XdrType.string,
			response: RpcTypeCoders.netbuf,
		},
		RPCBPROC_TADDR2UADDR: {
			proc: 8,
			request: RpcTypeCoders.netbuf,
			response: XdrType.string,
		},
	},
} as const satisfies RpcProgramSetup;
