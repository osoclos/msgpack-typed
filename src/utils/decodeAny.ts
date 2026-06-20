import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import { Arr, Obj, type ValueArr, type ValueObj } from "../containers";

import type { Ext } from "../extensions";

import { CODE_NIL, MpError, type Constructor, type MpClassInterface } from "../internal";

import { ExtUtils } from "./ExtUtils";
import { LZ4Compression } from "./LZ4Compression";

export function decodeAny<T extends MpClassInterface<unknown> | null>(chunk: Uint8Array, doDecompression?: boolean): T | ValueArr<T>;
export function decodeAny<T extends MpClassInterface<unknown> | null, C extends unknown>(chunk: Uint8Array, exts: Ext<Constructor<C>, number, boolean>[], doDecompression?: boolean): T | C | ValueArr<T | C>;
export function decodeAny<K extends MpClassInterface<unknown> | null, V extends MpClassInterface<unknown> | null>(chunk: Uint8Array, doDecompression?: boolean): ValueObj<K, V>;
export function decodeAny<K extends MpClassInterface<unknown> | null, V extends MpClassInterface<unknown> | null, C extends unknown>(chunk: Uint8Array, exts: Ext<Constructor<C>, number, boolean>[], doDecompression?: boolean): ValueObj<K | C, V | C>;
export function decodeAny<C extends unknown>(chunk: Uint8Array, b?: boolean | Ext<Constructor<C>, number, boolean>[], c?: boolean): MpClassInterface<unknown> | null | C | ValueArr<MpClassInterface<unknown> | null | C> | ValueObj<MpClassInterface<unknown> | null | C, MpClassInterface<unknown> | null | C> {
    const code = chunk[0 /* iCode */]!;

    if (code === undefined) throw new MpError.MissingCode("decodeAny", "VALIDATE_CHUNK");
    if (code === CODE_NIL) return null;

    const usesExt = Array.isArray(b);

    const exts = usesExt ? b : [];
    const doDecompression = typeof b === "boolean" ? b : c ?? false;

    if (doDecompression && LZ4Compression.isUnpackable(chunk)) return decodeAny(LZ4Compression.unpack(chunk), exts, doDecompression);

    if (ExtUtils.isCodeValid(code))
        for (const ext of exts)
            if (ext.isDecodable(chunk)) return ExtUtils.decodeWith(ext, chunk);

    if (Uint.isCodeValid(code)) return Uint.decode(chunk);
    if (Int .isCodeValid(code)) return Int .decode(chunk);
    if (Flt .isCodeValid(code)) return Flt .decode(chunk);

    if (Bool.isCodeValid(code)) return Bool.decode(chunk);
    if (Str .isCodeValid(code)) return Str .decode(chunk);

    if (Bfr.isCodeValid(code)) return Bfr.decode(chunk);

    if (Arr.isCodeValid(code)) return Arr.decode(chunk, exts, doDecompression);
    if (Obj.isCodeValid(code)) return Obj.decode(chunk, exts, doDecompression);

    throw new MpError.IncompatibleChunk("decodeAny", "DECODING");
}
