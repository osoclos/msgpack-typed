import { Bfr, Bool, Ext, Flt, Int, Str, Uint } from "../classes";

import { NIL_CODE, RawClass, ToParsed } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST, MpContainer, MpClassUnion } from "../types";

import { decodeGeneric, encodeGeneric, ExtUtils, InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError, TruncationCannotProceedError } from "../utils";

/** An object to parse maps and records, representing the `fixmap` and `map` format families in the MessagePack specification. */
export const Obj = {
    parse,

    /** Serialises any data stored inside wrappers in the map/record and implicitly converts any other items into a wrapper-appropriate for its type before converting it into a parsable MessagePack chunk. */
    encode(obj: ObjPrimitive, exts: Ext<RawClass<unknown>, number, boolean> | Ext<RawClass<unknown>, number, boolean>[] = []): Uint8Array {
        const header = Obj.encodeHeader(obj);

        const buffers: Uint8Array[] = [header];
        for (const [key, item] of obj instanceof Map ? obj : Object.entries(obj)) buffers.push(encodeGeneric(key, exts), encodeGeneric(item, exts));

        const chunkLen = buffers.reduce((a, b) => a + b.length, 0);

        const chunk = new Uint8Array(chunkLen);
        for (let i: number = 0, offset: number = 0; i < buffers.length; offset += buffers[i]!.length, i++) chunk.set(buffers[i]!, offset);

        return chunk;
    },

    /** Produces the metadata header of `fixmap` and `map` format families from a native map/record. Useful if you want more precise control over the generation of MessagePack chunks in an array. */
    encodeHeader(obj: ObjPrimitive): Uint8Array {
        if (!this.isValid(obj)) throw new InvalidDataTypeError(obj);

        const len = obj instanceof Map ? obj.size : Object.keys(obj).length;

        let code: number;
        let lenLen: number;

        switch (true) {
            // fixmap
            case len <= 0x0f: {
                code = 0x80 | len;
                lenLen = 0;

                break;
            }

            // map
            case len <= 0xffff: {
                code = 0xde;
                lenLen = 2;

                break;
            }

            default: {
                code = 0xdf;
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

    /** Converts a MessagePack chunk assumed to be in the `fixmap`/`map` format family and parses it into an array of sub-buffers. Useful if you want more precise control over the parsing of MessagePack chunks in an array. */
    decodeHeader(chunk: Uint8Array): [Uint8Array, Uint8Array][] {
        const indices = Obj.deriveIndices(chunk);

        const hasLenStartIdx = indices.length === 4;

        const obj: [Uint8Array, Uint8Array][] = [];

        const dataIndices = <[number, number][]>indices[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        for (const [iKey, iItem] of dataIndices) obj.push([chunk.subarray(iKey), chunk.subarray(iItem)]);

        return obj;
    },

    /** Checks whether a value can be used on `Obj`. */
    isValid(data: unknown): data is ObjPrimitive {
        return data instanceof Map || (data !== null && typeof data === "object" && !Array.isArray(data));
    },

    /** Checks whether a chunk header code is supported by `Obj`. */
    isCodeValid(code: number): boolean {
        return (
            // fixmap
            (code & 0xf0) === 0x80 ||

            // map
            code === 0xde ||
            code === 0xdf
        );
    },

    /** Checks whether a chunk is supported by `Obj`. */
    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    },

    /** Computes the index of the chunk header code, the starting index of the data containing the length (will not appear if the chunk in the positive `fixmap` format family), the starting indices of the data containing nested chunks, as well as the final exclusive index of the chunk. */
    deriveIndices(chunk: Uint8Array): [number, [number, number][], number] | [number, number, [number, number][], number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        const headerIndices: [number] | [number, number] = [iCode];

        let len: number;
        let iDataStart: number;

        // fixmap
        if ((code & 0xf0) === 0x80) {
            len = code & 0x0f;
            iDataStart = iCode + 1;
        } else {
            // map

            /* match code:
             *     case 0xde: lenLen = 2
             *     case 0xdf: lenLen = 4
             */
            const lenLen = 0b10 << (code - 0xde);
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

        const dataIndices: [number, number][] = [];

        let iDataEnd = iDataStart;

        for (let i: number = 0; i < len; i++) {
            const subIndices: [number, number] = <[number, number]><unknown>[];

            getEachSubIndex: for (let j: number = 0, offset: number = iDataEnd; j < 2; j++, iDataEnd += offset) {
                subIndices.push(iDataEnd);

                chunk = chunk.subarray(offset);

                const iCode: number = 0;
                const code = chunk[iCode];

                if (code === undefined) throw new TruncationCannotProceedError();

                if (code === NIL_CODE) {
                    offset = 1;
                    continue getEachSubIndex;
                }

                for (const Cls of MP_CLASS_LIST) {
                    if (Cls.isChunkValid(chunk)) {
                        offset = Cls.deriveIndices(chunk).slice(-1)[0]!;
                        continue getEachSubIndex;
                    }
                }

                for (const Container of MP_CONTAINER_LIST) {
                    if (Container.isChunkValid(chunk)) {
                        offset = <number>Container.deriveIndices(chunk).slice(-1)[0]!;
                        continue getEachSubIndex;
                    }
                }

                if (ExtUtils.isChunkValid(chunk)) offset = ExtUtils.deriveIndices(chunk).slice(-1)[0]!;
                else throw new InvalidHeaderCodeError(code);
            }

            dataIndices.push(subIndices);
        }

        return [...headerIndices, dataIndices, iDataEnd]
    }
} satisfies MpContainer<ObjPrimitive, unknown, [Uint8Array, Uint8Array][]>;

export type ObjPrimitive = Map<unknown, unknown> | Record<Exclude<keyof any, symbol>, unknown>

/** Parses any wrappers in the map, retrieves their raw values and correspondingly replaces them in-place. Any non-wrapper items inside the array are ignored and left as-is. */
function parse<K, V>(obj: Map<K, V>): Map<ToParsed<K>, ToParsed<V>>;
/** Parses any wrappers in the record, retrieves their raw values and correspondingly replaces them in-place. Any non-wrapper items inside the array are ignored and left as-is. */
function parse<K extends Exclude<keyof any, symbol>, V>(obj: Record<K, V>): Record<ToParsed<K>, ToParsed<V>>;
function parse<K, V>(obj: Map<K, V> | Record<Extract<K, Exclude<keyof any, symbol>>, V>): Map<ToParsed<K>, ToParsed<V>> | Record<ToParsed<Extract<K, Exclude<keyof any, symbol>>>, ToParsed<V>> {
    const parsed = new Map<ToParsed<K>, ToParsed<V>>();

    for (const pair of obj instanceof Map ? obj : Object.entries(obj)) {
        const parsedPair: [ToParsed<K>, ToParsed<V>] = <[ToParsed<K>, ToParsed<V>]><unknown>[];

        parseEachPair: for (const item of pair) {
            if (
                item instanceof Uint ||
                item instanceof Int  ||

                item instanceof Flt  ||

                item instanceof Bool ||

                item instanceof Str  ||
                item instanceof Bfr
            ) {
                parsedPair.push(<ToParsed<K | V>>item.data);
                continue parseEachPair;
            }

            for (const Container of MP_CONTAINER_LIST) {
                if (Container.isValid(item)) {
                    parsedPair.push((<any>Container.parse)(item));
                    continue parseEachPair;
                }
            }
        }

        parsed.set(<ToParsed<K>>parsedPair[0], <ToParsed<V>>parsedPair[1]);
    }

    return obj instanceof Map ? parsed : Object.fromEntries(parsed.entries());
}

/** Converts a MessagePack chunk assumed to be in the `fixarray`/`array` format family and parses it into a map of wrappers, `null`s and nested arrays and maps. */
function decode<K extends MpClassUnion, V extends MpClassUnion>(chunk: Uint8Array): Map<K, V>;

/** Converts a MessagePack chunk assumed to be in the `fixarray`/`array` format family and parses it into a map of wrappers, `null`s and nested arrays and maps, as well as specifiable extensions to decode custom extension chunks. */
function decode<K extends MpClassUnion | RawClass<unknown>, V extends MpClassUnion | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<Extract<K | V, RawClass<unknown>>, number, boolean> | Ext<Extract<K | V, RawClass<unknown>>, number, boolean>[], doDecompression?: boolean): Map<Extract<K, MpClassUnion> | Extract<K, RawClass<unknown>>["prototype"], Extract<V, MpClassUnion> | Extract<V, RawClass<unknown>>["prototype"]>;
function decode<K extends MpClassUnion | RawClass<unknown>, V extends MpClassUnion | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<Extract<K | V, RawClass<unknown>>, number, boolean> | Ext<Extract<K | V, RawClass<unknown>>, number, boolean>[] = [], doDecompression: boolean = false): Map<Extract<K, MpClassUnion> | Extract<K, RawClass<unknown>>["prototype"], Extract<V, MpClassUnion> | Extract<V, RawClass<unknown>>["prototype"]> {
    const subChunks = Obj.decodeHeader(chunk);

    const obj = new Map();
    for (const [keyChunk, itemChunk] of subChunks) obj.set(decodeGeneric(keyChunk, exts, doDecompression), decodeGeneric(itemChunk, exts, doDecompression));

    return obj;
}
