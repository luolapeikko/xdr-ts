import {RpcBindClient} from '@luolapeikko/onc-rpcbind-client';
import {type RpcProcedure, RpcProcUnavailError, RpcRequest} from '@luolapeikko/onc-rpcbind-common';
import {describe, expect, it} from 'vitest';
import {CallbackTransportServer} from './lib/CallbackServer';

const invalidProcedure = {prog: 100000, vers: 3, proc: 999} satisfies RpcProcedure;

describe('RpcProcedures', () => {
	describe('CallbackTransportServer', () => {
		const transport = new CallbackTransportServer();
		const client = new RpcBindClient(transport);
		it('should handle error when calling invalid procedure via transport', async () => {
			const request = new RpcRequest(invalidProcedure);
			const response = await transport.call(request);
			if (response.ok) {
				throw new Error('Something is wrong, this should not happen');
			}
			expect(response.ok).toBe(false);
			expect(response.error).toEqual(new RpcProcUnavailError('Procedure Unavailable', response.reply));
		});
		it('should successfully call RPCBPROC_NULL', async () => {
			await expect(client.null()).resolves.toBeUndefined();
		});
		it('should get time', async () => {
			const time = await client.getTime();
			const now = Math.floor(Date.now() / 1000);
			expect(time).toBeGreaterThan(now - 10);
			expect(time).toBeLessThanOrEqual(now + 10);
		});
		it('should return an empty address list for an unregistered service', async () => {
			const entries = await client.getAddrList({prog: 700001, vers: 1});
			expect(entries).toEqual([]);
		});
		it('should register a service with setProgram', async () => {
			const prog = 700002;
			const vers = 1;
			const maddr = '127.0.0.1.1.2';

			await expect(client.setProgram({prog, vers}, 'tcp', maddr, 'owner')).resolves.toBe(true);

			await expect(client.unsetProgram({prog, vers}, 'tcp')).resolves.toBe(true);
		});
		it('should include a registered service in address list', async () => {
			const prog = 700002;
			const vers = 1;
			const maddr = '127.0.0.1.1.2';

			await expect(client.setProgram({prog, vers}, 'tcp', maddr, 'owner')).resolves.toBe(true);

			const entries = await client.getAddrList({prog, vers});
			expect(entries).toHaveLength(1);
			expect(entries[0]).toMatchObject({maddr, netid: 'tcp', proto: 'tcp'});

			await expect(client.unsetProgram({prog, vers}, 'tcp')).resolves.toBe(true);
		});
		it('should include a registered service in dump results', async () => {
			const prog = 700002;
			const vers = 1;
			const maddr = '127.0.0.1.1.2';

			await expect(client.setProgram({prog, vers}, 'tcp', maddr, 'owner')).resolves.toBe(true);

			const mappings = await client.dump();
			expect(mappings.find((mapping) => mapping.prog === prog && mapping.vers === vers && mapping.netid === 'tcp')).toMatchObject({
				prog,
				vers,
				netid: 'tcp',
				addr: maddr,
				owner: 'owner',
			});

			await expect(client.unsetProgram({prog, vers}, 'tcp')).resolves.toBe(true);
		});
		it('should get a registered address', async () => {
			const prog = 700004;
			const vers = 1;
			const maddr = '127.0.0.1.4.5';

			await expect(client.setProgram({prog, vers}, 'tcp', maddr, 'owner')).resolves.toBe(true);

			const addr = await client.getAddr({prog, vers, netid: 'tcp'});
			expect(addr).toBe(maddr);

			await expect(client.unsetProgram({prog, vers}, 'tcp')).resolves.toBe(true);
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
		it('should get an empty address for an unregistered service', async () => {
			const addr = await client.getAddr({prog: 700003, vers: 1, netid: 'tcp'});
			expect(addr).toBe('');
		});
	});
});
