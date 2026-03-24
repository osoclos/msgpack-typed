import { Ext } from "../classes";

import { RawClass } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST, MpClassUnion } from "../types";

import { NonDecodableChunkError } from "./errors";

import { ExtUtils } from "./ExtUtils";

export function decodeGeneric<T extends MpClassUnion>(chunk: Uint8Array): T["prototype"];
export function decodeGeneric<T extends MpClassUnion | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<T, number, boolean> | Ext<T, number, boolean>[]): T["prototype"];
export function decodeGeneric<T extends MpClassUnion | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<T, number, boolean> | Ext<T, number, boolean>[] = []): T["prototype"] {
    if (!Array.isArray(exts)) exts = [exts];

    for (const ext of exts)
        if (ext.isDecodable(chunk)) return ExtUtils.decodeWith(ext, chunk);

    for (const Cls of MP_CLASS_LIST)
        if (Cls.isChunkValid(chunk)) return Cls.decode(chunk);

    for (const Container of MP_CONTAINER_LIST)
        if (Container.isChunkValid(chunk)) return Container.decode(chunk);

    throw new NonDecodableChunkError();
}
