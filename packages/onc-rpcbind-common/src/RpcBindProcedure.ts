import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import type {RpcProcedure} from './RpcType';

export type RpcCallType<A = never, R = void> = {
	procedure: RpcProcedure;
	args?: (xdr: IXdrBuffer, args: A | undefined) => IXdrBuffer;
	decoder?: (xdr: IXdrBuffer) => R;
};

/* 	encode(xdr: IXdrBuffer, value: I): IXdrBuffer;
	decode(xdr: IXdrBuffer): O; */
/* 
function encodeRemoteCallRequest(args: PortMapperV2CallItRequest<Uint8Array>) {
	return (xdr: IXdrBuffer) => {
		xdr.writeUInt(args.prog);
		xdr.writeUInt(args.vers);
		xdr.writeUInt(args.proc);
		xdr.writeOpaque(args.args);
	};
}

function decodeRemoteCallResponse(xdr: IXdrBuffer): PortMapperV2CallItResponse<Uint8Array> {
	return {
		addr: xdr.readString(),
		results: xdr.readOpaque(),
	};
}

function createRemoteCallProcedure(procedure: RpcProcedure): RpcCallType<PortMapperV2CallItRequest<Uint8Array>, PortMapperV2CallItResponse<Uint8Array>> {
	return {
		procedure,
		args: encodeRemoteCallRequest,
		decoder: decodeRemoteCallResponse,
	};
}

function encodeSetProgramRequest(args: SetProgramRequest) {
	return (xdr: IXdrBuffer) => {
		xdr.writeUInt(args.prog);
		xdr.writeUInt(args.vers);
		xdr.writeString(args.netid);
		xdr.writeString(args.addr);
		xdr.writeString(args.owner);
	};
}

function encodeUnsetProgramRequest(args: UnsetProgramRequest) {
	return (xdr: IXdrBuffer) => {
		xdr.writeUInt(args.prog);
		xdr.writeUInt(args.vers);
		xdr.writeString(args.netid);
		xdr.writeString(''); // addr is ignored
		xdr.writeString(''); // owner is ignored
	};
}

function encodeGetAddrRequest(args: GetAddrRequest) {
	return (xdr: IXdrBuffer) => {
		xdr.writeUInt(args.prog);
		xdr.writeUInt(args.vers);
		xdr.writeString(args.netid);
		xdr.writeString(''); // r_addr (not used for query)
		xdr.writeString(''); // r_owner (not used for query)
	};
}

function encodeGetAddrListRequest(args: GetAddrListRequest) {
	return (xdr: IXdrBuffer) => {
		xdr.writeUInt(args.prog);
		xdr.writeUInt(args.vers);
		xdr.writeString(''); // netid
		xdr.writeString(''); // addr
		xdr.writeString(''); // owner
	};
}

export const RpcCallV3 = {
	getTime: {procedure: RpcBindV3Procedure.getTimeV3, decoder: RpcResponseType.GetTime().decode},
	null: {procedure: RpcBindV3Procedure.nullV3},
	setProgram: {procedure: RpcBindV3Procedure.setProgramV3, args: encodeSetProgramRequest, decoder: (xdr) => xdr.readBoolean()},
	unsetProgram: {procedure: RpcBindV3Procedure.unsetProgramV3, args: encodeUnsetProgramRequest, decoder: (xdr) => xdr.readBoolean()},
	getAddr: {procedure: RpcBindV3Procedure.getAddrV3, args: encodeGetAddrRequest, decoder: (xdr) => xdr.readString()},
	dump: {procedure: RpcBindV3Procedure.dumpV3, decoder: RpcResponseType.GetDump().decode},
	uaddr2taddr: {
		procedure: RpcBindV3Procedure.uaddr2taddrV3,
		args: (args: string) => (xdr: IXdrBuffer) => {
			xdr.writeString(args);
		},
		decoder: (xdr) => RpcType.netbuf().decode(xdr),
	},
	taddr2uaddr: {
		procedure: RpcBindV3Procedure.taddr2uaddrV3,
		args: (args: Netbuf) => (xdr: IXdrBuffer) => {
			RpcType.netbuf().encode(xdr, args);
		},
		decoder: (xdr) => xdr.readString(),
	},
	callIt: createRemoteCallProcedure(RpcBindV3Procedure.callItV3),
} as const satisfies Record<string, RpcCallType>;

export const RpcCallV4 = {
	getTime: {procedure: RpcBindV4Procedure.getTimeV4, decoder: RpcResponseType.GetTime().decode},
	getStats: {procedure: RpcBindV4Procedure.getStatsV4, decoder: RpcType.SetStats().decode},
	null: {procedure: RpcBindV4Procedure.nullV4},
	setProgram: {procedure: RpcBindV4Procedure.setProgramV4, args: encodeSetProgramRequest, decoder: (xdr) => xdr.readBoolean()},
	unsetProgram: {procedure: RpcBindV4Procedure.unsetProgramV4, args: encodeUnsetProgramRequest, decoder: (xdr) => xdr.readBoolean()},
	getAddr: {procedure: RpcBindV4Procedure.getAddrV4, args: encodeGetAddrRequest, decoder: (xdr) => xdr.readString()},
	getAddrList: {procedure: RpcBindV4Procedure.getAddrListV4, args: encodeGetAddrListRequest, decoder: RpcResponseType.GetAddrList().decode},
	dump: {procedure: RpcBindV4Procedure.dumpV4, decoder: RpcResponseType.GetDump().decode},
	uaddr2taddr: {
		procedure: RpcBindV4Procedure.uaddr2taddrV4,
		args: (args: string) => (xdr: IXdrBuffer) => {
			xdr.writeString(args);
		},
		decoder: (xdr) => RpcType.netbuf().decode(xdr),
	},
	taddr2uaddr: {
		procedure: RpcBindV4Procedure.taddr2uaddrV4,
		args: (args: Netbuf) => (xdr: IXdrBuffer) => {
			RpcType.netbuf().encode(xdr, args);
		},
		decoder: (xdr) => xdr.readString(),
	},
	bcast: createRemoteCallProcedure(RpcBindV4Procedure.bcastV4),
	getVersAddr: {procedure: RpcBindV4Procedure.getVersAddrV4, args: encodeGetAddrRequest, decoder: (xdr) => xdr.readString()},
	indirect: createRemoteCallProcedure(RpcBindV4Procedure.indirectV4),
} as const satisfies Record<string, RpcCallType>; */
