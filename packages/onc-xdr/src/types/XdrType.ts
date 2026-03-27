import type {IXdrBuffer} from './IXdrBuffer';

export interface IXdrCodec<O = unknown, I extends O = O> {
	encode(xdr: IXdrBuffer, value: I): IXdrBuffer;
	decode(xdr: IXdrBuffer): O;
}

export type InferXdrCodecOutput<T> = T extends IXdrCodec<infer U> ? U : never;
export type InferXdrCodecInput<T> = T extends IXdrCodec<any, infer I> ? I : never;

export interface IXdrPrimitiveCodec<T = unknown> extends IXdrCodec<T> {
	type: 'primitive';
}

export interface IXdrTypeClass<K extends string, O, I extends O = O> extends IXdrCodec<O, I> {
	type: K;
}

export type InferXdrCodec<T extends IXdrCodec> = T extends IXdrCodec<infer U> ? U : never;

export class XdrType {
	public static get uint(): IXdrPrimitiveCodec<number> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeUInt(value),
			decode: (xdr) => xdr.readUInt(),
		};
	}
	public static UInt<T extends number>(): IXdrPrimitiveCodec<T> {
		return XdrType.uint as IXdrPrimitiveCodec<T>;
	}

	public static get int(): IXdrPrimitiveCodec<number> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeInt(value),
			decode: (xdr) => xdr.readInt(),
		};
	}
	public static Int<T extends number>(): IXdrPrimitiveCodec<T> {
		return XdrType.int as IXdrPrimitiveCodec<T>;
	}

	public static get short(): IXdrPrimitiveCodec<number> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeShort(value),
			decode: (xdr) => xdr.readShort(),
		};
	}
	public static Short<T extends number>(): IXdrPrimitiveCodec<T> {
		return XdrType.short as IXdrPrimitiveCodec<T>;
	}

	public static get ushort(): IXdrPrimitiveCodec<number> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeUShort(value),
			decode: (xdr) => xdr.readUShort(),
		};
	}
	public static UShort<T extends number>(): IXdrPrimitiveCodec<T> {
		return XdrType.ushort as IXdrPrimitiveCodec<T>;
	}

	public static get double(): IXdrPrimitiveCodec<bigint> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeDouble(value),
			decode: (xdr) => xdr.readDouble(),
		};
	}
	public static Double<T extends bigint>(): IXdrPrimitiveCodec<T> {
		return XdrType.double as IXdrPrimitiveCodec<T>;
	}

	public static get float(): IXdrPrimitiveCodec<number> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeFloat(value),
			decode: (xdr) => xdr.readFloat(),
		};
	}
	public static Float<T extends number>(): IXdrPrimitiveCodec<T> {
		return XdrType.float as IXdrPrimitiveCodec<T>;
	}

	public static get opaque(): IXdrPrimitiveCodec<Uint8Array> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeOpaque(value),
			decode: (xdr) => xdr.readOpaque(),
		};
	}
	public static Opaque<T extends Uint8Array = Uint8Array>(): IXdrPrimitiveCodec<T> {
		return XdrType.opaque as IXdrPrimitiveCodec<T>;
	}

	public static get boolean(): IXdrPrimitiveCodec<boolean> {
		return {
			type: 'primitive',
			encode: (xdr, value) => XdrType.uint.encode(xdr, value ? 1 : 0),
			decode: (xdr) => XdrType.uint.decode(xdr) === 1,
		};
	}
	public static Boolean<T extends boolean>(): IXdrPrimitiveCodec<T> {
		return XdrType.boolean as IXdrPrimitiveCodec<T>;
	}

	public static get string(): IXdrPrimitiveCodec<string> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeString(value),
			decode: (xdr) => xdr.readString(),
		};
	}
	public static String<T extends string = string>(): IXdrPrimitiveCodec<T> {
		return XdrType.string as IXdrPrimitiveCodec<T>;
	}

	public static isXdrType(value: unknown): value is IXdrPrimitiveCodec {
		return typeof value === 'object' && value !== null && 'type' in value && value.type === 'primitive';
	}
}
