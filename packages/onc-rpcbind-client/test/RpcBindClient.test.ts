import {RpcNodeTcpTransport, RpcNodeUdpTransport} from '@luolapeikko/onc-node';
import {type RpcCallType, type RpcNetId, RpcProcUnavailError, type RpcProgram, type RpcRemoteCallCoder, RpcRequest} from '@luolapeikko/onc-rpcbind-common';
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

const nonExistentCall: RpcRemoteCallCoder = {
	proc: 0,
	vers: 1,
	prog: 999111,
};

const forwardingFailurePattern = /Program Unavailable|UDP Timeout|TCP Timeout/;

/**
 * Run rpcbind with the following flags (the -r flag is required to enable callit/broadcast forwarding):
 * # rpcbind -i -d -w -f -r -l 2>&1 | tee -a /tmp/rpcbind.log
 *
 * Without -r, rpcbind silently drops the forwarded inner call and the client times out.
 */

describe('Rpc Abstraction (Transport Based)', () => {
	const tinyService = new TinyService({
		procedure: {proc: tinyServiceCall.proc, vers: tinyServiceCall.vers, prog: tinyServiceCall.prog},
	});

	beforeAll(async () => {
		await tinyService.start();
	});

	describe('RpcUdpTransport', () => {
		const transport = new RpcNodeUdpTransport();
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
			await expect(rpcbind.getTime(), `Transport UDP GETTIME`).resolves.toBeGreaterThan(0);
		});
		it('should successfully call GETSTAT using RpcUdpTransport', async () => {
			const stats = await rpcbind.getStats();
			expect(stats.length, `Transport UDP Stats Count: ${stats.length}`).toBe(3); // rpcb_stat_byvers[3]
			expect(stats[0].info.length, `First Stat setinfo: ${stats[0].setinfo}`).toBe(13); // RPCBSTAT_HIGHPROC
		});
		it('should successfully call GETADDR (UDP) for rpcbind', async () => {
			const addr = await rpcbind.getAddr({prog: 100000, vers: 4, netid: 'udp'});
			expect(addr, `RpcBind UDP Address: ${addr}`).toBeDefined();
			expect(addr.length, `RpcBind UDP Address length: ${addr.length}`).toBeGreaterThan(0);
		});
		it('should return address for GETVERSADDR with exact version match (UDP)', async () => {
			const addr = await rpcbind.getVersAddr({prog: 100000, vers: 4, netid: 'udp'});
			expect(addr, `RpcBind GETVERSADDR UDP Address: ${addr}`).toBeDefined();
			expect(addr.length, `RpcBind GETVERSADDR UDP Address length: ${addr.length}`).toBeGreaterThan(0);
		});
		it('should return empty string for GETVERSADDR with non-existent version (UDP)', async () => {
			await expect(rpcbind.getVersAddr({prog: 100000, vers: 99, netid: 'udp'})).resolves.toBe('');
		});
		it('should successfully call GETADDRLIST (UDP) for rpcbind', async () => {
			const entries = await rpcbind.getAddrList({prog: 100000, vers: 4});
			expect(entries.length, `RpcBind UDP AddrList Count: ${entries.length}`).toBeGreaterThan(0);
			expect(entries[0]?.maddr, `First Entry MAddr: ${entries[0]?.maddr}`).toBeDefined();
		});
		it('should call SET (UDP)', async () => {
			await expect(rpcbind.setProgram({prog: 999999, vers: 1}, 'udp', '127.0.0.1.0.0', 'owner')).resolves.toBe(true);
		});
		it('should call UNSET (UDP)', async () => {
			await expect(rpcbind.unsetProgram({prog: 999999, vers: 1}, 'udp')).resolves.toBe(true);
		});
		it('should forward CALLIT to TinyService and return its response over UDP', async () => {
			tinyService.clearEvents();
			const result = await rpcbind.callIt(tinyServiceCall, undefined);
			expect(result.addr).toBeTruthy();
			expect(result.results).toBeGreaterThan(0);
			expect(
				tinyService.getEvents().some((e) => e.includes('request success')),
				`[TinyServiceTest] CALLIT UDP events ${JSON.stringify(tinyService.getEvents())}`,
			).toBe(true);
		});

		it('should forward INDIRECT to TinyService and return its response over UDP', async () => {
			tinyService.clearEvents();
			const result = await rpcbind.indirectCall(tinyServiceCall, undefined);
			expect(result.addr).toBeTruthy();
			expect(result.results).toBeGreaterThan(0);
			expect(
				tinyService.getEvents().some((e) => e.includes('request success')),
				`[TinyServiceTest] INDIRECT UDP events ${JSON.stringify(tinyService.getEvents())}`,
			).toBe(true);
		});
		afterAll(() => {
			transport.close();
		});
	});

	describe('RpcUdpTransport Error Handling', () => {
		const transport = new RpcNodeUdpTransport();
		const rpcbind = new RpcBindClient(transport);
		it('should fail with PROC_UNAVAIL for INDIRECT to non-existent program', async () => {
			await expect(rpcbind.indirectCall(nonExistentCall, undefined)).rejects.toThrow(forwardingFailurePattern);
		}, 10000);

		it('should fail for CALLIT to non-existent program', async () => {
			await expect(rpcbind.callIt(nonExistentCall, undefined)).rejects.toThrow(forwardingFailurePattern);
		}, 10000);

		it('should handle error when calling invalid procedure via transport', async () => {
			const request = new RpcRequest({
				prog: 100000,
				vers: 3,
				proc: 999, // Invalid procedure
			});
			const response = await transport.call(request);
			expect(response.ok).toBe(false);
			if (response.ok) {
				throw new Error('Expected invalid procedure call to fail');
			}
			expect(response.error).toEqual(new RpcProcUnavailError('Procedure Unavailable', response.reply));
			expect(response.reply.acceptStat).not.toBe(0);
		});

		it('should return empty address for GETVERSADDR with non-existent version', async () => {
			await expect(rpcbind.getVersAddr({prog: 100000, vers: 99, netid: 'udp'})).resolves.toBe('');
		});
	});

	describe('RpcTcpTransport', () => {
		const transport = new RpcNodeTcpTransport();
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
			expect(timestamp, `Transport TCP Time: ${new Date(timestamp * 1000).toLocaleString()}`).toBeGreaterThan(0);
		});
		it('should successfully call GETSTAT using RpcNodeUdpTransport', async () => {
			const stats = await rpcbind.getStats();
			expect(stats.length, `Transport UDP Stats Count: ${stats.length}`).toBe(3); // rpcb_stat_byvers[3]
			expect(stats[0].info.length, `First Stat setinfo: ${stats[0].setinfo}`).toBe(13); // RPCBSTAT_HIGHPROC
		});
		it('should successfully call GETADDR (TCP) for rpcbind', async () => {
			const addr = await rpcbind.getAddr({prog: 100000, vers: 4, netid: 'tcp'});
			expect(addr, `RpcBind TCP Address: ${addr}`).toBeDefined();
			expect(addr.length, `RpcBind TCP Address length: ${addr.length}`).toBeGreaterThan(0);
		});
		it('should successfully call GETADDRLIST (TCP) for rpcbind', async () => {
			const entries = await rpcbind.getAddrList({prog: 100000, vers: 4});
			expect(entries.length, `RpcBind TCP AddrList Count: ${entries.length}`).toBeGreaterThan(0);
			expect(entries[0]?.maddr, `First Entry MAddr: ${entries[0]?.maddr}`).toBeDefined();
			expect(entries, `RpcBind TCP AddrList entries: ${JSON.stringify(entries)}`).toBeDefined();
		});

		afterAll(() => {
			transport.close();
		});
	});

	describe('SET / UNSET - System RpcBind Exploration', () => {
		const transport = new RpcNodeUdpTransport();
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
			const unsetRes = await rpcbind.unsetProgram(testProgram, 'udp');
			expect(typeof setRes, `SET result: ${setRes}`).toBe('boolean');
			expect(typeof unsetRes, `UNSET result: ${unsetRes}`).toBe('boolean');
		});

		it('should attempt unset with empty netid (bulk unset)', async () => {
			// Register first
			await rpcbind.setProgram(testProgram, 'udp', '127.0.0.1.0.111', 'owner');
			await rpcbind.setProgram(testProgram, 'tcp', '127.0.0.1.0.111', 'owner');
			const unsetRes = await rpcbind.unsetProgram(testProgram, '' as RpcNetId);
			expect(unsetRes, `Bulk UNSET result: ${unsetRes}`).toBe(true);
		});

		it('should attempt unset for non-existent program', async () => {
			const unsetRes = await rpcbind.unsetProgram({prog: 888888, vers: 1}, 'udp');
			expect(unsetRes, `UNSET non-existent result: ${unsetRes}`).toBe(true);
		});

		it('should attempt set with invalid maddr format', async () => {
			const setRes = await rpcbind.setProgram(testProgram, 'udp', 'invalid-address', 'owner');
			expect(typeof setRes, `SET invalid maddr result: ${setRes}`).toBe('boolean');
		});

		it('should attempt set with empty owner', async () => {
			const setRes = await rpcbind.setProgram(testProgram, 'udp', '127.0.0.1.0.111', '');
			expect(setRes, 'SET empty owner result').toBe(false);
			// Cleanup
			await rpcbind.unsetProgram(testProgram, 'udp');
		});

		it('should show real rpcbind behavior for SET with ws netid (accepted)', async () => {
			const setRes = await rpcbind.setProgram(testProgram, 'ws', '127.0.0.1.0.111', 'owner');
			expect(setRes, 'SET ws netid result').toBe(true);
			await expect(rpcbind.unsetProgram(testProgram, 'ws')).resolves.toBe(true);
		});

		it('should show real rpcbind behavior for SET with ws6 netid (accepted)', async () => {
			const setRes = await rpcbind.setProgram(testProgram, 'ws6', '127.0.0.1.0.111', 'owner');
			expect(setRes, 'SET ws6 netid result').toBe(true);
			await expect(rpcbind.unsetProgram(testProgram, 'ws6')).resolves.toBe(true);
		});
	});

	describe('RpcTcpTransport Error Handling', () => {
		const transport = new RpcNodeTcpTransport();
		const rpcbind = new RpcBindClient(transport);
		it('should fail with PROC_UNAVAIL for INDIRECT to non-existent program', async () => {
			await expect(rpcbind.indirectCall(nonExistentCall, undefined)).rejects.toThrow(forwardingFailurePattern);
		}, 10000);

		it('should fail for CALLIT to non-existent program', async () => {
			await expect(rpcbind.callIt(nonExistentCall, undefined)).rejects.toThrow(forwardingFailurePattern);
		}, 10000);

		it('should handle error when calling invalid procedure via transport', async () => {
			const request = new RpcRequest({
				prog: 100000,
				vers: 3,
				proc: 999, // Invalid procedure
			});
			const response = await transport.call(request);
			expect(response.ok).toBe(false);
			if (response.ok) {
				throw new Error('Expected invalid procedure call to fail');
			}
			expect(response.error).toEqual(new RpcProcUnavailError('Procedure Unavailable', response.reply));
			expect(response.reply.acceptStat).not.toBe(0);
		});

		it('should return empty address for GETVERSADDR with non-existent version', async () => {
			await expect(rpcbind.getVersAddr({prog: 100000, vers: 99, netid: 'tcp'})).resolves.toBe('');
		});
		afterAll(() => {
			transport.close();
		});
	});
});
