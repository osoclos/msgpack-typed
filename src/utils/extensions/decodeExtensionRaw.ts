import { deriveExtensionChunkRanges } from "./deriveExtensionChunkRanges";

/** Decodes an extension MessagePack chunk, parses it to a buffer as well as its extension code. */
export function decodeExtensionRaw(chunk: Uint8Array): [Uint8Array, number] {
    const ranges = deriveExtensionChunkRanges(chunk);

    const hasLenStartIdx = ranges.length === 5;

    const iExtCode = ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
    const extCode = chunk[iExtCode]!;

    const iDataStart = ranges[<typeof hasLenStartIdx extends true ? 3 : 2>(2 + +hasLenStartIdx)];
    const iDataEnd   = ranges[<typeof hasLenStartIdx extends true ? 4 : 3>(3 + +hasLenStartIdx)];

    if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

    return [chunk.slice(iDataStart, iDataEnd), extCode];
}
