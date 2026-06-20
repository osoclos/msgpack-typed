import type { ValueFlt, ValueInt, ValueStr, ValueUint } from "../classes";
import type { MpClassInterface } from "./MpClass";

export type Parsed<T> =
    T extends MpClassInterface<infer V>
        ? V :
    T extends readonly (infer I)[]
        ? Parsed<I>[] :
    T extends Map<infer K, infer V>
        ? Parsed<K> extends Exclude<ValueStr | ValueUint | ValueInt | ValueFlt, bigint>
            ? Record<Parsed<K>, Parsed<T>>
            : Map<Parsed<K>, Parsed<V>>
        : T;
