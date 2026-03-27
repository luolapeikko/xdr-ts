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





export interface RpcbEntry {
	maddr: string;
	netid: RpcNetId;
	semantics: RpcbSemantics;
	protofmly: 'inet' | 'inet6' | 'loopback';
	proto: 'udp' | 'tcp' | 'ws' | '-';
}

export type RpcNetId = 'udp' | 'tcp' | 'udp6' | 'tcp6' | 'local' | 'ws' | 'ws6';

export interface Netbuf<B extends Uint8Array = Uint8Array> {
	maxlen: number;
	buf: B;
}


