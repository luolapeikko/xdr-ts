import * as dgram from 'node:dgram';
import {XdrBuffer} from '@luolapeikko/onc-node';
import {RpcAuthFlavor, RpcMsgType, rpcCallSchemaModel} from '@luolapeikko/onc-rpcbind-common';
import {describe, expect, it} from 'vitest';

describe('RpcBind GETTIME', () => {
	it('should build a valid RPCBPROC_GETTIME call payload', () => {
		const buffer = rpcCallSchemaModel.encode(new XdrBuffer(1024), {
			xid: 0x12345678,
			mtype: RpcMsgType.CALL,
			rpcvers: 2,
			prog: 100000, // RPCBIND
			vers: 3, // V3
			proc: 6, // GETTIME
			cred: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
			verf: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
		});

		const payload = Buffer.from(buffer.sliceUsed());

		// Expectations based on RFC 1831 (RPC)
		// XID: 12 34 56 78 (4 bytes)
		// TYPE: 00 00 00 00 (4 bytes, CALL)
		// RPCVERS: 00 00 00 02 (4 bytes)
		// PROG: 00 01 86 a0 (4 bytes, 100000)
		// VERS: 00 00 00 03 (4 bytes)
		// PROC: 00 00 00 06 (4 bytes)
		// CRED FLAVOR: 00 00 00 00 (4 bytes, NONE)
		// CRED LENGTH: 00 00 00 00 (4 bytes)
		// VERF FLAVOR: 00 00 00 00 (4 bytes, NONE)
		// VERF LENGTH: 00 00 00 00 (4 bytes)

		expect(payload.toString('hex'), `Payload Hex: ${payload.toString('hex')}`).toBe('123456780000000000000002000186a0000000030000000600000000000000000000000000000000');
	});

	it('should send GETTIME call to rpcbind on localhost:111 (UDP) and receive response', async () => {
		const client = dgram.createSocket('udp4');

		const buffer = rpcCallSchemaModel.encode(new XdrBuffer(1024), {
			xid: Math.floor(Math.random() * 0xffffffff),
			mtype: RpcMsgType.CALL,
			rpcvers: 2,
			prog: 100000,
			vers: 3,
			proc: 6,
			cred: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
			verf: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
		});
		const payload = buffer.sliceUsed();
		const response = await new Promise<Buffer>((resolve, reject) => {
			client.on('message', (msg) => {
				client.close();
				resolve(msg);
			});
			client.on('error', (err) => {
				console.error('UDP Error:', err);
				reject(err);
			});
			client.send(payload, 111, '127.0.0.1', (err) => {
				if (err) {
					console.error('UDP Send Error:', err);
					reject(err);
				}
			});

			// Timeout after 2 seconds
			setTimeout(() => {
				try {
					client.close();
				} catch {
					// already closed or error closing
				}
				reject(new Error('Timeout waiting for rpcbind UDP response'));
			}, 2000);
		});

		expect(response.length, `UDP Response Hex: ${Buffer.from(response).toString('hex')}`).toBeGreaterThan(0);

		const resXdr = new XdrBuffer(response);
		const resXid = resXdr.readUInt();
		const resMType = resXdr.readUInt(); // REPLY
		expect(resMType).toBe(1);

		const replyStat = resXdr.readUInt(); // MSG_ACCEPTED = 0
		expect(replyStat).toBe(0);

		resXdr.readUInt(); // VERF FLAVOR
		resXdr.readOpaque(); // VERF BODY

		const acceptStat = resXdr.readUInt(); // SUCCESS = 0
		expect(acceptStat).toBe(0);

		const timestamp = resXdr.readUInt();
		expect(timestamp, `Remote Time (UDP): ${new Date(timestamp * 1000).toLocaleString()}`).toBeGreaterThan(0);
	});

	it('should send GETTIME call to rpcbind on multiple addresses (TCP) and receive response', async () => {
		const net = await import('node:net');
		const buffer = rpcCallSchemaModel.encode(new XdrBuffer(1024), {
			xid: Math.floor(Math.random() * 0xffffffff),
			mtype: RpcMsgType.CALL,
			rpcvers: 2,
			prog: 100000,
			vers: 3,
			proc: 6,
			cred: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
			verf: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
		});
		const payload = buffer.sliceUsed();

		const fragmentHeader = Buffer.alloc(4);
		// Use unsigned bitwise operations
		fragmentHeader.writeUInt32BE((0x80000000 | payload.length) >>> 0, 0);
		const tcpConnectionTrace: string[] = [];

		const tryConnect = (host: string) =>
			new Promise<Buffer>((resolve, reject) => {
				tcpConnectionTrace.push(`Trying TCP connection to ${host}:111...`);
				const socket = net.createConnection({port: 111, host: host});
				let received = Buffer.alloc(0);

				socket.on('connect', () => {
					tcpConnectionTrace.push(`Connected to ${host}:111`);
					socket.write(fragmentHeader);
					socket.write(payload);
				});

				socket.on('data', (data) => {
					if (typeof data === 'string') {
						data = Buffer.from(data);
					}
					received = Buffer.concat([received, data]);
					if (received.length >= 4) {
						const fragmentSize = received.readUInt32BE(0) & 0x7fffffff;
						if (received.length >= 4 + fragmentSize) {
							socket.destroy();
							resolve(received.subarray(4, 4 + fragmentSize));
						}
					}
				});

				socket.on('error', (err) => {
					console.error(`TCP Error (${host}):`, err.message);
					reject(err);
				});

				setTimeout(() => {
					socket.destroy();
					reject(new Error(`Timeout (${host})`));
				}, 3000);
			});

		const hosts = ['127.0.0.1', '::1', '10.10.10.24'];
		let response: Buffer | undefined;
		for (const host of hosts) {
			try {
				response = await tryConnect(host);
				break;
			} catch (err) {
				// continue
			}
		}

		if (!response) {
			throw new Error(`Failed to connect to any host via TCP. Trace: ${tcpConnectionTrace.join(' | ')}`);
		}

		expect(response.length, `TCP Response Hex: ${Buffer.from(response).toString('hex')}. Trace: ${tcpConnectionTrace.join(' | ')}`).toBeGreaterThan(0);

		const resXdr = new XdrBuffer(response);
		const resXid = resXdr.readUInt();
		const resMType = resXdr.readUInt(); // REPLY
		expect(resMType).toBe(1);

		const replyStat = resXdr.readUInt(); // MSG_ACCEPTED = 0
		expect(replyStat).toBe(0);

		resXdr.readUInt(); // VERF FLAVOR
		resXdr.readOpaque(); // VERF BODY

		const acceptStat = resXdr.readUInt(); // SUCCESS = 0
		expect(acceptStat).toBe(0);

		const timestamp = resXdr.readUInt();
		expect(timestamp, `Remote Time (TCP): ${new Date(timestamp * 1000).toLocaleString()}`).toBeGreaterThan(0);
	});
});
