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

export type RpcbProtoFamily = 'inet' | 'inet6' | 'loopback';

export type RpcbProtocol = 'udp' | 'tcp' | 'ws' | '-';

export type RpcbEntry = {
	maddr: string;
	netid: RpcNetId;
	semantics: RpcbSemantics;
	protofmly: RpcbProtoFamily;
	proto: RpcbProtocol;
};

export type RpcNetIdV6 = 'udp6' | 'tcp6' | 'ws6';
export type RpcNetIdV4 = 'udp' | 'tcp' | 'ws';
export type RpcNetIdLocal = 'local';
export type RpcNetId = RpcNetIdV4 | RpcNetIdV6 | RpcNetIdLocal;

export type Netbuf<B extends Uint8Array = Uint8Array> = {
	maxlen: number;
	buf: B;
};
