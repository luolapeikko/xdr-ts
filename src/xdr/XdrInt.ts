import {IXdrBuffer} from '../types/IXdrBuffer';
import {XdrBase} from './XdrBase';

export class XdrInt extends XdrBase<number> {
	public encode(xdr: IXdrBuffer): void {
		this.assertValue();
		xdr.writeInt(this._value);
	}
	public decode(xdr: IXdrBuffer): void {
		this._value = xdr.readInt();
	}
}
