import type {IXdrCodec} from '@luolapeikko/onc-xdr';
import type {Netbuf, RpcNetId} from './RpcBindTypes';
import type {RpcbType} from './schema';

export type RpcProgram = {
	prog: number;
	vers: number;
};

export type RpcProcedure = RpcProgram & {
	proc: number;
};

export class RpcType {
	public static get netbuf(): IXdrCodec<Netbuf> {
		return {
			encode: (xdr, value) => xdr.writeUInt(value.maxlen).writeOpaque(value.buf),
			decode: (xdr) => {
				return {
					maxlen: xdr.readUInt(),
					buf: xdr.readOpaque(),
				};
			},
		};
	}

	public static get rpcb(): IXdrCodec<RpcbType> {
		return {
			encode: (x, value) => {
				x.writeUInt(value.prog);
				x.writeUInt(value.vers);
				x.writeString(value.netid);
				x.writeString(value.addr);
				x.writeString(value.owner);
				return x;
			},
			decode: (x) => {
				return {
					prog: x.readUInt(), // unsigned int
					vers: x.readUInt(), // unsigned int
					netid: x.readString<RpcNetId>(), // string
					addr: x.readString(), // string
					owner: x.readString(), // string
				};
			},
		};
	}

	/**
	 * typedef rp__list *rpcblist_ptr;
	 */
	public static get rpcblist(): IXdrCodec<RpcbType[]> {
		return {
			encode: (xdr, value) => xdr.writeList(value, (x, service) => RpcType.rpcb.encode(x, service)),
			decode: (xdr) =>
				xdr.readList(
					(x) => RpcType.rpcb.decode(x),
					(x) => x.readUInt(),
				),
		};
	}
}
