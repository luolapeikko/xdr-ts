import type {IXdrCodec} from '@luolapeikko/onc-xdr';

export type RpcProgramCoder = {
	proc: number;
	request?: IXdrCodec<any>;
	response?: IXdrCodec<any>;
};

export type RpcProgramSetup<TProcedures extends Record<string, RpcProgramCoder> = Record<string, RpcProgramCoder>> = {
	prog: number;
	vers: number;
	procedures: TProcedures;
};

export type RpcRemoteCallCoder = {
	prog: number;
	vers: number;
	proc: number;
	request?: IXdrCodec<any>;
	response?: IXdrCodec<any>;
}

export function programAsRpcProcedure<TProcedures extends Record<string, RpcProgramCoder>, TProcedure extends keyof TProcedures>(
	setup: RpcProgramSetup<TProcedures>,
	procedure: TProcedure,
): {prog: number; vers: number; proc: number} {
	const proc = setup.procedures[procedure];
	return {
		prog: setup.prog,
		vers: setup.vers,
		proc: proc.proc,
	};
}