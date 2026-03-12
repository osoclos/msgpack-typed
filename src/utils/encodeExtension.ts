import { Ext } from "../classes";
import { RawClass } from "../types";

/** Encodes the class object an extension is responsible for and converts it to a MessagePack chunk. */
export function encodeExtension<T extends RawClass<any, any[]>>(ext: Ext<T, number>, data: T["prototype"]): Uint8Array {
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

    const chunk = new Uint8Array(iDataStart + len);
    chunk[0] = code;

    let tmpLen = len;
    for (let i: number = lenLen; i >= 1; i--) {
        chunk[i] = tmpLen & 0xff;
        tmpLen >>>= 8;
    }

    chunk[1 + lenLen] = type;
    chunk.set(bytes, iDataStart);

    return chunk;
}
