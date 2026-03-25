import { NIL_CODE } from "../internal";
import { InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError, NullInRequiredError, warnTruncatedChunk } from "../utils";

import { MpClassInterface, MpClassModule, MpResult } from "../types";

/** A wrapper for buffers, representing the `bin` format families in the MessagePack specification. */
export const Bfr = class Bfr<N extends boolean> implements MpClassInterface<BfrPrimitive, N> {
    #data: MpResult<BfrPrimitive, N>;
    #isOptional: N;

    /** Wraps a native `Uint8Array`, copies it and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. */
    constructor(data?: BfrPrimitive, isOptional?: N);

    /** Wraps `null` and makes it usable for MessagePack parsing, which can be promoted to a buffer. */
    constructor(data: null, isOptional: true);

    /** Interprets bytes in a buffer, copies it and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. If the buffer is empty and marked as nullable, it will be assumed to be `null`. */
    constructor(bfr: Uint8Array, isOptional?: N);
    constructor(a?: unknown, isOptional: N = <N>false) {
        this.#isOptional = isOptional;

        if (!(a instanceof Uint8Array)) {
            const data =
                arguments.length === 0
                    ? isOptional
                        ? null
                        : new Uint8Array()
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

        this.#data = new Uint8Array(bfr);
    }

    /** Wraps a native `Uint8Array`, copies it and makes it usable for MessagePack parsing without allowing it to downgrade to `null`. */
    static required(data: BfrPrimitive): Bfr<false>;

    /** Interprets bytes in a buffer, copies it and makes it usable for MessagePack parsing without allowing it to downgrade to `null`, defaulting to `new Uint8Array([])` if the buffer is empty. */
    static required(bfr: Uint8Array): Bfr<false>;
    static required(a?: unknown): Bfr<false> {
        return <any>new Bfr(<any>a, false);
    }

    /** Wraps a native `Uint8Array`, or `null`, copies it and makes it usable for MessagePack parsing. If no argument is provided, it will default to `null`. */
    static optional(data: BfrPrimitive | null): Bfr<true>;

    /** Interprets bytes in a buffer, copies it and makes it usable for MessagePack parsing. If the buffer is empty, it will be assumed to be `null`. */
    static optional(bfr: Uint8Array): Bfr<true>;
    static optional(a?: unknown): Bfr<true> {
        return <any>new Bfr(<any>a, true);
    }

    /** The raw value stored in the wrapper. */
    get data(): MpResult<BfrPrimitive, N> {
        return this.#data;
    }

    set data(data: unknown) {
        if (this.isValid(data)) this.#data = data === null ? data : new Uint8Array(data);
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

        const len = this.#data.byteLength;

        let code: number;
        let lenLen: number;

        switch (true) {
            // bin
            case len <= 0xff: {
                code = 0xc4;
                lenLen = 1;

                break;
            }

            case len <= 0xffff: {
                code = 0xc5;
                lenLen = 2;

                break;
            }

            default: {
                code = 0xc6;
                lenLen = 4;

                break;
            }
        }

        const iDataStart = 1 + lenLen;

        const chunkLen = iDataStart + len;

        const chunk = new Uint8Array(chunkLen);
        chunk[0] = code;

        for (let i: number = 1, iByte: number = lenLen - 1; iByte >= 0; i++, iByte--)
            chunk[i] = (len >>> (iByte * 8)) & 0xff;

        chunk.set(this.#data, iDataStart);

        return chunk;
    }

    /* Converts a MessagePack chunk assumed to be in the `bin` format family and creates a wrapper from it. If the chunk is in the `nil` format family, then a nullable wrapper is created, with its stored value set to `null`. */
    static decode(chunk: Uint8Array): Bfr<false> {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        if (code === NIL_CODE) return new Bfr(null, true);

        const indices = this.deriveIndices(chunk);

        const [, , iDataStart, iDataEnd] = indices;
        if (iDataEnd > chunk.byteLength) warnTruncatedChunk();

        return new Bfr(chunk.subarray(iDataStart, iDataEnd));
    }

    /* Resets the value of the wrapper to `new Uint8Array([])`, the non-nullable default value. If the wrapper is nullable, it will be instead resetted to `null`. */
    reset() {
        this.#data = this.#isOptional ? <any>null : new Uint8Array();
    }

    /* Checks whether a value can be stored inside this wrapper. */
    isValid(data: unknown): data is MpResult<BfrPrimitive, N>  {
        return Bfr.isValid(data) || (this.isOptional && data === null);
    }

    /* Checks whether a value can be stored inside an instance of this wrapper. */
    static isValid(data: unknown): data is BfrPrimitive {
        return data instanceof Uint8Array;
    }

    /* Checks whether a chunk header code is supported by an instance of this wrapper. */
    static isCodeValid(code: number): boolean {
        return (
            code === 0xc4 ||
            code === 0xc5 ||
            code === 0xc6
        );
    }

    /* Checks whether a chunk is supported by an instance of this wrapper. */
    static isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    }

    /* Computes the index of the chunk header code, the starting index of the data containing the length, the starting index of the data containing the raw value, as well as the final exclusive index of the chunk. */
    static deriveIndices(chunk: Uint8Array): [number, number, number, number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        /* match code:
         *     case 0xc4: lenLen = 1
         *     case 0xc5: lenLen = 2
         *     case 0xc6: lenLen = 4
         */
        const lenLen = 0b1 << (code - 0xc4);
        const maxLenLen = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

        const iLenStart = iCode + 1;

        let len: number = 0;
        for (let i: number = iLenStart, iByte: number = 0; iByte < maxLenLen; i++, iByte++) {
            len <<= 8;
            len |= chunk[i]!;
        }

        const iDataStart = iLenStart + lenLen;
        const iDataEnd = iDataStart + len;

        return [iCode, iLenStart, iDataStart, iDataEnd];
    }
} satisfies MpClassModule<BfrPrimitive, boolean>;

export type BfrPrimitive = Uint8Array;
