import { Tuple } from "./Tuple";

export type Range<B extends number, E extends number, S extends number = 1, _C extends number = never, _A extends unknown[] = Tuple<unknown, B>> =
    _A["length"] extends E
        ? _C :
    _A["length"] extends number
        ? Range<B, E, S, _C | _A["length"], [..._A, ...Tuple<unknown, S>]>
        : never;
