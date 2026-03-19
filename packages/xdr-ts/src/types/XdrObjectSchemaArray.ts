import type {IXdrBuffer} from './IXdrBuffer';
import type {InferXdrInnerSchema} from './XdrSchema';
import type {XdrInnerSchema, XdrObjectSchema} from './XdrSchemaTypes';

export type XdrObjectSchemaArrayInput = [XdrInnerSchema, ...XdrInnerSchema[]] | readonly [XdrInnerSchema, ...XdrInnerSchema[]];

/**
 * @deprecated use XdrObjectSchemaArrayInput instead
 */
export type XdrObjectSchemaArray<T extends readonly unknown[] = readonly unknown[]> = T extends readonly unknown[]
	? {
			[K in keyof T]: XdrObjectSchema<T[K]>;
		}
	: never;

export function isXdrObjectSchemaArray(value: unknown): value is XdrObjectSchemaArray {
	return Array.isArray(value);
}

export function isXdrObjectSchemaArrayInput(value: unknown): value is XdrObjectSchemaArrayInput {
	return Array.isArray(value);
}

export function encodeXdrObjectSchemaArray<T extends XdrObjectSchemaArrayInput>(
	buffer: IXdrBuffer,
	schema: T,
	valueObject: InferXdrInnerSchema<T>,
): IXdrBuffer {
	console.log(schema);
	for (const entry of schema) {
		const value = valueObject[entry.name] ?? entry.default;
		// start next level of recursion if this is nested schema array
		if (isXdrObjectSchemaArrayInput(entry.type)) {
			encodeXdrObjectSchemaArray(buffer, entry.type as any, value as any);
			continue;
		}
		const target = entry.type.type;
		switch (target) {
			case 'conditional':
				entry.type.encode(buffer, valueObject, value);
				break;
			case 'array':
				entry.type.encode(buffer, value as any[]);
				break;
			case 'primitive':
				entry.type.encode(buffer, value);
				break;
			case 'schema':
				entry.type.encode(buffer, value as never);
				break;
			default:
				throw new Error(`missing schema type ${target satisfies never} encoder handler`);
		}
	}
	return buffer;
}

export function decodeXdrObjectSchemaArray<T extends XdrObjectSchemaArrayInput>(buffer: IXdrBuffer, schema: T): InferXdrInnerSchema<T> {
	const output: any = {};
	for (const entry of schema) {
		const key = entry.name;
		output[key] = entry.default;
		// start next level of recursion if this is nested schema array
		if (isXdrObjectSchemaArrayInput(entry.type)) {
			output[key] = decodeXdrObjectSchemaArray(buffer, entry.type as any);
			continue;
		}
		const target = entry.type.type;
		switch (target) {
			case 'conditional': {
				const value = entry.type.decode(buffer, output);
				if (value !== undefined) {
					output[key] = value;
				}
				break;
			}
			case 'array':
				output[key] = entry.type.decode(buffer);
				break;
			case 'primitive':
				output[key] = entry.type.decode(buffer);
				break;
			case 'schema':
				output[key] = entry.type.decode(buffer);
				break;
			default:
				throw new Error(`missing schema type ${target satisfies never} decoder handler`);
		}
	}
	return output as InferXdrInnerSchema<T>;
}
