import {beforeEach, describe, expect, it} from 'vitest';
import {XdrBuffer} from '../src/';

describe('XdrBuffer', () => {
	describe('Constructor', () => {
		it('should create a buffer with default empty allocation', () => {
			const xdr = new XdrBuffer();
			expect(xdr.size()).toBe(0);
			expect(xdr.currentPointer).toBe(0);
		});

		it('should create a buffer with specified size', () => {
			const xdr = new XdrBuffer(100);
			expect(xdr.size()).toBe(100);
			expect(xdr.currentPointer).toBe(0);
		});

		it('should create a buffer from existing Buffer', () => {
			const buf = Buffer.from([0x00, 0x00, 0x00, 0x11]);
			const xdr = new XdrBuffer(buf);
			expect(xdr.size()).toBe(4);
			expect(xdr.currentPointer).toBe(0);
			expect(xdr.rawBuffer).toBe(buf);
		});

		it('should create a buffer with zero size when passed 0', () => {
			const xdr = new XdrBuffer(0);
			expect(xdr.size()).toBe(0);
		});
	});

	describe('Getters', () => {
		it('should return current pointer position', () => {
			const xdr = new XdrBuffer(10);
			expect(xdr.currentPointer).toBe(0);
			xdr.writeByte(1);
			expect(xdr.currentPointer).toBe(1);
		});

		it('should return raw buffer reference', () => {
			const xdr = new XdrBuffer(10);
			const buf = xdr.rawBuffer;
			expect(buf).toBeInstanceOf(Buffer);
			expect(buf.length).toBe(10);
		});
	});

	describe('Write and Read Byte', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(10);
		});

		it('should write and read a byte', () => {
			xdr.writeByte(42);
			xdr.rewind();
			expect(xdr.readByte()).toBe(42);
		});

		it('should write and read maximum byte value', () => {
			xdr.writeByte(255);
			xdr.rewind();
			expect(xdr.readByte()).toBe(255);
		});

		it('should write and read minimum byte value', () => {
			xdr.writeByte(0);
			xdr.rewind();
			expect(xdr.readByte()).toBe(0);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeByte(1);
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read Int (32-bit big-endian)', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read positive int', () => {
			xdr.writeInt(12345);
			xdr.rewind();
			expect(xdr.readInt()).toBe(12345);
		});

		it('should write and read negative int', () => {
			xdr.writeInt(-12345);
			xdr.rewind();
			expect(xdr.readInt()).toBe(-12345);
		});

		it('should write and read zero', () => {
			xdr.writeInt(0);
			xdr.rewind();
			expect(xdr.readInt()).toBe(0);
		});

		it('should write and read maximum signed 32-bit int', () => {
			const maxInt = 2147483647;
			xdr.writeInt(maxInt);
			xdr.rewind();
			expect(xdr.readInt()).toBe(maxInt);
		});

		it('should write and read minimum signed 32-bit int', () => {
			const minInt = -2147483648;
			xdr.writeInt(minInt);
			xdr.rewind();
			expect(xdr.readInt()).toBe(minInt);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeInt(100);
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read UInt (32-bit unsigned big-endian)', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read unsigned int', () => {
			xdr.writeUInt(12345);
			xdr.rewind();
			expect(xdr.readUInt()).toBe(12345);
		});

		it('should write and read zero', () => {
			xdr.writeUInt(0);
			xdr.rewind();
			expect(xdr.readUInt()).toBe(0);
		});

		it('should write and read maximum unsigned 32-bit int', () => {
			const maxUInt = 4294967295;
			xdr.writeUInt(maxUInt);
			xdr.rewind();
			expect(xdr.readUInt()).toBe(maxUInt);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeUInt(100);
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read Short (16-bit big-endian)', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read positive short', () => {
			xdr.writeShort(1234);
			xdr.rewind();
			expect(xdr.readShort()).toBe(1234);
		});

		it('should write and read negative short', () => {
			xdr.writeShort(-1234);
			xdr.rewind();
			expect(xdr.readShort()).toBe(-1234);
		});

		it('should write and read maximum signed 16-bit short', () => {
			const maxShort = 32767;
			xdr.writeShort(maxShort);
			xdr.rewind();
			expect(xdr.readShort()).toBe(maxShort);
		});

		it('should write and read minimum signed 16-bit short', () => {
			const minShort = -32768;
			xdr.writeShort(minShort);
			xdr.rewind();
			expect(xdr.readShort()).toBe(minShort);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeShort(100);
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read UShort (16-bit unsigned big-endian)', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read unsigned short', () => {
			xdr.writeUShort(1234);
			xdr.rewind();
			expect(xdr.readUShort()).toBe(1234);
		});

		it('should write and read maximum unsigned 16-bit short', () => {
			const maxUShort = 65535;
			xdr.writeUShort(maxUShort);
			xdr.rewind();
			expect(xdr.readUShort()).toBe(maxUShort);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeUShort(100);
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read Double (64-bit big-endian signed)', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read positive bigint', () => {
			// Max for BigInt64 is 2^63 - 1
			const maxBigInt = BigInt('9223372036854775807');
			xdr.writeDouble(maxBigInt);
			xdr.rewind();
			expect(xdr.readDouble()).toBe(maxBigInt);
		});

		it('should write and read negative bigint', () => {
			xdr.writeDouble(BigInt("-9223372036854775808"));
			xdr.rewind();
			expect(xdr.readDouble()).toBe(BigInt("-9223372036854775808"));
		});

		it('should write and read zero', () => {
			xdr.writeDouble(BigInt(0));
			xdr.rewind();
			expect(xdr.readDouble()).toBe(BigInt(0));
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeDouble(BigInt(100));
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read Float (32-bit big-endian IEEE 754)', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read float', () => {
			xdr.writeFloat(3.14);
			xdr.rewind();
			const value = xdr.readFloat();
			expect(Math.abs(value - 3.14) < 0.01).toBe(true);
		});

		it('should write and read negative float', () => {
			xdr.writeFloat(-2.5);
			xdr.rewind();
			const value = xdr.readFloat();
			expect(Math.abs(value - -2.5) < 0.01).toBe(true);
		});

		it('should write and read zero float', () => {
			xdr.writeFloat(0);
			xdr.rewind();
			expect(xdr.readFloat()).toBe(0);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeFloat(1.5);
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read FloatDouble (64-bit big-endian IEEE 754)', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read double', () => {
			xdr.writeFloatDouble(3.141592653589793);
			xdr.rewind();
			expect(xdr.readFloatDouble()).toBe(3.141592653589793);
		});

		it('should write and read negative double', () => {
			xdr.writeFloatDouble(-2.5);
			xdr.rewind();
			expect(xdr.readFloatDouble()).toBe(-2.5);
		});

		it('should write and read zero double', () => {
			xdr.writeFloatDouble(0);
			xdr.rewind();
			expect(xdr.readFloatDouble()).toBe(0);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeFloatDouble(1.5);
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read String', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(1024);
		});

		it('should write and read string', () => {
			xdr.writeString('hello');
			xdr.rewind();
			expect(xdr.readString()).toBe('hello');
		});

		it('should write and read empty string', () => {
			xdr.writeString('');
			xdr.rewind();
			expect(xdr.readString()).toBe('');
		});

		it('should write and read string with unicode characters', () => {
			xdr.writeString('hello 🚀 world');
			xdr.rewind();
			expect(xdr.readString()).toBe('hello 🚀 world');
		});

		it('should write and read string with special characters', () => {
			xdr.writeString('test@#$%^&*()');
			xdr.rewind();
			expect(xdr.readString()).toBe('test@#$%^&*()');
		});

		it('should write string with 4-byte padding by default', () => {
			xdr.writeString('abc');
			expect(xdr.currentPointer).toBe(8);
			expect(xdr.rawBuffer.subarray(0, 8)).toEqual(Buffer.from([0, 0, 0, 3, 97, 98, 99, 0]));
			xdr.rewind();
			expect(xdr.readString()).toBe('abc');
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeString('test');
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read Opaque (binary data)', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(1024);
		});

		it('should write and read opaque buffer', () => {
			const data = Buffer.from([1, 2, 3, 4, 5]);
			xdr.writeOpaque(data);
			xdr.rewind();
			expect(xdr.readOpaque()).toEqual(data);
		});

		it('should write and read empty opaque buffer', () => {
			const data = Buffer.alloc(0);
			xdr.writeOpaque(data);
			xdr.rewind();
			expect(xdr.readOpaque()).toEqual(data);
		});

		it('should write and read opaque buffer with non-aligned length', () => {
			const data = Buffer.from([1, 2, 3]); // 3 bytes, needs 1 byte padding
			xdr.writeOpaque(data);
			xdr.rewind();
			expect(xdr.readOpaque()).toEqual(data);
		});

		it('should write and read opaque buffer with proper padding', () => {
			const data = Buffer.from([1, 2, 3, 4, 5, 6, 7]); // 7 bytes, needs 1 byte padding
			xdr.writeOpaque(data);
			xdr.rewind();
			expect(xdr.readOpaque()).toEqual(data);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeOpaque(Buffer.from([1, 2, 3]));
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read Boolean', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read true boolean', () => {
			xdr.writeBoolean(true);
			xdr.rewind();
			expect(xdr.readBoolean()).toBe(true);
		});

		it('should write and read false boolean', () => {
			xdr.writeBoolean(false);
			xdr.rewind();
			expect(xdr.readBoolean()).toBe(false);
		});

		it('should write and read boolean with custom flag writer', () => {
			xdr.writeBoolean(true, (buf, val) => buf.writeShort(val ? 1 : 0));
			xdr.rewind();
			const result = xdr.readBoolean((buf) => buf.readShort());
			expect(result).toBe(true);
		});

		it('should write and read false boolean with custom flag writer', () => {
			xdr.writeBoolean(false, (buf, val) => buf.writeShort(val ? 1 : 0));
			xdr.rewind();
			const result = xdr.readBoolean((buf) => buf.readShort());
			expect(result).toBe(false);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeBoolean(true);
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read Optional', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(100);
		});

		it('should write and read present optional value', () => {
			xdr.writeOptional(42, (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readOptional((buf) => buf.readInt());
			expect(result).toBe(42);
		});

		it('should write and read undefined optional value', () => {
			xdr.writeOptional<number>(undefined, (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readOptional((buf) => buf.readInt());
			expect(result).toBeUndefined();
		});

		it('should write and read null optional value', () => {
			xdr.writeOptional<number>(null, (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readOptional((buf) => buf.readInt());
			expect(result).toBeUndefined();
		});

		it('should treat false boolean as absent', () => {
			xdr.writeOptional(false as any, (buf, val) => buf.writeInt(val as any));
			xdr.rewind();
			const result = xdr.readOptional((buf) => buf.readInt());
			expect(result).toBeUndefined();
		});

		it('should write and read optional with custom flag writer', () => {
			xdr.writeOptional(
				42,
				(buf, val) => buf.writeInt(val),
				(buf, flag) => buf.writeShort(flag ? 1 : 0),
			);
			xdr.rewind();
			const result = xdr.readOptional(
				(buf) => buf.readInt(),
				(buf) => buf.readShort(),
			);
			expect(result).toBe(42);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeOptional(42, (buf, val) => buf.writeInt(val));
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read List', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(1024);
		});

		it('should write and read list of integers', () => {
			const items = [1, 2, 3, 4, 5];
			xdr.writeList(items, (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readList((buf) => buf.readInt());
			expect(result).toEqual(items);
		});

		it('should write and read empty list', () => {
			xdr.writeList([], (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readList((buf) => buf.readInt());
			expect(result).toEqual([]);
		});

		it('should write and read list with single element', () => {
			xdr.writeList([42], (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readList((buf) => buf.readInt());
			expect(result).toEqual([42]);
		});

		it('should write and read list with custom flag writer', () => {
			const items = [1, 2, 3];
			xdr.writeList(
				items,
				(buf, val) => buf.writeInt(val),
				(buf, flag) => buf.writeShort(flag ? 1 : 0),
			);
			xdr.rewind();
			const result = xdr.readList(
				(buf) => buf.readInt(),
				(buf) => buf.readShort(),
			);
			expect(result).toEqual(items);
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeList([1, 2], (buf, val) => buf.writeInt(val));
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read FixedArray', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(1024);
		});

		it('should write and read fixed array', () => {
			const items = [10, 20, 30];
			xdr.writeFixedArray(3, items, (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readFixedArray(3, (buf) => buf.readInt());
			expect(result).toEqual(items);
		});

		it('should write and read fixed array of size 1', () => {
			xdr.writeFixedArray(1, [42], (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readFixedArray(1, (buf) => buf.readInt());
			expect(result).toEqual([42]);
		});

		it('should write and read fixed array of size 5', () => {
			const items = [1, 2, 3, 4, 5];
			xdr.writeFixedArray(5, items, (buf, val) => buf.writeInt(val));
			xdr.rewind();
			const result = xdr.readFixedArray(5, (buf) => buf.readInt());
			expect(result).toEqual(items);
		});

		it('should throw on array length mismatch', () => {
			expect(() => {
				xdr.writeFixedArray(3, [1, 2], (buf, val) => buf.writeInt(val));
			}).toThrow('Array length 2 does not match expected length 3');
		});

		it('should support method chaining on write', () => {
			const result = xdr.writeFixedArray(2, [1, 2], (buf, val) => buf.writeInt(val));
			expect(result).toBe(xdr);
		});
	});

	describe('Write and Read IntArray', () => {
		let xdr: XdrBuffer;

		beforeEach(() => {
			xdr = new XdrBuffer(1024);
		});

		it('should write int array via writeIntArray', () => {
			const values = [100, 200, 300];
			// IntArray format: count (4 bytes) + [values]
			xdr.writeInt(values.length);
			for (const val of values) {
				xdr.writeInt(val);
			}
			xdr.rewind();
			const result = xdr.readIntArray();
			expect(result).toEqual(values);
		});

		it('should read empty int array', () => {
			xdr.writeInt(0);
			xdr.rewind();
			const result = xdr.readIntArray();
			expect(result).toEqual([]);
		});

		it('should read int array with single element', () => {
			xdr.writeInt(1);
			xdr.writeInt(42);
			xdr.rewind();
			const result = xdr.readIntArray();
			expect(result).toEqual([42]);
		});
	});

	describe('Rewind', () => {
		it('should reset pointer to 0', () => {
			const xdr = new XdrBuffer(100);
			xdr.writeInt(42);
			xdr.writeInt(43);
			expect(xdr.currentPointer).toBe(8);
			xdr.rewind();
			expect(xdr.currentPointer).toBe(0);
		});

		it('should allow reading data again after rewind', () => {
			const xdr = new XdrBuffer(100);
			xdr.writeInt(42);
			xdr.rewind();
			expect(xdr.readInt()).toBe(42);
			xdr.rewind();
			expect(xdr.readInt()).toBe(42);
		});
	});

	describe('Clear', () => {
		it('should reset pointer and fill buffer with zeros', () => {
			const xdr = new XdrBuffer(10);
			xdr.writeInt(42);
			expect(xdr.currentPointer).toBe(4);
			xdr.clear();
			expect(xdr.currentPointer).toBe(0);
			expect(xdr.rawBuffer.every((byte) => byte === 0)).toBe(true);
		});

		it('should reinitialize buffer for reuse', () => {
			const xdr = new XdrBuffer(100);
			xdr.writeInt(42);
			xdr.clear();
			xdr.writeInt(99);
			xdr.rewind();
			expect(xdr.readInt()).toBe(99);
		});
	});

	describe('Size', () => {
		it('should return buffer size', () => {
			const xdr = new XdrBuffer(42);
			expect(xdr.size()).toBe(42);
		});

		it('should return correct size after auto-expansion', () => {
			const xdr = new XdrBuffer(4);
			xdr.writeInt(1);
			xdr.writeInt(2);
			expect(xdr.size()).toBeGreaterThanOrEqual(8);
		});
	});

	describe('SliceUsed', () => {
		it('should return used portion of buffer', () => {
			const xdr = new XdrBuffer(100);
			xdr.writeInt(42);
			xdr.writeInt(43);
			const used = xdr.sliceUsed();
			expect(used.length).toBe(8);
		});

		it('should return empty buffer when no data written', () => {
			const xdr = new XdrBuffer(100);
			const used = xdr.sliceUsed();
			expect(used.length).toBe(0);
		});

		it('should return new Buffer instance', () => {
			const xdr = new XdrBuffer(100);
			xdr.writeInt(42);
			const used = xdr.sliceUsed();
			expect(used).not.toBe(xdr.rawBuffer);
		});

		it('should contain correct data', () => {
			const xdr = new XdrBuffer(100);
			xdr.writeInt(12345);
			const used = xdr.sliceUsed();
			xdr.rewind();
			expect(used).toEqual(xdr.rawBuffer.subarray(0, 4));
		});
	});

	describe('ToString', () => {
		it('should return correct string representation', () => {
			const xdr = new XdrBuffer(100);
			expect(xdr.toString()).toBe('XdrBuffer{pointer=0, size=100}');
		});

		it('should update toString after writes', () => {
			const xdr = new XdrBuffer(100);
			xdr.writeInt(42);
			expect(xdr.toString()).toBe('XdrBuffer{pointer=4, size=100}');
		});

		it('should update toString after rewind', () => {
			const xdr = new XdrBuffer(100);
			xdr.writeInt(42);
			xdr.rewind();
			expect(xdr.toString()).toBe('XdrBuffer{pointer=0, size=100}');
		});
	});

	describe('Method Chaining', () => {
		it('should support chaining multiple write operations', () => {
			const xdr = new XdrBuffer(1024);
			xdr.writeInt(1).writeInt(2).writeInt(3).writeShort(4).writeString('test');
			xdr.rewind();
			expect(xdr.readInt()).toBe(1);
			expect(xdr.readInt()).toBe(2);
			expect(xdr.readInt()).toBe(3);
			expect(xdr.readShort()).toBe(4);
			expect(xdr.readString()).toBe('test');
		});
	});

	describe('Auto-expansion on write', () => {
		it('should expand buffer when needed', () => {
			const xdr = new XdrBuffer(4);
			const initialSize = xdr.size();
			xdr.writeInt(1);
			xdr.writeInt(2);
			expect(xdr.size()).toBeGreaterThanOrEqual(initialSize + 4);
		});

		it('should preserve data during expansion', () => {
			const xdr = new XdrBuffer(4);
			xdr.writeInt(12345);
			xdr.writeInt(67890);
			xdr.rewind();
			expect(xdr.readInt()).toBe(12345);
			expect(xdr.readInt()).toBe(67890);
		});
	});

	describe('Error handling', () => {
		it('should throw when reading beyond buffer bounds', () => {
			const xdr = new XdrBuffer(4);
			xdr.writeInt(42);
			xdr.rewind();
			xdr.readInt();
			expect(() => {
				xdr.readInt();
			}).toThrow('xdr buffer too short');
		});

		it('should throw when reading single byte beyond bounds', () => {
			const xdr = new XdrBuffer(0);
			expect(() => {
				xdr.readByte();
			}).toThrow('xdr buffer too short');
		});

		it('should throw when reading short beyond bounds', () => {
			const xdr = new XdrBuffer(1);
			expect(() => {
				xdr.readShort();
			}).toThrow('xdr buffer too short');
		});

		it('should throw on writeFixedArray length mismatch', () => {
			const xdr = new XdrBuffer(100);
			expect(() => {
				xdr.writeFixedArray(5, [1, 2, 3], (buf, val) => buf.writeInt(val));
			}).toThrow('Array length 3 does not match expected length 5');
		});
	});

	describe('Complex scenarios', () => {
		it('should handle mixed data types', () => {
			const xdr = new XdrBuffer(1024);
			xdr.writeInt(42);
			xdr.writeString('hello');
			xdr.writeBoolean(true);
			xdr.writeShort(100);
			xdr.writeOpaque(Buffer.from([1, 2, 3]));

			xdr.rewind();
			expect(xdr.readInt()).toBe(42);
			expect(xdr.readString()).toBe('hello');
			expect(xdr.readBoolean()).toBe(true);
			expect(xdr.readShort()).toBe(100);
			expect(xdr.readOpaque()).toEqual(Buffer.from([1, 2, 3]));
		});

		it('should handle nested structures', () => {
			const xdr = new XdrBuffer(1024);
			// Write a list of structures
			xdr.writeList(
				[
					{id: 1, name: 'Alice'},
					{id: 2, name: 'Bob'},
				],
				(buf, val) => {
					buf.writeInt(val.id);
					buf.writeString(val.name);
				},
			);

			xdr.rewind();
			const result = xdr.readList((buf) => ({
				id: buf.readInt(),
				name: buf.readString(),
			}));

			expect(result).toEqual([
				{id: 1, name: 'Alice'},
				{id: 2, name: 'Bob'},
			]);
		});

		it('should handle optional fields in structures', () => {
			const xdr = new XdrBuffer(1024);
			// Write structure with optional field
			xdr.writeOptional({id: 1}, (buf, val) => {
				buf.writeInt(val.id);
			});

			xdr.rewind();
			const result = xdr.readOptional((buf) => ({
				id: buf.readInt(),
			}));

			expect(result).toEqual({id: 1});
		});

		it('should handle padding correctly with various opaque sizes', () => {
			const xdr = new XdrBuffer(1024);
			// Test padding for 1, 2, 3 byte opaques
			xdr.writeOpaque(Buffer.from([1]));
			xdr.writeOpaque(Buffer.from([2, 3]));
			xdr.writeOpaque(Buffer.from([4, 5, 6]));
			xdr.writeOpaque(Buffer.from([7, 8, 9, 10]));

			xdr.rewind();
			expect(xdr.readOpaque()).toEqual(Buffer.from([1]));
			expect(xdr.readOpaque()).toEqual(Buffer.from([2, 3]));
			expect(xdr.readOpaque()).toEqual(Buffer.from([4, 5, 6]));
			expect(xdr.readOpaque()).toEqual(Buffer.from([7, 8, 9, 10]));
		});
	});
});
