import { MpClassSubtyped, MpError } from "../primitives";

export class Uint extends
    // @ts-ignore
    MpClassSubtyped<ValueUint, SubtypeUint>()
{
    #value: ValueUint;
    #subtype: SubtypeUint;

    constructor(value?: ValueUint, subtype?: SubtypeUint);
    constructor(bfr: Uint8Array, subtype?: SubtypeUint);
    constructor(a: ValueUint | Uint8Array = 0, subtype: SubtypeUint = "U32") {
        super(a as ValueUint, subtype);

        if (Uint.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this, "constructor" as any, subtype);

        if (
            typeof a === "number" ||
            typeof a === "bigint"
        ) {
            const value = a;

            if (Uint.isValueValid(value, subtype)) this.#value = value;
            else throw new MpError.InvalidValue(this, "constructor" as any);

            return;
        }

        const bfr = a;
        const len = bfr.byteLength;

        let value: ValueUint;

        switch (len) {
            case 0: {
                value = 0;
                break;
            }

            case 1: {
                value = bfr[0]!;
                break;
            }

            case 2: {
                value =
                    (bfr[0]!    << 8) |
                     bfr[1]! /* << 0 */;

                break;
            }

            case 3: {
                value =
                    (bfr[0]!    << 16) |
                    (bfr[1]!    <<  8) |
                     bfr[2]! /* <<  0 */;

                break;
            }

            default: {
                const view = new DataView(bfr.buffer, bfr.byteOffset);

                if (len === 4) {
                    value = view.getUint32(0);
                    break;
                }

                if (len >= 8) {
                    value = view.getBigUint64(0);
                    break;
                }

                value = 0n;
                for (let i: number = 0; i < len; i++) value = (value << 8n) | BigInt(bfr[i]!);

                break;
            }
        }

        if (Uint.isValueValid(value, subtype)) this.#value = value;
        else throw new MpError.InvalidValue(this, "constructor" as any);
    }

    override get value(): ValueUint {
        return this.#value;
    }

    override set value(value: ValueUint) {
        if (Uint.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this, "value" as any);
    }

    get subtype(): SubtypeUint {
        return this.#subtype;
    }

    set subtype(subtype: SubtypeUint) {
        if (Uint.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this, "subtype" as any, subtype);
    }

    override encode(): Uint8Array {
        if (this.#subtype === "FIXINT") return new Uint8Array([Number(this.#value) /* code */]);

        let code: number;
        let len: number;

        switch (this.#subtype) {
            case "U8": {
                code = 0xcc;
                len = 1;

                break;
            }

            case "U16": {
                code = 0xcd;
                len = 2;

                break;
            }

            case "U32": {
                code = 0xce;
                len = 4;

                break;
            }

            case "U64": {
                code = 0xcf;
                len = 8;

                break;
            }
        }

        const chunk = new Uint8Array(1 + len);
        chunk[0] = code;

        if (this.#subtype === "U8") {
            chunk[1] = Number(this.#value);
            return chunk;
        }

        const view = new DataView(chunk.buffer);

        switch (this.#subtype) {
            case "U16": {
                view.setUint16(1, Number(this.#value));
                break;
            }

            case "U32": {
                view.setUint32(1, Number(this.#value));
                break;
            }

            case "U64": {
                view.setBigUint64(1, BigInt(this.#value));
                break;
            }
        }

        return chunk;
    }

    static override decode(chunk: Uint8Array): Uint {
        const indices = this.deriveChunkIndices(chunk);

        const [iCode] = indices;

        // FIXINT
        if (indices.length === 2) {
            const value = chunk[iCode]!;
            return new Uint(value, "FIXINT");
        }

        const [, iDataStart, iDataEnd] = indices;
        if (iDataEnd > chunk.byteLength) throw new MpError.TruncatedChunk(this.prototype, "decode", iDataEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const subtype = this.code2Subtype(code);

        return new Uint(chunk.slice(iDataStart, iDataEnd), subtype);
    }

    static override code2Subtype(code: number): SubtypeUint {
        if (code <= 0x7f) return "FIXINT";

        switch (code) {
            case 0xcc: return "U8" ;
            case 0xcd: return "U16";
            case 0xce: return "U32";
            case 0xcf: return "U64";
        }

        throw new MpError.InvalidCode(this.prototype, "code2Subtype", code);
    }

    static override isValueValid(value: unknown, subtype: SubtypeUint = "U32"): value is ValueUint {
        if (typeof value === "number") {
            if (value < 0 || value % 1.0 !== 0.0) return false;

            switch (subtype) {
                case "FIXINT": return value <= 0x7f;

                case "U8" : return value <= 0xff;
                case "U16": return value <= 0xffff;
                case "U32": return value <= 0xffff_ffff;
                case "U64": return value <= Number.MAX_SAFE_INTEGER || BigInt(value) <= 0xffff_ffff_ffff_ffffn;
            }
        }

        if (typeof value === "bigint") {
            if (value < 0n) return false;

            switch (subtype) {
                case "FIXINT": return value <= 0x7fn;

                case "U8" : return value <= 0xffn;
                case "U16": return value <= 0xffffn;
                case "U32": return value <= 0xffff_ffffn;
                case "U64": return value <= 0xffff_ffff_ffff_ffffn;
            }
        }

        return false;
    }

    static override isSubtypeValid(subtype: string): subtype is SubtypeUint {
        return (
            subtype === "FIXINT" ||

            subtype === "U8"     ||
            subtype === "U16"    ||
            subtype === "U32"    ||
            subtype === "U64"
        );
    }

    static override isCodeValid(code: number): false;
    static override isCodeValid(code: number): SubtypeUint | false;
    static override isCodeValid(code: number): SubtypeUint | false {
        if (code <= 0x7f) return "FIXINT";

        switch (code) {
            case 0xcc: return "U8";
            case 0xcd: return "U16";
            case 0xce: return "U32";
            case 0xcf: return "U64";
        }

        return false;
    }

    static override isChunkValid(chunk: Uint8Array): false;
    static override isChunkValid(chunk: Uint8Array): SubtypeUint | false;
    static override isChunkValid(chunk: Uint8Array): SubtypeUint | false {
        const code = chunk[0 /* iCode */];
        if (code === undefined) throw new MpError.MissingCode(this.prototype, "isChunkValid");

        return this.isCodeValid(code);
    }

    static override deriveChunkIndices(chunk: Uint8Array): [number, number] | [number, number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        const subtype = this.isChunkValid(chunk);
        if (!subtype) throw new MpError.InvalidCode(this.prototype, "deriveChunkIndices", code);

        if (subtype === "FIXINT")
            return [
                0 /* iCode */,
                1 /* iChunkEnd */
            ];

        /* match code:
         *     case 0xcc: len = 1 // U8
         *     case 0xcd: len = 2 // U16
         *     case 0xce: len = 4 // U32
         *     case 0xcf: len = 8 // U64
         */
        const len = 0b1 << (code - 0xcc);

        return [
            0 /* iCode */,

            1 /* iDataStart */,
            1 + len /* iDataEnd */
        ];
    }

    override get [Symbol.toStringTag](): string {
        return "Uint";
    }
}

export type ValueUint = number | bigint;
export type SubtypeUint = "FIXINT" | "U8" | "U16" | "U32" | "U64";
