import { MpClassSubtyped, MpError } from "../internal";

export class Flt extends MpClassSubtyped<ValueFlt, SubtypeFlt>() {
    #value: ValueFlt;
    #subtype: SubtypeFlt;

    constructor(value?: ValueFlt, subtype?: SubtypeFlt);
    constructor(bfr: Uint8Array, subtype?: SubtypeFlt);
    constructor(a: ValueFlt | Uint8Array = 0.0, subtype: SubtypeFlt = "F64") {
        super(a as ValueFlt, subtype);

        if (Flt.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "CONSTRUCTOR", subtype);

        if (typeof a === "number") {
            const value = a;

            if (Flt.isValueValid(value, subtype)) this.#value = value;
            else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");

            return;
        }

        const bfr = a;
        const len = bfr.byteLength;

        const view = new DataView(bfr.buffer, bfr.byteOffset);

        const value = len > 4 ? view.getFloat64(0) : view.getFloat32(0);

        if (Flt.isValueValid(value, subtype)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");
    }

    override get value(): ValueFlt {
        return this.#value;
    }

    override set value(value: ValueFlt) {
        if (Flt.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "ASSIGNMENT");
    }

    override get subtype(): SubtypeFlt {
        return this.#subtype;
    }

    override set subtype(subtype: SubtypeFlt) {
        if (Flt.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "ASSIGNMENT", subtype);
    }

    override encode(): Uint8Array {
        let code: number;
        let len: number;

        switch (this.#subtype) {
            case "F32": {
                code = 0xca;
                len = 4;

                break;
            }

            case "F64": {
                code = 0xcb;
                len = 8;

                break;
            }
        }

        const chunk = new Uint8Array(1 + len);
        chunk[0] = code;

        const view = new DataView(chunk.buffer);

        if (this.#subtype === "F32") view.setFloat32(1, this.#value);
        else view.setFloat64(1, this.#value);

        return chunk;
    }

    static override decode(chunk: Uint8Array): Flt {
        const indices = this.deriveChunkIndices(chunk);

        const iCode = indices[0];

        const iValueStart = indices[1];
        const iValueEnd   = indices[2];

        if (iValueEnd > chunk.byteLength) throw new MpError.TruncatedChunk(this.name, "DECODING", iValueEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const subtype = this.code2Subtype(code);

        return new Flt(chunk.subarray(iValueStart, iValueEnd), subtype);
    }

    static override value2Subtype(value: ValueFlt): SubtypeFlt {
        if (typeof value !== "number") throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");
        return Object.is(value, Math.fround(value)) ? "F32" : "F64";
    }

    static override code2Subtype(code: number): SubtypeFlt {
        switch (code) {
            case 0xca: return "F32";
            case 0xcb: return "F64";
        }

        throw new MpError.InvalidCode(this.name, "MAP_SUBTYPE", code);
    }

    static override value2LenEncoded(value: ValueFlt): number {
        return this.subtype2LenEncoded(this.value2Subtype(value));
    }

    static override subtype2LenEncoded(subtype: SubtypeFlt): number {
        switch (subtype) {
            case "F32": return 1 + 4;
            case "F64": return 1 + 8;
        }
    }

    static override isValueValid(value: unknown, subtype: SubtypeFlt = "F64"): value is ValueFlt {
        if (typeof value !== "number") return false;
        return subtype === "F32" ? Object.is(value, Math.fround(value)) : true;
    }

    static override isSubtypeValid(subtype: string): subtype is SubtypeFlt {
        return (
            subtype === "F32" ||
            subtype === "F64"
        );
    }

    static override isCodeValid(code: number): false;
    static override isCodeValid(code: number): SubtypeFlt | false;
    static override isCodeValid(code: number): SubtypeFlt | false {
        switch (code) {
            case 0xca: return "F32";
            case 0xcb: return "F64";
        }

        return false;
    }

    static override isChunkValid(chunk: Uint8Array): false;
    static override isChunkValid(chunk: Uint8Array): SubtypeFlt | false;
    static override isChunkValid(chunk: Uint8Array): SubtypeFlt | false {
        const code = chunk[0 /* iCode */];
        if (code === undefined) throw new MpError.MissingCode(this.name, "VALIDATE_CHUNK");

        return this.isCodeValid(code);
    }

    static override deriveChunkIndices(chunk: Uint8Array): [number, number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        const subtype = this.isChunkValid(chunk);
        if (!subtype) throw new MpError.InvalidCode(this.name, "UNSUPPORTED", code);

        /* match code:
         *     case 0xca: len = 4 // F32
         *     case 0xcb: len = 8 // F64
         */
        const len = 0b100 << (code - 0xca);

        return [
            0 /* iCode */,

            1 /* iValueStart */,
            1 + len /* iValueEnd */
        ];
    }

    override get [Symbol.toStringTag](): string {
        return this.constructor.name;
    }
}

export type ValueFlt = number;
export type SubtypeFlt = "F32" | "F64";
