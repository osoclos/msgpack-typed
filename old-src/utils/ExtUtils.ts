import { Ext } from "../classes";
import { RawClass } from "../types";

import { toLegible } from "./toLegible";

export const ExtUtils = {
    /** Encodes a class object that an extension is responsible for and converts it to a MessagePack chunk. */
    encode<T extends RawClass<any, any[]>>(ext: Ext<T, number>, data: T["prototype"]): Uint8Array {
        const res = ext.encode(data);

        const bytes = Array.isArray(res) ? res[0] : res;
        const extCode  = Array.isArray(res) ? res[1] : ext.codes[0]!;

        return this.encodeRaw(bytes, extCode);
    },

    /** Encodes a buffer with an extension code and converts it to a MessagePack chunk. */
    encodeRaw(data: Uint8Array, extCode: number): Uint8Array {
        let code: number;
        let lenLen: number;

        const len = data.byteLength;

        switch (true) {
            case len === 0x01: {
                code = 0xd4;
                lenLen = 0;

                break;
            }

            case len === 0x02: {
                code = 0xd5;
                lenLen = 0;

                break;
            }

            case len === 0x04: {
                code = 0xd6;
                lenLen = 0;

                break;
            }

            case len === 0x08: {
                code = 0xd7;
                lenLen = 0;

                break;
            }

            case len === 0x10: {
                code = 0xd8;
                lenLen = 0;

                break;
            }

            case len <= 0xff: {
                code = 0xc7;
                lenLen = 1;

                break;
            }

            case len <= 0xffff: {
                code = 0xc8;
                lenLen = 2;

                break;
            }

            default: {
                code = 0xc9;
                lenLen = 4;

                break;
            }
        }

        const iDataStart = 1 + lenLen + 1;

        const chunk = new Uint8Array(iDataStart + len);
        chunk[0] = code;

        let tmpLen = len;
        for (let i: number = lenLen; i >= 1; i--) {
            chunk[i] = tmpLen & 0xff;
            tmpLen >>>= 8;
        }

        chunk[1 + lenLen] = extCode;
        chunk.set(data, iDataStart);

        return chunk;
    },

    /** Decodes an extension MessagePack chunk, validates it and parses as the class type that a specific extension is responsible for. */
    decode<T extends RawClass<any, any[]>>(ext: Ext<T, number>, chunk: Uint8Array): T {
        const [data, extCode] = this.decodeRaw(chunk);

        if (!ext.isCodeValid(extCode)) throw new Error(`The extension passed into the decoder does not supports code ${toLegible(extCode, true)}. Did you add an extension that supports it?`);
        return ext.decode(data, extCode);
    },

    /** Decodes an extension MessagePack chunk, parses it to a buffer as well as its extension code. */
    decodeRaw(chunk: Uint8Array): [Uint8Array, number] {
        const ranges = this.deriveChunkRanges(chunk);

        const hasLenStartIdx = ranges.length === 5;

        const iExtCode = ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        const extCode = chunk[iExtCode]!;

        const iDataStart = ranges[<typeof hasLenStartIdx extends true ? 3 : 2>(2 + +hasLenStartIdx)];
        const iDataEnd   = ranges[<typeof hasLenStartIdx extends true ? 4 : 3>(3 + +hasLenStartIdx)];

        if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

        return [chunk.slice(iDataStart, iDataEnd), extCode];
    },

    /** Checks whether a chunk header code corresponds to a MessagePack extension. */
    isCodeValid(code: number): boolean {
        return (
            code === 0xd4 ||
            code === 0xd5 ||
            code === 0xd6 ||
            code === 0xd7 ||
            code === 0xd8 ||

            code === 0xc7 ||
            code === 0xc8 ||
            code === 0xc9
        );
    },

    /** Checks whether a chunk corresponds to a MessagePack extension. */
    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) return false;

        return this.isCodeValid(code);
    },

    /** Retrieves the starting index of each section of the chunk, as well as the final exclusive index, for an Ext. */
    deriveChunkRanges(chunk: Uint8Array): [number, number, number, number] | [number, number, number, number, number] {
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

        const chunkLenLen = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

        len = 0;
        for (let i: number = iLenStart, nBytes: number = 0; nBytes < chunkLenLen; i++, nBytes++) {
            len <<= 8;
            len |= chunk[i]!;
        }

        const iType = iLenStart + lenLen;

        const iDataStart = iType + 1;
        const iDataEnd = iDataStart + len;

        return [iChunkStart, iLenStart, iType, iDataStart, iDataEnd];
    }
};

