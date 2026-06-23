import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import { Arr, Obj } from "../containers";

import { Ext } from "../extensions";
import { ExtUtils, LZ4Compression } from "../utils";

import { CODE_NIL, MpError, type Constructor } from "../internal";

import type { MpSchema } from "./MpSchema";

export function encodeWithSchema<T, C extends Constructor<unknown>>(schema: MpSchema<T, C>, value: unknown, doCompression: boolean = false): Uint8Array {
    let chunk: Uint8Array;

    validation: {
        if (schema === undefined) throw new MpError.InvalidValue("encodeWithSchema", "ENCODING");
        if (schema === null) {
            chunk = new Uint8Array([CODE_NIL]);
            break validation;
        }

        if (schema instanceof Ext) {
            if (!schema.isEncodable(value)) throw new MpError.InvalidValue("encodeWithSchema", "ENCODING");

            chunk = ExtUtils.encodeWith(schema, value);
            break validation;
        }

        if (
            (
                (schema as any) === Uint ||
                (schema as any) === Int  ||
                (schema as any) === Flt  ||

                (schema as any) === Bool ||
                (schema as any) === Str  ||

                (schema as any) === Bfr
            ) ||
            (
                "cls" in (schema as any) &&

                (
                    (schema as any).cls === Uint ||
                    (schema as any).cls === Int  ||
                    (schema as any).cls === Flt  ||

                    (schema as any).cls === Bool ||
                    (schema as any).cls === Str  ||

                    (schema as any).cls === Bfr
                ) &&

                "subtype" in (schema as any) &&
                typeof (schema as any).subtype === "string"
            )
        ) {
            const cls = "cls" in (schema as any) ? (schema as any).cls : schema;
            const subtype = "subtype" in (schema as any) ? (schema as any).subtype : null;

            if (value instanceof cls) {
                if ((value as any).subtype === subtype) {
                    chunk = (value as any).encode();
                    break validation;
                }

                value = (value as any).value;
            }

            if ("cls" in (schema as any)) {
                if (cls.isValueValid(value, (schema as any).subtype)) {
                    chunk = new cls(value, (schema as any).subtype).encode();
                    break validation;
                }
            } else {
                if (cls.isValueValid(value)) {
                    chunk = new cls(value).encode();
                    break validation;
                }
            }

            throw new MpError.InvalidValue("encodeWithSchema", "ENCODING");
        }

        if (
            "type" in (schema as any) &&

            "entries" in (schema as any) &&
            Array.isArray((schema as any).entries)
        ) {
            if ((schema as any).type === "ARR") {
                if (!Arr.isValueValid(value)) throw new MpError.InvalidValue("encodeWithSchema", "ENCODING");

                const header = Arr.encodeHeader(value);

                let subchunksLen: number = 0;
                const subchunks = Array<Uint8Array>(value.length);

                for (let i: number = 0; i < value.length; i++) {
                    const item = value[i]!;
                    const subschema = (schema as any).entries[i]!;

                    const subchunk = encodeWithSchema(subschema, item);

                    subchunks[i] = subchunk;
                    subchunksLen += subchunk.byteLength;
                }

                chunk = new Uint8Array(header.byteLength + subchunksLen);
                chunk.set(header, 0);

                for (let iChunk: number = 0, iOffset = header.byteLength; iChunk < subchunks.length; iChunk++) {
                    const subchunk = subchunks[iChunk]!;

                    chunk.set(subchunk, iOffset);
                    iOffset += subchunk.byteLength;
                }

                break validation;
            }

            if ((schema as any).type === "OBJ") {
                if (!Obj.isValueValid(value)) throw new MpError.InvalidValue("encodeWithSchema", "ENCODING");

                const header = Obj.encodeHeader(value);

                const entries = value instanceof Map ? [...value.entries()] : Object.entries(value);

                const subchunks = Array<Uint8Array>(entries.length);
                let subchunksLen: number = 0;

                for (let i: number = 0; i < entries.length; i++) {
                    const entry = entries[i]!;
                    const subschema = (schema as any).entries[i]!;

                    const subchunkKey  = encodeWithSchema(subschema[0]!, entry[0]!);
                    const subchunkItem = encodeWithSchema(subschema[1]!, entry[1]!);

                    subchunks[i * 2 + 0] = subchunkKey;
                    subchunksLen += subchunkKey.byteLength;

                    subchunks[i * 2 + 1] = subchunkItem;
                    subchunksLen += subchunkItem.byteLength;
                }

                chunk = new Uint8Array(header.byteLength + subchunksLen);
                chunk.set(header, 0);

                for (let iChunk: number = 0, iOffset = header.byteLength; iChunk < subchunks.length; iChunk++) {
                    const subchunk = subchunks[iChunk]!;

                    chunk.set(subchunk, iOffset);
                    iOffset += subchunk.byteLength;
                }

                break validation;
            }

            throw new MpError.InvalidValue("encodeWithSchema", "ENCODING");
        }

        throw new MpError.InvalidValue("encodeWithSchema", "ENCODING");
    }

    return doCompression ? LZ4Compression.pack(chunk) : chunk;
}
