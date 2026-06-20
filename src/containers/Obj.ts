import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import type { Ext } from "../extensions";

import { decodeAny, encodeAny, ExtUtils } from "../utils";

import { CODE_NIL, MpClass, MpError, type Constructor, type MpClassInterface, type Parsed } from "../internal";

import { Arr } from "./Arr";

export const Obj = {
    parse<K, V>(obj: ValueObj<K, V>): Parsed<ValueObj<K, V>> {
        let canBeRecord: boolean = true;

        const keys : Parsed<K>[] = [];
        const items: Parsed<V>[] = [];

        for (const entry of obj) {
            for (let i: number = 0; i < 2; i++) {
                const item = entry[i]!;

                const isKey = i === 0;
                const list = isKey ? keys : items;

                if (item instanceof MpClass()) {
                    const value = item.value;

                    if (
                        isKey &&

                        (
                            typeof value !== "string" &&
                            typeof value !== "number"
                        )
                    ) canBeRecord = false;

                    list.push(value);
                    continue;
                }

                if (Arr.isValueValid(item)) {
                    if (isKey) canBeRecord = false;

                    list.push(Arr.parse(item) as any);
                    continue;
                }

                if (Obj.isValueValid(item)) {
                    if (isKey) canBeRecord = false;

                    list.push(Obj.parse(item) as any);
                    continue;
                }

                list.push(item as any);
            }
        }

        if (canBeRecord) {
            const parsed: Record<Exclude<PropertyKey, symbol>, Parsed<V>> = {};
            for (let i: number = 0; i < keys.length; i++) parsed[keys[i] as Exclude<PropertyKey, symbol>] = items[i]!;

            return parsed as unknown as Parsed<ValueObj<K, V>>;
        }

        const parsed = new Map<Parsed<K>, Parsed<V>>();
        for (let i: number = 0; i < keys.length; i++) parsed.set(keys[i]!, items[i]!);

        return parsed as Parsed<ValueObj<K, V>>;
    },

    encode<K, V>(obj: ValueObj<K, V>, exts: Ext<Constructor<unknown>, number, boolean>[] = []): Uint8Array {
        const header = this.encodeHeader(obj);

        let subchunksLen: number = 0;
        const subchunks: Uint8Array[] = [];

        for (const [key, item] of obj) {
            const subchunkKey  = encodeAny(key , exts);
            const subchunkItem = encodeAny(item, exts);

            subchunks.push(subchunkKey);
            subchunksLen += subchunkKey.byteLength;

            subchunks.push(subchunkItem);
            subchunksLen += subchunkItem.byteLength;
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

    encodeHeader<K, V>(obj: ValueObj<K, V>): Uint8Array {
        if (!this.isValueValid(obj)) throw new MpError.InvalidValue("Obj", "ENCODING");

        const len = obj.size;

        let code: number;
        let lenLen: number;

        lenCheck: {
            // FIXMAP
            if (len <= 0x0f) {
                code = 0x80 | len;
                lenLen = 0;

                break lenCheck;
            }

            // MAP

            if (len <= 0xffff) {
                code = 0xde;
                lenLen = 2;

                break lenCheck;
            }

            if (len <= 0xffff_ffff) {
                code = 0xdf;
                lenLen = 4;

                break lenCheck;
            }

            throw new MpError.InvalidValue("Obj", "ENCODING");
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

    decode<K extends MpClassInterface<unknown> | null, V extends MpClassInterface<unknown> | null, C extends unknown>(chunk: Uint8Array, exts: Ext<Constructor<C>, number, boolean>[] = [], doDecompression: boolean = false): ValueObj<K | C, V | C> {
        const subchunks = this.decodeHeader(chunk);

        const subchunksKey  = subchunks[0];
        const subchunksItem = subchunks[1];

        const obj = new Map();
        for (let i: number = 0; i < subchunksKey.length; i++) obj.set(decodeAny(subchunksKey[i]!, exts, doDecompression), decodeAny(subchunksItem[i]!, exts, doDecompression));

        return obj;
    },

    decodeHeader(chunk: Uint8Array): [Uint8Array[], Uint8Array[]] {
        const indices = this.deriveChunkIndices(chunk);

        const hasLenStartIdx = indices.length === 4;
        const iSubchunks = indices[1 + +hasLenStartIdx /* hasLenStartIdx ? 2 : 1 */] as [number[], number[]];

        const iSubchunksKey  = iSubchunks[0];
        const iSubchunksItem = iSubchunks[1];

        const subchunksKey : Uint8Array[] = [];
        const subchunksItem: Uint8Array[] = [];

        for (let i: number = 0; i < iSubchunksKey.length; i++) {
            subchunksKey .push(chunk.subarray(iSubchunksKey [i]!));
            subchunksItem.push(chunk.subarray(iSubchunksItem[i]!));
        }

        return [subchunksKey, subchunksItem];
    },

    isValueValid<K, V>(value: unknown): value is ValueObj<K, V> {
        return (
            value instanceof Map ||

            (
                typeof value === "object" &&
                value !== null &&

                !Array.isArray(value)
            )
        );
    },

    isCodeValid(code: number): boolean {
        return (
            // FIXMAP
            (code & 0xf0) === 0x80 ||

            // MAP
            code === 0xde ||
            code === 0xdf
        );
    },

    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MpError.MissingCode("Obj", "VALIDATE_CHUNK");

        return this.isCodeValid(code);
    },

    deriveChunkIndices(chunk: Uint8Array): [number, [number[], number[]], number] | [number, number, [number[], number[]], number] {
        const code = chunk[0 /* iCode */]!;

        if (!this.isChunkValid(chunk)) throw new MpError.InvalidCode("Obj", "UNSUPPORTED", code);

        let len: number;
        let iPayloadStart: number;

        const isFixmap = (code & 0xf0) === 0x80;

        if (isFixmap) {
            len = code & 0x0f;
            iPayloadStart = 1;
        } else {
            /* match code:
             *     case 0xde: lenLen = 2
             *     case 0xdf: lenLen = 4
             */
            const lenLen = 0b10 << (code - 0xde);

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

                default: throw new MpError.InvalidCode("Obj", "UNSUPPORTED", code);
            }

            iPayloadStart = 1 + lenLen;
        }

        const iPayloadsKey : number[] = [];
        const iPayloadsItem: number[] = [];

        let iPayloadEnd = iPayloadStart;

        for (let i: number = 0; i < len; i++) {
            for (let j: number = 0; j < 2; j++) {
                if (j === 0) iPayloadsKey.push(iPayloadEnd);
                else iPayloadsItem.push(iPayloadEnd);

                const subchunk = chunk.subarray(iPayloadEnd);

                const code = subchunk[0];
                if (code === undefined) throw new MpError.TruncatedChunk("Obj", "DECODING", iPayloadEnd, chunk.byteLength);

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

                throw new MpError.InvalidCode("Obj", "UNSUPPORTED", code);
            }
        }

        return (
            isFixmap
                ? [
                    0 /* iCode */,

                    [iPayloadsKey, iPayloadsItem],
                    iPayloadEnd
                ] : [
                    0 /* iCode */,

                    1 /* iLenStart */,

                    [iPayloadsKey, iPayloadsItem],
                    iPayloadEnd
                ]
        );
    }
};

export type ValueObj<K, V> = Map<K, V>;
