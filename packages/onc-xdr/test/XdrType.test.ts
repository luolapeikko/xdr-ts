import {XdrBuffer} from '@luolapeikko/onc-node';
import {beforeEach, describe, expect, it} from 'vitest';
import {XdrType} from '../src/';

describe('XdrType Primitive Codecs', () => {
	let xdr: XdrBuffer;

	beforeEach(() => {
		xdr = new XdrBuffer(1024);
	});

	describe('UInt Codec', () => {
		it('should encode and decode positive uint', () => {
			const codec = XdrType.UInt();
			codec.encode(xdr, 12345);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(12345);
		});

		it('should encode and decode zero', () => {
			const codec = XdrType.UInt();
			codec.encode(xdr, 0);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(0);
		});

		it('should encode and decode maximum uint32', () => {
			const codec = XdrType.UInt();
			const maxUInt = 4294967295;
			codec.encode(xdr, maxUInt);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(maxUInt);
		});

		it('should have primitive type', () => {
			const codec = XdrType.UInt();
			expect(codec.type).toBe('primitive');
		});

		it('should work with type parameter', () => {
			const codec = XdrType.UInt<number>();
			codec.encode(xdr, 42);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(42);
		});
	});

	describe('Int Codec', () => {
		it('should encode and decode positive int', () => {
			const codec = XdrType.Int();
			codec.encode(xdr, 12345);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(12345);
		});

		it('should encode and decode negative int', () => {
			const codec = XdrType.Int();
			codec.encode(xdr, -12345);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(-12345);
		});

		it('should encode and decode zero', () => {
			const codec = XdrType.Int();
			codec.encode(xdr, 0);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(0);
		});

		it('should encode and decode maximum int32', () => {
			const codec = XdrType.Int();
			const maxInt = 2147483647;
			codec.encode(xdr, maxInt);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(maxInt);
		});

		it('should encode and decode minimum int32', () => {
			const codec = XdrType.Int();
			const minInt = -2147483648;
			codec.encode(xdr, minInt);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(minInt);
		});

		it('should have primitive type', () => {
			const codec = XdrType.Int();
			expect(codec.type).toBe('primitive');
		});
	});

	describe('Short Codec', () => {
		it('should encode and decode positive short', () => {
			const codec = XdrType.Short();
			codec.encode(xdr, 1234);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(1234);
		});

		it('should encode and decode negative short', () => {
			const codec = XdrType.Short();
			codec.encode(xdr, -1234);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(-1234);
		});

		it('should encode and decode maximum int16', () => {
			const codec = XdrType.Short();
			const maxShort = 32767;
			codec.encode(xdr, maxShort);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(maxShort);
		});

		it('should encode and decode minimum int16', () => {
			const codec = XdrType.Short();
			const minShort = -32768;
			codec.encode(xdr, minShort);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(minShort);
		});

		it('should have primitive type', () => {
			const codec = XdrType.Short();
			expect(codec.type).toBe('primitive');
		});
	});

	describe('UShort Codec', () => {
		it('should encode and decode unsigned short', () => {
			const codec = XdrType.UShort();
			codec.encode(xdr, 1234);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(1234);
		});

		it('should encode and decode zero', () => {
			const codec = XdrType.UShort();
			codec.encode(xdr, 0);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(0);
		});

		it('should encode and decode maximum uint16', () => {
			const codec = XdrType.UShort();
			const maxUShort = 65535;
			codec.encode(xdr, maxUShort);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(maxUShort);
		});

		it('should have primitive type', () => {
			const codec = XdrType.UShort();
			expect(codec.type).toBe('primitive');
		});
	});

	describe('Double Codec (BigInt64)', () => {
		it('should encode and decode positive bigint', () => {
			const codec = XdrType.Double();
			const value = BigInt('9223372036854775806');
			codec.encode(xdr, value);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(value);
		});

		it('should encode and decode negative bigint', () => {
			const codec = XdrType.Double();
			const value = BigInt('-9223372036854775807');
			codec.encode(xdr, value);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(value);
		});

		it('should encode and decode zero', () => {
			const codec = XdrType.Double();
			codec.encode(xdr, BigInt(0));
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(BigInt(0));
		});

		it('should have primitive type', () => {
			const codec = XdrType.Double();
			expect(codec.type).toBe('primitive');
		});

		it('should work with type parameter', () => {
			const codec = XdrType.Double<bigint>();
			const value = BigInt(1000000);
			codec.encode(xdr, value);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(value);
		});
	});

	describe('Float Codec (32-bit IEEE 754)', () => {
		it('should encode and decode positive float', () => {
			const codec = XdrType.Float();
			codec.encode(xdr, 3.14);
			xdr.rewind();
			const decoded = codec.decode(xdr);
			expect(Math.abs(decoded - 3.14) < 0.01).toBe(true);
		});

		it('should encode and decode negative float', () => {
			const codec = XdrType.Float();
			codec.encode(xdr, -2.5);
			xdr.rewind();
			const decoded = codec.decode(xdr);
			expect(Math.abs(decoded - -2.5) < 0.01).toBe(true);
		});

		it('should encode and decode zero', () => {
			const codec = XdrType.Float();
			codec.encode(xdr, 0);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(0);
		});

		it('should have primitive type', () => {
			const codec = XdrType.Float();
			expect(codec.type).toBe('primitive');
		});

		it('should work with type parameter', () => {
			const codec = XdrType.Float<number>();
			codec.encode(xdr, 1.5);
			xdr.rewind();
			expect(codec.decode(xdr)).toBeCloseTo(1.5, 2);
		});
	});

	describe('Opaque Codec (Binary Data)', () => {
		it('should encode and decode binary buffer', () => {
			const codec = XdrType.Opaque();
			const data = Buffer.from([1, 2, 3, 4, 5]);
			codec.encode(xdr, data);
			xdr.rewind();
			expect(codec.decode(xdr)).toEqual(data);
		});

		it('should encode and decode empty buffer', () => {
			const codec = XdrType.Opaque();
			const data = Buffer.alloc(0);
			codec.encode(xdr, data);
			xdr.rewind();
			expect(codec.decode(xdr)).toEqual(data);
		});

		it('should encode and decode buffer with padding', () => {
			const codec = XdrType.Opaque();
			const data = Buffer.from([1, 2, 3]); // 3 bytes needs 1 byte padding
			codec.encode(xdr, data);
			xdr.rewind();
			expect(codec.decode(xdr)).toEqual(data);
		});

		it('should encode and decode buffer with non-aligned length', () => {
			const codec = XdrType.Opaque();
			const data = Buffer.from([1, 2, 3, 4, 5, 6, 7]); // 7 bytes needs 1 byte padding
			codec.encode(xdr, data);
			xdr.rewind();
			expect(codec.decode(xdr)).toEqual(data);
		});

		it('should have primitive type', () => {
			const codec = XdrType.Opaque();
			expect(codec.type).toBe('primitive');
		});
	});

	describe('String Codec', () => {
		it('should encode and decode string', () => {
			const codec = XdrType.String();
			codec.encode(xdr, 'hello');
			xdr.rewind();
			expect(codec.decode(xdr)).toBe('hello');
		});

		it('should encode and decode empty string', () => {
			const codec = XdrType.String();
			codec.encode(xdr, '');
			xdr.rewind();
			expect(codec.decode(xdr)).toBe('');
		});

		it('should encode and decode string with special characters', () => {
			const codec = XdrType.String();
			codec.encode(xdr, 'hello@#$%^&*()');
			xdr.rewind();
			expect(codec.decode(xdr)).toBe('hello@#$%^&*()');
		});

		it('should encode and decode string with unicode', () => {
			const codec = XdrType.String();
			codec.encode(xdr, 'hello 🚀 world');
			xdr.rewind();
			expect(codec.decode(xdr)).toBe('hello 🚀 world');
		});

		it('should encode and decode multiline string', () => {
			const codec = XdrType.String();
			const text = 'line1\nline2\nline3';
			codec.encode(xdr, text);
			xdr.rewind();
			expect(codec.decode(xdr)).toBe(text);
		});

		it('should have primitive type', () => {
			const codec = XdrType.String();
			expect(codec.type).toBe('primitive');
		});

		it('should work with type parameter', () => {
			const codec = XdrType.String<string>();
			codec.encode(xdr, 'test');
			xdr.rewind();
			expect(codec.decode(xdr)).toBe('test');
		});
	});

	describe('isXdrType Type Guard', () => {
		it('should identify valid XdrType primitive codec', () => {
			const codec = XdrType.UInt();
			expect(XdrType.isXdrType(codec)).toBe(true);
		});

		it('should identify all primitive codec types', () => {
			expect(XdrType.isXdrType(XdrType.UInt())).toBe(true);
			expect(XdrType.isXdrType(XdrType.Int())).toBe(true);
			expect(XdrType.isXdrType(XdrType.Short())).toBe(true);
			expect(XdrType.isXdrType(XdrType.UShort())).toBe(true);
			expect(XdrType.isXdrType(XdrType.Double())).toBe(true);
			expect(XdrType.isXdrType(XdrType.Float())).toBe(true);
			expect(XdrType.isXdrType(XdrType.Opaque())).toBe(true);
			expect(XdrType.isXdrType(XdrType.String())).toBe(true);
			const boolCodec = XdrType.Boolean();
			expect(XdrType.isXdrType(boolCodec)).toBe(true);
		});

		it('should return false for non-XdrType objects', () => {
			expect(XdrType.isXdrType({})).toBe(false);
			expect(XdrType.isXdrType({type: 'other'})).toBe(false);
			expect(XdrType.isXdrType({type: 'primitive', other: 'value'})).toBe(true); // has type: 'primitive'
			expect(XdrType.isXdrType(null)).toBe(false);
			expect(XdrType.isXdrType(undefined)).toBe(false);
			expect(XdrType.isXdrType('string')).toBe(false);
			expect(XdrType.isXdrType(123)).toBe(false);
		});

		it('should return false for objects without type property', () => {
			expect(XdrType.isXdrType({encode: () => {}, decode: () => {}})).toBe(false);
		});

		it('should return false for objects with non-primitive type', () => {
			expect(XdrType.isXdrType({type: 'custom'})).toBe(false);
			expect(XdrType.isXdrType({type: 'codec'})).toBe(false);
		});
	});

	describe('Multiple Codecs Interaction', () => {
		it('should encode and decode multiple values in sequence', () => {
			const intCodec = XdrType.Int();
			const shortCodec = XdrType.Short();
			const stringCodec = XdrType.String();

			intCodec.encode(xdr, 12345);
			shortCodec.encode(xdr, 100);
			stringCodec.encode(xdr, 'test');

			xdr.rewind();

			expect(intCodec.decode(xdr)).toBe(12345);
			expect(shortCodec.decode(xdr)).toBe(100);
			expect(stringCodec.decode(xdr)).toBe('test');
		});

		it('should handle mixed primitive types', () => {
			const uintCodec = XdrType.UInt();
			const doubleCodec = XdrType.Double();
			const boolCodec = XdrType.Boolean();

			uintCodec.encode(xdr, 42);
			doubleCodec.encode(xdr, BigInt(1000000));
			boolCodec.encode(xdr, true);

			xdr.rewind();

			expect(uintCodec.decode(xdr)).toBe(42);
			expect(doubleCodec.decode(xdr)).toBe(BigInt(1000000));
			expect(boolCodec.decode(xdr)).toBe(true);
		});
	});

	describe('Codec Properties', () => {
		it('should have correct interface properties', () => {
			const codec = XdrType.UInt();
			expect(codec).toHaveProperty('type');
			expect(codec).toHaveProperty('encode');
			expect(codec).toHaveProperty('decode');
		});

		it('should implement IXdrCodec interface', () => {
			const codec = XdrType.Int();
			expect(typeof codec.encode).toBe('function');
			expect(typeof codec.decode).toBe('function');
		});

		it('should implement IXdrPrimitiveCodec interface', () => {
			const codec = XdrType.String();
			expect(codec.type).toBe('primitive');
			expect(typeof codec.encode).toBe('function');
			expect(typeof codec.decode).toBe('function');
		});
	});

	describe('Edge Cases and Boundary Values', () => {
		it('should handle number edge cases', () => {
			const intCodec = XdrType.Int();

			// Minimum
			intCodec.encode(xdr, -2147483648);
			xdr.rewind();
			expect(intCodec.decode(xdr)).toBe(-2147483648);
			xdr.rewind();

			// Maximum
			intCodec.encode(xdr, 2147483647);
			xdr.rewind();
			expect(intCodec.decode(xdr)).toBe(2147483647);
		});

		it('should handle long strings', () => {
			const stringCodec = XdrType.String();
			const longString = 'a'.repeat(10000);
			stringCodec.encode(xdr, longString);
			xdr.rewind();
			expect(stringCodec.decode(xdr)).toBe(longString);
		});

		it('should handle large binary data', () => {
			const opaqueCodec = XdrType.Opaque();
			const largeBuffer = Buffer.alloc(10000);
			for (let i = 0; i < largeBuffer.length; i++) {
				largeBuffer[i] = (i % 256) as any;
			}
			opaqueCodec.encode(xdr, largeBuffer);
			xdr.rewind();
			expect(opaqueCodec.decode(xdr)).toEqual(largeBuffer);
		});
	});
});
