import { toLegible } from "./toLegible";

/** Retrieves the starting index of each section of the chunk, as well as the final exclusive index, for an Ext. */
export function deriveExtensionChunkRanges(chunk: Uint8Array): [number, number, number, number] | [number, number, number, number, number] {
    const iChunkStart: number = 0;

    const code = chunk[iChunkStart];
    if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

    let len: number;
    let lenLen: number;

    switch (code) {
        case 0xd4: {
            len = 0x01;
            lenLen = 0;

            break;
        }

        case 0xd5: {
            len = 0x02;
            lenLen = 0;

            break;
        }

        case 0xd6: {
            len = 0x04;
            lenLen = 0;

            break;
        }

        case 0xd7: {
            len = 0x08;
            lenLen = 0;

            break;
        }

        case 0xd8: {
            len = 0x10;
            lenLen = 0;

            break;
        }

        case 0xc7: {
            len = 0;
            lenLen = 1;

            break;
        }

        case 0xc8: {
            len = 0;
            lenLen = 2;

            break;
        }

        case 0xc9: {
            len = 0;
            lenLen = 4;

            break;
        }

        default: throw new TypeError(`Invalid chunk header for \`Ext\`. Did not expect ${toLegible(code, true)}.`);
    }

    if (lenLen === 0) {
        const iType = iChunkStart + 1;

        const iDataStart = iType + 1;
        const iDataEnd = iDataStart + len;

        return [iChunkStart, iType, iDataStart, iDataEnd];
    }

    const iLenStart = iChunkStart + 1;

    const nBytes = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;
    for (let i: number = iLenStart; i < nBytes; i++) {
        len <<= 8;
        len |= chunk[i]!;
    }

    const iType = iLenStart + lenLen;

    const iDataStart = iType + 1;
    const iDataEnd = iDataStart + len;

    return [iChunkStart, iLenStart, iType, iDataStart, iDataEnd];
}