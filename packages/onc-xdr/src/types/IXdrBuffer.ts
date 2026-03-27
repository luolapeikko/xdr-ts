export interface IXdrBuffer<B extends Uint8Array = Uint8Array> {
	rawBuffer: B;
	currentPointer: number;
	sliceUsed(): B;
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
	readFixedArray<T>(length: number, reader: (buffer: IXdrBuffer<B>) => T): T[];
	readOpaque(): B;
	readString<T extends string = string>(): T;
	readBoolean(boolReader?: (buffer: IXdrBuffer<B>) => boolean | number): boolean;
	readBoolean<T>(itemReader: (buffer: IXdrBuffer<B>) => T, boolReader?: (buffer: IXdrBuffer<B>) => boolean | number): T | undefined;
	/**
	 * Reads dynamic list of items, where first item is boolean flag for next item.
	 */
	readList<T>(itemReader: (buffer: IXdrBuffer<B>) => T, boolReader?: (buffer: IXdrBuffer<B>) => boolean | number): T[];
	// write methods
	writeByte(value: number): this;
	writeInt(value: number): this;
	writeUInt(value: number): this;
	writeShort(value: number): this;
	writeUShort(value: number): this;
	writeDouble(value: bigint): this;
	writeFloat(value: number): this;
	writeFloatDouble(value: number): this;
	writeOpaque(value: B): this;
	writeString(value: string): this;
	writeBoolean(value: boolean, flagWriter?: (buffer: IXdrBuffer<B>, val: boolean) => void): this;
	writeOptional<T>(
		value: T | undefined | null,
		itemWriter: (buffer: IXdrBuffer<B>, val: T) => void,
		flagWriter?: (buffer: IXdrBuffer<B>, val: boolean) => void,
	): this;
	writeList<T>(items: T[], itemWriter: (buffer: IXdrBuffer<B>, item: T) => void, flagWriter?: (buffer: IXdrBuffer<B>, val: boolean) => void): this;
	writeFixedArray<T>(length: number, value: T[], writer: (buffer: IXdrBuffer<B>, value: T) => void): this;
	size(): number;
	rewind(): void;
}
