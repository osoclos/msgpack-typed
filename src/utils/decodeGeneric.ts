import { Ext } from "../classes";
import { ArrPrimitive, ObjPrimitive } from "../containers";

import { RawClass } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST, MpClassUnion } from "../types";

import { NonDecodableChunkError } from "./errors";

import { ExtUtils } from "./ExtUtils";
import { Lz4Block } from "./Lz4Block";

export function decodeGeneric<T extends MpClassUnion | ArrPrimitive | ObjPrimitive>(chunk: Uint8Array): Exclude<T, ArrPrimitive | ObjPrimitive>["prototype"] | Extract<T, ArrPrimitive | ObjPrimitive>;
export function decodeGeneric<T extends MpClassUnion | ArrPrimitive | ObjPrimitive | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<Extract<T, RawClass<unknown>>, number, boolean> | Ext<Extract<T, RawClass<unknown>>, number, boolean>[], doDecompression?: boolean): Exclude<T, ArrPrimitive | ObjPrimitive>["prototype"] | Extract<T, ArrPrimitive | ObjPrimitive>;
export function decodeGeneric<T extends MpClassUnion | ArrPrimitive | ObjPrimitive | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<Extract<T, RawClass<unknown>>, number, boolean> | Ext<Extract<T, RawClass<unknown>>, number, boolean>[] = [], doDecompression: boolean = false): Exclude<T, ArrPrimitive | ObjPrimitive>["prototype"] | Extract<T, ArrPrimitive | ObjPrimitive> {
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
