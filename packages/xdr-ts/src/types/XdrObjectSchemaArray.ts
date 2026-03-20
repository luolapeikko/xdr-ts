import type {IXdrBuffer} from './IXdrBuffer';
import type {InferXdrInnerSchemaType, XdrInnerSchema} from './XdrSchemaTypes';

export type XdrObjectSchemaArrayInput = [XdrInnerSchema, ...XdrInnerSchema[]] | readonly [XdrInnerSchema, ...XdrInnerSchema[]];


export type InferXdrObjectSchemaArray<T extends XdrObjectSchemaArrayInput = XdrObjectSchemaArrayInput> = {
	[E in T[number] as E extends {default: any} ? never : E['type'] extends {type: 'conditional'} ? never : E['name']]: InferXdrInnerSchemaType<E>;
} & {
	[E in T[number] as E extends {default: any} ? E['name'] : E['type'] extends {type: 'conditional'} ? E['name'] : never]?: InferXdrInnerSchemaType<E>;
} & Record<string, unknown>;

export function isXdrObjectSchemaArrayInput(value: unknown): value is XdrObjectSchemaArrayInput {
	return Array.isArray(value);
}

export function encodeXdrObjectSchemaArray<T extends XdrObjectSchemaArrayInput>(
	buffer: IXdrBuffer,
	schema: T,
	valueObject: InferXdrObjectSchemaArray<T>,
): IXdrBuffer {
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

export function decodeXdrObjectSchemaArray<T extends XdrObjectSchemaArrayInput>(buffer: IXdrBuffer, schema: T): InferXdrObjectSchemaArray<T> {
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
	return output as InferXdrObjectSchemaArray<T>;
}
