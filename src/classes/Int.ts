import { MpClassSubtyped, MpError } from "../primitives";

export class Int extends
    // @ts-ignore
    MpClassSubtyped<ValueInt, SubtypeInt>()
{
    #value: ValueInt;
    #subtype: SubtypeInt;

    constructor(value?: ValueInt, subtype?: SubtypeInt);
    constructor(bfr: Uint8Array, subtype?: SubtypeInt);
    constructor(a: ValueInt | Uint8Array = 0, subtype: SubtypeInt = "I32") {
        super(a as ValueInt, subtype);

        if (Int.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "CONSTRUCTOR", subtype);

        if (
            typeof a === "number" ||
            typeof a === "bigint"
        ) {
            const value = a;

            if (Int.isValueValid(value, subtype)) this.#value = value;
            else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");

            return;
        }

        const bfr = a;
        const len = bfr.byteLength;

        let value: ValueInt;

        switch (len) {
            case 0: {
                value = 0;
                break;
            }

            case 1: {
                value = bfr[0]! << 24 >> 24;
                break;
            }

            case 2: {
                value = (
                    (bfr[0]!    << 8) |
                    bfr[1]! /* << 0 */
                ) << 16 >> 16

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
                    value = view.getInt32(0);
                    break;
                }

                if (len >= 8) {
                    value = view.getBigInt64(0);
                    break;
                }

                value = 0n;
                for (let i: number = 0; i < len; i++) value = (value << 8n) | BigInt(bfr[i]!);

                value = BigInt.asIntN(64, value);
                break;
            }
        }

        if (Int.isValueValid(value, subtype)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");
    }

    override get value(): ValueInt {
        return this.#value;
    }

    override set value(value: ValueInt) {
        if (Int.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "ASSIGNMENT");
    }

    override get subtype(): SubtypeInt {
        return this.#subtype;
    }

    override set subtype(subtype: SubtypeInt) {
        if (Int.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "ASSIGNMENT", subtype);
    }

    override encode(): Uint8Array {
        if (this.#subtype === "FIXINT") return new Uint8Array([Number(this.#value) + 0x100 /* code */]);

        let code: number;
        let len: number;

        switch (this.#subtype) {
            case "I8": {
                code = 0xd0;
                len = 1;

                break;
            }

            case "I16": {
                code = 0xd1;
                len = 2;

                break;
            }

            case "I32": {
                code = 0xd2;
                len = 4;

                break;
            }

            case "I64": {
                code = 0xd3;
                len = 8;

                break;
            }
        }

        const chunk = new Uint8Array(1 + len);
        chunk[0] = code;

        if (this.#subtype === "I8") {
            chunk[1] = Number(this.#value) + 0x100;
            return chunk;
        }

        const view = new DataView(chunk.buffer);

        switch (this.#subtype) {
            case "I16": {
                view.setInt16(1, Number(this.#value));
                break;
            }

            case "I32": {
                view.setInt32(1, Number(this.#value));
                break;
            }

            case "I64": {
                view.setBigInt64(1, BigInt(this.#value));
                break;
            }
        }

        return chunk;
    }

    static override decode(chunk: Uint8Array): Int {
        const indices = this.deriveChunkIndices(chunk);

        const iCode = indices[0];

        // FIXINT
        if (indices.length === 2) {
            const value = chunk[iCode]! - 0x100;
            return new Int(value, "FIXINT");
        }

        const iValueStart = indices[1];
        const iValueEnd   = indices[2];

        if (iValueEnd > chunk.byteLength) throw new MpError.TruncatedChunk(this.name, "DECODING", iValueEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const subtype = this.code2Subtype(code);

        return new Int(chunk.subarray(iValueStart, iValueEnd), subtype);
    }

    static override value2Subtype(value: ValueInt): SubtypeInt {
        if (typeof value === "number") {
            if (value % 1.0 !== 0.0) throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");

            if (-0x20 <= value && value < 0x00) return "FIXINT";

            if (-0x80 <= value && value <= 0x7f) return "I8";
            if (-0x8000 <= value && value <= 0x7fff) return "I16";
            if (-0x8000_0000 <= value && value <= 0x7fff_ffff) return "I32";
            if (
                (Number.MIN_SAFE_INTEGER <= value && value <= Number.MAX_SAFE_INTEGER) ||
                (-0x8000_0000_0000_0000n <= BigInt(value) && BigInt(value) <= 0x7fff_ffff_ffff_ffffn)
            ) return "I64";
        }

        if (typeof value === "bigint") {
            if (-0x20n <= value && value < 0x00n) return "FIXINT";

            if (-0x80n <= value && value <= 0x7fn) return "I8";
            if (-0x8000n <= value && value <= 0x7fffn) return "I16";
            if (-0x8000_0000n <= value && value <= 0x7fff_ffffn) return "I32";
            if (-0x8000_0000_0000_0000n <= value && value <= 0x7fff_ffff_ffff_ffffn) return "I64";
        }

        throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");
    }

    static override code2Subtype(code: number): SubtypeInt {
        if (code >= 0xe0) return "FIXINT";

        switch (code) {
            case 0xd0: return "I8" ;
            case 0xd1: return "I16";
            case 0xd2: return "I32";
            case 0xd3: return "I64";
        }

        throw new MpError.InvalidCode(this.name, "MAP_SUBTYPE", code);
    }

    static override subtype2LenEncoded(subtype: SubtypeInt): number {
        switch (subtype) {
            case "FIXINT": return 1;

            case "I8": return 1 + 1;
            case "I16": return 1 + 2;
            case "I32": return 1 + 4;
            case "I64": return 1 + 8;
        }
    }

    static override isValueValid(value: unknown, subtype: SubtypeInt = "I32"): value is ValueInt {
        if (typeof value === "number") {
            if (value % 1.0 !== 0.0) return false;

            switch (subtype) {
                case "FIXINT": return -0x20 <= value && value < 0x00;

                case "I8" : return -0x80 <= value && value <= 0x7f;
                case "I16": return -0x8000 <= value && value <= 0x7fff;
                case "I32": return -0x8000_0000 <= value && value <= 0x7fff_ffff;
                case "I64": return (
                    (Number.MIN_SAFE_INTEGER <= value && value <= Number.MAX_SAFE_INTEGER) ||
                    (-0x8000_0000_0000_0000n <= BigInt(value) && BigInt(value) <= 0x7fff_ffff_ffff_ffffn)
                );
            }
        }

        if (typeof value === "bigint") {
            switch (subtype) {
                case "FIXINT": return -0x20n <= value && value < 0x00n;

                case "I8" : return -0x80n <= value && value <= 0x7fn;
                case "I16": return -0x8000n <= value && value <= 0x7fffn;
                case "I32": return -0x8000_0000n <= value && value <= 0x7fff_ffffn;
                case "I64": return -0x8000_0000_0000_0000n <= value && value <= 0x7fff_ffff_ffff_ffffn;
            }
        }

        return false;
    }

    static override isSubtypeValid(subtype: string): subtype is SubtypeInt {
        return (
            subtype === "FIXINT" ||

            subtype === "I8"     ||
            subtype === "I16"    ||
            subtype === "I32"    ||
            subtype === "I64"
        );
    }

    static override isCodeValid(code: number): false;
    static override isCodeValid(code: number): SubtypeInt | false;
    static override isCodeValid(code: number): SubtypeInt | false {
        if (code >= 0xe0) return "FIXINT";

        switch (code) {
            case 0xd0: return "I8";
            case 0xd1: return "I16";
            case 0xd2: return "I32";
            case 0xd3: return "I64";
        }

        return false;
    }

    static override isChunkValid(chunk: Uint8Array): false;
    static override isChunkValid(chunk: Uint8Array): SubtypeInt | false;
    static override isChunkValid(chunk: Uint8Array): SubtypeInt | false {
        const code = chunk[0 /* iCode */];
        if (code === undefined) throw new MpError.MissingCode(this.name, "VALIDATE_CHUNK");

        return this.isCodeValid(code);
    }

    static override deriveChunkIndices(chunk: Uint8Array): [number, number] | [number, number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        const subtype = this.isChunkValid(chunk);
        if (!subtype) throw new MpError.InvalidCode(this.name, "UNSUPPORTED", code);

        if (subtype === "FIXINT")
            return [
                0 /* iCode */,
                1 /* iChunkEnd */
            ];

        /* match code:
         *     case 0xd0: len = 1 // I8
         *     case 0xd1: len = 2 // I16
         *     case 0xd2: len = 4 // I32
         *     case 0xd3: len = 8 // I64
         */
        const len = 0b1 << (code - 0xd0);

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

export type ValueInt = number | bigint;
export type SubtypeInt = "FIXINT" | "I8" | "I16" | "I32" | "I64";
