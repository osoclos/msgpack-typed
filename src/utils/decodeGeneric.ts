import { MP_CLASS_CONTAINER_UNION_LIST, MpClassUnion } from "../types";

export function decodeGeneric<T extends MpClassUnion | MpClassUnion[]>(chunk: Uint8Array): T {
    for (const Cls of MP_CLASS_CONTAINER_UNION_LIST)
        if (Cls.isChunkValid(chunk)) return <T>Cls.decode(chunk);

    throw new TypeError("Invalid data was passed as a MessagePack chunk.");
}
