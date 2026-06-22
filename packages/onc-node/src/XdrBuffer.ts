import type {IXdrBuffer} from '@luolapeikko/onc-xdr';

export class XdrBuffer implements IXdrBuffer<Buffer> {
	private pointer: number;
	private buffer: Buffer;

	public constructor(buffer?: Buffer | number) {
		this.pointer = 0;
		this.buffer = Buffer.isBuffer(buffer) ? buffer : Buffer.alloc(buffer || 0);
	}

	public get currentPointer(): number {
		return this.pointer;
	}

	public get rawBuffer(): Buffer {
		return this.buffer;
	}

	public readByte(): number {
		const length = this.ensureBytes(1, true);
		const result = this.buffer[this.pointer];
		this.pointer += length;
		return result;
	}

	public readInt<T extends number = number>(): T {
		const length = this.ensureBytes(4, true);
		const result = this.buffer.readInt32BE(this.pointer);
		this.pointer += length;
		return result as T;
	}

	public readUInt<T extends number = number>(): T {
		const length = this.ensureBytes(4, true);
		const result = this.buffer.readUInt32BE(this.pointer);
		this.pointer += length;
		return result as T;
	}

	public readShort<T extends number = number>(): T {
		const length = this.ensureBytes(2, true);
		const result = this.buffer.readInt16BE(this.pointer);
		this.pointer += length;
		return result as T;
	}

	public readUShort<T extends number = number>(): T {
		const length = this.ensureBytes(2, true);
		const result = this.buffer.readUInt16BE(this.pointer);
		this.pointer += length;
		return result as T;
	}

	public readDouble<T extends bigint = bigint>(): T {
		const length = this.ensureBytes(8, true);
		const result = this.buffer.readBigInt64BE(this.pointer);
		this.pointer += length;
		return result as T;
	}

	public readFloat<T extends number = number>(): T {
		const length = this.ensureBytes(4, true);
		const result = this.buffer.readFloatBE(this.pointer);
		this.pointer += length;
		return result as T;
	}

	public readFloatDouble(): number {
		const length = this.ensureBytes(8, true);
		const result = this.buffer.readDoubleBE(this.pointer);
		this.pointer += length;
		return result;
	}

	public readIntArray(): number[] {
		const count = this.readInt();
		return this.readFixedArray(count, (x) => x.readInt());
	}

	public readFixedArray<T>(length: number, reader: (buffer: IXdrBuffer<Buffer>) => T): T[] {
		const output: T[] = [];
		for (let i = 0; i < length; i++) {
			output.push(reader(this));
		}
		return output;
	}

	public readString<T extends string = string>(): T {
		return this.readWithPadding().toString() as T;
	}

	public readBoolean(booleanReader?: (buffer: IXdrBuffer<Buffer>) => boolean | number): boolean {
		const actualReader = booleanReader || ((x) => x.readUInt());
		return !!actualReader(this);
	}

	public readOptional<T>(itemReader: (buffer: IXdrBuffer<Buffer>) => T, booleanReader?: (buffer: IXdrBuffer<Buffer>) => boolean | number): T | undefined {
		if (this.readBoolean(booleanReader)) {
			return itemReader(this);
		}
		return undefined;
	}

	public readList<T>(itemReader: (buffer: IXdrBuffer<Buffer>) => T, booleanReader?: (buffer: IXdrBuffer<Buffer>) => boolean | number): T[] {
		const output: T[] = [];
		while (this.readBoolean(booleanReader)) {
			output.push(itemReader(this));
		}
		return output;
	}

	public readOpaque(): Buffer {
		return this.readWithPadding();
	}

	private readWithPadding(): Buffer {
		const length = this.readInt();
		this.ensureBytes(length, true);
		const result = this.buffer.subarray(this.pointer, this.pointer + length);
		this.pointer += length;
		const padding = (4 - (length % 4)) % 4;
		this.pointer += padding;
		return result;
	}

	private ensureBytes(length: number, isRead: boolean): number {
		if (isRead) {
			if (this.remainingBytes() < length) {
				throw new Error('xdr buffer too short');
			}
		} else {
			// check that we have enough space on current buffer
			if (this.pointer + length > this.buffer.length) {
				const newBuffer = Buffer.alloc(this.buffer.length + length);
				this.buffer.copy(newBuffer);
				this.buffer = newBuffer;
			}
		}
		return length;
	}

	public writeByte(value: number): this {
		this.ensureBytes(1, false);
		this.buffer.writeUInt8(value, this.pointer);
		this.pointer += 1;
		return this;
	}

	public writeInt(value: number): this {
		this.ensureBytes(4, false);
		this.buffer.writeInt32BE(value, this.pointer);
		this.pointer += 4;
		return this;
	}

	public writeUInt(value: number): this {
		this.ensureBytes(4, false);
		this.buffer.writeUInt32BE(value, this.pointer);
		this.pointer += 4;
		return this;
	}

	public writeShort(value: number): this {
		this.ensureBytes(2, false);
		this.buffer.writeInt16BE(value, this.pointer);
		this.pointer += 2;
		return this;
	}

	public writeUShort(value: number): this {
		this.ensureBytes(2, false);
		this.buffer.writeUInt16BE(value, this.pointer);
		this.pointer += 2;
		return this;
	}

	public writeDouble(value: bigint): this {
		this.ensureBytes(8, false);
		this.buffer.writeBigInt64BE(value, this.pointer);
		this.pointer += 8;
		return this;
	}

	public writeFloat(value: number): this {
		this.ensureBytes(4, false);
		this.buffer.writeFloatBE(value, this.pointer);
		this.pointer += 4;
		return this;
	}

	public writeFloatDouble(value: number): this {
		this.ensureBytes(8, false);
		this.buffer.writeDoubleBE(value, this.pointer);
		this.pointer += 8;
		return this;
	}

	public writeString(value: string): this {
		return this.writeWithPadding(Buffer.from(value, 'utf8'));
	}

	public writeBoolean(value: boolean, flagWriter?: (buffer: IXdrBuffer<Buffer>, val: boolean) => void): this {
		const actualWriter = flagWriter || ((x, v) => x.writeUInt(v ? 1 : 0));
		actualWriter(this, value);
		return this;
	}

	public writeOptional<T>(
		value: T | undefined | null,
		itemWriter: (buffer: IXdrBuffer<Buffer>, val: T) => void,
		flagWriter?: (buffer: IXdrBuffer<Buffer>, val: boolean) => void,
	): this {
		const isPresent = value !== undefined && value !== null && (typeof value !== 'boolean' || value === true);
		this.writeBoolean(isPresent, flagWriter);
		if (isPresent) {
			itemWriter(this, value as T);
		}
		return this;
	}

	public writeList<T>(
		items: T[],
		itemWriter: (buffer: IXdrBuffer<Buffer>, item: T) => void,
		flagWriter?: (buffer: IXdrBuffer<Buffer>, val: boolean) => void,
	): this {
		for (const item of items) {
			this.writeBoolean(true, flagWriter);
			itemWriter(this, item);
		}
		this.writeBoolean(false, flagWriter);
		return this;
	}

	public writeFixedArray<T>(length: number, value: T[], writer: (buffer: IXdrBuffer<Buffer>, value: T) => void): this {
		if (value.length !== length) {
			throw new Error(`Array length ${value.length} does not match expected length ${length}`);
		}
		for (const item of value) {
			writer(this, item);
		}
		return this;
	}

	public writeOpaque(data: Uint8Array): this {
		return this.writeWithPadding(data);
	}

	private writeWithPadding(data: Uint8Array): this {
		const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
		const length = data.length;
		this.writeInt(length);
		this.ensureBytes(length, false);
		chunk.copy(this.buffer, this.pointer);
		this.pointer += length;
		const padding = (4 - (length % 4)) % 4;
		if (padding > 0) {
			this.ensureBytes(padding, false);
			this.buffer.fill(0, this.pointer, this.pointer + padding);
			this.pointer += padding;
		}
		return this;
	}

	public rewind(): void {
		this.pointer = 0;
	}

	public clear(): void {
		this.pointer = 0;
		this.buffer.fill(0);
	}

	public size(): number {
		return this.buffer.length;
	}

	private remainingBytes(): number {
		return this.buffer.length - this.pointer;
	}

	public toString(): string {
		return `XdrBuffer{pointer=${this.pointer}, size=${this.buffer.length}}`;
	}

	public sliceUsed(): Buffer {
		return Buffer.from(this.buffer.subarray(0, this.pointer));
	}
}
