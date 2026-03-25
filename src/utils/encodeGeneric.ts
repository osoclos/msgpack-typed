import { Ext } from "../classes";

import { NIL_CODE, RawClass } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST } from "../types";

import { NonEncodableChunkError } from "./errors";

import { ExtUtils } from "./ExtUtils";
import { Lz4Block } from "./Lz4Block";

export function encodeGeneric(data: Exclude<unknown, undefined | symbol>, exts: Ext<RawClass<unknown>, number, boolean> | Ext<RawClass<unknown>, number, boolean>[] = [], doCompression: boolean = false): Uint8Array {
    const encodedBfr = __encodeGeneric(data, exts);
    return doCompression ? Lz4Block.pack(encodedBfr) : encodedBfr;
}

function __encodeGeneric(data: Exclude<unknown, undefined | symbol>, exts: Ext<RawClass<unknown>, number, boolean> | Ext<RawClass<unknown>, number, boolean>[] = []) {
    if (data === undefined) throw new NonEncodableChunkError(data);

    if (data === null) return new Uint8Array([NIL_CODE]);

    if (!Array.isArray(exts)) exts = [exts];

    for (const ext of exts)
        if (ext.isEncodable(data)) return ExtUtils.encodeWith(ext, data);

    for (const Cls of MP_CLASS_LIST)
        if (data instanceof Cls) return data.encode();
        else if (Cls.isValid(data)) return new (<any>Cls)(data).encode();

    for (const Container of MP_CONTAINER_LIST)
        if (Container.isValid(data)) return (<any>Container.encode)(data, exts);

    throw new NonEncodableChunkError(data);
}
