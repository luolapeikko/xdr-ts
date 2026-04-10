export function getTestSocketFile() {
	if (process.platform === 'win32') {
		return `\\\\.\\pipe\\rpcbind-test`;
	}
	const tmpDir = process.env.TEMP_DIR || '/tmp';
	return `${tmpDir}/rpcbind-test.sock`;
}