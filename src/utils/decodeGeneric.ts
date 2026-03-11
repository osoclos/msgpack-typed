import { Ext } from "../classes";
import { ArrClassed, ObjClassed } from "../containers";

import { MP_CLASS_CONTAINER_UNION_LIST, MpClassUnion } from "../types";

import { toLegible } from "./toLegible";

/** Decodes a MessagePack chunk with an arbitrary or unknown type to its corresponding class type. */
export function decodeGeneric<T extends MpClassUnion | ArrClassed | ObjClassed>(chunk: Uint8Array): T;

/** Decodes a MessagePack chunk with an arbitrary or unknown type to its value or object, with an option to add extensions to the encoder. */
export function decodeGeneric<T>(chunk: Uint8Array, exts?: Ext<any, number> | Ext<any, number>[]): T;

export function decodeGeneric<T>(chunk: Uint8Array, exts: Ext<any, number> | Ext<any, number>[] = []): T {
    for (const Cls of MP_CLASS_CONTAINER_UNION_LIST)
        if (Cls.isChunkValid(chunk)) return <T>Cls.decode(chunk);

    if (!Array.isArray(exts)) exts = [exts];

    const iChunkStart: number = 0;

    const code = chunk[iChunkStart];
    if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

    if (
        code === 0xd4 ||
        code === 0xd5 ||
        code === 0xd6 ||
        code === 0xd7 ||
        code === 0xd8 ||

        code === 0xc7 ||
        code === 0xc8 ||
        code === 0xc9
    ) {
        let len: number;
        let lenLen: number;

        switch (code) {
            case 0xd4: {
                len = 0x01;
                lenLen = 0;

                break;
            }

            case 0xd5: {
                len = 0x02;
                lenLen = 0;

                break;
            }

            case 0xd6: {
                len = 0x04;
                lenLen = 0;

                break;
            }

            case 0xd7: {
                len = 0x08;
                lenLen = 0;

                break;
            }

            case 0xd8: {
                len = 0x10;
                lenLen = 0;

                break;
            }

            case 0xc7: {
                len = 0;
                lenLen = 1;

                break;
            }

            case 0xc8: {
                len = 0;
                lenLen = 2;

                break;
            }

            case 0xc9: {
                len = 0;
                lenLen = 4;

                break;
            }

            default: throw new TypeError(`Invalid chunk header for \`Ext\`. Did not expect ${toLegible(code, true)}.`);
        }

        const iLenStart = iChunkStart + 1;

        const nBytes = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

        for (let i: number = iLenStart; i < nBytes; i++) {
            len <<= 8;
            len |= chunk[i]!;
        }

        const iType = iLenStart + lenLen;

        const type = chunk[iType];
        if (type === undefined) throw new Error("Unable to retrieve extension code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        let extInUse: Ext<any, number> | null = null;
        for (const ext of exts) {
            if (ext.isCodeValid(type)) {
                extInUse = ext;
                break;
            }
        }

        if (extInUse === null) throw new Error(`No extension that  was passed into the decoder supports code ${toLegible(type, true)}. Did you add an extension that supports it?`);

        const iDataStart = iType + 1;
        const iDataEnd = iDataStart + len;

        return extInUse.decode(chunk.slice(iDataStart, iDataEnd), type);
    }

    throw new TypeError("Invalid data was passed as a MessagePack chunk.");
}
