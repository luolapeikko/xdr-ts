import type {IXdrBuffer} from './IXdrBuffer';
import {decodeXdrObjectSchemaArray, encodeXdrObjectSchemaArray, type XdrObjectSchemaArray, type XdrObjectSchemaArrayInput} from './XdrObjectSchemaArray';
import type {InferArgument, IXdrTypeClass} from './XdrSchemaTypes';
import type {IXdrType} from './XdrType';

type ResolveSize<T> = number | ((data: T) => boolean);

export type ValidXdrSchemaArray<T> = T extends XdrObjectSchemaArray ? T : never;

export class XdrSchemaArray<S extends XdrObjectSchemaArrayInput = XdrObjectSchemaArrayInput> implements IXdrTypeClass<'array'> {
	public readonly type = 'array';
	private readonly schema: S;
	private readonly sizeOrCallback: ResolveSize<InferArgument<S>>;

	public constructor(schema: S, sizeOrCallback: ResolveSize<InferArgument<S>>) {
		this.schema = schema;
		this.sizeOrCallback = sizeOrCallback;
	}

	public encode(buffer: IXdrBuffer, values: InferArgument<S>[]): void {
		for (const value of values) {
			encodeXdrObjectSchemaArray(buffer, this.schema, value as any);
		}
	}

	public decode(buffer: IXdrBuffer): InferArgument<S>[] {
		const values: InferArgument<S>[] = [];
		if (typeof this.sizeOrCallback === 'number') {
			for (let i = 0; i < this.sizeOrCallback; i++) {
				values.push(decodeXdrObjectSchemaArray(buffer, this.schema) as InferArgument<S>);
			}
		} else {
			let more = true;
			while (more) {
				const entry = decodeXdrObjectSchemaArray(buffer, this.schema) as InferArgument<S>;
				more = this.sizeOrCallback(entry);
				values.push(entry);
			}
		}
		return values;
	}

	public static isType(value: unknown): value is XdrSchemaArray<any> {
		return value instanceof XdrSchemaArray;
	}
}

export class XdrArray<T = unknown> implements IXdrTypeClass<'array'> {
	public readonly type = 'array';
	private readonly schema: IXdrType<T>;
	private readonly sizeOrCallback: ResolveSize<T>;

	public constructor(schema: IXdrType<T>, sizeOrCallback: ResolveSize<T>) {
		this.schema = schema;
		this.sizeOrCallback = sizeOrCallback;
	}

	public encode(buffer: IXdrBuffer, values: T[]): void {
		for (const value of values) {
			this.schema.encode(buffer, value);
		}
	}

	public decode(buffer: IXdrBuffer): T[] {
		const values: T[] = [];
		if (typeof this.sizeOrCallback === 'number') {
			for (let i = 0; i < this.sizeOrCallback; i++) {
				values.push(this.schema.decode(buffer));
			}
		} else {
			let more = true;
			while (more) {
				const entry = this.schema.decode(buffer);
				more = this.sizeOrCallback(entry);
				values.push(entry);
			}
		}
		return values;
	}

	public static isType(value: unknown): value is XdrArray<any> {
		return value instanceof XdrArray;
	}
}
