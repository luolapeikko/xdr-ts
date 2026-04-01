import * as net from 'node:net';
import {type IRpcTransport, RpcAuthFlavor, RpcMsgType, type RpcRequest, RpcResponse, rpcCallSchemaModel} from '@luolapeikko/onc-rpcbind-common';
import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import {DeferredPromise} from '@open-draft/deferred-promise';
import {XdrBuffer} from '../XdrBuffer';

export type RpcNodeIpcTransportOptions = {
	/**
	 * Path to the IPC socket.
	 * - Linux/macOS: Unix domain socket path (e.g. '/run/rpcbind.sock')
	 * - Windows: Named pipe path (e.g. '\\\\.\\\pipe\\rpcbind')
	 */
	path: string;
};

/**
 * RPC transport over an IPC socket (Unix domain socket or Windows named pipe).
 * Uses the same TCP record-mark framing (RFC 5531) as RpcNodeTcpTransport.
 */
export class RpcNodeIpcTransport implements IRpcTransport {
	private readonly path: string;
	private socket: net.Socket | undefined;
	private received = Buffer.alloc(0);
	private fragments: Buffer[] = [];
	private readonly pendingRequests = new Map<number, DeferredPromise<RpcResponse>>();
	private readonly pendingTimeouts = new Map<number, NodeJS.Timeout>();
	private isAttachedSocket = false;

	public constructor({path}: RpcNodeIpcTransportOptions) {
		this.path = path;
	}

	public createXdrBuffer(initialize?: number | Buffer): IXdrBuffer<Buffer> {
		return new XdrBuffer(initialize);
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
		const fragmentHeader = Buffer.alloc(4);
		fragmentHeader.writeUInt32BE((0x80000000 | payload.length) >>> 0, 0);
		const record = Buffer.concat([fragmentHeader, payload]);

		const responsePromise = new DeferredPromise<RpcResponse>();
		this.setPendingTimeout(request.xid);
		this.pendingRequests.set(request.xid, responsePromise);
		try {
			const socket = this.getSocket();
			await this.writeRecord(socket, record);
		} catch (error) {
			this.rejectPendingRequest(request.xid, error instanceof Error ? error : new Error(String(error)));
		}
		return responsePromise;
	}

	private attachSocket(socket: net.Socket): void {
		if (!this.isAttachedSocket) {
			socket.on('data', this.onData);
			socket.on('error', this.onError);
			socket.on('close', this.onClose);
			this.isAttachedSocket = true;
		}
	}

	private detachSocket(socket: net.Socket): void {
		socket.removeListener('data', this.onData);
		socket.removeListener('error', this.onError);
		socket.removeListener('close', this.onClose);
		this.isAttachedSocket = false;
	}

	private getSocket(): net.Socket {
		this.socket ??= net.createConnection({path: this.path});
		this.attachSocket(this.socket);
		return this.socket;
	}

	private writeRecord(socket: net.Socket, record: Buffer): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			socket.write(record, (error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	private readonly onData = (data: Buffer): void => {
		this.received = Buffer.concat([this.received, data]);

		while (this.received.length >= 4) {
			const header = this.received.readUInt32BE(0);
			const isLastFragment = (header & 0x80000000) !== 0;
			const fragmentSize = header & 0x7fffffff;
			if (this.received.length < 4 + fragmentSize) {
				return;
			}

			this.fragments.push(this.received.subarray(4, 4 + fragmentSize));
			this.received = this.received.subarray(4 + fragmentSize);

			if (!isLastFragment) {
				continue;
			}

			const responsePayload = this.fragments.length === 1 ? this.fragments[0] : Buffer.concat(this.fragments);
			this.fragments = [];

			try {
				const response = new RpcResponse(this, responsePayload);
				const pending = this.pendingRequests.get(response.reply.xid);
				if (!pending) {
					continue;
				}
				this.pendingRequests.delete(response.reply.xid);
				this.clearPendingTimeout(response.reply.xid);
				pending.resolve(response);
			} catch (error) {
				this.rejectAllPending(error instanceof Error ? error : new Error(String(error)));
				return;
			}
		}
	};

	private readonly onError = (error: Error): void => {
		this.rejectAllPending(error);
		this.socket?.destroy();
	};

	private readonly onClose = (): void => {
		if (this.socket) {
			this.detachSocket(this.socket);
		}
		this.socket = undefined;
		this.received = Buffer.alloc(0);
		this.fragments = [];
		this.rejectAllPending(new Error('IPC socket closed'));
	};

	private rejectPendingRequest(xid: number, error: Error): void {
		const pending = this.pendingRequests.get(xid);
		if (!pending) {
			return;
		}
		this.pendingRequests.delete(xid);
		this.clearPendingTimeout(xid);
		pending.reject(error);
	}

	private rejectAllPending(error: Error): void {
		for (const [xid, pending] of this.pendingRequests.entries()) {
			this.pendingRequests.delete(xid);
			this.clearPendingTimeout(xid);
			pending.reject(error);
		}
	}

	private setPendingTimeout(xid: number): void {
		this.clearPendingTimeout(xid);
		this.pendingTimeouts.set(
			xid,
			setTimeout(() => {
				const promise = this.pendingRequests.get(xid);
				if (promise?.state === 'pending') {
					this.pendingRequests.delete(xid);
					this.clearPendingTimeout(xid);
					promise.reject(new Error('IPC Timeout'));
				}
			}, 5000),
		);
	}

	private clearPendingTimeout(xid: number): void {
		clearTimeout(this.pendingTimeouts.get(xid));
		this.pendingTimeouts.delete(xid);
	}

	public close(): void {
		this.rejectAllPending(new Error('IPC transport closed'));
		if (this.socket) {
			this.detachSocket(this.socket);
			this.socket.destroy();
			this.socket = undefined;
		}
	}
}
