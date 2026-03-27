import type {IXdrCodec} from '@luolapeikko/onc-xdr';
import type {RpcbEntry, RpcbSemantics, RpcNetId} from './RpcBindTypes';
import type {RpcbType} from './schema';

export class RpcResponseType {


	public static GetDump(): IXdrCodec<RpcbType[]> {
		return {
			encode: (xdr, value) =>
				xdr.writeList(value, (x, service) => {
					x.writeUInt(service.prog);
					x.writeUInt(service.vers);
					x.writeString(service.netid);
					x.writeString(service.addr);
					x.writeString(service.owner);
				}),
			decode: (xdr) =>
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
		};
	}
	public static GetTime(): IXdrCodec<number> {
		return {
			encode: (xdr, value) => xdr.writeUInt(value),
			decode: (xdr) => xdr.readUInt(),
		};
	}
}
