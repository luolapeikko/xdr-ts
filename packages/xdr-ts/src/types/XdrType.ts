import type {IXdrBuffer} from './IXdrBuffer';

export type IXdrType<T = unknown> = {
	type: 'primitive';
	encode(xdr: IXdrBuffer, value: T): void;
	decode(xdr: IXdrBuffer): T;
};

export type InferXdrType<T extends IXdrType> = T extends IXdrType<infer U> ? U : never;

export class XdrType {
	public static UInt<T extends number>(): IXdrType<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeUInt(value),
			decode: (xdr) => xdr.readUInt<T>(),
		};
	}
	public static Int<T extends number>(): IXdrType<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeInt(value),
			decode: (xdr) => xdr.readInt<T>(),
		};
	}
	public static Short<T extends number>(): IXdrType<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeShort(value),
			decode: (xdr) => xdr.readShort<T>(),
		};
	}
	public static UShort<T extends number>(): IXdrType<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeUShort(value),
			decode: (xdr) => xdr.readUShort<T>(),
		};
	}
	public static Double<T extends bigint>(): IXdrType<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeDouble(value),
			decode: (xdr) => xdr.readDouble<T>(),
		};
	}
	public static Float<T extends number>(): IXdrType<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeFloat(value),
			decode: (xdr) => xdr.readFloat<T>(),
		};
	}
	public static Opaque(): IXdrType<Buffer> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeOpaque(value),
			decode: (xdr) => xdr.readOpaque(),
		};
	}

	public static Boolean(schema: IXdrType<number>): IXdrType<boolean> {
		return {
			type: 'primitive',
			encode: (xdr, value) => schema.encode(xdr, value ? 1 : 0),
			decode: (xdr) => schema.decode(xdr) === 1,
		};
	}

	public static String<T extends string = string>(): IXdrType<T> {
		return {
			type: 'primitive',
			encode: (xdr, value) => xdr.writeString(value),
			decode: (xdr) => xdr.readString(),
		};
	}

	public static isXdrType(value: unknown): value is IXdrType {
		return typeof value === 'object' && value !== null && 'type' in value && value.type === 'primitive';
	}
}
