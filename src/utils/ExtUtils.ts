import { Ext } from "../classes";
import { NIL_CODE, RawClass } from "../internal";

import { InvalidDataTypeError, InvalidExtensionCodeError, InvalidHeaderCodeError, MissingHeaderCodeError, NonDecodableChunkError, warnTruncatedChunk } from "./errors";

/** An object to handle any extension-related features and helper functions to ease extension development and usage. */
export const ExtUtils = {
    /** Serialises data and converts it into a parsable MessagePack chunk using a specified extension that supports it. */
    encodeWith<T extends RawClass<unknown>>(ext: Ext<T, number, boolean>, data: T["prototype"]) {
        if (!ext.isEncodable(data)) throw new InvalidDataTypeError(data);

        const [extData, extCode] = ext.encode(data);
        return this.encodeRaw(extData, extCode);
    },

    /** Converts a buffer containing data into a parsable MessagePack chunk given an extension code. Useful if you already have custom data in byte form. */
    encodeRaw(data: Uint8Array, extCode: number) {
        let code: number;
        let lenLen: number;

        const len = data.byteLength;

        switch (true) {
            // fixext
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

            // ext
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

        const chunkLen = iDataStart + len;

        const chunk = new Uint8Array(chunkLen);
        chunk[0] = code;

        for (let i: number = 1, iByte: number = lenLen - 1; iByte >= 0; i++, iByte--)
            chunk[i] = (len >>> (iByte * 8)) & 0xff;

        chunk[1 + lenLen] = extCode;
        chunk.set(data, iDataStart);

        return chunk;
    },

    /** Converts a MessagePack chunk assumed to be in the `fixext`/`ext` format family and creates a class object using a specified extension that supports it. */
    decodeWith<T extends RawClass<unknown>, S extends boolean>(ext: Ext<T, number, S>, chunk: Uint8Array): T["prototype"] {
        const decodableRes = ext.isDecodable(chunk);
        if (!decodableRes) throw new NonDecodableChunkError();

        let subChunk: Uint8Array;
        if (Array.isArray(decodableRes)) {
            const [iStart, iEnd] = decodableRes;
            subChunk = chunk.subarray(iStart, iEnd);
        } else subChunk = chunk;

        if (!ext.skipHeaderDecoding(subChunk)) return ext.decode(subChunk, <any>null);

        const [data, extCode] = this.decodeRaw(subChunk);
        if (!ext.isCodeValid(extCode)) throw new InvalidExtensionCodeError(extCode);

        return ext.decode(data, extCode);
    },

    /** Converts a MessagePack chunk assumed to be in the `fixext`/`ext` format family and parses it as a pair of an extension code and the data buffer that came with the chunk. */
    decodeRaw(chunk: Uint8Array): [Uint8Array, number] {
        const code = chunk[0];
        if (code === undefined || code === NIL_CODE) throw new MissingHeaderCodeError();

        const indices = this.deriveIndices(chunk);

        const hasLenStartIdx = indices.length === 5;

        const iExtCode = indices[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        const extCode = chunk[iExtCode]!;

        const iDataStart = indices[<typeof hasLenStartIdx extends true ? 3 : 2>(2 + +hasLenStartIdx)];
        const iDataEnd   = indices[<typeof hasLenStartIdx extends true ? 4 : 3>(3 + +hasLenStartIdx)];

        if (iDataEnd > chunk.byteLength) warnTruncatedChunk();

        return [chunk.subarray(iDataStart, iDataEnd), extCode];
    },

    /** Checks whether a chunk header code is supported by `Ext`. */
    isCodeValid(code: number): boolean {
        return (
            // fixext
            code === 0xd4 ||
            code === 0xd5 ||
            code === 0xd6 ||
            code === 0xd7 ||
            code === 0xd8 ||

            // ext
            code === 0xc7 ||
            code === 0xc8 ||
            code === 0xc9
        );
    },

    /** Checks whether a chunk is supported by `Ext`. */
    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    },

    /** Computes the index of the chunk header code, the starting index of the data containing the length (will not appear if the chunk in the positive `fixext` format family), the index of the extension header code, the starting index of the data containing the raw value, as well as the final exclusive index of the chunk. */
    deriveIndices(chunk: Uint8Array): [number, number, number, number] | [number, number, number, number, number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        // fixext
        if ((code & 0xf0) === 0xd0) {
            /* match code:
             *     case 0xd4: len = 1
             *     case 0xd5: len = 2
             *     case 0xd6: len = 4
             *     case 0xd7: len = 8
             *     case 0xd8: len = 16
             */
            const len = 0b1 << (code - 0xd4);

            const iExtCode = iCode + 1;

            const iDataStart = iExtCode + 1;
            const iDataEnd = iDataStart + len;

            return [iCode, iExtCode, iDataStart, iDataEnd];
        }

        // ext
        /* match code:
         *     case 0xc7: lenLen = 1
         *     case 0xc8: lenLen = 2
         *     case 0xc9: lenLen = 4
         */
        const lenLen = 0b1 << (code - 0xc7);
        const maxLenLen = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

        const iLenStart = iCode + 1;

        let len: number = 0;
        for (let i: number = iLenStart, iByte: number = 0; iByte < maxLenLen; i++, iByte++) {
            len <<= 8;
            len |= chunk[i]!;
        }

        const iExtCode = iLenStart + lenLen;

        const iDataStart = iExtCode + 1;
        const iDataEnd = iDataStart + len;

        return [iCode, iLenStart, iExtCode, iDataStart, iDataEnd];
    }
};
