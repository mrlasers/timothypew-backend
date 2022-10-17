import { Lazy } from "fp-ts/lib/function"

export function ifThenElse<A, B, C>(
  a: A,
  fnThen: (a: A) => B,
  fnElse: Lazy<C>
): B | C {
  return !!a ? fnThen(a) : fnElse()
}
