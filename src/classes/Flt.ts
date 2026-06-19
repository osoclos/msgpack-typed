import { MpClassSubtyped, MpError } from "../primitives";

export class Flt extends
    // @ts-ignore
    MpClassSubtyped<ValueFlt, SubtypeFlt>()
{
    #value: ValueFlt;
    #subtype: SubtypeFlt;

    constructor(value?: ValueFlt, subtype?: SubtypeFlt);
    constructor(bfr: Uint8Array, subtype?: SubtypeFlt);
    constructor(a: ValueFlt | Uint8Array = 0.0, subtype: SubtypeFlt = "F64") {
        super(a as ValueFlt, subtype);

        if (Flt.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "constructor", subtype);

        if (typeof a === "number") {
            const value = a;

            if (Flt.isValueValid(value, subtype)) this.#value = value;
            else throw new MpError.InvalidValue(this[Symbol.toStringTag], "constructor");

            return;
        }

        const bfr = a;
        const len = bfr.byteLength;

        const view = new DataView(bfr.buffer, bfr.byteOffset);

        const value = len > 4 ? view.getFloat64(0) : view.getFloat32(0);

        if (Flt.isValueValid(value, subtype)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "constructor");
    }

    override get value(): ValueFlt {
        return this.#value;
    }

    override set value(value: ValueFlt) {
        if (Flt.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "value");
    }

    get subtype(): SubtypeFlt {
        return this.#subtype;
    }

    set subtype(subtype: SubtypeFlt) {
        if (Flt.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "subtype", subtype);
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

        const iDataStart = indices[1];
        const iDataEnd   = indices[2];

        if (iDataEnd > chunk.byteLength) throw new MpError.TruncatedChunk(Flt.name, "decode", iDataEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const subtype = this.code2Subtype(code);

        return new Flt(chunk.subarray(iDataStart, iDataEnd), subtype);
    }

    static override value2Subtype(value: ValueFlt): SubtypeFlt {
        if (typeof value !== "number") throw new MpError.InvalidValue(Flt.name, "value2Subtype");
        return Object.is(value, Math.fround(value)) ? "F32" : "F64";
    }

    static override code2Subtype(code: number): SubtypeFlt {
        switch (code) {
            case 0xca: return "F32";
            case 0xcb: return "F64";
        }

        throw new MpError.InvalidCode(Flt.name, "code2Subtype", code);
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
        if (code === undefined) throw new MpError.MissingCode(Flt.name, "isChunkValid");

        return this.isCodeValid(code);
    }

    static override deriveChunkIndices(chunk: Uint8Array): [number, number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        const subtype = this.isChunkValid(chunk);
        if (!subtype) throw new MpError.InvalidCode(Flt.name, "deriveChunkIndices", code);

        /* match code:
         *     case 0xca: len = 4 // F32
         *     case 0xcb: len = 8 // F64
         */
        const len = 0b100 << (code - 0xca);

        return [
            0 /* iCode */,

            1 /* iDataStart */,
            1 + len /* iDataEnd */
        ];
    }

    override get [Symbol.toStringTag](): string {
        return Flt.name;
    }
}

export type ValueFlt = number;
export type SubtypeFlt = "F32" | "F64";
