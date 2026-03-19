import * as dgram from 'node:dgram';
import {RpcAuthFlavor} from '../rpc/RpcAuth';
import {RpcMsgType, rpcCallSchemaModel} from '../rpc/RpcCall';
import type {RpcRequest} from '../rpc/RpcRequest';
import {RpcResponse} from '../rpc/RpcResponse';
import {XdrBuffer} from '../xdrBuffer/XdrBuffer';
import type {IRpcTransport} from './index';

export type RpcUdpTransportOptions = {
	host?: string;
	port?: number;
	socket?: dgram.Socket;
};

export class RpcUdpTransport implements IRpcTransport {
	private readonly host: string;
	private readonly port: number;
	private socket: dgram.Socket | undefined;
	private readonly isExternalSocket: boolean;

	public constructor({host, port, socket}: RpcUdpTransportOptions = {}) {
		this.host = host ?? '127.0.0.1';
		this.port = port ?? 111;
		this.socket = socket;
		this.isExternalSocket = !!socket;
	}

	private getSocket(): dgram.Socket {
		if (this.socket) {
			try {
				this.socket.address();
				return this.socket;
			} catch (_e) {
				// closed
			}
		}
		this.socket = dgram.createSocket(this.host.includes(':') ? 'udp6' : 'udp4');
		return this.socket;
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
		console.log('rpc call header', xdr.currentPointer, 'bytes');
		if (request.args) {
			request.args(xdr);
		}
		console.log('rpc with body', xdr.currentPointer, 'bytes');

		const payload = xdr.rawBuffer.subarray(0, xdr.currentPointer);

		return new Promise<RpcResponse>((resolve, reject) => {
			const socket = this.getSocket();
			const timeout = setTimeout(() => {
				cleanup();
				reject(new Error('UDP Timeout'));
			}, 5000);

			const onMessage = (msg: Buffer) => {
				clearTimeout(timeout);
				cleanup();
				try {
					resolve(new RpcResponse(msg));
				} catch (err) {
					reject(err);
				}
			};

			const onError = (err: Error) => {
				clearTimeout(timeout);
				cleanup();
				reject(err);
			};

			const cleanup = () => {
				socket.removeListener('message', onMessage);
				socket.removeListener('error', onError);
			};

			socket.on('message', onMessage);
			socket.on('error', onError);

			socket.send(payload, this.port, this.host, (err) => {
				if (err) {
					clearTimeout(timeout);
					cleanup();
					reject(err);
				}
			});
		});
	}

	public close(): void {
		if (this.socket && !this.isExternalSocket) {
			try {
				this.socket.close();
			} catch (_e) {
				// already closed
			}
		}
		this.socket = undefined;
	}
}
