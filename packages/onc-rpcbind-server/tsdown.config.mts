import {defineConfig} from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    deps: {
        neverBundle: ['ws'],
    },
    tsconfig: 'tsconfig.build.json',
});
