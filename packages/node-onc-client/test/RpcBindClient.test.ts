import {RpcCall, type RpcCallType, type RpcNetId} from '@luolapeikko/node-onc-common';
import {type RpcProcedure, type RpcProgram, RpcRequest, RpcTcpTransport, RpcUdpTransport, XdrType} from '@luolapeikko/xdr-ts';
import {afterAll, describe, expect, it} from 'vitest';
import {RpcBindClient} from '../src';

const rstatdDiskProcedure = {prog: 100001, vers: 1, proc: 2} as const satisfies RpcProcedure;
const rstatdDiskResponse = XdrType.UInt<number>();

const rstatdDiskCall = {
	procedure: rstatdDiskProcedure,
	decoder: rstatdDiskResponse.decode,
} as const satisfies RpcCallType<void, number>;

/**
 * Run docker rpcbind with the following flags:
 * # rpcbind -i -d -w -f
 */

describe('Rpc Abstraction (Transport Based)', () => {
	const host = '127.0.0.1';
	const port = 1111;
	describe('RpcUdpTransport', () => {
		const transport = new RpcUdpTransport(host, port);
		const rpcbind = new RpcBindClient(transport);
		it('should successfully execute RPCBPROC_NULL (UDP)', async () => {
			await expect(rpcbind.null()).resolves.toBeUndefined();
		});
		it('should successfully convert uaddr to taddr and back (UDP)', async () => {
			const uaddr = `127.0.0.1.0.111`;
			const taddr = await rpcbind.uaddr2taddr(uaddr);
			expect(taddr.buf.length).toBeGreaterThan(0);
			const back = await rpcbind.taddr2uaddr(taddr);
			expect(back).toBe(uaddr);
		});
		it('should successfully call RPCBPROC_DUMP (UDP)', async () => {
			const mappings = await rpcbind.dump();
			expect(mappings.length).toBeGreaterThan(0);
		});
		it('should successfully call GETTIME using RpcUdpTransport', async () => {
			const timestamp = await rpcbind.getTime();
			console.log('Transport UDP Time:', new Date(timestamp * 1000).toLocaleString());
			expect(timestamp).toBeGreaterThan(0);
		});
		it('should successfully call GETSTAT using RpcUdpTransport', async () => {
			const stats = await rpcbind.getStats();
			console.log('Transport UDP Stats Count:', stats.length);
			expect(stats.length).toBe(3); // rpcb_stat_byvers[3]
			expect(stats[0].info.length).toBe(13); // RPCBSTAT_HIGHPROC
			console.log('First Stat setinfo:', stats[0].setinfo);
		});
		it('should successfully call GETADDR (UDP) for rpcbind', async () => {
			const addr = await rpcbind.getAddr({prog: 100000, vers: 4, netid: 'udp'});
			console.log('RpcBind UDP Address:', addr);
			expect(addr).toBeDefined();
			expect(addr.length).toBeGreaterThan(0);
		});
		it('should successfully call GETADDRLIST (UDP) for rpcbind', async () => {
			const entries = await rpcbind.getAddrList({prog: 100000, vers: 4});
			console.log('RpcBind UDP AddrList Count:', entries.length);
			expect(entries.length).toBeGreaterThan(0);
			console.log('First Entry MAddr:', entries[0].maddr);
		});
		it('should call SET (UDP)', async () => {
			const success = await rpcbind.setProgram({prog: 999999, vers: 1}, 'udp', '127.0.0.1.0.0', 'owner');
			console.log('SET (UDP) Result:', success);
			expect(typeof success).toBe('boolean');
		});
		it('should call UNSET (UDP)', async () => {
			const success = await rpcbind.unsetProgram({prog: 999999, vers: 1}, 'udp');
			console.log('UNSET (UDP) Result:', success);
			expect(typeof success).toBe('boolean');
		});
		it('should successfully execute RPCBPROC_CALLIT (UDP) for GETTIME', async () => {
			const dump = await rpcbind.dump();
			console.log('Registered services:', dump);

			// CALLIT is often used for broadcast, might have specific behavior/timeouts
			const result = await rpcbind.callIt(rstatdDiskCall, undefined);
			console.log('CALLIT Result Addr:', result.addr);
			console.log('CALLIT Result Time:', result.results);
			expect(result.addr).toBeDefined();
			expect(result.results).toBeGreaterThan(0);
		}, 10000);

		it('should successfully execute RPCBPROC_INDIRECT (UDP) for GETTIME', async () => {
			// INDIRECT is a non-quiet version of CALLIT in RPCB v4
			const result = await rpcbind.indirectCall(rstatdDiskCall, undefined);
			console.log('INDIRECT Result Addr:', result.addr);
			console.log('CALLIT Result Time:', result.results);
			expect(result.addr).toBeDefined();
			expect(result.results).toBeGreaterThan(0);
		}, 10000);
		afterAll(() => {
			transport.close();
		});
	});

	describe('RpcTcpTransport', () => {
		const transport = new RpcTcpTransport(host, port);
		const rpcbind = new RpcBindClient(transport);
		it('should successfully execute RPCBPROC_NULL (TCP)', async () => {
			await expect(rpcbind.null()).resolves.toBeUndefined();
		});
		it('should successfully convert uaddr to taddr and back (TCP)', async () => {
			const uaddr = `127.0.0.1.0.111`;
			const taddr = await rpcbind.uaddr2taddr(uaddr);
			expect(taddr.buf.length).toBeGreaterThan(0);
			const back = await rpcbind.taddr2uaddr(taddr);
			expect(back).toBe(uaddr);
		});
		it('should successfully call RPCBPROC_DUMP (TCP)', async () => {
			const mappings = await rpcbind.dump();
			expect(mappings.length).toBeGreaterThan(0);
			const rpcbindMapping = mappings.find((m) => m.prog === 100000 && m.vers === 4 && m.netid === 'tcp');
			expect(rpcbindMapping).toBeDefined();
		});
		it('should successfully call GETTIME using RpcTcpTransport', async () => {
			const timestamp = await rpcbind.getTime();
			console.log('Transport TCP Time:', new Date(timestamp * 1000).toLocaleString());
			expect(timestamp).toBeGreaterThan(0);
		});
		it('should successfully call GETSTAT using RpcUdpTransport', async () => {
			const stats = await rpcbind.getStats();
			console.log('Transport UDP Stats Count:', stats.length);
			expect(stats.length).toBe(3); // rpcb_stat_byvers[3]
			expect(stats[0].info.length).toBe(13); // RPCBSTAT_HIGHPROC
			console.log('First Stat setinfo:', stats[0].setinfo);
		});
		it('should successfully call GETADDR (TCP) for rpcbind', async () => {
			const addr = await rpcbind.getAddr({prog: 100000, vers: 4, netid: 'tcp'});
			console.log('RpcBind TCP Address:', addr);
			expect(addr).toBeDefined();
			expect(addr.length).toBeGreaterThan(0);
		});
		it('should successfully call GETADDRLIST (TCP) for rpcbind', async () => {
			const entries = await rpcbind.getAddrList({prog: 100000, vers: 4});
			console.log('RpcBind TCP AddrList Count:', entries.length);
			expect(entries.length).toBeGreaterThan(0);
			console.log('First Entry MAddr:', entries[0].maddr);
			console.log(entries);
		});

		it('should fail with PROC_UNAVAIL for INDIRECT to non-existent program', async () => {
			const nonExistentCall: RpcCallType<void, void> = {
				procedure: {prog: 999111, vers: 1, proc: 0},
				decoder: () => {
					/* no-op */
				},
			};
			await expect(rpcbind.indirectCall(nonExistentCall, undefined)).rejects.toThrow();
		});

		afterAll(() => {
			transport.close();
		});
	});

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

	describe('SET / UNSET - System RpcBind Exploration', () => {
		const transport = new RpcUdpTransport(host, port);
		const rpcbind = new RpcBindClient(transport);
		const testProgram: RpcProgram = {
			prog: 999999,
			vers: 1,
		};

		afterAll(() => {
			transport.close();
		});

		it('should attempt a valid set/unset cycle', async () => {
			const setRes = await rpcbind.setProgram(testProgram, 'udp', '127.0.0.1.0.111', 'owner');
			console.log('SET result:', setRes);
			const unsetRes = await rpcbind.unsetProgram(testProgram, 'udp');
			console.log('UNSET result:', unsetRes);
			expect(typeof setRes).toBe('boolean');
			expect(typeof unsetRes).toBe('boolean');
		});

		it('should attempt unset with empty netid (bulk unset)', async () => {
			// Register first
			await rpcbind.setProgram(testProgram, 'udp', '127.0.0.1.0.111', 'owner');
			await rpcbind.setProgram(testProgram, 'tcp', '127.0.0.1.0.111', 'owner');
			const unsetRes = await rpcbind.unsetProgram(testProgram, '' as RpcNetId);
			console.log('Bulk UNSET result:', unsetRes);
			expect(unsetRes).toBe(true);
		});

		it('should attempt unset for non-existent program', async () => {
			const unsetRes = await rpcbind.unsetProgram({prog: 888888, vers: 1}, 'udp');
			console.log('UNSET non-existent result:', unsetRes);
			expect(unsetRes).toBe(true);
		});

		it('should attempt set with invalid maddr format', async () => {
			const setRes = await rpcbind.setProgram(testProgram, 'udp', 'invalid-address', 'owner');
			console.log('SET invalid maddr result:', setRes);
			expect(typeof setRes).toBe('boolean');
		});

		it('should attempt set with empty owner', async () => {
			const setRes = await rpcbind.setProgram(testProgram, 'udp', '127.0.0.1.0.111', '');
			console.log('SET empty owner result:', setRes);
			expect(setRes).toBe(false);
			// Cleanup
			await rpcbind.unsetProgram(testProgram, 'udp');
		});
	});
});
