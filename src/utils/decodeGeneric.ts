import { ArrClassed, ObjClassed } from "../containers";
import { MP_CLASS_CONTAINER_UNION_LIST, MpClassUnion } from "../types";

/** Decodes a MessagePack chunk with an arbitrary or unknown type to its corresponding class type. */
export function decodeGeneric<T extends MpClassUnion | ArrClassed | ObjClassed>(chunk: Uint8Array): T {
    for (const Cls of MP_CLASS_CONTAINER_UNION_LIST)
        if (Cls.isChunkValid(chunk)) return <T>Cls.decode(chunk);

    throw new TypeError("Invalid data was passed as a MessagePack chunk.");
}
