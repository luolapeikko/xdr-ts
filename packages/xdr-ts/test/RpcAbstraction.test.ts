import {describe, expect, it} from 'vitest';
import {RpcRequest} from '../src/rpc/RpcRequest';
import {RpcUdpTransport} from '../src/rpcTransport/RpcUdpTransport';

describe('Rpc Abstraction (Transport Based)', () => {
	const host = '127.0.0.1';
	const port = 1111;

	it('should handle error when calling invalid procedure via transport', async () => {
		const transport = new RpcUdpTransport(host, port);
		const request = new RpcRequest({
			prog: 100000,
			vers: 3,
			proc: 999, // Invalid procedure
		});

		const response = await transport.call(request);

		expect(response.ok).toBe(false);
		expect(response.reply.acceptStat).not.toBe(0);
	});
});
