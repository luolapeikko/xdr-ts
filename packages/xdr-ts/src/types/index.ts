export * from './IXdrBuffer';
export * from './XdrArray';
export * from './XdrConditional';
export * from './XdrSchema';
export * from './XdrSchemaTypes';
export * from './XdrType';

export type RpcProgram = {
	prog: number;
	vers: number;
};

export type RpcProcedure = RpcProgram & {
	proc: number;
};
