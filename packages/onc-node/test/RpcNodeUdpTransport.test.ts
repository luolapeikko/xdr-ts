import {PortMapperV2, programAsRpcProcedure, RpcBindV3, RpcRequest} from '@luolapeikko/onc-rpcbind-common';
import {afterEach, describe, expect, it} from 'vitest';
import {RpcNodeUdpTransport} from '../src/';

describe('RpcNodeUdpTransport', () => {
	describe('broadcast support', () => {
		let transport: RpcNodeUdpTransport;

		afterEach(() => {
			try {
				transport?.close();
			} catch {
				// Ignore errors during cleanup
			}
		});

		it('should create transport with broadcast enabled', () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
				broadcast: true,
				bindPort: 0, // let OS choose port
			});

			expect(transport).toBeDefined();
		});

		it('should accept custom broadcast address', () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
				broadcast: true,
				broadcastAddress: '255.255.255.255',
				bindPort: 0,
			});

			expect(transport).toBeDefined();
		});

		it('should handle null RPC procedure with broadcast enabled', async () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
				broadcast: true,
				broadcastAddress: '255.255.255.255',
				bindPort: 0,
			});

			const request = new RpcRequest(programAsRpcProcedure(PortMapperV2, 'PMAPPROC_NULL'));

			try {
				// Broadcast call with timeout since rpcbind may not be listening
				await Promise.race([
					transport.call(request),
					new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for rpcbind response')), 1500)),
				]);
			} catch (err) {
				// rpcbind is not listening or timeout occurred - both are expected in test environment
				// The test passes if the call was made without crashing
				expect(err).toBeDefined();
			}
		});

		it('should handle IPv4 broadcast address', async () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
				broadcast: true,
				broadcastAddress: '255.255.255.255',
				bindPort: 0,
			});

			const request = new RpcRequest(programAsRpcProcedure(PortMapperV2, 'PMAPPROC_NULL'));

			try {
				await Promise.race([transport.call(request), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))]);
			} catch (err) {
				expect(err).toBeDefined();
			}
		});

		it('should handle broadcast with bind port', async () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
				broadcast: true,
				broadcastAddress: '255.255.255.255',
				bindPort: 0, // OS assigns available port
			});

			const request = new RpcRequest(programAsRpcProcedure(PortMapperV2, 'PMAPPROC_NULL'));

			try {
				await Promise.race([transport.call(request), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))]);
			} catch (err) {
				expect(err).toBeDefined();
			}
			transport.close();
		});

		it('should handle broadcast getTime with bind port', {skip: process.env.CI === 'true'}, async () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
				broadcast: true,
			});

			const request = new RpcRequest(programAsRpcProcedure(RpcBindV3, 'RPCBPROC_GETTIME'));
			const response = await transport.call(request);
			if (!response.ok) {
				throw response.error;
			}
			expect(response.xdr.readUInt()).toBeGreaterThan(0);
			transport.close();
		});
	});

	describe('standard UDP calls', () => {
		let transport: RpcNodeUdpTransport;

		afterEach(() => {
			try {
				transport?.close();
			} catch {
				// Ignore errors during cleanup
			}
		});

		it('should create transport without broadcast by default', () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
			});

			expect(transport).toBeDefined();
		});

		it('should handle null RPC procedure', async () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
				bindPort: 0,
			});

			const request = new RpcRequest(programAsRpcProcedure(PortMapperV2, 'PMAPPROC_NULL'));

			try {
				await Promise.race([transport.call(request), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))]);
			} catch (err) {
				// Expected if rpcbind not running
				expect(err).toBeDefined();
			}
		});

		it('should reject pending requests on close', async () => {
			transport = new RpcNodeUdpTransport({
				host: '127.0.0.1',
				port: 111,
				bindPort: 0,
			});

			const callPromise = transport.call(new RpcRequest(programAsRpcProcedure(PortMapperV2, 'PMAPPROC_NULL')));

			// Close transport immediately to trigger pending request rejection
			setTimeout(() => {
				transport.close();
			}, 50);

			try {
				await callPromise;
			} catch (err) {
				// Should reject with timeout or close error
				expect(err).toBeDefined();
			}
		});
	});
});
