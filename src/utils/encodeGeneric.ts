import { Bool, Flt, Int, Slice, Str } from "../classes";
import { Arr, Obj } from "../containers";

import { MpClassUnion, MpPrimitiveUnion } from "../types";

/** Encodes an arbitrary MessagePack class or primitive to a chunk buffer. */
export function encodeGeneric(data: MpClassUnion | MpPrimitiveUnion): Uint8Array {
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
