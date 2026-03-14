import { Bool, Ext, Flt, Int, Slice, Str, Uint } from "../classes";
import { MpClassUnion, MpPrimitiveUnion, RawClass } from "../types";

import { decodeGeneric, encodeGeneric, ExtUtils, toLegible } from "../utils";

import { Arr, ArrClassed, ArrPrimitive, ArrRaw } from "./Arr";

export const Obj = {
    /** Converts a map of MessagePack classes and primitives to simply its primitives */
    raw<T extends ObjRaw>(obj: ObjPrimitive): T {
        const raw: T = <T>new Map();

        for (let pair of obj) {
            const rawPair: [Exclude<MpPrimitiveUnion, ArrPrimitive | ObjPrimitive> | ArrRaw | ObjRaw, Exclude<MpPrimitiveUnion, ArrPrimitive | ObjPrimitive> | ArrRaw | ObjRaw] = <any>[]

            for (let i: number = 0; i < 2; i++) {
                let item = pair[i]!;

                if (
                    item instanceof Uint  ||
                    item instanceof Int   ||

                    item instanceof Flt   ||

                    item instanceof Bool  ||
                    item instanceof Str   ||

                    item instanceof Slice
                ) item = item.raw();

                if (Arr.isRawValid(item)) item = Arr.raw(item);
                if (Obj.isRawValid(item)) item = Obj.raw(item);

                rawPair[i] = <any>item;
            }

            raw.set(rawPair[0], rawPair[1]);
        }

        return raw;
    },

    /** Encodes a map of MessagePack classes and primitives and converts it to a MessagePack chunk. */
    encode(obj: ObjPrimitive): Uint8Array {
        const header = this.encodeHeader(obj);
        const buffers: Uint8Array[] = [header];

        for (const pair of obj)
            for (let i: number = 0; i < 2; i++) buffers.push(encodeGeneric(pair[i]!));

        const outBfrLen = buffers.reduce((a, b) => a + b.length, 0);

        const outBfr = new Uint8Array(outBfrLen);
        for (let i: number = 0, offset: number = 0; i < buffers.length; offset += buffers[i]!.length, i++) outBfr.set(buffers[i]!, offset);

        return outBfr;
    },

    /** Encodes a map of MessagePack classes and primitives and converts it to a MessagePack chunk header without its data. */
    encodeHeader(obj: ObjPrimitive): Uint8Array {
        if (!this.isRawValid(obj)) throw new TypeError(`Invalid value was passed into \`Obj.encode\`. Did not expect ${toLegible(obj)}.`);

        const len = obj.size;

        let code: number;
        let lenLen: number;

        switch (true) {
            case len <= 0x0f: {
                code = 0x80 | len;
                lenLen = 0;

                break;
            }

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

        let tmpLen = len;
        for (let i: number = lenLen; i >= 1; i--) {
            header[i] = tmpLen & 0xff;
            tmpLen >>>= 8;
        }

        return header;
    },

    decode,

    /** Checks whether a value is valid for a map of MessagePack classes and primitives. */
    isRawValid(data: any): data is ObjPrimitive {
        return data instanceof Map;
    },

    /** Checks whether a chunk header code corresponds to a map of MessagePack classes. */
    isCodeValid(code: number): boolean {
        return (
            (code & 0xf0) === 0x80 ||

            code === 0xde ||
            code === 0xdf
        );
    },

    /** Checks whether a chunk corresponds to a map of MessagePack classes. */
    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) return false;

        return this.isCodeValid(code);
    },

    /** Retrieves the starting index of each section of the chunk, as well as the final exclusive index, for a map of MessagePack classes. */
    deriveChunkRanges(chunk: Uint8Array): [number, [number, number][], number] | [number, number, [number, number][], number] {
        const iChunkStart = chunk.byteOffset;

        const code = chunk[0];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        const metaRanges: number[] = [iChunkStart];

        let len: number;
        let iDataStart: number;

        if ((code & 0xf0) === 0x80) {
            len = code & 0x0f;
            iDataStart = 1;
        } else {
            let lenLen: number;

            switch (code) {
                case 0xde: {
                    lenLen = 2;
                    break;
                }

                case 0xdf: {
                    lenLen = 4;
                    break;
                }

                default: throw new TypeError(`Invalid chunk header for \`Obj\`. Did not expect ${toLegible(code, true)}.`);
            }

            const iLenStart = 1;
            metaRanges.push(iLenStart);

            const chunkLenLen = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

            len = 0;
            for (let i: number = iLenStart, nBytes: number = 0; nBytes < chunkLenLen; i++, nBytes++) {
                len <<= 8;
                len |= chunk[i]!;
            }

            iDataStart = iLenStart + lenLen;
        }

        const dataIndices: [number, number][] = [];

        let iDataEnd = iDataStart;
        for (let i: number = 0; i < len; i++) {
            const indices: [number, number] = <[number, number]><unknown>[];

            for (let j: number = 0; j < 2; j++) {
                indices.push(iDataEnd + chunk.byteOffset - iChunkStart);

                chunk = chunk.subarray(iDataEnd);

                let isInvalid: boolean = true;
                for (const Cls of [Uint, Int, Flt, Str, Bool, Slice, Arr, Obj]) {
                    if (!Cls.isChunkValid(chunk)) continue;

                    iDataEnd = <number>Cls.deriveChunkRanges(chunk).slice(-1)[0]!;

                    isInvalid = false;
                    break;
                }

                if (isInvalid) {
                         if (chunk[0] === 0xc0) iDataEnd = 1;
                    else if (ExtUtils.isChunkValid(chunk)) iDataEnd = ExtUtils.deriveChunkRanges(chunk).slice(-1)[0]!;
                    else throw new TypeError("Invalid data was passed as a MessagePack chunk.");
                }
            }

            dataIndices.push(indices);
        }

        return <any>[...metaRanges, dataIndices, iDataEnd + chunk.byteOffset - iChunkStart];
    },

    [Symbol.toStringTag]: "Obj"
};

export type ObjPrimitive = Map<MpClassUnion | MpPrimitiveUnion, MpClassUnion | MpPrimitiveUnion>;

export type ObjClassed = Map<MpClassUnion | ArrClassed | ObjClassed | null, MpClassUnion | ArrClassed | ObjClassed | null>;
export type ObjRaw = Map<Exclude<MpPrimitiveUnion, ArrPrimitive | ObjPrimitive> | ArrRaw | ObjRaw, Exclude<MpPrimitiveUnion, ArrPrimitive | ObjPrimitive> | ArrRaw | ObjRaw>;

/** Decodes an array MessagePack chunk, validates it and parses it to an array of MessagePack classes. */
function decode<T extends ObjClassed>(chunk: Uint8Array): T;

/** Decodes an array MessagePack chunk, validates it and parses it to to its value or object, with an option to add extensions to the encoder. */
function decode<T extends ObjClassed | Map<RawClass<any, any[]>, RawClass<any, any[]>>>(chunk: Uint8Array, exts?: Ext<RawClass<any, any[]>, number> | Ext<RawClass<any, any[]>, number>[]): T;

function decode(chunk: Uint8Array, exts?: Ext<any, number> | Ext<any, number>[]): ObjClassed {
    const ranges = Obj.deriveChunkRanges(chunk);

    const hasLenStartIdx = ranges.length === 4;

    const obj: ObjClassed = new Map();

    const dataIndices = <[number, number][]>ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
    for (const [iKey, iItem] of dataIndices) obj.set(decodeGeneric(chunk.subarray(iKey), exts), decodeGeneric(chunk.subarray(iItem), exts));

    return obj;
}
