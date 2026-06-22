import type {IXdrBuffer} from '@luolapeikko/onc-xdr';

export abstract class AbstractRpcServer<B extends Uint8Array> {
	public abstract createXdrBuffer(initialize?: number | B): IXdrBuffer<B>;

	protected abstract handleRequest(data: B): Promise<Buffer<ArrayBufferLike>>;
}
