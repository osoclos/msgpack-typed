import { NIL_CODE } from "../internal";
import { InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError, NullInRequiredError, warnTruncatedChunk } from "../utils";

import { MpClassInterface, MpClassModule, MpResult } from "../types";

/** A wrapper for booleans, representing the `bool` format family in the MessagePack specification. */
export const Bool = class Bool<N extends boolean> implements MpClassInterface<BoolPrimitive, N> {
    #data: MpResult<BoolPrimitive, N>;
    #isOptional: N;

    /** Wraps a native `boolean` and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. */
    constructor(data?: BoolPrimitive, isOptional?: N);

    /** Wraps `null` and makes it usable for MessagePack parsing, which can be promoted to a boolean. */
    constructor(data: null, isOptional: true);

    /** Interprets bytes in a buffer as a boolean and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. If the buffer is empty and marked as nullable, it will be assumed to be `null`. */
    constructor(bfr: Uint8Array, isOptional?: N);
    constructor(a: unknown = null, isOptional: N = <N>false) {
        this.#isOptional = isOptional;

        if (!(a instanceof Uint8Array)) {
            const data = a;

            if (!this.isValid(data)) throw new InvalidDataTypeError(data);
            this.#data = data;

            return;
        }

        const bfr = a;

        if (isOptional && bfr.byteLength === 0) {
            this.#data = <any>null;
            return;
        }

        const byte = bfr[0]!;

        this.#data = byte !== 0x00;
    }

    /** Wraps a native `boolean` and makes it usable for MessagePack parsing without allowing it to downgrade to `null`. */
    static required(data: BoolPrimitive): Bool<false>;

    /** Interprets bytes in a buffer as a boolean and makes it usable for MessagePack parsing without allowing it to downgrade to `null`, defaulting to `false` if the buffer is empty. */
    static required(bfr: Uint8Array): Bool<false>;
    static required(a?: unknown): Bool<false> {
        return <any>new Bool(<any>a, false);
    }

    /** Wraps a native `boolean`, or `null` and makes it usable for MessagePack parsing. If no argument is provided, it will default to `null`. */
    static optional(data: BoolPrimitive | null): Bool<true>;

    /** Interprets bytes in a buffer as a boolean and makes it usable for MessagePack parsing. If the buffer is empty, it will be assumed to be `null`. */
    static optional(bfr: Uint8Array): Bool<true>;
    static optional(a?: unknown): Bool<true> {
        return <any>new Bool(<any>a, true);
    }

    /** The raw value stored in the wrapper. */
    get data(): MpResult<BoolPrimitive, N> {
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
    encode(): Uint8Array {
        return new Uint8Array([this.#data === null ? NIL_CODE : 0xc2 + +this.#data /* this.#data ? 0xc3 : 0xc2 */]);
    }

    /* Converts a MessagePack chunk assumed to be in the `bool` format family and creates a wrapper from it. If the chunk is in the `nil` format family, then a nullable wrapper is created, with its stored value set to `null`. */
    static decode(chunk: Uint8Array): Bool<false> {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        if (code === NIL_CODE) return new Bool(null, true);

        const indices = this.deriveIndices(chunk);

        const [, iChunkEnd] = indices;
        if (iChunkEnd > chunk.byteLength) warnTruncatedChunk();

        return new Bool(chunk[indices[0]]! === 0xc3);
    }

    /* Resets the value of the wrapper to `false`, the non-nullable default value. If the wrapper is nullable, it will be resetted to `null`. */
    reset() {
        this.#data = this.#isOptional ? <any>null : false;
    }

    /* Checks whether a value can be stored inside this wrapper. */
    isValid(data: unknown): data is MpResult<BoolPrimitive, N>  {
        return Bool.isValid(data) || (this.isOptional && data === null);
    }

    /* Checks whether a value can be stored inside an instance of this wrapper. */
    static isValid(data: unknown): data is BoolPrimitive {
        return typeof data === "boolean";
    }

    /* Checks whether a chunk header code is supported by an instance of this wrapper. */
    static isCodeValid(code: number): boolean {
        return (
            code === 0xc2 ||
            code === 0xc3
        );
    }

    /* Checks whether a chunk is supported by an instance of this wrapper. */
    static isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    }

    /* Computes the index of the chunk header code, as well as the final exclusive index of the chunk. */
    static deriveIndices(chunk: Uint8Array): [number, number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        const iChunkEnd = iCode + 1;

        return [iCode, iChunkEnd];
    }
} satisfies MpClassModule<BoolPrimitive, boolean>;

export type BoolPrimitive = boolean;
