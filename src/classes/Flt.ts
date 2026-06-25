import { MpClassSubtyped, MpError } from "../internal";

/** A parser class for encoding and decoding chunks from the signed variants from the `float` MessagePack family. */
export class Flt extends MpClassSubtyped<ValueFlt, SubtypeFlt>() {
    #value: ValueFlt;
    #subtype: SubtypeFlt;

    /**
      * Create a parser with a single value.
      *
      * @param value the number to specify @default `0.0`
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"F64"`
      *
      */
    constructor(value?: ValueFlt, subtype?: SubtypeFlt);

    /**
      * Create a parser accepting a value encoded in a buffer.
      *
      * @param bfr the buffer that contains the value
      * @param subtype the tag used to derive the code for encoding and decoding chunks @default `"F64"`
      *
      */
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

    /** The raw value contained in the parser. */
    override get value(): ValueFlt {
        return this.#value;
    }

    override set value(value: ValueFlt) {
        if (Flt.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "ASSIGNMENT");
    }

    /** The string tag for locking values to certain ranges and for encoding chunks. */
    override get subtype(): SubtypeFlt {
        return this.#subtype;
    }

    override set subtype(subtype: SubtypeFlt) {
        if (Flt.isValueValid(this.#value, subtype) && Flt.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new MpError.InvalidSubtype(this[Symbol.toStringTag], "ASSIGNMENT", subtype);
    }

    /**
      * Encodes the value contained within the parser and converts it into a MessagePack chunk.
      * @return the encoded MessagePack chunk
      *
      */
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

        const view = new DataView(chunk.buffer, chunk.byteOffset);

        if (this.#subtype === "F32") view.setFloat32(1, this.#value);
        else view.setFloat64(1, this.#value);

        return chunk;
    }

    /**
      * Decodes an appropriate MessagePack chunk and parses the decoded value.
      *
      * @param chunk the encoded MessagePack chunk
      * @return a parser instance containing the decoded value
      *
      */
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

    /**
      * Converts a valid value to an appropriate subtype for the parser.
      *
      * @param value the specified value
      * @return the subtype for the parser
      *
      */
    static override value2Subtype(value: ValueFlt): SubtypeFlt {
        if (typeof value !== "number") throw new MpError.InvalidValue(this.name, "MAP_SUBTYPE");
        return Object.is(value, Math.fround(value)) ? "F32" : "F64";
    }

    /**
      * Converts a supported MessagePack chunk header code to the subtype used by the parser.
      *
      * @param code the MessagePack chunk header code
      * @return the subtype for the parser
      *
      */
    static override code2Subtype(code: number): SubtypeFlt {
        switch (code) {
            case 0xca: return "F32";
            case 0xcb: return "F64";
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
    static override value2LenEncoded(value: ValueFlt): number {
        return this.subtype2LenEncoded(this.value2Subtype(value));
    }

    /**
      * Computes the encoded MessagePack chunk length from a subtype.
      *
      * @param subtype the specified subtype
      * @return the length of the MessagePack chunk
      *
      */
    static override subtype2LenEncoded(subtype: SubtypeFlt): number {
        switch (subtype) {
            case "F32": return 1 + 4;
            case "F64": return 1 + 8;
        }
    }

    /**
      * Checks if a value is valid and can be parsed.
      *
      * @param value the value to check
      * @param subtype the subtype which the value should be valid @default `"F64"`
      *
      * @return whether the value can be parsed
      *
      */
    static override isValueValid(value: unknown, subtype: SubtypeFlt = "F64"): value is ValueFlt {
        if (typeof value !== "number") return false;
        return subtype === "F32" ? Object.is(value, Math.fround(value)) : true;
    }

    /**
      * Checks if a subtype is valid and is used by the parser class.
      *
      * @param subtype the subtype to check
      * @return whether the subtype is used
      *
      */
    static override isSubtypeValid(subtype: string): subtype is SubtypeFlt {
        return (
            subtype === "F32" ||
            subtype === "F64"
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
    static override isCodeValid(code: number): SubtypeFlt;

    static override isCodeValid(code: number): SubtypeFlt | false {
        switch (code) {
            case 0xca: return "F32";
            case 0xcb: return "F64";
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
    static override isChunkValid(chunk: Uint8Array): SubtypeFlt;

    static override isChunkValid(chunk: Uint8Array): SubtypeFlt | false {
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
