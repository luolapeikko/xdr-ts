import * as dgram from 'node:dgram';
import {type IRpcTransport, RpcAuthFlavor, RpcMsgType, type RpcRequest, RpcResponse, rpcCallSchemaModel} from '@luolapeikko/onc-rpcbind-common';
import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import {DeferredPromise} from '@open-draft/deferred-promise';
import {XdrBuffer} from '../XdrBuffer';

export type RpcNodeUdpTransportOptions = {
	host?: string;
	port?: number;
	socket?: dgram.Socket;
	bindPort?: number; // optional port to bind the socket to, required if socket is not provided
	bindAddress?: string; // optional address to bind the socket to, defaults to host or wildcard if host is wildcard
	broadcast?: boolean; // enable broadcast mode
	broadcastAddress?: string; // optional override
	logger?: Pick<Console, 'info' | 'debug' | 'error' | 'warn'>; // optional logger, defaults to console
};

export class RpcNodeUdpTransport implements IRpcTransport {
	private readonly host: string;
	private readonly port: number;
	private socket: dgram.Socket | undefined;
	private readonly isExternalSocket: boolean;
	private readonly broadcast?: boolean;
	private readonly broadcastAddress: string;

	private readonly pendingRequests = new Map<number, DeferredPromise<RpcResponse>>();
	private readonly pendingTimeouts = new Map<number, NodeJS.Timeout>();
	private readonly bindPort?: number;
	private readonly bindAddress?: string;
	private readonly logger: Pick<Console, 'info' | 'debug' | 'error' | 'warn'>;

	public constructor({host, port, socket, bindPort, bindAddress, broadcast, broadcastAddress, logger}: RpcNodeUdpTransportOptions = {}) {
		this.host = host ?? '127.0.0.1';
		this.port = port ?? 111;
		this.socket = socket;
		this.logger = logger ?? console;
		this.bindPort = bindPort;
		this.bindAddress = bindAddress;
		this.isExternalSocket = !!socket;
		this.broadcast = broadcast;
		this.broadcastAddress = broadcastAddress ?? (this.host.includes(':') ? 'ff02::1' : '255.255.255.255');
		if (this.socket) {
			this.socket.on('message', (msg) => this.getMessage(msg));
			this.socket.on('error', (err) => this.getError(err));
		}
	}

	public createXdrBuffer(initialize?: number | Buffer): IXdrBuffer<Buffer> {
		return new XdrBuffer(initialize);
	}

	private async getSocket(): Promise<dgram.Socket> {
		if (this.socket) {
			try {
				this.socket.address();
				return this.socket;
			} catch (_e) {
				// closed
			}
		}
		// create new socket (and bind if needed)
		this.socket = dgram.createSocket(this.host.includes(':') ? 'udp6' : 'udp4');
		const waitBound = new DeferredPromise<void>();
		this.socket.bind(this.bindPort ?? 0, this.bindAddress, () => {
			if (this.broadcast) {
				this.socket?.setBroadcast(true);
			}
			waitBound.resolve();
		});
		await waitBound;
		this.socket.on('message', (msg) => this.getMessage(msg));
		this.socket.on('error', (err) => this.getError(err));
		return this.socket;
	}

	public async call(request: RpcRequest): Promise<RpcResponse> {
		const xdr = new XdrBuffer(1024);
		rpcCallSchemaModel.encode(xdr, {
			xid: request.xid,
			mtype: RpcMsgType.CALL,
			rpcvers: 2,
			prog: request.procedure.prog,
			vers: request.procedure.vers,
			proc: request.procedure.proc,
			cred: request.credentials,
			verf: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
		});
		if (request.args) {
			request.args(xdr);
		}
		const payload = xdr.rawBuffer.subarray(0, xdr.currentPointer);
		const responsePromise = new DeferredPromise<RpcResponse>();
		this.pendingRequests.set(request.xid, responsePromise); // enable promise tracking
		this.setPendingTimeout(request.xid);
		try {
			const socket = await this.getSocket();
			await this.writeRecord(socket, payload);
		} catch (error) {
			this.rejectPendingRequest(request.xid, error instanceof Error ? error : new Error(String(error)));
		}
		return responsePromise;
	}

	private writeRecord(socket: dgram.Socket, record: Buffer): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const targetAddress = this.broadcast ? this.broadcastAddress : this.host;
			socket.send(record, this.port, targetAddress, (error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	private rejectPendingRequest(xid: number, error: Error): void {
		const pending = this.pendingRequests.get(xid);
		if (!pending) {
			return;
		}
		this.pendingRequests.delete(xid);
		this.clearPendingTimeout(xid);
		pending.reject(error);
	}

	public getMessage(msg: Buffer) {
		try {
			const response = new RpcResponse(this, msg);
			if (!response.ok) {
				this.logger?.error('Failed to parse RPC response', response.error);
			}
			const promise = this.pendingRequests.get(response.reply.xid);
			if (promise) {
				this.pendingRequests.delete(response.reply.xid);
				promise.resolve(response);
			} else {
				this.logger?.warn('Received response with unknown xid', response.reply.xid);
			}
		} catch (err) {
			this.logger?.error('Failed to parse RPC response', err);
		}
	}

	public getError(err: Error) {
		this.logger?.error('RPC transport error', err);
	}

	private setPendingTimeout(xid: number): void {
		this.clearPendingTimeout(xid); // just in case
		this.pendingTimeouts.set(
			xid,
			setTimeout(() => {
				const promise = this.pendingRequests.get(xid);
				if (promise?.state === 'pending') {
					this.pendingRequests.delete(xid);
					this.clearPendingTimeout(xid);
					promise.reject(new Error('UDP Timeout'));
				}
			}, 5000),
		);
	}

	private clearPendingTimeout(xid: number): void {
		clearTimeout(this.pendingTimeouts.get(xid));
		this.pendingTimeouts.delete(xid);
	}

	private rejectAllPending(error: Error): void {
		for (const [xid, promise] of this.pendingRequests.entries()) {
			if (promise.state === 'pending') {
				this.pendingRequests.delete(xid);
				this.clearPendingTimeout(xid);
				promise.reject(error);
			}
		}
	}

	public close(): void {
		// Reject all pending requests
		this.rejectAllPending(new Error('Transport closed'));

		if (this.socket) {
			this.socket.removeListener('message', this.getMessage);
			this.socket.removeListener('error', this.getError);
			if (this.broadcast) {
				try {
					this.socket.setBroadcast(false); // restore default broadcast setting to avoid affecting other users of the socket
				} catch (_e) {
					// socket may already be closed
				}
			}
			if (!this.isExternalSocket) {
				try {
					this.socket.close();
				} catch (_e) {
					// already closed
				}
			}
		}
		this.socket = undefined;
	}
}
