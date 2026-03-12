import { Ext } from "../../classes";
import { RawClass } from "../../types";
import { encodeExtensionRaw } from "./encodeExtensionRaw";

/** Encodes a class object that an extension is responsible for and converts it to a MessagePack chunk. */
export function encodeExtension<T extends RawClass<any, any[]>>(ext: Ext<T, number>, data: T["prototype"]): Uint8Array {
    const res = ext.encode(data);

    const bytes = Array.isArray(res) ? res[0] : res;
    const extCode  = Array.isArray(res) ? res[1] : ext.codes[0]!;

    return encodeExtensionRaw(bytes, extCode);
}
