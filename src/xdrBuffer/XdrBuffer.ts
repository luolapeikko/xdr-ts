import {IXdrBuffer} from '../types/IXdrBuffer';

export class XdrBuffer implements IXdrBuffer {
	private pointer: number;
	private buffer: Buffer;

	constructor(buffer?: Buffer | number) {
		this.pointer = 0;
		this.buffer = Buffer.isBuffer(buffer) ? buffer : Buffer.alloc(buffer || 0);
	}

	public readByte(): number {
		const length = this.ensureBytes(1, true);
		const result = this.buffer[this.pointer];
		this.pointer += length;
		return result;
	}

	public readInt(): number {
		const length = this.ensureBytes(4, true);
		const result = this.buffer.readInt32BE(this.pointer);
		this.pointer += length;
		return result;
	}

	public readUInt(): number {
		const length = this.ensureBytes(4, true);
		const result = this.buffer.readUInt32BE(this.pointer);
		this.pointer += length;
		return result;
	}

	public readShort(): number {
		const length = this.ensureBytes(2, true);
		const result = this.buffer.readInt16BE(this.pointer);
		this.pointer += length;
		return result;
	}

	public readUShort(): number {
		const length = this.ensureBytes(2, true);
		const result = this.buffer.readUInt16BE(this.pointer);
		this.pointer += length;
		return result;
	}

	public readDouble(): bigint {
		const length = this.ensureBytes(8, true);
		const result = this.buffer.readBigInt64BE(this.pointer);
		this.pointer += length;
		return result;
	}

	public readFloat(): number {
		const length = this.ensureBytes(4, true);
		const result = this.buffer.readFloatBE(this.pointer);
		this.pointer += length;
		return result;
	}

	public readFloatDouble(): number {
		const length = this.ensureBytes(8, true);
		const result = this.buffer.readDoubleBE(this.pointer);
		this.pointer += length;
		return result;
	}

	public readIntArray(): number[] {
		const output: number[] = [];
		const count = this.readInt();
		for (let i = 0; i < count; i++) {
			output.push(this.readInt());
		}
		return output;
	}

	public readString(): string {
		return this.readOpaque().toString();
	}

	public readOpaque(): Buffer {
		const length = this.ensureBytes(this.readInt(), true);
		const result = this.buffer.subarray(this.pointer, this.pointer + length);
		this.pointer += length;
		// skip padding
		this.pointer += (4 - (length % 4)) % 4;
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
		return this.writeOpaque(Buffer.from(value, 'utf8'));
	}

	public writeOpaque(data: Buffer): this {
		this.writeInt(this.buffer.length);
		this.ensureBytes(data.length, false);
		data.copy(this.buffer, this.pointer);
		// move pointer and padding
		this.pointer += data.length + 4 - (data.length % 4);
		return this;
	}

	public rewind(): void {
		this.pointer = 0;
	}

	public clear(): void {
		this.pointer = 0;
		this.buffer.fill(0);
	}

	private remainingBytes(): number {
		return this.buffer.length - this.pointer;
	}

	public toString(): string {
		return `XdrBuffer{pointer=${this.pointer}, size=${this.buffer.length}}`;
	}
}
