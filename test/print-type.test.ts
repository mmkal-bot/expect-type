import type {IsEmptyObject, EscapeProp, PrintProps} from '../src'
import {expectTypeOf} from '../src'

expectTypeOf<EscapeProp<'a.b c["x-y"]'>>().toBeIdenticalTo<'a\\.b\\ c\\["x-y"\\]'>()

expectTypeOf<IsEmptyObject<{}>>().toBeIdenticalTo<true>()
expectTypeOf<IsEmptyObject<{a: 1}>>().toBeIdenticalTo<false>()
expectTypeOf<IsEmptyObject<Record<string, unknown>>>().toBeIdenticalTo<false>()
expectTypeOf<IsEmptyObject<() => 1>>().toBeIdenticalTo<false>()

expectTypeOf<PrintProps<{x: 1}>>().toExtend<{
  '.x': 'literal number: 1'
}>()

expectTypeOf<PrintProps<{x: 1; y: '1'}>>().toBeIdenticalTo<{
  '.x': 'literal number: 1'
  '.y': 'literal string: 1'
}>()

expectTypeOf<PrintProps<{x?: 1}>>().toExtend<{
  '.x?': 'undefined' | 'literal number: 1'
}>()

expectTypeOf<PrintProps<{x?: {readonly y?: 1}}>>().toExtend<{
  '.x?': 'undefined'
  '.x?.y(readonly)?': 'undefined' | 'literal number: 1'
}>()

expectTypeOf<PrintProps<{x?: () => 1}>>().toExtend<{
  '.x?': 'undefined'
  '.x?:args': '[]'
  '.x?:return': 'literal number: 1'
}>()

expectTypeOf<PrintProps<{x: undefined | (() => 1)}>>().toExtend<{
  '.x': 'undefined'
  '.x:args': '[]'
  '.x:return': 'literal number: 1'
}>()

// escape dots/spaces
expectTypeOf<PrintProps<{a: {b: 1}; 'a.b': 2; 'a b': 3}>>().toBeIdenticalTo<{
  '.a.b': 'literal number: 1'
  '.a\\.b': 'literal number: 2'
  '.a\\ b': 'literal number: 3'
}>()

// handle recursive properties
interface X {
  x: X
}
expectTypeOf<PrintProps<X>>().toBeIdenticalTo<{
  '.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x !!! bailing out to avoid infinite recursion !!! ': never
}>()

interface A {
  b: {
    c: {
      a: A
    }
  }
}
expectTypeOf<PrintProps<A>>().toBeIdenticalTo<{
  '.b.c.a.b.c.a.b.c.a.b.c.a.b.c.a.b.c.a.b.c !!! bailing out to avoid infinite recursion !!! ': never
}>()
