import { Bool, Ext, Flt, Int, Slice, Str, Uint } from "../classes";
import { Arr, ArrClassed, Obj, ObjClassed } from "../containers";

import { MpClassUnion } from "../types";

import { ExtUtils } from "./ExtUtils";

import { toLegible } from "./toLegible";

/** Decodes a MessagePack chunk with an arbitrary or unknown type to its corresponding class type. */
export function decodeGeneric<T extends MpClassUnion | ArrClassed | ObjClassed>(chunk: Uint8Array): T;

/** Decodes a MessagePack chunk with an arbitrary or unknown type to its value or object, with an option to add extensions to the encoder. */
export function decodeGeneric<T>(chunk: Uint8Array, exts?: Ext<any, number> | Ext<any, number>[]): T;

export function decodeGeneric<T>(chunk: Uint8Array, exts: Ext<any, number> | Ext<any, number>[] = []): T {
    for (const Cls of [Uint, Int, Flt, Str, Bool, Slice, Arr, Obj])
        if (Cls.isChunkValid(chunk)) return <T>Cls.decode(chunk);

         if (chunk[0] === 0xc0) return <T>null;
    else if (ExtUtils.isChunkValid(chunk)) {
        if (!Array.isArray(exts)) exts = [exts];

        const [data, extCode] = ExtUtils.decodeRaw(chunk);
        for (const ext of exts)
            if (ext.isCodeValid(extCode)) return ext.decode(data, extCode);

        throw new Error(`No extension that was passed into the decoder supports code ${toLegible(extCode, true)}. Did you add an extension that supports it?`);
    }

    throw new TypeError("Invalid data was passed as a MessagePack chunk.");
}
