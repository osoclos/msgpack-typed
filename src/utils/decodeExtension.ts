import { Ext } from "../classes";
import { RawClass } from "../types";

import { deriveExtensionChunkRanges } from "./deriveExtensionChunkRanges";

/** Decodes an extension MessagePack chunk, validates it and parses as the class type that a specific extension is responsible for. */
export function decodeExtension<T extends RawClass<any, any[]>>(ext: Ext<T, number>, chunk: Uint8Array): T {
    const ranges = deriveExtensionChunkRanges(chunk);

    const hasLenStartIdx = ranges.length === 5;

    const iType = ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
    const type = chunk[iType]!;

    const iDataStart = ranges[<typeof hasLenStartIdx extends true ? 3 : 2>(2 + +hasLenStartIdx)];
    const iDataEnd   = ranges[<typeof hasLenStartIdx extends true ? 4 : 3>(3 + +hasLenStartIdx)];

    if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

    return ext.decode(chunk.slice(iDataStart, iDataEnd), type);
}
