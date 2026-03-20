import {describe, expect, it} from 'vitest';
import type {InferXdrSchema} from '../src';
import {XdrConditional} from '../src/types/XdrConditional';
import {
	decodeXdrObjectSchemaArray,
	encodeXdrObjectSchemaArray,
	type InferXdrObjectSchemaArray,
	type XdrObjectSchemaArrayInput,
} from '../src/types/XdrObjectSchemaArray';
import {XdrType} from '../src/types/XdrType';
import {XdrBuffer} from '../src/xdrBuffer/XdrBuffer';

describe('XdrConditional', () => {
	it('should encode and decode when condition is met', () => {
		const buffer = new XdrBuffer(10);
		const schema = [
			{name: 'flag', type: XdrType.UInt()},
			{name: 'maybeValue', type: new XdrConditional(XdrType.UInt(), (data: any) => data.flag === 1)},
		] as const satisfies XdrObjectSchemaArrayInput;

		const data = {flag: 1, maybeValue: 42};
		encodeXdrObjectSchemaArray(buffer, schema, data);

		expect(buffer.currentPointer).toBe(8); // 4 bytes for flag, 4 bytes for maybeValue

		buffer.rewind();
		const result = decodeXdrObjectSchemaArray(buffer, schema);
		expect(result).toEqual({flag: 1, maybeValue: 42});
	});

	it('should NOT encode or decode when condition is not met', () => {
		const buffer = new XdrBuffer(10);
		const schema = [
			{name: 'flag', type: XdrType.UInt()},
			{name: 'maybeValue', type: new XdrConditional(XdrType.UInt(), (data: any) => data.flag === 1)},
		] as const satisfies XdrObjectSchemaArrayInput;

		const data = {flag: 0, maybeValue: 42};
		encodeXdrObjectSchemaArray(buffer, schema, data);

		expect(buffer.currentPointer).toBe(4); // Only 4 bytes for flag

		buffer.rewind();
		const result = decodeXdrObjectSchemaArray(buffer, schema);
		expect(result).toEqual({flag: 0, maybeValue: undefined});
	});

	it('should work with default values', () => {
		const buffer = new XdrBuffer(10);
		const schema = [
			{name: 'flag', type: XdrType.UInt()},
			{name: 'maybeValue', type: new XdrConditional(XdrType.UInt(), (data: any) => data.flag === 1), default: 99},
		] as const satisfies XdrObjectSchemaArrayInput;

		const data = {flag: 0};
		encodeXdrObjectSchemaArray(buffer, schema, data);

		expect(buffer.currentPointer).toBe(4);

		buffer.rewind();
		const result = decodeXdrObjectSchemaArray(buffer, schema);
		expect(result).toEqual({flag: 0, maybeValue: 99});
	});
});
