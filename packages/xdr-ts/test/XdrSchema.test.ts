import {describe, expect, it} from 'vitest';
import {XdrBuffer, XdrType} from '../src';
import type {XdrObjectSchemaArrayInput} from '../src/types/XdrObjectSchemaArray';
import {XdrSchema} from '../src/types/XdrSchema';

describe('XdrSchema', () => {
	it('should encode and decode a primitive correctly', () => {
		const schema = new XdrSchema(XdrType.UInt());
		const buffer = schema.encode(new XdrBuffer(4), 12345);
		buffer.rewind();
		expect(schema.decode(buffer)).toBe(12345);
	});
	it('should encode and decode a simple schema correctly', () => {
		const rawSchema = [
			{name: 'field1', type: XdrType.UInt()},
			{name: 'field2', type: XdrType.String()},
		] as const satisfies XdrObjectSchemaArrayInput;
		const schema = new XdrSchema(rawSchema);
		const buffer = schema.encode(new XdrBuffer(1024), {field1: 12345, field2: 'hello'});
		buffer.rewind();
		expect(schema.decode(buffer)).toEqual({field1: 12345, field2: 'hello'});
	});
	it('should encode and decode a simple schema inside schema correctly', () => {
		const subSchema = new XdrSchema([
			{name: 'subField1', type: XdrType.Int()},
			{name: 'subField2', type: XdrType.String()},
		] as const satisfies XdrObjectSchemaArrayInput);
		const rawSchema = [
			{name: 'field1', type: XdrType.UInt()},
			{name: 'field2', type: subSchema},
		] as const satisfies XdrObjectSchemaArrayInput;
		const schema = new XdrSchema(rawSchema);
		const buffer = schema.encode(new XdrBuffer(1024), {field1: 12345, field2: {subField1: -54321, subField2: 'world'}});
		buffer.rewind();
		expect(schema.decode(buffer)).toEqual({field1: 12345, field2: {subField1: -54321, subField2: 'world'}});
	}); 
	it('should encode and decode a simple raw schema inside schema correctly', () => {
		const rawSubSchema = [
			{name: 'subField1', type: XdrType.Int()},
			{name: 'subField2', type: XdrType.String()},
		] as const satisfies XdrObjectSchemaArrayInput;
		const rawSchema = [
			{name: 'field1', type: XdrType.UInt()},
			{name: 'field2', type: rawSubSchema},
		] as const satisfies XdrObjectSchemaArrayInput;
		const schema = new XdrSchema(rawSchema);
		const buffer = schema.encode(new XdrBuffer(1024), {field1: 12345, field2: {subField1: -54321, subField2: 'world'}});
		buffer.rewind();
		expect(schema.decode(buffer)).toEqual({field1: 12345, field2: {subField1: -54321, subField2: 'world'}});
	});
});
