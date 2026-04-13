import type {InferXdrCodecInput, InferXdrCodecOutput} from '@luolapeikko/onc-xdr';
import type {IRpcTransport} from './interfaces/IRpcTransport';
import type {RpcProgramCoder, RpcProgramSetup} from './RpcProgram';
import {RpcRequest} from './RpcRequest';

/**
 * Builds and sends an RPC request for the specified procedure, and returns the decoded response.
 * @param setup The RPC program setup containing the procedures.
 * @param procedure The specific procedure to call.
 * @param transport The transport mechanism to use for the RPC call.
 * @param args The arguments to pass to the procedure.
 * @returns The decoded response from the RPC call.
 */
export async function callProcedure<TProcedures extends Record<string, RpcProgramCoder>, TProcedure extends keyof TProcedures>(
	setup: RpcProgramSetup & {procedures: TProcedures},
	procedure: TProcedure,
	transport: IRpcTransport,
	args?: InferXdrCodecInput<TProcedures[TProcedure]['request']>,
): Promise<InferXdrCodecOutput<TProcedures[TProcedure]['response']>> {
	const proc = setup.procedures[procedure];
	const request = new RpcRequest(
		{proc: proc.proc, prog: setup.prog, vers: setup.vers},
		{
			args: (xdr) => proc.request?.encode(xdr, args),
		},
	);
	const response = await transport.call(request);
	if (!response.ok) {
		throw response.error;
	}
	if (proc.response) {
		return proc.response.decode(response.xdr);
	}
	return undefined as InferXdrCodecOutput<TProcedures[TProcedure]['response']>;
}
