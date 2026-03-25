import { Ext } from "../classes";

import { RawClass } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST, MpClassUnion } from "../types";

import { NonDecodableChunkError } from "./errors";

import { ExtUtils } from "./ExtUtils";
import { Lz4Block } from "./Lz4Block";

export function decodeGeneric<T extends MpClassUnion>(chunk: Uint8Array): T["prototype"];
export function decodeGeneric<T extends MpClassUnion | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<T, number, boolean> | Ext<T, number, boolean>[], doCompression?: boolean): T["prototype"];
export function decodeGeneric<T extends MpClassUnion | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<T, number, boolean> | Ext<T, number, boolean>[] = [], doDecompression: boolean = false): T["prototype"] {
    if (!Array.isArray(exts)) exts = [exts];

    if (doDecompression) {
        const unpackedChunk = Lz4Block.unpack(chunk);
        return decodeGeneric(unpackedChunk, exts, doDecompression);
    }

    for (const ext of exts)
        if (ext.isDecodable(chunk)) return ExtUtils.decodeWith(ext, chunk);

    for (const Cls of MP_CLASS_LIST)
        if (Cls.isChunkValid(chunk)) return Cls.decode(chunk);

    for (const Container of MP_CONTAINER_LIST)
        if (Container.isChunkValid(chunk)) return (<any>Container.decode)(chunk);

    throw new NonDecodableChunkError();
}
