import type {IXdrCodec} from '@luolapeikko/onc-xdr';
import type {PortMapperV2CallItResponse, PortMapperV2Mapping} from './PortMapperV2';

export class PortMapperV2Res {
	public static get pmaplist(): IXdrCodec<PortMapperV2Mapping[]> {
		return {
			encode: (xdr, value) => {
				return xdr.writeList(value, (x, v) => {
					x.writeUInt(v.prog);
					x.writeUInt(v.vers);
					x.writeUInt(v.prot);
					x.writeUInt(v.port);
				});
			},
			decode: (xdr) =>
				xdr.readList(
					(x) => ({
						prog: x.readUInt(), // unsigned int
						vers: x.readUInt(), // unsigned int
						prot: x.readUInt(), // unsigned int
						port: x.readUInt(), // unsigned int
					}),
					(x) => x.readBoolean(),
				),
		};
	}
	public static get call_result(): IXdrCodec<PortMapperV2CallItResponse<Uint8Array>> {
		return {
			encode: (xdr, value) => {
				xdr.writeString(value.addr);
				xdr.writeOpaque(value.results);
				return xdr;
			},
			decode: (xdr) => {
				return {
					addr: xdr.readString(),
					results: xdr.readOpaque(),
				};
			},
		};
	}
}
