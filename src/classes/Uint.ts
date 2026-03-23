import { NIL_CODE } from "../internal";
import { InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError, NullInRequiredError, warnTruncatedChunk } from "../utils";

import { MpClassInterface, MpClassModule, MpResult } from "../types";

/** A wrapper for unsigned integers, representing the positive `fixint` and unsigned `int` format families in the MessagePack specification. */
export const Uint = class Uint<N extends boolean> implements MpClassInterface<UintPrimitive, N> {
    #data: MpResult<UintPrimitive, N>;
    #isOptional: N;

    /** Wraps a native `number` or `bigint` and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. */
    constructor(data?: UintPrimitive, isOptional?: N);

    /** Wraps `null` and makes it usable for MessagePack parsing, which can be promoted to an unsigned integer. */
    constructor(data: null, isOptional: true);

    /** Interprets bytes in a buffer as a big-endian unsigned integer and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. If the buffer is empty and marked as nullable, it will be assumed to be `null`. */
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

            return;
        }

        this.#data = 0;
        for (let i: number = 0; i < nBytes; i++) {
            (<number>this.#data) <<= 8;
            (<number>this.#data) |= bfr[i]!;
        }
    }

    /** Wraps a native `number` or `bigint` and makes it usable for MessagePack parsing without allowing it to downgrade to `null`. */
    static required(data: UintPrimitive): Uint<false>;

    /** Interprets bytes in a buffer as a big-endian unsigned integer and makes it usable for MessagePack parsing without allowing it to downgrade to `null`, defaulting to `0` if the buffer is empty. */
    static required(bfr: Uint8Array): Uint<false>;
    static required(a?: unknown): Uint<false> {
        return <any>new Uint(<any>a, false);
    }

    /** Wraps a native `number` or `bigint`, or `null` and makes it usable for MessagePack parsing. If no argument is provided, it will default to `null`. */
    static optional(data: UintPrimitive | null): Uint<true>;

    /** Interprets bytes in a buffer as a big-endian unsigned integer and makes it usable for MessagePack parsing. If the buffer is empty, it will be assumed to be `null`. */
    static optional(bfr: Uint8Array): Uint<true>;
    static optional(a?: unknown): Uint<true> {
        return <any>new Uint(<any>a, true);
    }

    /** The raw value stored in the wrapper. */
    get data(): MpResult<UintPrimitive, N> {
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
        if (this.#data === null) return new Uint8Array([NIL_CODE]);

        const isNum = typeof this.#data === "number";

        let code: number;
        let len: number;

        if (isNum) {
            switch (true) {
                // positive fixint
                case this.#data <= 0x7f: {
                    code = <number>this.#data;
                    len = 0;

                    break;
                }

                // unsigned int
                case this.#data <= 0xff: {
                    code = 0xcc;
                    len = 1;

                    break;
                }

                case this.#data <= 0xffff: {
                    code = 0xcd;
                    len = 2;

                    break;
                }

                case this.#data <= 0xffff_ffff: {
                    code = 0xce;
                    len = 4;

                    break;
                }

                default: {
                    code = 0xcf;
                    len = 8;

                    break;
                }
            }
        } else {
            switch (true) {
                // positive fixint
                case this.#data <= 0x7fn: {
                    code = Number(this.#data);
                    len = 0;

                    break;
                }

                // unsigned int
                case this.#data <= 0xffn: {
                    code = 0xcc;
                    len = 1;

                    break;
                }

                case this.#data <= 0xffffn: {
                    code = 0xcd;
                    len = 2;

                    break;
                }

                case this.#data <= 0xffff_ffffn: {
                    code = 0xce;
                    len = 4;

                    break;
                }

                default: {
                    code = 0xcf;
                    len = 8;

                    break;
                }
            }
        }

        const chunkLen = 1 + len;

        const chunk = new Uint8Array(chunkLen);
        chunk[0] = code;

        // positive fixint
        if (len === 0) return chunk;

        // unsigned int

        if (isNum)
            for (let i: number = 1, nBytes: number = len - 1; nBytes >= 0; i++, nBytes--)
                chunk[i] = (<number>this.#data >>> (nBytes * 8)) & 0xff;
        else
            for (let i: number = 1, nBytes = BigInt(len - 1); nBytes >= 0n; i++, nBytes--)
                chunk[i] = Number((<bigint>this.#data >> (nBytes * 8n)) & 0xffn);

        return chunk;
    }

    /* Converts a MessagePack chunk assumed to be in the positive `fixint`/unsigned `int` format family and creates a wrapper from it. If the chunk is in the `nil` format family, then a nullable wrapper is created, with its stored value set to `null`. */
    static decode(chunk: Uint8Array): Uint<false> {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        if (code === NIL_CODE) return new Uint(null, true);

        const indices = this.deriveIndices(chunk);
        if (indices.length === 2) {
            const code = chunk[indices[0]]!;
            return new Uint(code);
        }

        const [, iDataStart, iDataEnd] = indices;
        if (iDataEnd > chunk.byteLength) warnTruncatedChunk();

        return new Uint(chunk.slice(iDataStart, iDataEnd));
    }

    /* Resets the value of the wrapper to `0`, the non-nullable default value. If the wrapper is nullable, it will be instead resetted to `null`. */
    reset() {
        this.#data = this.#isOptional ? <any>null : 0;
    }

    /* Checks whether a value can be stored inside this wrapper. */
    isValid(data: unknown): data is MpResult<UintPrimitive, N>  {
        return Uint.isValid(data) || (this.isOptional && data === null);
    }

    /* Checks whether a value can be stored inside an instance of this wrapper. */
    static isValid(data: unknown): data is UintPrimitive {
        if (typeof data === "number" && Number.isInteger(data)) data = BigInt(data);
        return typeof data === "bigint" ? data >= 0n && data <= 0xffff_ffff_ffff_ffffn : false;
    }

    /* Checks whether a chunk header code is supported by an instance of this wrapper. */
    static isCodeValid(code: number): boolean {
        return (
            // positive fixint
            code <=  0x7f ||

            // unsigned int
            code === 0xcc ||
            code === 0xcd ||
            code === 0xce ||
            code === 0xcf
        );
    }

    /* Checks whether a chunk is supported by an instance of this wrapper. */
    static isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    }

    /* Computes the index of the chunk header code, the starting index of the data containing the raw value (will not appear if the chunk is in the positive `fixint` format family), as well as the final exclusive index of the chunk. */
    static deriveIndices(chunk: Uint8Array): [number, number] | [number, number, number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        // positive fixint
        if (code <= 0x7f) {
            const iChunkEnd = iCode + 1;
            return [iCode, iChunkEnd];
        }

        // unsigned int

        /* match code:
         *     case 0xcc: len = 1
         *     case 0xcd: len = 2
         *     case 0xce: len = 4
         *     case 0xcf: len = 8
         */
        const len = 0b1 << (code - 0xcc);

        const iDataStart = iCode + 1;
        const iDataEnd   = iDataStart + len;

        return [iCode, iDataStart, iDataEnd];
    }
} satisfies MpClassModule<UintPrimitive, boolean>;

export type UintPrimitive = number | bigint;
