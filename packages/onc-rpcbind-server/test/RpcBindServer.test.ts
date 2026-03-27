import {RpcNodeTcpTransport, RpcNodeUdpTransport} from '@luolapeikko/onc-node';
import {RpcBindClient} from '@luolapeikko/onc-rpcbind-client';
import {type RpcProcedure, RpcProcUnavailError, RpcRequest, RpcUniversalAddress} from '@luolapeikko/onc-rpcbind-common';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {RpcBindServer} from '../src/';

const invalidProcedure = {prog: 100000, vers: 3, proc: 999} satisfies RpcProcedure;

describe('RpcBindServer', () => {
	const testPort = 11112;

	describe('RpcTcpTransport', () => {
		const tcpPort = 11112;
		const transport = new RpcNodeTcpTransport({port: tcpPort});
		const client = new RpcBindClient(transport);
		let server: RpcBindServer;
		beforeAll(async () => {
			server = new RpcBindServer(testPort);
			await server.bind();
		});
		afterAll(async () => {
			transport.close();
			await server.close();
		});
		it('should handle error when calling invalid procedure via transport', async () => {
			const request = new RpcRequest(invalidProcedure);
			const response = await transport.call(request);
			if (response.ok) {
				throw new Error('Something is wrong, this should not happen');
			}
			expect(response.ok).toBe(false);
			expect(response.error).toEqual(new RpcProcUnavailError('Procedure Unavailable', response.reply));
		});
		it('should successfully call RPCBPROC_NULL via TCP', async () => {
			await expect(client.null()).resolves.toBeUndefined();
		});
		it('should get time', async () => {
			const time = await client.getTime();
			const now = Math.floor(Date.now() / 1000);
			expect(time).toBeGreaterThan(now - 10);
			expect(time).toBeLessThanOrEqual(now + 10);
		});
		it('should successfully get address list via TCP', async () => {
			const entries = await client.getAddrList({prog: 100000, vers: 4});
			expect(entries.length).toBeGreaterThan(0);
			expect(entries.find((e) => e.netid === 'tcp')).toBeDefined();
		});
		it('should successfully dump mappings via TCP', async () => {
			const mappings = await client.dump();
			expect(mappings.length).toBeGreaterThan(0);
			expect(mappings.find((m) => m.prog === 100000 && m.vers === 4 && m.netid === 'tcp')).toBeDefined();
		});
		it('should register and unregister a service', async () => {
			const prog = 999999;
			const vers = 1;
			const maddr = '127.0.0.1.0.111';

			// Initially not there
			let entries = await client.getAddrList({prog, vers});
			expect(entries.length).toBe(0);

			// Register
			const setRes = await client.setProgram({prog, vers}, 'tcp', maddr, 'owner');
			expect(setRes).toBe(true);

			// Now it should be there
			entries = await client.getAddrList({prog, vers});
			expect(entries.length).toBe(1);
			expect(entries[0].maddr).toBe(maddr);
			expect(entries[0].netid).toBe('tcp');

			// Unregister
			const unsetRes = await client.unsetProgram({prog, vers}, 'tcp');
			expect(unsetRes).toBe(true);

			// Now it should be gone
			entries = await client.getAddrList({prog, vers});
			expect(entries.length).toBe(0);
		});
		it('should get address via TCP', async () => {
			const addr = await client.getAddr({prog: 100000, vers: 4, netid: 'tcp'});
			expect(addr).toBe(RpcUniversalAddress.from({host: '127.0.0.1', port: testPort}));
		});
	});

	describe('RpcUdpTransport', () => {
		const udpPort = 11113;
		const transport = new RpcNodeUdpTransport({port: udpPort});
		const client = new RpcBindClient(transport);
		let server: RpcBindServer;
		beforeAll(async () => {
			server = new RpcBindServer(udpPort);
			await server.bind();
		});
		afterAll(async () => {
			transport.close();
			await server.close();
		});
		it('should get time', async () => {
			const time = await client.getTime();
			const now = Math.floor(Date.now() / 1000);
			expect(time).toBeGreaterThan(now - 10);
			expect(time).toBeLessThanOrEqual(now + 10);
		});
		it('should handle error when calling invalid procedure via transport', async () => {
			const request = new RpcRequest(invalidProcedure);
			const response = await transport.call(request);
			if (response.ok) {
				throw new Error('Something is wrong, this should not happen');
			}
			expect(response.ok).toBe(false);
			expect(response.error).toEqual(new RpcProcUnavailError('Procedure Unavailable', response.reply));
		});
		it('should successfully call RPCBPROC_NULL via UDP', async () => {
			await expect(client.null()).resolves.toBeUndefined();
		});
		it('should successfully dump mappings via UDP', async () => {
			const mappings = await client.dump();
			expect(mappings.length).toBeGreaterThan(0);
			expect(mappings.find((m) => m.prog === 100000 && m.vers === 4 && m.netid === 'udp')).toBeDefined();
		});
		it('should successfully get address list via UDP', async () => {
			const entries = await client.getAddrList({prog: 100000, vers: 4});
			expect(entries.length).toBeGreaterThan(0);
			expect(entries.find((e) => e.netid === 'udp')).toBeDefined();
		});
		it('should register and unregister a service via UDP', async () => {
			const prog = 888888;
			const vers = 2;
			const maddr = '127.0.0.1.0.222';

			// Register
			const setRes = await client.setProgram({prog, vers}, 'udp', maddr, 'owner');
			expect(setRes).toBe(true);

			// Now it should be there
			const entries = await client.getAddrList({prog, vers});
			expect(entries.length).toBe(1);
			expect(entries[0].maddr).toBe(maddr);
			expect(entries[0].netid).toBe('udp');

			// Unregister
			const unsetRes = await client.unsetProgram({prog, vers}, 'udp');
			expect(unsetRes).toBe(true);

			// Now it should be gone
			const entriesAfter = await client.getAddrList({prog, vers});
			expect(entriesAfter.length).toBe(0);
		});
		it('should get address via UDP', async () => {
			const addr = await client.getAddr({prog: 100000, vers: 4, netid: 'udp'});
			expect(addr).toBe(RpcUniversalAddress.from({host: '127.0.0.1', port: udpPort}));
		});
	});

	describe('generic port testing', () => {
		it('should successfully bind and close both TCP and UDP listeners by default', async () => {
			const server = new RpcBindServer(testPort);
			await expect(server.bind()).resolves.toBeUndefined();
			const closed = await server.close();
			expect(closed).toBe(true);
		});

		it('should support TCP only', async () => {
			const server = new RpcBindServer(testPort + 3, {tcp: true, udp: false});
			await expect(server.bind()).resolves.toBeUndefined();
			const closed = await server.close();
			expect(closed).toBe(true);
		});

		it('should support UDP only', async () => {
			const server = new RpcBindServer(testPort + 4, {tcp: false, udp: true});
			await expect(server.bind()).resolves.toBeUndefined();
			const closed = await server.close();
			expect(closed).toBe(true);
		});

		it('should return true for close() even if not bound', async () => {
			const server = new RpcBindServer(testPort + 5);
			const closed = await server.close();
			expect(closed).toBe(true);
		});
	});
});
