import { MpClassSubtyped, MpError } from "../internal";

/** A parser for encoding and decoding chunks from the `bin` MessagePack family. */
export class Bfr extends MpClassSubtyped<ValueBfr, SubtypeBfr>() {
    #value: ValueBfr;
    #subtype: SubtypeBfr;

    /**
      * Create a parser with a single value.
      *
      * @param value the number to specify @default `new Uint8Array(0)`
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"BFR32"`
      *
      */
    constructor(value?: ValueBfr, subtype?: SubtypeBfr);

    /**
      * Create a parser accepting a value encoded in a buffer.
      *
      * @param bfr the buffer that contains the value
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"BFR32"`
      *
      */
    constructor(bfr: Uint8Array, subtype?: SubtypeBfr);

    constructor(a: ValueBfr | Uint8Array = new Uint8Array(0), subtype: SubtypeBfr = "BFR32") {
        super(a as ValueBfr, subtype);

        if (Bfr.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "CONSTRUCTOR", subtype);

        const value = a;

        if (Bfr.isValueValid(value, subtype)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");
    }

    /** The raw value contained in the parser. */
    override get value(): ValueBfr {
        return this.#value;
    }

    override set value(value: ValueBfr) {
        if (Bfr.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "ASSIGNMENT");
    }

    /** The string tag for locking values to certain ranges and for encoding chunks. */
    override get subtype(): SubtypeBfr {
        return this.#subtype;
    }

    override set subtype(subtype: SubtypeBfr) {
        if (Bfr.isValueValid(this.#value, subtype) && Bfr.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "ASSIGNMENT", subtype);
    }

    /**
      * Encodes the value contained within the parser and converts it into a MessagePack chunk.
      * @return the encoded MessagePack chunk
      *
      */
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
                chunk[1] = len;
                break;
            }

            default: {
                const view = new DataView(chunk.buffer);

                if (this.#subtype === "BFR16") view.setUint16(1, len);
                else view.setUint32(1, len);
            }
        }

        chunk.set(this.#value, 1 + lenLen);

        return chunk;
    }

    /**
      * Decodes an appropriate MessagePack chunk and parses the decoded value.
      *
      * @param chunk the encoded MessagePack chunk
      * @return a parser instance containing the decoded value
      *
      */
    static override decode(chunk: Uint8Array): Bfr {
        const indices = this.deriveChunkIndices(chunk);

        const hasLenIdx = indices.length === 4;

        const iCode = indices[0];

        const iValueStart = indices[1 + +hasLenIdx /* hasLenIdx ? 2 : 1 */]!;
        const iValueEnd   = indices[2 + +hasLenIdx /* hasLenIdx ? 3 : 2 */]!;

        if (iValueEnd > chunk.byteLength) throw new MpError.TruncatedChunk(this.name, "DECODING", iValueEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const subtype = this.code2Subtype(code);

        return new Bfr(chunk.subarray(iValueStart, iValueEnd), subtype);
    }

    /**
      * Converts a valid value to an appropriate subtype for the parser.
      *
      * @param value the specified value
      * @return the subtype for the parser
      *
      */
    static override value2Subtype(value: ValueBfr): SubtypeBfr {
        if (!(value instanceof Uint8Array)) throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");

        const len = value.byteLength;

        if (len <= 0xff) return "BFR8";
        if (len <= 0xffff) return "BFR16";
        if (len <= 0xffff_ffff) return "BFR32";

        throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");
    }

    /**
      * Converts a supported MessagePack chunk header code to the subtype used by the parser.
      *
      * @param code the MessagePack chunk header code
      * @return the subtype for the parser
      *
      */
    static override code2Subtype(code: number): SubtypeBfr {
        switch (code) {
            case 0xc4: return "BFR8" ;
            case 0xc5: return "BFR16";
            case 0xc6: return "BFR32";
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
    static override value2LenEncoded(value: ValueBfr): number {
        let lenEncoded: number;

        const subtype = this.value2Subtype(value);
        switch (subtype) {
            case "BFR8": {
                lenEncoded = 1 + 1;
                break;
            }

            case "BFR16": {
                lenEncoded = 1 + 2;
                break;
            }

            case "BFR32": {
                lenEncoded = 1 + 4;
                break;
            }
        }

        lenEncoded += value.byteLength;

        return lenEncoded;
    }

    /**
      * Checks if a value is valid and can be parsed.
      *
      * @param value the value to check
      * @param subtype the subtype which the value should be valid @default `"BFR32"`
      *
      * @return whether the value can be parsed
      *
      */
    static override isValueValid(value: unknown, subtype: SubtypeBfr = "BFR32"): value is ValueBfr {
        if (!(value instanceof Uint8Array)) return false;

        const len = value.byteLength;

        switch (subtype) {
            case "BFR8" : return len <= 0xff;
            case "BFR16": return len <= 0xffff;
            case "BFR32": return len <= 0xffff_ffff;
        }
    }

    /**
      * Checks if a subtype is valid and is used by the parser.
      *
      * @param subtype the subtype to check
      * @return whether the subtype is used
      *
      */
    static override isSubtypeValid(subtype: string): subtype is SubtypeBfr {
        return (
            subtype === "BFR8"   ||
            subtype === "BFR16"  ||
            subtype === "BFR32"
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
    static override isCodeValid(code: number): SubtypeBfr;

    static override isCodeValid(code: number): SubtypeBfr | false {
        switch (code) {
            case 0xc4: return "BFR8";
            case 0xc5: return "BFR16";
            case 0xc6: return "BFR32";
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
    static override isChunkValid(chunk: Uint8Array): SubtypeBfr;

    static override isChunkValid(chunk: Uint8Array): SubtypeBfr | false {
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
    static override deriveChunkIndices(chunk: Uint8Array): [number, number, number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        const subtype = this.isChunkValid(chunk);
        if (!subtype) throw new MpError.InvalidCode(this.name, "UNSUPPORTED", code);

        /* match code:
         *     case 0xc4: lenLen = 1 // BFR8
         *     case 0xc5: lenLen = 2 // BFR16
         *     case 0xc6: lenLen = 4 // BFR32
         */
        const lenLen = 0b1 << (code - 0xc4);

        let len: number;
        switch (lenLen) {
            case 1: {
                len = chunk[1]!;
                break;
            }

            case 2: {
                len =
                    (chunk[1]!    << 8) |
                     chunk[2]! /* << 0 */;

                break;
            }

            case 4: {
                const view = new DataView(chunk.buffer, chunk.byteOffset);

                len = view.getUint32(1);
                break;
            }

            default: throw new MpError.InvalidCode("Bfr", "UNSUPPORTED", code);
        }

        return [
            0 /* iCode */,

            1 /* iLenStart */,

            1 + lenLen /* iValueStart */,
            1 + lenLen + len /* iValueEnd */
        ];
    }

    override get [Symbol.toStringTag](): string {
        return Bfr.constructor.name;
    }
}

export type ValueBfr = Uint8Array;
export type SubtypeBfr = "BFR8" | "BFR16" | "BFR32";
