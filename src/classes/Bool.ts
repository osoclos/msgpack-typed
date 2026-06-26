import { MpClass, MpError } from "../internal";

/** A parser for encoding and decoding chunks from the `bool` MessagePack family. */
export class Bool extends MpClass<ValueBool>() {
    #value: ValueBool;

    /**
      * Create a parser with a single value.
      * @param value the number to specify @default `false`
      *
      */
    constructor(value?: ValueBool);

    /**
      * Create a parser accepting a value encoded in a buffer.
      * @param bfr the buffer that contains the value
      *
      */
    constructor(bfr: Uint8Array);

    constructor(a: ValueBool | Uint8Array = false) {
        super(a as ValueBool);

        if (typeof a === "boolean") {
            const value = a;

            if (Bool.isValueValid(value)) this.#value = value;
            else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");

            return;
        }

        const bfr = a;

        const value = bfr[0]! !== 0x00;

        if (Bool.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "CONSTRUCTOR");
    }

    /** The raw value contained in the parser. */
    override get value(): ValueBool {
        return this.#value;
    }

    override set value(value: ValueBool) {
        if (Bool.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "ASSIGNMENT");
    }

    /**
      * Encodes the value contained within the parser and converts it into a MessagePack chunk.
      * @return the encoded MessagePack chunk
      *
      */
    override encode(): Uint8Array {
        return new Uint8Array([0xc2 + +this.#value /* this.#value ? 0xc3 : 0xc2 */])
    }

    /**
      * Decodes an appropriate MessagePack chunk and parses the decoded value.
      *
      * @param chunk the encoded MessagePack chunk
      * @return a parser instance containing the decoded value
      *
      */
    static override decode(chunk: Uint8Array): Bool {
        const indices = this.deriveChunkIndices(chunk);

        const iCode = indices[0];
        const iChunkEnd = indices[1];

        if (iChunkEnd > chunk.byteLength) throw new MpError.TruncatedChunk(this.name, "DECODING", iChunkEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const value = code === 0xc3;

        return new Bool(value);
    }

    /**
      * Computes the encoded MessagePack chunk length from a valid value.
      *
      * @param value the specified value
      * @return the length of the MessagePack chunk
      *
      */
    static override value2LenEncoded(): number {
        return 1;
    }

    /**
      * Checks if a value is valid and can be parsed.
      *
      * @param value the value to check
      * @return whether the value can be parsed
      *
      */
    static override isValueValid(value: unknown): value is ValueBool {
        return typeof value === "boolean";
    }

    /**
      * Checks if a MessagePack chunk header code is supported by the parser.
      *
      * @param code the code to check
      * @return whether the code is supported
      *
      */
    static override isCodeValid(code: number): boolean {
        return (
            code === 0xc2 ||
            code === 0xc3
        );
    }

    /**
      * Checks if a MessagePack chunk can be decoded by the parser.
      *
      * @param chunk the chunk to check
      * @return whether the chunk can be decoded
      *
      */
    static override isChunkValid(chunk: Uint8Array): boolean {
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
    static override deriveChunkIndices(chunk: Uint8Array): [number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        if (!this.isChunkValid(chunk)) throw new MpError.InvalidCode(this.name, "UNSUPPORTED", code);

        return [
            0 /* iCode */,
            1 /* iChunkEnd */
        ];
    }

    override get [Symbol.toStringTag](): string {
        return this.constructor.name;
    }
}

export type ValueBool = boolean;
