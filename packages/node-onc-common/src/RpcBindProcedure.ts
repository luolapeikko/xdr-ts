import type {IXdrBuffer, RpcProcedure} from '@luolapeikko/xdr-ts';
import {RpcDecode} from './rpcDecode';
import type {SetProgramRequest, UnsetProgramRequest} from './RpcBindRequest';

export const RpcBindProcedure = {
	getTime: {prog: 100000, vers: 3, proc: 6},
	getStats: {prog: 100000, vers: 4, proc: 12},
	getAddr: {prog: 100000, vers: 4, proc: 3},
	getAddrList: {prog: 100000, vers: 4, proc: 11},
	setProgram: {prog: 100000, vers: 4, proc: 1},
	unsetProgram: {prog: 100000, vers: 4, proc: 2},
	dump: {prog: 100000, vers: 3, proc: 4},
	uaddr2taddr: {prog: 100000, vers: 3, proc: 7},
	taddr2uaddr: {prog: 100000, vers: 3, proc: 8},
	null: {prog: 100000, vers: 3, proc: 0},
} as const satisfies Record<string, RpcProcedure>;

export type RpcCallType<A = never, R = void> = {
	procedure: RpcProcedure;
	args?: (args: A) => (xdr: IXdrBuffer) => void;
	response?: (xdr: IXdrBuffer) => R;
};

export const RpcCall = {
	getTime: {procedure: RpcBindProcedure.getTime, response: (xdr) => xdr.readUInt()},
	getStats: {
		procedure: RpcBindProcedure.getStats,
		response: (xdr) => xdr.readFixedArray(3, (x) => RpcDecode.stat(x)),
	},
	null: {procedure: RpcBindProcedure.null},
	setProgram: {
		procedure: RpcBindProcedure.setProgram,
		args: (args: SetProgramRequest) => (xdr: IXdrBuffer) => {
			xdr.writeUInt(args.prog);
			xdr.writeUInt(args.vers);
			xdr.writeString(args.netid);
			xdr.writeString(args.addr);
			xdr.writeString(args.owner);
		},
		response: (xdr) => xdr.readBoolean(),
	},
	unsetProgram: {
		procedure: RpcBindProcedure.unsetProgram,
		args: (args: UnsetProgramRequest) => (xdr: IXdrBuffer) => {
			xdr.writeUInt(args.prog);
			xdr.writeUInt(args.vers);
			xdr.writeString(args.netid);
			xdr.writeString(''); // addr is ignored
			xdr.writeString(''); // owner is ignored
		},
		response: (xdr) => xdr.readBoolean(),
	},
} as const satisfies Record<string, RpcCallType>;
