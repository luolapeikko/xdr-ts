import type {IXdrBuffer} from '@luolapeikko/xdr-ts';
import type {RpcbStat, RpcbsAddrList, RpcbsRmtCallList, RpcNetId} from './RpcBindTypes';
import RpcType from './RpcType';

export class RpcDecode {
	public static stat(xdr: IXdrBuffer): RpcbStat {
		return {
			info: xdr.readFixedArray(13, (x) => x.readInt()), // int[13]
			setinfo: xdr.readInt(), // int
			unsetinfo: xdr.readInt(), // int
			addrinfo: RpcType.RpcbsAddrList().decode(xdr), // rpcbs_addrlist
			rmtinfo: RpcType.RpcbsRmtCallList().decode(xdr), // rpcbs_rmtcalllist
		};
	}
}
