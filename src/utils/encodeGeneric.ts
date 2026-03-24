import { Ext } from "../classes";

import { NIL_CODE, RawClass } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST } from "../types";

import { NonEncodableChunkError } from "./errors";

import { ExtUtils } from "./ExtUtils";

export function encodeGeneric(data: Exclude<unknown, undefined | symbol>, exts: Ext<RawClass<unknown>, number, boolean> | Ext<RawClass<unknown>, number, boolean>[] = []): Uint8Array {
    if (data === undefined) throw new NonEncodableChunkError(data);

    if (data === null) return new Uint8Array([NIL_CODE]);

    if (!Array.isArray(exts)) exts = [exts];

    for (const ext of exts)
        if (ext.isEncodable(data)) return ExtUtils.encodeWith(ext, data);

    for (const Cls of MP_CLASS_LIST)
        if (data instanceof Cls) return data.encode();
        else if (Cls.isValid(data)) return new (<any>Cls)(data).encode();

    for (const Container of MP_CONTAINER_LIST)
        if (Container.isValid(data)) return Container.encode(data);

    throw new NonEncodableChunkError(data);
}
