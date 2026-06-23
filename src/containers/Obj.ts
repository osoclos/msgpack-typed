import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import type { Ext } from "../extensions";

import { decodeAny, encodeAny, ExtUtils } from "../utils";

import { CODE_NIL, MpError, type Constructor, type MpClassInterface, type Parsed } from "../internal";

import { Arr } from "./Arr";

export const Obj = {
    parse<K, V>(obj: ValueObj<K, V>): Parsed<ValueObj<K, V>> {
        if (!(obj instanceof Map)) {
            const parsed = {} as Record<K & Exclude<PropertyKey, symbol>, Parsed<V>>;

            for (const key in obj as Record<K & Exclude<PropertyKey, symbol>, V>) {
                const item = obj[key as keyof typeof obj];

                if (
                    item instanceof Uint ||
                    item instanceof Int  ||
                    item instanceof Flt  ||

                    item instanceof Bool ||
                    item instanceof Str  ||

                    item instanceof Bfr
                ) {
                    parsed[key as keyof typeof parsed] = item.value as Parsed<V>;
                    continue;
                }

                if (Arr.isValueValid(item)) {
                    parsed[key as keyof typeof parsed] = Arr.parse(item) as Parsed<V>;
                    continue;
                }

                if (Obj.isValueValid(item)) {
                    parsed[key as keyof typeof parsed] = Obj.parse(item) as Parsed<V>;
                    continue;
                }

                parsed[key as keyof typeof parsed] = item as Parsed<V>;
            }

            return parsed as Parsed<ValueObj<K, V>>;
        }

        const entries = [...obj.entries()];

        const keys  = Array<Parsed<K>>(entries.length);
        const items = Array<Parsed<V>>(entries.length);

        for (let i: number = 0; i < entries.length; i++) {
            const entry = entries[i]!;

            for (let j: number = 0; j < 2; j++) {
                const item = entry[j]!;

                const list = j === 0 ? keys : items;
                let value: unknown = null;

                if (
                    item instanceof Uint ||
                    item instanceof Int  ||
                    item instanceof Flt  ||

                    item instanceof Bool ||
                    item instanceof Str  ||

                    item instanceof Bfr
                ) value = item.value;

                if (value !== null) {
                    list[i] = value as Parsed<K | V>;
                    continue;
                }

                if (Arr.isValueValid(item)) {
                    list[i] = Arr.parse(item) as Parsed<K | V>;
                    continue;
                }

                if (Obj.isValueValid(item)) {
                    list[i] = Obj.parse(item) as Parsed<K | V>;
                    continue;
                }

                list[i] = item as Parsed<K | V>;
            }
        }

        const parsed = new Map<Parsed<K>, Parsed<V>>();
        for (let i: number = 0; i < keys.length; i++) parsed.set(keys[i]!, items[i]!);

        return parsed as Parsed<ValueObj<K, V>>;
    },

    encode<K, V>(obj: ValueObj<K, V>, exts: Ext<Constructor<unknown>, number, boolean>[] = []): Uint8Array {
        const header = this.encodeHeader(obj);

        const entries = obj instanceof Map ? [...obj.entries()] : Object.entries(obj);

        const subchunks = Array<Uint8Array>(entries.length);
        let subchunksLen: number = 0;

        for (let i: number = 0; i < entries.length; i++) {
            const entry = entries[i]!;

            const subchunkKey  = encodeAny(entry[0]!, exts);
            const subchunkItem = encodeAny(entry[1]!, exts);

            subchunks[i * 2 + 0] = subchunkKey;
            subchunksLen += subchunkKey.byteLength;

            subchunks[i * 2 + 1] = subchunkItem;
            subchunksLen += subchunkItem.byteLength;
        }

        const chunk = new Uint8Array(header.byteLength + subchunksLen);
        chunk.set(header, 0);

        for (let iChunk: number = 0, iOffset = header.byteLength; iChunk < subchunks.length; iChunk++) {
            const subchunk = subchunks[iChunk]!;

            chunk.set(subchunk, iOffset);
            iOffset += subchunk.byteLength;
        }

        return chunk;
    },

    encodeHeader<K, V>(obj: ValueObj<K, V>): Uint8Array {
        if (!this.isValueValid(obj)) throw new MpError.InvalidValue("Obj", "ENCODING");

        const len = obj instanceof Map ? obj.size : Object.keys(obj).length;

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

    decode<K extends Exclude<PropertyKey, symbol> | MpClassInterface<unknown> | null, V extends MpClassInterface<unknown> | null, C extends unknown>(chunk: Uint8Array, exts: Ext<Constructor<C>, number, boolean>[] = [], doDecompression: boolean = false): ValueObj<K | C, V | C> {
        const subchunks = this.decodeHeader(chunk);

        const subchunksKey  = subchunks[0];
        const subchunksItem = subchunks[1];

        const obj = new Map();
        for (let i: number = 0; i < subchunksKey.length; i++) obj.set(decodeAny(subchunksKey[i]!, exts, doDecompression), decodeAny(subchunksItem[i]!, exts, doDecompression));

        return obj as ValueObj<K | C, V | C>;
    },

    decodeHeader(chunk: Uint8Array): [Uint8Array[], Uint8Array[]] {
        const indices = this.deriveChunkIndices(chunk);

        const hasLenStartIdx = indices.length === 4;
        const iSubchunks = indices[1 + +hasLenStartIdx /* hasLenStartIdx ? 2 : 1 */] as [number[], number[]];

        const iSubchunksKey  = iSubchunks[0];
        const iSubchunksItem = iSubchunks[1];

        const subchunksKey  = Array<Uint8Array>(iSubchunksKey .length);
        const subchunksItem = Array<Uint8Array>(iSubchunksItem.length);

        for (let i: number = 0; i < iSubchunksKey.length; i++) {
            subchunksKey [i] = chunk.subarray(iSubchunksKey [i]!);
            subchunksItem[i] = chunk.subarray(iSubchunksItem[i]!);
        }

        return [subchunksKey, subchunksItem];
    },

    isValueValid<K, V>(value: unknown): value is ValueObj<K, V> {
        return (
            value instanceof Map ||

            (
                typeof value === "object" &&
                value !== null &&

                !Array.isArray(value) &&
                !Bfr.isValueValid(value)
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

        const iPayloadsKey  = Array<number>(len);
        const iPayloadsItem = Array<number>(len);

        let iPayloadEnd = iPayloadStart;

        for (let i: number = 0; i < len; i++) {
            for (let j: number = 0; j < 2; j++) {
                if (j === 0) iPayloadsKey[i] = iPayloadEnd;
                else iPayloadsItem[i] = iPayloadEnd;

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

export type ValueObj<K, V> = Map<K, V> | (K extends Exclude<PropertyKey, symbol> ? Record<K, V> : {});
