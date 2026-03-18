import { Bool, Ext, Flt, Int, Slice, Str, Uint } from "../classes";
import { Arr, ArrClassed, Obj, ObjClassed } from "../containers";

import { Lz4BlockExt } from "../extensions";

import { MpClassUnion } from "../types";

import { ExtUtils } from "./ExtUtils";
import { mpLz4Unpack } from "./mpLz4Unpack";

import { toLegible } from "./toLegible";

/** Decodes a MessagePack chunk with an arbitrary or unknown type to its corresponding class type. */
export function decodeGeneric<T extends MpClassUnion | ArrClassed | ObjClassed>(chunk: Uint8Array): T;

/** Decodes a MessagePack chunk with an arbitrary or unknown type to its value or object, with an option to add extensions to the encoder. */
export function decodeGeneric<T>(chunk: Uint8Array, exts?: Ext<any, number> | Ext<any, number>[]): T;

export function decodeGeneric<T>(chunk: Uint8Array, exts: Ext<any, number> | Ext<any, number>[] = []): T {
    if (chunk[0] === 0xc0) return <T>null;

    for (const Cls of [Uint, Int, Flt, Str, Bool, Slice])
        if (Cls.isChunkValid(chunk)) return <T>Cls.decode(chunk);

    if (!Array.isArray(exts)) exts = [exts];

    const lz4BlockExt: Lz4BlockExt | null = <Lz4BlockExt>exts.find((ext) => ext.codes.includes(0x62) && ext.codes.includes(0x63) && (<any>ext)[Symbol.toStringTag] === "Lz4BlockExt") ?? null;

    const containers: (typeof Arr | typeof Obj)[] = [Obj];
    if (lz4BlockExt === null) containers.push(Arr);

    for (const Container of containers)
        if (Container.isChunkValid(chunk)) return <T>(<any>Container.decode)(chunk, exts);

    if (lz4BlockExt !== null) {
        if (Arr.isChunkValid(chunk)) {
            const subChunks = Arr.decodeHeader(chunk);
            if (subChunks.length === 0) return <T>Arr.decode(chunk, exts);

            const [firstChunk, ...dataChunks] = subChunks;
            if (ExtUtils.isChunkValid(firstChunk!)) {
                const [, extCode] = ExtUtils.decodeRaw(firstChunk!);
                if (extCode === 0x62 && dataChunks.every((chunk) => Slice.isChunkValid(chunk))) return decodeGeneric<T>(mpLz4Unpack(lz4BlockExt.lz4Block, chunk), exts);
            }

            return <T>Arr.decode(chunk, exts);
        }

        if (ExtUtils.isChunkValid(chunk)) {
            const [, extCode] = ExtUtils.decodeRaw(chunk);
            if (extCode === 0x63) return decodeGeneric<T>(mpLz4Unpack(lz4BlockExt.lz4Block, chunk), exts);
        }
    }

    if (!ExtUtils.isChunkValid(chunk)) throw new TypeError("Invalid data was passed as a MessagePack chunk.");

    const [data, extCode] = ExtUtils.decodeRaw(chunk);
    for (const ext of exts)
        if (ext.isCodeValid(extCode) && ext !== lz4BlockExt) return ext.decode(data, extCode);

    throw new Error(`No extension that was passed into the decoder supports code ${toLegible(extCode, true)}. Did you add an extension that supports it?`);
}
