import type {IXdrBuffer} from './IXdrBuffer';
import {
	decodeXdrObjectSchemaArray,
	encodeXdrObjectSchemaArray,
	type InferXdrObjectSchemaArray,
	isXdrObjectSchemaArrayInput,
	type XdrObjectSchemaArrayInput,
} from './XdrObjectSchemaArray';
import type {InferArgument} from './XdrSchemaTypes';
import type {IXdrPrimitiveCodec, IXdrTypeClass} from './XdrType';

export type InferXdrSchemaInputType<T> = T extends IXdrPrimitiveCodec<infer U> ? U : T extends XdrObjectSchemaArrayInput ? InferXdrObjectSchemaArray<T> : never;

export class XdrSchema<T extends XdrObjectSchemaArrayInput | IXdrPrimitiveCodec = XdrObjectSchemaArrayInput | IXdrPrimitiveCodec>
	implements IXdrTypeClass<'schema', InferArgument<T>>
{
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

	private static handleEncode(schema: XdrObjectSchemaArrayInput | IXdrPrimitiveCodec<any>, args: any, buffer: IXdrBuffer): IXdrBuffer {
		// this is object schema array
		if (isXdrObjectSchemaArrayInput(schema)) {
			return encodeXdrObjectSchemaArray(buffer, schema, args);
		}
		// this is root primitive type
		switch (schema.type) {
			case 'primitive':
				schema.encode(buffer, args);
				break;
			default:
				throw new Error(`missing schema type ${schema.type satisfies never} encoder handler`);
		}
		return buffer;
	}

	private static handleDecode(schema: XdrObjectSchemaArrayInput | IXdrPrimitiveCodec<any>, buffer: IXdrBuffer): any {
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

export type InferXdrSchema<T> = T extends XdrSchema<infer U> ? InferXdrSchemaInputType<U> : never;
