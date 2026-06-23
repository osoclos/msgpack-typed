import { Bfr, Bool, Flt, Int, Str, Uint } from "../classes";
import { Arr, Obj } from "../containers";

import { Ext } from "../extensions";
import { ExtUtils, LZ4Compression } from "../utils";

import { CODE_NIL, MpError, type Constructor, type Resolved } from "../internal";

import type { MpSchema } from "./MpSchema";

export function decodeWithSchema<S extends MpSchema<unknown, Constructor<unknown>>>(schema: S, chunk: Uint8Array, doDecompression: boolean = false): Resolved<S> {
    const code = chunk[0 /* iCode */]!;
    if (code === undefined) throw new MpError.MissingCode("decodeAny", "VALIDATE_CHUNK");

    if (schema === undefined) throw new MpError.IncompatibleChunk("decodeWithSchema", "DECODING");
    if (schema === null) {
        if (code !== CODE_NIL) throw new MpError.IncompatibleChunk("decodeWithSchema", "DECODING");
        return null as Resolved<S>;
    }

    if (doDecompression && LZ4Compression.isUnpackable(chunk)) return decodeWithSchema(schema, LZ4Compression.unpack(chunk), doDecompression) as Resolved<S>;

    if (schema instanceof Ext) {
        if (
            !ExtUtils.isCodeValid(code) ||
            !schema.isDecodable(chunk)
        ) throw new MpError.IncompatibleChunk("decodeWithSchema", "DECODING");

        return ExtUtils.decodeWith(schema, chunk);
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

        if (!cls.isCodeValid(code)) throw new MpError.IncompatibleChunk("decodeWithSchema", "DECODING");
        return cls.decode(chunk);
    }

    if (
        "type" in (schema as any) &&

        "entries" in (schema as any) &&
        Array.isArray((schema as any).entries)
    ) {
        if ((schema as any).type === "ARR") {
            if (!Arr.isCodeValid(code)) throw new MpError.IncompatibleChunk("decodeWithSchema", "DECODING");

            const subchunks = Arr.decodeHeader(chunk);
            return subchunks.map((subchunk, i) => decodeWithSchema((schema as any).entries[i]!, subchunk, doDecompression)) as Resolved<S>;
        }

        if ((schema as any).type === "OBJ") {
            if (!Obj.isCodeValid(code)) throw new MpError.IncompatibleChunk("decodeWithSchema", "DECODING");

            const subchunks = Obj.decodeHeader(chunk);

            const subchunksKey  = subchunks[0];
            const subchunksItem = subchunks[1];

            const obj = new Map();
            for (let i: number = 0; i < subchunksKey.length; i++) obj.set(decodeWithSchema((schema as any).entries[i][0]!, subchunksKey[i]!, doDecompression), decodeWithSchema((schema as any).entries[i][1]!, subchunksItem[i]!, doDecompression));

            return obj as Resolved<S>;
        }

        throw new MpError.IncompatibleChunk("decodeWithSchema", "DECODING");
    }

    throw new MpError.IncompatibleChunk("decodeWithSchema", "DECODING");
}
