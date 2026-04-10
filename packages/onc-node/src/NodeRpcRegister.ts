import {
	callProcedure,
	RpcBindV4,
	type RpcNetIdLocal,
	type RpcNetIdV4,
	type RpcNetIdV6,
	type RpcProgram,
	RpcUniversalAddress,
} from '@luolapeikko/onc-rpcbind-common';
import type {SocketAddrV4, SocketAddrV6} from 'net-socket-address';
import type {SocketAddrUnix} from 'unix-socket-address';
import {RpcNodeIpcTransport} from './transport/RpcNodeIpcTransport';

export type RpcEndpoint =
	| {
			addr: SocketAddrUnix;
			netid: RpcNetIdLocal;
	  }
	| {
			addr: SocketAddrV4;
			netid: RpcNetIdV4;
	  }
	| {
			addr: SocketAddrV6;
			netid: RpcNetIdV6;
	  };

export type NodeRpcRegisterOptions = {
	socketPath?: string;
	/** List of endpoints to register */
	endpoints: readonly RpcEndpoint[];
	prog: Readonly<RpcProgram>;
	owner: string; // service owner to register with rpcbind
};

export class NodeRpcRegister {
	#transport: RpcNodeIpcTransport;
	#endpoints: readonly RpcEndpoint[];
	#prog: Readonly<RpcProgram>;
	#owner: string;
	public constructor(options: NodeRpcRegisterOptions) {
		this.#transport = new RpcNodeIpcTransport({path: options.socketPath ?? this.#getDefaultSocketPath()});
		this.#endpoints = options.endpoints;
		this.#prog = options.prog;
		this.#owner = options.owner;
	}

	public async init(): Promise<void> {
		await Promise.all(
			this.#endpoints.map((endpoint) =>
				callProcedure(RpcBindV4, 'RPCBPROC_SET', this.#transport, {
					prog: this.#prog.prog,
					vers: this.#prog.vers,
					netid: endpoint.netid,
					addr:
						endpoint.addr.family === 'unix'
							? endpoint.addr.toString()
							: RpcUniversalAddress.from(endpoint.addr.asNodeListenerOptions()).toString(),
					owner: this.#owner,
				}),
			),
		);
	}

	public async close(): Promise<void> {
		await Promise.all(
			this.#endpoints.map((endpoint) =>
				callProcedure(RpcBindV4, 'RPCBPROC_UNSET', this.#transport, {
					prog: this.#prog.prog,
					vers: this.#prog.vers,
					netid: endpoint.netid,
					addr: '',
					owner: '',
				}),
			),
		);
		this.#transport.close();
	}

	#getDefaultSocketPath(): string {
		if (process.platform === 'win32') {
			return '\\\\.\\pipe\\rpcbind';
		} else {
			return '/run/rpcbind.sock';
		}
	}
}
