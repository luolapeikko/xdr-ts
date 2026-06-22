export function dropNullishValues<T extends Record<string, unknown>>(options: T): Partial<T> {
	return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== null && value !== undefined)) as Partial<T>;
}
