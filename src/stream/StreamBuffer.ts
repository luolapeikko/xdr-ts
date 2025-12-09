export class ReadStreamBuffer {
	private pointer: number;
	private buffer: Buffer;
	constructor(buffer: Buffer) {
		this.pointer = 0;
		this.buffer = buffer;
	}

	public readInt32(): number {
		const result = this.buffer.readInt32BE(this.pointer);
		this.pointer += 4;
		return result;
	}

	public readUInt32(): number {
		const result = this.buffer.readUInt32BE(this.pointer);
		this.pointer += 4;
		return result;
	}
}
