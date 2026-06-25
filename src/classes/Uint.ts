import { MpClassSubtyped, MpError } from "../internal";

/** A parser class for encoding and decoding chunks from the unsigned variants from the `int` MessagePack family. */
export class Uint extends MpClassSubtyped<ValueUint, SubtypeUint>() {
    #value: ValueUint;
    #subtype: SubtypeUint;

    /**
      * Create a parser with a single value.
      *
      * @param value the number to specify @default `0`
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"U32"`
      *
      */
    constructor(value?: ValueUint, subtype?: SubtypeUint);

    /**
      * Create a parser accepting a value encoded in a buffer.
      *
      * @param bfr the buffer that contains the value
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"U32"`
      *
      */
    constructor(bfr: Uint8Array, subtype?: SubtypeUint);

    constructor(a: ValueUint | Uint8Array = 0, subtype: SubtypeUint = "U32") {
        super(a as ValueUint, subtype);

        if (Uint.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "CONSTRUCTOR", subtype);

        if (
            typeof a === "number" ||
            typeof a === "bigint"
        ) {
            const value = a;

            if (Uint.isValueValid(value, subtype)) this.#value = value;
            else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");

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
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");
    }

    /** The raw value contained in the parser. */
    override get value(): ValueUint {
        return this.#value;
    }

    override set value(value: ValueUint) {
        if (Uint.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "ASSIGNMENT");
    }

    /** The string tag for locking values to certain ranges and for encoding chunks. */
    override get subtype(): SubtypeUint {
        return this.#subtype;
    }

    override set subtype(subtype: SubtypeUint) {
        if (Uint.isValueValid(this.#value, subtype) && Uint.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "ASSIGNMENT", subtype);
    }

    /**
      * Encodes the value contained within the parser and converts it into a MessagePack chunk.
      * @return the encoded MessagePack chunk
      *
      */
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

        const view = new DataView(chunk.buffer, chunk.byteOffset);

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

    /**
      * Decodes an appropriate MessagePack chunk and parses the decoded value.
      *
      * @param chunk the encoded MessagePack chunk
      * @return a parser instance containing the decoded value
      *
      */
    static override decode(chunk: Uint8Array): Uint {
        const indices = this.deriveChunkIndices(chunk);

        const iCode = indices[0];

        // FIXINT
        if (indices.length === 2) {
            const value = chunk[iCode]!;
            return new Uint(value, "FIXINT");
        }

        const iValueStart = indices[1];
        const iValueEnd   = indices[2];

        if (iValueEnd > chunk.byteLength) throw new MpError.TruncatedChunk(this.name, "DECODING", iValueEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const subtype = this.code2Subtype(code);

        return new Uint(chunk.subarray(iValueStart, iValueEnd), subtype);
    }

    /**
      * Converts a valid value to an appropriate subtype for the parser.
      *
      * @param value the specified value
      * @return the subtype for the parser
      *
      */
    static override value2Subtype(value: ValueUint): SubtypeUint {
        if (typeof value === "number") {
            if (value < 0 || value % 1.0 !== 0.0) throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");

            if (value <= 0x7f) return "FIXINT";

            if (value <= 0xff) return "U8";
            if (value <= 0xffff) return "U16";
            if (value <= 0xffff_ffff) return "U32";
            if (
                value <= Number.MAX_SAFE_INTEGER ||
                BigInt(value) <= 0xffff_ffff_ffff_ffffn
            ) return "U64";
        }

        if (typeof value === "bigint") {
            if (value < 0n) throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");

            if (value <= 0x7fn) return "FIXINT";

            if (value <= 0xffn) return "U8";
            if (value <= 0xffffn) return "U16";
            if (value <= 0xffff_ffffn) return "U32";
            if (value <= 0xffff_ffff_ffff_ffffn) return "U64";
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
    static override code2Subtype(code: number): SubtypeUint {
        if (code <= 0x7f) return "FIXINT";

        switch (code) {
            case 0xcc: return "U8" ;
            case 0xcd: return "U16";
            case 0xce: return "U32";
            case 0xcf: return "U64";
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
    static override value2LenEncoded(value: ValueUint): number {
        return this.subtype2LenEncoded(this.value2Subtype(value));
    }

    /**
      * Computes the encoded MessagePack chunk length from a subtype.
      *
      * @param subtype the specified subtype
      * @return the length of the MessagePack chunk
      *
      */
    static override subtype2LenEncoded(subtype: SubtypeUint): number {
        switch (subtype) {
            case "FIXINT": return 1;

            case "U8": return 1 + 1;
            case "U16": return 1 + 2;
            case "U32": return 1 + 4;
            case "U64": return 1 + 8;
        }
    }

    /**
      * Checks if a value is valid and can be parsed.
      *
      * @param value the value to check
      * @param subtype the subtype which the value should be valid @default `"U32"`
      *
      * @return whether the value can be parsed
      *
      */
    static override isValueValid(value: unknown, subtype: SubtypeUint = "U32"): value is ValueUint {
        if (typeof value === "number") {
            if (value < 0 || value % 1.0 !== 0.0) return false;

            switch (subtype) {
                case "FIXINT": return value <= 0x7f;

                case "U8" : return value <= 0xff;
                case "U16": return value <= 0xffff;
                case "U32": return value <= 0xffff_ffff;
                case "U64": return (
                    value <= Number.MAX_SAFE_INTEGER ||
                    BigInt(value) <= 0xffff_ffff_ffff_ffffn
                );
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

    /**
      * Checks if a subtype is valid and is used by the parser class.
      *
      * @param subtype the subtype to check
      * @return whether the subtype is used
      *
      */
    static override isSubtypeValid(subtype: string): subtype is SubtypeUint {
        return (
            subtype === "FIXINT" ||

            subtype === "U8"     ||
            subtype === "U16"    ||
            subtype === "U32"    ||
            subtype === "U64"
        );
    }

    /**
      * Checks if a MessagePack chunk header code is supported by the parser class.
      *
      * @param code the code to check
      * @return whether the code is supported
      *
      */
    static override isCodeValid(code: number): false;

    /**
      * Checks if a MessagePack chunk header code is supported by the parser class.
      *
      * @param code the code to check
      * @return the subtype that is derived from the code
      *
      */
    static override isCodeValid(code: number): SubtypeUint;

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

    /**
      * Checks if a MessagePack chunk can be decoded by the parser class.
      *
      * @param chunk the chunk to check
      * @return whether the chunk can be decoded
      *
      */
    static override isChunkValid(chunk: Uint8Array): false;

    /**
      * Checks if a MessagePack chunk can be decoded by the parser class.
      *
      * @param chunk the chunk to check
      * @return the subtype that is derived by the chunk
      *
      */
    static override isChunkValid(chunk: Uint8Array): SubtypeUint;

    static override isChunkValid(chunk: Uint8Array): SubtypeUint | false {
        const code = chunk[0 /* iCode */];
        if (code === undefined) throw new MpError.MissingCode(this.name, "VALIDATE_CHUNK");

        return this.isCodeValid(code);
    }

    /**
      * Retrieves and computes the indices of a supported MessagePack chunk used for decoding by the parser class.
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
         *     case 0xcc: len = 1 // U8
         *     case 0xcd: len = 2 // U16
         *     case 0xce: len = 4 // U32
         *     case 0xcf: len = 8 // U64
         */
        const len = 0b1 << (code - 0xcc);

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

export type ValueUint = number | bigint;
export type SubtypeUint = "FIXINT" | "U8" | "U16" | "U32" | "U64";
