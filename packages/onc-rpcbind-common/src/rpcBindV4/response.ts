import type {IXdrCodec} from '@luolapeikko/onc-xdr';
import type {RpcbEntry, RpcNetId} from '../RpcBindTypes';
import type {RpcbStat, RpcbsAddrList, RpcbsRmtCallList} from './RpcBindV4';

export class RpcBindV4Res {
	public static AddrList(): IXdrCodec<RpcbEntry[]> {
		return {
			encode: (xdr, value) => {
				return xdr.writeList(value, (x, service) => {
					x.writeString(service.maddr);
					x.writeString(service.netid);
					x.writeUInt(service.semantics);
					x.writeString(service.protofmly);
					x.writeString(service.proto);
				});
			},
			decode: (xdr) =>
				xdr.readList(
					(x) => ({
						maddr: x.readString(),
						netid: x.readString<RpcNetId>(),
						semantics: x.readUInt(),
						protofmly: x.readString(),
						proto: x.readString(),
					}),
					(x) => x.readUInt(),
				),
		};
	}

	public static get rpcb_stat(): IXdrCodec<RpcbStat[]> {
		return {
			encode: (xdr, values) => {
				return xdr.writeFixedArray(3, values, (x, v) => {
					x.writeFixedArray(13, v.info, (x, v) => x.writeInt(v));
					x.writeInt(v.setinfo);
					x.writeInt(v.unsetinfo);
					RpcBindV4Res.RpcbsAddrList().encode(x, v.addrinfo);
					RpcBindV4Res.RpcbsRmtCallList().encode(x, v.rmtinfo);
				});
			},
			decode: (xdr) =>
				xdr.readFixedArray(3, (x) => ({
					info: x.readFixedArray(13, (x) => x.readInt()), // int[13]
					setinfo: x.readInt(), // int
					unsetinfo: x.readInt(), // int
					addrinfo: RpcBindV4Res.RpcbsAddrList().decode(x), // rpcbs_addrlist
					rmtinfo: RpcBindV4Res.RpcbsRmtCallList().decode(x), // rpcbs_rmtcalllist
				})),
		};
	}

	public static get rpcb_entry(): IXdrCodec<RpcbEntry> {
		return {
			encode: (xdr, value) => {
				xdr.writeString(value.maddr);
				xdr.writeString(value.netid);
				xdr.writeUInt(value.semantics);
				xdr.writeString(value.protofmly);
				xdr.writeString(value.proto);
				return xdr;
			},
			decode: (xdr) => ({
				maddr: xdr.readString(),
				netid: xdr.readString<RpcNetId>(),
				semantics: xdr.readUInt(),
				protofmly: xdr.readString(),
				proto: xdr.readString(),
			}),
		};
	}

	public static get rpcb_entry_list(): IXdrCodec<RpcbEntry[]> {
		return {
			encode: (xdr, value) => {
				return xdr.writeList(value, (x, service) => RpcBindV4Res.rpcb_entry.encode(x, service));
			},
			decode: (xdr) =>
				xdr.readList(
					(x) => RpcBindV4Res.rpcb_entry.decode(x),
					(x) => x.readUInt(),
				),
		};
	}

	public static RpcbsAddrList(): IXdrCodec<RpcbsAddrList[]> {
		return {
			encode: (xdr, value) => {
				return xdr.writeList(value, (x, v) => {
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
				return xdr.writeList(value, (x, v) => {
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
