import {
	callProcedure,
	IPPROTO,
	PortMapperV2,
	type PortMapperV2Mapping,
	RpcBindV3,
	RpcBindV4,
	type RpcbType,
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
	endpoints?: RpcEndpoint[];
	prog: Readonly<RpcProgram>;
	owner: string; // service owner to register with rpcbind
	/** RPC bind version to use, default is 'v4' */
	rpcBindVersion?: 'v4' | 'v3' | 'v2';
};

export class NodeRpcRegister {
	#transport: RpcNodeIpcTransport;
	#endpoints: RpcEndpoint[];
	#prog: Readonly<RpcProgram>;
	#owner: string;
	#rpcBindVersion: 'v4' | 'v3' | 'v2';
	public constructor(options: NodeRpcRegisterOptions) {
		this.#transport = new RpcNodeIpcTransport({path: options.socketPath ?? this.#getDefaultSocketPath()});
		this.#endpoints = options.endpoints ?? [];
		this.#prog = options.prog;
		this.#owner = options.owner;
		this.#rpcBindVersion = options.rpcBindVersion ?? 'v4';
	}

	public async addEndpoint(endpoint: RpcEndpoint): Promise<void> {
		this.#endpoints.push(endpoint);
		await this.#registerEndpoint(endpoint);
	}

	public async removeEndpoint(endpoint: RpcEndpoint): Promise<void> {
		this.#endpoints = this.#endpoints.filter((e) => e.addr.toString() !== endpoint.addr.toString() || e.netid !== endpoint.netid);
		await this.#unregisterEndpoint(endpoint);
	}

	public listEndpoints(): RpcEndpoint[] {
		return this.#endpoints;
	}

	public async init(): Promise<void> {
		await Promise.all(this.#endpoints.map((endpoint) => this.#registerEndpoint(endpoint)));
	}

	public async close(): Promise<void> {
		await Promise.all(this.#endpoints.map((endpoint) => this.#unregisterEndpoint(endpoint)));
		this.#transport.close();
	}

	#getDefaultSocketPath(): string {
		if (process.platform === 'win32') {
			return '\\\\.\\pipe\\rpcbind';
		} else {
			return '/run/rpcbind.sock';
		}
	}

	#registerEndpoint(endpoint: RpcEndpoint): Promise<boolean> {
		return this.#register(this.#endPointToRpcbType(endpoint));
	}

	#unregisterEndpoint(endpoint: RpcEndpoint): Promise<boolean> {
		return this.#unregister(this.#endPointToRpcbType(endpoint));
	}

	#endPointToRpcbType(endpoint: RpcEndpoint): RpcbType {
		return {
			prog: this.#prog.prog,
			vers: this.#prog.vers,
			netid: endpoint.netid,
			addr: endpoint.addr.family === 'unix' ? endpoint.addr.toString() : RpcUniversalAddress.from(endpoint.addr.asNodeListenerOptions()).toString(),
			owner: this.#owner,
		};
	}

	#register(data: RpcbType): Promise<boolean> {
		switch (this.#rpcBindVersion) {
			case 'v2':
				return callProcedure(PortMapperV2, 'PMAPPROC_SET', this.#transport, this.#rpcbToPortMapperV2Mapping(data));
			case 'v3':
				return callProcedure(RpcBindV3, 'RPCBPROC_SET', this.#transport, data);
			case 'v4':
				return callProcedure(RpcBindV4, 'RPCBPROC_SET', this.#transport, data);
		}
	}

	#unregister(data: RpcbType): Promise<boolean> {
		switch (this.#rpcBindVersion) {
			case 'v2':
				return callProcedure(PortMapperV2, 'PMAPPROC_UNSET', this.#transport, this.#rpcbToPortMapperV2Mapping(data));
			case 'v3':
				return callProcedure(RpcBindV3, 'RPCBPROC_UNSET', this.#transport, data);
			case 'v4':
				return callProcedure(RpcBindV4, 'RPCBPROC_UNSET', this.#transport, data);
		}
	}

	#rpcbToPortMapperV2Mapping(data: RpcbType): PortMapperV2Mapping {
		if (data.netid !== 'tcp' && data.netid !== 'udp') {
			throw new Error(`RPC bind protocol version 2 only supports 'tcp' and 'udp' netids`);
		}
		return {
			prog: data.prog,
			vers: data.vers,
			prot: data.netid === 'tcp' ? IPPROTO.TCP : IPPROTO.UDP,
			port: RpcUniversalAddress.to(data.addr).port,
		};
	}
}
