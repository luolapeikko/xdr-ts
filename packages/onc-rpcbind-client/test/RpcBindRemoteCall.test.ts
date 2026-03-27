import {RpcNodeUdpTransport} from '@luolapeikko/onc-node';
import type {RpcRemoteCallCoder} from '@luolapeikko/onc-rpcbind-common';
import {XdrType} from '@luolapeikko/onc-xdr';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {RpcBindClient} from '../src';
import {TinyService} from './lib/TinyService';

const tinyServiceCall = {
	proc: 1,
	vers: 1,
	prog: 0x5f0001,
	response: XdrType.uint,
} as const satisfies RpcRemoteCallCoder;

describe('Rpc Abstraction (Transport Based)', () => {
	const tinyService = new TinyService({
		procedure: {proc: tinyServiceCall.proc, vers: tinyServiceCall.vers, prog: tinyServiceCall.prog},
	});

	beforeAll(async () => {
		await tinyService.start();
	});

	describe('RpcUdpBroadcastTransport', () => {
		const transport = new RpcNodeUdpTransport({
			broadcast: true,
			broadcastAddress: '255.255.255.255',
		});
		const rpcbind = new RpcBindClient(transport);

		it('should forward RPCBPROC_BCAST to TinyService and return its response', async () => {
			tinyService.clearEvents();
			const result = await rpcbind.broadcastCall(tinyServiceCall, undefined);
			expect(result.addr).toBeTruthy();
			expect(result.results).toBeGreaterThan(0);
			expect(tinyService.getEvents().some((e) => e.includes('request success'))).toBe(true);
		});

		afterAll(() => {
			transport.close();
		});
	});
	afterAll(async () => {
		await tinyService.close();
	});
});
