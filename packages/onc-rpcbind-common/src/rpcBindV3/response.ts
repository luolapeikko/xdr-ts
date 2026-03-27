import type {IXdrCodec} from '@luolapeikko/onc-xdr';
import type {RpcbEntry, RpcbSemantics, RpcNetId} from '../RpcBindTypes';

export class RpcBindV3Res {
	public static Dump(): IXdrCodec<RpcbEntry[]> {
		return {
			encode: (xdr, value) =>
				xdr.writeList(value, (x, service: RpcbEntry) => {
					x.writeString(service.maddr);
					x.writeString(service.netid);
					x.writeUInt(service.semantics);
					x.writeString(service.protofmly);
					x.writeString(service.proto);
				}),
			decode: (xdr) =>
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
		};
	}
}
