import { Ext } from "../classes";
import { ArrPrimitive, ObjPrimitive } from "../containers";

import { formatNumber, NIL_CODE, RawClass } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST, MpClassUnion } from "../types";

import { MissingHeaderCodeError, NonDecodableChunkError } from "./errors";

import { ExtUtils } from "./ExtUtils";
import { Lz4Block } from "./Lz4Block";

export function decodeGeneric<T extends MpClassUnion | ArrPrimitive | ObjPrimitive | null>(chunk: Uint8Array): Exclude<T, ArrPrimitive | ObjPrimitive | null>["prototype"] | Extract<T, ArrPrimitive | ObjPrimitive | null>;
export function decodeGeneric<T extends MpClassUnion | ArrPrimitive | ObjPrimitive | null | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<Extract<T, RawClass<unknown>>, number, boolean> | Ext<Extract<T, RawClass<unknown>>, number, boolean>[], doDecompression?: boolean): Exclude<T, ArrPrimitive | ObjPrimitive | null>["prototype"] | Extract<T, ArrPrimitive | ObjPrimitive | null>;
export function decodeGeneric<T extends MpClassUnion | ArrPrimitive | ObjPrimitive | null | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<Extract<T, RawClass<unknown>>, number, boolean> | Ext<Extract<T, RawClass<unknown>>, number, boolean>[] = [], doDecompression: boolean = false): Exclude<T, ArrPrimitive | ObjPrimitive | null>["prototype"] | Extract<T, ArrPrimitive | ObjPrimitive | null> {
    if (!Array.isArray(exts)) exts = [exts];

    if (doDecompression && Lz4Block.isUnpackable(chunk)) {
        const unpackedChunk = Lz4Block.unpack(chunk);
        return decodeGeneric(unpackedChunk, exts, doDecompression);
    }

    const iCode: number = 0;
    const code = chunk[iCode];

    if (code === undefined) throw new MissingHeaderCodeError();

    if (code === NIL_CODE) return <any>null;

    for (const ext of exts)
        if (ext.isDecodable(chunk)) return ExtUtils.decodeWith(ext, chunk);

    for (const Cls of MP_CLASS_LIST)
        if (Cls.isChunkValid(chunk)) return Cls.decode(chunk);

    for (const Container of MP_CONTAINER_LIST)
        if (Container.isChunkValid(chunk)) return (<any>Container.decode)(chunk, exts, doDecompression);

    throw new NonDecodableChunkError();
}
