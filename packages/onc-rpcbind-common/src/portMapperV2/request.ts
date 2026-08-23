import type {IXdrCodec} from '@luolapeikko/onc-xdr';
import type {PortMapperV2CallItRequest, PortMapperV2Mapping} from './PortMapperV2';

export class PortMapperV2Req {
	public static get mapping(): IXdrCodec<PortMapperV2Mapping> {
		return {
			encode: (xdr, value) => {
				xdr.writeUInt(value.prog);
				xdr.writeUInt(value.vers);
				xdr.writeUInt(value.prot);
				xdr.writeUInt(value.port);
				return xdr;
			},
			decode: (xdr) => {
				return {
					prog: xdr.readUInt(),
					vers: xdr.readUInt(),
					prot: xdr.readUInt<PortMapperV2Mapping['prot']>(),
					port: xdr.readUInt(),
				};
			},
		};
	}
	public static get call_args(): IXdrCodec<PortMapperV2CallItRequest<Uint8Array>> {
		return {
			encode: (xdr, values) => {
				xdr.writeUInt(values.prog);
				xdr.writeUInt(values.vers);
				xdr.writeUInt(values.proc);
				xdr.writeOpaque(values.args);
				return xdr;
			},
			decode: (xdr) => {
				return {
					prog: xdr.readUInt(),
					vers: xdr.readUInt(),
					proc: xdr.readUInt(),
					args: xdr.readOpaque(),
				};
			},
		};
	}
}
