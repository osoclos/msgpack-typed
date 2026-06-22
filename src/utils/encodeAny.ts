import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import { Arr, Obj } from "../containers";

import type { Ext } from "../extensions";

import { CODE_NIL, MpError, type Constructor } from "../internal";

import { ExtUtils } from "./ExtUtils";
import { LZ4Compression } from "./LZ4Compression";

export function encodeAny(value: unknown, doCompression?: boolean): Uint8Array;
export function encodeAny(value: unknown, exts: Ext<Constructor<unknown>, number, boolean>[], doCompression?: boolean): Uint8Array;
export function encodeAny(value: unknown, b?: boolean | Ext<Constructor<unknown>, number, boolean>[], c?: boolean): Uint8Array {
    const usesExt = Array.isArray(b);

    const exts = usesExt ? b : [];
    const doCompression = typeof b === "boolean" ? b : c ?? false;

    let chunk: Uint8Array;
    validation: {
        if (value === undefined) throw new MpError.InvalidValue("encodeAny", "ENCODING");
        if (value === null) {
            chunk = new Uint8Array([CODE_NIL]);
            break validation;
        }

        for (const ext of exts) {
            if (ext.isEncodable(value)) {
                chunk = ExtUtils.encodeWith(ext, value);
                break validation;
            }
        }

        if (
            value instanceof Uint ||
            value instanceof Int  ||
            value instanceof Flt  ||

            value instanceof Bool ||
            value instanceof Str  ||

            value instanceof Bfr
        ) {
            chunk = value.encode();
            break validation;
        }

        if (value instanceof Uint8Array) {
            chunk = new Bfr(value).encode();
            break validation;
        }

        if (Arr.isValueValid(value)) {
            chunk = Arr.encode(value, exts);
            break validation;
        }

        if (Obj.isValueValid(value)) {
            chunk = Obj.encode(value, exts);
            break validation;
        }

        if (Uint.isValueValid(value)) {
            chunk = new Uint(value).encode();
            break validation;
        }

        if (Int.isValueValid(value)) {
            chunk = new Int(value).encode();
            break validation;
        }

        if (Flt.isValueValid(value)) {
            chunk = new Flt(value).encode();
            break validation;
        }

        if (Bool.isValueValid(value)) {
            chunk = new Bool(value).encode();
            break validation;
        }

        if (Str.isValueValid(value)) {
            chunk = new Str(value).encode();
            break validation;
        }

        if (Bfr.isValueValid(value)) {
            chunk = new Bfr(value).encode();
            break validation;
        }

        throw new MpError.InvalidValue("encodeAny", "ENCODING");
    }

    return doCompression ? LZ4Compression.pack(chunk) : chunk;
}
