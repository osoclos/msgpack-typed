import type { MpClassInterface } from "../classes";

export type Parsed<T> =
    T extends MpClassInterface<infer V>
        ? V :
    T extends readonly (infer I)[]
        ? Parsed<I>[] :
    T extends Map<infer K, infer V>
        ? Map<K, Parsed<V>>
        : T;
