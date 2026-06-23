import type { MpClassInterface } from "./MpClass";

export type Parsed<T> =
    T extends MpClassInterface<infer V>
        ? V :
    T extends readonly (infer I)[]
        ? Parsed<I>[] :
    T extends Map<infer K, infer V>
        ? Map<Parsed<K>, Parsed<V>> :
    T extends Record<infer K, infer V>
        ? K extends symbol
            ? never
            : Record<K, Parsed<V>>
        : never;
