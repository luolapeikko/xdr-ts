import type {IXdrBuffer} from '@luolapeikko/xdr-ts';
import type {RpcbStat, RpcbsAddrList, RpcbsRmtCallList, RpcNetId} from './RpcBindTypes';

export class RpcDecode {
	public static stat(xdr: IXdrBuffer): RpcbStat {
		return {
			info: xdr.readFixedArray(13, (x) => x.readInt()), // int[13]
			setinfo: xdr.readInt(), // int
			unsetinfo: xdr.readInt(), // int
			addrinfo: RpcDecode.decodeAddrList(xdr), // rpcbs_addrlist
			rmtinfo: RpcDecode.decodeRmtCallList(xdr), // rpcbs_rmtcalllist
		};
	}
	public static decodeAddrList(xdr: IXdrBuffer): RpcbsAddrList[] {
		return xdr.readList(
			(x) => ({
				prog: x.readUInt(), // unsigned int
				vers: x.readUInt(), // unsigned int
				success: x.readInt(), // int
				failure: x.readInt(), // int
				netid: x.readString<RpcNetId>(), // string
			}),
			(x) => x.readUInt(),
		);
	}
	public static decodeRmtCallList(xdr: IXdrBuffer): RpcbsRmtCallList[] {
		return xdr.readList(
			(x) => ({
				prog: x.readUInt(), // unsigned int
				vers: x.readUInt(), // unsigned int
				proc: x.readUInt(), // unsigned int
				success: x.readInt(), // int
				failure: x.readInt(), // int
				indirect: x.readInt(), // int
				netid: x.readString<RpcNetId>(), // string
			}),
			(x) => x.readUInt(),
		);
	}
}
