import * as net from 'node:net';
import {
	PortMapperV2,
	programAsRpcProcedure,
	RpcAuthFlavor,
	RpcBindV3,
	RpcMsgType,
	RpcReplyStat,
	RpcRequest,
	rpcReplySchemaModel,
} from '@luolapeikko/onc-rpcbind-common';
import {afterEach, describe, expect, it} from 'vitest';
import {RpcNodeTcpTransport, XdrBuffer} from '../src/';

function toRecordFragment(payload: Buffer, isLast: boolean): Buffer {
	const header = Buffer.alloc(4);
	header.writeUInt32BE(((isLast ? 0x80000000 : 0) | payload.length) >>> 0, 0);
	return Buffer.concat([header, payload]);
}

function buildAcceptedReply(xid: number, resultBody: Buffer): Buffer {
	const xdr = new XdrBuffer(128 + resultBody.length);
	rpcReplySchemaModel.encode(xdr, {
		xid,
		mtype: RpcMsgType.REPLY,
		replyStat: RpcReplyStat.MSG_ACCEPTED,
		verf: {flavor: RpcAuthFlavor.AUTH_NONE, body: Buffer.alloc(0)},
		acceptStat: 0,
	});

	const replyHeader = xdr.rawBuffer.subarray(0, xdr.currentPointer);
	return Buffer.concat([replyHeader, resultBody]);
}

function extractRecordPayloads(buffer: Buffer<ArrayBufferLike>): {payloads: Buffer<ArrayBufferLike>[]; remaining: Buffer<ArrayBufferLike>} {
	const payloads: Buffer<ArrayBufferLike>[] = [];
	let remaining = buffer;

	while (remaining.length >= 4) {
		const header = remaining.readUInt32BE(0);
		const fragmentSize = header & 0x7fffffff;
		if (remaining.length < 4 + fragmentSize) {
			break;
		}

		payloads.push(remaining.subarray(4, 4 + fragmentSize));
		remaining = remaining.subarray(4 + fragmentSize);
	}

	return {payloads, remaining};
}

describe('RpcNodeTcpTransport', () => {
	const transports: RpcNodeTcpTransport[] = [];
	const servers: net.Server[] = [];

	afterEach(async () => {
		for (const transport of transports.splice(0)) {
			transport.close();
		}
		await Promise.all(
			servers.splice(0).map(
				(server) =>
					new Promise<void>((resolve) => {
						server.close(() => resolve());
					}),
			),
		);
	});

	it('reassembles response split into multiple RPC fragments', async () => {
		const xid = 0x01020304;
		const resultBody = Buffer.alloc(4);
		resultBody.writeUInt32BE(0x11223344, 0);
		const fullReply = buildAcceptedReply(xid, resultBody);
		const splitPoint = Math.floor(fullReply.length / 2);
		const firstPart = fullReply.subarray(0, splitPoint);
		const secondPart = fullReply.subarray(splitPoint);

		const server = net.createServer((socket) => {
			socket.once('data', () => {
				socket.write(toRecordFragment(firstPart, false));
				socket.write(toRecordFragment(secondPart, true));
			});
		});
		servers.push(server);

		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
		const address = server.address();
		if (!address || typeof address === 'string') {
			throw new Error('Failed to determine test server address');
		}

		const transport = new RpcNodeTcpTransport({host: '127.0.0.1', port: address.port});
		transports.push(transport);
		const request = new RpcRequest(programAsRpcProcedure(PortMapperV2, 'PMAPPROC_NULL'), {xid});

		const response = await transport.call(request);
		expect(response.ok).toBe(true);
		if (!response.ok) {
			throw response.error;
		}
		expect(response.reply.xid).toBe(xid);
		expect(response.xdr.readUInt()).toBe(0x11223344);
	});

	it('reassembles multi-fragment response even when headers arrive in tiny chunks', async () => {
		const xid = 0x0a0b0c0d;
		const resultBody = Buffer.alloc(4);
		resultBody.writeUInt32BE(0xaabbccdd, 0);
		const fullReply = buildAcceptedReply(xid, resultBody);
		const splitPoint = Math.floor(fullReply.length / 2);
		const firstFragment = toRecordFragment(fullReply.subarray(0, splitPoint), false);
		const secondFragment = toRecordFragment(fullReply.subarray(splitPoint), true);

		const server = net.createServer((socket) => {
			socket.once('data', () => {
				socket.write(firstFragment.subarray(0, 2));
				setTimeout(() => {
					socket.write(firstFragment.subarray(2));
					socket.write(secondFragment.subarray(0, 1));
					setTimeout(() => {
						socket.write(secondFragment.subarray(1));
					}, 2);
				}, 2);
			});
		});
		servers.push(server);

		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
		const address = server.address();
		if (!address || typeof address === 'string') {
			throw new Error('Failed to determine test server address');
		}

		const transport = new RpcNodeTcpTransport({host: '127.0.0.1', port: address.port});
		transports.push(transport);
		const request = new RpcRequest(programAsRpcProcedure(PortMapperV2, 'PMAPPROC_NULL'), {xid});

		const response = await transport.call(request);
		expect(response.ok).toBe(true);
		if (!response.ok) {
			throw response.error;
		}
		expect(response.reply.xid).toBe(xid);
		expect(response.xdr.readUInt()).toBe(0xaabbccdd);
	});

	it('matches concurrent responses by xid on a shared tcp socket', async () => {
		const firstRequestXid = 0x10101010;
		const secondRequestXid = 0x20202020;
		const firstReplyBody = Buffer.alloc(4);
		const secondReplyBody = Buffer.alloc(4);
		firstReplyBody.writeUInt32BE(0x11111111, 0);
		secondReplyBody.writeUInt32BE(0x22222222, 0);

		const server = net.createServer((socket) => {
			let received: Buffer<ArrayBufferLike> = Buffer.alloc(0);
			const requestXids: number[] = [];

			socket.on('data', (chunk) => {
				if (typeof chunk === 'string') {
					throw new Error('Unexpected string data from test socket');
				}
				received = Buffer.concat([received, chunk]);
				const parsed = extractRecordPayloads(received);
				received = parsed.remaining;

				for (const payload of parsed.payloads) {
					const requestXdr = new XdrBuffer(payload);
					requestXids.push(requestXdr.readUInt());
				}

				if (requestXids.length < 2) {
					return;
				}

				const firstResponse = buildAcceptedReply(requestXids[0], firstReplyBody);
				const secondResponse = buildAcceptedReply(requestXids[1], secondReplyBody);

				// Respond out of order to verify xid-based dispatch.
				socket.write(toRecordFragment(secondResponse, true));
				setTimeout(() => {
					socket.write(toRecordFragment(firstResponse, true));
				}, 2);
				socket.removeAllListeners('data');
			});
		});
		servers.push(server);

		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
		const address = server.address();
		if (!address || typeof address === 'string') {
			throw new Error('Failed to determine test server address');
		}

		const transport = new RpcNodeTcpTransport({host: '127.0.0.1', port: address.port});
		transports.push(transport);

		const firstPromise = transport.call(new RpcRequest(programAsRpcProcedure(PortMapperV2, 'PMAPPROC_NULL'), {xid: firstRequestXid}));
		const secondPromise = transport.call(new RpcRequest(programAsRpcProcedure(RpcBindV3, 'RPCBPROC_GETTIME'), {xid: secondRequestXid}));

		const [firstResponse, secondResponse] = await Promise.all([firstPromise, secondPromise]);

		expect(firstResponse.ok).toBe(true);
		if (!firstResponse.ok) {
			throw firstResponse.error;
		}
		expect(firstResponse.reply.xid).toBe(firstRequestXid);
		expect(firstResponse.xdr.readUInt()).toBe(0x11111111);

		expect(secondResponse.ok).toBe(true);
		if (!secondResponse.ok) {
			throw secondResponse.error;
		}
		expect(secondResponse.reply.xid).toBe(secondRequestXid);
		expect(secondResponse.xdr.readUInt()).toBe(0x22222222);
	});
});
