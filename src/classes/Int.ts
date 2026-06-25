import { MpClassSubtyped, MpError } from "../internal";

/** A parser for encoding and decoding chunks from the signed variants of the `int` MessagePack family. */
export class Int extends MpClassSubtyped<ValueInt, SubtypeInt>() {
    #value: ValueInt;
    #subtype: SubtypeInt;

    /**
      * Create a parser with a single value.
      *
      * @param value the number to specify @default `0`
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"I32"`
      *
      */
    constructor(value?: ValueInt, subtype?: SubtypeInt);

    /**
      * Create a parser accepting a value encoded in a buffer.
      *
      * @param bfr the buffer that contains the value
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"I32"`
      *
      */
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

    /** The raw value contained in the parser. */
    override get value(): ValueInt {
        return this.#value;
    }

    override set value(value: ValueInt) {
        if (Int.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "ASSIGNMENT");
    }

    /** The string tag for locking values to certain ranges and for encoding chunks. */
    override get subtype(): SubtypeInt {
        return this.#subtype;
    }

    override set subtype(subtype: SubtypeInt) {
        if (Int.isValueValid(this.#value, subtype) && Int.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "ASSIGNMENT", subtype);
    }

    /**
      * Encodes the value contained within the parser and converts it into a MessagePack chunk.
      * @return the encoded MessagePack chunk
      *
      */
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

        const view = new DataView(chunk.buffer, chunk.byteOffset);

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

    /**
      * Decodes an appropriate MessagePack chunk and parses the decoded value.
      *
      * @param chunk the encoded MessagePack chunk
      * @return a parser instance containing the decoded value
      *
      */
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

    /**
      * Converts a valid value to an appropriate subtype for the parser.
      *
      * @param value the specified value
      * @return the subtype for the parser
      *
      */
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

    /**
      * Converts a supported MessagePack chunk header code to the subtype used by the parser.
      *
      * @param code the MessagePack chunk header code
      * @return the subtype for the parser
      *
      */
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

    /**
      * Computes the encoded MessagePack chunk length from a valid value.
      *
      * @param value the specified value
      * @return the length of the MessagePack chunk
      *
      */
    static override value2LenEncoded(value: ValueInt): number {
        return this.subtype2LenEncoded(this.value2Subtype(value));
    }

    /**
      * Computes the encoded MessagePack chunk length from a subtype.
      *
      * @param subtype the specified subtype
      * @return the length of the MessagePack chunk
      *
      */
    static override subtype2LenEncoded(subtype: SubtypeInt): number {
        switch (subtype) {
            case "FIXINT": return 1;

            case "I8": return 1 + 1;
            case "I16": return 1 + 2;
            case "I32": return 1 + 4;
            case "I64": return 1 + 8;
        }
    }

    /**
      * Checks if a value is valid and can be parsed.
      *
      * @param value the value to check
      * @param subtype the subtype which the value should be valid @default `"I32"`
      *
      * @return whether the value can be parsed
      *
      */
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

    /**
      * Checks if a subtype is valid and is used by the parser.
      *
      * @param subtype the subtype to check
      * @return whether the subtype is used
      *
      */
    static override isSubtypeValid(subtype: string): subtype is SubtypeInt {
        return (
            subtype === "FIXINT" ||

            subtype === "I8"     ||
            subtype === "I16"    ||
            subtype === "I32"    ||
            subtype === "I64"
        );
    }

    /**
      * Checks if a MessagePack chunk header code is supported by the parser.
      *
      * @param code the code to check
      * @return whether the code is supported
      *
      */
    static override isCodeValid(code: number): false;

    /**
      * Checks if a MessagePack chunk header code is supported by the parser.
      *
      * @param code the code to check
      * @return the subtype that is derived from the code
      *
      */
    static override isCodeValid(code: number): SubtypeInt;

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

    /**
      * Checks if a MessagePack chunk can be decoded by the parser.
      *
      * @param chunk the chunk to check
      * @return whether the chunk can be decoded
      *
      */
    static override isChunkValid(chunk: Uint8Array): false;

    /**
      * Checks if a MessagePack chunk can be decoded by the parser.
      *
      * @param chunk the chunk to check
      * @return the subtype that is derived by the chunk
      *
      */
    static override isChunkValid(chunk: Uint8Array): SubtypeInt;

    static override isChunkValid(chunk: Uint8Array): SubtypeInt | false {
        const code = chunk[0 /* iCode */];
        if (code === undefined) throw new MpError.MissingCode(this.name, "VALIDATE_CHUNK");

        return this.isCodeValid(code);
    }

    /**
      * Retrieves and computes the indices of a supported MessagePack chunk used for decoding by the parser.
      *
      * @param chunk the MessagePack chunk to derive from
      * @return the indices of each section within the chunk
      *
      */
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
