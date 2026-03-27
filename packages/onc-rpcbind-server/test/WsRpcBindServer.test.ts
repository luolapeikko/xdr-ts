import {RpcBindClient} from '@luolapeikko/onc-rpcbind-client';
import {type RpcProcedure, RpcProcUnavailError, RpcRequest, RpcUniversalAddress} from '@luolapeikko/onc-rpcbind-common';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {RpcBindServer} from '../src/';
import {WebSocketTestTransport} from './lib/WebSocketTestTransport';

const invalidProcedure = {prog: 100000, vers: 3, proc: 999} satisfies RpcProcedure;

describe('WsRpcBindServer', () => {
	const rpcPort = 11114;
	const wsPort = 18111;

	describe('WebSocketTestTransport', () => {
		const transport = new WebSocketTestTransport(`ws://127.0.0.1:${wsPort}`);
		const client = new RpcBindClient(transport);
		let server: RpcBindServer;

		beforeAll(async () => {
			server = new RpcBindServer(rpcPort, {ws: true, wsPort});
			await server.bind();
		});

		it('should handle error when calling invalid procedure via websocket transport', async () => {
			const request = new RpcRequest(invalidProcedure);
			const response = await transport.call(request);
			if (response.ok) {
				throw new Error('Something is wrong, this should not happen');
			}
			expect(response.ok).toBe(false);
			expect(response.error).toEqual(new RpcProcUnavailError('Procedure Unavailable', response.reply));
		});

		it('should successfully call RPCBPROC_NULL via websocket', async () => {
			await expect(client.null()).resolves.toBeUndefined();
		});

		it('should get time via websocket', async () => {
			const time = await client.getTime();
			const now = Math.floor(Date.now() / 1000);
			expect(time).toBeGreaterThan(now - 10);
			expect(time).toBeLessThanOrEqual(now + 10);
		});

		it('should successfully dump mappings via websocket', async () => {
			const mappings = await client.dump();
			expect(mappings.length).toBeGreaterThan(0);
			expect(mappings.find((mapping) => mapping.prog === 100000 && mapping.vers === 4 && mapping.netid === 'tcp')).toBeDefined();
		});

		it('should successfully get address list via websocket', async () => {
			const entries = await client.getAddrList({prog: 100000, vers: 4});
			expect(entries.length).toBeGreaterThan(0);
			expect(entries.find((entry) => entry.netid === 'tcp')).toBeDefined();
		});

		it('should register and unregister a service via websocket', async () => {
			const prog = 777777;
			const vers = 1;
			const maddr = '127.0.0.1.0.222';

			let entries = await client.getAddrList({prog, vers});
			expect(entries.length).toBe(0);

			const setRes = await client.setProgram({prog, vers}, 'tcp', maddr, 'owner');
			expect(setRes).toBe(true);

			entries = await client.getAddrList({prog, vers});
			expect(entries.length).toBe(1);
			expect(entries[0].maddr).toBe(maddr);
			expect(entries[0].netid).toBe('tcp');

			const unsetRes = await client.unsetProgram({prog, vers}, 'tcp');
			expect(unsetRes).toBe(true);

			entries = await client.getAddrList({prog, vers});
			expect(entries.length).toBe(0);
		});

		it('should get address via websocket', async () => {
			const addr = await client.getAddr({prog: 100000, vers: 4, netid: 'tcp'});
			expect(addr).toBe(RpcUniversalAddress.from({host: '127.0.0.1', port: rpcPort}));
		});

		afterAll(async () => {
			await transport.close();
			await server.close();
		});
	});
});
