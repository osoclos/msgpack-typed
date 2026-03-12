import { Bool, Flt, Int, Slice, Str, Uint } from "../classes";
import { MP_CLASS_CONTAINER_UNION_LIST, MpClassImpl, MpClassUnion, MpPrimitiveUnion } from "../types";

import { decodeGeneric, encodeGeneric, toLegible } from "../utils";

import { Obj, ObjClassed, ObjPrimitive, ObjRaw } from "./Obj";

export const Arr = {
    /** Converts an array of MessagePack classes and primitives to simply its primitives */
    raw<T extends ArrRaw>(arr: ArrPrimitive): T {
        const raw: T = <T><unknown>[];

        for (let item of arr) {
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

            raw.push(<T[number]>item);
        }

        return raw;
    },

    /** Encodes an array of MessagePack classes and primitives and converts it to a MessagePack chunk. */
    encode(arr: ArrPrimitive): Uint8Array {
        const header = this.encodeHeader(arr);

        const buffers: Uint8Array[] = [header];
        for (const item of arr) buffers.push(encodeGeneric(item));

        const outBfrLen = buffers.reduce((a, b) => a + b.length, 0);

        const outBfr = new Uint8Array(outBfrLen);
        for (let i: number = 0, offset: number = 0; i < buffers.length; offset += buffers[i]!.length, i++) outBfr.set(buffers[i]!, offset);

        return outBfr;
    },

    /** Encodes an array of MessagePack classes and primitives and converts it to a MessagePack chunk header without its data. */
    encodeHeader(arr: ArrPrimitive): Uint8Array {
        if (!this.isRawValid(arr)) throw new TypeError(`Invalid value was passed into \`Arr.encode\`. Did not expect ${toLegible(arr)}.`);

        const len = arr.length;

        let code: number;
        let lenLen: number;

        switch (true) {
            case len <= 0x0f: {
                code = 0x90 | len;
                lenLen = 0;

                break;
            }

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

        let tmpLen = len;
        for (let i: number = lenLen; i >= 1; i--) {
            header[i] = tmpLen & 0xff;
            tmpLen >>>= 8;
        }

        return header;
    },

    /** Decodes an array MessagePack chunk, validates it and parses it to an array of MessagePack classes. */
    decode(chunk: Uint8Array): ArrClassed {
        const ranges = this.deriveChunkRanges(chunk);

        const hasLenStartIdx = ranges.length === 4;

        const arr: ArrClassed = [];

        const dataIndices = <number[]>ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        for (const i of dataIndices) arr.push(decodeGeneric(chunk.subarray(i)));

        return arr;
    },

    /** Checks whether a value is valid for an array of MessagePack classes and primitives. */
    isRawValid(data: any): data is ArrPrimitive {
        return Array.isArray(data);
    },

    /** Checks whether a chunk header code corresponds to an array of MessagePack classes. */
    isCodeValid(code: number): boolean {
        return (
            (code & 0x90) === 0x90 ||

            code === 0xdc ||
            code === 0xdd
        );
    },

    /** Checks whether a chunk corresponds to an array of MessagePack classes. */
    isChunkValid: MpClassImpl.isChunkValid.bind(this),

    /** Retrieves the starting index of each section of the chunk, as well as the final exclusive index, for an array of MessagePack classes. */
    deriveChunkRanges(chunk: Uint8Array): [number, number[], number] | [number, number, number[], number] {
        const iChunkStart: number = 0;

        const code = chunk[iChunkStart];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        const metaRanges: number[] = [iChunkStart];

        let len: number;
        let iDataStart: number;

        if ((code & 0x90) === 0x90) {
            len = code & 0x0f;
            iDataStart = iChunkStart + 1;
        } else {
            let lenLen: number;

            switch (code) {
                case 0xdc: {
                    lenLen = 2;
                    break;
                }

                case 0xdd: {
                    lenLen = 4;
                    break;
                }

                default: throw new TypeError(`Invalid chunk header for \`Arr\`. Did not expect ${toLegible(code, true)}.`);
            }

            const iLenStart = iChunkStart + 1;
            metaRanges.push(iLenStart);

            const nBytes = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

            len = 0;
            for (let i: number = iLenStart; i < nBytes; i++) {
                len <<= 8;
                len |= chunk[i]!;
            }

            iDataStart = iLenStart + lenLen;
        }

        const dataIndices: number[] = [];

        let iDataEnd = iDataStart;
        for (let i: number = 0; i < len; i++) {
            dataIndices.push(iDataEnd);

            chunk = chunk.subarray(iDataEnd);

            for (const Cls of MP_CLASS_CONTAINER_UNION_LIST) {
                if (Cls.isChunkValid(chunk)) iDataEnd = <number>Cls.deriveChunkRanges(chunk).slice(-1)[0]!;
                else throw new TypeError("Invalid data was passed as a MessagePack chunk.");
            }
        }

        return <any>[...metaRanges, dataIndices, iDataEnd];
    }
};

export type ArrPrimitive = (MpClassUnion | MpPrimitiveUnion)[];

export type ArrClassed = (MpClassUnion | ArrClassed | ObjClassed | null)[];
export type ArrRaw = (Exclude<MpPrimitiveUnion, ArrPrimitive | ObjPrimitive> | ArrRaw | ObjRaw)[];
