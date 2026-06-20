import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import type { Ext } from "../extensions";

import { decodeAny, encodeAny, ExtUtils } from "../utils";

import { CODE_NIL, MpClass, MpError, type Constructor, type MpClassInterface, type Parsed } from "../internal";

import { Obj } from "./Obj";

export const Arr = {
    parse<T>(arr: ValueArr<T>): Parsed<ValueArr<T>> {
        return arr.map((item) => {
            if (item instanceof MpClass()) return item.value;

            if (Arr.isValueValid(item)) return Arr.parse(item);
            if (Obj.isValueValid(item)) return Obj.parse(item);

            return item;
        });
    },

    encode<T>(arr: ValueArr<T>, exts: Ext<Constructor<unknown>, number, boolean>[] = []): Uint8Array {
        const header = this.encodeHeader(arr);

        let subchunksLen: number = 0;
        const subchunks: Uint8Array[] = [];

        for (const item of arr) {
            const subchunk = encodeAny(item, exts);

            subchunks.push(subchunk);
            subchunksLen += subchunk.byteLength;
        }

        const chunk = new Uint8Array(header.byteLength + subchunksLen);
        chunk.set(header, 0);

        for (let iChunk: number = 0, iOffset: number = header.byteLength; iChunk < subchunks.length; iChunk++) {
            const subchunk = subchunks[iChunk]!;

            chunk.set(subchunk, iOffset);
            iOffset += subchunk.byteLength;
        }

        return chunk;
    },

    encodeHeader<T>(arr: ValueArr<T>): Uint8Array {
        if (!this.isValueValid(arr)) throw new MpError.InvalidValue("Arr", "ENCODING");

        const len = arr.length;

        let code: number;
        let lenLen: number;

        lenCheck: {
            // FIXARR
            if (len <= 0x0f) {
                code = 0x90 | len;
                lenLen = 0;

                break lenCheck;
            }

            // ARR

            if (len <= 0xffff) {
                code = 0xdc;
                lenLen = 2;

                break lenCheck;
            }

            if (len <= 0xffff_ffff) {
                code = 0xdd;
                lenLen = 4;

                break lenCheck;
            }

            throw new MpError.InvalidValue("Arr", "ENCODING");
        }

        const header = new Uint8Array(1 + lenLen);
        header[0] = code;

        switch (lenLen) {
            case 2: {
                header[1] = (len    >>> 8)   & 0xff;
                header[2] =  len /* >>> 0 */ & 0xff;

                break;
            }

            case 4: {
                const view = new DataView(header.buffer);
                view.setUint32(1, len);

                break;
            }
        }

        return header;
    },

    decode<T extends MpClassInterface<unknown> | null, C extends unknown>(chunk: Uint8Array, exts: Ext<Constructor<C>, number, boolean>[] = [], doDecompression: boolean = false): ValueArr<T | C> {
        const subchunks = this.decodeHeader(chunk);
        return subchunks.map((subchunk) => decodeAny<T, C>(subchunk, exts, doDecompression)) as ValueArr<T | C>;
    },

    decodeHeader(chunk: Uint8Array): Uint8Array[] {
        const indices = this.deriveChunkIndices(chunk);

        const hasLenStartIdx = indices.length === 4;
        const iSubchunks = indices[1 + +hasLenStartIdx /* hasLenStartIdx ? 2 : 1 */] as number[];

        const subchunks: Uint8Array[] = [];
        for (const i of iSubchunks) subchunks.push(chunk.subarray(i));

        return subchunks;
    },

    isValueValid<T>(value: unknown): value is ValueArr<T> {
        return Array.isArray(value);
    },

    isCodeValid(code: number): boolean {
        return (
            // FIXARR
            (code & 0xf0) === 0x90 ||

            // ARR
            code === 0xdc ||
            code === 0xdd
        );
    },

    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MpError.MissingCode("Arr", "VALIDATE_CHUNK");

        return this.isCodeValid(code);
    },

    deriveChunkIndices(chunk: Uint8Array): [number, number[], number] | [number, number, number[], number] {
        const code = chunk[0 /* iCode */]!;

        if (!this.isChunkValid(chunk)) throw new MpError.InvalidCode("Arr", "UNSUPPORTED", code);

        let len: number;
        let iPayloadStart: number;

        const isFixarr = (code & 0xf0) === 0x90;

        if (isFixarr) {
            len = code & 0x0f;
            iPayloadStart = 1;
        } else {
            /* match code:
             *     case 0xdc: lenLen = 2
             *     case 0xdd: lenLen = 4
             */
            const lenLen = 0b10 << (code - 0xdc);

            switch (lenLen) {
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

                default: throw new MpError.InvalidCode("Arr", "UNSUPPORTED", code);
            }

            iPayloadStart = 1 + lenLen;
        }

        const iPayloads: number[] = [];
        let iPayloadEnd = iPayloadStart;

        for (let i: number = 0; i < len; i++) {
            iPayloads.push(iPayloadEnd);

            const subchunk = chunk.subarray(iPayloadEnd);

            const code = subchunk[0];
            if (code === undefined) throw new MpError.TruncatedChunk("Arr", "DECODING", iPayloadEnd, chunk.byteLength);

            if (code === CODE_NIL) {
                iPayloadEnd += 1;
                continue;
            }

            if (Uint.isCodeValid(code)) {
                const indices = Uint.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1]!;
                continue;
            }

            if (Int.isCodeValid(code)) {
                const indices = Int.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1]!;
                continue;
            }

            if (Flt.isCodeValid(code)) {
                const indices = Flt.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1]!;
                continue;
            }

            if (Bool.isCodeValid(code)) {
                const indices = Bool.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1]!;
                continue;
            }

            if (Str.isCodeValid(code)) {
                const indices = Str.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1]!;
                continue;
            }

            if (Bfr.isCodeValid(code)) {
                const indices = Bfr.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1]!;
                continue;
            }

            if (Arr.isCodeValid(code)) {
                const indices = Arr.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1] as number;
                continue;
            }

            if (Obj.isCodeValid(code)) {
                const indices = Obj.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1] as number;
                continue;
            }

            if (ExtUtils.isCodeValid(code)) {
                const indices = ExtUtils.deriveChunkIndices(subchunk);

                iPayloadEnd += indices[indices.length - 1] as number;
                continue;
            }

            throw new MpError.InvalidCode("Arr", "UNSUPPORTED", code);
        }

        return (
            isFixarr
                ? [
                    0 /* iCode */,

                    iPayloads,
                    iPayloadEnd
                ] : [
                    0 /* iCode */,

                    1 /* iLenStart */,

                    iPayloads,
                    iPayloadEnd
                ]
        );
    }
};

export type ValueArr<T> = T[];
