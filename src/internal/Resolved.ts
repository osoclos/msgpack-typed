import type { ValueArr } from "../containers";
import type { MpSchema } from "../schema";

import type { MpClassInterface, MpClassInterfaceSubtyped, MpClassModule, MpClassModuleSubtyped } from "./MpClass";

import type { Constructor } from "./Constructor";

export type Resolved<T extends MpSchema<unknown, Constructor<unknown>>> =
    T extends MpClassModule<infer V>
        ? MpClassInterface<V> :
    "subtype" extends keyof T ?
        "cls" extends keyof T ?
            T["cls"] extends MpClassModuleSubtyped<infer V, infer T>
                ? MpClassInterfaceSubtyped<V, T>
                : T
            : T :
    "type" extends keyof T ?
        "entries" extends keyof T ?
            "ARR" extends T["type"] ?
                T["entries"] extends MpSchema<infer T, Constructor<unknown>>[]
                    ? ValueArr<T>
                : T :
            "OBJ" extends T["type"] ?
                T["entries"] extends [MpSchema<infer K, Constructor<unknown>>, MpSchema<infer V, Constructor<unknown>>][] ?
                    K extends Exclude<PropertyKey, symbol>
                        ? Record<K, V>
                        : Map<K, V>
                    : T
                : T
            : T :
    "ext" extends keyof T ?
        "cls" extends keyof T ?
            T["cls"] extends Constructor<infer T>
                ? T
                : T
        : T
    : T;
