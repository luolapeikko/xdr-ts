import {RpcNodeTcpTransport, RpcNodeUdpTransport} from '@luolapeikko/onc-node';
import {type RpcCallType, RpcRequest} from '@luolapeikko/onc-rpcbind-common';
import {XdrType} from '@luolapeikko/onc-xdr';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {TinyService} from './lib/TinyService';

const tinyServiceCall = {
	procedure: {prog: 0x5f0001, vers: 1, proc: 1},
	decoder: XdrType.UInt<number>().decode,
} as const satisfies RpcCallType<void, number>;

describe('RpcBind GETTIME', () => {
	const tinyService = new TinyService({
		procedure: tinyServiceCall.procedure,
	});
	beforeAll(async () => {
		await tinyService.start();
	});
	describe('TinyService Direct Transport', () => {
		it('should respond directly over UDP', async () => {
			tinyService.clearEvents();
			const transport = new RpcNodeUdpTransport({host: tinyService.host, port: tinyService.udpPort});
			const response = await transport.call(new RpcRequest(tinyServiceCall.procedure));
			transport.close();
			const events = tinyService.getEvents();

			expect(response.ok).toBe(true);
			if (!response.ok) {
				throw response.error;
			}
			expect(XdrType.UInt<number>().decode(response.xdr)).toBeGreaterThan(Math.floor(Date.now() / 1000) - 10);
			expect(
				events.some((event) => event.includes('source=udp:')),
				`[TinyServiceTest] direct UDP events ${JSON.stringify(events)}`,
			).toBe(true);
		});

		it('should respond directly over TCP', async () => {
			tinyService.clearEvents();
			const transport = new RpcNodeTcpTransport({host: tinyService.host, port: tinyService.tcpPort});
			const response = await transport.call(new RpcRequest(tinyServiceCall.procedure));
			transport.close();
			const events = tinyService.getEvents();

			expect(response.ok).toBe(true);
			if (!response.ok) {
				throw response.error;
			}
			expect(XdrType.UInt<number>().decode(response.xdr)).toBeGreaterThan(Math.floor(Date.now() / 1000) - 10);
			expect(
				events.some((event) => event.includes('source=tcp:')),
				`[TinyServiceTest] direct TCP events ${JSON.stringify(events)}`,
			).toBe(true);
		});
	});
	afterAll(async () => {
		await tinyService.close();
	});
});
