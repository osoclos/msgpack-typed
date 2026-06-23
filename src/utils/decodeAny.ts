import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import { Arr, Obj, type ValueArr, type ValueObj } from "../containers";

import type { Ext } from "../extensions";

import { CODE_NIL, MpError, type Constructor, type MpClassInterface } from "../internal";

import { ExtUtils } from "./ExtUtils";
import { LZ4Compression } from "./LZ4Compression";

export function decodeAny<T extends MpClassInterface<unknown> | null | C | ValueArr<MpClassInterface<unknown> | null | C> | ValueObj<MpClassInterface<unknown> | null | C, MpClassInterface<unknown> | null | C>, C extends unknown>(chunk: Uint8Array, b?: boolean | Ext<Constructor<C>, number, boolean>[], c?: boolean): T {
    const code = chunk[0 /* iCode */]!;

    if (code === undefined) throw new MpError.MissingCode("decodeAny", "VALIDATE_CHUNK");
    if (code === CODE_NIL) return null as T;

    const usesExt = Array.isArray(b);

    const exts = usesExt ? b : [];
    const doDecompression = typeof b === "boolean" ? b : c ?? false;

    if (doDecompression && LZ4Compression.isUnpackable(chunk)) return decodeAny(LZ4Compression.unpack(chunk), exts, doDecompression);

    if (ExtUtils.isCodeValid(code))
        for (const ext of exts)
            if (ext.isDecodable(chunk)) return ExtUtils.decodeWith(ext, chunk) as T;

    if (Uint.isCodeValid(code)) return Uint.decode(chunk) as T;
    if (Int .isCodeValid(code)) return Int .decode(chunk) as T;
    if (Flt .isCodeValid(code)) return Flt .decode(chunk) as T;

    if (Bool.isCodeValid(code)) return Bool.decode(chunk) as T;
    if (Str .isCodeValid(code)) return Str .decode(chunk) as T;

    if (Bfr.isCodeValid(code)) return Bfr.decode(chunk) as T;

    if (Arr.isCodeValid(code)) return Arr.decode(chunk, exts, doDecompression) as T;
    if (Obj.isCodeValid(code)) return Obj.decode(chunk, exts, doDecompression) as T;

    throw new MpError.IncompatibleChunk("decodeAny", "DECODING");
}
