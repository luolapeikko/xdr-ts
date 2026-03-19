export const RpcbSemantics = {
	/** Connectionless transport */
	CLTS: 1,
	/** Connection-oriented transport */
	COTS: 2,
	/** Connection-oriented, ordered (graceful close) */
	COTS_ORD: 3,
	/** Raw transport */
	RAW: 4,
} as const;

export type RpcbSemantics = (typeof RpcbSemantics)[keyof typeof RpcbSemantics];

export interface RpcbsAddrList {
	prog: number;
	vers: number;
	success: number;
	failure: number;
	netid: RpcNetId;
}

export interface RpcbsRmtCallList {
	prog: number;
	vers: number;
	proc: number;
	success: number;
	failure: number;
	indirect: number;
	netid: RpcNetId;
}

export interface RpcbStat {
	info: number[];
	setinfo: number;
	unsetinfo: number;
	addrinfo: RpcbsAddrList[];
	rmtinfo: RpcbsRmtCallList[];
}

export interface RpcbEntry {
	maddr: string;
	netid: RpcNetId;
	semantics: RpcbSemantics;
	protofmly: 'inet' | 'inet6' | 'loopback';
	proto: 'udp' | 'tcp' | '-';
}

export type RpcNetId = 'udp' | 'tcp' | 'udp6' | 'tcp6' | 'local';

export interface Netbuf {
	maxlen: number;
	buf: Buffer;
}
