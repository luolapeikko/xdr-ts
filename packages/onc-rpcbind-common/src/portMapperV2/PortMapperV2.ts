import {XdrType} from '@luolapeikko/onc-xdr';
import type {RpcProgramSetup} from '../RpcProgram';
import {PortMapperV2Req} from './request';
import {PortMapperV2Res} from './response';

/**
 * https://datatracker.ietf.org/doc/html/rfc1833#section-3.1
 */

export const IPPROTO = {
	/** protocol number for TCP/IP */
	TCP: 6,
	/** protocol number for UDP/IP */
	UDP: 17,
} as const;

export type PortMapperV2Mapping = {
	prog: number;
	vers: number;
	prot: (typeof IPPROTO)[keyof typeof IPPROTO]; // IPPROTO_TCP | IPPROTO_UDP
	port: number;
};

export type PortMapperV2CallItRequest<A = any> = {
	prog: number;
	vers: number;
	proc: number;
	args: A;
};

export type PortMapperV2CallItResponse<R = any> = {
	addr: string;
	results: R;
};

/**
 * Port Mapper Version 2
 * @see https://www.rfc-editor.org/rfc/rfc1833.html
 */
export const PortMapperV2 = {
	prog: 100000,
	vers: 2,
	procedures: {
		PMAPPROC_NULL: {
			proc: 0,
		},
		PMAPPROC_SET: {
			proc: 1,
			request: PortMapperV2Req.mapping,
			response: XdrType.boolean,
		},
		PMAPPROC_UNSET: {
			proc: 2,
			request: PortMapperV2Req.mapping,
			response: XdrType.boolean,
		},
		PMAPPROC_GETPORT: {
			proc: 3,
			request: PortMapperV2Req.mapping,
			response: XdrType.uint,
		},
		PMAPPROC_DUMP: {
			proc: 4,
			request: undefined,
			response: PortMapperV2Res.pmaplist,
		},
		PMAPPROC_CALLIT: {
			proc: 5,
			request: PortMapperV2Req.call_args,
			response: PortMapperV2Res.call_result,
		},
	},
} as const satisfies RpcProgramSetup;
