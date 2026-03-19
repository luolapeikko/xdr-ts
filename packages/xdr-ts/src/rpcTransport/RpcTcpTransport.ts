import * as net from 'node:net';
import {RpcAuthFlavor} from '../rpc/RpcAuth';
import {RpcMsgType, rpcCallSchemaModel} from '../rpc/RpcCall';
import type {RpcRequest} from '../rpc/RpcRequest';
import {RpcResponse} from '../rpc/RpcResponse';
import {XdrBuffer} from '../xdrBuffer/XdrBuffer';
import type {IRpcTransport} from './index';

export class RpcTcpTransport implements IRpcTransport {
	private readonly host: string;
	private readonly port: number;
	private socket: net.Socket | undefined;
	private readonly externalSocket: boolean;

	public constructor(host: string, port: number, socket?: net.Socket) {
		this.host = host;
		this.port = port;
		this.socket = socket;
		this.externalSocket = !!socket;
	}

	public call(request: RpcRequest): Promise<RpcResponse> {
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

		return new Promise<RpcResponse>((resolve, reject) => {
			let socket = this.socket;
			let received = Buffer.alloc(0);

			const timeout = setTimeout(() => {
				cleanup();
				if (!this.externalSocket) {
					socket?.destroy();
				}
				reject(new Error('TCP Timeout'));
			}, 5000);

			const onData = (data: Buffer) => {
				received = Buffer.concat([received, data]);
				if (received.length < 4) {
					return;
				}

				const fragmentSize = received.readUInt32BE(0) & 0x7fffffff;
				if (received.length < 4 + fragmentSize) {
					return;
				}

				clearTimeout(timeout);
				cleanup();
				if (!this.externalSocket) {
					socket?.destroy();
				}
				try {
					resolve(new RpcResponse(received.subarray(4, 4 + fragmentSize)));
				} catch (err) {
					reject(err);
				}
			};

			const onError = (err: Error) => {
				clearTimeout(timeout);
				cleanup();
				if (!this.externalSocket) {
					socket?.destroy();
				}
				reject(err);
			};

			const cleanup = () => {
				socket?.removeListener('data', onData);
				socket?.removeListener('error', onError);
			};

			if (!socket || socket.destroyed) {
				socket = net.createConnection({port: this.port, host: this.host});
				this.socket = socket;
				socket.on('connect', () => {
					socket?.write(fragmentHeader);
					socket?.write(payload);
				});
			} else {
				socket.write(fragmentHeader);
				socket.write(payload);
			}

			socket.on('data', onData);
			socket.on('error', onError);
		});
	}

	public close(): void {
		if (this.socket && !this.externalSocket) {
			try {
				this.socket.destroy();
			} catch (_e) {
				// already closed
			}
		}
		this.socket = undefined;
	}
}
