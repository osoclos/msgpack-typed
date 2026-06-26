import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import { Arr, Obj, type ValueArr, type ValueObj } from "../containers";

import type { Ext } from "../extensions";

import { CODE_NIL, MpError, type Constructor, type MpClassInterface } from "../internal";

import { ExtUtils } from "./ExtUtils";
import { LZ4Compression } from "./LZ4Compression";

/**
  * Decodes a MessagePack chunk into a parser object or container with an option to inflate it using LZ4 compression.
  *
  * @param chunk the MessagePack chunk to decode
  * @param doDeompression whether to decompress any deflated MessagePack chunks
  *
  * @return the parser object or container inhabiting the decoded values
  *
  */
export function decodeAny<T extends MpClassInterface<unknown> | null | C | ValueArr<MpClassInterface<unknown> | null | C> | ValueObj<MpClassInterface<unknown> | null | C, MpClassInterface<unknown> | null | C>, C extends unknown>(chunk: Uint8Array, doDecompression?: boolean): T;

/**
  * Decodes a MessagePack chunk into a parser object or container with an option to inflate using LZ4 compression.
  *
  * @param chunk the MessagePack chunk to decode
  * @param exts the extensions used to properly decode the MessagePack chunk into their corresponding custom class objects
  *
  * @param doDeompression whether to decompress any deflated MessagePack chunks
  *
  * @return the parser object or container inhabiting the decoded values
  *
  */
export function decodeAny<T extends MpClassInterface<unknown> | null | C | ValueArr<MpClassInterface<unknown> | null | C> | ValueObj<MpClassInterface<unknown> | null | C, MpClassInterface<unknown> | null | C>, C extends unknown>(chunk: Uint8Array, exts?: Ext<Constructor<C>, number>[], doDecompression?: boolean): T;

export function decodeAny<T extends MpClassInterface<unknown> | null | C | ValueArr<MpClassInterface<unknown> | null | C> | ValueObj<MpClassInterface<unknown> | null | C, MpClassInterface<unknown> | null | C>, C extends unknown>(chunk: Uint8Array, b?: boolean | Ext<Constructor<C>, number>[], c?: boolean): T {
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
