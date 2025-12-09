import 'mocha';
import * as chai from 'chai';
import {XdrBuffer, XdrInt} from '../src/';

const expect = chai.expect;

describe('Test', function () {
	describe('Test', function () {
		it('should', function () {
			const xdr = new XdrBuffer(Buffer.from([0x0, 0x0, 0x0, 0x11])); // big endian encoded 17
			expect(xdr.readInt()).to.equal(17);
			expect(xdr.toString()).to.equal('XdrBuffer{pointer=4, size=4}');
			const write = new XdrBuffer(4);
			expect(write.toString()).to.equal('XdrBuffer{pointer=0, size=4}');
			write.writeInt(17);
			expect(write.toString()).to.equal('XdrBuffer{pointer=4, size=4}');
		});
	});
	describe('Test', function () {
		it('should', function () {
			const buffer = new XdrBuffer();
			expect(buffer.toString()).to.equal('XdrBuffer{pointer=0, size=0}');
			const value = new XdrInt(17);
			value.encode(buffer);
			expect(buffer.toString()).to.equal('XdrBuffer{pointer=4, size=4}');
			buffer.rewind();
			expect(buffer.toString()).to.equal('XdrBuffer{pointer=0, size=4}');
			const readValue = new XdrInt();
			readValue.decode(buffer);
			expect(readValue.value).to.equal(17);
			expect(buffer.toString()).to.equal('XdrBuffer{pointer=4, size=4}');
		});
	});
});
