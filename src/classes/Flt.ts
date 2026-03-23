import { NIL_CODE } from "../internal";
import { InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError, NullInRequiredError, warnTruncatedChunk } from "../utils";

import { MpClassInterface, MpClassModule, MpResult } from "../types";

/** A wrapper for floats and decimals, representing the `float` format family in the MessagePack specification. */
export const Flt = class Flt<N extends boolean> implements MpClassInterface<FltPrimitive, N> {
    #data: MpResult<FltPrimitive, N>;
    #isOptional: N;

    /** Wraps a native `number` and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. */
    constructor(data?: FltPrimitive, isOptional?: N);

    /** Wraps `null` and makes it usable for MessagePack parsing, which can be promoted to a float. */
    constructor(data: null, isOptional: true);

    /** Interprets bytes in a buffer as a float and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. If the buffer is empty and marked as nullable, it will be assumed to be `null`. */
    constructor(bfr: Uint8Array, isOptional?: N);
    constructor(a?: unknown, isOptional: N = <N>false) {
        this.#isOptional = isOptional;

        if (!(a instanceof Uint8Array)) {
            const data =
                arguments.length === 0
                    ? isOptional
                        ? null
                        : 0.0
                    : a;

            if (!this.isValid(data)) throw new InvalidDataTypeError(data);
            this.#data = data;

            return;
        }

        const bfr = a;

        if (isOptional && bfr.byteLength === 0) {
            this.#data = <any>null;
            return;
        }

        const nBytes = Math.min(bfr.byteLength, 8);

        const view = new DataView(bfr.buffer, bfr.byteOffset, nBytes);
        this.#data = view[nBytes > 4 ? "getFloat64" : "getFloat32"](0);
    }

    /** Wraps a native `number` and makes it usable for MessagePack parsing without allowing it to downgrade to `null`. */
    static required(data: FltPrimitive): Flt<false>;

    /** Interprets bytes in a buffer as a float and makes it usable for MessagePack parsing without allowing it to downgrade to `null`, defaulting to `0.0` if the buffer is empty. */
    static required(bfr: Uint8Array): Flt<false>;
    static required(a?: unknown): Flt<false> {
        return <any>new Flt(<any>a, false);
    }

    /** Wraps a native `number`, or `null` and makes it usable for MessagePack parsing. If no argument is provided, it will default to `null`. */
    static optional(data: FltPrimitive | null): Flt<true>;

    /** Interprets bytes in a buffer as a float and makes it usable for MessagePack parsing. If the buffer is empty, it will be assumed to be `null`. */
    static optional(bfr: Uint8Array): Flt<true>;
    static optional(a?: unknown): Flt<true> {
        return <any>new Flt(<any>a, true);
    }

    /** The raw value stored in the wrapper. */
    get data(): MpResult<FltPrimitive, N> {
        return this.#data;
    }

    set data(data: unknown) {
        if (this.isValid(data)) this.#data = data;
        else if (data === null) throw new NullInRequiredError();
        else throw new InvalidDataTypeError(data);
    }

    /* Whether this wrapper accepts `null` as a valid value. */
    get isOptional(): N {
        return this.#isOptional;
    }

    private set isOptional(isOptional: N) {
        this.#isOptional = isOptional;
    }

    /* Transforms the raw value stored in the wrapper and converts it into a parsable MessagePack chunk. */
    encode() {
        if (this.#data === null) return new Uint8Array([NIL_CODE]);

        const canBe32Bit = Object.is(this.#data, Math.fround(this.#data));

        const code  : number =      canBe32Bit ? 0xca : 0xcb ;
        const len            = 1 + (canBe32Bit ?    4 :    8);

        const chunk = new Uint8Array(len);
        chunk[0] = code;

        const view = new DataView(chunk.buffer);
        view[canBe32Bit ? "setFloat32" : "setFloat64"](1, this.#data);

        return chunk;
    }

    /* Converts a MessagePack chunk assumed to be in the `float` format family and creates a wrapper from it. If the chunk is in the `nil` format family, then a nullable wrapper is created, with its stored value set to `null`. */
    static decode(chunk: Uint8Array): Flt<false> {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        if (code === NIL_CODE) return new Flt(null, true);

        const indices = this.deriveIndices(chunk);

        const [, iDataStart, iDataEnd] = indices;
        if (iDataEnd > chunk.byteLength) warnTruncatedChunk();

        return new Flt(chunk.slice(iDataStart, iDataEnd));
    }

    /* Resets the value of the wrapper to `0.0`, the non-nullable default value. If the wrapper is nullable, it will be instead resetted to `null`. */
    reset() {
        this.#data = this.#isOptional ? <any>null : 0.0;
    }

    /* Checks whether a value can be stored inside this wrapper. */
    isValid(data: unknown): data is MpResult<FltPrimitive, N>  {
        return Flt.isValid(data) || (this.isOptional && data === null);
    }

    /* Checks whether a value can be stored inside an instance of this wrapper. */
    static isValid(data: unknown): data is FltPrimitive {
        return typeof data === "number";
    }

    /* Checks whether a chunk header code is supported by an instance of this wrapper. */
    static isCodeValid(code: number): boolean {
        return (
            code === 0xca ||
            code === 0xcb
        );
    }

    /* Checks whether a chunk is supported by an instance of this wrapper. */
    static isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    }

    /* Computes the index of the chunk header code, the starting index of the data containing the raw value, as well as the final exclusive index of the chunk. */
    static deriveIndices(chunk: Uint8Array): [number, number, number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        /* match code:
         *     case 0xca: len = 4
         *     case 0xcb: len = 8
         */
        const len = 0b100 << (code - 0xca);

        const iDataStart = iCode + 1;
        const iDataEnd   = iDataStart + len;

        return [iCode, iDataStart, iDataEnd];
    }
} satisfies MpClassModule<FltPrimitive, boolean>;

export type FltPrimitive = number;
