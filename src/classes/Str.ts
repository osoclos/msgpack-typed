import { NIL_CODE } from "../internal";
import { InvalidDataTypeError, InvalidHeaderCodeError, MissingHeaderCodeError, NullInRequiredError, warnTruncatedChunk } from "../utils";

import { MpClassInterface, MpClassModule, MpResult } from "../types";

/** A wrapper for strings, representing the `fixstr` and `str` format families in the MessagePack specification. */
export const Str = class Str<N extends boolean> implements MpClassInterface<StrPrimitive, N> {
    #data: MpResult<StrPrimitive, N>;

    #isOptional: N;

    static #encoder = new TextEncoder();
    static #decoder = new TextDecoder("utf-8", { fatal: true });

    /** Wraps a native `string` and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. */
    constructor(data?: StrPrimitive, isOptional?: N);

    /** Wraps `null` and makes it usable for MessagePack parsing, which can be promoted to a string. */
    constructor(data: null, isOptional: true);

    /** Interprets bytes in a buffer as a string and makes it usable for MessagePack parsing, with an option to specify if it can be nullable. If the buffer is empty and marked as nullable, it will be assumed to be `null`. */
    constructor(bfr: Uint8Array, isOptional?: N);
    constructor(a?: unknown, isOptional: N = <N>false) {
        this.#isOptional = isOptional;

        if (!(a instanceof Uint8Array)) {
            const data =
                arguments.length === 0
                    ? isOptional
                        ? null
                        : ""
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

        this.#data = Str.#decoder.decode(bfr);
    }

    /** Wraps a native `string` and makes it usable for MessagePack parsing without allowing it to downgrade to `null`. */
    static required(data: StrPrimitive): Str<false>;

    /** Interprets bytes in a buffer as a string and makes it usable for MessagePack parsing without allowing it to downgrade to `null`, defaulting to `""` if the buffer is empty. */
    static required(bfr: Uint8Array): Str<false>;
    static required(a?: unknown): Str<false> {
        return <any>new Str(<any>a, false);
    }

    /** Wraps a native `string`, or `null` and makes it usable for MessagePack parsing. If no argument is provided, it will default to `null`. */
    static optional(data: StrPrimitive | null): Str<true>;

    /** Interprets bytes in a buffer as a string and makes it usable for MessagePack parsing. If the buffer is empty, it will be assumed to be `null`. */
    static optional(bfr: Uint8Array): Str<true>;
    static optional(a?: unknown): Str<true> {
        return <any>new Str(<any>a, true);
    }

    /** The raw value stored in the wrapper. */
    get data(): MpResult<StrPrimitive, N> {
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

        const bytes = Str.#encoder.encode(this.#data);
        const len = bytes.byteLength;

        let code: number;
        let lenLen: number;

        switch (true) {
            // fixstr
            case len < 0x20: {
                code = 0xa0 | len;
                lenLen = 0;

                break;
            }

            // str
            case len <= 0xff: {
                code = 0xd9;
                lenLen = 1;

                break;
            }

            case len <= 0xffff: {
                code = 0xda;
                lenLen = 2;

                break;
            }

            default: {
                code = 0xdb;
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

        chunk.set(bytes, iDataStart);

        return chunk;
    }

    /* Converts a MessagePack chunk assumed to be in the `fixstr`/`str` format family and creates a wrapper from it. If the chunk is in the `nil` format family, then a nullable wrapper is created, with its stored value set to `null`. */
    static decode(chunk: Uint8Array): Str<false> {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        if (code === NIL_CODE) return new Str(null, true);

        const indices = this.deriveIndices(chunk);

        const hasLenStartIdx = indices.length === 4;

        const iDataStart = indices[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        const iDataEnd   = indices[<typeof hasLenStartIdx extends true ? 3 : 2>(2 + +hasLenStartIdx)];

        if (iDataEnd > chunk.byteLength) warnTruncatedChunk();

        return new Str(chunk.subarray(iDataStart, iDataEnd));
    }

    /* Resets the value of the wrapper to `""`, the non-nullable default value. If the wrapper is nullable, it will be instead resetted to `null`. */
    reset() {
        this.#data = this.#isOptional ? <any>null : "";
    }

    /* Checks whether a value can be stored inside this wrapper. */
    isValid(data: unknown): data is MpResult<StrPrimitive, N>  {
        return Str.isValid(data) || (this.isOptional && data === null);
    }

    /* Checks whether a value can be stored inside an instance of this wrapper. */
    static isValid(data: unknown): data is StrPrimitive {
        return typeof data === "string";
    }

    /* Checks whether a chunk header code is supported by an instance of this wrapper. */
    static isCodeValid(code: number): boolean {
        return (
            // fixstr
            (code & 0xe0) === 0xa0 ||

            // str
            code === 0xd9 ||
            code === 0xda ||
            code === 0xdb
        );
    }

    /* Checks whether a chunk is supported by an instance of this wrapper. */
    static isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) throw new MissingHeaderCodeError();

        return this.isCodeValid(code);
    }

    /* Computes the index of the chunk header code, the starting index of the data containing the length (will not appear if the chunk is in the `fixstr` format family), the starting index of the data containing the raw value, as well as the final exclusive index of the chunk. */
    static deriveIndices(chunk: Uint8Array): [number, number, number] | [number, number, number, number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new InvalidHeaderCodeError(code);

        // fixstr
        if ((code & 0xe0) === 0xa0) {
            const len = code & 0x1f;

            const iDataStart = iCode +  1;
            const iDataEnd = iDataStart + len;

            return [iCode, iDataStart, iDataEnd];
        }

        // str

        /* match code:
         *     case 0xd9: lenLen = 1
         *     case 0xda: lenLen = 2
         *     case 0xdb: lenLen = 4
         */
        const lenLen = 0b1 << (code - 0xd9);
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
} satisfies MpClassModule<StrPrimitive, boolean>;

export type StrPrimitive = string;
