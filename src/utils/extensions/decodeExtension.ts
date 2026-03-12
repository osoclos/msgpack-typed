import { Ext } from "../../classes";
import { RawClass } from "../../types";

import { decodeExtensionRaw } from "./decodeExtensionRaw";

import { toLegible } from "../toLegible";

/** Decodes an extension MessagePack chunk, validates it and parses as the class type that a specific extension is responsible for. */
export function decodeExtension<T extends RawClass<any, any[]>>(ext: Ext<T, number>, chunk: Uint8Array): T {
    const [data, extCode] = decodeExtensionRaw(chunk);

    if (!ext.isCodeValid(extCode)) throw new Error(`The extension passed into the decoder does not supports code ${toLegible(extCode, true)}. Did you add an extension that supports it?`);
    return ext.decode(data, extCode);
}
