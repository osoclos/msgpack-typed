import { MpClassSubtyped, MpError } from "../primitives";

export class Bfr extends
    // @ts-ignore
    MpClassSubtyped<ValueBfr, SubtypeBfr>()
{
    #value: ValueBfr;
    #subtype: SubtypeBfr;

    constructor(value?: ValueBfr, subtype?: SubtypeBfr);
    constructor(bfr: Uint8Array, subtype?: SubtypeBfr);
    constructor(a: ValueBfr | Uint8Array = new Uint8Array(), subtype: SubtypeBfr = "BFR32") {
        super(a as ValueBfr, subtype);

        if (Bfr.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "constructor", subtype);

        const value = a;

        if (Bfr.isValueValid(value, subtype)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "constructor");
    }

    override get value(): ValueBfr {
        return this.#value;
    }

    override set value(value: ValueBfr) {
        if (Bfr.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "value");
    }

    get subtype(): SubtypeBfr {
        return this.#subtype;
    }

    set subtype(subtype: SubtypeBfr) {
        if (Bfr.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "subtype", subtype);
    }

    override encode(): Uint8Array {
        const len = this.#value.byteLength;

        let code: number;
        let lenLen: number;

        switch (this.#subtype) {
            case "BFR8": {
                code = 0xc4;
                lenLen = 1;

                break;
            }

            case "BFR16": {
                code = 0xc5;
                lenLen = 2;

                break;
            }

            case "BFR32": {
                code = 0xc6;
                lenLen = 4;

                break;
            }
        }

        const chunk = new Uint8Array(1 + lenLen + len);
        chunk[0] = code;

        switch (this.#subtype) {
            case "BFR8": {
                chunk[1] = lenLen;
                break;
            }

            default: {
                const view = new DataView(chunk.buffer);

                if (this.#subtype === "BFR16") view.setUint16(1, lenLen);
                else view.setUint32(1, lenLen);
            }
        }

        chunk.set(this.#value, 1 + lenLen);

        return chunk;
    }

    static override decode(chunk: Uint8Array): Bfr {
        const indices = this.deriveChunkIndices(chunk);

        const hasLenIdx = indices.length === 4;

        const iCode = indices[0];

        const iDataStart = indices[1 + +hasLenIdx /* hasLenIdx ? 2 : 1 */];
        const iDataEnd   = indices[2 + +hasLenIdx /* hasLenIdx ? 3 : 2 */]!;

        if (iDataEnd > chunk.byteLength) throw new MpError.TruncatedChunk(Bfr.name, "decode", iDataEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const subtype = this.code2Subtype(code);

        return new Bfr(chunk.subarray(iDataStart, iDataEnd), subtype);
    }

    static override value2Subtype(value: ValueBfr): SubtypeBfr {
        if (!(value instanceof Uint8Array)) throw new MpError.InvalidValue(Bfr.name, "value2Subtype");

        const len = value.byteLength;

        if (len <= 0xff) return "BFR8";
        if (len <= 0xffff) return "BFR16";
        if (len <= 0xffff_ffff) return "BFR32";

        throw new MpError.InvalidValue(Bfr.name, "value2Subtype");
    }

    static override code2Subtype(code: number): SubtypeBfr {
        switch (code) {
            case 0xc4: return "BFR8" ;
            case 0xc5: return "BFR16";
            case 0xc6: return "BFR32";
        }

        throw new MpError.InvalidCode(Bfr.name, "code2Subtype", code);
    }

    static override isValueValid(value: unknown, subtype: SubtypeBfr = "BFR32"): value is ValueBfr {
        if (!(value instanceof Uint8Array)) throw new MpError.InvalidValue(Bfr.name, "value2Subtype");

        const len = value.byteLength;

        switch (subtype) {
            case "BFR8" : return len <= 0xff;
            case "BFR16": return len <= 0xffff;
            case "BFR32": return len <= 0xffff_ffff;
        }
    }

    static override isSubtypeValid(subtype: string): subtype is SubtypeBfr {
        return (
            subtype === "BFR8"   ||
            subtype === "BFR16"  ||
            subtype === "BFR32"
        );
    }

    static override isCodeValid(code: number): false;
    static override isCodeValid(code: number): SubtypeBfr | false;
    static override isCodeValid(code: number): SubtypeBfr | false {
        switch (code) {
            case 0xc4: return "BFR8";
            case 0xc5: return "BFR16";
            case 0xc6: return "BFR32";
        }

        return false;
    }

    static override isChunkValid(chunk: Uint8Array): false;
    static override isChunkValid(chunk: Uint8Array): SubtypeBfr | false;
    static override isChunkValid(chunk: Uint8Array): SubtypeBfr | false {
        const code = chunk[0 /* iCode */];
        if (code === undefined) throw new MpError.MissingCode(Bfr.name, "isChunkValid");

        return this.isCodeValid(code);
    }

    static override deriveChunkIndices(chunk: Uint8Array): [number, number, number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        const subtype = this.isChunkValid(chunk);
        if (!subtype) throw new MpError.InvalidCode(Bfr.name, "deriveChunkIndices", code);

        /* match code:
         *     case 0xc4: lenLen = 1 // BFR8
         *     case 0xc5: lenLen = 2 // BFR16
         *     case 0xc6: lenLen = 4 // BFR32
         */
        const lenLen = 0b1 << (code - 0xc4);

        const maxLenLen = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

        let len: number = 0;
        for (let i: number = 1 /* iLenStart */, iByte: number = 0; iByte < maxLenLen; i++, iByte++) len = (len << 8) | chunk[i]!;

        return [
            0 /* iCode */,

            1 /* iLenStart */,

            1 + lenLen /* iDataStart */,
            1 + lenLen + len /* iDataEnd */
        ];
    }

    override get [Symbol.toStringTag](): string {
        return Bfr.name;
    }
}

export type ValueBfr = Uint8Array;
export type SubtypeBfr = "BFR8" | "BFR16" | "BFR32";
