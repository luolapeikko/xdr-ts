import {IXdrBuffer} from '../types/IXdrBuffer';

export abstract class XdrBase<T> {
	protected _value: T | undefined;
	constructor(value?: T) {
		this._value = value;
	}
	public abstract encode(xdr: IXdrBuffer): void;
	public abstract decode(xdr: IXdrBuffer): void;
	get value(): T {
		if (!this._value) {
			throw new TypeError('Value is not set');
		}
		return this._value;
	}
	protected assertValue(): asserts this is {_value: T} {
		if (this._value === undefined) {
			throw new TypeError('Value is not set');
		}
	}
}
