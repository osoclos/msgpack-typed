import type { ValueArr, ValueObj } from "../containers";
import type { Ext } from "../extensions";

import type { Constructor, MpClassInterface, MpClassInterfaceSubtyped, MpClassModule, MpClassModuleSubtyped } from "../internal";

export type MpSchema<T, C extends Constructor<unknown>> =
    T extends MpClassInterface<infer V> ?
        T extends MpClassInterfaceSubtyped<infer V, infer T>
            ? {
                cls: MpClassModuleSubtyped<V, T>;
                subtype: T;
            }
            : MpClassModule<V> :
    T extends ValueArr<unknown>
        ? {
            type: "ARR";
            entries: MpSchema<T[number], C>[];
        } :
    T extends ValueObj<unknown, unknown>
        ? {
            type: "OBJ";
            entries:
                T extends Map<infer K, infer V>
                    ? [MpSchema<K, C>, MpSchema<V, C>][]
                    : [MpSchema<keyof T, C>, MpSchema<T[keyof T], C>]
        } :
    T extends C["prototype"]
        ? Ext<C, number, boolean>
        : T;
