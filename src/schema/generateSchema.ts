import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import { Arr, Obj } from "../containers";

import type { Ext } from "../extensions";

import { MpError, type Constructor } from "../internal";

import type { MpSchema } from "./MpSchema";

export function generateSchema<T, C extends Constructor<unknown>>(value: T, exts: Ext<C, number, boolean>[] = []): MpSchema<T, C> {
    if (value === undefined) throw new MpError.InvalidValue("generateSchema", "ENCODING");

    for (const ext of exts) {
        if (ext.isEncodable(value))
            return {
                ext,
                cls: value.constructor
            } as MpSchema<T, C>;
    }

    if (
        value instanceof Uint ||
        value instanceof Int  ||
        value instanceof Flt  ||

        value instanceof Str  ||

        value instanceof Bfr
    )
        return {
            cls: value.constructor,
            subtype: value.subtype
        } as MpSchema<T, C>;

    if (value instanceof Bool) return value.constructor as MpSchema<T, C>;

    if (Arr.isValueValid(value))
        return {
            type: "ARR",
            entries: value.map((item) => generateSchema(item))
        } as MpSchema<T, C>;

    if (Obj.isValueValid(value)) {
        if (value instanceof Map) {
            const entries: [unknown, unknown][] = [];
            for (const [key, item] of value) entries.push([generateSchema(key), generateSchema(item)]);

            return {
                type: "OBJ",
                entries
            } as MpSchema<T, C>;
        }

        const entries: [unknown, unknown][] = [];
        for (const key in value) entries.push([key, generateSchema(value[key as keyof typeof value])]);

        return {
            type: "OBJ",
            entries
        } as MpSchema<T, C>;
    }

    return value as MpSchema<T, C>;
}
