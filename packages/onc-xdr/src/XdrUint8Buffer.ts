import type {IXdrBuffer} from './types/IXdrBuffer';

export class XdrUint8Buffer implements IXdrBuffer<Uint8Array> {
	private pointer: number;
	private buffer: Uint8Array;
	private readonly textEncoder = new TextEncoder();
	private readonly textDecoder = new TextDecoder();

	public constructor(buffer?: Uint8Array | number) {
		this.pointer = 0;
		this.buffer = buffer instanceof Uint8Array ? buffer : this.allocate(buffer || 0);
	}

	public get currentPointer(): number {
		return this.pointer;
	}

	public get rawBuffer(): Uint8Array {
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
		const result = this.view().getInt32(this.pointer, false);
		this.pointer += length;
		return result as T;
	}

	public readUInt<T extends number = number>(): T {
		const length = this.ensureBytes(4, true);
		const result = this.view().getUint32(this.pointer, false);
		this.pointer += length;
		return result as T;
	}

	public readShort<T extends number = number>(): T {
		const length = this.ensureBytes(2, true);
		const result = this.view().getInt16(this.pointer, false);
		this.pointer += length;
		return result as T;
	}

	public readUShort<T extends number = number>(): T {
		const length = this.ensureBytes(2, true);
		const result = this.view().getUint16(this.pointer, false);
		this.pointer += length;
		return result as T;
	}

	public readDouble<T extends bigint = bigint>(): T {
		const length = this.ensureBytes(8, true);
		const result = this.view().getBigInt64(this.pointer, false);
		this.pointer += length;
		return result as T;
	}

	public readFloat<T extends number = number>(): T {
		const length = this.ensureBytes(4, true);
		const result = this.view().getFloat32(this.pointer, false);
		this.pointer += length;
		return result as T;
	}

	public readFloatDouble(): number {
		const length = this.ensureBytes(8, true);
		const result = this.view().getFloat64(this.pointer, false);
		this.pointer += length;
		return result;
	}

	public readIntArray(): number[] {
		const count = this.readInt();
		return this.readFixedArray(count, (x) => x.readInt());
	}

	public readFixedArray<T>(length: number, reader: (buffer: IXdrBuffer<Uint8Array>) => T): T[] {
		const output: T[] = [];
		for (let i = 0; i < length; i++) {
			output.push(reader(this));
		}
		return output;
	}

	public readOpaque(): Uint8Array {
		return this.readOpaqueInternal();
	}

	private readOpaqueInternal(): Uint8Array {
		const length = this.readInt();
		this.ensureBytes(length, true);
		const result = this.buffer.subarray(this.pointer, this.pointer + length);
		this.pointer += length;
		const padding = (4 - (length % 4)) % 4;
		this.pointer += padding;
		return result;
	}

	public readString<T extends string = string>(): T {
		return this.textDecoder.decode(this.readOpaqueInternal()) as T;
	}

	public readBoolean(booleanReader?: (buffer: IXdrBuffer<Uint8Array>) => boolean | number): boolean {
		const actualReader = booleanReader || ((x) => x.readUInt());
		return !!actualReader(this);
	}

	public readOptional<T>(itemReader: (buffer: IXdrBuffer<Uint8Array>) => T, boolReader?: (buffer: IXdrBuffer<Uint8Array>) => boolean | number): T | undefined {
		if (this.readBoolean(boolReader)) {
			return itemReader(this);
		}
		return undefined;
	}

	public readList<T>(itemReader: (buffer: IXdrBuffer<Uint8Array>) => T, boolReader?: (buffer: IXdrBuffer<Uint8Array>) => boolean | number): T[] {
		const output: T[] = [];
		while (this.readBoolean(boolReader)) {
			output.push(itemReader(this));
		}
		return output;
	}

	public writeByte(value: number): this {
		this.ensureBytes(1, false);
		this.buffer[this.pointer] = value;
		this.pointer += 1;
		return this;
	}

	public writeInt(value: number): this {
		this.ensureBytes(4, false);
		this.view().setInt32(this.pointer, value, false);
		this.pointer += 4;
		return this;
	}

	public writeUInt(value: number): this {
		this.ensureBytes(4, false);
		this.view().setUint32(this.pointer, value, false);
		this.pointer += 4;
		return this;
	}

	public writeShort(value: number): this {
		this.ensureBytes(2, false);
		this.view().setInt16(this.pointer, value, false);
		this.pointer += 2;
		return this;
	}

	public writeUShort(value: number): this {
		this.ensureBytes(2, false);
		this.view().setUint16(this.pointer, value, false);
		this.pointer += 2;
		return this;
	}

	public writeDouble(value: bigint): this {
		this.ensureBytes(8, false);
		this.view().setBigInt64(this.pointer, value, false);
		this.pointer += 8;
		return this;
	}

	public writeFloat(value: number): this {
		this.ensureBytes(4, false);
		this.view().setFloat32(this.pointer, value, false);
		this.pointer += 4;
		return this;
	}

	public writeFloatDouble(value: number): this {
		this.ensureBytes(8, false);
		this.view().setFloat64(this.pointer, value, false);
		this.pointer += 8;
		return this;
	}

	public writeOpaque(value: Uint8Array): this {
		return this.writeOpaqueInternal(value);
	}

	private writeOpaqueInternal(value: Uint8Array): this {
		const length = value.length;
		this.writeInt(length);
		this.ensureBytes(length, false);
		this.buffer.set(value, this.pointer);
		this.pointer += length;
		const padding = (4 - (length % 4)) % 4;
		if (padding > 0) {
			this.ensureBytes(padding, false);
			this.buffer.fill(0, this.pointer, this.pointer + padding);
			this.pointer += padding;
		}
		return this;
	}

	public writeString(value: string): this {
		return this.writeOpaqueInternal(this.fromString(value));
	}

	public writeBoolean(value: boolean, flagWriter?: (buffer: IXdrBuffer<Uint8Array>, val: boolean) => void): this {
		const actualWriter = flagWriter || ((x, v) => x.writeUInt(v ? 1 : 0));
		actualWriter(this, value);
		return this;
	}

	public writeOptional<T>(
		value: T | undefined | null,
		itemWriter: (buffer: IXdrBuffer<Uint8Array>, val: T) => void,
		flagWriter?: (buffer: IXdrBuffer<Uint8Array>, val: boolean) => void,
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
		itemWriter: (buffer: IXdrBuffer<Uint8Array>, item: T) => void,
		flagWriter?: (buffer: IXdrBuffer<Uint8Array>, val: boolean) => void,
	): this {
		for (const item of items) {
			this.writeBoolean(true, flagWriter);
			itemWriter(this, item);
		}
		this.writeBoolean(false, flagWriter);
		return this;
	}

	public writeFixedArray<T>(length: number, value: T[], writer: (buffer: IXdrBuffer<Uint8Array>, value: T) => void): this {
		if (value.length !== length) {
			throw new Error(`Array length ${value.length} does not match expected length ${length}`);
		}
		for (const item of value) {
			writer(this, item);
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

	public sliceUsed(): Uint8Array {
		return this.clone(this.buffer.subarray(0, this.pointer));
	}

	public toString(): string {
		return `XdrUint8Buffer{pointer=${this.pointer}, size=${this.buffer.length}}`;
	}

	private view(): DataView {
		return new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
	}

	private ensureBytes(length: number, isRead: boolean): number {
		if (isRead) {
			if (this.remainingBytes() < length) {
				throw new Error('xdr buffer too short');
			}
		} else if (this.pointer + length > this.buffer.length) {
			const newBuffer = this.allocate(this.buffer.length + length);
			newBuffer.set(this.buffer);
			this.buffer = newBuffer;
		}
		return length;
	}

	private remainingBytes(): number {
		return this.buffer.length - this.pointer;
	}

	private allocate(length: number): Uint8Array {
		return new Uint8Array(length);
	}

	private clone(value: Uint8Array): Uint8Array {
		return Uint8Array.from(value);
	}

	private fromString(value: string): Uint8Array {
		return this.textEncoder.encode(value);
	}
}
