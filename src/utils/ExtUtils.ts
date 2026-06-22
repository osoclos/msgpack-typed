import type { Ext } from "../extensions";
import { MpError, type Constructor } from "../internal";

/** An object to handle any extension-related features and helper functions to ease extension development and usage. */
export const ExtUtils = {
    /** Serialises data and converts it into a parsable MessagePack chunk using a specified extension that supports it. */
    encodeWith<T extends Constructor<unknown>>(ext: Ext<T, number, boolean>, value: T["prototype"]) {
        if (!ext.isEncodable(value)) throw new MpError.InvalidValue(ext[Symbol.toStringTag], "ENCODING");

        const [payload, codeExt] = ext.encode(value);
        return this.encodeRaw(payload, codeExt);
    },

    /** Converts a buffer containing data into a parsable MessagePack chunk given an extension code. Useful if you already have custom data in byte form. */
    encodeRaw(payload: Uint8Array, codeExt: number) {
        let code: number;
        let lenLen: number;

        const len = payload.byteLength;

        // FIXEXT
        switch (len) {
            case 0x01: {
                code = 0xd4;
                lenLen = 0;

                break;
            }

            case 0x02: {
                code = 0xd5;
                lenLen = 0;

                break;
            }

            case 0x04: {
                code = 0xd6;
                lenLen = 0;

                break;
            }

            case 0x08: {
                code = 0xd7;
                lenLen = 0;

                break;
            }

            case 0x10: {
                code = 0xd8;
                lenLen = 0;

                break;
            }

            default: {
                if (len <= 0xff) {
                    code = 0xc7;
                    lenLen = 1;

                    break;
                }

                if (len <= 0xffff) {
                    code = 0xc8;
                    lenLen = 2;

                    break;
                }

                if (len <= 0xffff_ffff) {
                    code = 0xc9;
                    lenLen = 4;

                    break;
                }

                throw new MpError.InvalidValue("ExtUtils", "ENCODING");
            }
        }

        const chunk = new Uint8Array(1 + lenLen + 1 + len);
        chunk[0] = code;

        switch (lenLen) {
            case 0: break;

            case 1: {
                chunk[1] = len;
                break;
            }

            case 2: {
                chunk[1] = (len    >>> 8)   & 0xff;
                chunk[2] =  len /* >>> 0 */ & 0xff;

                break;
            }

            case 4: {
                const view = new DataView(chunk.buffer);
                view.setUint32(1, len);

                break;
            }
        }

        chunk[1 + lenLen] = codeExt;
        chunk.set(payload, 1 + lenLen + 1);

        return chunk;
    },

    /** Converts a MessagePack chunk assumed to be in the `fixext`/`ext` format family and creates a class object using a specified extension that supports it. */
    decodeWith<T extends Constructor<unknown>, S extends boolean>(ext: Ext<T, number, S>, chunk: Uint8Array): T["prototype"] {
        const decodableRes = ext.isDecodable(chunk);
        if (!decodableRes) throw new MpError.IncompatibleChunk(ext[Symbol.toStringTag], "DECODING");

        const [payload, codeExt] = this.decodeRaw(chunk);
        if (!ext.isCodeValid(codeExt)) throw new MpError.IncompatibleChunk(ext[Symbol.toStringTag], "INVALID_CODE");

        return ext.decode(payload, codeExt);
    },

    /** Converts a MessagePack chunk assumed to be in the `fixext`/`ext` format family and parses it as a pair of an extension code and the data buffer that came with the chunk. */
    decodeRaw(chunk: Uint8Array): [Uint8Array, number] {
        const indices = this.deriveChunkIndices(chunk);

        const hasLenStartIdx = indices.length === 5;

        const iCodeExt = indices[1 + +hasLenStartIdx /* hasLenStartIdx ? 2 : 1 */]!;
        const codeExt = chunk[iCodeExt]! << 24 >> 24;

        const iPayloadStart = indices[2 + +hasLenStartIdx /* hasLenStartIdx ? 3 : 2 */]!;
        const iPayloadEnd   = indices[3 + +hasLenStartIdx /* hasLenStartIdx ? 4 : 3 */]!;

        if (iPayloadEnd > chunk.byteLength) throw new MpError.TruncatedChunk("ExtUtils", "DECODING", iPayloadEnd, chunk.byteLength);

        return [chunk.subarray(iPayloadStart, iPayloadEnd), codeExt];
    },

    /** Checks whether a chunk header code is supported by `Ext`. */
    isCodeValid(code: number): boolean {
        return (
            // FIXEXT
            code === 0xd4 ||
            code === 0xd5 ||
            code === 0xd6 ||
            code === 0xd7 ||
            code === 0xd8 ||

            // EXT
            code === 0xc7 ||
            code === 0xc8 ||
            code === 0xc9
        );
    },

    /** Checks whether a chunk is supported by `Ext`. */
    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MpError.MissingCode("ExtUtils", "VALIDATE_CHUNK");

        return this.isCodeValid(code);
    },

    /** Computes the index of the chunk header code, the starting index of the data containing the length (will not appear if the chunk in the positive `fixext` format family), the index of the extension header code, the starting index of the data containing the raw value, as well as the final exclusive index of the chunk. */
    deriveChunkIndices(chunk: Uint8Array): [number, number, number, number] | [number, number, number, number, number] {
        const code = chunk[0 /* iCode */]!;

        if (!this.isChunkValid(chunk)) throw new MpError.InvalidCode("ExtUtils", "UNSUPPORTED", code);

        // FIXEXT
        if ((code & 0xf0) === 0xd0) {
            /* match code:
             *     case 0xd4: len = 1
             *     case 0xd5: len = 2
             *     case 0xd6: len = 4
             *     case 0xd7: len = 8
             *     case 0xd8: len = 16
             */
            const len = 0b1 << (code - 0xd4);

            return [
                0 /* iCode */,

                1 /* iCodeExt */,

                1 + 1 /* iPayloadStart */,
                1 + 1 + len /* iPayloadEnd */
            ];
        }

        // EXT

        /* match code:
         *     case 0xc7: lenLen = 1
         *     case 0xc8: lenLen = 2
         *     case 0xc9: lenLen = 4
         */
        const lenLen = 0b1 << (code - 0xc7);

        let len: number;
        switch (lenLen) {
            case 1: {
                len = chunk[1]!;
                break;
            }

            case 2: {
                len =
                    (chunk[1]!    << 8) |
                     chunk[2]! /* << 0 */;

                break;
            }

            case 4: {
                const view = new DataView(chunk.buffer, chunk.byteOffset);

                len = view.getUint32(1);
                break;
            }

            default: throw new MpError.InvalidCode("ExtUtils", "UNSUPPORTED", code);
        }

        return [
            0 /* iCode */,

            1 /* iLenStart */,

            1 + lenLen /* iCodeExt */,

            1 + lenLen + 1 /* iPayloadStart */,
            1 + lenLen + 1 + len /* iPayloadEnd */
        ];
    }
};
