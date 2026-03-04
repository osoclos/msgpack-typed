import { Bool, Flt, Int, Slice, Str, Uint } from "../classes";
import { MpClassUnion } from "../types";

export function decodeGeneric<T extends MpClassUnion | MpClassUnion[]>(chunk: Uint8Array): T {
    switch (true) {
        case Uint.isChunkValid(chunk): return <T>Uint.decode(chunk);
        case Int.isChunkValid(chunk): return <T>Int.decode(chunk);

        case Flt.isChunkValid(chunk): return <T>Flt.decode(chunk);

        case Str.isChunkValid(chunk): return <T>Str.decode(chunk);
        case Bool.isChunkValid(chunk): return <T>Bool.decode(chunk);

        case Slice.isChunkValid(chunk): return <T>Slice.decode(chunk);

        default: break;
    }

    throw new TypeError("Invalid data was passed as a MessagePack chunk.");
}
