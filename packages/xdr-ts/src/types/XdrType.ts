import type {IXdrBuffer} from './IXdrBuffer';

export interface IXdrCodec<O = unknown, I extends O = O> {
	encode(xdr: IXdrBuffer, value: I): void;
	decode(xdr: IXdrBuffer): O;
}

export interface IXdrPrimitiveCodec<T = unknown> extends IXdrCodec<T> {
	type: 'primitive';
}

export interface IXdrTypeClass<K extends string, O, I extends O = O> extends IXdrCodec<O, I> {
	type: K;
}

export type InferXdrCodec<T extends IXdrCodec> = T extends IXdrCodec<infer U> ? U : never;

export class XdrType {
	public static UInt<T extends number>(): IXdrPrimitiveCodec<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeUInt(value),
			decode: (xdr) => xdr.readUInt<T>(),
		};
	}
	public static Int<T extends number>(): IXdrPrimitiveCodec<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeInt(value),
			decode: (xdr) => xdr.readInt<T>(),
		};
	}
	public static Short<T extends number>(): IXdrPrimitiveCodec<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeShort(value),
			decode: (xdr) => xdr.readShort<T>(),
		};
	}
	public static UShort<T extends number>(): IXdrPrimitiveCodec<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeUShort(value),
			decode: (xdr) => xdr.readUShort<T>(),
		};
	}
	public static Double<T extends bigint>(): IXdrPrimitiveCodec<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeDouble(value),
			decode: (xdr) => xdr.readDouble<T>(),
		};
	}
	public static Float<T extends number>(): IXdrPrimitiveCodec<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeFloat(value),
			decode: (xdr) => xdr.readFloat<T>(),
		};
	}
	public static Opaque(): IXdrPrimitiveCodec<Buffer> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeOpaque(value),
			decode: (xdr) => xdr.readOpaque(),
		};
	}

	public static Boolean(schema: IXdrPrimitiveCodec<number>): IXdrPrimitiveCodec<boolean> {
		return {
			type: 'primitive',
			encode: (xdr, value) => schema.encode(xdr, value ? 1 : 0),
			decode: (xdr) => schema.decode(xdr) === 1,
		};
	}

	public static String<T extends string = string>(): IXdrPrimitiveCodec<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeString(value),
			decode: (xdr) => xdr.readString(),
		};
	}

	public static isXdrType(value: unknown): value is IXdrPrimitiveCodec {
		return typeof value === 'object' && value !== null && 'type' in value && value.type === 'primitive';
	}
}
