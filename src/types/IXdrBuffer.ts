export interface IXdrBuffer {
	// read methods
	readByte(): number;
	readInt(): number;
	readUInt(): number;
	readShort(): number;
	readUShort(): number;
	readDouble(): bigint;
	readFloat(): number;
	readFloatDouble(): number;
	readIntArray(): number[];
	// write methods
	writeByte(value: number): this;
	writeInt(value: number): this;
	writeUInt(value: number): this;
	writeShort(value: number): this;
	writeUShort(value: number): this;
	writeDouble(value: bigint): this;
	writeFloat(value: number): this;
	writeFloatDouble(value: number): this;
}
