export class RpcUniversalAddress {
	private static regex = /^(.+)\.(\d{1,3})\.(\d{1,3})$/;
	public static from({host, port}: {host: string; port: number}): string {
		const portHigh = Math.floor(port / 256);
		const portLow = port % 256;
		return `${host}.${portHigh}.${portLow}`;
	}

	public static to(uaddr: string): {host: string; port: number} {
		// use regex to parse the universal address
		const match = RpcUniversalAddress.regex.exec(uaddr);
		if (!match) {
			throw new Error(`Invalid universal address: ${uaddr}`);
		}
		const host = match[1];
		const portHigh = parseInt(match[2], 10);
		const portLow = parseInt(match[3], 10);
		const port = portHigh * 256 + portLow;
		return {host, port};
	}

    private constructor() {
        throw new Error('RpcUniversalAddress is a static utility class and cannot be instantiated');
    }
}
