import { Bfr, Bool, Ext, Flt, Int, Str, Uint } from "../classes";

import { RawClass, ToParsed } from "../internal";
import { MP_CLASS_LIST, MP_CONTAINER_LIST, MpContainer, MpPrimitiveUnion } from "../types";

import { decodeGeneric, encodeGeneric, ExtUtils, InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError } from "../utils";

export const Obj = {
    parse,

    encode(obj: Map<unknown, unknown> | Record<Exclude<keyof any, symbol>, unknown>, exts: Ext<RawClass<unknown>, number, boolean> | Ext<RawClass<unknown>, number, boolean>[] = []): Uint8Array {
        const header = Obj.encodeHeader(obj);

        const buffers: Uint8Array[] = [header];
            for (const [key, item] of obj instanceof Map ? obj : Object.entries(obj)) buffers.push(encodeGeneric(key, exts), encodeGeneric(item, exts));

        const chunkLen = buffers.reduce((a, b) => a + b.length, 0);

        const chunk = new Uint8Array(chunkLen);
        for (let i: number = 0, offset: number = 0; i < buffers.length; offset += buffers[i]!.length, i++) chunk.set(buffers[i]!, offset);

        return chunk;
    },

    encodeHeader(obj: Map<unknown, unknown> | Record<Exclude<keyof any, symbol>, unknown>): Uint8Array {
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
    decodeHeader(chunk: Uint8Array): [Uint8Array, Uint8Array][] {
        const indices = Obj.deriveIndices(chunk);

        const hasLenStartIdx = indices.length === 4;

        const obj: [Uint8Array, Uint8Array][] = [];

        const dataIndices = <[number, number][]>indices[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        for (const [iKey, iItem] of dataIndices) obj.push([chunk.subarray(iKey), chunk.subarray(iItem)]);

        return obj;
    },

    isValid(data: unknown): data is Map<unknown, unknown> | Record<Exclude<keyof any, symbol>, unknown> {
        return data instanceof Map || (data !== null && typeof data === "object");
    },

    isCodeValid(code: number): boolean {
        return (
            // fixmap
            (code & 0xf0) === 0x80 ||

            // map
            code === 0xde ||
            code === 0xdf
        );
    },

    isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    },

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
            iDataStart = 1;
        } else {
            // map

            /* match code:
             *     case 0xde: lenLen = 2
             *     case 0xdf: lenLen = 4
             */
            const lenLen = 0b1 << (code - 0xde);
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

        iterateToEnd: for (let i: number = 0, offset: number = 0; i < len; i++, iDataEnd += offset) {
            const subIndices: [number, number] = <[number, number]><unknown>[];

            for (let j: number = 0; j < 2; j++) {
                subIndices.push(iDataEnd);

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

            dataIndices.push(subIndices);
        }

        return [...headerIndices, dataIndices, iDataEnd]
    }
} satisfies MpContainer<Map<unknown, unknown> | Record<Exclude<keyof any, symbol>, unknown>, unknown, [Uint8Array, Uint8Array][]>;

function parse<K, V>(obj: Map<K, V>): Map<ToParsed<K>, ToParsed<V>>;
function parse<K extends Exclude<keyof any, symbol>, V>(obj: Record<K, V>): Record<ToParsed<K>, ToParsed<V>>;
function parse<K, V>(obj: Map<K, V> | Record<Extract<K, Exclude<keyof any, symbol>>, V>): Map<ToParsed<K>, ToParsed<V>> | Record<ToParsed<Extract<K, Exclude<keyof any, symbol>>>, ToParsed<V>> {
    const parsed = new Map<ToParsed<K>, ToParsed<V>>();

    for (const pair of obj instanceof Map ? obj : Object.entries(obj)) {
        const parsedPair: [ToParsed<K>, ToParsed<V>] = <[ToParsed<K>, ToParsed<V>]><unknown>[];

        for (const item of pair) {
            if (
                item instanceof Uint ||
                item instanceof Int  ||

                item instanceof Flt  ||

                item instanceof Bool ||

                item instanceof Str  ||
                item instanceof Bfr
            ) {
                parsedPair.push(<ToParsed<K | V>>item.data);
                continue;
            }

            for (const Container of MP_CONTAINER_LIST) {
                if (Container.isValid(item)) {
                    parsedPair.push((<any>Container.parse)(item));
                    continue;
                }
            }

            parsed.set(<ToParsed<K>>parsedPair[0], <ToParsed<V>>parsedPair[1]);
        }
    }

    return obj instanceof Map ? parsed : Object.fromEntries(parsed.entries());
}

function decode<K extends MpPrimitiveUnion, V extends MpPrimitiveUnion>(chunk: Uint8Array): Map<K, V>;
function decode<K extends MpPrimitiveUnion | RawClass<unknown>, V extends MpPrimitiveUnion | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<Extract<K | V, RawClass<unknown>>, number, boolean> | Ext<Extract<K | V, RawClass<unknown>>, number, boolean>[]): Map<Extract<K, MpPrimitiveUnion> | Extract<K, RawClass<unknown>>["prototype"], Extract<V, MpPrimitiveUnion> | Extract<V, RawClass<unknown>>["prototype"]>;
function decode<K extends MpPrimitiveUnion | RawClass<unknown>, V extends MpPrimitiveUnion | RawClass<unknown>>(chunk: Uint8Array, exts: Ext<Extract<K | V, RawClass<unknown>>, number, boolean> | Ext<Extract<K | V, RawClass<unknown>>, number, boolean>[] = []): Map<Extract<K, MpPrimitiveUnion> | Extract<K, RawClass<unknown>>["prototype"], Extract<V, MpPrimitiveUnion> | Extract<V, RawClass<unknown>>["prototype"]> {
    const subChunks = Obj.decodeHeader(chunk);

    const obj = new Map();
    for (const [keyChunk, itemChunk] of subChunks) obj.set(decodeGeneric(keyChunk, exts), decodeGeneric(itemChunk, exts));

    return obj;
}
