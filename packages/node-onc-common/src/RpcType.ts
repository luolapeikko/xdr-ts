import type {IXdrCodec} from '@luolapeikko/xdr-ts';
import type {Netbuf, RpcbStat, RpcbsAddrList, RpcbsRmtCallList, RpcNetId} from './RpcBindTypes';

class RpcType {
	public static SetStats(): IXdrCodec<RpcbStat[]> {
		return {
			encode: (xdr, values) => {
				xdr.writeFixedArray(3, values, (x, v) => {
					x.writeFixedArray(13, v.info, (x, v) => x.writeInt(v));
					x.writeInt(v.setinfo);
					x.writeInt(v.unsetinfo);
					RpcType.RpcbsAddrList().encode(x, v.addrinfo);
					RpcType.RpcbsRmtCallList().encode(x, v.rmtinfo);
				});
			},
			decode: (xdr) =>
				xdr.readFixedArray(3, (x) => ({
					info: x.readFixedArray(13, (x) => x.readInt()), // int[13]
					setinfo: x.readInt(), // int
					unsetinfo: x.readInt(), // int
					addrinfo: RpcType.RpcbsAddrList().decode(x), // rpcbs_addrlist
					rmtinfo: RpcType.RpcbsRmtCallList().decode(x), // rpcbs_rmtcalllist
				})),
		};
	}
	public static Netbuf(): IXdrCodec<Netbuf> {
		return {
			encode: (xdr, value) => {
				xdr.writeUInt(value.maxlen);
				xdr.writeOpaque(value.buf);
			},
			decode: (xdr) => {
				return {
					maxlen: xdr.readUInt(),
					buf: xdr.readOpaque(),
				};
			},
		};
	}

	public static RpcbsAddrList(): IXdrCodec<RpcbsAddrList[]> {
		return {
			encode: (xdr, value) => {
				xdr.writeList(value, (x, v) => {
					x.writeUInt(v.prog);
					x.writeUInt(v.vers);
					x.writeInt(v.success);
					x.writeInt(v.failure);
					x.writeString(v.netid);
				});
			},
			decode: (xdr) =>
				xdr.readList(
					(x) => ({
						prog: x.readUInt(), // unsigned int
						vers: x.readUInt(), // unsigned int
						success: x.readInt(), // int
						failure: x.readInt(), // int
						netid: x.readString<RpcNetId>(), // string
					}),
					(x) => x.readBoolean(),
				),
		};
	}

	public static RpcbsRmtCallList(): IXdrCodec<RpcbsRmtCallList[]> {
		return {
			encode: (xdr, value) => {
				xdr.writeList(value, (x, v) => {
					x.writeUInt(v.prog);
					x.writeUInt(v.vers);
					x.writeUInt(v.proc);
					x.writeInt(v.success);
					x.writeInt(v.failure);
					x.writeInt(v.indirect);
					x.writeString(v.netid);
				});
			},
			decode: (xdr) =>
				xdr.readList(
					(x) => ({
						prog: x.readUInt(), // unsigned int
						vers: x.readUInt(), // unsigned int
						proc: x.readUInt(), // unsigned int
						success: x.readInt(), // int
						failure: x.readInt(), // int
						indirect: x.readInt(), // int
						netid: x.readString<RpcNetId>(), // string
					}),
					(x) => x.readBoolean(),
				),
		};
	}
}

export default RpcType;
