import { Bool, Ext, Flt, Int, Slice, Str } from "../classes";
import { Arr, Obj } from "../containers";

import { MpClassUnion, MpPrimitiveUnion } from "../types";

/** Encodes an arbitrary MessagePack class or primitive to a chunk buffer. */
export function encodeGeneric(data: MpClassUnion | MpPrimitiveUnion): Uint8Array;

/** Encodes a value or object to a chunk buffer, with an option to add extensions to the encoder. */
export function encodeGeneric(data: any, exts?: Ext<any, number> | Ext<any, number>[]): Uint8Array;

export function encodeGeneric(data: any, exts: Ext<any, number> | Ext<any, number>[] = []): Uint8Array {
    if (!Array.isArray(exts)) exts = [exts];

    for (const ext of exts) {
        if (!ext.isObjValid(data)) continue;

        const res = ext.encode(data);

        const bytes = Array.isArray(res) ? res[0] : res;
        const type  = Array.isArray(res) ? res[1] : ext.codes[0]!;

        let code: number;
        let lenLen: number;

        const len = bytes.byteLength;

        switch (true) {
            case len === 0x01: {
                code = 0xd4;
                lenLen = 0;

                break;
            }

            case len === 0x02: {
                code = 0xd5;
                lenLen = 0;

                break;
            }

            case len === 0x04: {
                code = 0xd6;
                lenLen = 0;

                break;
            }

            case len === 0x08: {
                code = 0xd7;
                lenLen = 0;

                break;
            }

            case len === 0x10: {
                code = 0xd8;
                lenLen = 0;

                break;
            }

            case len <= 0xff: {
                code = 0xc7;
                lenLen = 1;

                break;
            }

            case len <= 0xffff: {
                code = 0xc8;
                lenLen = 2;

                break;
            }

            default: {
                code = 0xc9;
                lenLen = 4;

                break;
            }
        }

        const iDataStart = 1 + lenLen + 1;

        const bfr = new Uint8Array(iDataStart + len);
        bfr[0] = code;

        let tmpLen = len;
        for (let i: number = lenLen; i >= 1; i--) {
            bfr[i] = tmpLen & 0xff;
            tmpLen >>>= 8;
        }

        bfr[1 + lenLen] = type;
        bfr.set(bytes, iDataStart);

        return bfr;
    }

    switch (true) {
        case typeof data === "number": {
            data = new Flt(data);
            break;
        }

        case typeof data === "bigint": {
            data = new Int((data & 0x7fff_ffff_ffff_ffffn) - (data & 0x8000_0000_0000_0000n));
            break;
        }

        case typeof data === "string": {
            data = new Str(data);
            break;
        }

        case typeof data === "boolean": {
            data = new Bool(data);
            break;
        }

        case data instanceof Uint8Array: {
            data = new Slice(data);
            break;
        }

        default: break;
    }

    let bfr: Uint8Array;
    switch (true) {
        case data === null: {
            bfr = new Uint8Array([0xc0]);
            break;
        }

        case Array.isArray(data): {
            bfr = Arr.encode(data);
            break;
        }

        case data instanceof Map: {
            bfr = Obj.encode(data);
            break;
        }

        default: {
            bfr = data.encode();
            break;
        }
    }

    return bfr;
}
