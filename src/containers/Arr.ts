import { Bool, Flt, Int, Slice, Str, Uint } from "../classes";
import { MP_CLASS_CONTAINER_UNION_LIST, MpClassImpl, MpClassUnion, MpPrimitiveUnion } from "../types";

import { decodeGeneric, toLegible } from "../utils";

export const Arr = {
    /** Converts an array of MessagePack classes and primitives to simply its primitives */
    raw<T extends ArrRaw[number]>(arr: ArrPrimitive): T[] {
        const raw: T[] = [];

        for (let item of arr) {
            if (
                item instanceof Uint  ||
                item instanceof Int   ||

                item instanceof Flt   ||

                item instanceof Bool  ||
                item instanceof Str   ||

                item instanceof Slice
            ) item = item.raw();

            if (this.isRawValid(item)) item = this.raw(item);

            raw.push(<T>item);
        }

        return raw;
    },

    encode(arr: ArrPrimitive): Uint8Array {
        if (!this.isRawValid(arr)) throw new TypeError(`Invalid value was passed into \`Arr.encode\`. Did not expect ${toLegible(arr)}.`);

        const len = arr.length;

        let code: number;
        let lenLen: number;

        switch (true) {
            case len < 0x10: {
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
        for (let i: number = 1; i <= lenLen; i++) {
            header[i] = tmpLen & 0xff;
            tmpLen >>>= 8;
        }

        const buffers: Uint8Array[] = [header];

        for (let item of arr) {
            switch (true) {
                case typeof item === "number": {
                    item = new Flt(item);
                    break;
                }

                case typeof item === "bigint": {
                    item = new Int((item & 0x7fff_ffff_ffff_ffffn) - (item & 0x8000_0000_0000_0000n));
                    break;
                }

                case typeof item === "string": {
                    item = new Str(item);
                    break;
                }

                case typeof item === "boolean": {
                    item = new Bool(item);
                    break;
                }

                case item instanceof Uint8Array: {
                    item = new Slice(item);
                    break;
                }

                default: break;
            }

            let bfr: Uint8Array;
            switch (true) {
                case Array.isArray(item): {
                    bfr = this.encode(item);
                    break;
                }

                case item === null: {
                    bfr = new Uint8Array([0xc0]);
                    break;
                }

                default: {
                    bfr = item.encode();
                    break;
                }
            }

            buffers.push(bfr);
        }

        const outBfrLen = buffers.reduce((a, b) => a + b.length, 0);

        const outBfr = new Uint8Array(outBfrLen);
        for (let i: number = 0, offset: number = 0; i < buffers.length; offset += buffers[i]!.length, i++) outBfr.set(buffers[i]!, offset);

        return outBfr;
    },

    decode(chunk: Uint8Array): ArrClassed {
        const ranges = this.deriveChunkRanges(chunk);

        const hasLenStartIdx = ranges.length === 4;

        const arr: ArrClassed = [];

        const dataIndices = <number[]>ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        for (const i of dataIndices) arr.push(decodeGeneric(chunk.subarray(i)));

        return arr;
    },

    isRawValid(data: any): data is ArrPrimitive {
        return Array.isArray(data);
    },

    isCodeValid(code: number): boolean {
        return (
            (code & 0x90) === 0x90 ||

            code === 0xdc ||
            code === 0xdd
        )
    },

    isChunkValid: MpClassImpl.isChunkValid.bind(this),

    /** Retrieves the starting index of each section of the chunk, as well as the final exclusive index, for a Str */
    deriveChunkRanges(chunk: Uint8Array): [number, number[], number] | [number, number, number[], number] {
        const iChunkStart = chunk.byteOffset;

        const code = chunk[iChunkStart];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        const ranges: number[] = [iChunkStart];

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
            ranges.push(iLenStart);

            len = 0;
            for (let i: number = iLenStart, nBytes = 0; i < chunk.byteLength && nBytes < lenLen; i++, nBytes++) len |= chunk[i]! << (8 * nBytes);

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

        return <any>[...ranges, dataIndices, iDataEnd];
    }
};

export type ArrPrimitive = (MpClassUnion | MpPrimitiveUnion)[];

export type ArrClassed = (MpClassUnion | ArrClassed | null)[];
export type ArrRaw = (Exclude<MpPrimitiveUnion, ArrPrimitive> | ArrRaw)[];
