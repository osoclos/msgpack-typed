import { Bfr, Bool, Ext, Flt, Int, Str, Uint } from "../classes";

import { RawClass, ToParsed  } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST, MpContainer, MpPrimitiveUnion } from "../types";

import { decodeGeneric, encodeGeneric, ExtUtils, InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError } from "../utils";

/** An object to parse arrays, representing the `fixarray` and `array` format families in the MessagePack specification. */
export const Arr = {
    /** Parses any wrappers in the array, retrieves their raw values and correspondingly replaces them in-place. Any non-wrapper items inside the array are ignored and left as-is. */
    parse<T>(arr: T[]): ToParsed<T>[] {
        const parsed: ToParsed<T>[] = [];

        for (let item of arr) {
            if (
                item instanceof Uint ||
                item instanceof Int  ||

                item instanceof Flt  ||

                item instanceof Bool ||

                item instanceof Str  ||
                item instanceof Bfr
            ) {
                parsed.push(<ToParsed<T>>item.data);
                continue;
            }

            for (const Container of MP_CONTAINER_LIST) {
                if (Container.isValid(item)) {
                    parsed.push((<any>Container.parse)(item));
                    continue;
                }
            }

            parsed.push(<ToParsed<T>>item);
        }

        return parsed;
    },

    /** Serialises any data stored inside wrappers in the array and implicitly converts any other items into a wrapper-appropriate for its type before converting it into a parsable MessagePack chunk. */
    encode(arr: unknown[], exts: Ext<RawClass<unknown>, number, boolean> | Ext<RawClass<unknown>, number, boolean>[] = []) {
        const header = this.encodeHeader(arr);

        const buffers: Uint8Array[] = [header];
        for (const item of arr) buffers.push(encodeGeneric(item, exts));

        const chunkLen = buffers.reduce((a, b) => a + b.length, 0);

        const chunk = new Uint8Array(chunkLen);
        for (let i: number = 0, offset: number = 0; i < buffers.length; offset += buffers[i]!.length, i++) chunk.set(buffers[i]!, offset);

        return chunk;
    },

    /** Produces the metadata header of `fixarray` and `array` format families from a native array. Useful if you want more precise control over the generation of MessagePack chunks in an array. */
    encodeHeader(arr: unknown[]) {
        if (!this.isValid(arr)) throw new InvalidDataTypeError(arr);

        const len = arr.length;

        let code: number;
        let lenLen: number;

        switch (true) {
            // fixarr
            case len <= 0x0f: {
                code = 0x90 | len;
                lenLen = 0;

                break;
            }

            // arr
            case len <= 0xffff: {
                code = 0xdc;
                lenLen = 2;

                break;
            }

            default: {
                code = 0xdd;
                lenLen = 4;

                break;
            }
        }

        const iDataStart = 1 + lenLen;

        const header = new Uint8Array(iDataStart);
        header[0] = code;

        for (let i: number = 1, iByte: number = lenLen - 1; iByte >= 0; i++, iByte--)
            header[i] = (len >>> (iByte * 8)) & 0xff;

        return header;
    },

    decode,

    /** Converts a MessagePack chunk assumed to be in the `fixarray`/`array` format family and parses it into an array of sub-buffers. Useful if you want more precise control over the parsing of MessagePack chunks in an array. */
    decodeHeader(chunk: Uint8Array): Uint8Array[] {
        const indices = Arr.deriveIndices(chunk);

        const hasLenStartIdx = indices.length === 4;

        const arr: Uint8Array[] = [];

        const dataIndices = <number[]>indices[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        for (const i of dataIndices) arr.push(chunk.subarray(i));

        return arr;
    },

    /** Checks whether a value can be used on `Arr`. */
    isValid(data: unknown): data is unknown[] {
        return Array.isArray(data);
    },

    /** Checks whether a chunk header code is supported by `Arr`. */
    isCodeValid(code: number): boolean {
        return (
            // fixarr
            (code & 0xf0) === 0x90 ||

            // arr
            code === 0xdc ||
            code === 0xdd
        );
    },

    /** Checks whether a chunk is supported by `Arr`. */
    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    },

    /** Computes the index of the chunk header code, the starting index of the data containing the length (will not appear if the chunk in the positive `fixarray` format family), the starting indices of the data containing nested chunks, as well as the final exclusive index of the chunk. */
    deriveIndices(chunk: Uint8Array): [number, number[], number] | [number, number, number[], number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        const headerIndices: [number] | [number, number] = [iCode];

        let len: number;
        let iDataStart: number;

        // fixarr
        if ((code & 0xf0) === 0x90) {
            len = code & 0x0f;
            iDataStart = 1;
        } else {
            // arr

            /* match code:
             *     case 0xdc: lenLen = 2
             *     case 0xdd: lenLen = 4
             */
            const lenLen = 0b1 << (code - 0xdc);
            const maxLenLen = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

            const iLenStart = iCode + 1;
            headerIndices.push(iLenStart);

            len = 0;
            for (let i: number = iLenStart, iByte: number = 0; iByte < maxLenLen; i++, iByte++) {
                len <<= 8;
                len |= chunk[i]!;
            }

            iDataStart = iLenStart + lenLen;
        }

        const dataIndices: number[] = [];

        let iDataEnd = iDataStart;

        iterateToEnd: for (let i: number = 0, offset: number = 0; i < len; i++, iDataEnd += offset) {
            dataIndices.push(iDataEnd);

            chunk = chunk.subarray(offset);

            const iCode: number = 0;
            const code = chunk[iCode]!;

            if (code === 0xc0) {
                offset = 1;
                continue iterateToEnd;
            }

            for (const Cls of MP_CLASS_LIST) {
                if (Cls.isChunkValid(chunk)) {
                    offset = Cls.deriveIndices(chunk).slice(-1)[0]!;
                    continue iterateToEnd;
                }
            }

            for (const Container of MP_CONTAINER_LIST) {
                if (Container.isChunkValid(chunk)) {
                    offset = <number>Container.deriveIndices(chunk).slice(-1)[0]!;
                    continue iterateToEnd;
                }
            }

            if (ExtUtils.isChunkValid(chunk)) offset = ExtUtils.deriveIndices(chunk).slice(-1)[0]!;
            else throw new InvalidHeaderCodeError(code);
        }

        return [...headerIndices, dataIndices, iDataEnd];
    }
} satisfies MpContainer<unknown[], Exclude<unknown, unknown[]>, Uint8Array[]>;

/** Converts a MessagePack chunk assumed to be in the `fixarray`/`array` format family and parses it into an array of wrappers, `null`s and nested arrays and maps. */
function decode<T extends MpPrimitiveUnion | null>(chunk: Uint8Array): T[];

/** Converts a MessagePack chunk assumed to be in the `fixarray`/`array` format family and parses it into an array of wrappers into `null`s and nested arrays and maps, as well as specifiable extensions to decode custom extension chunks. */
function decode<T extends MpPrimitiveUnion | RawClass<unknown> | null>(chunk: Uint8Array, exts: Ext<Extract<T, RawClass<unknown>>, number, boolean> | Ext<Extract<T, RawClass<unknown>>, number, boolean>[]): (Extract<T, MpPrimitiveUnion | null> | Extract<T, RawClass<unknown>>["prototype"])[];
function decode<T extends MpPrimitiveUnion | RawClass<unknown> | null>(chunk: Uint8Array, exts: Ext<Extract<T, RawClass<unknown>>, number, boolean> | Ext<Extract<T, RawClass<unknown>>, number, boolean>[] = []): (Extract<T, MpPrimitiveUnion | null> | Extract<T, RawClass<unknown>>["prototype"])[] {
    const subChunks = Arr.decodeHeader(chunk);
    return <any>subChunks.map<T>((chunk) => <T>decodeGeneric(chunk, exts));
}
