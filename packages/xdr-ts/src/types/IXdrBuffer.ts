export interface IXdrBuffer {
	rawBuffer: Buffer;
	currentPointer: number;
	sliceUsed(): Buffer;
	// read methods
	readByte(): number;
	readInt<T extends number = number>(): T;
	readUInt<T extends number = number>(): T;
	readShort<T extends number = number>(): T;
	readUShort<T extends number = number>(): T;
	readDouble<T extends bigint = bigint>(): T;
	readFloat<T extends number = number>(): T;
	readFloatDouble(): number;
	readIntArray(): number[];
	readFixedArray<T>(length: number, reader: (buffer: IXdrBuffer) => T): T[];
	readOpaque(): Buffer;
	readString<T extends string = string>(): T;
	readBoolean(boolReader?: (buffer: IXdrBuffer) => boolean | number): boolean;
	readBoolean<T>(itemReader: (buffer: IXdrBuffer) => T, boolReader?: (buffer: IXdrBuffer) => boolean | number): T | undefined;
	/**
	 * Reads dynamic list of items, where first item is boolean flag for next item.
	 */
	readList<T>(itemReader: (buffer: IXdrBuffer) => T, boolReader?: (buffer: IXdrBuffer) => boolean | number): T[];
	// write methods
	writeByte(value: number): this;
	writeInt(value: number): this;
	writeUInt(value: number): this;
	writeShort(value: number): this;
	writeUShort(value: number): this;
	writeDouble(value: bigint): this;
	writeFloat(value: number): this;
	writeFloatDouble(value: number): this;
	writeOpaque(value: Buffer): this;
	writeString(value: string): this;
	writeBoolean(value: boolean, flagWriter?: (buffer: IXdrBuffer, val: boolean) => void): this;
	writeOptional<T>(
		value: T | undefined | null,
		itemWriter: (buffer: IXdrBuffer, val: T) => void,
		flagWriter?: (buffer: IXdrBuffer, val: boolean) => void,
	): this;
	writeList<T>(items: T[], itemWriter: (buffer: IXdrBuffer, item: T) => void, flagWriter?: (buffer: IXdrBuffer, val: boolean) => void): this;
	size(): number;
	rewind(): void;
}
