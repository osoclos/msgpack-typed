import { MpClassSubtyped, MpError } from "../internal";

/** A parser for encoding and decoding chunks from the `str` MessagePack family. */
export class Str extends MpClassSubtyped<ValueStr, SubtypeStr>() {
    #value: Uint8Array;
    #subtype: SubtypeStr;

    static #encoder: TextEncoder;
    static #decoder: TextDecoder;

    /**
      * Create a parser with a single value.
      *
      * @param value the number to specify @default `""`
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"STR32"`
      *
      */
    constructor(value?: ValueStr, subtype?: SubtypeStr);

    /**
      * Create a parser accepting a value encoded in a buffer.
      *
      * @param bfr the buffer that contains the value
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"STR32"`
      *
      */
    constructor(bfr: Uint8Array, subtype?: SubtypeStr);

    constructor(a: ValueStr | Uint8Array = "", subtype: SubtypeStr = "STR32") {
        super(a as ValueStr, subtype);

        if (Str.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "CONSTRUCTOR", subtype);

        if (typeof a === "string") {
            const value = a;

            if (Str.isValueValid(value, subtype)) this.#value = Str.#encoder.encode(value);
            else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");

            return;
        }

        const bfr = a;

        const value = Str.#decoder.decode(bfr);

        if (Str.isValueValid(value, subtype)) this.#value = Str.#encoder.encode(value);
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");
    }

    static {
        this.#encoder = new TextEncoder();
        this.#decoder = new TextDecoder("utf-8", { fatal: true });
    }

    /** The raw value contained in the parser. */
    override get value(): ValueStr {
        return Str.#decoder.decode(this.#value);
    }

    override set value(value: ValueStr) {
        if (Str.isValueValid(value)) this.#value = Str.#encoder.encode(value);
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "ASSIGNMENT");
    }

    /** The string tag for locking values to certain ranges and for encoding chunks. */
    override get subtype(): SubtypeStr {
        return this.#subtype;
    }

    override set subtype(subtype: SubtypeStr) {
        if (Str.isValueValid(this.#value, subtype) && Str.isSubtypeValid(subtype)) this.#subtype = subtype;
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
            case "FIXSTR": {
                code = 0xa0 | len;
                lenLen = 0;

                break;
            }

            case "STR8": {
                code = 0xd9;
                lenLen = 1;

                break;
            }

            case "STR16": {
                code = 0xda;
                lenLen = 2;

                break;
            }

            case "STR32": {
                code = 0xdb;
                lenLen = 4;

                break;
            }
        }

        const chunk = new Uint8Array(1 + lenLen + len);
        chunk[0] = code;

        switch (this.#subtype) {
            case "FIXSTR": break;

            case "STR8": {
                chunk[1] = len;
                break;
            }

            default: {
                const view = new DataView(chunk.buffer);

                if (this.#subtype === "STR16") view.setUint16(1, len);
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
    static override decode(chunk: Uint8Array): Str {
        const indices = this.deriveChunkIndices(chunk);

        const hasLenIdx = indices.length === 4;

        const iCode = indices[0];

        const iValueStart = indices[1 + +hasLenIdx /* hasLenIdx ? 2 : 1 */];
        const iValueEnd   = indices[2 + +hasLenIdx /* hasLenIdx ? 3 : 2 */]!;

        if (iValueEnd > chunk.byteLength) throw new MpError.TruncatedChunk(this.name, "DECODING", iValueEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const subtype = this.code2Subtype(code);

        return new Str(chunk.subarray(iValueStart, iValueEnd), subtype);
    }

    /**
      * Converts a valid value to an appropriate subtype for the parser.
      *
      * @param value the specified value
      * @return the subtype for the parser
      *
      */
    static override value2Subtype(value: ValueStr): SubtypeStr {
        if (typeof value !== "string") throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");

        const bytes = Str.#encoder.encode(value);
        const len = bytes.byteLength;

        if (len < 0x20) return "FIXSTR";

        if (len <= 0xff) return "STR8";
        if (len <= 0xffff) return "STR16";
        if (len <= 0xffff_ffff) return "STR32";

        throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");
    }

    /**
      * Converts a supported MessagePack chunk header code to the subtype used by the parser.
      *
      * @param code the MessagePack chunk header code
      * @return the subtype for the parser
      *
      */
    static override code2Subtype(code: number): SubtypeStr {
        if ((code & 0xe0) === 0xa0) return "FIXSTR";

        switch (code) {
            case 0xd9: return "STR8" ;
            case 0xda: return "STR16";
            case 0xdb: return "STR32";
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
    static override value2LenEncoded(value: SubtypeStr): number {
        let lenEncoded: number;

        const subtype = this.value2Subtype(value);
        switch (subtype) {
            case "FIXSTR": {
                lenEncoded = 1;
                break;
            }

            case "STR8": {
                lenEncoded = 1 + 1;
                break;
            }

            case "STR16": {
                lenEncoded = 1 + 2;
                break;
            }

            case "STR32": {
                lenEncoded = 1 + 4;
                break;
            }
        }

        lenEncoded += Str.#encoder.encode(value).byteLength;

        return lenEncoded;
    }

    /**
      * Checks if a value is valid and can be parsed.
      *
      * @param value the value to check
      * @param subtype the subtype which the value should be valid @default `"STR32"`
      *
      * @return whether the value can be parsed
      *
      */
    static override isValueValid(value: unknown, subtype: SubtypeStr = "STR32"): value is ValueStr {
        if (typeof value !== "string") return false;

        const bytes = Str.#encoder.encode(value);
        const len = bytes.byteLength;

        switch (subtype) {
            case "FIXSTR": return len < 0x20;

            case "STR8" : return len <= 0xff;
            case "STR16": return len <= 0xffff;
            case "STR32": return len <= 0xffff_ffff;
        }
    }

    /**
      * Checks if a subtype is valid and is used by the parser.
      *
      * @param subtype the subtype to check
      * @return whether the subtype is used
      *
      */
    static override isSubtypeValid(subtype: string): subtype is SubtypeStr {
        return (
            subtype === "FIXSTR" ||

            subtype === "STR8"   ||
            subtype === "STR16"  ||
            subtype === "STR32"
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
    static override isCodeValid(code: number): SubtypeStr;

    static override isCodeValid(code: number): SubtypeStr | false {
        if ((code & 0xe0) === 0xa0) return "FIXSTR";

        switch (code) {
            case 0xd9: return "STR8";
            case 0xda: return "STR16";
            case 0xdb: return "STR32";
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
    static override isChunkValid(chunk: Uint8Array): SubtypeStr;

    static override isChunkValid(chunk: Uint8Array): SubtypeStr | false {
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
    static override deriveChunkIndices(chunk: Uint8Array): [number, number, number] | [number, number, number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        const subtype = this.isChunkValid(chunk);
        if (!subtype) throw new MpError.InvalidCode(this.name, "UNSUPPORTED", code);

        if (subtype === "FIXSTR") {
            const len = code & 0x1f;

            return [
                0 /* iCode */,

                1 /* iValueStart */,
                1 + len /* iValueEnd */
            ];
        }

        /* match code:
         *     case 0xd9: lenLen = 1 // STR8
         *     case 0xda: lenLen = 2 // STR16
         *     case 0xdb: lenLen = 4 // STR32
         */
        const lenLen = 0b1 << (code - 0xd9);

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

            default: throw new MpError.InvalidCode("Str", "UNSUPPORTED", code);
        }

        return [
            0 /* iCode */,

            1 /* iLenStart */,

            1 + lenLen /* iValueStart */,
            1 + lenLen + len /* iValueEnd */
        ];
    }

    override get [Symbol.toStringTag](): string {
        return this.constructor.name;
    }
}

export type ValueStr = string;
export type SubtypeStr = "FIXSTR" | "STR8" | "STR16" | "STR32";
