import {describe, expect, it} from 'vitest';
import {RpcUniversalAddress} from '../src/';

describe('RpcUniversalAddress', function () {
	describe('RpcUniversalAddress.from', function () {
		it('should convert host and port to universal address format', function () {
			expect(RpcUniversalAddress.from({host: '127.0.0.1', port: 111})).toBe('127.0.0.1.0.111');
			expect(RpcUniversalAddress.from({host: '10.1.2.3', port: 2049})).toBe('10.1.2.3.8.1');
		});

		it('should convert boundary ports correctly', function () {
			expect(RpcUniversalAddress.from({host: 'localhost', port: 0})).toBe('localhost.0.0');
			expect(RpcUniversalAddress.from({host: 'localhost', port: 65535})).toBe('localhost.255.255');
		});
	});
	describe('RpcUniversalAddress.to', function () {
		it('should parse universal address into host and port', function () {
			expect(RpcUniversalAddress.to('127.0.0.1.0.111')).toEqual({host: '127.0.0.1', port: 111});
			expect(RpcUniversalAddress.to('10.1.2.3.8.1')).toEqual({host: '10.1.2.3', port: 2049});
		});

		it('should parse boundary ports correctly', function () {
			expect(RpcUniversalAddress.to('localhost.0.0')).toEqual({host: 'localhost', port: 0});
			expect(RpcUniversalAddress.to('localhost.255.255')).toEqual({host: 'localhost', port: 65535});
		});

		it('should throw for invalid universal address format', function () {
			expect(() => RpcUniversalAddress.to('invalid')).toThrow('Invalid universal address: invalid');
			expect(() => RpcUniversalAddress.to('127.0.0.1.1.a')).toThrow('Invalid universal address: 127.0.0.1.1.a');
		});

		it('should round trip from host and port to universal address and back', function () {
			const input = {host: '192.168.1.5', port: 12345};
			const universalAddress = RpcUniversalAddress.from(input);
			expect(RpcUniversalAddress.to(universalAddress)).toEqual(input);
		});
	});
});
