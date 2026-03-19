import type {IXdrBuffer} from './IXdrBuffer';
import {decodeXdrObjectSchemaArray, encodeXdrObjectSchemaArray, type XdrObjectSchemaArrayInput} from './XdrObjectSchemaArray';
import type {InferArgument, IXdrTypeClass} from './XdrSchemaTypes';
import type {IXdrPrimitiveCodec} from './XdrType';

/**
 * A conditional type is a type that is only encoded or decoded if a certain condition is met.
 */
export class XdrConditionalSchema<S extends XdrObjectSchemaArrayInput = XdrObjectSchemaArrayInput, O extends Record<string, unknown> = Record<string, unknown>>
	implements IXdrTypeClass<'conditional'>
{
	public readonly type = 'conditional';
	private readonly condition: (data: O) => boolean;

	private readonly schema: S;

	public constructor(schema: S, condition: (data: O) => boolean) {
		this.condition = condition;
		this.schema = schema;
	}

	public encode(buffer: IXdrBuffer, object: O, value: InferArgument<S>): void {
		if (this.condition(object)) {
			encodeXdrObjectSchemaArray(buffer, this.schema, value as any);
		}
	}

	public decode(buffer: IXdrBuffer, object: O): InferArgument<S> | undefined {
		if (this.condition(object)) {
			return decodeXdrObjectSchemaArray(buffer, this.schema) as InferArgument<S>;
		}
		return undefined;
	}

	public static isType(value: unknown): value is XdrConditionalSchema<any, any> {
		return value instanceof XdrConditionalSchema;
	}
}

export class XdrConditional<T = unknown, O extends Record<string, unknown> = Record<string, unknown>> implements IXdrTypeClass<'conditional'> {
	public readonly type = 'conditional';
	private readonly condition: (data: O) => boolean;

	private readonly schema: IXdrPrimitiveCodec<T>;

	public constructor(schema: IXdrPrimitiveCodec<T>, condition: (data: O) => boolean) {
		this.condition = condition;
		this.schema = schema;
	}

	public encode(buffer: IXdrBuffer, object: O, value: T): void {
		if (this.condition(object)) {
			this.schema.encode(buffer, value);
		}
	}

	public decode(buffer: IXdrBuffer, object: O): T | undefined {
		if (this.condition(object)) {
			return this.schema.decode(buffer);
		}
		return undefined;
	}

	public static isType(value: unknown): value is XdrConditional<any, any> {
		return value instanceof XdrConditional;
	}
}
