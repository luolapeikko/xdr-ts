import {defineConfig} from 'vitest/config';

export default defineConfig({
	plugins: [],
	test: {
		globals: true,
		environment: 'node',
		include: ['**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text'],
			include: ['**/*.ts'],
			exclude: ['**/dist/**'],
		},
		typecheck: {
			include: ['**/*.test-d.ts'],
		},
	},
});
