import type {ValidXdrSchemaArray, XdrArray, XdrSchemaArray} from './XdrArray';
import type {XdrConditional, XdrConditionalSchema} from './XdrConditional';
import type {XdrObjectSchemaArray, XdrObjectSchemaArrayInput} from './XdrObjectSchemaArray';
import type {InferArgumentObject, InferXdrSchema, ValidXdrSchema, XdrSchema} from './XdrSchema';
import type {IXdrPrimitiveCodec} from './XdrType';

export interface IXdrTypeClass<T> {
	type: T;
}

/**
 * @deprecated use XdrInnerSchema instead
 */
export type XdrObjectSchema<T = unknown> = {
	name: string;
	type:
		| IXdrPrimitiveCodec<T>
		| XdrObjectSchema<T>[]
		| XdrConditional<any>
		| XdrConditionalSchema<any>
		| XdrArray<T>
		| ValidXdrSchemaArray<T>
		| ValidXdrSchema<T>;
	default?: T;
};

export type XdrInnerSchema<
	S extends
		| IXdrPrimitiveCodec
		| XdrConditional<any>
		| XdrConditionalSchema<any>
		| XdrArray<any>
		| XdrSchemaArray<any>
		| XdrObjectSchemaArrayInput
		| XdrSchema<any> =
		| IXdrPrimitiveCodec
		| XdrConditional<any>
		| XdrConditionalSchema<any>
		| XdrArray<any>
		| XdrSchemaArray<any>
		| XdrObjectSchemaArrayInput
		| XdrSchema<any>,
> = {
	name: string;
	type: S;
	default?: InferArgument<S>;
};

export type InferXdrInnerSchemaType<T extends XdrInnerSchema> = InferArgument<T['type']>;

export type NweInfer<T> =
	T extends IXdrPrimitiveCodec<infer U>
		? U
		: T extends XdrConditional<infer U>
			? U | undefined
			: T extends XdrConditionalSchema<infer U>
				? InferArgumentObject<U> | undefined
				: T extends XdrArray<infer U>
					? U[]
					: T extends XdrObjectSchemaArray
						? InferArgumentObject<T>
						: T extends XdrSchema<infer U>
							? InferXdrSchema<U>
							: never;

// export type XdrSchemaType<T = unknown> = IXdrType<T> | XdrObjectSchemaArray<T> | XdrClass<T>;

export type InferArgument<T> = T extends XdrObjectSchemaArray
	? InferArgumentObject<T>
	: T extends IXdrPrimitiveCodec<infer U>
		? U
		: T extends XdrArray<infer U>
			? U[]
			: T extends XdrSchemaArray<infer U>
				? InferArgument<U>[]
				: T extends XdrConditional<infer U>
					? U | undefined
					: T extends XdrConditionalSchema<infer U>
						? InferArgument<U> | undefined
						: T extends XdrSchema
							? InferXdrSchema<T>
							: never;
/*
export function encodeSchema<T extends XdrSchema>(args: InferArgument<T>, schema: T, buffer: IXdrBuffer): IXdrBuffer {
	if (XdrType.isXdrType(schema)) {
		schema.encode(buffer, args);
		return buffer;
	}
	if (XdrArray.isType(schema)) {
		schema.encode(buffer, args as any[]);
		return buffer;
	}
	for (const arg of schema as readonly XdrObjectSchema[]) {
		const value = args[arg.name as keyof InferArgument<T>] ?? arg.default;
		if (XdrConditional.isType(arg.type)) {
			arg.type.encode(buffer, args, value);
		} else if (XdrArray.isType(arg.type)) {
			arg.type.encode(buffer, value as any[]);
		} else if (XdrType.isXdrType(arg.type)) {
			arg.type.encode(buffer, value);
		} else {
			encodeSchema(value as InferArgumentObject<any>, arg.type as readonly XdrObjectSchema[], buffer);
		}
	}
	return buffer;
}

export function decodeSchema<T extends XdrSchema>(schema: T, buffer: IXdrBuffer): InferArgument<T> {
	if (XdrType.isXdrType(schema)) {
		return schema.decode(buffer) as InferArgument<T>;
	}
	if (XdrArray.isType(schema)) {
		return schema.decode(buffer) as InferArgument<T>;
	}
	const output: any = {};
	for (const arg of schema as readonly XdrObjectSchema[]) {
		const key = arg.name as keyof InferArgument<T>;
		output[key] = arg.default;
		if (XdrConditional.isType(arg.type)) {
			const value = arg.type.decode(buffer, output);
			if (value !== undefined) {
				output[key] = value;
			}
		} else if (XdrArray.isType(arg.type)) {
			output[key] = arg.type.decode(buffer);
		} else if (XdrType.isXdrType(arg.type)) {
			output[key] = arg.type.decode(buffer);
		} else {
			output[key] = decodeSchema(arg.type as readonly XdrObjectSchema[], buffer);
		}
	}
	return output as InferArgument<T>;
}
*/
