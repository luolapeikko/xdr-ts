import type {IXdrBuffer, RpcProcedure} from '@luolapeikko/xdr-ts';
import type {GetAddrListRequest, GetAddrRequest, RemoteCallRequest, SetProgramRequest, UnsetProgramRequest} from './RpcBindRequest';
import type {Netbuf, RemoteCallResponse, RpcbEntry, RpcbSemantics, RpcNetId} from './RpcBindTypes';
import RpcType from './RpcType';

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
	callIt: {prog: 100000, vers: 3, proc: 5},
	indirect: {prog: 100000, vers: 4, proc: 10},
	null: {prog: 100000, vers: 3, proc: 0},
} as const satisfies Record<string, RpcProcedure>;

export type RpcCallType<A = never, R = void> = {
	procedure: RpcProcedure;
	args?: (args: A) => (xdr: IXdrBuffer) => void;
	decoder?: (xdr: IXdrBuffer) => R;
};

export const RpcCall = {
	getTime: {procedure: RpcBindProcedure.getTime, decoder: (xdr) => xdr.readUInt()},
	getStats: {
		procedure: RpcBindProcedure.getStats,
		decoder: RpcType.SetStats().decode,
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
		decoder: (xdr) => xdr.readBoolean(),
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
		decoder: (xdr) => xdr.readBoolean(),
	},
	getAddr: {
		procedure: RpcBindProcedure.getAddr,
		args: (args: GetAddrRequest) => (xdr: IXdrBuffer) => {
			xdr.writeUInt(args.prog);
			xdr.writeUInt(args.vers);
			xdr.writeString(args.netid);
			xdr.writeString(''); // r_addr (not used for query)
			xdr.writeString(''); // r_owner (not used for query)
		},
		decoder: (xdr) => xdr.readString(),
	},
	getAddrList: {
		procedure: RpcBindProcedure.getAddrList,
		args: (args: GetAddrListRequest) => (xdr: IXdrBuffer) => {
			xdr.writeUInt(args.prog);
			xdr.writeUInt(args.vers);
			xdr.writeString(''); // netid
			xdr.writeString(''); // addr
			xdr.writeString(''); // owner
		},
		decoder: (xdr) =>
			xdr.readList(
				(x) => ({
					maddr: x.readString(),
					netid: x.readString<RpcNetId>(),
					semantics: x.readUInt<RpcbSemantics>(),
					protofmly: x.readString<RpcbEntry['protofmly']>(),
					proto: x.readString<RpcbEntry['proto']>(),
				}),
				(x) => x.readUInt(),
			),
	},
	dump: {
		procedure: RpcBindProcedure.dump,
		decoder: (xdr) =>
			xdr.readList(
				(x) => ({
					prog: x.readUInt(),
					vers: x.readUInt(),
					netid: x.readString<RpcNetId>(),
					addr: x.readString(),
					owner: x.readString(),
				}),
				(x) => x.readUInt(),
			),
	},
	uaddr2taddr: {
		procedure: RpcBindProcedure.uaddr2taddr,
		args: (args: string) => (xdr: IXdrBuffer) => {
			xdr.writeString(args);
		},
		decoder: (xdr) => RpcType.Netbuf().decode(xdr),
	},
	taddr2uaddr: {
		procedure: RpcBindProcedure.taddr2uaddr,
		args: (args: Netbuf) => (xdr: IXdrBuffer) => {
			RpcType.Netbuf().encode(xdr, args);
		},
		decoder: (xdr) => xdr.readString(),
	},
	callIt: {
		procedure: RpcBindProcedure.callIt,
		args: (args: RemoteCallRequest<Buffer>) => (xdr: IXdrBuffer) => {
			xdr.writeUInt(args.prog);
			xdr.writeUInt(args.vers);
			xdr.writeUInt(args.proc);
			xdr.writeOpaque(args.args);
		},
		decoder: (xdr): RemoteCallResponse<Buffer> => ({
			addr: xdr.readString(),
			results: xdr.readOpaque(),
		}),
	},
	indirect: {
		procedure: RpcBindProcedure.indirect,
		args: (args: RemoteCallRequest<Buffer>) => (xdr: IXdrBuffer) => {
			xdr.writeUInt(args.prog);
			xdr.writeUInt(args.vers);
			xdr.writeUInt(args.proc);
			xdr.writeOpaque(args.args);
		},
		decoder: (xdr): RemoteCallResponse<Buffer> => ({
			addr: xdr.readString(),
			results: xdr.readOpaque(),
		}),
	},
} as const satisfies Record<string, RpcCallType>;
