import {assertType, describe, expectTypeOf, it} from 'vitest';
import {XdrArray, XdrSchemaArray} from '../src/types/XdrArray';
import {XdrConditional, XdrConditionalSchema} from '../src/types/XdrConditional';
import type {XdrObjectSchemaArrayInput} from '../src/types/XdrObjectSchemaArray';
import {type InferXdrSchemaInputType, XdrSchema} from '../src/types/XdrSchema';
import type {InferArgument, InferXdrInnerSchemaType, XdrInnerSchema} from '../src/types/XdrSchemaTypes';
import {type IXdrPrimitiveCodec, XdrType} from '../src/types/XdrType';

function testInferArgument<
	T extends IXdrPrimitiveCodec<any> | XdrObjectSchemaArrayInput | XdrSchemaArray<any> | XdrArray<any> | XdrConditional<any> | XdrSchema<any>,
>(_schema: T): InferArgument<T> {
	// nothing
	return undefined as InferArgument<T>;
}
function testInferXdrSchema<T extends IXdrPrimitiveCodec | XdrObjectSchemaArrayInput>(_schema: T): InferXdrSchemaInputType<T> {
	// nothing
	return undefined as InferXdrSchemaInputType<T>;
}

function testInferXdrInnerSchema<T extends XdrInnerSchema>(_schema: T): InferXdrInnerSchemaType<T> {
	// nothing
	return undefined as InferXdrInnerSchemaType<T>;
}

const conditional = new XdrConditional(XdrType.String(), () => true);
const conditionalSchema = new XdrConditionalSchema([{name: 'test', type: XdrType.String()}] as const satisfies XdrObjectSchemaArrayInput, () => true);
const rawSchema = [{name: 'test', type: XdrType.String()}] as const satisfies XdrObjectSchemaArrayInput;
const schemaPrimitiveInstance = new XdrSchema(XdrType.String());
const schemaObjectInstance = new XdrSchema(rawSchema);
const primitiveArray = new XdrArray(XdrType.String(), () => true);
const schemaArray = new XdrSchemaArray(rawSchema, () => true);

describe('XdrInfer testing', () => {
	it('InferXdrSchema', () => {
		expectTypeOf(testInferXdrSchema(XdrType.String())).toEqualTypeOf<string>();
		assertType<{test: string}>(testInferXdrSchema(rawSchema));
		expectTypeOf(testInferXdrSchema(rawSchema)).not.toEqualTypeOf<never>();
	});
	describe('XdrInnerSchema', () => {
		it('primitive', () => {
			assertType<string>(testInferXdrInnerSchema({name: 'test', type: XdrType.String()}));
			expectTypeOf(testInferXdrInnerSchema({name: 'test', type: XdrType.String()})).not.toEqualTypeOf<never>();
		});
		it('raw schema', () => {
			assertType<{test: string}>(testInferXdrInnerSchema({name: 'test', type: rawSchema}));
			expectTypeOf(testInferXdrInnerSchema({name: 'test', type: rawSchema})).not.toEqualTypeOf<never>();
		});
		it('schema', () => {
			assertType<{test: string}>(testInferXdrInnerSchema({name: 'test', type: schemaObjectInstance}));
			expectTypeOf(testInferXdrInnerSchema({name: 'test', type: schemaObjectInstance})).not.toEqualTypeOf<never>();
		});
		it('conditional primitive', () => {
			assertType<string | undefined>(testInferXdrInnerSchema({name: 'test', type: conditional}));
			expectTypeOf(testInferXdrInnerSchema({name: 'test', type: conditional})).not.toEqualTypeOf<never>();
		});
		it('conditional schema', () => {
			assertType<{test: string} | undefined>(testInferXdrInnerSchema({name: 'test', type: conditionalSchema}));
			expectTypeOf(testInferXdrInnerSchema({name: 'test', type: conditionalSchema})).not.toEqualTypeOf<never>();
		});
		it('primitive array', () => {
			assertType<string[]>(testInferXdrInnerSchema({name: 'test', type: primitiveArray}));
			expectTypeOf(testInferXdrInnerSchema({name: 'test', type: primitiveArray})).not.toEqualTypeOf<never>();
		});
		it('schema array', () => {
			assertType<{test: string}[]>(testInferXdrInnerSchema({name: 'test', type: schemaArray}));
			expectTypeOf(testInferXdrInnerSchema({name: 'test', type: schemaArray})).not.toEqualTypeOf<never>();
		});
	});
	it('InferArgument', () => {
		it('primitive', () => {
			assertType<string>(testInferArgument(XdrType.String()));
			expectTypeOf(testInferArgument(XdrType.String())).not.toEqualTypeOf<never>();
		});
		it('conditional', () => {
			assertType<string | undefined>(testInferArgument(conditional));
			expectTypeOf(testInferArgument(conditional)).not.toEqualTypeOf<never>();
		});
		it('primitive array', () => {
			assertType<string[]>(testInferArgument(primitiveArray));
			expectTypeOf(testInferArgument(primitiveArray)).not.toEqualTypeOf<never>();
		});
		it('schema array', () => {
			assertType<{test: string}[]>(testInferArgument(schemaArray));
			expectTypeOf(testInferArgument(schemaArray)).not.toEqualTypeOf<never>();
		});
		it('raw schema', () => {
			assertType<{test: string}>(testInferArgument(rawSchema));
			expectTypeOf(testInferArgument(rawSchema)).not.toEqualTypeOf<never>();
		});
		it('schema', () => {
			assertType<{test: string}>(testInferArgument(schemaObjectInstance));
			expectTypeOf(testInferArgument(schemaObjectInstance)).not.toEqualTypeOf<never>();
		});
	});
});
