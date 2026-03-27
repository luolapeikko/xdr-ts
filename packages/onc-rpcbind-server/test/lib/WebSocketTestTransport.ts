import {XdrBuffer} from '@luolapeikko/onc-node';
import {type IRpcTransport, RpcAuthFlavor, RpcMsgType, type RpcRequest, RpcResponse, rpcCallSchemaModel} from '@luolapeikko/onc-rpcbind-common';
import type {IXdrBuffer} from '@luolapeikko/onc-xdr';
import {DeferredPromise} from '@open-draft/deferred-promise';
import WebSocket, {type RawData} from 'ws';

export class WebSocketTestTransport implements IRpcTransport<Buffer> {
	private url: string;
	private connectionPromise: Promise<WebSocket> | undefined;
	private connection: WebSocket | undefined;
	private readonly pendingRequests = new Map<number, DeferredPromise<RpcResponse>>();
	private readonly pendingTimeouts = new Map<number, NodeJS.Timeout>();

	public constructor(url: string) {
		this.url = url;
	}

	private connect(): Promise<WebSocket> {
		this.connectionPromise ??= this.handleConnection();
		return this.connectionPromise;
	}

	public createXdrBuffer(initialize?: number | Buffer | undefined): IXdrBuffer<Buffer> {
		return new XdrBuffer(initialize);
	}

	public async close(): Promise<void> {
		const connectionPromise = this.connectionPromise;
		this.connectionPromise = undefined;
		this.rejectAllPending(new Error('Websocket transport closed'));
		if (!connectionPromise) {
			return;
		}

		const connection = await connectionPromise;
		this.detachConnection(connection);
		this.connection = undefined;
		if (connection.readyState === connection.CLOSED) {
			return;
		}

		await new Promise<void>((resolve) => {
			const finish = () => resolve();
			connection.once('close', finish);
			connection.terminate();
		});
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
		const connection = await this.connect();
		const responsePromise = new DeferredPromise<RpcResponse>();
		this.setPendingTimeout(request.xid);
		this.pendingRequests.set(request.xid, responsePromise);
		connection.send(payload, (err) => {
			if (err) {
				this.rejectPendingRequest(request.xid, err);
			}
		});
		return responsePromise;
	}

	private attachConnection(ws: WebSocket): void {
		ws.on('message', this.onMessage);
		ws.on('error', this.onError);
		ws.on('close', this.onClose);
	}

	private detachConnection(ws: WebSocket): void {
		ws.removeListener('message', this.onMessage);
		ws.removeListener('error', this.onError);
		ws.removeListener('close', this.onClose);
	}

	private readonly onMessage = (msg: RawData): void => {
		try {
			const payload = this.toBuffer(msg);
			const response = new RpcResponse(this, payload);
			const pending = this.pendingRequests.get(response.reply.xid);
			if (!pending) {
				return;
			}
			this.pendingRequests.delete(response.reply.xid);
			this.clearPendingTimeout(response.reply.xid);
			pending.resolve(response);
		} catch (error) {
			this.rejectAllPending(error instanceof Error ? error : new Error(String(error)));
		}
	};

	private readonly onError = (error: Error): void => {
		this.rejectAllPending(error);
	};

	private readonly onClose = (): void => {
		if (this.connection) {
			this.detachConnection(this.connection);
		}
		this.connection = undefined;
		this.connectionPromise = undefined;
		this.rejectAllPending(new Error('Websocket connection closed'));
	};

	private toBuffer(msg: RawData): Buffer {
		if (Array.isArray(msg)) {
			return Buffer.concat(msg);
		}
		if (msg instanceof ArrayBuffer) {
			return Buffer.from(msg);
		}
		return Buffer.from(msg);
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
					promise.reject(new Error('Websocket Timeout'));
				}
			}, 5000),
		);
	}

	private clearPendingTimeout(xid: number): void {
		clearTimeout(this.pendingTimeouts.get(xid));
		this.pendingTimeouts.delete(xid);
	}

	private handleConnection(): Promise<WebSocket> {
		return new Promise<WebSocket>((resolve, reject) => {
			const ws = new WebSocket(this.url);
			ws.once('error', reject);
			ws.on('open', () => {
				ws.removeListener('error', reject);
				this.connection = ws;
				this.attachConnection(ws);
				resolve(ws);
			});
		});
	}
}
