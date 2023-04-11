export type Not<T extends boolean> = T extends true ? false : true
export type Or<Types extends boolean[]> = Types[number] extends false ? false : true
export type And<Types extends boolean[]> = Types[number] extends true ? true : false
export type Eq<Left extends boolean, Right extends boolean> = Left extends true ? Right : Not<Right>
export type Xor<Types extends [boolean, boolean]> = Not<Eq<Types[0], Types[1]>>

const secret = Symbol('secret')
type Secret = typeof secret

export type IsNever<T> = [T] extends [never] ? true : false
export type IsAny<T> = [T] extends [Secret] ? Not<IsNever<T>> : false
export type IsUnknown<T> = [unknown] extends [T] ? Not<IsAny<T>> : false
export type IsNeverOrAny<T> = Or<[IsNever<T>, IsAny<T>]>
export type IsEmptyObject<T> = And<[Extends<T, {}>, Extends<{}, T>, IsNever<keyof T>]>

export type PrintType<T> = IsUnknown<T> extends true
  ? 'unknown'
  : IsNever<T> extends true
  ? 'never'
  : IsAny<T> extends true
  ? never // special case, can't use `'any'` because that would match `any`
  : T extends string
  ? string extends T
    ? 'string'
    : `string: ${T}`
  : T extends number
  ? number extends T
    ? 'number'
    : `number: ${T}`
  : T extends boolean
  ? boolean extends T
    ? 'boolean'
    : `boolean: ${T}`
  : T extends null
  ? 'null'
  : T extends undefined
  ? 'undefined'
  : T extends (...args: any[]) => any
  ? 'function'
  : T extends void
  ? 'void'
  : T extends []
  ? '[]'
  : IsEmptyObject<T> extends true
  ? '{}'
  : '...'

// Helper for showing end-user a hint why their type assertion is failing.
// This swaps "leaf" types with a literal message about what the actual and expected types are.
// Needs to check for Not<IsAny<Actual>> because otherwise LeafTypeOf<Actual> returns never, which extends everything 🤔
export type MismatchInfo<Actual, Expected> = And<[Extends<PrintType<Actual>, '...'>, Not<IsAny<Actual>>]> extends true
  ? {
      [K in keyof Actual | keyof Expected]: MismatchInfo<
        K extends keyof Actual ? Actual[K] : never,
        K extends keyof Expected ? Expected[K] : never
      >
    }
  : Equal<Actual, Expected> extends true
  ? Actual
  : `Expected: ${PrintType<Expected>}, Actual: ${PrintType<Actual>}`

export type RequiredKeys<T> = Extract<
  {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K
  }[keyof T],
  keyof T
>
export type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>

// adapted from some answers to https://github.com/type-challenges/type-challenges/issues?q=label%3A5+label%3Aanswer
// prettier-ignore
export type ReadonlyKeys<T> = Extract<{
  [K in keyof T]-?: ReadonlyEquivalent<
    {[_K in K]: T[K]},
    {-readonly [_K in K]: T[K]}
  > extends true ? never : K;
}[keyof T], keyof T>;

// prettier-ignore
type ReadonlyEquivalent<X, Y> = Extends<
  (<T>() => T extends X ? true : false),
  (<T>() => T extends Y ? true : false)
>

export type Extends<L, R> = IsNever<L> extends true ? IsNever<R> : [L] extends [R] ? true : false
export type StrictExtends<L, R> = Extends<PrintProps<L>, PrintProps<R>>

export type Equal<Left, Right> = And<[StrictExtends<Left, Right>, StrictExtends<Right, Left>]>

export type Params<Actual> = Actual extends (...args: infer P) => any ? P : never
export type ConstructorParams<Actual> = Actual extends new (...args: infer P) => any
  ? Actual extends new () => any
    ? P | []
    : P
  : never

type MismatchArgs<B extends boolean, C extends boolean> = Eq<B, C> extends true ? [] : [never]

export interface ExpectTypeOf<Actual, B extends boolean> {
  toBeAny: (...MISMATCH: MismatchArgs<IsAny<Actual>, B>) => true
  toBeUnknown: (...MISMATCH: MismatchArgs<IsUnknown<Actual>, B>) => true
  toBeNever: (...MISMATCH: MismatchArgs<IsNever<Actual>, B>) => true
  toBeFunction: (...MISMATCH: MismatchArgs<Extends<Actual, (...args: any[]) => any>, B>) => true
  toBeObject: (...MISMATCH: MismatchArgs<Extends<Actual, object>, B>) => true
  toBeArray: (...MISMATCH: MismatchArgs<Extends<Actual, any[]>, B>) => true
  toBeNumber: (...MISMATCH: MismatchArgs<Extends<Actual, number>, B>) => true
  toBeString: (...MISMATCH: MismatchArgs<Extends<Actual, string>, B>) => true
  toBeBoolean: (...MISMATCH: MismatchArgs<Extends<Actual, boolean>, B>) => true
  toBeVoid: (...MISMATCH: MismatchArgs<Extends<Actual, void>, B>) => true
  toBeSymbol: (...MISMATCH: MismatchArgs<Extends<Actual, symbol>, B>) => true
  toBeNull: (...MISMATCH: MismatchArgs<Extends<Actual, null>, B>) => true
  toBeUndefined: (...MISMATCH: MismatchArgs<Extends<Actual, undefined>, B>) => true
  toBeNullable: (...MISMATCH: MismatchArgs<Not<Equal<Actual, NonNullable<Actual>>>, B>) => true
  toExtend: <
    Expected extends B extends true
      ? Extends<Actual, Expected> extends true
        ? unknown
        : MismatchInfo<Actual, Expected>
      : unknown,
  >(
    ...MISMATCH: MismatchArgs<Extends<Actual, Expected>, B>
  ) => true
  toBeIdenticalTo: <
    Expected extends B extends true
      ? Equal<Actual, Expected> extends true
        ? unknown
        : MismatchInfo<Actual, Expected>
      : unknown,
  >(
    ...MISMATCH: MismatchArgs<Equal<Actual, Expected>, B>
  ) => true

  toMatchTypeOf: {
    /**
     * @deprecated Use `toExtend` instead. Note that `toExtend` doesn't support passing a value, because supporting
     * them triggers typescript interence which makes error messages less helpful - if you need that, please raise
     * an issue on this library's github repo. This method may be removed or become an alias of `toExtend` in a future version.
     *
     * To switch, you can change:
     * @example
     * // before:
     * expectTypeOf(foo).toMatchTypeof<{x: number}>()
     * // after:
     * expectTypeOf(foo).toExtend<{x: number}>()
     *
     * // before:
     * expectTypeOf(foo).toMatchTypeof({x: 1})
     * // after:
     * expectTypeOf(foo).toExtend<{x: number}>()
     * // or:
     * const expected = {x: 1}
     * expectTypeOf(foo).toExtend<typeof expected>()
     */
    <
      Expected extends B extends true
        ? Extends<Actual, Expected> extends true
          ? unknown
          : MismatchInfo<Actual, Expected>
        : unknown,
    >(
      ...MISMATCH: MismatchArgs<Extends<Actual, Expected>, B>
    ): true
    <
      Expected extends B extends true
        ? Extends<Actual, Expected> extends true
          ? unknown
          : MismatchInfo<Actual, Expected>
        : unknown,
    >(
      expected: Expected,
      ...MISMATCH: MismatchArgs<Extends<Actual, Expected>, B>
    ): true
  }
  toEqualTypeOf: {
    /**
     * @deprecated Use `toBeIdenticalTo` instead. Note that `toBeIdenticalTo` doesn't support passing a value, because supporting
     * them triggers typescript interence which makes error messages less helpful - if you need that, please raise
     * an issue on this library's github repo. This method may be removed or become an alias to `toBeIdenticalTo` in a future version.
     *
     * To switch, you can change:
     * @example
     * // before:
     * expectTypeOf(foo).toEqualTypeOf<{x: number}>()
     * // after:
     * expectTypeOf(foo).toBeIdenticalTo<{x: number}>()
     *
     * // before:
     * expectTypeOf(foo).toEqualTypeOf({x: 1})
     * // after:
     * expectTypeOf(foo).toBeIdenticalTo<{x: number}>()
     * // or:
     * const expected = {x: 1}
     * expectTypeOf(foo).toBeIdenticalTo<typeof expected>()
     */
    <
      Expected extends B extends true
        ? Equal<Actual, Expected> extends true
          ? unknown
          : MismatchInfo<Actual, Expected>
        : unknown,
    >(
      ...MISMATCH: MismatchArgs<Equal<Actual, Expected>, B>
    ): true
    <
      Expected extends B extends true
        ? Equal<Actual, Expected> extends true
          ? unknown
          : MismatchInfo<Actual, Expected>
        : unknown,
    >(
      expected: Expected,
      ...MISMATCH: MismatchArgs<Equal<Actual, Expected>, B>
    ): true
  }
  toBeCallableWith: B extends true ? (...args: Params<Actual>) => true : never
  toBeConstructibleWith: B extends true ? (...args: ConstructorParams<Actual>) => true : never
  toHaveProperty: <K extends string>(
    key: K,
    ...MISMATCH: MismatchArgs<Extends<K, keyof Actual>, B>
  ) => K extends keyof Actual ? ExpectTypeOf<Actual[K], B> : true
  extract: <V>(v?: V) => ExpectTypeOf<Extract<Actual, V>, B>
  exclude: <V>(v?: V) => ExpectTypeOf<Exclude<Actual, V>, B>
  parameter: <K extends keyof Params<Actual>>(number: K) => ExpectTypeOf<Params<Actual>[K], B>
  parameters: ExpectTypeOf<Params<Actual>, B>
  constructorParameters: ExpectTypeOf<ConstructorParams<Actual>, B>
  thisParameter: ExpectTypeOf<ThisParameterType<Actual>, B>
  instance: Actual extends new (...args: any[]) => infer I ? ExpectTypeOf<I, B> : never
  returns: Actual extends (...args: any[]) => infer R ? ExpectTypeOf<R, B> : never
  resolves: Actual extends PromiseLike<infer R> ? ExpectTypeOf<R, B> : never
  items: Actual extends ArrayLike<infer R> ? ExpectTypeOf<R, B> : never
  guards: Actual extends (v: any, ...args: any[]) => v is infer T ? ExpectTypeOf<T, B> : never
  view: {[K in keyof Actual]: Actual[K]}
  props: {[K in keyof PrintProps<Actual>]: PrintProps<Actual>[K]}
  asserts: Actual extends (v: any, ...args: any[]) => asserts v is infer T
    ? // Guard methods `(v: any) => asserts v is T` does not actually defines a return type. Thus, any function taking 1 argument matches the signature before.
      // In case the inferred assertion type `R` could not be determined (so, `unknown`), consider the function as a non-guard, and return a `never` type.
      // See https://github.com/microsoft/TypeScript/issues/34636
      unknown extends T
      ? never
      : ExpectTypeOf<T, B>
    : never
  not: Omit<ExpectTypeOf<Actual, Not<B>>, 'not'>
}
const fn: any = () => true

export type _ExpectTypeOf = {
  <Actual>(actual: Actual): ExpectTypeOf<Actual, true>
  <Actual>(): ExpectTypeOf<Actual, true>
}

/**
 * Similar to Jest's `expect`, but with type-awareness.
 * Gives you access to a number of type-matchers that let you make assertions about the
 * form of a reference or generic type parameter.
 *
 * @example
 * import {foo, bar} from '../foo'
 * import {expectTypeOf} from 'expect-type'
 *
 * test('foo types', () => {
 *   // make sure `foo` has type {a: number}
 *   expectTypeOf(foo).toMatchTypeOf({a: 1})
 *   expectTypeOf(foo).toHaveProperty('a').toBeNumber()
 *
 *   // make sure `bar` is a function taking a string:
 *   expectTypeOf(bar).parameter(0).toBeString()
 *   expectTypeOf(bar).returns.not.toBeAny()
 * })
 *
 * @description
 * See the [full docs](https://npmjs.com/package/expect-type#documentation) for lots more examples.
 */
export const expectTypeOf: _ExpectTypeOf = <Actual>(_actual?: Actual): ExpectTypeOf<Actual, true> => {
  const nonFunctionProperties = [
    'parameters',
    'returns',
    'resolves',
    'not',
    'items',
    'constructorParameters',
    'thisParameter',
    'instance',
    'guards',
    'asserts',
    'view',
    'props',
  ] as const
  type Keys = keyof ExpectTypeOf<any, any>

  type FunctionsDict = Record<Exclude<Keys, typeof nonFunctionProperties[number]>, any>
  const obj: FunctionsDict = {
    /* eslint-disable mmkal/@typescript-eslint/no-unsafe-assignment */
    toBeAny: fn,
    toBeUnknown: fn,
    toBeNever: fn,
    toBeFunction: fn,
    toBeObject: fn,
    toBeArray: fn,
    toBeString: fn,
    toBeNumber: fn,
    toBeBoolean: fn,
    toBeVoid: fn,
    toBeSymbol: fn,
    toBeNull: fn,
    toBeUndefined: fn,
    toBeNullable: fn,
    toExtend: fn,
    toBeIdenticalTo: fn,
    toMatchTypeOf: fn,
    toEqualTypeOf: fn,
    toBeCallableWith: fn,
    toBeConstructibleWith: fn,
    /* eslint-enable mmkal/@typescript-eslint/no-unsafe-assignment */
    extract: expectTypeOf,
    exclude: expectTypeOf,
    toHaveProperty: expectTypeOf,
    parameter: expectTypeOf,
  }

  const getterProperties: readonly Keys[] = nonFunctionProperties
  getterProperties.forEach((prop: Keys) => Object.defineProperty(obj, prop, {get: () => expectTypeOf({})}))

  return obj as ExpectTypeOf<Actual, true>
}

/**
 * Recursively "print" all props (including optional and readonly modifiers, constructor and function parameters, instance types, return values, this-parameters, etc.)
 * The output type is a string->string record where the left hand side consists of paths to "leaf" properties, and the right hand side are a literal string representation
 * of the leaf property type.
 *
 * Note: what defines a "leaf" is somewhat loose, but roughly, it's anything that it's not worth recursing any further into. So any literal or primitive (string, boolean, number)
 * but also `any`, `unknown`, `never`, `{}`, `[]`, `void`, `null`, `undefined` etc. are considered "leaf" types too.
 *
 * Note: this will bail out at 20 properties deep to avoid `interface X { x: X }` blowing things up.
 *
 * Note: the main implementation of this is in @see PrintPropsInner - that creates the `[string[], string]` Path->Printed Type union of pairs. See print-type.test.ts for
 * a demo of what "printed" types end up looking like.
 */
export type PrintProps<T> = ExtractPropPairs<PrintPropsInner<T>> extends [infer Keys, any]
  ? {
      [K in Extract<Keys, string>]: Extract<ExtractPropPairs<PrintPropsInner<T>>, [K, any]>[1]
    }
  : never

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

type PrintPropsInner<T, Props extends [string, string] = never, Path extends string[] = []> = Path extends {length: 20}
  ? Props | [[...Path, ' !!! bailing out to avoid infinite recursion !!! '], never]
  : Or<[IsAny<T>, IsUnknown<T>, IsNever<T>, IsEmptyObject<T>]> extends true
  ? Props | [Path, IsAny<T> extends true ? 'any' : PrintType<T>]
  : T extends string | number | boolean | null | undefined | readonly [] | void
  ? Props | [Path, PrintType<T>]
  : T extends [any, ...any[]] // 0-length tuples handled above, 1-or-more element tuples handled separately from arrays
  ? {
      [K in keyof T]: PrintPropsInner<T[K], Props, [...Path, `[${Extract<K, Digit>}]`]>
    }[Extract<keyof T, Digit> | number]
  : T extends readonly [any, ...any[]] // 0-length tuples handled above, 1-or-more element tuples handled separately from arrays
  ? {
      [K in keyof T]: PrintPropsInner<T[K], Props, [...Path, `[${Extract<K, Digit>}](readonly)`]>
    }[Extract<keyof T, Digit> | number]
  : T extends Array<infer X>
  ? PrintPropsInner<X, Props, [...Path, '[]']>
  : T extends new (...args: any[]) => any
  ?
      | PrintPropsInner<ConstructorParams<T>, Props, [...Path, `:constructorParameters`]>
      | PrintPropsInner<InstanceType<Extract<T, new (...args: any) => any>>, Props, [...Path, ':instance']>
  : T extends (...args: infer Args) => infer Return
  ?
      | PrintPropsInner<Args, Props, [...Path, ':args']>
      | PrintPropsInner<Return, Props, [...Path, ':return']>
      | PrintPropsInner<ThisParameterType<T>, Props, [...Path, ':this']>
      | (IsEmptyObject<Omit<T, keyof Function>> extends true
          ? never
          : PrintPropsInner<Omit<T, keyof Function>, Props, Path>) // pick up properties of "augmented" functions e.g. the `foo` of `Object.assign(() => 1, {foo: 'bar'})`
  : NonNullable<{
      [K in keyof T]-?: PrintPropsInner<
        T[K],
        Props,
        [
          ...Path,
          `.${EscapeProp<Extract<K, string | number>>}`,
          ...(K extends ReadonlyKeys<T> ? ['(readonly)'] : []),
          ...(K extends OptionalKeys<T> ? ['?'] : []),
        ]
      >
    }>

type EscapeableCharacters<Escapes extends Record<string, string>> = Extract<keyof Escapes, string>
type Escape<
  S extends string,
  Escapes extends Record<string, string>,
> = S extends `${infer Head}${EscapeableCharacters<Escapes>}${string}`
  ? Head extends `${string}${EscapeableCharacters<Escapes>}${string}`
    ? never
    : S extends `${Head}${EscapeableCharacters<Escapes>}${infer Tail}`
    ? S extends `${Head}${infer Escapeable}${Tail}`
      ? `${Head}${Escapes[Escapeable]}${Escape<Tail, Escapes>}`
      : never
    : never
  : S

export type EscapeProp<S extends string | number> = Escape<
  `${S}`,
  {
    [K in '\\' | '.' | ' ' | '[' | ']']: `\\${K}`
  }
>

/** standard join util */
export type Join<Parts extends string[], Joiner extends string> = Parts extends [infer Only]
  ? Only
  : Parts extends [infer First, ...infer Rest]
  ? `${Extract<First, string>}${Joiner}${Join<Extract<Rest, string[]>, Joiner>}`
  : ''

type JoinKey<Pair extends [string[], string]> = [Join<Pair[0], ''>, Pair[1]]

type ExtractPropPairs<T> = T extends [string[], string]
  ? JoinKey<T>
  : {
      [K in keyof T]: ExtractPropPairs<T[K]>
    }[keyof T]
