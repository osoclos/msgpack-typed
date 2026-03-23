import { NIL_CODE } from "../internal";
import { InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError, NullInRequiredError, warnTruncatedChunk } from "../utils";

import { MpClassInterface, MpClassModule, MpResult } from "../types";

/** A wrapper for signed integers, representing the negative `fixint` and signed `int` format families in the MessagePack specification. */
export const Int = class Int<N extends boolean> implements MpClassInterface<IntPrimitive, N> {
    #data: MpResult<IntPrimitive, N>;
    #isOptional: N;

    /** Wraps a native `number` or `bigint` and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. */
    constructor(data?: IntPrimitive, isOptional?: N);

    /** Wraps `null` and makes it usable for MessagePack parsing, which can be promoted to a signed integer. */
    constructor(data: null, isOptional: true);

    /** Interprets bytes in a buffer as a big-endian signed integer and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. If the buffer is empty and marked as nullable, it will be assumed to be `null`. */
    constructor(bfr: Uint8Array, isOptional?: N);
    constructor(a?: unknown, isOptional: N = <N>false) {
        this.#isOptional = isOptional;

        if (!(a instanceof Uint8Array)) {
            const data =
                arguments.length === 0
                    ? isOptional
                        ? null
                        : 0
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
        if (nBytes > 4) {
            this.#data = 0n;
            for (let i: number = 0; i < nBytes; i++) {
                (<bigint>this.#data) <<= 8n;
                (<bigint>this.#data) |= BigInt(bfr[i]!);
            }

            this.#data = BigInt.asIntN(64, this.#data);

            return;
        }

        this.#data = 0;
        for (let i: number = 0; i < nBytes; i++) {
            (<number>this.#data) <<= 8;
            (<number>this.#data) |= bfr[i]!;
        }

        (<number>this.#data) |= 0;
    }

    /** Wraps a native `number` or `bigint` and makes it usable for MessagePack parsing without allowing it to downgrade to `null`. */
    static required(data: IntPrimitive): Int<false>;

    /** Interprets bytes in a buffer as a big-endian signed integer and makes it usable for MessagePack parsing without allowing it to downgrade to `null`, defaulting to `0` if the buffer is empty. */
    static required(bfr: Uint8Array): Int<false>;
    static required(a?: unknown): Int<false> {
        return <any>new Int(<any>a, false);
    }

    /** Wraps a native `number` or `bigint`, or `null` and makes it usable for MessagePack parsing. If no argument is provided, it will default to `null`. */
    static optional(data: IntPrimitive | null): Int<true>;

    /** Interprets bytes in a buffer as a big-endian signed integer and makes it usable for MessagePack parsing. If the buffer is empty, it will be assumed to be `null`. */
    static optional(bfr: Uint8Array): Int<true>;
    static optional(a?: unknown): Int<true> {
        return <any>new Int(<any>a, true);
    }

    /** The raw value stored in the wrapper. */
    get data(): MpResult<IntPrimitive, N> {
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

        const isNum = typeof this.#data === "number";

        let code: number;
        let len: number;

        if (isNum) {
            switch (true) {
                // negative fixint
                case this.#data >= -0x20 && this.#data < 0x00: {
                    code = <number>this.#data + 0x100;
                    len = 0;

                    break;
                }

                // signed int
                case this.#data >= -0x80 && this.#data <= 0x7f: {
                    code = 0xd0;
                    len = 1;

                    break;
                }

                case this.#data >= -0x8000 && this.#data <= 0x7fff: {
                    code = 0xd1;
                    len = 2;

                    break;
                }

                case this.#data >= -0x8000_0000 && this.#data <= 0xffff_ffff: {
                    code = 0xd2;
                    len = 4;

                    break;
                }

                default: {
                    code = 0xd3;
                    len = 8;

                    break;
                }
            }
        } else {
            switch (true) {
                // negative fixint
                case this.#data >= -0x20n && this.#data < 0x00n: {
                    code = Number(<bigint>this.#data) + 0x100;
                    len = 0;

                    break;
                }

                // signed int
                case this.#data >= -0x80n && this.#data <= 0x7fn: {
                    code = 0xd0;
                    len = 1;

                    break;
                }

                case this.#data >= -0x8000n && this.#data <= 0x7fffn: {
                    code = 0xd1;
                    len = 2;

                    break;
                }

                case this.#data >= -0x8000_0000n && this.#data <= 0x7fff_ffffn: {
                    code = 0xd2;
                    len = 4;

                    break;
                }

                default: {
                    code = 0xd3;
                    len = 8;

                    break;
                }
            }
        }

        const chunkLen = 1 + len;

        const chunk = new Uint8Array(chunkLen);
        chunk[0] = code;

        // negative fixint
        if (len === 0) return chunk;

        // negative int

        if (isNum)
            for (let i: number = 1, nBytes: number = len - 1; nBytes >= 0; i++, nBytes--)
                chunk[i] = (<number>this.#data >>> (nBytes * 8)) & 0xff;
        else {
            const bytes = BigInt.asUintN(64, <bigint>this.#data);

            for (let i: number = 1, nBytes = BigInt(len - 1); nBytes >= 0n; i++, nBytes--)
                chunk[i] = Number((bytes >> (nBytes * 8n)) & 0xffn);
        }

        return chunk;
    }

    /* Converts a MessagePack chunk assumed to be in the negative `fixint`/signed `int` format family and creates a wrapper from it. If the chunk is in the `nil` format family, then a nullable wrapper is created, with its stored value set to `null`. */
    static decode(chunk: Uint8Array): Int<false> {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        if (code === NIL_CODE) return new Int(null, true);

        const indices = this.deriveIndices(chunk);
        if (indices.length === 2) {
            const code = chunk[indices[0]]!;
            return new Int(code - 0x0100);
        }

        const [, iDataStart, iDataEnd] = indices;
        if (iDataEnd > chunk.byteLength) warnTruncatedChunk();

        return new Int(chunk.slice(iDataStart, iDataEnd));
    }

    /* Resets the value of the wrapper to `0`, the non-nullable default value. If the wrapper is nullable, it will be instead resetted to `null`. */
    reset() {
        this.#data = this.#isOptional ? <any>null : 0;
    }

    /* Checks whether a value can be stored inside this wrapper. */
    isValid(data: unknown): data is MpResult<IntPrimitive, N>  {
        return Int.isValid(data) || (this.isOptional && data === null);
    }

    /* Checks whether a value can be stored inside an instance of this wrapper. */
    static isValid(data: unknown): data is IntPrimitive {
        if (typeof data === "number" && Number.isInteger(data)) data = BigInt(data);
        return typeof data === "bigint" ? data >= -0x8000_0000_0000_0000n && data <= 0x7fff_ffff_ffff_ffffn : false;
    }

    /* Checks whether a chunk header code is supported by an instance of this wrapper. */
    static isCodeValid(code: number): boolean {
        return (
            // negative fixint
            code >=  0xe0 ||

            // signed int
            code === 0xd0 ||
            code === 0xd1 ||
            code === 0xd2 ||
            code === 0xd3
        );
    }

    /* Checks whether a chunk is supported by an instance of this wrapper. */
    static isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    }

    /* Computes the index of the chunk header code, the starting index of the data containing the raw value (will not appear if the chunk is in the negative `fixint` format family), as well as the final exclusive index of the chunk. */
    static deriveIndices(chunk: Uint8Array): [number, number] | [number, number, number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        // negative fixint
        if (code >= 0xe0) {
            const iChunkEnd = iCode + 1;
            return [iCode, iChunkEnd];
        }

        // signed int

        /* match code:
         *     case 0xd0: len = 1
         *     case 0xd1: len = 2
         *     case 0xd2: len = 4
         *     case 0xd3: len = 8
         */
        const len = 0b1 << (code - 0xd0);

        const iDataStart = iCode + 1;
        const iDataEnd   = iDataStart + len;

        return [iCode, iDataStart, iDataEnd];
    }
} satisfies MpClassModule<IntPrimitive, boolean>;

export type IntPrimitive = number | bigint;
