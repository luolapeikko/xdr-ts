import type {XdrArray, XdrSchemaArray} from './XdrArray';
import type {XdrConditional, XdrConditionalSchema} from './XdrConditional';
import type {InferXdrObjectSchemaArray, XdrObjectSchemaArrayInput} from './XdrObjectSchemaArray';
import type {InferXdrSchema, XdrSchema} from './XdrSchema';
import type {IXdrPrimitiveCodec} from './XdrType';

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

export type InferArgument<T> = T extends XdrObjectSchemaArrayInput
	? InferXdrObjectSchemaArray<T>
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
