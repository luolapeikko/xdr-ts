import {NodeRpcRegister, RpcNodeUdpTransport} from '@luolapeikko/onc-node';
import {RpcBindClient} from '@luolapeikko/onc-rpcbind-client';
import {SocketAddrV4, SocketAddrV6} from 'net-socket-address';
import {SocketAddrUnix} from 'unix-socket-address';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {RpcBindServer} from '../src/RpcBindServer';
import {getTestSocketFile} from './lib/localTestSocket';

describe('NodeRpcRegister', () => {
	const rpcPort = 11115;
	const rpcSocketPath = getTestSocketFile();
	const servicePort = 100000;
	const program = {prog: 19999, vers: 1};
	const localServicePath = '/tmp/some-service.socket';
	const transport = new RpcNodeUdpTransport({port: rpcPort});
	const client = new RpcBindClient(transport);
	let server: RpcBindServer;
	beforeAll(async () => {
		server = new RpcBindServer(rpcPort, {socketPath: rpcSocketPath});
		await server.bind();
	});

	it('registers and unregisters all configured netid mappings', async () => {
		const register = new NodeRpcRegister({
			socketPath: rpcSocketPath,
			endpoints: [
				{netid: 'tcp', addr: new SocketAddrV4({port: servicePort})},
				{netid: 'udp', addr: new SocketAddrV4({port: servicePort})},
				{netid: 'tcp6', addr: new SocketAddrV6({port: servicePort})},
				{netid: 'udp6', addr: new SocketAddrV6({port: servicePort})},
				{netid: 'local', addr: new SocketAddrUnix(localServicePath)},
			],
			prog: program,
			owner: 'test-service',
		});
		await register.init();

		await expect(client.getAddr({netid: 'tcp', ...program})).resolves.toBe('0.0.0.0.390.160');
		await expect(client.getAddr({netid: 'udp', ...program})).resolves.toBe('0.0.0.0.390.160');
		await expect(client.getAddr({netid: 'tcp6', ...program})).resolves.toBe('::.390.160');
		await expect(client.getAddr({netid: 'udp6', ...program})).resolves.toBe('::.390.160');
		await expect(client.getAddr({netid: 'local', ...program})).resolves.toBe(localServicePath);

		await register.close();

		await expect(client.getAddr({netid: 'tcp', ...program})).resolves.toBe('');
		await expect(client.getAddr({netid: 'udp', ...program})).resolves.toBe('');
		await expect(client.getAddr({netid: 'tcp6', ...program})).resolves.toBe('');
		await expect(client.getAddr({netid: 'udp6', ...program})).resolves.toBe('');
		await expect(client.getAddr({netid: 'local', ...program})).resolves.toBe('');
	});
	afterAll(async () => {
		transport.close();
		await server.close();
	});
});
