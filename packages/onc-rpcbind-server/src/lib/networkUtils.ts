import * as os from 'node:os';

export function isIPv6Supported(): boolean {
	return Object.values(os.networkInterfaces())
		.flat()
		.some((iface) => iface?.family === 'IPv6');
}
