import type {IXdrBuffer} from './IXdrBuffer';
import {
	decodeXdrObjectSchemaArray,
	encodeXdrObjectSchemaArray,
	isXdrObjectSchemaArrayInput,
	type XdrObjectSchemaArray,
	type XdrObjectSchemaArrayInput,
} from './XdrObjectSchemaArray';
import type {InferArgument, IXdrTypeClass} from './XdrSchemaTypes';
import type {IXdrType} from './XdrType';

export type ValidXdrSchema<T> = T extends XdrObjectSchemaArray ? T : T extends IXdrType ? T : never;

export class XdrSchema<T extends XdrObjectSchemaArrayInput | IXdrType = XdrObjectSchemaArrayInput | IXdrType> implements IXdrTypeClass<'schema'> {
	public readonly type = 'schema';
	public readonly schema: T;

	public constructor(schema: T) {
		this.schema = schema;
	}

	public encode(buffer: IXdrBuffer, args: InferArgument<T>): IXdrBuffer {
		return XdrSchema.handleEncode(this.schema, args, buffer);
	}

	public decode(buffer: IXdrBuffer): InferArgument<T> {
		return XdrSchema.handleDecode(this.schema, buffer);
	}

	private static handleEncode(schema: XdrObjectSchemaArrayInput | IXdrType<any>, args: any, buffer: IXdrBuffer): IXdrBuffer {
		// this is object schema array
		if (isXdrObjectSchemaArrayInput(schema)) {
			return encodeXdrObjectSchemaArray(buffer, schema, args);
		}
		// this is root primitive type
		switch (schema.type) {
			case 'primitive':
				schema.encode(buffer, args as any);
				break;
			default:
				throw new Error(`missing schema type ${schema.type satisfies never} encoder handler`);
		}
		return buffer;
	}

	private static handleDecode(schema: XdrObjectSchemaArrayInput | IXdrType<any>, buffer: IXdrBuffer): any {
		// this is object schema array
		if (isXdrObjectSchemaArrayInput(schema)) {
			return decodeXdrObjectSchemaArray(buffer, schema);
		}
		// this is root primitive type
		switch (schema.type) {
			case 'primitive':
				return schema.decode(buffer);
			default:
				throw new Error(`missing schema type ${schema.type satisfies never} decoder handler`);
		}
	}

	public static isType(value: unknown): value is XdrSchema {
		return value instanceof XdrSchema;
	}
}

export type InferredOptional<T extends XdrObjectSchemaArray> = {
	[E in T[number] as E extends {default: any} ? E['name'] : never]?: InferArgument<E['type']>;
};

export type InferredRequired<T extends XdrObjectSchemaArray> = {
	[E in T[number] as E extends {default: any} ? never : E['name']]: InferArgument<E['type']>;
};

export type InferArgumentObject<T extends XdrObjectSchemaArray> = InferredOptional<T> & InferredRequired<T>;

export type XdrInnerSchemaOptional<T extends XdrObjectSchemaArrayInput> = {
	[E in T[number] as E extends {default: any} ? E['name'] : never]?: InferArgument<E['type']>;
};

export type XdrInnerSchemaRequired<T extends XdrObjectSchemaArrayInput> = {
	[E in T[number] as E extends {default: any} ? never : E['name']]: InferArgument<E['type']>;
};

export type InferXdrInnerSchema<T extends XdrObjectSchemaArrayInput> = XdrInnerSchemaOptional<T> & XdrInnerSchemaRequired<T> & Record<string, unknown>;

export type InferXdrSchemaType<T> = T extends IXdrType<infer U> ? U : T extends XdrObjectSchemaArray ? InferArgumentObject<T> : never;

export type InferXdrSchema<T> = T extends XdrSchema<infer U> ? InferXdrSchemaType<U> : never;
